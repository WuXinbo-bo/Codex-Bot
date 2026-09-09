const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const esbuild = require("esbuild");
const built = esbuild.buildSync({
  entryPoints: [path.join(__dirname, "../native/codex.js")],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
});
const loaded = new Module(path.join(__dirname, "native-adapter.cjs"), module);
loaded.paths = module.paths;
loaded._compile(
  built.outputFiles[0].text,
  path.join(__dirname, "native-adapter.cjs"),
);
const { NativeCodex } = loaded.exports;
test("continuous invalidation cannot keep a refresh promise pending forever", async () => {
  const source = esbuild.buildSync({entryPoints:[path.join(__dirname, '../native/source-poller.js')],bundle:true,platform:'node',format:'cjs',write:false});
  const mod = new Module(__filename, module);
  mod._compile(source.outputFiles[0].text, __filename);
  let calls = 0;
  const timers = [];
  const poller = mod.exports.createSourcePoller({ names:['codex'], delay:()=>1500,
    setTimer:(fn, ms)=>{timers.push(ms); return 1;}, clearTimer:()=>{},
    run:async()=>{calls++; await Promise.resolve(); poller.refresh('codex');} });
  await poller.refresh('codex');
  assert.equal(calls, 2);
  assert.deepEqual(timers, [0]);
  poller.stop();
});
test("native history cursor advances across refreshes instead of repeating page two", async () => {
  const cursors = [];
  const adapter = new NativeCodex(
    async (op, args) => {
      if (op === "watch") return true;
      if (op === "rpc") {
        cursors.push(args.params.cursor);
        return {
          data: [],
          nextCursor:
            args.params.cursor === null
              ? "page-two"
              : args.params.cursor === "page-two"
                ? "page-three"
                : null,
        };
      }
    },
    {},
    () => {},
  );
  await adapter.snapshot();
  await adapter.loadMore();
  await adapter.snapshot();
  await adapter.loadMore();
  await adapter.snapshot();
  assert.deepEqual(cursors, [null, "page-two", null, "page-three", null]);
  assert.equal(adapter.nextCursor, null);
});
const pollerBuilt = esbuild.buildSync({
  entryPoints: [path.join(__dirname, "../native/source-poller.js")],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
});
const pollerModule = new Module("native-poller", module);
pollerModule._compile(
  pollerBuilt.outputFiles[0].text,
  path.join(__dirname, "native-poller.cjs"),
);
const { createSourcePoller } = pollerModule.exports;
test("native sources schedule independently while another source is blocked", async () => {
  let unblock;
  const slow = new Promise((resolve) => (unblock = resolve));
  const scheduled = [];
  const poller = createSourcePoller({
    names: ["fast", "slow"],
    run: async (name) => {
      if (name === "slow") await slow;
    },
    delay: () => 1000,
    setTimer: (fn, ms) => {
      scheduled.push({ fn, ms });
      return scheduled.length;
    },
    clearTimer: () => {},
  });
  const all = poller.refreshAll();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(scheduled.length, 1);
  unblock();
  await all;
  assert.equal(scheduled.length, 2);
  poller.stop();
});
test("native refresh joins a newer pass when input arrives during an active query", async () => {
  let unblock;
  const gate = new Promise((resolve) => (unblock = resolve));
  let calls = 0;
  const poller = createSourcePoller({
    names: ["codex"],
    run: async () => {
      if (++calls === 1) await gate;
    },
    delay: () => null,
  });
  const first = poller.refresh("codex");
  const second = poller.refresh("codex");
  unblock();
  await Promise.all([first, second]);
  assert.equal(calls, 2);
  poller.stop();
});
const event = (type, turn = "t") => ({
  type: "event_msg",
  timestamp: new Date().toISOString(),
  payload: { type, turn_id: turn },
});
const delta = (entries, extra = {}) => ({
  reset: false,
  entries,
  modified: Date.now(),
  growth: true,
  pending: false,
  metadata: null,
  ...extra,
});
test("fresh lifecycle is recognized on cold start even with frozen four-hour-old mtime", async () => {
  const adapter = new NativeCodex(async () => delta([event('task_started', 'new')], {
    reset:true, appended:false, modified:Date.now()-14400000,
  }), {}, () => {});
  const result = await adapter.read('frozen.jsonl');
  assert.equal(result.status, 'running');
  assert.equal(result.quiet, false);
  assert.equal(adapter.readers.get('frozen.jsonl').observedRunningTurn, 'new');
});
test("unread historical chunks are not live appends; fresh unfiltered events restore cold activity", async () => {
  const old = new Date(Date.now()-14400000).toISOString();
  let payload = delta([{...event('task_started'),timestamp:old}], {reset:true,pending:true,modified:Date.now()});
  const adapter = new NativeCodex(async () => payload, {}, () => {});
  await adapter.read('history.jsonl');
  payload = delta([], {appended:false});
  assert.equal((await adapter.read('history.jsonl')).status, 'unknown');
  payload = delta([], {appended:false,latestEventAt:new Date().toISOString()});
  assert.equal((await adapter.read('history.jsonl')).status, 'running');
});
test("real append with frozen mtime establishes liveness and the next turn is recognized", async () => {
  const old = new Date(Date.now()-14400000).toISOString();
  let payload = delta([{...event('task_started'),timestamp:old}], {reset:true,modified:Date.parse(old)});
  const adapter = new NativeCodex(async () => payload, {}, () => {});
  assert.equal((await adapter.read('append.jsonl')).status, 'unknown');
  payload = delta([], {appended:true,modified:Date.parse(old)});
  assert.equal((await adapter.read('append.jsonl')).status, 'running');
  payload = delta([event('task_complete')], {appended:true,modified:Date.parse(old)});
  assert.equal((await adapter.read('append.jsonl')).status, 'completed');
  payload = delta([event('task_started','next')], {appended:true,modified:Date.parse(old)});
  const next = await adapter.read('append.jsonl');
  assert.equal(next.status, 'running');
  assert.equal(next.turnId, 'next');
});
test("reader recreation requests native replay and Windows aliases share one cursor", async () => {
  const resets = [];
  const adapter = new NativeCodex(async (op, args) => {
    resets.push(args.reset);
    return delta(args.reset ? [event("task_started")] : [], { reset: args.reset });
  }, {}, () => {});
  assert.equal((await adapter.read("C:\\Logs\\a.jsonl")).status, "running");
  assert.equal((await adapter.read("\\\\?\\C:\\Logs\\a.jsonl")).status, "running");
  adapter.readers.clear();
  assert.equal((await adapter.read("c:/logs/a.jsonl")).status, "running");
  assert.deepEqual(resets, [true, false, true]);
});
test("reloading an unchanged fresh log preserves its real modification time", async () => {
  const adapter = new NativeCodex(async () => delta([event('task_started')], {
    reset:true, growth:false, modified:Date.now(),
  }), {}, () => {});
  assert.equal((await adapter.read('fresh.jsonl')).status, 'running');
});
test("database idle cannot erase rollout lifecycle and cold replay waits for its last chunk", async () => {
  let n = 0;
  const adapter = new NativeCodex(async (op) => {
    if (op === "watch") return true;
    if (op === "rpc") return { data: [{ id: "a", path: "a.jsonl", status: { type: "idle" } }] };
    n++;
    return delta(n === 1 ? [event("task_started")] : [], { pending: n === 1, reset: n === 1 });
  }, {}, () => {});
  assert.equal((await adapter.snapshot())[0].status, "unknown");
  assert.equal(adapter.coverage.pending, 1);
  assert.equal((await adapter.snapshot())[0].status, "running");
  assert.equal(adapter.coverage.pending, 0);
});
test("unhydrated tasks beyond first 25 are eventually checked without watch events", async () => {
  const adapter = new NativeCodex(async (op, args) => {
    if (op === "watch") return true;
    if (op === "rpc") return { data: Array.from({length: 40}, (_, i) => ({id: String(i), path: `${i}.jsonl`})) };
    return delta([event(args.file === "39.jsonl" ? "task_started" : "task_complete")]);
  }, {}, () => {});
  await adapter.snapshot();
  await adapter.snapshot();
  assert.equal((await adapter.snapshot()).at(-1).status, "running");
});
test("newer watched rollout wins over stale database path across refreshes", async () => {
  const adapter = new NativeCodex(async (op, args) => {
    if (op === "watch") return true;
    if (op === "rpc") return { data: [{ id: "a", path: "old.jsonl" }] };
    const fresh = args.file === "new.jsonl";
    return delta([event(fresh ? "task_started" : "task_complete")], {
      metadata: { id: "a" }, modified: Date.now() - (fresh ? 0 : 10000),
    });
  }, {}, () => {});
  adapter.paths.add("new.jsonl");
  assert.equal((await adapter.snapshot())[0].status, "running");
  assert.equal((await adapter.snapshot())[0].status, "running");
});
test("native adapter reuses lifecycle parser and preserves partial/quiet task evidence", async () => {
  let payload = delta([event("task_started")], { reset: true });
  const adapter = new NativeCodex(
    async () => payload,
    {},
    () => {},
  );
  assert.equal((await adapter.read("log")).status, "running");
  payload = delta([event("task_complete", "wrong")]);
  assert.equal((await adapter.read("log")).status, "running");
  payload = delta([], { growth: false });
  adapter.readers.get("log").growthAt = Date.now() - 130000;
  const quiet = await adapter.read("log");
  assert.equal(quiet.status, "running");
  assert.equal(quiet.quiet, true);
  assert.equal(quiet.trackedActive, false);
  payload = delta([event("task_complete")]);
  assert.equal((await adapter.read("log")).status, "completed");
});
test("native adapter discovers a running task from watcher beyond the recent list", async () => {
  const adapter = new NativeCodex(
    async (op, args) => {
      if (op === "watch") return true;
      if (op === "rpc") return { data: [], nextCursor: null };
      if (op === "log")
        return delta([event("task_started")], {
          reset: true,
          metadata: { id: "new", cwd: "D:/project" },
        });
      throw new Error(op);
    },
    {},
    () => {},
  );
  adapter.paths.add("new.jsonl");
  const tasks = await adapter.snapshot();
  assert.equal(tasks[0].id, "new");
  assert.equal(tasks[0].status, "running");
  assert.equal(tasks[0].projectName, "project");
});
test("native adapter preserves known active tasks missing from a later page", async () => {
  let first = true;
  const adapter = new NativeCodex(
    async (op) => {
      if (op === "watch") return true;
      if (op === "rpc") {
        const data = first
          ? [{ id: "a", path: "a.jsonl", status: { type: "notLoaded" } }]
          : [];
        first = false;
        return { data };
      }
      if (op === "log") return delta([event("task_started")]);
    },
    {},
    () => {},
  );
  assert.equal((await adapter.snapshot()).length, 1);
  assert.equal((await adapter.snapshot()).length, 1);
});
test("native adapter retries database-only compatibility errors without inventing state", async () => {
  let count = 0;
  const adapter = new NativeCodex(
    async (op, args) => {
      if (op === "watch") throw new Error("watch disabled");
      if (op === "rpc") {
        if (++count === 1) throw new Error("-32602 useStateDbOnly");
        assert.equal(args.params.useStateDbOnly, undefined);
        return { data: [{ id: "a", status: { type: "notLoaded" } }] };
      }
    },
    {},
    () => {},
  );
  assert.equal((await adapter.snapshot())[0].status, "unknown");
  assert.equal(adapter.database, false);
  assert.equal(adapter.watching, false);
});
