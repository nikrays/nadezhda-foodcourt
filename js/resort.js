// Окружение по фото территории санатория «Надежда» (Анапа, ул. Калинина, 30):
// корпуса 6–7 этажей — кремовые фасады, терракотово-розовые пилястры, сплошные балконы, синяя мансарда с белыми фронтонами;
// голубые ели, колонновидные туи, можжевельники, клумбы с петуниями; открытый бассейн с деревянным настилом, бело-синие зонты.
import * as THREE from 'three';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
// слияние разнотипных геометрий (индексированных и нет)
const mergeGeometries = (geos) => mergeRaw(geos.map(g => g.index ? g.toNonIndexed() : g));
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { normalFromHeight, rnd, rr } from './textures.js';

const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
function B(w, h, d, m, r = 0) { return mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), m); }
function at(o, x, y, z, p) { o.position.set(x, y, z); p.add(o); return o; }

// ---------- хвоя: карточки с иголками ----------
function needleCard(cols, density = 1) {
  const S = 256, c = cnv(S, S), g = c.getContext('2d');
  for (let k = 0; k < 7 * density; k++) {
    const x0 = rr(0.15, 0.85) * S, y0 = rr(0.15, 0.85) * S, ang = rr(0, 6.28), L = rr(60, 120);
    for (let i = 0; i < 70; i++) {
      const t = rnd(), px = x0 + Math.cos(ang) * L * (t - 0.5), py = y0 + Math.sin(ang) * L * (t - 0.5);
      const a = ang + (rnd() < 0.5 ? 1 : -1) * rr(0.5, 1.2), l = rr(8, 18);
      g.strokeStyle = cols[(rnd() * cols.length) | 0]; g.lineWidth = rr(1.2, 2.4);
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
    }
  }
  return tex(c);
}
let MAT = null;
function mats() {
  if (MAT) return MAT;
  MAT = {
    spruce: new THREE.MeshPhysicalMaterial({ map: needleCard(['#4d6b70', '#5d7c80', '#3e5a60', '#6f8d8f', '#345056'], 1.6), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }),
    thuja: new THREE.MeshPhysicalMaterial({ map: needleCard(['#2f4f22', '#3c5f2a', '#26421c', '#4b6e31'], 1.5), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }),
    juniper: new THREE.MeshPhysicalMaterial({ map: needleCard(['#5f7f4f', '#71905c', '#4d6b41', '#839e6a'], 1.4), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }),
    coreDark: new THREE.MeshPhysicalMaterial({ color: '#22311f', roughness: 0.95 }),
    coreBlue: new THREE.MeshPhysicalMaterial({ color: '#26383b', roughness: 0.95 }),
    bark: new THREE.MeshPhysicalMaterial({ color: '#4a3a2e', roughness: 0.95 }),
  };
  return MAT;
}
function cards(n, place, size = [0.5, 0.9]) {
  const geos = [];
  for (let i = 0; i < n; i++) {
    const s = rr(...size), g = new THREE.PlaneGeometry(s, s);
    const [p, q] = place(i);
    g.applyMatrix4(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1))); geos.push(g);
  }
  return mergeGeometries(geos);
}
const randQ = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28));

