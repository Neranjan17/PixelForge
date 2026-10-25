'use strict';
const $ = id => document.getElementById(id), cv = $('cv'), ctx = cv.getContext('2d'), dlg = $('dlg');
let pcols = [], S = 16, bg = null, adj = null, W = 0, H = 0, grid = null, z = 16, zf = 16, ox = 0, oy = 0, tool = 'fill', mode = 'c', selTex = null,
  sel = null, clip = null, pp = null, act = null, hover = null, space = false, G = null, U = [], R = [], tid = 0, raf = 0, tt;
const tex = new Map(), ptrs = new Map();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inR = (r, x, y) => r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const rect = (a, b) => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });
const each = (r, f) => { for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) f(x, y) };
const rd = () => raf || (raf = requestAnimationFrame(draw));
const cellAt = e => { const b = cv.getBoundingClientRect(), x = Math.floor((e.clientX - b.left - ox) / z), y = Math.floor((e.clientY - b.top - oy) / z); return { x, y, ok: x >= 0 && y >= 0 && x < W && y < H } };
function toast(m, ms = 2500) { const e = $('msg'); e.textContent = m; e.hidden = false; clearTimeout(tt); tt = setTimeout(() => e.hidden = true, ms) }
$('msg').onclick = () => $('msg').hidden = true;

// ---- rendering ----
function dc(v, px, py) {
  if (v[0] === '#') { ctx.fillStyle = v; ctx.fillRect(px, py, z, z) }
  else { const t = tex.get(+v.slice(1)); t && ctx.drawImage(t.cv, px, py, z, z) }
}
function box(r) {
  const x = ox + r.x0 * z, y = oy + r.y0 * z, w = (r.x1 - r.x0 + 1) * z, h = (r.y1 - r.y0 + 1) * z;
  ctx.fillStyle = 'rgba(79,157,255,.18)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4f9dff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
}
function draw() {
  raf = 0; if (!grid) return;
  const d = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d) }
  ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#26282d'; ctx.fillRect(ox, oy, W * z, H * z);
  const b = adj || bg;
  if (b) { ctx.globalAlpha = b.o; ctx.imageSmoothingEnabled = true; ctx.drawImage(b.img, ox + b.x * z, oy + b.y * z, b.w * z, b.w * z * b.img.height / b.img.width); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false }
  const x0 = Math.max(0, Math.floor(-ox / z)), y0 = Math.max(0, Math.floor(-oy / z)),
    x1 = Math.min(W - 1, Math.floor((w - ox) / z)), y1 = Math.min(H - 1, Math.floor((h - oy) / z));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const v = grid[y * W + x]; v && dc(v, ox + x * z, oy + y * z) }
  if (z >= 8) {
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) { const p = ox + x * z + .5; ctx.moveTo(p, oy + y0 * z); ctx.lineTo(p, oy + (y1 + 1) * z) }
    for (let y = y0; y <= y1 + 1; y++) { const p = oy + y * z + .5; ctx.moveTo(ox + x0 * z, p); ctx.lineTo(ox + (x1 + 1) * z, p) }
    ctx.stroke();
  }
  ctx.strokeStyle = '#5a606c'; ctx.lineWidth = 1; ctx.strokeRect(ox - .5, oy - .5, W * z + 1, H * z + 1);
  if (tool === 'paste' && clip && pp) {
    ctx.globalAlpha = .7; let i = 0;
    for (let y = 0; y < clip.h; y++) for (let x = 0; x < clip.w; x++, i++) {
      const v = clip.d[i]; if (v && pp.x + x < W && pp.y + y < H) dc(v, ox + (pp.x + x) * z, oy + (pp.y + y) * z);
    }
    ctx.globalAlpha = 1; box({ x0: pp.x, y0: pp.y, x1: Math.min(W - 1, pp.x + clip.w - 1), y1: Math.min(H - 1, pp.y + clip.h - 1) });
  }
  if (sel) box(sel);
}

