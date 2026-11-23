/* Sunshade Studio — SVG / DXF / print output. */
window.Exporters = (function () {
  'use strict';

  const M = 10, PW = 210, PH = 297, UW = PW - 2 * M, UH = PH - 2 * M;
  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  const f3 = (n) => (Math.round(n * 1000) / 1000).toString();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = (s) => String(s || 'pattern').replace(/[^\w\u0600-\u06FF-]+/g, '-').replace(/^-+|-+$/g, '') || 'pattern';

  function download(filename, mime, text) {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function svgFor(item) {
    const p = item.pattern, fr = item.frame;
    const b = p.bbox, pad = 18, extra = 12;
    const W = b.w + pad * 2, H = b.h + pad * 2 + extra;
    const dx = pad - b.minX, dy = pad - b.minY;
    const label = fr.code + ' · ' + f2(b.w) + ' × ' + f2(b.h) + ' mm';
    const barY = H - 7;
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + f2(W) + 'mm" height="' + f2(H) + 'mm" viewBox="0 0 ' + f2(W) + ' ' + f2(H) + '" shape-rendering="geometricPrecision">\n' +
      '<title>' + esc(label) + '</title>\n' +
      '<rect width="100%" height="100%" fill="#ffffff"/>\n' +
      '<g transform="translate(' + f2(dx) + ' ' + f2(dy) + ')" fill="none" stroke-linejoin="round">\n' +
      '<path d="' + Geo.toPathD(p.cut) + '" stroke="#000000" stroke-width="0.6"/>\n' +
      '<path d="' + Geo.toPathD(p.sew) + '" stroke="#666666" stroke-width="0.3" stroke-dasharray="4 2"/>\n' +
      '<path d="' + Geo.toPathD(p.shape.pts) + '" stroke="#999999" stroke-width="0.3" stroke-dasharray="2 2"/>\n' +
      '</g>\n' +
      '<g font-family="Arial, sans-serif" font-size="3.5" fill="#000000" direction="ltr">\n' +
      '<text x="' + f2(pad) + '" y="' + f2(pad * 0.55) + '">' + esc(label) + '</text>\n' +
      '<line x1="' + f2(pad) + '" y1="' + f2(barY) + '" x2="' + f2(pad + 100) + '" y2="' + f2(barY) + '" stroke="#000000" stroke-width="0.5"/>\n' +
      '<line x1="' + f2(pad) + '" y1="' + f2(barY - 1.5) + '" x2="' + f2(pad) + '" y2="' + f2(barY + 1.5) + '" stroke="#000000" stroke-width="0.5"/>\n' +
      '<line x1="' + f2(pad + 100) + '" y1="' + f2(barY - 1.5) + '" x2="' + f2(pad + 100) + '" y2="' + f2(barY + 1.5) + '" stroke="#000000" stroke-width="0.5"/>\n' +
      '<text x="' + f2(pad + 103) + '" y="' + f2(barY + 1.2) + '" font-size="3">100 mm</text>\n' +
      '</g>\n</svg>\n';
  }

  function polyline(pts, layer, maxY) {
    let s = '0\nPOLYLINE\n8\n' + layer + '\n66\n1\n70\n1\n';
    for (const p of pts) {
      s += '0\nVERTEX\n8\n' + layer + '\n10\n' + f3(p.x) + '\n20\n' + f3(maxY - p.y) + '\n30\n0\n';
    }
    return s + '0\nSEQEND\n8\n' + layer + '\n';
  }

  function dxfFor(item) {
    const p = item.pattern;
    const b = Geo.bbox(p.cut.concat(p.sew, p.shape.pts));
    let out = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n';
    out += '0\nSECTION\n2\nENTITIES\n';
    out += polyline(p.cut, 'CUT', b.maxY);
    out += polyline(p.sew, 'SEW', b.maxY);
    out += polyline(p.shape.pts, 'FRAME', b.maxY);
    return out + '0\nENDSEC\n0\nEOF\n';
  }

  function pagesFor(p) {
    const b = p.bbox;
    const cols = Math.max(1, Math.ceil((b.w - 0.01) / UW));
    const rows = Math.max(1, Math.ceil((b.h - 0.01) / UH));
    const list = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) list.push({ r, c, cols, rows });
    return list;
  }

  function sheetSVG(item, page, index, total) {
    const p = item.pattern, b = p.bbox;
    const dx = M - b.minX - page.c * UW;
    const dy = M - b.minY - page.r * UH;
    const label = item.frame.code + ' · ' + f2(b.w) + ' × ' + f2(b.h) + ' mm';
    const name = item.frame.car + ' — ' + item.frame.window;
    const barY = PH - 8;
    let s = '<svg width="210mm" height="297mm" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">';
    s += '<g transform="translate(' + f2(dx) + ' ' + f2(dy) + ')" fill="none" stroke-linejoin="round">';
    s += '<path d="' + Geo.toPathD(p.cut) + '" stroke="#000" stroke-width="0.5"/>';
    s += '<path d="' + Geo.toPathD(p.sew) + '" stroke="#777" stroke-width="0.25" stroke-dasharray="3 2"/>';
    s += '<path d="' + Geo.toPathD(p.shape.pts) + '" stroke="#aaa" stroke-width="0.25" stroke-dasharray="1.5 1.5"/>';
    s += '</g>';
    s += '<rect x="' + M + '" y="' + M + '" width="' + UW + '" height="' + UH + '" fill="none" stroke="#bbb" stroke-width="0.2" stroke-dasharray="2 2"/>';
    s += '<g font-family="Arial, sans-serif" fill="#000" font-size="2.8" direction="ltr">';
    s += '<text x="' + M + '" y="6">' + esc(label) + '</text>';
    s += '<text x="' + (PW - M) + '" y="6" text-anchor="end">' + (index + 1) + '/' + total + '</text>';
    s += '<line x1="' + M + '" y1="' + barY + '" x2="' + (M + 100) + '" y2="' + barY + '" stroke="#000" stroke-width="0.4"/>';
    s += '<line x1="' + M + '" y1="' + (barY - 1.2) + '" x2="' + M + '" y2="' + (barY + 1.2) + '" stroke="#000" stroke-width="0.4"/>';
    s += '<line x1="' + (M + 100) + '" y1="' + (barY - 1.2) + '" x2="' + (M + 100) + '" y2="' + (barY + 1.2) + '" stroke="#000" stroke-width="0.4"/>';
    s += '<text x="' + (M + 103) + '" y="' + (barY + 1) + '" font-size="2.4">100 mm</text>';
    s += '</g>';
    s += '<text x="' + (PW / 2) + '" y="6" font-family="Arial, sans-serif" font-size="2.6" fill="#333" text-anchor="middle" direction="rtl">' + esc(name) + '</text>';
    s += '</svg>';
    return s;
  }

  function sheetHTML(item, page, index, total) {
    return '<div class="sheet">' + sheetSVG(item, page, index, total) + '</div>';
  }

  function printSheets(items) {
    const area = document.getElementById('printArea');
    let html = '';
    items.forEach((item) => {
      const pages = pagesFor(item.pattern);
      pages.forEach((pg, i) => { html += sheetHTML(item, pg, i, pages.length); });
    });
    area.innerHTML = html;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
    return area.querySelectorAll('.sheet').length;
  }

  function printOrder(payload) {
    const s = payload.set, rows = payload.rows, t = payload.totals, st = payload.settings;
    const area = document.getElementById('printArea');
    let body = '';
    rows.forEach((r) => {
      body += '<tr><td>' + esc(r.frame.window) + '</td><td class="mono">' + esc(r.frame.code) + '</td><td class="mono">' + r.qty + '</td>' +
        '<td class="mono">' + f2(r.pattern.bbox.w) + '×' + f2(r.pattern.bbox.h) + '</td>' +
        '<td class="mono">' + (r.pattern.wireMM / 1000).toFixed(2) + '</td>' +
        '<td class="mono">' + r.pattern.fabricM2.toFixed(3) + '</td></tr>';
    });
    area.innerHTML = '<div class="sheet order-sheet"><div class="order-head">' +
      '<div><h1>أمر شغل — ' + esc(s.name) + '</h1><p>' + esc(s.car || '') + ' · عدد الأطقم: ' + payload.qty + ' · ' + payload.date + '</p></div>' +
      '<div class="order-brand">RED LINE<br><span>ستوديو الستائر</span></div></div>' +
      '<table class="order-table"><thead><tr><th>الشباك</th><th>كود الفريم</th><th>الكمية</th><th>مقاس القص (مم)</th><th>سلك (م)</th><th>قماش (م²)</th></tr></thead><tbody>' +
      body + '</tbody></table>' +
      '<div class="order-totals">' +
      '<div><span>إجمالي السلك</span><b>' + t.wireM.toFixed(2) + ' م</b></div>' +
      '<div><span>إجمالي القماش</span><b>' + t.fabricM2.toFixed(2) + ' م²</b></div>' +
      '<div><span>سعر القماش/م²</span><b>' + st.fabricPrice + '</b></div>' +
      '<div><span>سعر السلك/م</span><b>' + st.wirePrice + '</b></div>' +
      '<div><span>تكلفة تقديرية للطقم</span><b>' + t.perSet.toFixed(0) + ' ج.م</b></div>' +
      '<div><span>إجمالي التكلفة</span><b>' + t.cost.toFixed(0) + ' ج.م</b></div>' +
      '<div><span>سعر البيع</span><b>' + (t.price * payload.qty).toFixed(0) + ' ج.م</b></div>' +
      '</div>' +
      '<div class="order-sign"><span>توقيع الفني</span><span>توقيع المراجع</span></div>' +
      '<p class="order-note">اقرأ المقاس على مسطرة 100 مم قبل القص. القص على خط CUT الخارجي.</p></div>';
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  return { download, safe, svgFor, dxfFor, printSheets, printOrder, pagesFor };
})();