// голубая ель — ярусный конус
export function makeSpruce(h = 8, seed = 1) {
  for (let i = 0; i < seed; i++) rnd();
  const M = mats(), g = new THREE.Group(), R0 = h * 0.24;
  at(mesh(new THREE.CylinderGeometry(0.06, 0.16, h * 0.95, 8), M.bark), 0, h * 0.475, 0, g);
  const core = mesh(new THREE.ConeGeometry(R0 * 0.82, h * 0.88, 14, 1), M.coreBlue); core.position.y = 0.4 + h * 0.44; g.add(core);
  g.add(mesh(cards(Math.round(h * 230), () => {
    const t = Math.pow(rnd(), 0.8), y = 0.4 + t * (h - 0.4), r = R0 * (1 - t) * rr(0.75, 1.05) + 0.1;
    const a = rnd() * 6.28, droop = (1 - t) * 0.25;
    return [new THREE.Vector3(Math.cos(a) * r, y - droop, Math.sin(a) * r), randQ()];
  }, [0.45, 0.85]), M.spruce));
  return g;
}
// туя колонновидная
export function makeThuja(h = 4, seed = 1) {
  for (let i = 0; i < seed; i++) rnd();
  const M = mats(), g = new THREE.Group(), R0 = h * 0.16;
  const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(R0 * Math.sin(Math.PI * Math.pow(t, 0.75)) * (t < 0.15 ? 0.8 : 1) * 0.85, t * h)); }
  const core = mesh(new THREE.LatheGeometry(prof, 14), M.coreDark); g.add(core);
  g.add(mesh(cards(Math.round(h * 140), () => {
    const t = rnd(), y = t * h, r = R0 * Math.sin(Math.PI * Math.pow(t, 0.75)) * rr(0.8, 1.05);
    const a = rnd() * 6.28; return [new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), randQ()];
  }, [0.3, 0.55]), M.thuja));
  return g;
}
// можжевельник — низкая подушка
export function makeJuniper(w = 2, seed = 1) {
  for (let i = 0; i < seed; i++) rnd();
  const M = mats(), g = new THREE.Group();
  const core = mesh(new THREE.SphereGeometry(w * 0.45, 16, 10, 0, 6.28, 0, Math.PI / 2), M.coreDark); core.scale.set(1, 0.5, 0.8); g.add(core);
  g.add(mesh(cards(Math.round(w * w * 60), () => {
    const a = rnd() * 6.28, r = Math.sqrt(rnd()) * w * 0.5, y = (1 - (r / (w * 0.5)) ** 2) * w * 0.25 + rr(0, 0.12);
    return [new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.8), randQ()];
  }, [0.35, 0.6]), M.juniper));
  return g;
}

