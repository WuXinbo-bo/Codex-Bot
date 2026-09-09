(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MetaBotMaskSystem = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  const defs = [
    ["happy", "开心", "＾ ＾", "#ffe7a5"],
    ["love", "心动", "♥ ♥", "#ffcddd"],
    ["shock", "震惊", "○ ○", "#d1ebff"],
    ["sleepy", "困困", "— —", "#dbd4ff"],
    ["focus", "专注", "▰ ▰", "#c5efd9"],
    ["error", "出错", "× ×", "#ffd2c9"],
    ["celebrate", "庆祝", "★ ★", "#ffe692"],
    ["confused", "疑惑", "? ?", "#e1ddff"],
    ["cry", "大哭", "ಥ ಥ", "#c9eaff"],
    ["angry", "气鼓鼓", "ಠ_ಠ", "#ffbca9"],
    ["shy", "害羞", "◡ ◡", "#ffdae9"],
    ["cool", "墨镜", "▰ ▰", "#cedfe8"],
    ["cat", "猫咪", "ฅ ฅ", "#ffe0bb"],
    ["dog", "小狗", "● ●", "#ead4bc"],
    ["panda", "熊猫", "● ●", "#f3f2ec"],
    ["fox", "狐狸", "ᵔ ᵔ", "#ffd0a1"],
    ["dizzy", "晕晕", "@ @", "#e5d6ff"],
    ["wink", "眨眼", "> ^", "#ffdfba"],
    ["proud", "得意", "⌐ ⌐", "#d7efc5"],
    ["blank", "无语", "— —", "#e1e7eb"],
    ["idea", "灵感", "★ ★", "#fff0b0"],
    ["loading", "等待", "· · ·", "#c9e6ed"],
    ["peek", "偷看", "◉ ·", "#d8e1ff"],
    ["party", "派对", "★ ★", "#efd0ff"],
  ];
  const MASKS = Object.fromEntries(
    defs.map(([id, label, eyes, fill]) => [id, { id, label, eyes, fill }]),
  );
  const POOLS = {
    idle: [
      "happy",
      "cat",
      "dog",
      "panda",
      "fox",
      "shy",
      "wink",
      "peek",
      "cool",
      "blank",
    ],
    running: ["focus", "idea", "loading", "proud"],
    queued: ["loading", "sleepy"],
    paused: ["sleepy", "blank"],
    needs_attention: ["confused", "peek", "shock"],
    failed: ["error", "cry", "shock"],
    completed: ["celebrate", "party", "love", "proud"],
    unknown: ["confused", "loading"],
    offline: ["blank", "confused"],
    stopped: ["blank", "sleepy"],
  };
  const STATUS = {
    running: "focus",
    queued: "focus",
    needs_attention: "confused",
    completed: "celebrate",
    failed: "error",
    waiting: "sleepy",
    input: "confused",
  };
  const CHAINS = ["classic", "peek", "flip", "crooked", "slip", "flourish"];
  const PRIORITY = {
    running: 2,
    queued: 2,
    completed: 4,
    needs_attention: 5,
    failed: 6,
    unknown: 3,
    offline: 3,
  };
  const clamp = (v) => Math.max(0, Math.min(1, v)),
    ease = (v) => {
      v = clamp(v);
      return v * v * (3 - 2 * v);
    };
  function sample(age, chain = "classic", reduced = false) {
    if (age < 0 || age >= 5200)
      return {
        phase: "hidden",
        visible: false,
        cover: 0,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        hand: 0,
        back: false,
      };
    if (reduced)
      return {
        phase: "wearing",
        visible: true,
        cover: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        hand: 0,
        back: false,
      };
    let phase,
      x = 0,
      y = 0,
      scale = 1,
      rotate = 0,
      cover = 0,
      hand = 1,
      back = false;
    if (age < 300) {
      phase = "reach_back";
      back = true;
      x = 24;
      y = 21;
      scale = 0.7;
      rotate = -30;
    } else if (age < 650) {
      phase = "pull_mask";
      let t = ease((age - 300) / 350);
      x = 24 + 8 * t;
      y = 21 - 7 * t;
      scale = 0.7;
      rotate = -30 + 10 * t;
      back = age < 410;
    } else if (age < 1050) {
      phase = "raise_mask";
      let t = ease((age - 650) / 400);
      x = 32 * (1 - t);
      y = 14 * (1 - t);
      scale = 0.7 + 0.3 * t;
      rotate = -20 * (1 - t);
    } else if (age < 1300) {
      phase = "put_on";
      let t = ease((age - 1050) / 250);
      scale = 1 + 0.035 * Math.sin(t * Math.PI);
      cover = t;
    } else if (age < 4200) {
      phase = "wearing";
      cover = 1;
      hand = 0;
    } else if (age < 4750) {
      phase = "remove_mask";
      let t = ease((age - 4200) / 550);
      x = 32 * t;
      y = 14 * t;
      scale = 1 - 0.3 * t;
      rotate = -20 * t;
      cover = 1 - t;
    } else {
      phase = "hide_back";
      let t = ease((age - 4750) / 450);
      x = 32 - 8 * t;
      y = 14 + 7 * t;
      scale = 0.7;
      rotate = -20 - 10 * t;
      back = age > 4930;
    }
    if (chain === "peek" && phase === "raise_mask")
      y += 10 * Math.sin(((age - 650) / 400) * Math.PI);
    if (chain === "flip" && phase === "raise_mask")
      rotate += 360 * ease((age - 650) / 400);
    if (chain === "crooked" && phase === "wearing") {
      const t = clamp((age - 1600) / 700);
      rotate = 13 * Math.sin(t * Math.PI);
      hand = t > 0 && t < 1 ? 1 : 0;
    }
    if (chain === "slip" && phase === "wearing") {
      const t = clamp((age - 2100) / 900);
      y = 10 * Math.sin(t * Math.PI);
      rotate = 6 * Math.sin(t * Math.PI);
      hand = t > 0 && t < 1 ? 1 : 0;
    }
    if (chain === "flourish" && phase === "raise_mask")
      y -= 20 * Math.sin(((age - 650) / 400) * Math.PI);
    return { phase, visible: true, x, y, scale, rotate, cover, hand, back };
  }
  function createController({
    now = () => performance.now(),
    random = Math.random,
  } = {}) {
    let config = {},
      status = "idle",
      current = null,
      nextAt = 0,
      last = "",
      history = [],
      seen = [],
      pending = null,
      pausedAt = null, blocked=false, suppressed=0;
    const interval = () =>
      (config.coordinated?{rare:120000,normal:65000,lively:40000}:{ rare: 60000, normal: 25000, lively: 12000 })[config.maskFrequency] ||
      25000;
    function request(state = status, event = false, id, chain) {
      if (
        config.masks === false ||
        config.emoji === false ||
        (!id && config.maskAuto === false)
      )
        return false;
      const t = now(),
        priority = PRIORITY[state] || 1;
      if(!id&&config.coordinated&&(blocked||t<nextAt)){suppressed++;return false;}
      if(pausedAt!==null&&!id){if(event&&(!pending||(PRIORITY[pending]||1)<=priority))pending=state;return false;}
      if (!id && current && t - current.at < 5200) {
        if (event && priority > current.priority) current = null;
        else {
          if (event && current.semantic !== state && (!pending || (PRIORITY[pending] || 1) <= priority))
            pending = state;
          return false;
        }
      }
      if (!id && !event && t < nextAt) return false;
      const pool = POOLS[state] || POOLS.idle,
        choices = pool.filter((x) => !history.slice(-2).includes(x));
      const candidates = choices.length ? choices : pool;
      const name =
        id ||
        candidates[
          config.random === false ? 0 : Math.floor(random() * candidates.length)
        ];
      if (!MASKS[name]) return false;
      const chains = CHAINS.filter((x) => x !== last);
      chain = CHAINS.includes(chain)
        ? chain
        : config.random === false
          ? "classic"
          : chains[Math.floor(random() * chains.length)];
      current = { id: name, chain, at: t, priority, semantic:state,manual:Boolean(id) };
      last = chain;
      history.push(name);
      history = history.slice(-8);
      nextAt = t + interval();
      return true;
    }
    return {
      context(value){blocked=Boolean(value);if(blocked&&config.coordinated&&!current?.manual){current=null;pending=null;}},
      configure(v) {
        config = { ...v };
        if (
          config.masks === false ||
          config.emoji === false ||
          config.maskAuto === false
        ) {
          current = null;
          pending = null;
        }
        nextAt = now() + interval();
      },
      status(v) {
        if (v === status) return;
        status = v;
        request(status, true);
      },
      lifecycle(k, ids = []) {
        const fresh = ids.filter((id) => !seen.includes(id));
        if (ids.length && !fresh.length) return false;
        seen.push(...fresh);
        seen = seen.slice(-256);
        return request(
          {
            started: "running",
            joined: "running",
            completed: "completed",
            failed: "failed",
            attention: "needs_attention",
            stopped: "stopped",
          }[k] || status,
          true,
        );
      },
      interact(type) {
        if(type==='drag-start'){pausedAt=now();return false;}
        if(['drag-end','drag-cancel'].includes(type)&&pausedAt!==null){if(current)current.at+=now()-pausedAt;pausedAt=null;return false;}
        if (
          ![
            "press",
            "click",
            "pointer-enter",
            "hover-enter",
            "proximity-enter",
            "dwell",
            "return",
            "panel-open",
          ].includes(type)
        )
          return false;
        return request(status);
      },
      preview(id, chain) {
        return request(status, true, id, chain);
      },
      clear(immediate = false) {
        if (immediate) current = null;
        else if (current) current.at = now() - 4200;
        pending = null;
        nextAt = now() + interval();
      },
      tick(reduced = false) {
        const t = now();
        if(pausedAt!==null)return sample(-1);
        if (current && t - current.at >= 5200) current = null;
        if (!current && pending) {
          const p = pending;
          pending = null;
          request(p, true);
        }
        if (!current && config.random !== false && !reduced && t >= nextAt)
          request(status);
        return current
          ? { ...current, ...sample(t - current.at, current.chain, reduced) }
          : sample(-1);
      },
      state: () => ({
        status,
        current: current && { ...current },
        history: [...history],
        pending,
        blocked,suppressed,
      }),
    };
  }
  // Self-contained original SVG art. No emoji font metrics or external sticker licenses.
  function draw(make, group, id, style = "sticker") {
    group.textContent = "";
    const m = MASKS[id];
    if (!m) return;
    const ink = "#27303b";
    const path = (d, fill = "none", stroke = ink, w = 3, parent = group) => {
      const el = make("path", {
        d,
        fill,
        stroke,
        "stroke-width": w,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      });
      parent.append(el);
      return el;
    };
    const oval = (x, y, rx, ry, fill, parent = group) =>
      parent.append(make("ellipse", { cx: x, cy: y, rx, ry, fill }));
    if (["cat", "fox"].includes(id))
      path(
        "M -36 -17 L -34 -44 L -12 -29 M 12 -29 L 34 -44 L 36 -17",
        m.fill,
        ink,
        2,
      );
    if (["dog", "panda"].includes(id)) {
      oval(-29, -27, 12, 17, id === "panda" ? ink : "#a67959");
      oval(29, -27, 12, 17, id === "panda" ? ink : "#a67959");
    }
    const outline =
      "M -40 -16 Q -40 -34 -22 -34 H 22 Q 40 -34 40 -16 V 16 Q 40 34 22 34 H -22 Q -40 34 -40 16 Z";
    const shadow = path(outline, "#172633", "none");
    shadow.setAttribute("transform", "translate(0 3)");
    shadow.setAttribute("opacity", ".18");
    path(
      outline,
      style === "holo" ? "#d9faff" : style === "paper" ? "#fff8eb" : m.fill,
      style === "holo" ? "#369db6" : style === "paper" ? "#98816b" : "#fff",
      2.5,
    );
    path("M -29 -22 Q -26 -27 -18 -27 H 12", "none", "#fff", 3);
    if (style === "paper") path("M 24 27 L 35 17 L 35 26 Z", "#e6dcc7", "none");
    if (style === "holo")
      for (let y = -24; y <= 24; y += 8)
        path(`M -32 ${y} H 32`, "none", "#68bdca", 0.5);
    for (const [side, x] of [
      [0, -17],
      [1, 17],
    ]) {
      const eye = make("g", { transform: `translate(${x} -6)` });
      group.append(eye);
      const ep = (d, fill = "none", stroke = ink, w = 3) =>
        path(d, fill, stroke, w, eye);
      if (id === "love")
        ep(
          "M 0 10 C -22 -3 -9 -18 0 -8 C 9 -18 22 -3 0 10 Z",
          "#de5278",
          "none",
        );
      else if (["celebrate", "idea", "party"].includes(id))
        ep(
          "M 0 -13 L 4 -4 L 14 -3 L 7 4 L 9 13 L 0 8 L -9 13 L -7 4 L -14 -3 L -4 -4 Z",
          "#a77206",
          "none",
        );
      else if (id === "error") ep("M -8 -9 L 8 9 M 8 -9 L -8 9");
      else if (["happy", "shy"].includes(id)) ep("M -10 2 Q 0 -13 10 2");
      else if (["blank", "sleepy"].includes(id)) ep("M -10 1 H 10");
      else if (id === "focus")
        ep("M -11 -5 H 11 V 7 Q 0 14 -11 7 Z", ink, "none");
      else if (id === "angry")
        ep(
          side
            ? "M -11 -2 L 11 -9 L 7 7 Q 0 12 -7 7 Z"
            : "M -11 -9 L 11 -2 L 7 7 Q 0 12 -7 7 Z",
          ink,
          "none",
        );
      else if (id === "cool") {
        ep("M -14 -9 H 14 L 10 9 Q 0 16 -10 9 Z", ink, "none");
        ep("M -7 -5 L 1 5", "none", "#fff", 2);
      } else if (id === "confused") {
        ep("M -7 -6 C -8 -18 15 -17 8 -3 L 0 3 V 5");
        oval(0, 12, 2, 2, ink, eye);
      } else if (id === "dizzy")
        ep("M 0 0 C 8 -8 12 5 3 8 C -12 13 -16 -9 -3 -13 C 10 -18 18 -3 12 10");
      else if (id === "loading")
        for (const y of [-8, 0, 8]) oval(0, y, 3, 3, ink, eye);
      else if (["cat", "fox"].includes(id))
        ep("M -11 -4 Q 0 12 11 -4 Q 0 -13 -11 -4 Z", ink, "none");
      else if (id === "proud")
        ep("M -10 -1 H 10 Q 7 15 0 13 Q -8 12 -10 -1", ink, "none");
      else if (id === "wink" && side) ep("M 9 -9 L -6 0 L 9 9");
      else if (id === "peek") oval(0, 0, side ? 8 : 3, side ? 13 : 4, ink, eye);
      else if (id === "cry") {
        ep("M -10 -7 Q 0 2 10 -7");
        ep("M -5 1 H 5 V 25 H -5 Z", "#65b5e6", "none");
      } else if (id === "panda") {
        oval(0, 0, 13, 17, ink, eye);
        oval(2, -2, 5, 7, "#fff", eye);
      } else {
        oval(0, 0, 8, 13, ink, eye);
        oval(-2, -4, 2.5, 3.5, "#fff", eye);
      }
    }
    // Mouth is part of the removable prop only; the robot's base face stays mouthless.
    if (["shock", "sleepy", "idea"].includes(id)) oval(0, 20, 5, 7, ink);
    else if (["angry", "cry"].includes(id)) path("M -9 23 Q 0 12 9 23");
    else if (["blank", "loading", "focus", "shy", "peek"].includes(id))
      path("M -6 20 H 6");
    else if (["error", "dizzy", "confused"].includes(id))
      path("M -10 21 Q -5 14 0 21 Q 5 28 10 21");
    else if (["cat", "fox", "dog"].includes(id)) {
      path("M -9 18 Q -4 25 0 18 Q 4 25 9 18");
      if (id === "dog") path("M 0 21 V 28", "none", "#dd7f91", 4);
    } else path("M -9 16 Q 0 27 9 16");
    if (["shy", "love", "happy", "wink"].includes(id)) {
      oval(-28, 14, 7, 4, "#ef91a2");
      oval(28, 14, 7, 4, "#ef91a2");
    }
    if (["cat", "fox"].includes(id))
      path(
        "M -33 10 L -23 13 M -34 17 H -24 M 23 13 L 33 10 M 24 17 H 34",
        "none",
        "#a97348",
        1.5,
      );
    if (id === "party")
      path("M -8 -34 L 5 -49 L 15 -34 Z", "#ad77d6", "#fff", 2);
    if (id === "idea")
      path(
        "M -5 -41 H 5 M 0 -46 V -51 M -13 -42 L -18 -46 M 13 -42 L 18 -46",
        "none",
        "#b88200",
        2.5,
      );
    if (id === "angry")
      path("M 24 -24 H 30 V -18 M 32 -26 V -30 H 26", "none", "#b53f32", 2);
  }
  return {
    MASKS,
    POOLS,
    STATUS,
    CHAINS,
    PRIORITY,
    sample,
    createController,
    draw,
    names: Object.keys(MASKS),
  };
});
