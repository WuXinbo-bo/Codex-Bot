(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MetaBotAccessories = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  const ink = "#181B20", white = "#F3F6F2", gold = "#F4BE4F", pink = "#EF6684", blue = "#67C9EA";
  const path = (d, fill = ink, extra = {}) => ["path", { d, fill, ...extra }];
  const line = (d, stroke = ink, width = 2.5) => path(d, "none", { stroke, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const ellipse = (cx, cy, rx, ry, fill, extra = {}) => ["ellipse", { cx, cy, rx, ry, fill, ...extra }];
  const rect = (x, y, width, height, fill, rx = 2, extra = {}) => ["rect", { x, y, width, height, rx, fill, ...extra }];
  const asset = (anchor, bounds, elements, layer = "front", offset = [0, 0]) => ({ anchor, bounds, elements, layer, offset });
  const DEFINITIONS = {
    notebook: asset('body',[-23,-18,23,18],[rect(-22,-17,44,34,blue,3),rect(-16,-14,35,28,white,1),line('M -10 -7 H 12 M -10 0 H 8 M -10 7 H 12',ink,1.5),line('M -19 -11 H -14 M -19 0 H -14 M -19 11 H -14',ink,2)],'front',[0,28]),
    pencil: asset('right',[-4,-28,4,8],[rect(-3,-23,6,27,gold,1),path('M -3 -23 L 0 -28 L 3 -23 Z',ink),rect(-3,3,6,5,pink,1),line('M 0 -20 V 0',white,1)]),
    hourglass: asset('right',[-12,-23,12,10],[path('M -10 -20 Q -10 -8 -2 -6 Q -10 -3 -10 7 H 10 Q 10 -3 2 -6 Q 10 -8 10 -20 Z','#DCF5F8',{stroke:ink,'stroke-width':2}),path('M -7 -17 H 7 L 0 -8 Z M -7 5 L 0 -2 L 7 5 Z',gold),line('M -12 -22 H 12 M -12 9 H 12',ink,3)]),
    stamp: asset('right',[-14,-20,14,9],[rect(-6,-19,12,18,pink,4),rect(-13,-2,26,8,ink,2),rect(-12,6,24,3,gold,0)]),
    flag: asset('right',[-2,-36,27,10],[line('M 0 9 V -35',ink,3),path('M 2 -34 L 26 -30 L 19 -21 L 26 -13 L 2 -17 Z',pink),line('M 7 -28 L 17 -26',white,2)]),
    glasses: asset("face", [-42, -23, 42, 22], [
      ellipse(-21, 0, 19, 20, "#DFF9FF", { "fill-opacity": 0.12, stroke: ink, "stroke-width": 3 }),
      ellipse(21, 0, 19, 20, "#DFF9FF", { "fill-opacity": 0.12, stroke: ink, "stroke-width": 3 }),
      line("M -2 -1 Q 0 -5 2 -1 M -40 -4 L -43 -7 M 40 -4 L 43 -7"), line("M -30 -10 L -25 -15 M 12 -10 L 17 -15", white, 2)
    ]),
    shades: asset("face", [-43, -17, 43, 17], [
      path("M -41 -13 Q -22 -19 -4 -12 L -5 5 Q -8 17 -24 15 Q -40 15 -41 -13 Z M 4 -12 Q 22 -19 41 -13 Q 40 15 24 15 Q 8 17 5 5 Z"),
      line("M -5 -7 Q 0 -11 5 -7 M -42 -11 H 42", ink, 3), line("M -31 -7 L -20 -11 M 13 -6 L 24 -10", white, 2)
    ]),
    topHat: asset("head", [-31, -23, 31, 6], [path("M -22 -23 L 22 -23 L 19 0 L -19 0 Z"), rect(-21, -8, 42, 6, pink, 0), ellipse(0, 1, 30, 5, ink), line("M -14 -18 H 11", "#545966", 2)]),
    wand: asset("right", [-3, -32, 3, 5], [rect(-2, -30, 4, 35, ink, 1), rect(-2, -30, 4, 8, white, 1)]),
    cape: asset("body", [-53, -7, 53, 53], [path("M -25 -6 Q -40 12 -51 43 Q -28 39 -15 52 Q 0 42 15 52 Q 30 39 51 43 Q 38 10 25 -6 Z", pink), line("M -24 -3 Q 0 16 24 -3", "#C74361", 3)], "back"),
    sleepHat: asset("head", [-29, -23, 36, 9], [path("M -27 2 Q -6 -34 18 -17 Q 29 -12 28 4 Q 17 -9 8 -9 L 24 2 Z", blue), line("M -12 -16 L 1 -6 M -2 -21 L 11 -10", "#B8EDFA", 3), rect(-28, 0, 53, 8, white, 4), ellipse(29, 3, 6, 6, white)]),
    pillow: asset("body", [-30, -15, 30, 15], [path("M -29 -14 Q 0 -10 29 -14 Q 25 0 29 14 Q 0 10 -29 14 Q -25 0 -29 -14", "#F2CEE6"), line("M -22 -7 Q 0 -4 22 -7", "#D6A7C7", 1.5)], "front", [0, 28]),
    beret: asset("head", [-30, -15, 30, 8], [ellipse(0, -4, 29, 12, pink), rect(-19, 3, 39, 5, "#BE3D61", 2), line("M 2 -15 Q 3 -22 8 -18", ink, 3)]),
    brush: asset("right", [-4, -27, 4, 8], [line("M 0 7 V -17", gold, 4), path("M -4 -17 L -3 -23 L 1 -29 L 4 -23 L 4 -17 Z", ink), rect(-3, -19, 6, 5, white, 1)]),
    card: asset("body", [-23, -17, 23, 17], [rect(-22, -16, 44, 32, white, 3, { stroke: "#BCD7C7", "stroke-width": 1.5 }), line("M -13 -6 H 13 M -13 1 H 7 M -13 8 H 11", "#789589", 2)], "front", [0, 27]),
    cube: asset("right", [-11, -11, 11, 11], [rect(-10, -10, 20, 20, gold, 4), line("M -5 -5 H 4 M -5 -4 V 4", "#FFF0C4", 2)]),
    spark: asset("right", [-13, -15, 13, 15], [path("M 0 -14 L 4 -4 L 12 0 L 4 4 L 0 14 L -4 4 L -12 0 L -4 -4 Z", gold), ellipse(-1, -1, 2, 3, white)]),
    plane: asset("right", [-22, -12, 22, 13], [path("M -21 -11 L 21 0 L -18 12 L -10 1 Z", white), line("M -21 -11 L -10 1 L 21 0 M -10 1 L -18 12", "#93BACC", 1.5)]),
    cup: asset("body", [-19, -16, 26, 18], [path("M -18 -12 H 15 V 10 Q 14 17 6 17 H -9 Q -18 17 -18 10 Z", "#EDBD68"), line("M 16 -6 Q 31 -7 23 6 L 16 8", "#EDBD68", 5), ellipse(-1, -12, 17, 4, "#FFF0CF"), line("M -7 -20 Q -12 -24 -6 -28 M 4 -20 Q 9 -25 4 -29", "#DDEDE5", 2)], "front", [0, 24]),
    detectiveHat: asset("head", [-34, -19, 34, 7], [path("M -24 1 L -19 -18 L -1 -13 L 15 -18 L 23 1 Z", gold), rect(-23, -5, 46, 6, ink, 1), ellipse(0, 2, 33, 4, gold)]),
    lens: asset("right", [-16, -34, 16, 10], [line("M 0 8 V -6", ink, 5), ellipse(0, -19, 13, 13, "#DBF8FF", { "fill-opacity": 0.7, stroke: ink, "stroke-width": 3 }), line("M -6 -22 L -1 -27", white, 2)]),
    umbrella: asset("right", [-29, -47, 29, 7], [line("M 0 -45 V 2 Q 0 9 6 5", ink, 2.5), path("M -28 -23 Q -22 -47 0 -46 Q 22 -47 28 -23 Q 14 -30 0 -23 Q -14 -30 -28 -23 Z", blue), line("M 0 -45 Q -10 -34 -10 -26 M 0 -45 Q 10 -34 10 -26", "#319CC4", 1.5)]),
    gift: asset("body", [-22, -22, 22, 17], [rect(-20, -9, 40, 26, pink, 3), rect(-22, -13, 44, 8, "#F7859D", 2), rect(-3, -13, 6, 30, gold, 0), line("M 0 -13 C -22 -30 -18 -8 0 -13 C 22 -30 18 -8 0 -13", gold, 3)], "front", [0, 28]),
    drawing: asset("body", [-22, -20, 22, 20], [rect(-21, -19, 42, 38, white, 2), path("M 0 -12 L 3 -3 L 12 0 L 3 3 L 0 12 L -3 3 L -12 0 L -3 -3 Z", gold)], "front", [-5, 27])
  };
  function create(element, back, front) {
    return Object.fromEntries(Object.entries(DEFINITIONS).map(([name, definition]) => {
      const group = element("g", { "data-accessory": name, opacity: 0 });
      for (const [type, attrs] of definition.elements) group.append(element(type, attrs));
      (definition.layer === "back" ? back : front).append(group);
      return [name, group];
    }));
  }
  return { DEFINITIONS, create };
});