// ---------- корпус санатория ----------
function facadeTexture(bays, floors) {
  const bw = 96, fh = 72, W = bays * bw, H = floors * fh;
  const c = cnv(W, H), g = c.getContext('2d');
  g.fillStyle = '#efe2c8'; g.fillRect(0, 0, W, H);                // кремовая штукатурка
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x = b * bw, y = H - (f + 1) * fh;
    // окно-дверь на балкон
    g.fillStyle = '#3b4a56'; g.fillRect(x + 18, y + 12, bw - 36, fh - 18);
    g.fillStyle = 'rgba(190,215,230,0.35)'; g.fillRect(x + 20, y + 14, (bw - 40) / 2 - 2, fh - 22);
    g.fillStyle = '#f7f3ea'; g.fillRect(x + bw / 2 - 2, y + 12, 4, fh - 18);
  }
  // терракотово-розовые пилястры между секциями
  g.fillStyle = '#c98472';
  for (let b = 0; b <= bays; b += 2) g.fillRect(b * bw - 7, 0, 14, H);
  for (let i = 0; i < 6000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'; g.fillRect(rnd() * W, rnd() * H, rr(2, 8), rr(2, 8)); }
  return tex(c);
}
export function makeBuilding({ length = 60, depth = 14, floors = 6, bay = 3.3, fh = 3.1, seed = 1 } = {}) {
  for (let i = 0; i < seed; i++) rnd();
  const g = new THREE.Group();
  const bays = Math.round(length / bay), L = bays * bay, H = floors * fh;
  const fac = facadeTexture(bays, floors);
  const wall = new THREE.MeshPhysicalMaterial({ map: fac, roughness: 0.85 });
  const side = new THREE.MeshPhysicalMaterial({ color: '#efe2c8', roughness: 0.9 });
  const body = mesh(new THREE.BoxGeometry(L, H, depth), side); body.position.y = H / 2; g.add(body);
  // фасады отдельными плоскостями (один материал на меш — так требует path tracer)
  for (const sgn of [1, -1]) { const f = mesh(new THREE.PlaneGeometry(L, H), wall); f.position.set(0, H / 2, sgn * (depth / 2 + 0.01)); if (sgn < 0) f.rotation.y = Math.PI; g.add(f); }
  // цоколь
  at(B(L + 0.2, 0.8, depth + 0.2, new THREE.MeshPhysicalMaterial({ color: '#b9a38a', roughness: 0.9 })), 0, 0.4, 0, g);
  // сплошные балконы по фасадам: плита + стеклянное/металлическое ограждение
  const slab = new THREE.MeshPhysicalMaterial({ color: '#f6f1e7', roughness: 0.8 });
  const rail = new THREE.MeshPhysicalMaterial({ color: '#9fb4bf', roughness: 0.15, metalness: 0.2, transparent: false, opacity: 1 });
  const geosS = [], geosR = [];
  for (const s of [1, -1]) for (let f = 1; f < floors; f++) {
    const y = f * fh;
    const a = new THREE.BoxGeometry(L, 0.18, 1.3); a.translate(0, y, s * (depth / 2 + 0.65)); geosS.push(a);
    const r = new THREE.BoxGeometry(L, 1.0, 0.05); r.translate(0, y + 0.6, s * (depth / 2 + 1.28)); geosR.push(r);
  }
  // пилястры поверх балконов (выступают)
  const pil = new THREE.MeshPhysicalMaterial({ color: '#c98472', roughness: 0.85 });
  const geosP = [];
  for (const s of [1, -1]) for (let b = 0; b <= bays; b += 2) { const p = new THREE.BoxGeometry(0.45, H, 1.45); p.translate(-L / 2 + b * bay, H / 2, s * (depth / 2 + 0.7)); geosP.push(p); }
  g.add(mesh(mergeGeometries(geosS), slab), mesh(mergeGeometries(geosR), rail), mesh(mergeGeometries(geosP), pil));
  // мансарда: синяя металлическая кровля и белые фронтоны
  const blue = new THREE.MeshPhysicalMaterial({ color: '#2457b5', roughness: 0.35, metalness: 0.4 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#f7f5ef', roughness: 0.7 });
  const roofH = 3.6, inset = 1.6;
  const shape = new THREE.Shape(); shape.moveTo(-depth / 2 - 0.4, 0); shape.lineTo(depth / 2 + 0.4, 0); shape.lineTo(depth / 2 - inset, roofH); shape.lineTo(-depth / 2 + inset, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: L + 0.8, bevelEnabled: false }); roofGeo.translate(0, 0, -(L + 0.8) / 2); roofGeo.rotateY(Math.PI / 2);
  const roof = mesh(roofGeo, blue); roof.position.y = H; g.add(roof);
  // фронтоны-слуховые окна
  const pedGeos = [], winGeos = [];
  const tri = new THREE.Shape(); tri.moveTo(-1.3, 0); tri.lineTo(1.3, 0); tri.lineTo(0, 1.4); tri.closePath();
  for (const s of [1, -1]) for (let b = 1; b < bays; b += 2) {
    const x = -L / 2 + b * bay, z = s * (depth / 2 - 0.4);
    const box = new THREE.BoxGeometry(2.6, 1.9, 1.6); box.translate(x, H + 0.95 + 0.4, z); pedGeos.push(box);
    const p = new THREE.ExtrudeGeometry(tri, { depth: 1.6, bevelEnabled: false }); p.translate(0, 0, -0.8); p.translate(x, H + 2.25, z); pedGeos.push(p);
    const w = new THREE.BoxGeometry(1.3, 1.3, 0.05); w.translate(x, H + 1.35, z + s * 0.81); winGeos.push(w);
  }
  g.add(mesh(mergeGeometries(pedGeos), white), mesh(mergeGeometries(winGeos), new THREE.MeshPhysicalMaterial({ color: '#2f3d48', roughness: 0.1 })));
  return g;
}

// ---------- столовая ----------
function canteenTexture(L, H) {
  const sc = 40, W = Math.round(L * sc), Hh = Math.round(H * sc), c = cnv(W, Hh), g = c.getContext('2d');
  g.fillStyle = '#f3efe6'; g.fillRect(0, 0, W, Hh);
  for (const [y0, y1] of [[1.3, 3.2], [4.6, 6.6]]) {
    const a = Hh - y1 * sc, b = Hh - y0 * sc;
    g.fillStyle = '#2f3f4b'; g.fillRect(0, a, W, b - a);
    g.fillStyle = 'rgba(170,205,225,0.35)'; g.fillRect(0, a, W, (b - a) * 0.45);
    g.fillStyle = '#e9e6df'; for (let x = 0; x < W; x += 1.5 * sc) g.fillRect(x, a, 4, b - a);
  }
  g.fillStyle = '#9b3a2e'; g.fillRect(0, Hh - 0.8 * sc, W, 0.8 * sc);
  return tex(c);
}
export function makeCanteen({ length = 44, depth = 18, h = 7.6 } = {}) {
  const g = new THREE.Group();
  const front = new THREE.MeshPhysicalMaterial({ map: canteenTexture(length, h), roughness: 0.6 });
  const plain = new THREE.MeshPhysicalMaterial({ color: '#f3efe6', roughness: 0.85 });
  const body = mesh(new THREE.BoxGeometry(length, h, depth), plain); body.position.y = h / 2; g.add(body);
  for (const sgn of [1, -1]) { const f = mesh(new THREE.PlaneGeometry(length, h), front); f.position.set(0, h / 2, sgn * (depth / 2 + 0.01)); if (sgn < 0) f.rotation.y = Math.PI; g.add(f); }
  at(B(length + 0.6, 0.5, depth + 0.6, new THREE.MeshPhysicalMaterial({ color: '#e6e1d6', roughness: 0.8 })), 0, h + 0.25, 0, g);
  // синий навес у входа
  at(B(8, 0.25, 2.4, new THREE.MeshPhysicalMaterial({ color: '#2457b5', roughness: 0.4, metalness: 0.3 })), 0, 3.6, -depth / 2 - 1.2, g);
  return g;
}

// ---------- бассейн ----------
function poolTiles() {
  const S = 512, c = cnv(S, S), g = c.getContext('2d');
  g.fillStyle = '#5fb7cf'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 16) { g.fillStyle = ['#5ab3cc', '#66bdd4', '#52a9c3', '#6cc2d8'][(rnd() * 4) | 0]; g.fillRect(x + 1, y + 1, 14, 14); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function waterNormal() {
  const S = 512, h = cnv(S, S), g = h.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const w = Array.from({ length: 10 }, () => ({ kx: Math.round(rr(-6, 6)), ky: Math.round(rr(-6, 6)) || 3, a: rr(0.3, 1), ph: rnd() * 6.28 }));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let v = 0; for (const q of w) v += q.a * Math.sin((q.kx * x + q.ky * y) / S * 6.283 + q.ph); const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = 128 + v * 25; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = tex(normalFromHeight(h, 1, true), false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function deckTexture() {
  const W = 1024, H = 256, c = cnv(W, H), g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = ['#5a3f2c', '#634631', '#523a29', '#6b4c35'][(rnd() * 4) | 0]; g.fillRect(0, i * 32, W, 30); g.fillStyle = '#2b1f17'; g.fillRect(0, i * 32 + 30, W, 2); }
  for (let i = 0; i < 1500; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,180,0.06)'; g.fillRect(rnd() * W, rnd() * H, rr(20, 120), 1); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function stripeTexture() {
  const c = cnv(512, 64), g = c.getContext('2d');
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f5f4ef' : '#1f4e9c'; g.fillRect(i * 32, 0, 32, 64); }
  return tex(c);
}
export function makePool({ w = 32, d = 20, deck = 4, lite = false } = {}) {
  const g = new THREE.Group();
  const deckT = deckTexture(); deckT.repeat.set((w + 2 * deck) / 4, (d + 2 * deck) / 1);
  const deckM = new THREE.MeshPhysicalMaterial({ map: deckT, roughness: 0.7 });
  const W2 = w / 2, D2 = d / 2, depth = 1.4, top = 0.12;
  // настил (рамка вокруг чаши)
  at(B(w + 2 * deck, top, deck, deckM), 0, top / 2, -D2 - deck / 2, g);
  at(B(w + 2 * deck, top, deck, deckM), 0, top / 2, D2 + deck / 2, g);
  at(B(deck, top, d, deckM), -W2 - deck / 2, top / 2, 0, g);
  at(B(deck, top, d, deckM), W2 + deck / 2, top / 2, 0, g);
  // бортик
  const coping = new THREE.MeshPhysicalMaterial({ color: '#f1efe9', roughness: 0.5 });
  at(B(w + 0.6, 0.1, 0.3, coping, 0.02), 0, top + 0.03, -D2 - 0.15, g); at(B(w + 0.6, 0.1, 0.3, coping, 0.02), 0, top + 0.03, D2 + 0.15, g);
  at(B(0.3, 0.1, d, coping, 0.02), -W2 - 0.15, top + 0.03, 0, g); at(B(0.3, 0.1, d, coping, 0.02), W2 + 0.15, top + 0.03, 0, g);
  // чаша
  const tilesT = poolTiles(); tilesT.repeat.set(w / 2, d / 2);
  const tileM = new THREE.MeshPhysicalMaterial({ map: tilesT, roughness: 0.25 });
  at(B(w, 0.05, d, tileM), 0, top - depth, 0, g);
  for (const s of [1, -1]) { at(B(w, depth, 0.05, tileM), 0, top - depth / 2, s * D2, g); at(B(0.05, depth, d, tileM), s * W2, top - depth / 2, 0, g); }
  // вода
  const wn = waterNormal(); wn.repeat.set(w / 6, d / 6);
  const waterM = lite
    ? new THREE.MeshPhysicalMaterial({ color: '#47b3cb', roughness: 0.04, clearcoat: 1, normalMap: wn, normalScale: new THREE.Vector2(0.25, 0.25) })
    : new THREE.MeshPhysicalMaterial({ color: '#7fd0e0', roughness: 0.03, transmission: 0.85, thickness: 1.2, ior: 1.33, attenuationColor: new THREE.Color('#2aa3c2'), attenuationDistance: 2.5, normalMap: wn, normalScale: new THREE.Vector2(0.25, 0.25) });
  const water = mesh(new THREE.PlaneGeometry(w, d), waterM, false);
  water.rotation.x = -Math.PI / 2; water.position.y = top - 0.12; water.userData.keep = true; g.add(water);
  // шезлонги и зонты (бело-синие)
  const frame = new THREE.MeshPhysicalMaterial({ color: '#f4f2ec', roughness: 0.4 });
  const cushion = new THREE.MeshPhysicalMaterial({ color: '#e4d7bd', roughness: 0.95 });
  const stripe = new THREE.MeshPhysicalMaterial({ map: stripeTexture(), roughness: 0.85, side: THREE.DoubleSide });
  const lounger = () => {
    const l = new THREE.Group();
    at(B(0.7, 0.06, 1.95, frame, 0.02), 0, 0.32, 0, l);
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.85, 0.85]) at(B(0.05, 0.3, 0.05, frame), sx, 0.15, sz, l);
    at(B(0.64, 0.07, 1.3, cushion, 0.03), 0, 0.39, 0.3, l);
    const back = B(0.64, 0.07, 0.7, cushion, 0.03); back.position.set(0, 0.6, -0.6); back.rotation.x = 0.75; l.add(back);
    return l;
  };
  const umbrella = () => {
    const u = new THREE.Group();
    at(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 10), frame), 0, 1.2, 0, u);
    const canopy = mesh(new THREE.ConeGeometry(1.4, 0.45, 16, 1, true), stripe); canopy.position.y = 2.35; u.add(canopy);
    at(mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.08, 16), frame), 0, 0.04, 0, u);
    return u;
  };
  for (let i = 0; i < 7; i++) {
    const x = -W2 + 2 + i * (w - 4) / 6;
    const l1 = lounger(); l1.position.set(x - 0.45, top, -D2 - deck / 2); l1.rotation.y = Math.PI; g.add(l1);
    const l2 = lounger(); l2.position.set(x + 0.45, top, -D2 - deck / 2); l2.rotation.y = Math.PI; g.add(l2);
    if (i % 2 === 0) { const u = umbrella(); u.position.set(x, top, -D2 - deck / 2 - 1.2); g.add(u); }
  }
  // белая балюстрада по дальнему краю
  const bal = new THREE.MeshPhysicalMaterial({ color: '#f5f3ee', roughness: 0.6 });
  const balGeos = [];
  const zB = -D2 - deck + 0.15;
  { const r = new THREE.BoxGeometry(w + 2 * deck, 0.12, 0.25); r.translate(0, top + 0.95, zB); balGeos.push(r); const b2 = new THREE.BoxGeometry(w + 2 * deck, 0.12, 0.25); b2.translate(0, top + 0.12, zB); balGeos.push(b2); }
  for (let x = -W2 - deck + 0.3; x < W2 + deck; x += 0.32) { const p = new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.04, 0.15], [0.075, 0.45], [0.035, 0.7], [0.05, 0.78], [0, 0.78]].map(([a, b]) => new THREE.Vector2(a, b)), 10); p.translate(x, top + 0.18, zB); balGeos.push(p); }
  g.add(mesh(mergeGeometries(balGeos), bal));
  return g;
}