// ---- view ----
function clampPan() { const m = 40; ox = Math.round(clamp(ox, m - W * z, cv.clientWidth - m)); oy = Math.round(clamp(oy, m - H * z, cv.clientHeight - m)) }
function zoomTo(nz, cx, cy) {
  zf = clamp(nz, 2, 64); const n = Math.round(zf);
  ox = Math.round(cx - (cx - ox) * n / z); oy = Math.round(cy - (cy - oy) * n / z); z = n; clampPan(); ui(); rd();
}
function zoomBy(f) { let n = Math.round(z * f); if (n === z) n += f > 1 ? 1 : -1; zoomTo(n, cv.clientWidth / 2, cv.clientHeight / 2) }
function fit() {
  const w = cv.clientWidth, h = cv.clientHeight;
  z = zf = clamp(Math.floor(Math.min((w - 16) / W, (h - 16) / H)), 2, 64);
  ox = Math.round((w - W * z) / 2); oy = Math.round((h - H * z) / 2); ui(); rd();
}

// ---- state / history ----
function create(w, h, r) {
  if (r !== S) { tex.clear(); memo.clear(); selTex = null; clip = null; renderTex() }
  pcols = []; S = r; W = w; H = h; grid = new Array(W * H).fill(null); U = []; R = []; sel = null; pp = null; act = null;
  if (adj) { drop(adj.img); adjClose() }
  if (bg) { drop(bg.img); bg = null }
  fit();
}
function push(s) { U.push(s); if (U.length > 60) U.shift(); R = []; ui() }
function undo() { if (!U.length || act || adj) return; R.push(grid); grid = U.pop(); sel = null; ui(); rd() }
function redo() { if (!R.length || act || adj) return; U.push(grid); grid = R.pop(); sel = null; ui(); rd() }
const clipSel = q => { const n = { x0: Math.max(0, q.x0), y0: Math.max(0, q.y0), x1: Math.min(W - 1, q.x1), y1: Math.min(H - 1, q.y1) }; return n.x0 > n.x1 || n.y0 > n.y1 ? null : n };
function applyMove(g, s, dx, dy) {
  const n = g.slice(); each(s, (x, y) => n[y * W + x] = null);
  each(s, (x, y) => { const tx = x + dx, ty = y + dy; if (tx >= 0 && ty >= 0 && tx < W && ty < H) n[ty * W + tx] = g[y * W + x] }); return n;
}
function doPaste() {
  const snap = grid.slice(); let i = 0;
  for (let y = 0; y < clip.h; y++) for (let x = 0; x < clip.w; x++, i++) {
    const tx = pp.x + x, ty = pp.y + y; if (tx < W && ty < H) grid[ty * W + tx] = clip.d[i];
  }
  sel = { x0: pp.x, y0: pp.y, x1: Math.min(W - 1, pp.x + clip.w - 1), y1: Math.min(H - 1, pp.y + clip.h - 1) }; push(snap);
}
const ppos = c => pp = { x: clamp(c.x, 0, Math.max(0, W - clip.w)), y: clamp(c.y, 0, Math.max(0, H - clip.h)) };
const fv = () => mode === 'c' ? $('col').value : (tex.has(selTex) && !tex.get(selTex).hidden) ? 't' + selTex : (toast('Select a texture first'), undefined);
const memo = new Map();
function addTex(name, c) {
  const url = c.toDataURL('image/png');
  for (const [id, t] of tex) if (t.url === url) { t.hidden = 0; return id }
  tex.set(++tid, { name, cv: c, url }); return tid;
}
function opaque(t) { if (t.op === undefined) { const D = t.cv.getContext('2d').getImageData(0, 0, S, S).data; t.op = true; for (let i = 3; i < D.length; i += 4) if (D[i] < 255) { t.op = false; break } } return t.op }
function blend(old, v) {
  if (!v || !old || old === v || v[0] === '#') return v;
  const nt = tex.get(+v.slice(1)); if (!nt || opaque(nt)) return v;
  const k = old + '|' + v, m = memo.get(k), mt = m && tex.get(+m.slice(1)); if (mt && !mt.hidden) return m;
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  if (old[0] === '#') { x.fillStyle = old; x.fillRect(0, 0, S, S) } else { const ot = tex.get(+old.slice(1)); ot && x.drawImage(ot.cv, 0, 0) }
  x.drawImage(nt.cv, 0, 0);
  const res = 't' + addTex('composite', c); memo.set(k, res); renderTex(); return res;
}
function paint(c) {
  if (c.x < 0 || c.y < 0 || c.x >= W || c.y >= H) return;
  const i = c.y * W + c.x; if (act.done.has(i)) return; act.done.add(i);
  const v = blend(grid[i], act.val); if (grid[i] !== v) { grid[i] = v; act.dirty = 1 }
}
function cancel() { if (act) { if (act.snap) grid = act.snap; if (act.s) sel = act.s; if (act.t === 'sel') sel = act.prev; act = null; rd() } }

