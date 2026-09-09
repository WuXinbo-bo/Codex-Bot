(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./m1-rig.js") : root.MetaBotM1Rig, typeof module === "object" && module.exports ? require("./m1-accessories.js") : root.MetaBotAccessories);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MetaBotM1 = api;
})(typeof self !== "undefined" ? self : globalThis, function (Rig, Accessories) {
  const NS = "http://www.w3.org/2000/svg";
  const Appearance = typeof module === 'object' && module.exports ? require('./appearance.js') : globalThis.MetaBotAppearance;
  const Masks = typeof module === 'object' && module.exports ? require('./mask-system.js') : globalThis.MetaBotMaskSystem;
  let instance = 0;
  const FX_PATHS = {
    complete: "M 55 7 L 61 12 L 72 3",
    input: "M 119 38 V 43 M 119 48 V 49",
    error: "M 119 38 V 43 M 119 48 V 49"
  };
  const REST = { x: 0, y: 0, rotate: 0, stretch: 0, cross: 0 };
  function svgElement(name, attrs = {}) {
    const element = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    return element;
  }
  const clamp = (v, low, high) => Math.max(low, Math.min(high, Number(v) || 0));
  const ease = (value) => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };

  function create(target, options = {}) {
    if (!target || !Rig) return null;
    target.textContent = "";
    const nowTime = options.now || (() => performance.now());
    const random = options.random || Math.random;
    const prefix = `m1-${++instance}`;
    const svg = svgElement("svg", { viewBox: "0 0 128 128", width: 128, height: 128, role: "img", "aria-label": "Meta Bot" });
    const defs = svgElement("defs");
    const character = svgElement("g", { "data-layer": "character" });
    const backProps = svgElement("g");
    const frontProps = svgElement("g");
    const accessories = Accessories?.create(svgElement, backProps, frontProps) || {};
    const shape = svgElement("g", { "data-layer": "shape" });
    const body = svgElement("path", { fill: Rig.COLORS.body, "data-part": "body" });
    const finish=svgElement('g',{'data-layer':'art-finish','pointer-events':'none'});
    const finishLine=svgElement('path',{fill:'none',stroke:Rig.COLORS.ink,'stroke-width':1.4});
    const finishHighlight=svgElement('path',{fill:'#FFFFFF','fill-opacity':.28});
    finish.append(finishHighlight,finishLine);
    const face = svgElement("g", { "data-layer": "face" });
    const decorations = svgElement('g', {'data-layer':'emotion'});
    for (const x of [31,97]) decorations.append(svgElement('ellipse',{cx:x,cy:77,rx:8,ry:4,fill:'#F58499',opacity:.6}));
    const accents = svgElement('g',{'data-layer':'accents'});
    const accentPaths = {
      sweat: svgElement('path',{d:'M 108 27 Q 97 43 108 45 Q 119 43 108 27',fill:'#65BCE3'}),
      stress: svgElement('path',{d:'M 26 26 L 25 38 M 31 24 L 30 36 M 36 23 L 35 34',stroke:'#667788','stroke-width':2}),
      glint: svgElement('path',{d:'M 64 4 L 67 11 L 74 14 L 67 17 L 64 24 L 61 17 L 54 14 L 61 11 Z',fill:'#FFAC35'})
    };
    accents.append(...Object.values(accentPaths));
    const faceMask = svgElement('g',{'data-part':'face-mask',opacity:0});
    const maskArm = svgElement('path',{fill:'none',stroke:Rig.COLORS.ink,'stroke-width':3.5,'stroke-linecap':'round'});
    const maskArt = svgElement('g');
    const maskHand = svgElement('circle',{r:4,fill:Rig.COLORS.eyes,stroke:Rig.COLORS.ink,'stroke-width':2});
    faceMask.append(maskArm,maskArt,maskHand);
    const arms = svgElement("g", { "data-layer": "arms" });
    const leftArm = svgElement("path", { fill: "none", stroke: Rig.COLORS.ink, "stroke-width": 3.5, "stroke-linecap": "round", "data-part": "arm-left" });
    const rightArm = svgElement("path", { fill: "none", stroke: Rig.COLORS.ink, "stroke-width": 3.5, "stroke-linecap": "round", "data-part": "arm-right" });
    arms.append(leftArm, rightArm);
    shape.append(body, finish, arms);
    const eyes = {};
    for (const side of ["left", "right"]) {
      const outerClip = svgElement("clipPath", { id: `${prefix}-${side}-outline`, clipPathUnits: "userSpaceOnUse" });
      const outline = svgElement("path");
      outerClip.append(outline);
      const lidClip = svgElement("clipPath", { id: `${prefix}-${side}-lid`, clipPathUnits: "userSpaceOnUse" });
      const aperture = svgElement("path");
      lidClip.append(aperture);
      defs.append(outerClip, lidClip);
      const group = svgElement("g", { "data-part": `eye-group-${side}` });
      const clipped = svgElement("g", { "clip-path": `url(#${prefix}-${side}-outline)` });
      const visible = svgElement("g", { "clip-path": `url(#${prefix}-${side}-lid)` });
      const white = svgElement("path", { fill: Rig.COLORS.eyes, "data-part": `eye-${side}` });
      const pupil = svgElement("ellipse", { fill: Rig.COLORS.ink, "data-part": `pupil-${side}` });
      const iris = svgElement('ellipse',{fill:'#537CA4','data-part':`iris-${side}`,opacity:0});
      const shine = svgElement('path',{fill:'white','data-part':`shine-${side}`,opacity:0});
      const closed = svgElement("path", { fill: "none", stroke: Rig.COLORS.ink, "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0 });
      visible.append(white, iris, pupil, shine);
      clipped.append(visible);
      const symbols = Object.fromEntries(Rig.SYMBOLS.map(name => {
        const symbol = svgElement("path", { "data-symbol": name, opacity: 0, "stroke-linecap": "round", "stroke-linejoin": "round" });
        return [name, symbol];
      }));
      const highlights = svgElement("path", { fill: Rig.COLORS.eyes, opacity: 0 });
      const designs = Object.fromEntries(['manga','minimal','pixel','neon','ink','sleepy','asymmetric'].map(id=>[id,svgElement('path',{'data-eye-design':id,opacity:0,fill:'none',stroke:Rig.COLORS.ink,'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'})]));
      group.append(clipped, closed, ...Object.values(designs), ...Object.values(symbols), highlights);
      face.append(group);
      eyes[side] = { group, outline, aperture, white, pupil, iris, shine, designs, closed, visible, clipped, symbols, highlights };
    }
    character.append(backProps, shape, face, decorations, accents, frontProps, faceMask);
    const effects = svgElement("g", { "data-layer": "effects" });
    const fx = Object.fromEntries(Object.entries(FX_PATHS).map(([name, d]) => {
      const path = svgElement("path", { d, fill: "none", stroke: name === "input" ? Rig.COLORS.attention : name === "error" ? Rig.COLORS.error : Rig.COLORS.body, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" });
      effects.append(path);
      return [name, path];
    }));
    svg.append(defs, character, effects);
    target.append(svg);

    let expression = options.expression || "neutral";
    let appearance = Appearance?.normalize(options.appearance) || {};
    let bodyShape='circle', oldShape='circle', shapeAt=-Infinity, shapeDue=0, maskArtKey='';
    const maskController=Masks?.createController({now:nowTime,random});
    maskController?.configure({...appearance,coordinated:true});
    let performanceContext={};
    let current = Rig.getExpression(expression);
    let source = current;
    let destination = current;
    let transitionStarted = 0;
    let transitionDuration = 0;
    let motionLevel = options.motionLevel || "full";
    let active = motionLevel !== "reduced";
    let frame = null;
    let started = nowTime();
    let previousFrame = started;
    let blinkStarted = -Infinity;
    let nextBlink = started + 3200;
    let destroyed = false;
    let tracking = false;
    let gaze = { x: current.gaze.x, y: current.gaze.y };
    let gazeTarget = { x: 0, y: 0 };
    let motion = { ...REST };
    let motionTarget = { ...REST };
    let velocity = { ...REST };
    let motionMode = "idle";
    let armPose = current.arms;
    let performanceStarted = started;
    let performanceMs = 2600;
    let performanceId = null;
    let acting = { bob: 0, sway: 0, tilt: 0, wave: 0, squash: 0 };

    function samplePose(now) {
      if (!transitionDuration) return;
      if(appearance.artStyle==='pixel')now=transitionStarted+Math.floor((now-transitionStarted)/90)*90;
      const amount = ease((now - transitionStarted) / transitionDuration);
      current = Rig.interpolate(source, destination, amount);
      // Eyes register intent first; the body follows rather than snapping in unison.
      const eyeAmount = ease((now - transitionStarted) / Math.max(1,transitionDuration * .72));
      current.eyes = Rig.interpolate(source.eyes,destination.eyes,eyeAmount);
      if (amount >= 1) transitionDuration = 0;
    }

    function render(pose, now) {
      const art=Appearance?.ART_STYLES[appearance.artStyle] || Appearance.ART_STYLES.classic;
      const strength = (motionLevel === "reduced" ? 0 : motionLevel === "soft" ? 0.5 : 1)*art.amplitude;
      const breathe = active ? Math.sin((now - started) / 1250) * pose.breathe * strength : 0;
      const b = pose.body;
      const sx = (motion.stretch + acting.squash) * strength;
      const cross = motion.cross * strength;
      // Exponentiating this traceless symmetric matrix preserves area in every drag direction.
      const magnitude = Math.hypot(sx, cross);
      const factor = magnitude < 1e-6 ? 1 : Math.sinh(magnitude) / magnitude;
      const a = Math.cosh(magnitude) + sx * factor;
      const d = Math.cosh(magnitude) - sx * factor;
      const off = cross * factor;
      const deform = (x, y) => ({ x: 64 + a * (x - 64) + off * (y - 64), y: 64 + off * (x - 64) + d * (y - 64) });
      const rotate = (b.rotate + motion.rotate + acting.tilt) * strength;
      const tx = (motion.x + acting.sway) * strength;
      const ty = (motion.y + acting.bob) * strength;
      const radians = rotate * Math.PI / 180;
      const cos = Math.cos(radians) * (1 + breathe);
      const sin = Math.sin(radians) * (1 + breathe);
      const project = (x, y) => {
        const p = deform(x, y);
        return { x: tx + cos * (p.x - 64) - sin * (p.y - 64), y: ty + sin * (p.x - 64) + cos * (p.y - 64) };
      };
      const center = project(b.cx, b.cy);
      const ex = Math.hypot((cos * a - sin * off) * b.rx, (cos * off - sin * d) * b.ry);
      const ey = Math.hypot((sin * a + cos * off) * b.rx, (sin * off + cos * d) * b.ry);
      let extent = Math.max(Math.abs(center.x) + ex, Math.abs(center.y) + ey);
      shape.setAttribute("transform", `translate(64 64) matrix(${a} ${off} ${off} ${d} 0 0) translate(-64 -64)`);
      body.setAttribute("d", Appearance ? Appearance.path(bodyShape,b,oldShape,motionLevel==='reduced'?1:ease((now-shapeAt)/550)) : Rig.bodyPath(b));
      body.setAttribute('fill',Appearance?.SKINS[appearance.skin]?.[0] || Rig.COLORS.body);
      svg.dataset.artStyle=appearance.artStyle;
      const artStyle=appearance.artStyle;
      finish.setAttribute('transform',`translate(${b.cx} ${b.cy}) scale(${b.rx/52} ${b.ry/52})`);
      finishLine.setAttribute('d',artStyle==='paper'?'M -29 23 L 0 39 L 29 23 M 0 39 L 0 47':artStyle==='doodle'?'M -41 -22 Q -29 -48 -3 -45 M 16 45 Q 43 38 46 12 M -46 4 l -3 9 m 7 15 l 5 6':'');
      finishLine.setAttribute('stroke-dasharray',artStyle==='doodle'?'3 3':'none');
      finishHighlight.setAttribute('d',artStyle==='clay'?'M -35 -19 Q -30 -41 -9 -39 Q -16 -28 -35 -19':artStyle==='paper'?'M -29 23 L 0 39 L -21 36 Z':'');
      svg.setAttribute('shape-rendering',artStyle==='pixel'?'crispEdges':'geometricPrecision');
      if(artStyle==='pixel'){
        const points=Appearance.points(bodyShape).map(p=>[Math.round((b.cx+b.rx*p.x)/5)*5,Math.round((b.cy+b.ry*p.y)/5)*5]);
        body.setAttribute('d',points.map(([x,y],i)=>`${i?'L':'M'} ${x} ${y}`).join(' ')+' Z');
      }
      for(const arm of [leftArm,rightArm])arm.setAttribute('stroke-width',artStyle==='rubber'?5.5:artStyle==='doodle'?2.5:3.5);
      for(const layer of [frontProps,backProps])layer.setAttribute('stroke-linejoin',artStyle==='paper'||artStyle==='pixel'?'miter':'round');
      svg.dataset.shape=bodyShape;
      svg.dataset.skin=appearance.skin || 'green';
      decorations.setAttribute('opacity', Math.max(pose.accents.blush,/delight|victory|shy|complete|curious|love|think|focus|closeness|caring|achievement/.test(expression) ? 1 : 0));
      for(const [id,path] of Object.entries(accentPaths))path.setAttribute('opacity',appearance.particles===false?'0':String(pose.accents[id]));
      decorations.setAttribute('transform',`translate(${b.cx} ${b.cy}) scale(${b.rx/52} ${b.ry/52}) translate(-64 -64)`);
      const occupied=Object.values(pose.accessories).some(p=>p.opacity>.01)||Object.values(pose.arms).some(p=>p.opacity>.1)||performanceContext.panel||performanceContext.lifecycle||performanceContext.theater;
      maskController?.context(occupied);
      const m=maskController?.tick(motionLevel==='reduced');
      faceMask.setAttribute('opacity',m?.visible?'1':'0');
      face.setAttribute('opacity',String(1-(m?.cover||0)));
      if(m?.visible) decorations.setAttribute('opacity','0');
      accents.setAttribute('visibility',m?.visible?'hidden':'visible');
      // Behind-body reach really is occluded; the carrying hand is in front of its plate.
      if(m?.back)character.insertBefore(faceMask,shape);else character.append(faceMask);
      if(m?.visible) {
        const key=m.id+appearance.maskStyle;
        if(key!==maskArtKey){Masks.draw(svgElement,maskArt,m.id,appearance.maskStyle);maskArtKey=key;}
        const cx=b.cx+m.x*b.rx/52,cy=b.cy-4+m.y*b.ry/52;
        const scale=m.scale*Math.min(b.rx,b.ry)/52;
        maskArt.setAttribute('transform',`translate(${cx} ${cy}) rotate(${m.rotate}) scale(${scale})`);
        const rad=m.rotate*Math.PI/180;
        const hx=cx+(38*Math.cos(rad)-14*Math.sin(rad))*scale;
        const hy=cy+(38*Math.sin(rad)+14*Math.cos(rad))*scale;
        maskArm.setAttribute('d',`M ${b.cx+b.rx*.82} ${b.cy+18} Q ${b.cx+b.rx+9} ${b.cy+39} ${hx} ${hy}`);
        maskArm.setAttribute('opacity',String(m.hand));maskHand.setAttribute('opacity',String(m.hand));
        maskHand.setAttribute('cx',String(hx));maskHand.setAttribute('cy',String(hy));
        // Include the prop, ears and reaching hand in the native-window fit calculation.
        for(const px of [-44,44])for(const py of [-54,38]) {
          const vx=cx-64+(px*Math.cos(rad)-py*Math.sin(rad))*scale;
          const vy=cy-64+(px*Math.sin(rad)+py*Math.cos(rad))*scale;
          extent=Math.max(extent,Math.abs(tx+cos*vx-sin*vy)+4,Math.abs(ty+sin*vx+cos*vy)+4);
        }
        extent=Math.max(extent,Math.abs(hx-64)+6,Math.abs(hy-64)+6,b.rx+13);
      }
      svg.dataset.mask=m?.visible?m.id:'';svg.dataset.maskPhase=m?.phase||'hidden';
      effects.setAttribute('visibility',appearance.particles === false?'hidden':'visible');
      const blinkAge = now - blinkStarted;
      const blink = active && blinkAge >= 0 && blinkAge < 190
        ? blinkAge < 70 ? ease(blinkAge / 70) : 1 - ease((blinkAge - 70) / 120) : 0;
      for (const side of ["left", "right"]) {
        const e = pose.eyes[side];
        const parts = eyes[side];
        const center = deform(b.cx + (e.cx - 64) * b.rx / 52, b.cy + (e.cy - 64) * b.ry / 52);
        parts.group.setAttribute("transform", `translate(${center.x - e.cx} ${center.y - e.cy}) rotate(${e.rotate} ${e.cx} ${e.cy})`);
        const path = Rig.eyePath(e);
        parts.outline.setAttribute("d", path);
        parts.white.setAttribute("d", path);
        const upper = e.cy - e.ry + 2 * e.ry * e.upper;
        const lower = e.cy + e.ry - 2 * e.ry * e.lower;
        const middle = (upper + lower) / 2;
        const closure = e.closed + (1 - e.closed) * blink;
        const top = upper + (middle - upper) * closure;
        const bottom = lower + (middle - lower) * closure;
        const arch = (e.lower * 2 + closure * 0.6) * e.ry * (1 - closure);
        const upperArch = (e.upper * 1.2 + closure * 0.6) * e.ry * (1 - closure);
        parts.aperture.setAttribute("d", `M ${e.cx - e.rx - 1} ${top + upperArch / 2} Q ${e.cx} ${top - upperArch} ${e.cx + e.rx + 1} ${top + upperArch / 2} V ${bottom + arch / 2} Q ${e.cx} ${bottom - arch * 1.5} ${e.cx - e.rx - 1} ${bottom + arch / 2} Z`);
        // Finish the lid crossfade before a near-closed eye becomes a pale slit.
        const closedMix = ease((closure - 0.35) / 0.4);
        parts.visible.setAttribute("opacity", String(1 - closedMix));
        parts.closed.setAttribute("d", `M ${e.cx - e.rx * 0.7} ${middle} Q ${e.cx} ${middle + e.arc * e.closed + 3 * (1 - e.closed)} ${e.cx + e.rx * 0.7} ${middle}`);
        parts.closed.setAttribute("stroke-width", String(2.5 + e.closed));
        const pupil = Rig.constrainPupil(e, pose.pupils[side], gaze);
        for (const key of ["cx", "cy", "rx", "ry"]) parts.pupil.setAttribute(key, String(pupil[key]));
        const symbolic = Math.min(1, Object.values(e.symbols).reduce((sum, value) => sum + value, 0));
        const design=pose.eyeDesign;
        const stylized=Math.min(1,design.minimal+design.pixel+design.neon+design.ink);
        parts.clipped.setAttribute("opacity", String((1 - symbolic)*(1-stylized)));
        for(const key of ['cx','cy','rx','ry'])parts.iris.setAttribute(key,String(key==='rx'?pupil.rx+3:key==='ry'?pupil.ry+4:pupil[key]));
        parts.iris.setAttribute('opacity',String(design.anime));
        parts.pupil.setAttribute('rx',String(pupil.rx*(1-.25*design.anime)));
        parts.shine.setAttribute('d',`M ${pupil.cx-3} ${pupil.cy-8} a 3 4 0 1 0 .1 0 M ${pupil.cx+4} ${pupil.cy+4} a 1.5 2 0 1 0 .1 0`);
        parts.shine.setAttribute('opacity',String(design.anime));
        const designPaths={
          manga:`M -17 -12 Q 0 -25 17 -12 M -17 -12 l -4 -4 M 17 -12 l 4 -4`,
          minimal:'M -12 0 Q 0 -7 12 0',
          pixel:'M -12 -14 H 8 V -10 H 12 V 10 H 8 V 14 H -8 V 10 H -12 Z',
          neon:'M -12 -16 Q 12 -22 12 0 Q 12 22 -12 16 Z M -7 0 H 8',
          ink:'M -15 -2 Q 0 -11 14 -4 M -12 2 Q 0 -3 10 0',
          sleepy:'M -18 -2 Q 0 -7 18 -2 M -16 -2 L -20 -5',
          asymmetric:side==='left'?'M -15 -6 Q 0 -14 15 -6':'M -16 -19 Q 0 -25 16 -19'
        };
        for(const [id,path] of Object.entries(parts.designs)){
          path.setAttribute('d',designPaths[id]);path.setAttribute('transform',`translate(${e.cx} ${e.cy}) scale(${e.rx/18} ${e.ry/21})`);
          path.setAttribute('opacity',String(design[id]*(1-symbolic)*(1-closedMix)));
          path.setAttribute('fill',id==='pixel'?Rig.COLORS.ink:'none');
          path.setAttribute('stroke',id==='neon'?'#245F79':Rig.COLORS.ink);
        }
        parts.closed.setAttribute("opacity", String((1 - symbolic) * closedMix));
        const paths = {
          star: "M 0 -18 L 5 -5 L 17 0 L 5 5 L 0 18 L -5 5 L -17 0 L -5 -5 Z",
          heart: "M 0 15 C -30 -3 -13 -24 0 -11 C 13 -24 30 -3 0 15 Z",
          spiral: "M 0 0 C 7 -8 13 4 4 9 C -9 16 -20 -2 -11 -13 C 1 -28 25 -10 15 10",
          squeeze: side === "left" ? "M -12 -10 L 8 0 L -12 10" : "M 12 -10 L -8 0 L 12 10",
          flat: "M -12 2 H 12", cross: "M -10 -10 L 10 10 M 10 -10 L -10 10",
          dot: "M -5 0 A 5 7 0 1 0 5 0 A 5 7 0 1 0 -5 0",
          tear: "M 0 -19 C -24 -19 -22 20 0 20 C 22 20 24 -19 0 -19 Z M -5 -11 A 4 5 0 1 0 -5 -1 A 4 5 0 1 0 -5 -11 M 7 5 A 2 3 0 1 0 7 11 A 2 3 0 1 0 7 5"
        };
        for (const [name, element] of Object.entries(parts.symbols)) {
          const outlineOnly = ["spiral", "squeeze", "flat", "cross"].includes(name);
          element.setAttribute("d", paths[name]);
          element.setAttribute("fill", outlineOnly ? "none" : name === "heart" ? "#EF6684" : name === "star" ? (appearance.skin==='lemon'?'#C45838':'#F4BE4F') : Rig.COLORS.ink);
          element.setAttribute("fill-rule", "evenodd");
          element.setAttribute("stroke", outlineOnly ? Rig.COLORS.ink : "none");
          element.setAttribute("stroke-width", "3.5");
          element.setAttribute("transform", `translate(${e.cx} ${e.cy}) scale(${e.rx / 18} ${e.ry / 21})`);
          element.setAttribute("opacity", String(e.symbols[name]));
        }
        parts.highlights.setAttribute("d", "M -5 -11 A 4 5 0 1 0 -5 -1 A 4 5 0 1 0 -5 -11 M 7 5 A 2 3 0 1 0 7 11 A 2 3 0 1 0 7 5");
        parts.highlights.setAttribute("transform", `translate(${e.cx} ${e.cy}) scale(${e.rx / 18} ${e.ry / 21})`);
        parts.highlights.setAttribute("opacity", String(e.symbols.tear));
      }
      for (const [side, element] of [["left", leftArm], ["right", rightArm]]) {
        const value = armPose[side];
        element.setAttribute("d", `M 18 82 Q ${value.bendX} ${value.bendY} ${value.x} ${value.y} m -2 -4 l 2 4 l 4 -2`);
        const mirror = side === "right" ? "translate(128 0) scale(-1 1)" : "";
        const wave = acting.wave * strength * (side === "right" ? 1 : -0.65);
        element.setAttribute("transform", `translate(${b.cx - 64} ${b.cy - 64}) translate(64 64) scale(${b.rx / 52} ${b.ry / 52}) translate(-64 -64) ${mirror} rotate(${wave} 18 82)`);
        element.setAttribute("opacity", String(value.opacity));
        if (value.opacity > 0.01) {
          const c = Math.cos(wave * Math.PI / 180);
          const s = Math.sin(wave * Math.PI / 180);
          for (const [px, py] of [[18, 82], [value.bendX, value.bendY], [value.x - 2, value.y - 4], [value.x + 4, value.y - 2], [value.x, value.y]]) {
            const x = 18 + c * (px - 18) - s * (py - 82);
            const y = 82 + s * (px - 18) + c * (py - 82);
            const point = project(b.cx + ((side === "right" ? 128 - x : x) - 64) * b.rx / 52, b.cy + (y - 64) * b.ry / 52);
            extent = Math.max(extent, Math.abs(point.x) + 2, Math.abs(point.y) + 2);
          }
        }
      }
      for (const [name, element] of Object.entries(accessories)) {
        const value = pose.accessories[name];
        const layer = value.back>.5 || Accessories.DEFINITIONS[name].layer==='back' ? backProps : frontProps;
        if(element.parentNode!==layer)layer.append(element);
        element.setAttribute("opacity", String(m?.visible?0:value.opacity));
        if(m?.visible)continue;
        if (value.opacity <= 0.001) continue;
        const definition = Accessories.DEFINITIONS[name];
        let x = b.cx, y = b.cy;
        if (definition.anchor === "head") y -= b.ry - 5;
        if (definition.anchor === "face") y += (54 - 64) * b.ry / 52;
        if (["left", "right"].includes(definition.anchor)) {
          const side = definition.anchor;
          const hand = armPose[side];
          const wave = acting.wave * strength * (side === "right" ? 1 : -0.65) * Math.PI / 180;
          const hx = 18 + Math.cos(wave) * (hand.x - 18) - Math.sin(wave) * (hand.y - 82);
          const hy = 82 + Math.sin(wave) * (hand.x - 18) + Math.cos(wave) * (hand.y - 82);
          const handPoint = deform(b.cx + ((side === "right" ? 128 - hx : hx) - 64) * b.rx / 52, b.cy + (hy - 64) * b.ry / 52);
          x = handPoint.x; y = handPoint.y;
        }
        x += definition.offset[0] + value.x; y += definition.offset[1] + value.y;
        element.setAttribute("transform", `translate(${x} ${y}) rotate(${value.rotate}) scale(${value.scale})`);
        const angle = value.rotate * Math.PI / 180;
        for (const px of [definition.bounds[0], definition.bounds[2]]) for (const py of [definition.bounds[1], definition.bounds[3]]) {
          const vx = x - 64 + (px * Math.cos(angle) - py * Math.sin(angle)) * value.scale;
          const vy = y - 64 + (px * Math.sin(angle) + py * Math.cos(angle)) * value.scale;
          const propExtent = Math.max(Math.abs(tx + cos * vx - sin * vy) + 3, Math.abs(ty + sin * vx + cos * vy) + 3);
          extent = Math.max(extent, 62 + (propExtent - 62) * Math.min(1, value.opacity));
        }
      }
      // Fit the entire performance, including hands, inside the native 128px window.
      const fit = Math.min(1, 62 / Math.max(1, extent));
      if(m?.visible){leftArm.setAttribute('opacity','0');rightArm.setAttribute('opacity','0');}
      character.setAttribute("transform", `translate(64 64) scale(${fit}) translate(${tx} ${ty}) rotate(${rotate}) scale(${1 + breathe}) translate(-64 -64)`);
      for (const [name, element] of Object.entries(fx)) element.setAttribute("opacity", String(pose.effects[name]));
      svg.dataset.expression = expression;
      svg.dataset.motion = motionMode;
    }

    function tick(now) {
      if (destroyed) return;
      frame = null;
      const dt = clamp((now - previousFrame) / 1000, 0.001, 0.04);
      previousFrame = now;
      samplePose(now);
      const reduced = motionLevel === "reduced";
      const age = clamp((now - performanceStarted) / performanceMs, 0, 1);
      const envelope = active ? Math.sin(Math.PI * age) ** 2 : 0;
      const beat = Math.sin(age * Math.PI * 2 * current.performance.cycles);
      for (const key of Object.keys(acting)) {
        const wanted = current.performance[key] * envelope * (key === "bob" ? -Math.abs(beat) : beat);
        acting[key] += ((reduced ? 0 : wanted) - acting[key]) * (reduced ? 1 : 1 - Math.exp(-dt * 24));
      }
      const gazeEase = reduced ? 1 : 1 - Math.exp(-dt * 17);
      const wanted = tracking ? gazeTarget : current.gaze;
      gaze.x += (wanted.x - gaze.x) * gazeEase;
      gaze.y += (wanted.y - gaze.y) * gazeEase;
      armPose = Rig.interpolate(armPose, current.arms, reduced ? 1 : 1 - Math.exp(-dt * (motionMode==='dragging'?22:appearance.artStyle==='clay'?7:appearance.artStyle==='rubber'?9:12)));
      for (let step = 0; step < 4; step += 1) {
        for (const key of Object.keys(REST)) {
          const acceleration = (motionTarget[key] - motion[key]) * 320 - velocity[key] * (motionMode === "settling" ? 24 : 36);
          velocity[key] += acceleration * dt / 4;
          motion[key] += velocity[key] * dt / 4;
        }
      }
      if (active && now >= nextBlink) {
        blinkStarted = now;
        nextBlink = now + 3000 + random() * 3500;
      }
      render(current, now);
      const unsettled = Object.keys(REST).some((key) => Math.abs(motion[key] - motionTarget[key]) > 0.0001 || Math.abs(velocity[key]) > 0.001);
      if (active || maskController?.state().current || transitionDuration || unsettled || Math.hypot(gaze.x - wanted.x, gaze.y - wanted.y) > 0.001) wake();
    }

    function wake() {
      if (frame === null && !destroyed) frame = requestAnimationFrame(tick);
    }
    function setExpression(name, settings = {}) {
      const now = nowTime();
      samplePose(now);
      expression = Rig.EXPRESSIONS[name] ? name : "neutral";
      if(Appearance && (!performanceContext.theater || shapeDue===0) && (now>=shapeDue || appearance.shape==='circle')) {
        const artShape=Appearance.ART_STYLES[appearance.artStyle]?.shape;
        const pool=appearance.shape==='random'?Appearance.SHAPES:artShape?[artShape]:Appearance.pool(expression);
        oldShape=bodyShape;
        const choices=pool.filter(s=>s!==bodyShape);
        bodyShape=Appearance.SHAPES.includes(appearance.shape)?appearance.shape:appearance.random?choices[Math.floor(random()*choices.length)] || pool[0]:pool[0];
        shapeAt=now; shapeDue=now+10000+random()*10000;
      }
      source = current;
      destination = Rig.merge(Rig.getExpression(expression), settings.pose || {});
      const eyeStyle = appearance.eyeStyle && appearance.eyeStyle!=='auto' ? appearance.eyeStyle : Appearance.ART_STYLES[appearance.artStyle]?.eye || destination.eyeStyle;
      destination.eyeDesign=Object.fromEntries(Object.keys(destination.eyeDesign).map(id=>[id,id===eyeStyle?1:0]));
      if(eyeStyle==='sleepy')destination.eyes=Rig.merge(destination.eyes,{left:{upper:.5},right:{upper:.5}});
      svg.dataset.eyeStyle=eyeStyle;
      performanceMs=Math.max(2200,Number(settings.performanceMs)||2600);
      const nextPerformanceId=settings.performanceId || expression;
      if(performanceId!==nextPerformanceId){performanceStarted=now;performanceId=nextPerformanceId;}
      transitionStarted = now;
      transitionDuration = motionLevel === "reduced" ? 0 : Math.max(0, Number(settings.duration ?? 240))*(Appearance.ART_STYLES[appearance.artStyle]?.tempo||1);
      if (!transitionDuration) { current = destination; armPose = current.arms; }
      wake();
      return expression;
    }
    function setGaze(x, y) {
      tracking = true;
      gazeTarget = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
      wake();
    }
    function clearGaze() { tracking = false; wake(); }
    function setMotion(detail = {}) {
      motionMode = detail.mode || "idle";
      motionTarget = { ...REST };
      if (motionLevel === "reduced") {
        motion = { ...REST }; velocity = { ...REST };
      } else if (motionMode === "settling") {
        const impact = clamp(detail.intensity, 0, 1);
        velocity.stretch += impact * 1.4;
        velocity.y += impact * 48;
      } else {
        for (const key of ["x", "y", "rotate"]) motionTarget[key] = clamp(detail[key], key === "rotate" ? -12 : -5, key === "rotate" ? 12 : 5);
        const stretch = clamp(detail.stretch, -0.16, 0.16);
        const angle = (Number(detail.angle) || 0) * Math.PI / 180;
        motionTarget.stretch = stretch * Math.cos(2 * angle);
        motionTarget.cross = stretch * Math.sin(2 * angle);
      }
      wake();
    }
    function setMotionLevel(level) {
      motionLevel = ["full", "soft", "reduced"].includes(level) ? level : "full";
      active = motionLevel !== "reduced";
      if (!active) {
        current = destination; source = destination; armPose = current.arms;
        transitionDuration = 0; blinkStarted = -Infinity;
        motion = { ...REST }; motionTarget = { ...REST }; velocity = { ...REST };
        acting = { bob: 0, sway: 0, tilt: 0, wave: 0, squash: 0 };
      }
      wake();
      return motionLevel;
    }
    function setActive(value) { active = Boolean(value) && motionLevel !== "reduced"; blinkStarted = -Infinity; wake(); }
    function setAppearance(value) { appearance=Appearance.normalize(value); maskController?.configure({...appearance,coordinated:true}); shapeDue=0; setExpression(expression,{pose:destination,performanceId,performanceMs}); wake(); }
    function resetIdle() { nextBlink = Math.min(nextBlink, nowTime() + 3200); wake(); }
    function destroy() { destroyed = true; if (frame !== null) cancelAnimationFrame(frame); target.textContent = ""; }
    render(current, started);
    wake();
    return { setAppearance, setExpression,
      setPerformanceContext(value){performanceContext={...performanceContext,...value};if(value.theater){maskController?.clear(true);shapeDue=0;}wake();},
      setMask(name,chain){const ok=maskController?.preview(name,chain);wake();return ok;},
      setTaskStatus(status){maskController?.status(status);wake();},
      maskLifecycle(kind,ids){maskController?.lifecycle(kind,ids);wake();},
      maskInteract(type){if(!performanceContext.theater)maskController?.interact(type);wake();},
      clearMask(immediate=false){maskController?.clear(immediate);wake();},
      getMaskState:()=>maskController?.state(),
      setGaze, clearGaze, setMotion, setMotionLevel, setActive, resetIdle, destroy,
      getState: () => ({ expression, motionLevel, active, transitioning: transitionDuration > 0, gaze: { ...gaze }, motion: { ...motion }, pose: Rig.interpolate(current, current, 0) }) };
  }
  return { create, FX_PATHS };
});
