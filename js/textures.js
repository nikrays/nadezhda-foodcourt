// Процедурные текстуры (canvas): плитка, газон, перфорированная панель с надписью, дерево, еда
import * as THREE from 'three';

let seed = 12345;
export function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
export const rr = (a, b) => a + (b - a) * rnd();

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function tex(c, { srgb = true, repeat = null, aniso = 16 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.generateMipmaps = true;
  return t;
}

// карта нормалей из карты высот (canvas, светлое = выше)
export function normalFromHeight(hc, strength = 2, wrap = false) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h); const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h); const d = img.data;
  const H = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); }
    return src[(y * w + x) * 4] / 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
    const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    let nx = -dx, ny = dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function noiseFill(ctx, w, h, amount, scale = 1) {
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount * scale;
    d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function speckle(ctx, w, h, count, colors, rmin, rmax, alpha = 0.35) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * rnd();
    ctx.fillStyle = colors[(rnd() * colors.length) | 0];
    ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, rr(rmin, rmax), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- Плитка полукругом («circle kit»): концентрические кольца ----------
// Холст покрывает прямоугольник x∈[-R,R], y∈[0,R] (план), 1 px = R*2/W м
export function circleTiles(R = 5.2, W = 4096) {
  const H = W / 2, s = W / (2 * R);
  const col = canvas(W, H), hgt = canvas(W, H), rough = canvas(W, H);
  const c = col.getContext('2d'), h = hgt.getContext('2d'), r = rough.getContext('2d');
  c.fillStyle = '#6f6a63'; c.fillRect(0, 0, W, H);
  h.fillStyle = '#000'; h.fillRect(0, 0, W, H);
  r.fillStyle = '#d0d0d0'; r.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H; // центр полукруга — середина нижнего края холста (диаметр)
  const palette = ['#bdb5a8', '#b1a99c', '#c6beb0', '#a59d91', '#b8ab96', '#aaa293', '#c0b39f', '#9f978b'];
  const joint = 0.006 * s;
  // центральный круг
  const r0 = 0.30;
  c.fillStyle = '#a8a092'; c.beginPath(); c.arc(cx, cy, r0 * s - joint, Math.PI, 2 * Math.PI); c.fill();
  h.fillStyle = '#fff'; h.beginPath(); h.arc(cx, cy, r0 * s - joint, Math.PI, 2 * Math.PI); h.fill();
  let rin = r0, ring = 0;
  while (rin < R) {
    const rw = 0.12; const rout = Math.min(R, rin + rw);
    const circ = Math.PI * (rin + rout) / 2;
    const n = Math.max(3, Math.round(circ / rr(0.17, 0.2)));
    const off = rnd();
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI + Math.PI * (k + (ring % 2 ? 0.5 : 0) * 0 + 0) / n;
      const a1 = Math.PI + Math.PI * (k + 1) / n;
      const da = joint / (rin * s + 1);
      const path = (ctx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, rout * s - joint, a0 + da, a1 - da);
        ctx.arc(cx, cy, rin * s + joint, a1 - da, a0 + da, true);
        ctx.closePath();
      };
      c.fillStyle = palette[(rnd() * palette.length) | 0]; path(c); c.fill();
      h.fillStyle = '#fff'; path(h); h.fill();
      const rv = 170 + rnd() * 50; r.fillStyle = `rgb(${rv},${rv},${rv})`; path(r); r.fill();
    }
    rin = rout; ring++;
  }
  void 0;
  speckle(c, W, H, 60000, ['#7d776e', '#d8d0c2', '#5e5952'], 0.5, 1.6, 0.25);
  noiseFill(c, W, H, 14);
  h.filter = 'blur(1.2px)'; h.drawImage(hgt, 0, 0); h.filter = 'none';
  return { map: tex(col), normalMap: tex(normalFromHeight(hgt, 1.6), { srgb: false }), roughnessMap: tex(rough, { srgb: false }) };
}

