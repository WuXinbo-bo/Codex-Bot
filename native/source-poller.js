export function createSourcePoller({
  names,
  run,
  delay,
  onError = () => {},
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const slots = new Map(
    names.map((name) => [name, { promise: null, again: false, timer: null }]),
  );
  let closed = false;
  let paused = false;
  function refresh(name) {
    const slot = slots.get(name);
    if (!slot || closed || paused) return Promise.resolve();
    if (slot.promise) {
      slot.again = true;
      return slot.promise;
    }
    clearTimer(slot.timer);
    slot.promise = (async () => {
      let passes = 0;
      do {
        slot.again = false;
        await run(name);
        passes++;
      } while (slot.again && !closed && !paused && passes < 2);
    })().finally(() => {
      slot.promise = null;
      const ms = delay(name);
      if (!closed && !paused && ms !== null)
        slot.timer = setTimer(() => refresh(name).catch(onError), slot.again ? 0 : ms);
    });
    return slot.promise;
  }
  return {
    pause: async () => {
      paused = true;
      for (const s of slots.values()) clearTimer(s.timer);
      await Promise.allSettled([...slots.values()].map(s => s.promise));
    },
    resume: () => { paused = false; },
    refresh,
    refreshAll: () => Promise.all(names.map(refresh)),
    stop: () => {
      closed = true;
      for (const s of slots.values()) clearTimer(s.timer);
    },
  };
}