// ---- pointer input ----
const gs = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 });
cv.addEventListener('pointerdown', e => {
  if (!grid) return;
  $('side').classList.remove('open'); $('expm').hidden = true;
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size > 1) { cancel(); G = gs(...[...ptrs.values()]); return }
  if (e.button === 1 || e.button === 2 || space) { act = { t: 'pan', x: e.clientX, y: e.clientY }; return }
  if (e.button > 0) return;
  if (adj) { act = { t: 'bg', x: e.clientX, y: e.clientY }; return }
  const c = cellAt(e);
  if (tool === 'paste') { if (!clip) return; ppos(c); act = { t: 'paste' } }
  else if (!c.ok) return;
  else if (tool === 'pick') sample(e, c);
  else if (tool === 'select') { act = { t: 'sel', a: c, prev: sel }; sel = rect(c, c) }
  else if (tool === 'fill' || tool === 'erase') {
    const v = tool === 'fill' ? fv() : null; if (v === undefined) return;
    const snap = grid.slice();
    if (inR(sel, c.x, c.y)) { each(sel, (x, y) => grid[y * W + x] = blend(grid[y * W + x], v)); push(snap); if (tool === 'erase') sel = null; ui() }
    else { act = { t: 'paint', snap, val: v, last: c, done: new Set() }; paint(c) }
  } else if (tool === 'move') {
    if (!inR(sel, c.x, c.y)) sel = rect(c, c);
    act = { t: 'move', a: c, snap: grid.slice(), s: { ...sel }, dx: 0, dy: 0 };
  }
  rd();
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (p) { p.x = e.clientX; p.y = e.clientY }
  if (p && ptrs.size > 1) {
    const n = gs(...[...ptrs.values()]), r = cv.getBoundingClientRect();
    zoomTo(zf * n.d / G.d, n.x - r.left, n.y - r.top); ox += Math.round(n.x - G.x); oy += Math.round(n.y - G.y); clampPan(); G = n; rd(); return;
  }
  const c = hover = cellAt(e); st();
  if (p && act) {
    if (act.t === 'pan') { ox += e.clientX - act.x; oy += e.clientY - act.y; act.x = e.clientX; act.y = e.clientY; clampPan() }
    else if (act.t === 'bg') { adj.x += (e.clientX - act.x) / z; adj.y += (e.clientY - act.y) / z; act.x = e.clientX; act.y = e.clientY }
    else if (act.t === 'sel') sel = rect(act.a, { x: clamp(c.x, 0, W - 1), y: clamp(c.y, 0, H - 1) });
    else if (act.t === 'paint') {
      const l = act.last || c, n = Math.max(Math.abs(c.x - l.x), Math.abs(c.y - l.y)) || 1;
      for (let i = 1; i <= n; i++) paint({ x: Math.round(l.x + (c.x - l.x) * i / n), y: Math.round(l.y + (c.y - l.y) * i / n) });
      act.last = c;
    } else if (act.t === 'move') {
      const s = act.s; act.dx = c.x - act.a.x; act.dy = c.y - act.a.y;
      grid = applyMove(act.snap, s, act.dx, act.dy);
      sel = { x0: s.x0 + act.dx, y0: s.y0 + act.dy, x1: s.x1 + act.dx, y1: s.y1 + act.dy };
    }
  }
  if (tool === 'paste' && clip && (!p || act)) ppos(c);
  rd();
});
function up(e) {
  ptrs.delete(e.pointerId); if (ptrs.size === 1) G = null;
  const a = act; if (!a) return; act = null;
  if ((a.t === 'paint' && a.dirty) || (a.t === 'move' && (a.dx || a.dy))) push(a.snap);
  if (a.t === 'paste') doPaste();
  if (a.t === 'move' && (a.dx || a.dy)) sel = clipSel(sel);
  ui(); rd();
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', e => { cancel(); ptrs.delete(e.pointerId) });
cv.addEventListener('pointerleave', () => { hover = null; st() });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  e.preventDefault(); const r = cv.getBoundingClientRect();
  if (e.ctrlKey) zoomTo(zf * Math.exp(-e.deltaY * .01), e.clientX - r.left, e.clientY - r.top);
  else { ox -= e.deltaX; oy -= e.deltaY; clampPan(); rd() }
}, { passive: false });
addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]')) return; const k = e.key.toLowerCase(), m = e.ctrlKey || e.metaKey;
  if (adj) { if (k === 'escape') $('bcancel').click(); return }
  if (m && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
  else if (m && k === 'y') { e.preventDefault(); redo() }
  else if (m && k === 'c') $('copy').click();
  else if (m && k === 'v') $('paste').click();
  else if (k === 'escape') { $('expm').hidden = true; cancel(); sel = null; ui(); rd() }
  else if ((k === 'delete' || k === 'backspace') && sel && grid) { const s = grid.slice(); each(sel, (x, y) => grid[y * W + x] = null); push(s); sel = null; ui(); rd() }
  else if (k === ' ' && e.target === document.body) { space = true; e.preventDefault() }
});
addEventListener('keyup', e => { if (e.key === ' ') space = false });
new ResizeObserver(() => { if (grid) { clampPan(); rd() } }).observe($('ws'));