// ---------- Прямоугольная брусчатка (площадка для гостей) ----------
export function pavers(sizeM = 4, W = 2048) {
  const s = W / sizeM;
  const col = canvas(W, W), hgt = canvas(W, W), rough = canvas(W, W);
  const c = col.getContext('2d'), h = hgt.getContext('2d'), r = rough.getContext('2d');
  c.fillStyle = '#5c5b58'; c.fillRect(0, 0, W, W); h.fillStyle = '#000'; h.fillRect(0, 0, W, W);
  r.fillStyle = '#ddd'; r.fillRect(0, 0, W, W);
  const pw = 0.2, ph = 0.1, j = 0.004 * s;
  const palette = ['#9a9893', '#8d8b86', '#a3a19b', '#85837e', '#96928a', '#a09a90'];
  const rows = Math.round(sizeM / ph), cols = Math.round(sizeM / pw);
  for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
    const ox = (y % 2) * pw / 2;
    const px = (x * pw + ox) * s, py = y * ph * s;
    c.fillStyle = palette[(rnd() * palette.length) | 0];
    c.fillRect(px + j, py + j, pw * s - 2 * j, ph * s - 2 * j);
    h.fillStyle = '#fff'; h.fillRect(px + j, py + j, pw * s - 2 * j, ph * s - 2 * j);
    const rv = 185 + rnd() * 50; r.fillStyle = `rgb(${rv},${rv},${rv})`; r.fillRect(px + j, py + j, pw * s - 2 * j, ph * s - 2 * j);
  }
  speckle(c, W, W, 30000, ['#6b6a66', '#c4c1ba', '#4d4c49'], 0.5, 1.5, 0.25);
  noiseFill(c, W, W, 12);
  h.filter = 'blur(1px)'; h.drawImage(hgt, 0, 0); h.filter = 'none';
  return { map: tex(col), normalMap: tex(normalFromHeight(hgt, 1.4, true), { srgb: false }), roughnessMap: tex(rough, { srgb: false }) };
}

// ---------- Газон ----------
export function grass(W = 1024) {
  const col = canvas(W, W), c = col.getContext('2d');
  c.fillStyle = '#4f6e2c'; c.fillRect(0, 0, W, W);
  const greens = ['#5b7d31', '#46652a', '#6a8a3a', '#3e5a24', '#738f40', '#567532', '#7a9445'];
  for (let i = 0; i < 90000; i++) {
    const x = rnd() * W, y = rnd() * W, l = rr(3, 9), a = rr(-0.6, 0.6);
    c.strokeStyle = greens[(rnd() * greens.length) | 0]; c.globalAlpha = rr(0.3, 0.9); c.lineWidth = rr(0.8, 1.8);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); c.stroke();
    // бесшовность
    if (x < 10 || y < 10) { c.beginPath(); c.moveTo(x + W, y + W); c.lineTo(x + W + Math.sin(a) * l, y + W - Math.cos(a) * l); c.stroke(); }
  }
  c.globalAlpha = 1;
  const hgt = canvas(W, W), h = hgt.getContext('2d');
  h.drawImage(col, 0, 0); h.filter = 'grayscale(1)'; h.drawImage(hgt, 0, 0); h.filter = 'none';
  return { map: tex(col), normalMap: tex(normalFromHeight(hgt, 3, true), { srgb: false }) };
}

// ---------- Дерево (светлый дуб, как у мобильного ограждения) ----------
export function oak(W = 1024, H = 256, base = '#c99a5e') {
  const col = canvas(W, H), c = col.getContext('2d');
  c.fillStyle = base; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const y = rnd() * H; const amp = rr(1, 6), f = rr(0.002, 0.012), ph = rnd() * 6;
    c.strokeStyle = rnd() < 0.5 ? '#a8783f' : '#d9b07a'; c.globalAlpha = rr(0.15, 0.5); c.lineWidth = rr(0.6, 2.2);
    c.beginPath();
    for (let x = 0; x <= W; x += 8) { const yy = y + Math.sin(x * f + ph) * amp; x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
    c.stroke();
  }
  // дубовые «поры»
  for (let i = 0; i < 2500; i++) { c.globalAlpha = rr(0.2, 0.55); c.fillStyle = '#7a5226'; c.fillRect(rnd() * W, rnd() * H, rr(4, 14), 1); }
  c.globalAlpha = 1;
  return tex(col, { repeat: [1, 1] });
}

