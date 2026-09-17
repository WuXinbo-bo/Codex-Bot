const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const ACTIVE = new Set(["running", "queued", "paused", "needs_attention"]);
const isActive = task => Boolean(task && (ACTIVE.has(task.status) || (task.status === "unknown" && task.trackedActive)));
const TERMINAL = new Set(["completed", "failed", "stopped"]);
const keyOf = task => JSON.stringify([task.source, task.id]);
const eventOf = task => JSON.stringify([task.turnId || "", task.status, task.eventAt || task.updatedAt || ""]);

class TaskCenter extends EventEmitter {
  constructor({ file = null, now = Date.now } = {}) {
    super(); this.file = file; this.now = now; this.startedAt = now(); this.entries = new Map(); this.snapshot = { tasks: [], sources: {}, sourceHealth: {} };
    this.saved = {};
    this.lifecycleSeen = new Set();
    this.connectedSources = new Set();
    this.transitions = new Map();
    try {
      const saved = file ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
      if (saved && typeof saved === "object" && !Array.isArray(saved)) this.saved = saved;
    } catch { /* No persisted acknowledgements yet. */ }
  }
  update(snapshot) {
    this.snapshot = snapshot;
    let notify = false; let persist = false;
    const present = new Set();
    const events = [];
    for (const task of snapshot.tasks) {
      const key = keyOf(task); present.add(key);
      const previous = this.entries.get(key);
      const saved = this.saved[key];
      let savedTurn = saved?.lastTurnId, savedStatus;
      try{const event=JSON.parse(saved?.eventId||'[]');savedTurn??=event[0];savedStatus=event[1];}catch{}
      const previousTurn = previous?.task.turnId || savedTurn;
      const retiredTurns = [...(saved?.retiredTurns || [])];
      const differentTurn = Boolean(task.turnId && previousTurn && task.turnId !== previousTurn);
      // Late snapshots for a superseded turn must not revert the current card.
      if(differentTurn && (retiredTurns.includes(task.turnId) ||
        Date.parse(task.eventAt || task.updatedAt) < Date.parse(previous?.task.eventAt || saved?.lastEventAt)))continue;
      if(differentTurn)retiredTurns.push(previousTurn);
      // Keep a known active turn visible when its evidence becomes inconclusive.
      if (task.status === "unknown" && previous?.task.turnId && task.turnId === previous.task.turnId && isActive(previous.task)) task.trackedActive = true;
      if (task.status === "unknown" && task.trackedActive && task.quiet && task.lastKnownStatus === "running") {
        task.status = "running";
        task.trackedActive = false;
      }
      const uncertainReminder = task.status === 'unknown' && previous?.task.turnId === task.turnId && previous?.unread;
      const eventId = uncertainReminder ? previous.eventId : task.turnId ? eventOf(task) : previous?.task.status === task.status ? previous.eventId : eventOf(task);
      const fresh = !task.stale && snapshot.sources[task.source] === "connected";
      const changed = previous?.eventId !== eventId;
      const acknowledged = saved?.eventId === eventId && saved.acknowledged;
      const savedUnread = saved?.eventId === eventId && saved.unread;
      const eventTime = Date.parse(task.eventAt || task.updatedAt);
      const newTerminal = TERMINAL.has(task.status) && (isActive(previous?.task) || (Number.isFinite(eventTime) && eventTime >= this.startedAt));
      const sameTurn = previous && previous.task.turnId === task.turnId;
      const continuation = differentTurn || sameTurn && previous.continued || !previous && savedTurn===task.turnId && saved?.continued;
      const resumable=['paused', 'needs_attention', 'completed', 'failed', 'stopped'];
      const resumed = fresh && task.status === 'running' && (continuation || sameTurn && resumable.includes(previous.task.status) || !previous && savedTurn===task.turnId && resumable.includes(savedStatus));
      const kind = resumed ? 'resumed' : task.status === "running" ? "started" : task.status === "needs_attention" ? "attention" : TERMINAL.has(task.status) ? task.status : ['queued', 'paused'].includes(task.status) ? task.status : null;
      const transitionKey = JSON.stringify([key, task.turnId || '']);
      if (fresh && sameTurn && previous.task.status !== task.status && task.status !== 'unknown' && previous.task.status !== 'unknown') this.transitions.set(transitionKey, (this.transitions.get(transitionKey) || 0) + 1);
      // Poll timestamps are not lifecycle identities: use source, task, turn and type.
      const lifecycleId = JSON.stringify([task.source, task.id, task.turnId || "", kind, ...(['resumed', 'paused', 'queued', 'attention', 'completed', 'failed', 'stopped'].includes(kind) ? [this.transitions.get(transitionKey) || 0] : [])]);
      if (fresh && kind && !this.lifecycleSeen.has(lifecycleId)) {
        this.lifecycleSeen.add(lifecycleId);
        const joined = kind === "started" && !this.connectedSources.has(task.source);
        const muted = acknowledged || (saved?.eventId === eventId && saved.snoozedUntil > this.now());
        if (['started', 'resumed', 'queued', 'paused'].includes(kind) || (!muted && (kind === "attention" || newTerminal))) events.push({ id: lifecycleId, kind: joined ? "joined" : kind, title: task.title || task.id, taskId: key, turnId: task.turnId || "", eventAt: task.eventAt || task.updatedAt });
      }
      let unread = previous?.unread || savedUnread || false;
      let snoozedUntil = changed ? (!previous && saved?.eventId === eventId ? saved.snoozedUntil || 0 : 0) : previous?.snoozedUntil || 0;
      if (snoozedUntil <= this.now()) snoozedUntil = 0;
      if ((changed || !previous?.fresh) && fresh) unread = !acknowledged && (uncertainReminder || savedUnread || task.status === "needs_attention" || newTerminal);
      if (!fresh && !previous) unread = false;
      if (acknowledged) unread = false;
      if (fresh && unread && !snoozedUntil && (!previous?.unread || changed || previous.task.stale || previous.snoozedUntil)) notify = true;
      this.entries.set(key, { key, task, eventId, unread, snoozedUntil, fresh, continued:Boolean(resumed||continuation), active: isActive(task), reminderStatus: uncertainReminder ? previous.reminderStatus || previous.task.status : null });
      if (fresh && (changed || previous?.unread !== unread || previous?.snoozedUntil !== snoozedUntil)) {
        this.saved[key] = { eventId, acknowledged: Boolean(acknowledged), unread, snoozedUntil, continued:Boolean(resumed||continuation), lastTurnId:task.turnId||previousTurn||'', lastEventAt:task.eventAt||task.updatedAt, retiredTurns:retiredTurns.slice(-32) };
        persist = true;
      }
    }
    for (const [key, entry] of this.entries) if (!present.has(key)) {
      if (!entry.unread || snapshot.sources[entry.task.source] === "disabled") this.entries.delete(key);
      else { entry.fresh = false; entry.task = { ...entry.task, stale: true }; }
    }
    if (persist) this.persist();
    for (const [source, state] of Object.entries(snapshot.sources)) if (state === "connected") this.connectedSources.add(source);
    this.emit("update", this.view(), notify);
    if (events.length) this.emit("lifecycle", events);
  }
  action(key, action) {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (action === "ack") { entry.unread = false; entry.snoozedUntil = 0; }
    else if (action === "snooze") entry.snoozedUntil = this.now() + 300000;
    else return false;
    this.saved[key] = { ...this.saved[key], eventId: entry.eventId, acknowledged: !entry.unread, unread: entry.unread, snoozedUntil: entry.snoozedUntil };
    this.persist(); this.emit("update", this.view(), false); return true;
  }
  tick() {
    let changed = false;
    for (const entry of this.entries.values()) if (entry.snoozedUntil && entry.snoozedUntil <= this.now()) { entry.snoozedUntil = 0; if (this.saved[entry.key]) this.saved[entry.key].snoozedUntil = 0; changed = true; }
    if (changed) { this.persist(); this.emit("update", this.view(), true); }
  }
  persist() {
    if (!this.file) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const items = Object.entries(this.saved).slice(-1000);
      fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(Object.fromEntries(items)));
      fs.renameSync(`${this.file}.tmp`, this.file);
    } catch (error) { this.emit("diagnostic", { source: "cache", message: error.message }); }
  }
  view() {
    const tasks = [...this.entries.values()].sort((a, b) => {
      const rank = e => e.fresh && e.unread && !e.snoozedUntil ? e.task.status === "needs_attention" ? 0 : 1 : isActive(e.task) ? e.task.status === "unknown" ? 3 : 2 : 4;
      return rank(a) - rank(b) || Date.parse(b.task.eventAt || b.task.updatedAt || 0) - Date.parse(a.task.eventAt || a.task.updatedAt || 0);
    });
    const primary = tasks.find(e => e.fresh && e.task.status === "needs_attention" && e.unread && !e.snoozedUntil)
      || tasks.find(e => e.fresh && isActive(e.task) && !(e.task.status === "needs_attention" && e.snoozedUntil))
      || tasks.find(e => e.fresh && e.unread && !e.snoozedUntil);
    const activeCount = tasks.filter(e => isActive(e.task)).length;
    const unreadCount = tasks.filter(e => e.unread).length;
    const connected = Object.values(this.snapshot.sources).includes("connected");
    const activePrimary = primary?.active ? primary : tasks.find(e => e.active && e.fresh);
    const indicator = activePrimary ? { status: activePrimary.task.status, count: activeCount, taskId: activePrimary.key, eventId: activePrimary.eventId, fresh: activePrimary.fresh, quiet: true } : { status: connected ? "idle" : "offline", count: activeCount, fresh: connected, quiet: true };
    indicator.lifecycleManaged = true;
    indicator.activeCount = activeCount; indicator.unreadCount = unreadCount;
    return { ...this.snapshot, tasks, primaryKey: primary?.key || null, activeCount, unreadCount, indicator };
  }
}
module.exports = { TaskCenter, keyOf, eventOf };
