/* Sunshade Studio — view templates. */
window.Views = (function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mm = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');
  const money = (n) => Math.round(n).toLocaleString('en-US');
  const m2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

  function miniSvg(f) {
    try {
      const shape = Geo.buildShape(f);
      const b = Geo.bbox(shape.pts);
      const w = 54, h = 36, s = Math.min((w - 8) / b.w, (h - 8) / b.h);
      const tx = (w - b.w * s) / 2 - b.minX * s;
      const ty = (h - b.h * s) / 2 - b.minY * s;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
        '<g transform="translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + s.toFixed(4) + ')">' +
        '<path d="' + Geo.toPathD(shape.pts) + '" fill="none" stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke"/></g></svg>';
    } catch (e) { return ''; }
  }

  function patternSvg(p) {
    const b = p.bbox, pad = 28;
    const W = b.w + pad * 2, H = b.h + pad * 2;
    return '<svg class="pattern-svg" viewBox="' + (b.minX - pad) + ' ' + (b.minY - pad) + ' ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' +
      '<path d="' + Geo.toPathD(p.cut) + '" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + Geo.toPathD(p.sew) + '" style="fill:none;stroke:var(--muted)" stroke-width="1.1" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + Geo.toPathD(p.shape.pts) + '" style="fill:none;stroke:var(--primary)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
  }

  function demoBanner() {
    const demo = Store.state.frames.some((f) => /^DEMO-/.test(f.code));
    if (!demo) return '';
    return '<div class="notice"><span>البيانات الحالية أمثلة توضيحية. امسحها وحمّل فريماتك من CSV أو أدخلها يدويًا.</span>' +
      '<button class="btn btn-danger" data-action="clear-demo">مسح الأمثلة</button></div>';
  }

  function frames(opts) {
    const q = (opts.search || '').trim().toLowerCase();
    const list = Store.state.frames;
    const rows = list.map((f) => {
      const hay = (f.code + ' ' + f.car + ' ' + f.window + ' ' + f.type).toLowerCase();
      const hide = q && !hay.includes(q);
      return '<tr data-id="' + f.id + '"' + (hide ? ' class="is-hidden"' : '') + '>' +
        '<td class="thumb">' + miniSvg(f) + '</td>' +
        '<td class="mono">' + esc(f.code) + '</td>' +
        '<td>' + esc(f.car) + '</td>' +
        '<td>' + esc(f.window) + '</td>' +
        '<td><span class="tag' + (f.type === 'جرار' ? ' tag-blue' : '') + '">' + esc(f.type) + '</span></td>' +
        '<td class="mono">' + mm(f.botW) + ' × ' + mm(f.h) + '</td>' +
        '<td class="mono">' + mm(f.wireDia) + '</td>' +
        '<td class="row-actions">' +
        '<button class="mini-btn" data-action="frame-pattern" data-id="' + f.id + '">باترون</button>' +
        '<button class="mini-btn" data-action="frame-edit" data-id="' + f.id + '">تعديل</button>' +
        '<button class="mini-btn danger" data-action="frame-del" data-id="' + f.id + '">حذف</button>' +
        '</td></tr>';
    }).join('');

    const table = list.length ? '<div class="table-wrap frames-table"><table><thead><tr>' +
      '<th></th><th>الكود</th><th>العربية</th><th>الشباك</th><th>النوع</th><th>العرض × الارتفاع</th><th>السلك</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty"><strong>مفيش فريمات لسه</strong>أضف أول فريم بمقاساته، أو استورد ملف CSV من ملفك.</div>';

    const cards = list.length ? '<div class="frame-cards">' + list.map((f) =>
      '<article class="frame-card" data-card-id="' + f.id + '">' +
      '<div class="fc-main"><div class="fc-thumb">' + miniSvg(f) + '</div>' +
      '<div class="fc-text"><div class="fc-code"><b class="mono">' + esc(f.code) + '</b><span class="tag' + (f.type === 'جرار' ? ' tag-blue' : '') + '">' + esc(f.type) + '</span></div>' +
      '<div class="fc-car">' + esc(f.car) + '</div>' +
      '<div class="fc-meta mono">' + esc(f.window) + ' · ' + mm(f.botW) + '×' + mm(f.h) + ' · سلك ' + mm(f.wireDia) + '</div></div></div>' +
      '<div class="fc-actions"><button class="mini-btn" data-action="frame-pattern" data-id="' + f.id + '">باترون</button>' +
      '<button class="mini-btn" data-action="frame-edit" data-id="' + f.id + '">تعديل</button>' +
      '<button class="mini-btn danger" data-action="frame-del" data-id="' + f.id + '">حذف</button></div></article>'
    ).join('') + '</div>' : '';

    return '<section class="panel">' +
      '<div class="panel-head"><div><h2>مكتبة الفريمات</h2><p class="sub">' + list.length + ' فريم · العرض والارتفاع = مسار السلك</p></div>' +
      '<div class="spacer"></div>' +
      '<input id="frameSearch" class="search" type="search" placeholder="ابحث بالكود أو العربية" value="' + esc(opts.search || '') + '">' +
      '<button class="btn" data-action="csv-template">قالب CSV</button>' +
      '<button class="btn" data-action="import-csv">استيراد CSV</button>' +
      '<button class="btn btn-primary" data-action="frame-new">+ فريم</button></div>' +
      demoBanner() + table + cards + '</section>';
  }

  function sets() {
    const list = Store.state.sets;
    const cards = list.map((s) => {
      const items = s.items.map((it) => {
        const f = Store.state.frames.find((x) => x.id === it.frameId);
        return f ? '<span class="chip">' + esc(f.window) + ' ×' + it.qty + '</span>' : '';
      }).join('');
      const pieces = s.items.reduce((n, it) => n + (Number(it.qty) || 0), 0);
      return '<article class="card">' +
        '<div class="card-top"><h3>' + esc(s.name) + '</h3><span class="tag">' + pieces + ' قطع</span></div>' +
        '<p class="card-sub">' + esc(s.car || '—') + '</p>' +
        '<div class="chips">' + (items || '<span class="chip muted">مفيش فريمات</span>') + '</div>' +
        '<div class="card-foot"><b class="mono">' + money(s.price || 0) + ' ج.م</b><div class="card-actions">' +
        '<button class="mini-btn" data-action="set-edit" data-id="' + s.id + '">تعديل</button>' +
        '<button class="mini-btn danger" data-action="set-del" data-id="' + s.id + '">حذف</button></div></div>' +
        '</article>';
    }).join('');

    return '<section class="panel"><div class="panel-head"><div><h2>الأطقم</h2><p class="sub">' + list.length + ' طقم · جاهزة لأمر الشغل</p></div>' +
      '<div class="spacer"></div><button class="btn btn-primary" data-action="set-new">+ طقم</button></div>' +
      (list.length ? '<div class="cards">' + cards + '</div>'
        : '<div class="empty"><strong>مفيش أطقم</strong>اعمل طقم من الفريمات (4 / 5 / 7 قطع).</div>') +
      '</section>';
  }

  function patternStats(p) {
    const c = Store.costOf(p);
    return '<div class="stat"><span>محيط السلك</span><b>' + (p.wireMM / 1000).toFixed(2) + ' م</b></div>' +
      '<div class="stat"><span>السلك المطلوب (+4 سم وصلة)</span><b>' + ((p.wireMM + 40) / 1000).toFixed(2) + ' م</b></div>' +
      '<div class="stat"><span>مقاس القص</span><b>' + mm(p.bbox.w) + ' × ' + mm(p.bbox.h) + ' مم</b></div>' +
      '<div class="stat"><span>قماش القطعة (مع الهدر)</span><b>' + m2(p.fabricM2) + ' م²</b></div>' +
      '<div class="stat"><span>تكلفة تقديرية</span><b>' + money(c.total) + ' ج.م</b></div>';
  }

  function warnings(f) {
    const d = Number(f.wireDia) || 3;
    const radii = [f.rBL, f.rBR, f.rTL, f.rTR].map(Number).filter((r) => r > 0);
    const out = [];
    if (radii.length && Math.min.apply(null, radii) < d * 3) {
      out.push('أصغر نصف قطر ' + mm(Math.min.apply(null, radii)) + ' مم أقل من 3× قطر السلك (' + mm(d * 3) + ' مم) — السلك هيتكسر أو يتفتل.');
    }
    if ((Number(f.topW) || 0) > (Number(f.botW) || 0) * 1.25) out.push('العرض العلوي أكبر بكتير من السفلي — راجع المقاس.');
    return out.map((w) => '<p class="warn">' + esc(w) + '</p>').join('');
  }

  function pattern(opts) {
    const list = Store.state.frames;
    if (!list.length) {
      return '<section class="panel"><div class="empty"><strong>مفيش فريمات</strong>ابدأ من تاب الفريمات.</div></section>';
    }
    const f = list.find((x) => x.id === opts.frameId) || list[0];
    const p = Store.patternFor(f);
    const s = Store.state.settings;

    let options = '';
    const groups = new Map();
    list.forEach((x) => {
      if (!groups.has(x.car)) groups.set(x.car, []);
      groups.get(x.car).push(x);
    });
    groups.forEach((items, car) => {
      options += '<optgroup label="' + esc(car) + '">' + items.map((x) =>
        '<option value="' + x.id + '"' + (x.id === f.id ? ' selected' : '') + '>' + esc(x.window) + ' — ' + esc(x.code) + '</option>').join('') + '</optgroup>';
    });

    return '<section class="panel">' +
      '<div class="panel-head"><div><h2>الباترون</h2><p class="sub">خط القص الخارجي + خط الخياطة + مسار السلك</p></div>' +
      '<div class="spacer"></div><select id="frameSelect" class="select">' + options + '</select></div>' +
      '<div class="pattern-grid">' +
      '<div class="pattern-controls">' +
      '<div class="grid-2">' +
      '<div class="field"><label for="lipInput">الزيادة على الفريم (مم)</label><input id="lipInput" type="number" min="2" max="80" step="1" value="' + s.lip + '"></div>' +
      '<div class="field"><label for="seamInput">الخياطة من الحرف (مم)</label><input id="seamInput" type="number" min="1" max="30" step="0.5" value="' + s.seam + '"></div>' +
      '</div>' +
      (warnings(f) ? '<div class="warnings">' + warnings(f) + '</div>' : '') +
      '<div class="stats" id="patternStats">' + patternStats(p) + '</div>' +
      '<div class="btn-col">' +
      '<button class="btn btn-primary" data-action="pattern-svg" data-id="' + f.id + '">تنزيل SVG 1:1</button>' +
      '<button class="btn" data-action="pattern-dxf" data-id="' + f.id + '">تنزيل DXF للبلوتر</button>' +
      '<button class="btn btn-accent" data-action="pattern-print" data-id="' + f.id + '">طباعة 1:1 على A4</button>' +
      '<button class="btn btn-ghost" data-action="frame-edit" data-id="' + f.id + '">تعديل مقاسات الفريم</button>' +
      '</div>' +
      '<p class="hint">المقاسات بالملي على مسار السلك. اطبع مسطرة 100 مم وشيّك قبل القص.</p>' +
      '</div>' +
      '<div class="pattern-stage"><div class="stage-inner">' +
      '<div id="patternPreview">' + patternSvg(p) + '</div>' +
      '<div class="stage-caption"><span><i class="dot cut"></i> القص</span><span><i class="dot sew"></i> الخياطة</span><span><i class="dot frame"></i> السلك</span></div>' +
      '<div class="stage-meta mono">' + esc(f.code) + ' · ' + mm(p.bbox.w) + ' × ' + mm(p.bbox.h) + ' مم</div>' +
      '</div></div></div></section>';
  }

  function orderRows(set, qty) {
    return set.items.map((it) => {
      const f = Store.state.frames.find((x) => x.id === it.frameId);
      if (!f) return null;
      return { frame: f, qty: Number(it.qty) || 1, pattern: Store.patternFor(f) };
    }).filter(Boolean);
  }

  function orderTotals(set, qty) {
    const rows = orderRows(set, qty);
    let perSet = 0, wire = 0, fabric = 0;
    rows.forEach((r) => {
      perSet += Store.costOf(r.pattern).total;
      wire += (r.pattern.wireMM / 1000) * r.qty;
      fabric += r.pattern.fabricM2 * r.qty;
    });
    const totalCost = perSet * qty;
    const price = (Number(set.price) || 0) * qty;
    return {
      perSet,
      wireM: wire * qty,
      fabricM2: fabric * qty,
      cost: totalCost, price,
      profit: price - totalCost
    };
  }

  function orderTotalsHTML(set, qty) {
    const t = orderTotals(set, qty);
    const margin = t.price > 0 ? Math.round((t.profit / t.price) * 100) : 0;
    return '<div class="totals-grid">' +
      '<div class="total-box"><span>إجمالي السلك</span><b>' + t.wireM.toFixed(2) + ' م</b></div>' +
      '<div class="total-box"><span>إجمالي القماش</span><b>' + m2(t.fabricM2) + ' م²</b></div>' +
      '<div class="total-box"><span>تكلفة الطقم</span><b>' + money(t.perSet) + ' ج.م</b></div>' +
      '<div class="total-box"><span>إجمالي التكلفة</span><b>' + money(t.cost) + ' ج.م</b></div>' +
      '<div class="total-box"><span>إجمالي البيع</span><b>' + money(t.price) + ' ج.م</b></div>' +
      '<div class="total-box accent"><span>هامش متوقع</span><b>' + money(t.profit) + ' ج.م · ' + margin + '%</b></div>' +
      '</div>';
  }

  function order(opts) {
    const setsList = Store.state.sets;
    if (!setsList.length) {
      return '<section class="panel"><div class="empty"><strong>مفيش أطقم</strong>اعمل طقم الأول من تاب الأطقم.</div></section>';
    }
    const set = setsList.find((x) => x.id === opts.setId) || setsList[0];
    const qty = Math.max(1, Number(opts.qty) || 1);
    const rows = orderRows(set, qty);
    const s = Store.state.settings;

    const body = rows.map((r) => '<tr>' +
      '<td>' + esc(r.frame.window) + '</td>' +
      '<td class="mono">' + esc(r.frame.code) + '</td>' +
      '<td class="mono">' + r.qty + '</td>' +
      '<td class="mono">' + mm(r.pattern.bbox.w) + ' × ' + mm(r.pattern.bbox.h) + '</td>' +
      '<td class="mono">' + (r.pattern.wireMM / 1000).toFixed(2) + '</td>' +
      '<td class="mono">' + m2(r.pattern.fabricM2) + '</td></tr>').join('');

    return '<section class="panel">' +
      '<div class="panel-head"><div><h2>أمر شغل</h2><p class="sub">الكميات لكل طقم — الإجماليات بعدد الأطقم</p></div><div class="spacer"></div>' +
      '<select id="setSelect" class="select">' + setsList.map((x) =>
        '<option value="' + x.id + '"' + (x.id === set.id ? ' selected' : '') + '>' + esc(x.name) + ' — ' + esc(x.car || '') + '</option>').join('') + '</select>' +
      '<div class="qty-field"><label for="qtyInput">عدد الأطقم</label><input id="qtyInput" type="number" min="1" max="999" value="' + qty + '"></div>' +
      '<button class="btn btn-primary" data-action="order-print" data-id="' + set.id + '">طباعة الأمر</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>الشباك</th><th>الفريم</th><th>الكمية/طقم</th><th>مقاس القص</th><th>سلك (م)</th><th>قماش (م²)</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="6" class="empty-cell">الطقم فاضي</td></tr>') + '</tbody></table></div>' +
      '<div class="cost-bar"><div class="cost-fields">' +
      '<div class="field"><label>سعر السلك / م</label><input id="costWire" type="number" min="0" step="1" value="' + s.wirePrice + '"></div>' +
      '<div class="field"><label>سعر القماش / م²</label><input id="costFabric" type="number" min="0" step="1" value="' + s.fabricPrice + '"></div>' +
      '<div class="field"><label>مصنعية القطعة</label><input id="costLabor" type="number" min="0" step="1" value="' + s.labor + '"></div>' +
      '<div class="field"><label>هدر القماش %</label><input id="costWaste" type="number" min="0" max="40" step="1" value="' + s.waste + '"></div>' +
      '</div></div>' +
      '<div id="orderTotals">' + orderTotalsHTML(set, qty) + '</div>' +
      '</section>';
  }

  return {
    esc, mm, money, m2, miniSvg, patternSvg, patternStats, warnings,
    frames, sets, pattern, order, orderRows, orderTotals, orderTotalsHTML
  };
})();
