const cardId = (key, turnId) => JSON.stringify([key, turnId || '']);
const transientKinds = new Set(['started', 'joined', 'resumed', 'queued', 'paused']);

class TaskBoard {
  constructor(now = Date.now) {
    this.now = now;
    this.notices = new Map();
    this.seen = new Set();
    this.events = new Map();
    this.lastTick = now();
    this.presented = new Set();
  }
  push(events) {
    for (const event of events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      const id = cardId(event.taskId, event.turnId);
      this.events.set(id,event.id);
      if (transientKinds.has(event.kind)) this.notices.set(id, { ...event, remaining: 4000 });
      else this.notices.delete(id);
    }
    // Deduplication history is bounded; live completion retention has a separate owner.
    if (this.seen.size > 2000) this.seen = new Set([...this.seen].slice(-1000));
  }
  tick(visible, paused) {
    const now = this.now(), elapsed = Math.max(0, now - this.lastTick);
    this.lastTick = now;
    let changed = false;
    if (visible && !paused) for (const [id, notice] of this.notices) {
      if (!this.presented.has(id)) continue;
      notice.remaining -= elapsed;
      if (notice.remaining <= 0) { this.notices.delete(id); changed = true; }
    }
    return changed;
  }
  dismissTransient() { this.notices.clear(); }
  view(view, completions, { manual = false, retain = true, settings = false } = {}) {
    const rows = new Map();
    for (const entry of view.tasks || []) {
      const id = cardId(entry.key, entry.task.turnId);
      const status = entry.task.status === 'unknown' && entry.reminderStatus ? entry.reminderStatus : entry.task.status;
      const persistent = entry.unread && !entry.snoozedUntil && ['needs_attention', 'failed', 'stopped'].includes(status);
      const notice = this.notices.get(id);
      if (['completed', 'failed', 'stopped'].includes(entry.task.status)) this.notices.delete(id);
      if (!(persistent || (!settings && ((manual && entry.active) || this.notices.has(id))))) continue;
      rows.set(id, { id, key: entry.key, turnId: entry.task.turnId, title: entry.task.title,
        status, stale: !entry.fresh || entry.task.status === 'unknown', waitReason: entry.task.waitReason,
        persistent: Boolean(persistent), kind: notice?.kind, eventId: this.events.get(id) || JSON.stringify([id,status]),
        actions: [persistent ? status === 'needs_attention' ? 'snooze' : 'ack' : 'copy', 'open'] });
    }
    const live = new Set((view.tasks || []).map(e => cardId(e.key, e.task.turnId)));
    for (const id of this.notices.keys()) if (!live.has(id)) this.notices.delete(id);
    for (const id of this.events.keys()) if (!live.has(id)) this.events.delete(id);
    if (retain) for (const item of completions) {
      const key = item.taskId || JSON.stringify([item.task.source, item.task.id]);
      const id = cardId(key, item.turnId || item.task.turnId);
      rows.set(id, { id, key, turnId: item.turnId, title: item.title, status: 'completed',
        completionId: item.id, persistent: true, eventId: item.id, actions: ['ack', 'open'] });
    }
    return { manual, settings, rows: [...rows.values()].sort((a, b) => Number(b.persistent) - Number(a.persistent)) };
  }
}
module.exports = { TaskBoard, cardId };