// ---------- Перфорированная панель «САНАТОРИЙ НАДЕЖДА» ----------
// Плетёный узор из прорезей (как на образце «Соль-кафе»), в центре — вырезанная надпись.
export function perforatedPanel(wM, hM, text, font, pxPerM = 2400) {
  const W = Math.round(wM * pxPerM), H = Math.round(hM * pxPerM);
  const col = canvas(W, H), met = canvas(W, H), rough = canvas(W, H), hgt = canvas(W, H);
  const c = col.getContext('2d'), m = met.getContext('2d'), r = rough.getContext('2d'), h = hgt.getContext('2d');
  const steel = '#c9ccce';
  c.fillStyle = steel; c.fillRect(0, 0, W, H);
  // шлифовка (горизонтальные штрихи)
  for (let i = 0; i < 9000; i++) {
    c.globalAlpha = rr(0.03, 0.09); c.fillStyle = rnd() < 0.5 ? '#ffffff' : '#9a9da0';
    c.fillRect(rnd() * W, rnd() * H, rr(40, 400), 1);
  }
  c.globalAlpha = 1;
  m.fillStyle = '#fff'; m.fillRect(0, 0, W, H); // металл
  r.fillStyle = '#707070'; r.fillRect(0, 0, W, H);
  h.fillStyle = '#fff'; h.fillRect(0, 0, W, H);

  const cell = 0.046 * pxPerM;      // размер ячейки узора
  const margin = 0.07 * pxPerM;     // глухое поле по краю
  const slotL = cell * 0.78, slotW = cell * 0.11, nSlots = 4;
  // зона надписи
  const textH = 0.105 * pxPerM;
  c.font = `${font.weight} ${textH}px ${font.family}`;
  const tw = c.measureText(text).width;
  const tx0 = W / 2 - tw / 2 - cell * 0.9, tx1 = W / 2 + tw / 2 + cell * 0.9;
  const ty0 = H / 2 - textH * 0.85, ty1 = H / 2 + textH * 0.85;

  const cols = Math.floor((W - 2 * margin) / cell), rows = Math.floor((H - 2 * margin) / cell);
  const ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2;
  const hole = (ctx, color) => { ctx.fillStyle = color; };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = ox + i * cell, y0 = oy + j * cell;
    if (x0 + cell > tx0 && x0 < tx1 && y0 + cell > ty0 && y0 < ty1) continue; // пропуск под надпись
    const horiz = (i + j) % 2 === 0;
    for (let k = 0; k < nSlots; k++) {
      const t = (k + 0.5) / nSlots;
      let x, y, w, hh;
      if (horiz) { w = slotL; hh = slotW; x = x0 + (cell - slotL) / 2; y = y0 + t * cell - slotW / 2; }
      else { w = slotW; hh = slotL; x = x0 + t * cell - slotW / 2; y = y0 + (cell - slotL) / 2; }
      const rad = slotW / 2;
      for (const [ctx, colr] of [[c, '#151617'], [m, '#000'], [r, '#e0e0e0'], [h, '#000']]) {
        hole(ctx, colr); ctx.beginPath(); ctx.roundRect(x, y, w, hh, rad); ctx.fill();
      }
    }
  }
  // надпись — тоже прорезь
  for (const [ctx, colr] of [[c, '#151617'], [m, '#000'], [r, '#e0e0e0'], [h, '#000']]) {
    ctx.font = `${font.weight} ${textH}px ${font.family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = colr; ctx.fillText(text, W / 2, H / 2 + textH * 0.04);
  }
  h.filter = 'blur(1px)'; h.drawImage(hgt, 0, 0); h.filter = 'none';
  return {
    map: tex(col), metalnessMap: tex(met, { srgb: false }), roughnessMap: tex(rough, { srgb: false }),
    normalMap: tex(normalFromHeight(hgt, 2.5), { srgb: false }),
  };
}

// ---------- Мелкие текстуры: жареное мясо, угли, рис ----------
export function meatTex(W = 256) {
  const col = canvas(W, W), c = col.getContext('2d');
  c.fillStyle = '#7a3b1c'; c.fillRect(0, 0, W, W);
  speckle(c, W, W, 900, ['#4a200c', '#a35a2a', '#2e1407', '#b8703a'], 2, 9, 0.6);
  noiseFill(c, W, W, 30);
  return tex(col);
}
export function coalTex(W = 512) {
  const col = canvas(W, W), em = canvas(W, W);
  const c = col.getContext('2d'), e = em.getContext('2d');
  c.fillStyle = '#1a1714'; c.fillRect(0, 0, W, W); e.fillStyle = '#000'; e.fillRect(0, 0, W, W);
  speckle(c, W, W, 1600, ['#3a3530', '#0d0b0a', '#6b6560', '#2a2622'], 3, 14, 0.8);
  for (let i = 0; i < 700; i++) {
    const x = rnd() * W, y = rnd() * W, rad = rr(2, 10);
    const g = e.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rnd() < 0.5 ? '#ffb347' : '#ff6a1a'); g.addColorStop(1, 'rgba(0,0,0,0)');
    e.globalAlpha = rr(0.3, 1); e.fillStyle = g; e.beginPath(); e.arc(x, y, rad, 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
  return { map: tex(col), emissiveMap: tex(em) };
}
export function riceTex(W = 512) {
  const col = canvas(W, W), c = col.getContext('2d');
  c.fillStyle = '#d9a63a'; c.fillRect(0, 0, W, W);
  for (let i = 0; i < 9000; i++) {
    c.save(); c.translate(rnd() * W, rnd() * W); c.rotate(rnd() * Math.PI);
    c.fillStyle = ['#f0c45a', '#e2ad3e', '#c98f2a', '#f6d27a'][(rnd() * 4) | 0]; c.globalAlpha = 0.8;
    c.beginPath(); c.ellipse(0, 0, 3.2, 1.3, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  c.globalAlpha = 1;
  speckle(c, W, W, 400, ['#8a4a12', '#6b3a0d'], 1, 4, 0.5); // поджарка
  return tex(col);
}

// ---------- Плиты из «мытого» бетона (открытый заполнитель) — как на дорожках санатория ----------
export function aggregateSlabs(sizeM = 3, slab = 0.5, W = 2048) {
  const s = W / sizeM;
  const col = canvas(W, W), hgt = canvas(W, W), rough = canvas(W, W);
  const c = col.getContext('2d'), h = hgt.getContext('2d'), r = rough.getContext('2d');
  c.fillStyle = '#8f877b'; c.fillRect(0, 0, W, W); h.fillStyle = '#000'; h.fillRect(0, 0, W, W); r.fillStyle = '#e8e8e8'; r.fillRect(0, 0, W, W);
  const n = Math.round(sizeM / slab), j = 0.005 * s;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const px = x * slab * s + j, py = y * slab * s + j, w = slab * s - 2 * j;
    const tone = rr(-10, 10);
    c.fillStyle = `rgb(${183 + tone},${173 + tone},${157 + tone})`; c.fillRect(px, py, w, w);
    h.fillStyle = '#fff'; h.fillRect(px, py, w, w);
    r.fillStyle = '#d8d8d8'; r.fillRect(px, py, w, w);
  }
  // заполнитель: окатанная галька разных оттенков
  const peb = ['#d8cdb8', '#a39684', '#7d7366', '#e9e2d4', '#b8a58a', '#6a6157', '#c9b79b', '#f2ede3'];
  for (let i = 0; i < 260000; i++) {
    const x = rnd() * W, y = rnd() * W, rad = rr(1.2, 3.6);
    c.fillStyle = peb[(rnd() * peb.length) | 0]; c.globalAlpha = rr(0.55, 1);
    c.beginPath(); c.ellipse(x, y, rad, rad * rr(0.6, 1), rnd() * 3, 0, Math.PI * 2); c.fill();
    if (i % 3 === 0) { h.fillStyle = 'rgba(255,255,255,0.9)'; h.beginPath(); h.arc(x, y, rad * 0.8, 0, Math.PI * 2); h.fill(); }
  }
  c.globalAlpha = 1;
  // швы снова поверх гальки
  c.fillStyle = '#5f594f'; h.fillStyle = '#000';
  for (let k = 0; k <= n; k++) { const p = k * slab * s; for (const ctx of [c, h]) { ctx.fillRect(p - j, 0, 2 * j, W); ctx.fillRect(0, p - j, W, 2 * j); } }
  const hb = canvas(W, W), hbc = hb.getContext('2d'); hbc.fillStyle = '#000'; hbc.fillRect(0, 0, W, W); hbc.filter = 'blur(0.8px)'; hbc.drawImage(hgt, 0, 0);
  return { map: tex(col), normalMap: tex(normalFromHeight(hb, 2.2, true), { srgb: false }), roughnessMap: tex(rough, { srgb: false }) };
}
