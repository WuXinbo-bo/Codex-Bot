/**
 * 统一的交互管理器
 * 负责协调悬浮球和气泡窗口的所有交互逻辑
 * 采用事件驱动架构，移除轮询机制
 */

const { EventEmitter } = require("node:events");

// 交互状态枚举
const InteractionState = {
  IDLE: "idle",
  AWARE: "aware",
  HOVERING_BALL: "hovering_ball",
  PRESSED: "pressed",
  HOLD_READY: "hold_ready",
  DRAGGING: "dragging",
  BUBBLE_OPEN: "bubble_open",
  HOVERING_BUBBLE: "hovering_bubble"
};

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

class InteractionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.coordinateSystem = options.coordinateSystem;
    this.dragController = options.dragController;
    this.ballRadius = options.ballRadius || 64;
    this.proximityRadius = Math.max(this.ballRadius, Number(options.proximityRadius || 180));
    this.holdThreshold = Math.max(0, Number(options.holdThreshold ?? 420));
    this.hoverDwellThresholds = Array.isArray(options.hoverDwellThresholds)
      ? options.hoverDwellThresholds.map(Number).filter(Number.isFinite)
      : [200, 800, 2500];
    this.now = typeof options.now === "function" ? options.now : Date.now;
    this.schedule = typeof options.setTimeout === "function" ? options.setTimeout : setTimeout;
    this.unschedule = typeof options.clearTimeout === "function" ? options.clearTimeout : clearTimeout;

    // 当前状态
    this.state = InteractionState.IDLE;
    this.ballBounds = null;
    this.bubbleBounds = null;
    this.bubbleVisible = false;
    this.pointerPoint = null;
    this.pointerSample = null;
    this.holdTimer = null;
    this.hoverTimers = [];
    this.turnAccumulator = 0;
    this.orbitCooldownUntil = 0;

    // 配置
    this.enableEventDriven = options.enableEventDriven !== false;
  }

  /**
   * 设置悬浮球边界
   * P2 修复：增强健壮性，确保坐标和尺寸都有效
   */
  setBallBounds(bounds) {
    if (!bounds || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) return;
    if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return;

    this.ballBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: bounds.width,
      height: bounds.height
    };
  }

  /**
   * 设置气泡边界
   * P2 修复：增强健壮性，确保坐标和尺寸都有效
   */
  setBubbleBounds(bounds) {
    if (!bounds || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) return;
    if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return;

    this.bubbleBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: bounds.width,
      height: bounds.height
    };
  }

  /**
   * 设置气泡可见状态
   */
  setBubbleVisible(visible) {
    this.bubbleVisible = Boolean(visible);
    if (!visible && this.state === InteractionState.HOVERING_BUBBLE) {
      this.setState(InteractionState.IDLE);
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.state;
  }

  /**
   * 状态转换
   */
  setState(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    if (oldState === InteractionState.HOVERING_BALL && newState !== InteractionState.HOVERING_BALL) this._clearHoverTimers();
    if (newState === InteractionState.HOVERING_BALL && oldState !== InteractionState.HOVERING_BALL) this._armHoverTimers();
    this.emit("state-change", { from: oldState, to: newState });
  }

  /**
   * 命中测试：检查点是否在悬浮球内
   */
  hitTestBall(point) {
    if (!this.ballBounds || !point) return false;
    return this._pointInsideCircle(point, this.ballBounds, this.ballRadius);
  }

  /**
   * 命中测试：检查点是否在气泡内
   */
  hitTestBubble(point) {
    if (!this.bubbleVisible || !this.bubbleBounds || !point) return false;
    return this._pointInsideRect(point, this.bubbleBounds);
  }

  hitTestProximity(point) {
    if (!this.ballBounds || !point) return false;
    const centerX = this.ballBounds.x + this.ballBounds.width / 2;
    const centerY = this.ballBounds.y + this.ballBounds.height / 2;
    return Math.hypot(point.x - centerX, point.y - centerY) <= this.proximityRadius;
  }

  /**
   * 处理鼠标按下事件
   */
  handleMouseDown(event) {
    const point = this._normalizePoint(event);
    if (!point) return { handled: false };

    // 检查是否点击悬浮球
    if (this.hitTestBall(point)) {
      const bounds = this.ballBounds;
      if (this.dragController.begin(point, bounds)) {
        this._clearHoldTimer();
        this._clearHoverTimers();
        this.turnAccumulator = 0;
        this.pointerPoint = point;
        this.setState(InteractionState.PRESSED);
        this._armHoldTimer();
        return {
          handled: true,
          action: "press",
          ballInteractive: true,
          bubbleInteractive: false,
          interaction: this._pointerDetail(point)
        };
      }
    }

    // 检查是否点击气泡
    if (this.hitTestBubble(point)) {
      return {
        handled: true,
        action: "bubble-interact",
        bubbleInteractive: true
      };
    }

    return { handled: false };
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event) {
    const point = this._normalizePoint(event);
    if (!point) return { handled: false };
    this.pointerPoint = point;

    // 如果正在拖拽，更新拖拽位置
    if ([InteractionState.PRESSED, InteractionState.HOLD_READY, InteractionState.DRAGGING].includes(this.state)) {
      this.pointerPoint = point;
      const interaction = this._pointerDetail(point);
      const update = this.dragController.move(point);
      if (update) {
        if (update.type === "drag-start") {
          this._clearHoldTimer();
          this.turnAccumulator = 0;
          this.setState(InteractionState.DRAGGING);
        }
        return {
          handled: true,
          action: update.type,
          position: update.position,
          unconstrained: update.unconstrained,
          ballInteractive: true,
          bubbleInteractive: false,
          interaction
        };
      }
      return { handled: true, ballInteractive: true, bubbleInteractive: false, interaction };
    }

    // 更新悬停状态（事件驱动，不需要轮询）
    const hitsBall = this.hitTestBall(point);
    const hitsBubble = this.hitTestBubble(point);
    const nearBall = !hitsBubble && this.hitTestProximity(point);
    const previousState = this.state;
    const interaction = this._pointerDetail(point);

    let newState = this.state;
    if (hitsBubble && this.bubbleVisible) {
      newState = InteractionState.HOVERING_BUBBLE;
    } else if (hitsBall) {
      newState = InteractionState.HOVERING_BALL;
    } else if (nearBall) {
      newState = InteractionState.AWARE;
    } else {
      newState = InteractionState.IDLE;
    }

    if (newState !== this.state) {
      this.setState(newState);
    }

    let action = null;
    if (newState === InteractionState.HOVERING_BALL) {
      action = previousState === newState ? "hover-move" : "hover-enter";
    } else if (newState === InteractionState.AWARE) {
      action = previousState === newState ? "proximity-move" : "proximity-enter";
    } else if (newState === InteractionState.HOVERING_BUBBLE) {
      action = "bubble-hover";
    } else if (newState === InteractionState.IDLE && previousState !== InteractionState.IDLE) {
      action = "pointer-leave";
    }

    return {
      handled: true,
      action,
      ballInteractive: hitsBall,
      bubbleInteractive: hitsBubble && this.bubbleVisible,
      interaction
    };
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(event) {
    const point = this._normalizePoint(event);
    if (!point) return { handled: false };

    // 如果正在拖拽，结束拖拽
    if ([InteractionState.PRESSED, InteractionState.HOLD_READY, InteractionState.DRAGGING].includes(this.state)) {
      const previousState = this.state;
      this._clearHoldTimer();
      this.pointerPoint = point;
      const interaction = this._pointerDetail(point);
      const result = this.dragController.end(point);
      if (result) {
        this.turnAccumulator = 0;
        this.setState(this.hitTestBall(point)
          ? InteractionState.HOVERING_BALL
          : this.hitTestProximity(point) ? InteractionState.AWARE : InteractionState.IDLE);

        if (result.type === "drag-end") {
          return {
            handled: true,
            action: "drag-end",
            position: result.position,
            constrainRequired: result.constrainRequired,
            ballInteractive: this.hitTestBall(point),
            bubbleInteractive: false,
            interaction
          };
        } else if (result.type === "click") {
          return {
            handled: true,
            action: previousState === InteractionState.HOLD_READY ? "hold-release" : "ball-click",
            ballInteractive: this.hitTestBall(point),
            bubbleInteractive: false,
            interaction
          };
        }
      }
    }

    return { handled: false };
  }

  /**
   * 取消当前交互
   */
  cancel() {
    this._clearHoldTimer();
    this._clearHoverTimers();
    this.dragController.cancel();
    this.setState(InteractionState.IDLE);
    this.pointerSample = null;
    this.turnAccumulator = 0;
  }

  /**
   * 重置到初始状态
   */
  reset() {
    this.cancel();
    this.ballBounds = null;
    this.bubbleBounds = null;
    this.bubbleVisible = false;
  }

  // 私有辅助方法

  _normalizePoint(event) {
    if (!this.coordinateSystem) {
      return event && Number.isFinite(event.x) && Number.isFinite(event.y)
        ? { x: event.x, y: event.y }
        : null;
    }
    return this.coordinateSystem.physicalToLogical(event);
  }

  _armHoldTimer() {
    if (!this.holdThreshold) return;
    this.holdTimer = this.schedule(() => {
      this.holdTimer = null;
      if (this.state !== InteractionState.PRESSED || !this.dragController.isActive()) return;
      this.setState(InteractionState.HOLD_READY);
      this.emit("action", {
        handled: true,
        action: "hold-ready",
        ballInteractive: true,
        bubbleInteractive: false,
        interaction: this._pointerDetail(this.pointerPoint, false)
      });
    }, this.holdThreshold);
  }

  _clearHoldTimer() {
    if (this.holdTimer !== null) this.unschedule(this.holdTimer);
    this.holdTimer = null;
  }

  _armHoverTimers() {
    this._clearHoverTimers();
    const stages = ["short", "medium", "long"];
    this.hoverTimers = this.hoverDwellThresholds.map((delay, index) => this.schedule(() => {
      if (this.state !== InteractionState.HOVERING_BALL) return;
      this.emit("action", {
        handled: true,
        action: "hover-dwell",
        ballInteractive: true,
        bubbleInteractive: false,
        interaction: { ...(this._pointerDetail(this.pointerPoint, false) || {}), stage: stages[index] || `stage-${index + 1}`, dwellMs: delay }
      });
    }, Math.max(0, delay)));
  }

  _clearHoverTimers() {
    for (const timer of this.hoverTimers) this.unschedule(timer);
    this.hoverTimers = [];
  }

  _pointerDetail(point, updateSample = true) {
    if (!point || !this.ballBounds) return null;
    const timestamp = this.now();
    const centerX = this.ballBounds.x + this.ballBounds.width / 2;
    const centerY = this.ballBounds.y + this.ballBounds.height / 2;
    let velocity = { x: 0, y: 0, speed: 0 };
    let directionChanged = false;
    let turnRadians = 0;
    let orbitDetected = false;

    if (updateSample && this.pointerSample) {
      const elapsed = Math.max(1, timestamp - this.pointerSample.at);
      velocity = {
        x: (point.x - this.pointerSample.point.x) * 1000 / elapsed,
        y: (point.y - this.pointerSample.point.y) * 1000 / elapsed
      };
      velocity.speed = Math.hypot(velocity.x, velocity.y);
      const previous = this.pointerSample.velocity;
      if (previous && previous.speed > 120 && velocity.speed > 120) {
        const dot = previous.x * velocity.x + previous.y * velocity.y;
        const cross = previous.x * velocity.y - previous.y * velocity.x;
        turnRadians = Math.atan2(cross, dot);
        directionChanged = dot < -(previous.speed * velocity.speed * 0.25);
        if (this.state === InteractionState.DRAGGING && Math.abs(turnRadians) < Math.PI * 0.8) {
          this.turnAccumulator += turnRadians;
          if (Math.abs(this.turnAccumulator) >= Math.PI * 1.65 && timestamp >= this.orbitCooldownUntil) {
            orbitDetected = true;
            this.turnAccumulator = 0;
            this.orbitCooldownUntil = timestamp + 12_000;
          }
        }
      }
    }

    if (updateSample) this.pointerSample = { point: { ...point }, at: timestamp, velocity };
    return {
      point: { ...point },
      local: {
        x: clamp((point.x - centerX) / this.proximityRadius, -1, 1),
        y: clamp((point.y - centerY) / this.proximityRadius, -1, 1)
      },
      velocity,
      speedBand: velocity.speed > 720 ? "fast" : velocity.speed > 0 ? "slow" : "still",
      directionChanged,
      turnRadians,
      orbitProgress: clamp(Math.abs(this.turnAccumulator) / (Math.PI * 1.65), 0, 1),
      orbitDetected
    };
  }

  _pointInsideCircle(point, bounds, radius) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const deltaX = point.x - centerX;
    const deltaY = point.y - centerY;
    return (deltaX * deltaX + deltaY * deltaY) <= radius * radius;
  }

  _pointInsideRect(point, bounds) {
    return point.x >= bounds.x &&
           point.y >= bounds.y &&
           point.x <= bounds.x + bounds.width &&
           point.y <= bounds.y + bounds.height;
  }
}

module.exports = { InteractionManager, InteractionState };
