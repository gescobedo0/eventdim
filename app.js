(() => {
  'use strict';

  const STORE_KEY = 'eventdim:v1';
  const MAX_IMAGE_SIDE = 1600;
  const MARK_COLOR = '#5b3df5'; // QR tile is always white, so the light-mode accent is used there

  const $ = (sel) => document.querySelector(sel);
  const els = {
    editor: $('#editor'),
    ticketView: $('#ticket'),
    form: $('#ticket-form'),
    dropzone: $('#dropzone'),
    dzPreview: $('#dz-preview'),
    fileInput: $('#file-input'),
    btnPaste: $('#btn-paste'),
    btnClearImg: $('#btn-clear-img'),
    fTitle: $('#f-title'),
    fWhen: $('#f-when'),
    fVenue: $('#f-venue'),
    fType: $('#f-type'),
    btnBack: $('#btn-back'),
    btnEdit: $('#btn-edit-2'),
    btnNew: $('#btn-new'),
    stage: $('#stage'),
    heroImg: $('#hero-img'),
    tTitle: $('#t-title'),
    tWhen: $('#t-when'),
    tVenue: $('#t-venue'),
    tType: $('#t-type'),
    tRender: $('#t-render'),
    tMade: $('#t-made'),
    qrRow: $('#qr-row'),
    qr: $('#qr'),
    prev: $('#prev'),
    next: $('#next'),
    dots: $('#dots'),
    toast: $('#toast'),
  };

  /* ───────── State ───────── */

  let ticket = load();          // last rendered ticket (persisted)
  let draft = ticket ? { ...ticket } : blankDraft(); // what the editor is working on
  let slide = 0;                // which ticket in the order is showing
  let currentView = null;

  function blankDraft() {
    return { image: null, title: '', when: nextSaturdayEvening(), venue: '', type: '', count: 1 };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const t = JSON.parse(raw);
      if (t.image && !String(t.image).startsWith('data:image/')) t.image = null;
      t.count = clampCount(t.count);
      return t;
    } catch {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(ticket));
    } catch {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ ...ticket, image: null }));
        toast('Saved without the image — it was too big to keep on this device.');
      } catch { /* storage unavailable (private mode etc.) — the page still works */ }
    }
  }

  const clampCount = (n) => Math.min(4, Math.max(1, parseInt(n, 10) || 1));

  /* ───────── Helpers ───────── */

  function nextSaturdayEvening() {
    const d = new Date();
    d.setDate(d.getDate() + (((6 - d.getDay()) + 7) % 7 || 7));
    d.setHours(19, 30, 0, 0);
    return toLocalInputValue(d);
  }

  function toLocalInputValue(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function formatWhen(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${day} • ${time}`;
  }

  function formatMade(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function newRenderId() {
    const b = new Uint8Array(4);
    crypto.getRandomValues(b);
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  }

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3200);
  }

  /* ───────── Image input ───────── */

  function decodeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
      img.src = url;
    });
  }

  // Downscale to a JPEG data URL so it fits comfortably in localStorage.
  async function processImage(file) {
    const img = await decodeImage(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNGs shouldn't turn black as JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.86);
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      toast('That file isn’t an image.');
      return;
    }
    els.dropzone.classList.add('is-busy');
    try {
      draft.image = await processImage(file);
      updateDropzone();
    } catch {
      toast('Couldn’t read that image. Try a JPG or PNG screenshot.');
    } finally {
      els.dropzone.classList.remove('is-busy');
      els.fileInput.value = '';
    }
  }

  function updateDropzone() {
    const has = Boolean(draft.image);
    els.dropzone.classList.toggle('has-image', has);
    els.dzPreview.hidden = !has;
    if (has) els.dzPreview.src = draft.image;
    else els.dzPreview.removeAttribute('src');
    els.btnClearImg.hidden = !has;
  }

  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
  });
  els.fileInput.addEventListener('change', () => handleFile(els.fileInput.files[0]));
  els.btnClearImg.addEventListener('click', () => {
    draft.image = null;
    updateDropzone();
  });

  // Drag & drop anywhere while the editor is showing
  ['dragenter', 'dragover'].forEach((type) => window.addEventListener(type, (e) => {
    e.preventDefault();
    if (currentView === 'editor') els.dropzone.classList.add('is-over');
  }));
  ['dragleave', 'dragend'].forEach((type) => window.addEventListener(type, (e) => {
    if (type === 'dragend' || e.relatedTarget === null) els.dropzone.classList.remove('is-over');
  }));
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('is-over');
    if (currentView !== 'editor') return;
    const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
    if (file) handleFile(file);
  });

  // Ctrl/⌘+V
  document.addEventListener('paste', (e) => {
    if (currentView !== 'editor') return;
    const item = Array.from(e.clipboardData?.items || []).find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (!item) return; // let ordinary text paste into inputs
    e.preventDefault();
    handleFile(item.getAsFile());
  });

  // Paste button (async clipboard API — on iOS this pops the system "Paste" bubble)
  if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
    els.btnPaste.hidden = false;
    els.btnPaste.addEventListener('click', async () => {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'));
          if (type) {
            const blob = await item.getType(type);
            await handleFile(new File([blob], 'pasted', { type }));
            return;
          }
        }
        toast('No image on the clipboard. Copy one first.');
      } catch {
        toast('Clipboard access was blocked. Try Ctrl/⌘+V, or choose a file.');
      }
    });
  }

  /* ───────── Form ───────── */

  function fillForm() {
    els.fTitle.value = draft.title || '';
    els.fWhen.value = draft.when || '';
    els.fVenue.value = draft.venue || '';
    els.fType.value = draft.type || '';
    const radio = els.form.querySelector(`input[name="count"][value="${clampCount(draft.count)}"]`);
    if (radio) radio.checked = true;
    updateDropzone();
  }

  function readForm() {
    draft.title = els.fTitle.value.trim();
    draft.when = els.fWhen.value;
    draft.venue = els.fVenue.value.trim();
    draft.type = els.fType.value.trim();
    draft.count = clampCount(els.form.elements.count.value);
  }

  els.form.addEventListener('input', readForm);
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    readForm();
    ticket = {
      ...draft,
      title: draft.title || 'Untitled event',
      type: draft.type || 'General Admission',
      renderId: newRenderId(),
      madeAt: new Date().toISOString(),
    };
    draft = { ...ticket };
    save();
    renderTicket();
    go('ticket');
    if (!ticket.image) toast('No image yet, so it’s using a placeholder frame.');
  });

  /* ───────── QR ───────── */

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function mulberry32(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRect(x, y, w, h, r) {
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}`
      + `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  }

  // Real QR (high error correction, so the centre mark doesn't break it) whose payload is only a
  // "not a ticket" note. If the encoder didn't load, fall back to a seeded decorative pattern.
  function buildQrSvg(text) {
    let n;
    let isDark;
    try {
      if (typeof window.qrcode !== 'function') throw new Error('no encoder');
      const qr = window.qrcode(0, 'H');
      qr.addData(text);
      qr.make();
      n = qr.getModuleCount();
      isDark = (r, c) => qr.isDark(r, c);
    } catch {
      n = 37;
      const rand = mulberry32(hashString(text));
      const grid = Array.from({ length: n * n }, () => rand() < 0.5);
      isDark = (r, c) => grid[r * n + c];
    }

    const inFinder = (r, c) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
    let k = Math.round(n * 0.24);
    if (k % 2 === 0) k += 1;
    const lo = (n - k) / 2;
    const hi = lo + k;
    const inLogo = (r, c) => r >= lo && r < hi && c >= lo && c < hi;

    let modules = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!inFinder(r, c) && !inLogo(r, c) && isDark(r, c)) modules += `M${c} ${r}h1v1h-1z`;
      }
    }

    const finder = (x, y) =>
      `<path fill-rule="evenodd" d="${roundRect(x, y, 7, 7, 2)}${roundRect(x + 1, y + 1, 5, 5, 1.3)}"/>`
      + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`;

    const tile = k - 0.6;
    const pad = k * 0.14;
    return `<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<g fill="#111018"><path shape-rendering="crispEdges" d="${modules}"/>`
      + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</g>'
      + `<rect x="${lo + 0.3}" y="${lo + 0.3}" width="${tile}" height="${tile}" rx="${k * 0.2}" fill="#fff" stroke="#e6e4ef" stroke-width="0.25"/>`
      + `<use href="#mark" x="${lo + pad}" y="${lo + pad}" width="${k - pad * 2}" height="${k - pad * 2}" fill="${MARK_COLOR}"/>`
      + '</svg>';
  }

  /* ───────── Ticket rendering ───────── */

  function renderTicket() {
    if (!ticket) return;
    els.tTitle.textContent = ticket.title;
    const when = formatWhen(ticket.when);
    els.tWhen.textContent = when;
    els.tWhen.hidden = !when;
    els.tVenue.textContent = ticket.venue || '';
    els.tVenue.hidden = !ticket.venue;
    els.tRender.textContent = ticket.renderId;
    els.tMade.textContent = formatMade(ticket.madeAt);

    const img = ticket.image;
    els.stage.classList.toggle('no-image', !img);
    if (img) els.heroImg.src = img; else els.heroImg.removeAttribute('src');

    showSlide(0);
  }

  function showSlide(i, dir = 0) {
    const count = ticket.count;
    slide = Math.min(count - 1, Math.max(0, i));
    els.qr.innerHTML = buildQrSvg(`NOT A TICKET - eventdim demo ${ticket.renderId} ${slide + 1}/${count}`);
    els.tType.textContent = `${ticket.type} • Ticket ${slide + 1} of ${count}`;

    els.qrRow.classList.toggle('single', count === 1);
    els.prev.disabled = slide === 0;
    els.next.disabled = slide === count - 1;

    els.dots.innerHTML = count > 1
      ? Array.from({ length: count }, (_, j) => `<span class="dot${j === slide ? ' on' : ''}"></span>`).join('')
      : '';

    if (dir) {
      els.qr.classList.remove('in-next', 'in-prev');
      void els.qr.offsetWidth; // restart the animation
      els.qr.classList.add(dir > 0 ? 'in-next' : 'in-prev');
    }
  }

  function step(dir) {
    if (!ticket) return;
    const target = slide + dir;
    if (target < 0 || target >= ticket.count) return;
    showSlide(target, dir);
  }

  els.prev.addEventListener('click', () => step(-1));
  els.next.addEventListener('click', () => step(1));

  // swipe between tickets
  let swipeX = null;
  els.qrRow.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
  els.qrRow.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });
  els.qrRow.addEventListener('pointercancel', () => { swipeX = null; });

  document.addEventListener('keydown', (e) => {
    if (currentView !== 'ticket' || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ───────── Views & routing (#ticket ↔ editor) ───────── */

  function route() {
    const view = location.hash === '#ticket' && ticket ? 'ticket' : 'editor';
    if (view === currentView) return;
    const first = currentView === null;
    currentView = view;

    els.editor.hidden = view !== 'editor';
    els.ticketView.hidden = view !== 'ticket';
    els.btnBack.hidden = !ticket;

    if (!first) window.scrollTo(0, 0);
  }

  function go(view) {
    const url = view === 'ticket' ? '#ticket' : location.pathname + location.search;
    const isTicket = location.hash === '#ticket';
    if ((view === 'ticket') !== isTicket) history.pushState(null, '', url);
    route();
  }

  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  function editTicket() {
    draft = { ...ticket };
    fillForm();
    go('editor');
  }

  els.btnEdit.addEventListener('click', editTicket);
  els.btnBack.addEventListener('click', () => { renderTicket(); go('ticket'); });

  // Header search / menu / profile are placeholders for now
  document.querySelectorAll('[data-placeholder]').forEach((btn) => btn.addEventListener('click', () => {
    toast(`${btn.dataset.placeholder} isn’t hooked up yet.`);
  }));
  els.btnNew.addEventListener('click', () => {
    draft = blankDraft();
    fillForm();
    go('editor');
    toast('Fresh start. Add an image to frame.');
  });

  // "About" links scroll to the disclaimer without touching the route
  document.querySelectorAll('[data-scroll-about]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('#about').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));

  /* ───────── Boot ───────── */

  fillForm();
  if (ticket) renderTicket();
  route();
})();
