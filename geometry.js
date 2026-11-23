/* Sunshade Studio — geometry core. Units: mm, screen coords (y down). */
window.Geo = (function () {
  'use strict';

  const P = (x, y) => ({ x, y });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sub = (a, b) => P(a.x - b.x, a.y - b.y);
  const add = (a, b) => P(a.x + b.x, a.y + b.y);
  const mul = (a, s) => P(a.x * s, a.y * s);
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const norm = (v) => { const l = Math.hypot(v.x, v.y) || 1; return P(v.x / l, v.y / l); };

  function area(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s += a.x * b.y - b.x * a.y;
    }
    return s / 2;
  }

  function perimeter(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) s += dist(pts[i], pts[(i + 1) % pts.length]);
    return s;
  }

  function sampleQuad(p0, p1, p2, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push(P(u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
                 u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y));
    }
    return out;
  }

  function sampleCubic(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push(P(a * p0.x + b * p1.x + c * p2.x + d * p3.x,
                 a * p0.y + b * p1.y + c * p2.y + d * p3.y));
    }
    return out;
  }

  /* Tangent corner between two straight rays. Returns null when straight. */
  function corner(p, prev, next, r) {
    if (!(r > 0)) return null;
    const u = norm(sub(prev, p));   // toward previous vertex
    const v = norm(sub(next, p));   // toward next vertex
    const theta = Math.acos(clamp(dot(u, v), -1, 1));
    if (theta > Math.PI - 0.02 || theta < 0.02) return null;
    const tanHalf = Math.tan(theta / 2);
    if (!isFinite(tanHalf) || tanHalf < 1e-6) return null;
    const t = Math.min(r / tanHalf, dist(p, prev) * 0.49, dist(p, next) * 0.49);
    if (t < 0.1) return null;
    return { a: add(p, mul(u, t)), b: add(p, mul(v, t)), c: p };
  }

  function dedupe(pts, tol) {
    tol = tol || 0.02;
    const out = [];
    for (const p of pts) {
      if (!out.length || dist(out[out.length - 1], p) > tol) out.push(p);
    }
    while (out.length > 1 && dist(out[0], out[out.length - 1]) <= tol) out.pop();
    return out;
  }

  /* Door-glass outline: trapezoid + corner radii + optional arched top edge.
     Params: botW, topW, h, shift, bulge, rBL, rBR, rTR, rTL */
  function buildShape(o) {
    const botW = Math.max(10, num(o.botW, 600));
    const topW = Math.max(10, num(o.topW, 560));
    const h = Math.max(10, num(o.h, 400));
    const shift = num(o.shift, 0);
    const bulge = Math.max(0, num(o.bulge, 0));
    const tlx = (botW - topW) / 2 + shift;
    const BL = P(0, h), BR = P(botW, h), TR = P(tlx + topW, 0), TL = P(tlx, 0);

    const cBL = corner(BL, TL, BR, num(o.rBL, 0));
    const cBR = corner(BR, BL, TR, num(o.rBR, 0));
    const cTR = corner(TR, BR, TL, num(o.rTR, 0));
    const cTL = corner(TL, TR, BL, num(o.rTL, 0));

    const pts = [];
    const push = (p) => pts.push(p);
    const arc = (c, p) => { if (c) sampleQuad(c.a, c.c, c.b, 10).forEach(push); else push(p); };

    arc(cBL, BL);
    arc(cBR, BR);
    arc(cTR, TR);

    const topStart = cTR ? cTR.b : TR;
    const topEnd = cTL ? cTL.a : TL;
    if (bulge > 0.1) {
      const dx = topEnd.x - topStart.x;
      sampleCubic(
        topStart,
        P(topStart.x + dx * 0.33, topStart.y - bulge * 1.3333),
        P(topEnd.x - dx * 0.33, topEnd.y - bulge * 1.3333),
        topEnd, 28
      ).forEach(push);
    } else {
      push(topStart);
      push(topEnd);
    }
    arc(cTL, TL);

    const clean = dedupe(pts);
    if (area(clean) < 0) clean.reverse();
    return { pts: clean, area: Math.abs(area(clean)), perimeter: perimeter(clean) };
  }

  /* Closed polygon offset. Positive distance = outward. */
  function offsetClosed(pts, d) {
    const src = dedupe(pts.slice());
    if (area(src) < 0) src.reverse();
    const n = src.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const prev = src[(i - 1 + n) % n], cur = src[i], next = src[(i + 1) % n];
      const e1 = norm(sub(cur, prev)), e2 = norm(sub(next, cur));
      const n1 = P(e1.y, -e1.x), n2 = P(e2.y, -e2.x);
      let bis = P(n1.x + n2.x, n1.y + n2.y);
      const bl = Math.hypot(bis.x, bis.y);
      if (bl < 1e-6) { out[i] = add(cur, mul(n1, d)); continue; }
      bis = P(bis.x / bl, bis.y / bl);
      const cosHalf = Math.max(0.35, dot(bis, n1));
      out[i] = add(cur, mul(bis, d / cosHalf));
    }
    return out;
  }

  function bbox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  const fmt = (n) => (Math.round(n * 100) / 100).toString();

  function toPathD(pts, close) {
    if (!pts || !pts.length) return '';
    let d = 'M ' + fmt(pts[0].x) + ' ' + fmt(pts[0].y);
    for (let i = 1; i < pts.length; i++) d += ' L ' + fmt(pts[i].x) + ' ' + fmt(pts[i].y);
    return close === false ? d : d + ' Z';
  }

  return { P, clamp, dist, area, perimeter, buildShape, offsetClosed, bbox, toPathD, sampleQuad, sampleCubic };
})();
