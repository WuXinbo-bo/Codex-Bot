const fs = require("node:fs");
const { StringDecoder } = require("node:string_decoder");

// Bounded incremental reads preserve partial UTF-8 and JSON lines between appends.
class RolloutReader {
  constructor() { this.reset(); }
  reset() {
    this.offset = 0; this.inode = null; this.mtime = 0; this.partial = "";
    this.decoder = new StringDecoder("utf8"); this.status = null; this.turnId = "";
    this.eventAt = null; this.waitReason = null; this.waitCall = null; this.growthAt = 0;
    this.seeded = false; this.skipFirstLine = false;
    this.observedRunningTurn = null;
    this.observedSize = null;
  }
  consume(entry) {
    const p = entry.payload || {};
    const type = entry.type === "event_msg" ? p.type : null;
    const at = entry.timestamp || null;
    if (type === "task_started") {
      this.turnId = String(p.turn_id || at || ""); this.status = "running";
      this.eventAt = at; this.waitReason = null; this.waitCall = null;
    } else if (["task_complete", "turn_aborted", "task_failed"].includes(type)) {
      if (p.turn_id && this.turnId && p.turn_id !== this.turnId) return;
      this.turnId = String(p.turn_id || this.turnId || at || "");
      this.status = type === "task_complete" ? "completed" : type === "turn_aborted" ? "stopped" : "failed";
      this.eventAt = at; this.waitReason = null; this.waitCall = null;
    } else if (["request_user_input", "approval_requested"].includes(type)) {
      this.status = "needs_attention"; this.waitReason = type === "approval_requested" ? "approval" : "input"; this.eventAt = at;
    } else if (["user_input_received", "approval_resolved"].includes(type)) {
      this.status = "running"; this.waitReason = null; this.eventAt = at;
    }
    if (entry.type === "response_item") {
      if (["function_call", "custom_tool_call"].includes(p.type) && /(?:^|[.:_])request_user_input(?:_async)?$/.test(p.name || "")) {
        this.waitCall = p.call_id; this.waitReason = "input"; this.status = "needs_attention"; this.eventAt = at;
      } else if (this.waitCall && p.call_id === this.waitCall && ["function_call_output", "custom_tool_call_output"].includes(p.type)) {
        this.waitCall = null; this.waitReason = null; this.status = "running"; this.eventAt = at;
      }
    }
  }
  async read(file, now = Date.now()) {
    const handle = await fs.promises.open(file, "r");
    try {
      const stat = await handle.stat();
      if (this.inode !== null && (stat.ino !== this.inode || stat.size < this.offset || (stat.size === this.offset && stat.mtimeMs !== this.mtime))) this.reset();
      this.inode = stat.ino;
      const wasSeeded = this.seeded;
      if (!this.seeded && stat.size > 256 * 1024) {
        let position = stat.size;
        let scanned = 0;
        let suffix = "";
        // Locate a recent lifecycle from the tail, with a hard cold-start budget.
        while (position > 0 && scanned < 8 * 1024 * 1024) {
          const length = Math.min(position, 256 * 1024);
          position -= length; scanned += length;
          const chunk = Buffer.alloc(length);
          await handle.read(chunk, 0, length, position);
          const lines = (chunk.toString("utf8") + suffix).split(/\r?\n/);
          suffix = lines.shift() || "";
          if (position === 0) lines.unshift(suffix);
          const found = lines.some(line => {
            if (!line.includes('"event_msg"')) return false;
            try { const e = JSON.parse(line); return e.type === "event_msg" && ["task_started", "task_complete", "turn_aborted", "task_failed"].includes(e.payload?.type); } catch { return false; }
          });
          if (found || position === 0) break;
        }
        this.offset = position; this.skipFirstLine = position > 0;
      }
      this.seeded = true;
      if (wasSeeded && this.observedSize !== null && stat.size > this.observedSize) this.growthAt = now;
      this.observedSize = stat.size;
      const end = Math.min(stat.size, this.offset + 8 * 1024 * 1024);
      const buffer = Buffer.alloc(64 * 1024);
      while (this.offset < end) {
        const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, end - this.offset), this.offset);
        if (!bytesRead) break;
        this.offset += bytesRead;
        const lines = (this.partial + this.decoder.write(buffer.subarray(0, bytesRead))).split(/\r?\n/);
        this.partial = lines.pop();
        if (this.skipFirstLine && lines.length) { lines.shift(); this.skipFirstLine = false; }
        for (const line of lines) { try {
          const entry = JSON.parse(line); this.consume(entry);
          const time = Date.parse(entry.timestamp);
          if (Number.isFinite(time) && time > 0 && time <= now + 5000) this.growthAt = Math.max(this.growthAt, Math.min(time, now));
        } catch { /* Ignore corrupt complete lines. */ } }
      }
      this.mtime = stat.mtimeMs;
      const pending = this.offset < stat.size;
      const quiet = this.status === "running" && now - this.growthAt > 120000;
      const status = pending || (quiet && this.observedRunningTurn !== this.turnId) ? "unknown" : this.status || "unknown";
      if (status === "running") this.observedRunningTurn = this.turnId;
      const trackedActive = status === "unknown" && this.status === "running" && this.observedRunningTurn !== null && this.observedRunningTurn === this.turnId;
      return { status, trackedActive, quiet: quiet && !pending, lastActivityAt: this.growthAt ? new Date(this.growthAt).toISOString() : null, lastKnownStatus: this.status, turnId: this.turnId, eventAt: this.eventAt, waitReason: this.waitReason, pending, observedAt: new Date(now).toISOString(), evidence: "rollout" };
    } finally { await handle.close(); }
  }
}

module.exports = { RolloutReader };
