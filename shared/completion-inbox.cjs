const fs = require("node:fs");
const path = require("node:path");
const retainCompletions = config => config?.notifications?.retainCompletions !== false;
const completionKey = item => JSON.stringify([item.task.source, item.task.id]);
const completionTime = item => Date.parse(item.eventAt || '') || Number(item.receivedAt) || 0;
function mergeCompletions(items) {
  const latest = new Map();
  for (const item of items) {
    if (!item?.id || !item.task?.id || !item.task?.source) continue;
    const key = completionKey(item), previous = latest.get(key);
    if (!previous || completionTime(item) >= completionTime(previous)) latest.set(key, {...item, taskId:key});
  }
  return [...latest.values()];
}

class CompletionInbox {
  constructor(file = null) {
    this.file = file;
    this.items = new Map();
    this.seen = new Set();
    if (file && fs.existsSync(file)) {
      const items = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Array.isArray(items)) throw new Error("Invalid completion inbox");
      this.restore(items);
    }
  }
  restore(items) {
    this.items = new Map(mergeCompletions(items).map(item => [item.id, item]));
    this.seen = new Set(items.filter(item=>item?.id).map(item=>item.id).slice(-1000));
  }
  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(`${this.file}.tmp`, JSON.stringify([...this.items.values()]));
    fs.renameSync(`${this.file}.tmp`, this.file);
  }
  discardSuperseded(taskNotices) {
    const previous = this.items;
    this.items = new Map([...previous].filter(([, item]) => {
      const saved = taskNotices[completionKey(item)];
      if (!saved) return true;
      if (item.turnId && saved.retiredTurns?.includes(item.turnId)) return false;
      let event;
      try { event = JSON.parse(saved.eventId); } catch { return true; }
      if (!Array.isArray(event)) return true;
      const [turn, status, at] = event;
      // Only authoritative, same-turn execution evidence supersedes a completion.
      // Missing tasks, offline snapshots and unknown status are not a dismissal.
      const continued = ['running', 'queued', 'paused', 'needs_attention', 'failed', 'stopped'].includes(status);
      return !(turn === item.turnId && continued && Date.parse(at) >= completionTime(item));
    }));
    if (this.items.size === previous.size) return false;
    try { this.save(); } catch (error) { this.items = previous; throw error; }
    return true;
  }
  add(event, task) {
    if (this.seen.has(event.id)) return false;
    const item = { ...event, receivedAt: event.receivedAt || Date.now(), task: { source: task.source, id: task.id, title: event.title, turnId: event.turnId } };
    const previous = this.items;
    const current = [...previous.values()].find(value=>completionKey(value)===completionKey(item));
    if (current && completionTime(item) < completionTime(current)) return false;
    this.items = new Map(mergeCompletions([...previous.values(),item]).map(value=>[value.id,value]));
    try { this.save(); } catch (error) { this.items=previous; throw error; }
    this.seen.add(item.id);
    while(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);
    return true;
  }
  acknowledge(id) {
    const item = this.items.get(id);
    if (!item) return false;
    this.items.delete(id);
    try { this.save(); } catch (error) { this.items.set(id, item); throw error; }
    return true;
  }
}
module.exports = { CompletionInbox, retainCompletions, completionKey, mergeCompletions };