// ---- UI ----
function st() { $('st').textContent = grid ? `${W}×${H} blocks · ${W * S}×${H * S} px (${S} px/block) · ${hover && hover.ok ? `x ${hover.x}, y ${hover.y}` : 'x –, y –'} · ${Math.round(z / S * 100)}%` : '' }
function ui() {
  $('undo').disabled = !U.length || !!adj; $('redo').disabled = !R.length || !!adj;
  $('bga').disabled = !!adj || !grid; $('bga').textContent = bg ? 'Replace Reference Image' : 'Add Reference Image'; $('bgj').disabled = $('bgr').disabled = !bg || !!adj; $('copy').disabled = !sel; $('paste').disabled = !clip; $('rm').disabled = selTex == null;
  document.querySelectorAll('[data-t]').forEach(b => { const on = b.dataset.t === tool; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on) });
  $('mc').classList.toggle('on', mode === 'c'); $('mt').classList.toggle('on', mode === 't');
  $('pal').dataset.m = mode; $('cbar').style.background = $('col').value;
  $('mc').setAttribute('aria-selected', mode === 'c'); $('mt').setAttribute('aria-selected', mode === 't');
  const t = tex.get(selTex), sw = $('sw').style;
  sw.background = mode === 'c' ? $('col').value : t ? `url('${t.url}') center/cover` : 'transparent';
  st();
}
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
  if (b.dataset.t === 'select' && tool === 'select') sel = null;
  tool = b.dataset.t; if (tool === 'paste') sel = null; ui(); rd();
});
$('copy').onclick = () => {
  if (!sel) return; clip = { w: sel.x1 - sel.x0 + 1, h: sel.y1 - sel.y0 + 1, d: [] };
  each(sel, (x, y) => clip.d.push(grid[y * W + x])); sel = null; toast('Copied. Choose Paste, then tap a destination.'); ui(); rd();
};
$('mc').onclick = () => { mode = 'c'; ui() };
$('mt').onclick = () => { mode = 't'; ui() };
$('col').oninput = () => { mode = 'c'; syncHsv(); ui() };
$('pt').onclick = () => $('side').classList.toggle('open');
$('undo').onclick = undo; $('redo').onclick = redo;
$('zi').onclick = () => zoomBy(1.25); $('zo').onclick = () => zoomBy(.8); $('fit').onclick = () => grid && fit();
addEventListener('beforeunload', e => { if (grid && U.length) e.preventDefault() });