// ---------- клумба с петуниями ----------
export function makeFlowerBed(w = 3, d = 1, seed = 1) {
  for (let i = 0; i < seed; i++) rnd();
  const g = new THREE.Group();
  at(B(w, 0.35, d, new THREE.MeshPhysicalMaterial({ color: '#d9d2c4', roughness: 0.8 }), 0.03), 0, 0.175, 0, g);
  at(B(w - 0.12, 0.05, d - 0.12, new THREE.MeshPhysicalMaterial({ color: '#3b2a1e', roughness: 1 })), 0, 0.33, 0, g);
  const leaf = new THREE.MeshPhysicalMaterial({ color: '#3f6b2a', roughness: 0.7 });
  const cols = ['#c2185b', '#8e24aa', '#f5f5f5', '#e53950', '#d81b60', '#7b1fa2'].map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6 }));
  const lg = [], fl = cols.map(() => []);
  for (let i = 0; i < w * d * 70; i++) {
    const x = rr(-w / 2 + 0.1, w / 2 - 0.1), z = rr(-d / 2 + 0.1, d / 2 - 0.1);
    const s = new THREE.IcosahedronGeometry(rr(0.05, 0.09), 0); s.scale(1, 0.6, 1); s.translate(x, 0.4, z); lg.push(s);
    if (rnd() < 0.8) { const f = new THREE.CircleGeometry(rr(0.03, 0.045), 6); f.rotateX(-Math.PI / 2 + rr(-0.5, 0.5)); f.translate(x + rr(-0.04, 0.04), 0.45 + rr(0, 0.04), z + rr(-0.04, 0.04)); fl[(rnd() * cols.length) | 0].push(f); }
  }
  g.add(mesh(mergeGeometries(lg), leaf));
  fl.forEach((arr, i) => { if (arr.length) g.add(mesh(mergeGeometries(arr), cols[i], false)); });
  return g;
}

