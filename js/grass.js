// Газон: фототекстура + крупные пятна цвета (без повторяемости) + 3D-травинки у площадки
import * as THREE from 'three';
import { normalFromHeight, rnd, rr } from './textures.js';

// подготовка фототекстуры: чуть приглушаем «кислотный» зелёный, считаем карту нормалей
export function grassTextures(img, maxSize = 2048) {
  const S = Math.min(maxSize, img.width);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, S, S);
  const im = g.getImageData(0, 0, S, S), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2], l = 0.3 * r + 0.59 * gg + 0.11 * b;
    d[i] = Math.min(255, (r * 0.72 + l * 0.28) * 1.1);
    d[i + 1] = Math.min(255, (gg * 0.72 + l * 0.28) * 0.97);
    d[i + 2] = Math.min(255, (b * 0.72 + l * 0.28) * 0.9);
  }
  g.putImageData(im, 0, 0);
  const h = document.createElement('canvas'); h.width = h.height = S;
  const hg = h.getContext('2d'); hg.filter = 'grayscale(1) contrast(1.4)'; hg.drawImage(c, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(normalFromHeight(h, 3, true)); normalMap.colorSpace = THREE.NoColorSpace;
  for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; }
  return { map, normalMap };
}

// крупномасштабные пятна: светлее/желтее/темнее — убирают «сплошное зелёное поле»
export function lawnColorAt(x, z) {
  const n = Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2.1) * 0.45 + Math.sin(z * 0.17 + Math.cos(x * 0.09) * 2.7) * 0.4
    + Math.sin((x - z) * 0.47 + 1.3) * 0.22 + Math.sin((x * 0.8 + z) * 1.1) * 0.08;
  const v = Math.max(0, Math.min(1, n * 0.5 + 0.5));
  const dry = new THREE.Color(1.12, 1.04, 0.78), lush = new THREE.Color(0.86, 0.94, 0.86), dark = new THREE.Color(0.74, 0.8, 0.7);
  return v < 0.5 ? dark.clone().lerp(lush, v * 2) : lush.clone().lerp(dry, (v - 0.5) * 2);
}

// 3D-травинки (стриженый газон 4–9 см) в зонах zones: [{ test(x,z), x0,x1,z0,z1 }]
export function grassBlades(zones, density = 900) {
  const pos = [], nor = [], col = [], idx = [];
  let v = 0;
  const base = new THREE.Color(), tip = new THREE.Color();
  for (const zn of zones) {
    const area = (zn.x1 - zn.x0) * (zn.z1 - zn.z0);
    const n = Math.round(area * density);
    for (let i = 0; i < n; i++) {
      const x = rr(zn.x0, zn.x1), z = rr(zn.z0, zn.z1);
      if (!zn.test(x, z)) continue;
      if (zn.weight && rnd() > zn.weight(x, z)) continue;
      const h = rr(0.035, 0.085), w = rr(0.0035, 0.006), yaw = rnd() * Math.PI * 2, bend = rr(0.01, 0.035);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const bx = -sy * bend, bz = cy * bend; // направление изгиба — перпендикулярно плоскости травинки
      const pts = [[-w, 0, 0], [w, 0, 0], [-w * 0.6, h * 0.55, 0.35], [w * 0.6, h * 0.55, 0.35], [0, h, 1]];
      const lc = lawnColorAt(x, z);
      const k = rr(0.75, 1.15);
      base.setRGB(0.06 * k * lc.r, 0.1 * k * lc.g, 0.028 * k * lc.b);
      tip.setRGB(0.25 * k * lc.r, 0.36 * k * lc.g, 0.095 * k * lc.b);
      if (rnd() < 0.08) tip.setRGB(0.32 * lc.r, 0.3 * lc.g, 0.12 * lc.b); // сухие травинки
      for (const [px, py, t] of pts) {
        pos.push(x + px * cy + bx * t * t, py, z + px * sy + bz * t * t);
        nor.push(-sy * 0.6, 0.8, cy * 0.6);
        const c = base.clone().lerp(tip, py / h);
        col.push(c.r, c.g, c.b, 1);
      }
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2, v + 2, v + 3, v + 4);
      v += 5;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(v * 2), 2));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.65, side: THREE.DoubleSide }));
  m.castShadow = false; m.receiveShadow = true; m.userData.keep = true;
  return m;
}