// ---- textures ----
function renderTex() {
  const box = $('tx'); box.textContent = '';
  tex.forEach((t, id) => {
    if (t.hidden) return;
    const b = document.createElement('button'), im = new Image();
    im.src = t.url; im.alt = t.name; im.draggable = false; b.className = 'th' + (id === selTex ? ' on' : ''); b.title = t.name;
    b.setAttribute('aria-label', t.name); b.append(im); b.onclick = () => { selTex = id; mode = 't'; renderTex(); ui() }; box.append(b);
  });
}
async function addFiles(files) {
  const bad = [];
  for (const f of files) {
    try {
      if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) throw 'not a PNG, JPG or WebP image';
      const u = URL.createObjectURL(f);
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no('could not be read'); i.src = u }).finally(() => URL.revokeObjectURL(u));
      if (im.naturalWidth !== S || im.naturalHeight !== S) throw `is ${im.naturalWidth}×${im.naturalHeight}px; textures must be exactly ${S}×${S}px for this canvas`;
      const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(im, 0, 0);
      selTex = addTex(f.name, c); mode = 't';
    } catch (x) { bad.push(`${f.name} ${x}`) }
  }
  if (bad.length) toast('Rejected: ' + bad.join('; '), 7000);
  renderTex(); ui(); rd();
}
$('up').onclick = () => $('file').click();
$('file').onchange = e => { addFiles([...e.target.files]); e.target.value = '' };
$('rm').onclick = () => {
  if (selTex == null) return; const k = 't' + selTex, used = grid && grid.includes(k);
  if (used && !confirm('This texture is used by cells on the canvas. Remove it and clear those cells?')) return;
  if (used) { const s = grid.slice(); grid = grid.map(v => v === k ? null : v); push(s) }
  tex.get(selTex).hidden = 1; selTex = null; renderTex(); ui(); rd();
};

// ---- export ----
const menu = $('expm');
$('exp').onclick = () => { menu.hidden = !menu.hidden; menu.style.top = $('exp').getBoundingClientRect().bottom + 4 + 'px' };
menu.onclick = () => menu.hidden = true;
document.addEventListener('pointerdown', e => { if (e.target !== $('exp') && !menu.contains(e.target)) menu.hidden = true }, true);
function dl(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500);
}
function bgUrl() { if (!bg.url) { const c = document.createElement('canvas'); c.width = bg.img.width; c.height = bg.img.height; c.getContext('2d').drawImage(bg.img, 0, 0); bg.url = c.toDataURL('image/png') } return bg.url }
$('png').onclick = () => {
  if (!grid) return; const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const x = c.getContext('2d', { alpha: true });
  if (bg) { x.globalAlpha = bg.o; x.drawImage(bg.img, bg.x * S, bg.y * S, bg.w * S, bg.w * S * bg.img.height / bg.img.width); x.globalAlpha = 1 }
  x.imageSmoothingEnabled = false;
  grid.forEach((v, i) => {
    if (!v) return; const px = i % W * S, py = (i / W | 0) * S;
    if (v[0] === '#') { x.fillStyle = v; x.fillRect(px, py, S, S) } else { const t = tex.get(+v.slice(1)); t && x.drawImage(t.cv, px, py) }
  });
  c.toBlob(b => dl(b, 'blueprint.png'), 'image/png');
};
$('svg').onclick = () => {
  if (!grid) return; const used = new Set(); let b = '', d = '';
  grid.forEach((v, i) => {
    if (!v) return; const x = i % W * S, y = (i / W | 0) * S;
    if (v[0] === '#') b += `<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${v}"/>`;
    else if (tex.has(+v.slice(1))) { used.add(v.slice(1)); b += `<use xlink:href="#t${v.slice(1)}" x="${x}" y="${y}"/>` }
  });
  const bs = bg ? `<image data-role="bg" x="${bg.x * S}" y="${bg.y * S}" width="${bg.w * S}" height="${bg.w * S * bg.img.height / bg.img.width}" opacity="${bg.o}" preserveAspectRatio="none" style="image-rendering:auto" xlink:href="${bgUrl()}"/>` : '';
  used.forEach(k => d += `<image id="t${k}" width="${S}" height="${S}" xlink:href="${tex.get(+k).url}"/>`);
  dl(new Blob([`<svg data-app="mc-blueprint" data-w="${W}" data-h="${H}" data-bpb="${S}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W * S}" height="${H * S}" viewBox="0 0 ${W * S} ${H * S}" shape-rendering="crispEdges" style="image-rendering:pixelated"><defs>${d}</defs>${bs}${b}</svg>`], { type: 'image/svg+xml' }), 'blueprint.svg');
};