// ---------- сборка территории вокруг фудкорта ----------
export const POOL = { x: 30, z: 6, w: 32, d: 20, deck: 4 }; // повернут на 90°: длинная сторона вдоль Z
export const POOL_HOLE = { x0: POOL.x - POOL.d / 2 - 0.3, x1: POOL.x + POOL.d / 2 + 0.3, z0: POOL.z - POOL.w / 2 - 0.3, z1: POOL.z + POOL.w / 2 + 0.3 };
export function buildResort(root, { quality = 'high' } = {}) {
  const grp = new THREE.Group(); grp.name = 'trees'; root.add(grp);
  const env = new THREE.Group(); env.name = 'resort'; root.add(env);
  // корпус за кухней (фон за раздачей — ели и туи, за ними корпус)
  const b1 = makeBuilding({ length: 66, floors: 6, seed: 2 }); b1.position.set(-6, 0, -52); env.add(b1);
  // корпус слева, под углом
  const b2 = makeBuilding({ length: 46, floors: 7, seed: 5 }); b2.position.set(-40, 0, -4); b2.rotation.y = Math.PI / 2; env.add(b2);
  // столовая: 2 этажа, ленточное остекление, красный цоколь — за площадкой гостей
  const cant = makeCanteen({ length: 44, depth: 18 }); cant.position.set(-6, 0, 36); env.add(cant);
  // бассейн справа от площадки гостей
  const pool = makePool({ w: POOL.w, d: POOL.d, deck: POOL.deck, lite: quality === 'mobile' }); pool.position.set(POOL.x, 0, POOL.z); pool.rotation.y = Math.PI / 2; env.add(pool);
  // хвойные за дугой кухни и по бокам
  let s = 1;
  const spruces = [[-9, -10, 9], [-3.5, -13, 10], [3, -12.5, 8.5], [9.5, -10.5, 9.5], [-15, -8, 8], [15.5, -9, 8.5], [-20, -15, 10], [0, -20, 11], [19, -17, 9.5], [-12, -22, 9], [11, -24, 10]];
  for (const [x, z, h] of spruces) { const t = makeSpruce(h, s++); t.position.set(x + rr(-0.5, 0.5), 0, z + rr(-0.5, 0.5)); grp.add(t); }
  const thujas = [[-6.8, -8.2], [-1.2, -9.4], [1.6, -9.2], [6.6, -8.4], [-12, -4.5], [12.5, -5], [-12.5, 2], [12.8, 1.5], [-12.5, 8], [-12.8, 11]];
  for (const [x, z] of thujas) { const t = makeThuja(rr(3.2, 4.5), s++); t.position.set(x, 0, z); grp.add(t); }
  const junipers = [[-8.5, -6.8, 2.2], [-4.2, -8.4, 2], [4.4, -8.3, 2.1], [8.6, -6.6, 2.3], [-10.5, -1.2, 1.8], [10.8, -1.5, 1.9]];
  for (const [x, z, w] of junipers) { const t = makeJuniper(w, s++); t.position.set(x, 0, z); grp.add(t); }
  // клумбы вдоль площадки гостей
  for (const [x, z, ry] of [[-9.5, 4, Math.PI / 2], [-9.5, 9, Math.PI / 2], [9.5, 9, Math.PI / 2], [-4, 11.6, 0], [4, 11.6, 0]]) { const f = makeFlowerBed(3, 0.9, s++); f.position.set(x, 0, z); f.rotation.y = ry; env.add(f); }
  return grp;
}
