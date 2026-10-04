// Приморское окружение Анапы: море, песчаный пляж, сосны (пицундская/крымская)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { normalFromHeight, rnd, rr } from './textures.js';

function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// --- вода: карта нормалей из суммы волн (бесшовная) ---
export function seaMaterial() {
  const S = 1024, h = cnv(S, S), g = h.getContext('2d');
  const img = g.createImageData(S, S), d = img.data;
  const waves = Array.from({ length: 14 }, () => ({ kx: Math.round(rr(-9, 9)), ky: Math.round(rr(2, 12)), a: rr(0.3, 1) / (1 + Math.random()), ph: rnd() * 6.28 }));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0; for (const w of waves) v += w.a * Math.sin((w.kx * x + w.ky * y) / S * Math.PI * 2 + w.ph);
    const c = 128 + v * 30; const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const n = new THREE.CanvasTexture(normalFromHeight(h, 1.2, true)); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.colorSpace = THREE.NoColorSpace;
  n.repeat.set(220, 220);
  return new THREE.MeshPhysicalMaterial({ color: '#0d4250', roughness: 0.06, metalness: 0, normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1, clearcoatRoughness: 0.02 });
}

// --- песок ---
export function sandMaterial(repeat = 60) {
  const S = 1024, c = cnv(S, S), g = c.getContext('2d');
  g.fillStyle = '#d9c7a1'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 160000; i++) {
    g.fillStyle = ['#cdb88f', '#e6d6b4', '#bfa982', '#efe2c6', '#a8916b'][(rnd() * 5) | 0];
    g.globalAlpha = rr(0.2, 0.7); g.fillRect(rnd() * S, rnd() * S, rr(0.8, 2.4), rr(0.8, 2.4));
  }
  // рябь от ветра
  g.globalAlpha = 0.08; g.strokeStyle = '#8f7a55'; g.lineWidth = 3;
  for (let y = 0; y < S; y += 22) { g.beginPath(); for (let x = 0; x <= S; x += 16) { const yy = y + Math.sin(x * 0.02 + y) * 6; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
  g.globalAlpha = 1;
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const h = cnv(S, S); const hg = h.getContext('2d'); hg.filter = 'grayscale(1) contrast(1.6)'; hg.drawImage(c, 0, 0);
  const nm = new THREE.CanvasTexture(normalFromHeight(h, 1.5, true)); nm.colorSpace = THREE.NoColorSpace;
  for (const t of [map, nm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 16; }
  return new THREE.MeshPhysicalMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95 });
}

// --- приморская сосна: голый рыжеватый ствол, раскидистая неровная крона из «лап» хвои ---
let needleMat = null, pineBark = null;
function needleTexture() {
  const S = 512, c = cnv(S, S), g = c.getContext('2d');
  const cols = ['#2f4a24', '#3b5a2b', '#24391c', '#4a6a33', '#355228'];
  for (let k = 0; k < 9; k++) {
    const x0 = rr(0.2, 0.8) * S, y0 = rr(0.25, 0.85) * S, ang = rr(-2.6, -0.5), L = rr(120, 220);
    g.strokeStyle = '#4a3527'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L); g.stroke();
    for (let i = 0; i < 160; i++) {
      const t = rnd(), px = x0 + Math.cos(ang) * L * t, py = y0 + Math.sin(ang) * L * t;
      const a = ang + rr(-1.4, 1.4), l = rr(18, 40);
      g.strokeStyle = cols[(rnd() * cols.length) | 0]; g.lineWidth = rr(1, 2.2);
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function barkTex() {
  const W = 256, H = 512, c = cnv(W, H), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, H, 0, 0); grd.addColorStop(0, '#5a4636'); grd.addColorStop(1, '#a0623e');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 600; i++) { g.fillStyle = rnd() < 0.5 ? '#3a2c22' : '#b77a52'; g.globalAlpha = rr(0.15, 0.5); g.fillRect(rnd() * W, rnd() * H, rr(8, 30), rr(4, 14)); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function makePine({ height = 14, seed = 1 } = {}) {
  if (!needleMat) {
    needleMat = new THREE.MeshPhysicalMaterial({ map: needleTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
    pineBark = new THREE.MeshPhysicalMaterial({ map: barkTex(), roughness: 0.9 });
  }
  for (let i = 0; i < seed; i++) rnd();
  const up = new THREE.Vector3(0, 1, 0), parts = [], cards = [];
  const cyl = (a, b, r0, r1) => {
    const geo = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 8, 1, true);
    geo.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1)));
    parts.push(geo);
  };
  const cluster = (p, n, sp) => {
    for (let i = 0; i < n; i++) {
      const s = rr(0.8, 1.4), geo = new THREE.PlaneGeometry(s, s);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-1.9, -1.2), rnd() * 6.28, rr(-0.5, 0.5)));
      geo.applyMatrix4(new THREE.Matrix4().compose(p.clone().add(new THREE.Vector3(rr(-1, 1) * sp, rr(-0.3, 0.4) * sp, rr(-1, 1) * sp)), q, new THREE.Vector3(1, 1, 1)));
      cards.push(geo);
    }
  };
  // ствол с лёгким изгибом
  const lean = new THREE.Vector3(rr(-0.25, 0.25), 1, rr(-0.25, 0.25)).normalize();
  let a = new THREE.Vector3(), r = 0.22 * height / 14;
  const crownStart = height * rr(0.55, 0.65);
  for (let i = 0; i < 6; i++) {
    const b = a.clone().add(lean.clone().multiplyScalar(crownStart / 6)).add(new THREE.Vector3(rr(-0.15, 0.15), 0, rr(-0.15, 0.15)));
    cyl(a, b, r, r * 0.93); a = b; r *= 0.93;
  }
  // ветви кроны — раскидистые, почти горизонтальные
  const nb = 7 + ((rnd() * 4) | 0);
  for (let i = 0; i < nb; i++) {
    const ang = i / nb * 6.28 + rr(-0.3, 0.3), y = rr(0, height - crownStart - 1.5);
    const base = a.clone().add(new THREE.Vector3(0, y, 0)), len = rr(2.2, 4.2) * height / 14;
    const dir = new THREE.Vector3(Math.cos(ang), rr(0.25, 0.7), Math.sin(ang)).normalize();
    const mid = base.clone().add(dir.clone().multiplyScalar(len * 0.6)), tip = base.clone().add(dir.clone().multiplyScalar(len)).add(new THREE.Vector3(0, rr(0.3, 0.9), 0));
    cyl(base, mid, r * 0.55, r * 0.35); cyl(mid, tip, r * 0.35, r * 0.18);
    cluster(tip, 20, 1.1); cluster(mid, 9, 0.9);
  }
  cluster(a.clone().add(new THREE.Vector3(0, height - crownStart, 0)), 26, 1.4);
  const tree = new THREE.Group();
  const t1 = new THREE.Mesh(mergeGeometries(parts), pineBark); t1.castShadow = t1.receiveShadow = true;
  const t2 = new THREE.Mesh(mergeGeometries(cards), needleMat); t2.castShadow = t2.receiveShadow = true;
  tree.add(t1, t2);
  return tree;
}