// ---- reference image (editor-only tracing layer) ----
const drop = i => i && i.close && i.close();
const fitBg = b => { const ar = b.img.width / b.img.height; b.w = ar >= W / H ? W : H * ar; b.x = (W - b.w) / 2; b.y = (H - b.w / ar) / 2; return b };
function adjOpen() { $('side').classList.remove('open'); document.body.classList.add('adj'); $('adj').hidden = false; $('bo').value = Math.round(adj.o * 100); $('bov').textContent = $('bo').value + '%'; ui(); rd() }
function adjClose() { adj = null; document.body.classList.remove('adj'); $('adj').hidden = true; ui(); rd() }
function scaleBg(f) { const ar = adj.img.width / adj.img.height, cx = adj.x + adj.w / 2, cy = adj.y + adj.w / ar / 2; adj.w = clamp(adj.w * f, .5, 1e4); adj.x = cx - adj.w / 2; adj.y = cy - adj.w / ar / 2; rd() }
$('bga').onclick = () => $('bgf').click();
$('bgf').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !grid || adj) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return toast('Reference image must be PNG, JPG or WebP');
  try { const img = await createImageBitmap(f); adj = fitBg({ img, o: bg ? bg.o : .5 }); adjOpen() } catch { toast('Could not read that image') }
};
$('bgj').onclick = () => { if (bg && !adj) { adj = { ...bg }; adjOpen() } };
$('bgr').onclick = () => { if (bg && !adj) { drop(bg.img); bg = null; ui(); rd() } };
$('bzi').onclick = () => scaleBg(1.15); $('bzo').onclick = () => scaleBg(1 / 1.15);
$('bfit').onclick = () => { fitBg(adj); rd() };
$('bo').oninput = e => { adj.o = e.target.value / 100; $('bov').textContent = e.target.value + '%'; rd() };
$('bdone').onclick = () => { if (bg && adj.img !== bg.img) drop(bg.img); bg = adj; adjClose() };
$('bcancel').onclick = () => { if (!bg || adj.img !== bg.img) drop(adj.img); adjClose() };

