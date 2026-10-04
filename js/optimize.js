// Оптимизация: тысячи мелких статичных мешей сливаются в один меш на материал (меньше draw calls → выше FPS).
// Группы из списка separate (люди, ограждение) сливаются отдельно, чтобы их можно было скрывать.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function mergeInto(src, target, skip) {
  const groups = new Map(), victims = [];
  src.traverse(o => {
    if (!o.isMesh || !o.visible || o.userData.keep || Array.isArray(o.material) || skip(o)) return;
    const g = o.geometry;
    if (Object.keys(g.attributes).sort().join() !== 'normal,position,uv') return;
    const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}`;
    if (!groups.has(key)) groups.set(key, { material: o.material, cast: o.castShadow, geos: [] });
    const geo = g.index ? g.toNonIndexed() : g.clone();
    geo.applyMatrix4(o.matrixWorld);
    if (o.matrixWorld.determinant() < 0) {
      const p = geo.attributes.position.array, n = geo.attributes.normal.array, u = geo.attributes.uv.array;
      for (let i = 0; i < p.length; i += 9) for (const arr of [p, n]) for (let k = 0; k < 3; k++) { const a = i + 3 + k, b = i + 6 + k; [arr[a], arr[b]] = [arr[b], arr[a]]; }
      for (let i = 0; i < u.length; i += 6) for (let k = 0; k < 2; k++) { const a = i + 2 + k, b = i + 4 + k; [u[a], u[b]] = [u[b], u[a]]; }
    }
    groups.get(key).geos.push(geo);
    victims.push(o);
  });
  victims.forEach(o => o.removeFromParent());
  for (const { material, cast, geos } of groups.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), material); m.castShadow = cast; m.receiveShadow = true;
    geos.forEach(g => g.dispose());
    target.add(m);
  }
  return victims.length;
}

export function mergeStatic(root, separate = []) {
  root.updateMatrixWorld(true);
  const sepGroups = separate.map(n => root.getObjectByName(n)).filter(Boolean);
  let before = 0;
  for (const g of sepGroups) {
    const out = new THREE.Group(); out.name = g.name;
    before += mergeInto(g, out, () => false);
    g.parent.add(out); g.removeFromParent();
  }
  const out = new THREE.Group(); out.name = 'merged';
  before += mergeInto(root, out, o => { let p = o; while (p) { if (separate.includes(p.name)) return true; p = p.parent; } return false; });
  root.add(out);
  const empty = []; root.traverse(o => { if (o.isGroup && o !== root && o.children.length === 0) empty.push(o); });
  empty.forEach(o => o.removeFromParent());
  let after = 0; root.traverse(o => { if (o.isMesh) after++; });
  return { before, after };
}
