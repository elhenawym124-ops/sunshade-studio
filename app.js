/* Sunshade Studio — UI wiring. */
(function () {
  'use strict';

  const ui = { tab: 'frames', frameId: null, setId: null, qty: 1, search: '' };
  const view = document.getElementById('view');
  const dialog = document.getElementById('dialog');
  const tabs = Array.from(document.querySelectorAll('.tab'));

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function frameById(id) { return Store.state.frames.find((f) => f.id === id); }
  function setById(id) { return Store.state.sets.find((s) => s.id === id); }

  function render() {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === ui.tab));
    if (ui.tab === 'frames') view.innerHTML = Views.frames({ search: ui.search });
    else if (ui.tab === 'sets') view.innerHTML = Views.sets();
    else if (ui.tab === 'pattern') view.innerHTML = Views.pattern({ frameId: ui.frameId });
    else view.innerHTML = Views.order({ setId: ui.setId, qty: ui.qty });
  }

  function refreshPattern() {
    const f = frameById(ui.frameId) || Store.state.frames[0];
    if (!f) return;
    const p = Store.patternFor(f);
    const pv = document.getElementById('patternPreview');
    const st = document.getElementById('patternStats');
    if (pv) pv.innerHTML = Views.patternSvg(p);
    if (st) st.innerHTML = Views.patternStats(p);
    const meta = document.querySelector('.stage-meta');
    if (meta) meta.textContent = f.code + ' · ' + Views.mm(p.bbox.w) + ' × ' + Views.mm(p.bbox.h) + ' مم';
  }

  function refreshOrderTotals() {
    const s = setById(ui.setId) || Store.state.sets[0];
    if (!s) return;
    const box = document.getElementById('orderTotals');
    if (box) box.innerHTML = Views.orderTotalsHTML(s, ui.qty);
  }

  function pickFile(accept, cb) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => cb(String(r.result), file.name);
      r.readAsText(file);
    };
    input.click();
  }

  function openFrameDialog(id) {
    const isEdit = !!id;
    const f = isEdit ? frameById(id) : Store.blankFrame();
    if (!f) return;
    dialog.innerHTML =
      '<form id="frameForm" class="dialog-form">' +
      '<div class="dialog-head"><h3>' + (isEdit ? 'تعديل فريم' : 'فريم جديد') + '</h3>' +
      '<p>المقاسات على مسار السلك، مش حرف القماش.</p></div>' +
      '<div class="dialog-body">' +
      '<div class="dlg-preview" id="dlgPreview"></div>' +
      '<div class="grid-2">' +
      field('code', 'الكود', f.code, 'text', 'مثال: ELN-FR') +
      field('car', 'العربية', f.car, 'text', 'ماركة / موديل / سنة') +
      '</div>' +
      '<div class="grid-2">' +
      field('window', 'الشباك', f.window, 'text', 'باب أمامي يمين') +
      '<div class="field"><label for="f-type">النوع</label><select id="f-type" name="type">' +
      ['ثابت', 'جرار'].map((t) => '<option' + (f.type === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
      '</div>' +
      '<div class="grid-2">' +
      field('botW', 'العرض السفلي (مم)', f.botW, 'number', '620') +
      field('topW', 'العرض العلوي (مم)', f.topW, 'number', '575') +
      '</div>' +
      '<div class="grid-3">' +
      field('h', 'الارتفاع (مم)', f.h, 'number', '405') +
      field('shift', 'إزاحة أعلى (مم)', f.shift || 0, 'number', '0') +
      field('bulge', 'تحدب الحرف (مم)', f.bulge || 0, 'number', '0') +
      '</div>' +
      '<div class="grid-4">' +
      field('rBL', 'نصف قطر سفلي يسار', f.rBL, 'number', '55') +
      field('rBR', 'سفلي يمين', f.rBR, 'number', '45') +
      field('rTR', 'علوي يمين', f.rTR, 'number', '70') +
      field('rTL', 'علوي يسار', f.rTL, 'number', '65') +
      '</div>' +
      '<div class="grid-2">' +
      field('wireDia', 'قطر السلك (مم)', f.wireDia, 'number', '3') +
      field('note', 'ملاحظة', f.note || '', 'text', 'اختياري') +
      '</div>' +
      '<p class="form-error" id="formError"></p>' +
      '</div>' +
      '<div class="dialog-foot"><button type="submit" class="btn btn-primary">حفظ الفريم</button>' +
      '<button type="button" class="btn btn-ghost" data-action="dialog-close">إلغاء</button></div>' +
      '</form>';

    const form = dialog.querySelector('#frameForm');
    const update = () => {
      const draft = readFrame(form, f.id);
      dialog.querySelector('#dlgPreview').innerHTML = Views.patternSvg(Store.patternFor(draft));
    };
    form.addEventListener('input', update);
    update();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const draft = readFrame(form, f.id);
      const err = validateFrame(draft);
      if (err) { dialog.querySelector('#formError').textContent = err; return; }
      if (isEdit) {
        const i = Store.state.frames.findIndex((x) => x.id === id);
        Store.state.frames[i] = draft;
      } else {
        Store.state.frames.push(draft);
      }
      Store.state.meta.seeded = true;
      Store.save();
      dialog.close();
      ui.frameId = draft.id;
      render();
      toast(isEdit ? 'تم تحديث الفريم' : 'تم إضافة الفريم');
    });
    dialog.showModal();
    setTimeout(() => { const el = form.querySelector('input[name="code"]'); if (el) el.focus(); }, 30);
  }

  function field(name, label, value, type, ph) {
    return '<div class="field"><label for="f-' + name + '">' + label + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + type + '" value="' + Views.esc(value) + '" placeholder="' + Views.esc(ph || '') + '"' +
      (type === 'number' ? ' step="any" inputmode="decimal"' : '') + '></div>';
  }

  function readFrame(form, id) {
    const fd = new FormData(form);
    const g = (k) => String(fd.get(k) == null ? '' : fd.get(k)).trim();
    return {
      id: id || Store.uid(),
      code: g('code'), car: g('car'), window: g('window') || 'باب', type: g('type') || 'ثابت',
      botW: Number(g('botW')) || 0, topW: Number(g('topW')) || 0, h: Number(g('h')) || 0,
      shift: Number(g('shift')) || 0, bulge: Number(g('bulge')) || 0,
      rBL: Number(g('rBL')) || 0, rBR: Number(g('rBR')) || 0,
      rTR: Number(g('rTR')) || 0, rTL: Number(g('rTL')) || 0,
      wireDia: Number(g('wireDia')) || 3, note: g('note')
    };
  }

  function validateFrame(f) {
    if (!f.code) return 'الكود مطلوب.';
    if (!f.car) return 'اسم العربية مطلوب.';
    if (!(f.botW >= 100 && f.topW >= 100 && f.h >= 100)) return 'أقل مقاس مسموح 100 مم.';
    if (f.botW > 2500 || f.h > 2500) return 'المقاس كبير جدًا — راجع الأرقام.';
    if ([f.rBL, f.rBR, f.rTR, f.rTL].some((r) => r < 0)) return 'نصف القطر لازم يكون موجب.';
    return '';
  }

  function openSetDialog(id) {
    if (!Store.state.frames.length) { toast('ضيف فريم الأول'); return; }
    const isEdit = !!id;
    const s = isEdit ? setById(id) : { id: Store.uid('s'), name: '', car: '', price: 0, items: [] };
    if (!s) return;
    const checked = new Set(s.items.map((i) => i.frameId));
    const qtyMap = new Map(s.items.map((i) => [i.frameId, i.qty]));

    const rows = Store.state.frames.map((f) =>
      '<label class="set-row"><input type="checkbox" class="set-check" value="' + f.id + '"' + (checked.has(f.id) ? ' checked' : '') + '>' +
      '<span class="set-name">' + Views.esc(f.car) + ' — ' + Views.esc(f.window) + ' <b class="mono">' + Views.esc(f.code) + '</b></span>' +
      '<input type="number" class="set-qty" min="0" max="50" step="1" value="' + (qtyMap.get(f.id) || 1) + '"' + (checked.has(f.id) ? '' : ' disabled') + '></label>'
    ).join('');

    dialog.innerHTML = '<form id="setForm" class="dialog-form">' +
      '<div class="dialog-head"><h3>' + (isEdit ? 'تعديل طقم' : 'طقم جديد') + '</h3><p>اختر الفريمات وعدد القطع في الطقم.</p></div>' +
      '<div class="dialog-body">' +
      '<div class="grid-2">' + field('sname', 'اسم الطقم', s.name, 'text', 'طقم 4 قطع') + field('scar', 'العربية', s.car || '', 'text', '') + '</div>' +
      '<div class="field"><label for="f-sprice">سعر بيع الطقم (ج.م)</label><input id="f-sprice" name="sprice" type="number" min="0" step="1" value="' + (s.price || 0) + '"></div>' +
      '<p class="field-label">قطع الطقم</p><div class="set-list">' + rows + '</div>' +
      '<p class="form-error" id="setError"></p></div>' +
      '<div class="dialog-foot"><button type="submit" class="btn btn-primary">حفظ الطقم</button>' +
      '<button type="button" class="btn btn-ghost" data-action="dialog-close">إلغاء</button></div></form>';

    const form = dialog.querySelector('#setForm');
    form.addEventListener('change', (e) => {
      if (e.target.classList.contains('set-check')) {
        const q = e.target.closest('.set-row').querySelector('.set-qty');
        q.disabled = !e.target.checked;
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('sname') || '').trim();
      const items = [];
      form.querySelectorAll('.set-row').forEach((row) => {
        const cb = row.querySelector('.set-check');
        const q = row.querySelector('.set-qty');
        if (cb.checked) items.push({ frameId: cb.value, qty: Math.max(1, Number(q.value) || 1) });
      });
      if (!name) { dialog.querySelector('#setError').textContent = 'اسم الطقم مطلوب.'; return; }
      if (!items.length) { dialog.querySelector('#setError').textContent = 'اختار فريم واحد على الأقل.'; return; }
      const next = { id: s.id, name, car: String(fd.get('scar') || '').trim(), price: Number(fd.get('sprice')) || 0, items };
      if (isEdit) Store.state.sets[Store.state.sets.findIndex((x) => x.id === id)] = next;
      else Store.state.sets.push(next);
      Store.save();
      dialog.close();
      ui.setId = next.id;
      render();
      toast('تم حفظ الطقم');
    });
    dialog.showModal();
  }

  function importCSV(text) {
    const frames = Store.parseCSV(text);
    if (!frames.length) throw new Error('مفيش صفوف صالحة في الملف');
    Store.state.frames = Store.state.frames.filter((f) => !/^DEMO-/.test(f.code));
    let added = 0, updated = 0;
    frames.forEach((f) => {
      const i = Store.state.frames.findIndex((x) => x.code === f.code);
      if (i >= 0) { f.id = Store.state.frames[i].id; Store.state.frames[i] = f; updated++; }
      else { Store.state.frames.push(f); added++; }
    });
    Store.state.meta.seeded = true;
    Store.save();
    render();
    toast('تم استيراد ' + frames.length + ' فريم (' + added + ' جديد)');
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { ui.tab = tab.dataset.tab; render(); return; }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'dialog-close') { dialog.close(); return; }
    if (action === 'frame-new') { openFrameDialog(); return; }
    if (action === 'frame-edit') { openFrameDialog(id); return; }
    if (action === 'frame-pattern') { ui.frameId = id; ui.tab = 'pattern'; render(); return; }
    if (action === 'set-new') { openSetDialog(); return; }
    if (action === 'set-edit') { openSetDialog(id); return; }

    if (action === 'frame-del') {
      const f = frameById(id);
      if (!f) return;
      if (!confirm('حذف الفريم ' + f.code + '؟')) return;
      Store.state.frames = Store.state.frames.filter((x) => x.id !== id);
      Store.state.sets.forEach((s) => { s.items = s.items.filter((i) => i.frameId !== id); });
      Store.state.sets = Store.state.sets.filter((s) => s.items.length);
      Store.save();
      render();
      toast('تم حذف الفريم');
      return;
    }

    if (action === 'set-del') {
      const s = setById(id);
      if (!s) return;
      if (!confirm('حذف الطقم ' + s.name + '؟')) return;
      Store.state.sets = Store.state.sets.filter((x) => x.id !== id);
      Store.save();
      render();
      toast('تم حذف الطقم');
      return;
    }

    if (action === 'clear-demo') {
      if (!confirm('مسح بيانات الأمثلة؟')) return;
      Store.state.frames = Store.state.frames.filter((f) => !/^DEMO-/.test(f.code));
      const ids = new Set(Store.state.frames.map((f) => f.id));
      Store.state.sets.forEach((s) => { s.items = s.items.filter((i) => ids.has(i.frameId)); });
      Store.state.sets = Store.state.sets.filter((s) => s.items.length);
      Store.state.meta.seeded = true;
      Store.save();
      render();
      toast('تم مسح الأمثلة');
      return;
    }

    if (action === 'csv-template') {
      Exporters.download('sunshade-frames-template.csv', 'text/csv', Store.csvTemplate());
      return;
    }

    if (action === 'import-csv') {
      pickFile('.csv,text/csv', (text) => {
        try { importCSV(text); } catch (err) { alert(err.message); }
      });
      return;
    }

    if (action === 'export-json') {
      const d = new Date().toISOString().slice(0, 10);
      Exporters.download('sunshade-data-' + d + '.json', 'application/json', Store.exportJSON());
      return;
    }

    if (action === 'import-json') {
      pickFile('.json,application/json', (text) => {
        try {
          const n = Store.importJSON(text);
          ui.frameId = Store.state.frames[0] && Store.state.frames[0].id;
          ui.setId = Store.state.sets[0] && Store.state.sets[0].id;
          render();
          toast('تم استيراد ' + n + ' فريم');
        } catch (err) { alert('ملف غير صالح: ' + err.message); }
      });
      return;
    }

    if (action === 'pattern-svg' || action === 'pattern-dxf' || action === 'pattern-print') {
      const f = frameById(id) || Store.state.frames[0];
      if (!f) return;
      const item = { frame: f, pattern: Store.patternFor(f) };
      if (action === 'pattern-svg') {
        Exporters.download(Exporters.safe(f.code) + '-cut.svg', 'image/svg+xml', Exporters.svgFor(item));
      } else if (action === 'pattern-dxf') {
        Exporters.download(Exporters.safe(f.code) + '-cut.dxf', 'application/dxf', Exporters.dxfFor(item));
      } else {
        const pages = Exporters.pagesFor(item.pattern).length;
        if (pages > 40 && !confirm('الباترون هيتقسم على ' + pages + ' صفحة A4. تكمل؟')) return;
        Exporters.printSheets([item]);
      }
      return;
    }

    if (action === 'order-print') {
      const s = setById(id) || setById(ui.setId) || Store.state.sets[0];
      if (!s) return;
      const rows = Views.orderRows(s, ui.qty);
      if (!rows.length) { toast('الطقم فاضي'); return; }
      Exporters.printOrder({
        set: s, qty: ui.qty, rows,
        totals: Views.orderTotals(s, ui.qty),
        settings: Store.state.settings,
        date: new Date().toLocaleDateString('ar-EG')
      });
      return;
    }
  });

  view.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'frameSearch') {
      ui.search = t.value;
      const q = ui.search.trim().toLowerCase();
      view.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
        tr.classList.toggle('is-hidden', !!q && !tr.textContent.toLowerCase().includes(q));
      });
      view.querySelectorAll('[data-card-id]').forEach((el) => {
        el.classList.toggle('is-hidden', !!q && !el.textContent.toLowerCase().includes(q));
      });
      return;
    }
    if (t.id === 'lipInput' || t.id === 'seamInput') {
      Store.state.settings.lip = Number(document.getElementById('lipInput').value) || 14;
      Store.state.settings.seam = Number(document.getElementById('seamInput').value) || 0;
      Store.save();
      refreshPattern();
      return;
    }
    if (t.id === 'qtyInput') {
      ui.qty = Math.max(1, Number(t.value) || 1);
      refreshOrderTotals();
      return;
    }
    if (t.id === 'costWire' || t.id === 'costFabric' || t.id === 'costLabor' || t.id === 'costWaste') {
      Store.state.settings.wirePrice = Number(document.getElementById('costWire').value) || 0;
      Store.state.settings.fabricPrice = Number(document.getElementById('costFabric').value) || 0;
      Store.state.settings.labor = Number(document.getElementById('costLabor').value) || 0;
      Store.state.settings.waste = Number(document.getElementById('costWaste').value) || 0;
      Store.save();
      refreshOrderTotals();
    }
  });

  view.addEventListener('change', (e) => {
    if (e.target.id === 'frameSelect') { ui.frameId = e.target.value; render(); }
    if (e.target.id === 'setSelect') { ui.setId = e.target.value; render(); }
  });

  Store.load();
  const hash = (location.hash || '').replace('#', '');
  if (['frames', 'sets', 'pattern', 'order'].indexOf(hash) >= 0) ui.tab = hash;
  ui.frameId = Store.state.frames[0] ? Store.state.frames[0].id : null;
  ui.setId = Store.state.sets[0] ? Store.state.sets[0].id : null;
  render();
})();