// ---- colours: picker tool, project palette, popups ----
const addPc = h => { h = h.toLowerCase(); pcols = [h, ...pcols.filter(c => c !== h)].slice(0, 64) };
function setColour(h) { $('col').value = h; mode = 'c'; addPc(h); syncHsv(); ui() }
const hex2 = (r, g, b) => '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
function sample(e, c) {
  const v = grid[c.y * W + c.x]; if (!v) return;
  if (v[0] === '#') return setColour(v);
  const t = tex.get(+v.slice(1)); if (!t) return;
  const b = cv.getBoundingClientRect(), px = clamp(Math.floor(((e.clientX - b.left - ox) / z - c.x) * S), 0, S - 1), py = clamp(Math.floor(((e.clientY - b.top - oy) / z - c.y) * S), 0, S - 1);
  const D = t.cv.getContext('2d').getImageData(0, 0, S, S).data; let best = -1, bd = 1e9;
  for (let i = 0; i < S * S; i++) { if (D[i * 4 + 3] < 128) continue; const dx = i % S - px, dy = (i / S | 0) - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i } }
  if (best < 0) return toast('That texture has no visible pixels to sample');
  setColour(hex2(D[best * 4], D[best * 4 + 1], D[best * 4 + 2]));
}
function hex2hsv(h) {
  const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let H = 0;
  if (d) { H = (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 }
  return [Math.round(H) % 360, Math.round(mx ? d / mx * 100 : 0), Math.round(mx * 100)];
}
function hsv2hex(h, s, v) {
  s /= 100; v /= 100; const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) };
  return hex2(...[5, 3, 1].map(n => Math.round(f(n) * 255)));
}
const DEF = ['#ffffff', '#000000', '#e53935', '#43a047', '#1e88e5', '#fdd835', '#8e24aa', '#6d4c41'];
function palette() {
  const cnt = {}; if (grid) for (const v of grid) if (v && v[0] === '#') cnt[v] = (cnt[v] || 0) + 1;
  const all = [...new Set([$('col').value, ...pcols, ...Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])].map(c => c.toLowerCase()))];
  const dist = (a, b) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16); return Math.hypot((p >> 16) - (q >> 16), (p >> 8 & 255) - (q >> 8 & 255), (p & 255) - (q & 255)) };
  const pool = [...all, ...DEF.filter(c => !all.includes(c))], pick = [];
  for (const c of pool) if (pick.length < 6 && pick.every(p => dist(p, c) > 40)) pick.push(c);
  for (const c of pool) if (pick.length < 6 && !pick.includes(c)) pick.push(c);
  return { pick, all };
}
function swatch(h) {
  const b = document.createElement('button'); b.className = 'cs' + (h === $('col').value ? ' on' : ''); b.style.background = h; b.title = h; b.setAttribute('aria-label', h);
  b.onclick = () => { setColour(h); $('cpd').close() }; return b;
}
function openCp() { const { pick, all } = palette(); $('sug').replaceChildren(...pick.map(swatch)); $('allc').replaceChildren(...all.map(swatch)); $('allw').hidden = all.length <= 6; $('cpd').showModal() }
const outs = () => { $('oh').value = $('sh').value + '°'; $('os').value = $('ss').value + '%'; $('ov').value = $('sv').value + '%' };
function syncHsv() { const [h, s, v] = hex2hsv($('col').value); $('sh').value = h; $('ss').value = s; $('sv').value = v; outs() }
let h0 = '#000000';
['sh', 'ss', 'sv'].forEach(id => $(id).oninput = () => { $('col').value = hsv2hex(+$('sh').value, +$('ss').value, +$('sv').value); mode = 'c'; outs(); ui() });
$('cbar').onclick = openCp;
$('cust').onclick = () => { h0 = $('col').value; $('cpd').close(); syncHsv(); $('hsvd').showModal() };
$('hback').onclick = () => { $('col').value = h0; syncHsv(); ui(); $('hsvd').close(); openCp() };
$('happ').onclick = () => { addPc($('col').value); $('hsvd').close(); ui() };
for (const d of [$('cpd'), $('hsvd')]) d.addEventListener('click', e => {
  const b = d.getBoundingClientRect(); if (e.target === d && (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)) d.close();
});
syncHsv();

