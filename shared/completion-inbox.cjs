const fs = require("node:fs");
const path = require("node:path");
const retainCompletions = config => config?.notifications?.retainCompletions !== false;

class CompletionInbox {
  constructor(file = null) {
    this.file = file;
    this.items = new Map();
    if (file && fs.existsSync(file)) {
      const items = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Array.isArray(items)) throw new Error("Invalid completion inbox");
      for (const item of items) if (item?.id && item.task?.id && item.task?.source) this.items.set(item.id, item);
    }
  }
  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(`${this.file}.tmp`, JSON.stringify([...this.items.values()]));
    fs.renameSync(`${this.file}.tmp`, this.file);
  }
  add(event, task) {
    if (this.items.has(event.id)) return;
    const item = { ...event, receivedAt: event.receivedAt || Date.now(), task: { source: task.source, id: task.id, title: event.title, turnId: event.turnId } };
    this.items.set(item.id, item);
    try { this.save(); } catch (error) { this.items.delete(item.id); throw error; }
  }
  acknowledge(id) {
    const item = this.items.get(id);
    if (!item) return false;
    this.items.delete(id);
    try { this.save(); } catch (error) { this.items.set(id, item); throw error; }
    return true;
  }
}
module.exports = { CompletionInbox, retainCompletions };
