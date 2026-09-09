/**
 * 统一坐标系统管理
 * 解决 DPI 缩放和物理像素 vs 逻辑像素的混乱问题
 */

class CoordinateSystem {
  constructor(screen) {
    this.screen = screen;
    this.isWindows = process.platform === "win32";
  }

  /**
   * 获取当前主显示器的 DPI 缩放因子
   */
  getDpiScale() {
    if (!this.screen) return 1;
    const display = this.screen.getPrimaryDisplay();
    return display.scaleFactor || 1;
  }

  /**
   * 将物理坐标转换为逻辑坐标（DIP - Device Independent Pixels）
   * 用于处理来自 uiohook-napi 的原始物理坐标
   */
  physicalToLogical(point) {
    if (!this.isValidPoint(point)) return null;
    if (!this.isWindows || !this.screen) {
      return { x: Math.round(point.x), y: Math.round(point.y) };
    }

    const physical = { x: Math.round(point.x), y: Math.round(point.y) };
    try {
      return this.screen.screenToDipPoint(physical);
    } catch {
      return physical;
    }
  }

  /**
   * 将逻辑坐标转换为物理坐标
   * 用于输出到需要物理坐标的 API
   */
  logicalToPhysical(point) {
    if (!this.isValidPoint(point)) return null;
    if (!this.isWindows || !this.screen) {
      return { x: Math.round(point.x), y: Math.round(point.y) };
    }

    const logical = { x: Math.round(point.x), y: Math.round(point.y) };
    try {
      return this.screen.dipToScreenPoint(logical);
    } catch {
      return logical;
    }
  }

  /**
   * 获取当前鼠标位置（逻辑坐标）
   */
  getCursorPosition() {
    if (!this.screen) return null;
    return this.screen.getCursorScreenPoint();
  }

  /**
   * 验证坐标点是否有效
   */
  isValidPoint(point) {
    return point && Number.isFinite(point.x) && Number.isFinite(point.y);
  }

  /**
   * 获取适应 DPI 的拖拽阈值
   * 基础阈值在高 DPI 下会相应放大，确保物理距离一致
   */
  getDragThreshold(baseThreshold = 6) {
    const scale = this.getDpiScale();
    return Math.max(baseThreshold, Math.round(baseThreshold * scale));
  }

  /**
   * 规范化坐标点为整数
   */
  normalizePoint(point) {
    if (!this.isValidPoint(point)) return null;
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }
}

module.exports = { CoordinateSystem };
