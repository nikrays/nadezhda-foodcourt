// Окружение вокруг фудкорта: приморский парк Анапы (сосны, песчаный пляж, море) или обычный парк
import * as THREE from 'three';
import { seaMaterial, sandMaterial, makePine } from './coast.js';
import { makeTree } from './trees.js';
import { rr } from './textures.js';

// неровная кромка газона/пляжа (z по x)
export const COAST = {
  landEdge: (x) => -24 + Math.sin(x * 0.11) * 2.2 + Math.sin(x * 0.37 + 1.3) * 0.8,
  waterEdge: (x) => -58 + Math.sin(x * 0.05 + 0.4) * 1.5 + Math.sin(x * 0.21) * 0.6,
};

export function buildCoast(root, { quality = 'high' } = {}) {
  const grp = new THREE.Group(); grp.name = 'trees'; root.add(grp);
  // песок: от кромки газона до воды, за линией воды уходит под воду
  const sandGeo = new THREE.PlaneGeometry(400, 80, 400, 80);
  const p = sandGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = -p.getY(i) - 40; // центр полосы z = -40
    let y = -0.012;
    const w = COAST.waterEdge(x);
    if (z < w) y = -0.012 - Math.min(0.5, (w - z) * 0.05);   // уходит в воду
    if (z > COAST.landEdge(x) + 2) y = -0.1;                  // под газоном
    // лёгкие дюны у кромки газона
    const d = z - (COAST.landEdge(x) - 6); if (d > -6 && d < 6) y += Math.max(0, Math.cos(d / 6 * Math.PI / 2)) * 0.35 * (0.6 + 0.4 * Math.sin(x * 0.3));
    p.setZ(i, y);
  }
  sandGeo.computeVertexNormals();
  const sand = new THREE.Mesh(sandGeo, sandMaterial(140)); sand.rotation.x = -Math.PI / 2; sand.position.z = -40; sand.receiveShadow = true;
  sand.userData.keep = true; root.add(sand);
  // мокрый песок у воды
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(400, 5), new THREE.MeshPhysicalMaterial({ color: '#a88f69', roughness: 0.35 }));
  wet.rotation.x = -Math.PI / 2; wet.position.set(0, -0.03, -57); wet.receiveShadow = true; wet.userData.keep = true; root.add(wet);
  // море до горизонта
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 3000), seaMaterial());
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.04, -58 - 1500); sea.receiveShadow = true; sea.userData.keep = true; root.add(sea);

  // сосны: группы по бокам и вдоль пляжа, за кухней — «окно» на море
  const pines = [];
  const add = (x, z, h, s) => { const t = makePine({ height: h, seed: s }); t.position.set(x, 0, z); t.rotation.y = s * 1.7; grp.add(t); pines.push(t); };
  let s = 1;
  for (const [x, z] of [[-11, -6], [-14, -11], [-9, -14], [-17, -3], [-20, 6], [-15, 12], [-24, -12], [-28, 2], [-12, 20],
                        [11, -7], [15, -12], [19, -4], [22, 7], [17, 15], [26, -14], [30, 3], [13, 22],
                        [-5, -19], [6, -20], [-30, -20], [32, -20], [-38, 10], [40, 12]]) add(x + rr(-0.8, 0.8), z + rr(-0.8, 0.8), rr(11, 16), s++);
  // пара лиственных деревьев для разнообразия
  for (const [x, z, h, c, sd] of [[-22, 18, 9, 3.4, 5], [24, 20, 9.5, 3.6, 8]]) { const t = makeTree({ height: h, crown: c, seed: sd }); t.position.set(x, 0, z); grp.add(t); }
  void quality;
  return grp;
}

export function buildPark(root) {
  const TREES = [[-10.5, -7.5, 10, 3.6, 3], [-3.5, -12.5, 11, 3.8, 7], [5.5, -11, 9.5, 3.4, 11], [12.5, -6, 10.5, 3.6, 5], [-16, 1.5, 9, 3.2, 9], [18.5, 9.5, 9.5, 3.4, 13], [-18, 12.5, 10, 3.6, 2],
    [-21, -9, 12, 4.2, 4], [-12, -19, 11, 4, 8], [1.5, -22, 12.5, 4.4, 6], [12, -18, 11, 4, 10], [22, -8, 12, 4.2, 12], [26, 4, 10, 3.8, 14], [-26, 4, 10.5, 4, 15], [-30, -14, 13, 4.6, 16], [30, -16, 12, 4.4, 17], [8, -30, 13, 4.6, 18], [-8, -31, 12, 4.4, 19]];
  const grp = new THREE.Group(); grp.name = 'trees'; root.add(grp);
  for (const [x, z, h, c, s] of TREES) { const t = makeTree({ height: h, crown: c, seed: s }); t.position.set(x, 0, z); t.rotation.y = s; grp.add(t); }
  return grp;
}
