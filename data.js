/* Sunshade Studio — state, persistence, CSV. */
window.Store = (function () {
  'use strict';

  const KEY = 'sunshade-studio.v1';
  const uid = (p) => (p || 'f') + Math.random().toString(36).slice(2, 8);

  const state = {
    frames: [],
    sets: [],
    settings: { lip: 14, seam: 4, wirePrice: 15, fabricPrice: 90, labor: 35, waste: 8 },
    meta: { seeded: false, v: 1 }
  };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p.frames)) state.frames = p.frames;
        if (Array.isArray(p.sets)) state.sets = p.sets;
        if (p.settings) Object.assign(state.settings, p.settings);
        if (p.meta) Object.assign(state.meta, p.meta);
      }
    } catch (e) { /* corrupt store: start clean */ }
    if (!state.meta.seeded && state.frames.length === 0) {
      seed();
      state.meta.seeded = true;
      save();
    }
  }

  function seed() {
    const f1 = { id: uid(), code: 'DEMO-F', car: 'قالب تجريبي — عدّله', window: 'باب أمامي', type: 'ثابت', botW: 620, topW: 575, h: 405, shift: 0, bulge: 8, rBL: 55, rBR: 45, rTR: 70, rTL: 65, wireDia: 3, note: 'بيانات مثال للتوضيح' };
    const f2 = { id: uid(), code: 'DEMO-R', car: 'قالب تجريبي — عدّله', window: 'باب خلفي', type: 'ثابت', botW: 555, topW: 515, h: 365, shift: 0, bulge: 6, rBL: 45, rBR: 40, rTR: 60, rTL: 55, wireDia: 3, note: 'بيانات مثال للتوضيح' };
    const f3 = { id: uid(), code: 'DEMO-Q', car: 'قالب تجريبي — عدّله', window: 'ربع خلفي', type: 'جرار', botW: 300, topW: 365, h: 205, shift: 0, bulge: 0, rBL: 30, rBR: 35, rTR: 25, rTL: 25, wireDia: 2.5, note: 'بيانات مثال للتوضيح' };
    state.frames = [f1, f2, f3];
    state.sets = [{
      id: uid('s'), name: 'طقم 4 قطع — مثال', car: 'قالب تجريبي — عدّله', price: 400,
      items: [{ frameId: f1.id, qty: 2 }, { frameId: f2.id, qty: 2 }]
    }];
  }

  function blankFrame() {
    return {
      id: '', code: '', car: '', window: 'باب أمامي', type: 'ثابت',
      botW: 600, topW: 560, h: 400, shift: 0, bulge: 6,
      rBL: 50, rBR: 45, rTR: 60, rTL: 55, wireDia: 3, note: ''
    };
  }

  /* Frame outline + fabric layers for current settings. */
  function patternFor(f) {
    const s = state.settings;
    const shape = Geo.buildShape(f);
    const lip = Math.max(1, Number(s.lip) || 14);
    const seam = Math.min(lip - 0.5, Math.max(0, Number(s.seam) || 4));
    const cut = Geo.offsetClosed(shape.pts, lip);
    const sew = Geo.offsetClosed(shape.pts, lip - seam);
    return {
      shape,
      cut,
      sew,
      bbox: Geo.bbox(cut),
      wireMM: shape.perimeter,
      fabricM2: (Math.abs(Geo.area(cut)) / 1e6) * (1 + (Number(s.waste) || 0) / 100)
    };
  }

  function costOf(p) {
    const s = state.settings;
    const wire = ((p.wireMM + 40) / 1000) * (Number(s.wirePrice) || 0);
    const fabric = p.fabricM2 * (Number(s.fabricPrice) || 0);
    const labor = Number(s.labor) || 0;
    return { wire, fabric, labor, total: wire + fabric + labor };
  }

  function exportJSON() {
    return JSON.stringify({ app: 'sunshade-studio', v: 1, exportedAt: new Date().toISOString(), frames: state.frames, sets: state.sets, settings: state.settings }, null, 2);
  }

  function importJSON(text) {
    const p = JSON.parse(text);
    if (!p || !Array.isArray(p.frames)) throw new Error('ملف غير صالح: مفيش frames');
    state.frames = p.frames.map((f) => Object.assign(blankFrame(), f, { id: f.id || uid() }));
    state.sets = Array.isArray(p.sets) ? p.sets : [];
    if (p.settings) Object.assign(state.settings, p.settings);
    state.meta.seeded = true;
    save();
    return state.frames.length;
  }

  const CSV_HEAD = ['code', 'car', 'window', 'type', 'botW', 'topW', 'h', 'shift', 'bulge', 'rBL', 'rBR', 'rTR', 'rTL', 'wireDia', 'note'];

  function csvTemplate() {
    const rows = [
      CSV_HEAD.join(','),
      'ELN-FR,هيونداي إلنترا 2020,باب أمامي يمين,ثابت,620,575,405,0,8,55,45,70,65,3,',
      'ELN-RR,هيونداي إلنترا 2020,باب خلفي يمين,ثابت,555,515,365,0,6,45,40,60,55,3,'
    ];
    return '\ufeff' + rows.join('\r\n');
  }

  function parseCSV(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
    if (!lines.length) throw new Error('ملف فاضي');
    const first = lines[0].toLowerCase();
    const hasHead = first.includes('code') || first.includes('كود');
    const start = hasHead ? 1 : 0;
    const out = [];
    for (let i = start; i < lines.length; i++) {
      const c = splitLine(lines[i]);
      if (c.length < 7) continue;
      const g = (k) => (c[k] === undefined ? '' : c[k].trim());
      const f = Object.assign(blankFrame(), {
        id: uid(),
        code: g(0), car: g(1), window: g(2) || 'باب', type: g(3) || 'ثابت',
        botW: Number(g(4)) || 600, topW: Number(g(5)) || 560, h: Number(g(6)) || 400,
        shift: Number(g(7)) || 0, bulge: Number(g(8)) || 0,
        rBL: Number(g(9)) || 0, rBR: Number(g(10)) || 0,
        rTR: Number(g(11)) || 0, rTL: Number(g(12)) || 0,
        wireDia: Number(g(13)) || 3, note: g(14) || ''
      });
      if (f.code) out.push(f);
    }
    return out;
  }

  function splitLine(line) {
    const out = [];
    let cur = '', quote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quote && line[i + 1] === '"') { cur += '"'; i++; } else quote = !quote;
      } else if (ch === ',' && !quote) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  return {
    state, load, save, uid, blankFrame, patternFor, costOf,
    exportJSON, importJSON, csvTemplate, parseCSV, CSV_HEAD
  };
})();