// ---- SVG project import (parsed as inert XML; never inserted into the page) ----
const ld = href => new Promise((ok, no) => {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(href)) return no();
  const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = href;
});
const hrefOf = el => el.getAttribute('xlink:href') || el.getAttribute('href') || '';
async function importSvg(f) {
  const say = m => { $('err').textContent = m; toast(m, 6000) };
  try {
    const doc = new DOMParser().parseFromString(await f.text(), 'image/svg+xml'), svg = doc.documentElement;
    if (doc.querySelector('parsererror') || svg.localName !== 'svg') return say('Import failed: not a valid SVG file.');
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const wp = parseFloat(svg.getAttribute('width')) || vb[2], hp = parseFloat(svg.getAttribute('height')) || vb[3];
    let R = +svg.getAttribute('data-bpb');
    if (!R) { R = +prompt('This SVG has no project metadata. How many pixels per block (1–256)?', S); if (!R) return }
    const w = Math.round(wp / R), h = Math.round(hp / R);
    if (!(w >= 1 && h >= 1 && w <= 512 && h <= 512 && Number.isInteger(R) && R >= 1 && R <= 256 && w * R <= 16384 && h * R <= 16384)) return say('Import failed: the SVG size does not match a supported block grid.');
    if (grid && grid.some(Boolean) && !confirm('Importing replaces the current design. Continue?')) return;
    if (R !== S && tex.size && !confirm(`Uploaded textures are ${S}×${S}px and will be removed when switching to ${R}px. Continue?`)) return;
    dlg.close(); create(w, h, R);
    let skipped = 0; const map = {}, known = new Set(['svg', 'defs', 'rect', 'use', 'image', 'title', 'desc', 'metadata']);
    for (const el of svg.querySelectorAll('*')) if (!known.has(el.localName)) skipped++;
    for (const im of svg.querySelectorAll('defs > image')) {
      const id = im.getAttribute('id');
      try {
        const img = await ld(hrefOf(im)); if (!id || img.naturalWidth !== R || img.naturalHeight !== R) throw 0;
        const c = document.createElement('canvas'); c.width = c.height = R; c.getContext('2d').drawImage(img, 0, 0); map['#' + id] = 't' + addTex('imported-' + id, c);
      } catch { skipped++ }
    }
    for (const el of svg.querySelectorAll('rect, use')) {
      const x = parseFloat(el.getAttribute('x')) / R, y = parseFloat(el.getAttribute('y')) / R; let v = null;
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < w && y < h) {
        if (el.localName === 'rect') { const c = (el.getAttribute('fill') || '').toLowerCase(); if (/^#[0-9a-f]{6}$/.test(c) && +el.getAttribute('width') === R && +el.getAttribute('height') === R) v = c }
        else v = map[hrefOf(el)];
      }
      if (v) { grid[y * W + x] = v; if (v[0] === '#') addPc(v) } else skipped++;
    }
    const bi = svg.querySelector('image[data-role="bg"]');
    if (bi) try {
      const o = parseFloat(bi.getAttribute('opacity')), ww = parseFloat(bi.getAttribute('width')) / R;
      bg = { img: await createImageBitmap(await ld(hrefOf(bi))), x: parseFloat(bi.getAttribute('x')) / R, y: parseFloat(bi.getAttribute('y')) / R, w: ww, o: isFinite(o) ? clamp(o, 0, 1) : 1 };
      if (!(ww > 0) || !isFinite(bg.x + bg.y)) throw 0;
    } catch { bg = null; skipped++ }
    renderTex(); ui(); rd(); toast(skipped ? `Imported. ${skipped} unrecognised item(s) were ignored.` : 'SVG project imported.', skipped ? 6000 : 2500);
  } catch (x) { say('Import failed: ' + ((x && x.message) || 'unreadable file.')) }
}
$('imp').onclick = () => $('impf').click();
$('impf').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importSvg(f) };

// ---- create-canvas dialog ----
const info = () => { const r = +$('r').value || 0; $('px').textContent = `Export size: ${(+$('w').value || 0) * r} × ${(+$('h').value || 0) * r} px`; $('err').textContent = '' };
$('w').oninput = $('h').oninput = $('r').oninput = info;
$('new').onclick = () => { $('cancel').hidden = !grid; $('r').value = S; info(); dlg.showModal() };
$('cancel').onclick = () => dlg.close();
dlg.addEventListener('click', e => {
  const b = dlg.getBoundingClientRect();
  if (grid && e.target === dlg && (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)) dlg.close();
});
dlg.addEventListener('cancel', e => { if (!grid) e.preventDefault() });
$('f').onsubmit = e => {
  e.preventDefault(); const w = +$('w').value, h = +$('h').value, r = +$('r').value, ok = Number.isInteger;
  if (!ok(w) || !ok(h) || w < 1 || h < 1 || w > 512 || h > 512) { $('err').textContent = 'Width and height must be whole numbers from 1 to 512.'; return }
  if (!ok(r) || r < 1 || r > 256) { $('adv').open = true; $('err').textContent = 'Pixels per block must be a whole number from 1 to 256.'; return }
  if (w * r > 16384 || h * r > 16384) { $('err').textContent = `Export would be ${w * r}×${h * r} px; the maximum is 16384 px per side.`; return }
  if (grid && grid.some(Boolean) && !confirm('Discard the current design and create a new canvas?')) return;
  if (r !== S && tex.size && !confirm(`Uploaded textures are ${S}×${S}px and will be removed when the resolution changes to ${r}px. Continue?`)) return;
  if (w * r * h * r > 16777216 && !confirm(`${w * r}×${h * r}px export may fail on some devices, especially mobile browsers. Continue?`)) return;
  if (w * h > 16384 && !confirm(`${w}×${h} blocks is large and may be slow. Continue?`)) return;
  dlg.close(); create(w, h, r);
};
info(); dlg.showModal(); ui();
