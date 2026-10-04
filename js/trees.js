// Процедурные лиственные деревья (ветки + карточки с листвой) для паркового окружения
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, rr } from './textures.js';

function leafCardTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const greens = ['#4f7a2a', '#5d8a33', '#3f6a24', '#6b9a3c', '#466f27', '#77a548', '#355b1f'];
  // веточки
  g.strokeStyle = '#4a3a2a'; g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(S / 2, S * 0.95); g.quadraticCurveTo(rr(0.3, 0.7) * S, S * 0.6, rr(0.1, 0.9) * S, rr(0.1, 0.4) * S); g.stroke(); }
  for (let i = 0; i < 70; i++) {
    const x = rr(0.12, 0.88) * S, y = rr(0.08, 0.85) * S;
    if (Math.hypot(x - S / 2, (y - S / 2) * 1.1) > S * 0.43) continue;
    const L = rr(38, 62), Wd = L * rr(0.45, 0.6), a = rnd() * Math.PI * 2;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = greens[(rnd() * greens.length) | 0];
    g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -Wd, L / 2, 0); g.quadraticCurveTo(0, Wd, -L / 2, 0); g.fill();
    g.strokeStyle = 'rgba(30,50,15,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function barkTexture() {
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#5a5047'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) { g.fillStyle = rnd() < 0.5 ? '#3d352e' : '#7a6e62'; g.globalAlpha = rr(0.2, 0.6); g.fillRect(rnd() * W, rnd() * H, rr(2, 8), rr(20, 90)); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let leafMat = null, barkMat = null;
export function makeTree({ height = 9, crown = 3.2, trunkR = 0.18, seed = 1 } = {}) {
  if (!leafMat) {
    leafMat = new THREE.MeshPhysicalMaterial({ map: leafCardTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, transparent: false });
    barkMat = new THREE.MeshPhysicalMaterial({ map: barkTexture(), roughness: 0.9 });
  }
  for (let i = 0; i < seed; i++) rnd();
  const branches = [], cards = [];
  const up = new THREE.Vector3(0, 1, 0);
  const trunkTop = rr(2.0, 2.8);
  const crownV = (height - trunkTop) / 2;
  const crownC = new THREE.Vector3(0, trunkTop + crownV, 0);

  function cyl(a, b, r0, r1) {
    const len = a.distanceTo(b); const geo = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true);
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)); geo.applyMatrix4(m); branches.push(geo);
  }
  function leaves(p, n, spread) {
    for (let i = 0; i < n; i++) {
      const s = rr(0.7, 1.15);
      const geo = new THREE.PlaneGeometry(s, s);
      const pos = p.clone().add(new THREE.Vector3(rr(-1, 1), rr(-0.8, 1), rr(-1, 1)).multiplyScalar(spread));
      // карточки — только внутри эллипсоида кроны
      const d = pos.clone().sub(crownC); d.y *= crown / crownV;
      if (d.length() > crown * 1.05 || pos.y < trunkTop + 0.6) continue;
      const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI)), new THREE.Vector3(1, 1, 1));
      geo.applyMatrix4(m); cards.push(geo);
    }
  }
  function grow(a, dir, len, r, depth) {
    const b = a.clone().add(dir.clone().multiplyScalar(len));
    cyl(a, b, r, r * 0.68);
    if (depth === 0) { leaves(b, 20, 0.85); return; }
    const kids = depth > 2 ? 4 : 3;
    for (let i = 0; i < kids; i++) {
      const toCrown = crownC.clone().add(new THREE.Vector3(rr(-1, 1) * crown, rr(-0.6, 1) * crownV, rr(-1, 1) * crown)).sub(b).normalize();
      const nd = dir.clone().multiplyScalar(0.45).add(toCrown.multiplyScalar(0.55)).add(new THREE.Vector3(rr(-0.35, 0.35), rr(-0.1, 0.25), rr(-0.35, 0.35))).normalize();
      grow(b, nd, len * rr(0.62, 0.78), r * 0.62, depth - 1);
    }
    if (depth <= 2) leaves(b, 6, 0.9);
  }
  const base = new THREE.Vector3(0, 0, 0), top = new THREE.Vector3(rr(-0.15, 0.15), trunkTop, rr(-0.15, 0.15));
  cyl(base, top, trunkR * 1.25, trunkR);
  grow(top, new THREE.Vector3(0, 1, 0), crownV * 0.55, trunkR * 0.95, 4);

  const tree = new THREE.Group();
  const bm = new THREE.Mesh(mergeGeometries(branches), barkMat); bm.castShadow = bm.receiveShadow = true;
  const lm = new THREE.Mesh(mergeGeometries(cards), leafMat); lm.castShadow = lm.receiveShadow = true;
  tree.add(bm, lm);
  return tree;
}
