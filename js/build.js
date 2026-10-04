// Сборка сцены фудкорта «Санаторий Надежда» по чертежу (НАДЕЖДА ФУДКОРТ.pdf)
// Система координат: метры; X — вдоль диаметра (как на плане), Z = -Y плана (полукруг уходит в -Z), гости в +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import { makePerson, holdLevel } from './people.js';
import { grassTextures, grassBlades, lawnColorAt } from './grass.js';

const R = 5.2;            // радиус полукруга плитки
const TOP = 0.86;         // высота столешниц
const DEPTH = 0.7;        // глубина столов
const Y0 = 0.19, Y1 = Y0 + DEPTH; // столы: от 0.19 до 0.89 м от диаметра (по плану)

const rad = THREE.MathUtils.degToRad;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
function B(w, h, d, m, r = 0.004) { return mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d), m); }
function C(rt, rb, h, m, seg = 32, open = false) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m); }
function at(o, x, y, z, parent) { o.position.set(x, y, z); parent.add(o); return o; }
// элемент по плану: центр (px, py) плана, поворот на угол плана (против часовой), локальная +Z смотрит «вперёд»
function onPlan(group, px, py, angleDeg, parent) { group.position.set(px, 0, -py); group.rotation.y = rad(angleDeg); parent.add(group); return group; }

export function buildScene(scene, opts = {}) {
  const root = new THREE.Group(); root.name = 'foodcourt'; scene.add(root);

  // ---------- материалы ----------
  const M = {
    steel: new THREE.MeshPhysicalMaterial({ color: '#d4d7da', metalness: 1, roughness: 0.3 }),
    steelTop: new THREE.MeshPhysicalMaterial({ color: '#dadde0', metalness: 1, roughness: 0.22 }),
    steelMatte: new THREE.MeshPhysicalMaterial({ color: '#b9bdc1', metalness: 1, roughness: 0.45 }),
    steelDark: new THREE.MeshPhysicalMaterial({ color: '#3a3a3a', metalness: 0.8, roughness: 0.55 }),
    blackPaint: new THREE.MeshPhysicalMaterial({ color: '#141414', metalness: 0.3, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    blackMatte: new THREE.MeshPhysicalMaterial({ color: '#1b1b1b', metalness: 0.5, roughness: 0.75 }),
    castIron: new THREE.MeshPhysicalMaterial({ color: '#202020', metalness: 0.6, roughness: 0.6 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: '#151515', roughness: 0.9 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f6f4ef', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    gasRed: new THREE.MeshPhysicalMaterial({ color: '#b5231c', metalness: 0.2, roughness: 0.35, clearcoat: 0.7 }),
    hose: new THREE.MeshPhysicalMaterial({ color: '#2b2b2b', roughness: 0.6 }),
    binBody: new THREE.MeshPhysicalMaterial({ color: '#3c4a3e', roughness: 0.5, clearcoat: 0.2 }),
    binLid: new THREE.MeshPhysicalMaterial({ color: '#34413a', roughness: 0.45, clearcoat: 0.3 }),
    granite: new THREE.MeshPhysicalMaterial({ color: '#77797b', roughness: 0.7 }),
    redKnob: new THREE.MeshPhysicalMaterial({ color: '#c0281f', roughness: 0.3, emissive: '#ff2a10', emissiveIntensity: 0.6 }),
  };
  const oakTex = T.oak(1024, 128, '#c99a5e');
  M.oak = new THREE.MeshPhysicalMaterial({ map: oakTex, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const oakTex2 = oakTex.clone(); oakTex2.needsUpdate = true; oakTex2.rotation = Math.PI / 2;
  const meat = T.meatTex();
  M.meat = new THREE.MeshPhysicalMaterial({ map: meat, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  M.meatRaw = new THREE.MeshPhysicalMaterial({ color: '#a8423a', roughness: 0.4, clearcoat: 0.5 });
  const coal = T.coalTex();
  M.coal = new THREE.MeshPhysicalMaterial({ map: coal.map, emissiveMap: coal.emissiveMap, emissive: '#ffffff', emissiveIntensity: 6, roughness: 0.95 });
  M.rice = new THREE.MeshPhysicalMaterial({ map: T.riceTex(), roughness: 0.6, clearcoat: 0.3 });
  M.shrimp = new THREE.MeshPhysicalMaterial({ color: '#ec7a43', roughness: 0.35, clearcoat: 0.6 });
  M.mussel = new THREE.MeshPhysicalMaterial({ color: '#141821', roughness: 0.25, clearcoat: 0.8 });
  M.lemon = new THREE.MeshPhysicalMaterial({ color: '#f2d32e', roughness: 0.4 });
  M.pea = new THREE.MeshPhysicalMaterial({ color: '#5e9b2f', roughness: 0.4 });
  M.pepperR = new THREE.MeshPhysicalMaterial({ color: '#c7261c', roughness: 0.3, clearcoat: 0.6 });
  M.pepperY = new THREE.MeshPhysicalMaterial({ color: '#f0b21a', roughness: 0.3, clearcoat: 0.6 });
  M.onion = new THREE.MeshPhysicalMaterial({ color: '#efe6d8', roughness: 0.4, transmission: 0, clearcoat: 0.3 });
  M.greens = new THREE.MeshPhysicalMaterial({ color: '#3f7f2a', roughness: 0.5 });
  M.tomato = new THREE.MeshPhysicalMaterial({ color: '#d1301f', roughness: 0.2, clearcoat: 0.9 });
  M.corn = new THREE.MeshPhysicalMaterial({ color: '#f1c232', roughness: 0.45 });
  M.bread = new THREE.MeshPhysicalMaterial({ color: '#d6a565', roughness: 0.8 });
  M.flameBlue = new THREE.MeshPhysicalMaterial({ color: '#000', emissive: '#3a7bff', emissiveIntensity: 4 });
  M.fire = new THREE.MeshPhysicalMaterial({ color: '#000', emissive: '#ff7a1a', emissiveIntensity: 8 });

  // ---------- земля ----------
  const hi = opts.quality !== 'mobile';
  const gt = grassTextures(opts.grassImg, hi ? 2048 : 1024);
  const GT = 2.6; // фототекстура покрывает ~2.6 м
  gt.map.repeat.set(240 / GT, 240 / GT); gt.normalMap.repeat.copy(gt.map.repeat);
  const lawnPlane = new THREE.PlaneGeometry(240, 240, 480, 480);
  {
    const p = lawnPlane.attributes.position, cols = new Float32Array(p.count * 4);
    const edge = opts.landEdge; // приморье: за кромкой газон уходит под песок
    for (let i = 0; i < p.count; i++) {
      if (edge && -p.getY(i) < edge(p.getX(i))) p.setZ(i, -0.08);
      for (const hl of opts.lawnHoles || []) { const x = p.getX(i), z = -p.getY(i); if (x > hl.x0 && x < hl.x1 && z > hl.z0 && z < hl.z1) p.setZ(i, -3); }
      const c = lawnColorAt(p.getX(i), -p.getY(i));
      cols[i * 4] = c.r; cols[i * 4 + 1] = c.g; cols[i * 4 + 2] = c.b; cols[i * 4 + 3] = 1;
    }
    lawnPlane.setAttribute('color', new THREE.BufferAttribute(cols, 4)); // RGBA — так его ждёт path tracer
  }
  const lawn = mesh(lawnPlane, new THREE.MeshPhysicalMaterial({ map: gt.map, normalMap: gt.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92, vertexColors: true }), false);
  lawn.userData.keep = true;
  lawn.rotation.x = -Math.PI / 2; root.add(lawn);
  // 3D-травинки вокруг площадки (на телефоне — без них)
  if (hi) {
    const outside = (x, z) => Math.hypot(x, z) > R + 0.13 && z < -0.02;
    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const fadeBack = (x, z) => 1 - ss(8.5, 12.5, Math.hypot(x * 0.8, z));
    const fadeSide = (x, z) => (1 - ss(14.8, 17, Math.abs(x))) * (1 - ss(10, 13, z));
    const blades = grassBlades([
      { x0: -14, x1: 14, z0: -12.5, z1: -0.02, test: outside, weight: fadeBack },
      { x0: -17, x1: -13.12, z0: -0.02, z1: 13, test: () => true, weight: fadeSide },
      { x0: 13.12, x1: 17, z0: -0.02, z1: 13, test: () => true, weight: fadeSide },
      { x0: -13.12, x1: 13.12, z0: 11.16, z1: 13, test: () => true, weight: (x, z) => 1 - ss(11.6, 13, z) },
    ], opts.bladeDensity ?? 1100);
    root.add(blades);
  }

  // площадка для гостей (брусчатка) перед линией раздачи
  const pv = opts.plaza === 'aggregate' ? T.aggregateSlabs(3, 0.5, hi ? 2048 : 1024) : T.pavers();
  const PT_TILE = opts.plaza === 'aggregate' ? 3 : 4;
  const PW = 26, PD = 11;
  for (const t of [pv.map, pv.normalMap, pv.roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(PW / PT_TILE, PD / PT_TILE); }
  const plaza = mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshPhysicalMaterial({ map: pv.map, normalMap: pv.normalMap, roughnessMap: pv.roughnessMap, roughness: 1 }), false);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.006, 0.08 + PD / 2); root.add(plaza);
  // бордюры площадки
  const curbM = M.granite;
  at(B(PW + 0.16, 0.05, 0.08, curbM, 0.01), 0, 0.02, 0.08 + PD + 0.04, root);
  at(B(0.08, 0.05, PD, curbM, 0.01), -PW / 2 - 0.04, 0.02, 0.08 + PD / 2, root);
  at(B(0.08, 0.05, PD, curbM, 0.01), PW / 2 + 0.04, 0.02, 0.08 + PD / 2, root);
  at(B(PW + 0.16, 0.02, 0.08, curbM, 0.005), 0, 0.004, 0.04, root);

  // полукруг плитки (концентрические кольца) — то самое «полуарочное изображение» на плане
  const ct = T.circleTiles(R, hi ? 4096 : 2048);
  const semi = new THREE.CircleGeometry(R, 256, 0, Math.PI);
  const uv = semi.attributes.uv, pos = semi.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * R) + 0.5, pos.getY(i) / R);
  const tiles = mesh(semi, new THREE.MeshPhysicalMaterial({ map: ct.map, normalMap: ct.normalMap, roughnessMap: ct.roughnessMap, roughness: 1 }), false);
  tiles.rotation.x = -Math.PI / 2; tiles.position.y = 0.008; root.add(tiles);
  // гранитный бордюр по дуге
  const arcCurb = mesh(new THREE.RingGeometry(R, R + 0.1, 256, 1, 0, Math.PI), curbM, false);
  arcCurb.rotation.x = -Math.PI / 2; arcCurb.position.y = 0.012; root.add(arcCurb);
  const arcCurbSide = mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.03, 256, 1, true, Math.PI / 2, Math.PI), curbM, false);
  arcCurbSide.position.y = 0.0; root.add(arcCurbSide);

  // ---------- линия столов (слева направо): мойка | производственный | холодильник | холодильник | производственный | мойка ----------
  const line = new THREE.Group(); line.name = 'counters'; root.add(line);
  const X = { sinkL: [-4.414, -3.714], workA: [-3.714, -2.014], fr1: [-2.014, -0.179], fr2: [-0.179, 1.656], workB: [1.656, 3.756], sinkR: [3.756, 4.456] };
  const zf = -Y0, zb = -Y1; // z лицевой (к гостям) и рабочей (к поварам) кромок

  function workTable(x0, x1) {
    const grp = new THREE.Group(); const w = x1 - x0, cx = (x0 + x1) / 2, cz = (zf + zb) / 2;
    at(B(w - 0.004, 0.04, DEPTH, M.steelTop, 0.006), cx, TOP - 0.02, cz, grp);
    // ножки и полка
    for (const lx of [x0 + 0.04, x1 - 0.04]) for (const lz of [zf - 0.04, zb + 0.04]) {
      at(B(0.04, TOP - 0.06, 0.04, M.steel, 0.004), lx, (TOP - 0.06) / 2 + 0.02, lz, grp);
      at(C(0.022, 0.018, 0.02, M.steelMatte, 16), lx, 0.01, lz, grp);
    }
    at(B(w - 0.06, 0.025, DEPTH - 0.06, M.steelMatte, 0.004), cx, 0.2, cz, grp);
    // подстолье: царга
    at(B(w - 0.06, 0.08, 0.02, M.steel, 0.003), cx, TOP - 0.09, zf - 0.035, grp);
    at(B(w - 0.06, 0.08, 0.02, M.steel, 0.003), cx, TOP - 0.09, zb + 0.035, grp);
    return grp;
  }
  function sinkTable(x0, x1, bowlCy, outerSide) {
    // стол 700×2000, перпендикулярно линии; мойка 400×400 в дальнем конце
    const grp = new THREE.Group();
    const w = x1 - x0, cx = (x0 + x1) / 2, ya = Y0, yb = Y0 + 2.0;
    const z0 = -ya, z1 = -yb, cz = (z0 + z1) / 2, L = yb - ya;
    const bz = -bowlCy, bh = 0.4, holeX0 = cx - bh / 2, holeX1 = cx + bh / 2, holeZ0 = bz + bh / 2, holeZ1 = bz - bh / 2;
    const th = 0.04, yT = TOP - th / 2;
    // столешница с вырезом под чашу
    at(B(w, th, z0 - holeZ0, M.steelTop, 0.006), cx, yT, (z0 + holeZ0) / 2, grp);
    at(B(w, th, holeZ1 - z1, M.steelTop, 0.006), cx, yT, (holeZ1 + z1) / 2, grp);
    at(B(holeX0 - x0, th, bh, M.steelTop, 0.0), (x0 + holeX0) / 2, yT, bz, grp);
    at(B(x1 - holeX1, th, bh, M.steelTop, 0.0), (holeX1 + x1) / 2, yT, bz, grp);
    // чаша
    const bd = 0.25;
    at(B(bh, 0.01, bh, M.steelMatte, 0), cx, TOP - bd, bz, grp);
    at(B(0.01, bd, bh, M.steelMatte, 0), holeX0 + 0.005, TOP - bd / 2, bz, grp);
    at(B(0.01, bd, bh, M.steelMatte, 0), holeX1 - 0.005, TOP - bd / 2, bz, grp);
    at(B(bh, bd, 0.01, M.steelMatte, 0), cx, TOP - bd / 2, holeZ0 - 0.005, grp);
    at(B(bh, bd, 0.01, M.steelMatte, 0), cx, TOP - bd / 2, holeZ1 + 0.005, grp);
    at(C(0.025, 0.025, 0.004, M.steelDark, 20), cx, TOP - bd + 0.007, bz, grp);
    // борт со стороны края площадки + смеситель
    const ox = outerSide < 0 ? x0 + 0.015 : x1 - 0.015;
    at(B(0.03, 0.15, L, M.steelTop, 0.004), ox, TOP + 0.075, cz, grp);
    const fx = ox - outerSide * 0.05;
    at(C(0.022, 0.026, 0.06, M.steel, 20), fx, TOP + 0.03, bz, grp);
    const spout = mesh(new THREE.TorusGeometry(0.12, 0.012, 12, 32, Math.PI), M.steel);
    spout.rotation.y = outerSide < 0 ? 0 : Math.PI; spout.position.set(fx - outerSide * 0.12, TOP + 0.06, bz); grp.add(spout);
    at(C(0.012, 0.012, 0.06, M.steel, 12), fx - outerSide * 0.24, TOP + 0.03, bz, grp);
    const lever = B(0.1, 0.012, 0.018, M.steel, 0.004); lever.rotation.z = -outerSide * 0.4; at(lever, fx - outerSide * 0.03, TOP + 0.11, bz, grp);
    // ножки, полка
    for (const lx of [x0 + 0.04, x1 - 0.04]) for (const lz of [z0 - 0.04, z1 + 0.04, cz]) {
      at(B(0.04, TOP - 0.06, 0.04, M.steel, 0.004), lx, (TOP - 0.06) / 2 + 0.02, lz, grp);
    }
    at(B(w - 0.06, 0.025, L - 0.06 - 0.0, M.steelMatte, 0.004), cx, 0.2, cz, grp);
    at(B(0.02, 0.08, L - 0.06, M.steel, 0.003), x0 + 0.035, TOP - 0.09, cz, grp);
    at(B(0.02, 0.08, L - 0.06, M.steel, 0.003), x1 - 0.035, TOP - 0.09, cz, grp);
    return grp;
  }
  // стол-холодильник (типа Polair TM3, 1835×700×860): двери к поварам, к гостям — декоративная перфорированная панель
  const panelTex = T.perforatedPanel(1.835 - 0.03, 0.8, 'САНАТОРИЙ НАДЕЖДА', opts.font || { family: 'serif', weight: 700 }, hi ? 2400 : 1300);
  const panelM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: panelTex.map, metalness: 1, metalnessMap: panelTex.metalnessMap, roughness: 1, roughnessMap: panelTex.roughnessMap, envMapIntensity: 1, normalMap: panelTex.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
  function fridgeTable(x0, x1) {
    const grp = new THREE.Group(); const w = x1 - x0, cx = (x0 + x1) / 2, cz = (zf + zb) / 2;
    at(B(w - 0.004, 0.04, DEPTH, M.steelTop, 0.006), cx, TOP - 0.02, cz, grp);
    const bodyH = TOP - 0.04 - 0.1;
    at(B(w - 0.01, bodyH, DEPTH - 0.04, M.steel, 0.006), cx, 0.1 + bodyH / 2, cz - 0.005, grp);
    // ножки
    for (const lx of [x0 + 0.05, x1 - 0.05]) for (const lz of [zf - 0.06, zb + 0.06]) at(C(0.02, 0.02, 0.1, M.steel, 16), lx, 0.05, lz, grp);
    // агрегатный отсек (решётка) + 3 двери к поварам
    const comp = 0.36;
    for (let i = 0; i < 9; i++) at(B(comp - 0.06, 0.012, 0.006, M.steelDark, 0.002), x0 + comp / 2, 0.2 + i * 0.06, zb + 0.012, grp);
    const dw = (w - comp - 0.02) / 3;
    for (let i = 0; i < 3; i++) {
      const dx = x0 + comp + 0.01 + dw * (i + 0.5);
      at(B(dw - 0.012, bodyH - 0.06, 0.02, M.steel, 0.005), dx, 0.1 + bodyH / 2, zb + 0.005, grp);
      at(B(dw - 0.1, 0.025, 0.03, M.steelMatte, 0.006), dx, 0.1 + bodyH - 0.07, zb - 0.012, grp);
    }
    // декоративный фасад к гостям (лазерная резка)
    const pnl = mesh(new THREE.PlaneGeometry(w - 0.03, 0.8), panelM);
    pnl.position.set(cx, 0.03 + 0.4, zf - 0.012); grp.add(pnl);
    // кромка-рамка фасада
    at(B(w - 0.02, 0.012, 0.014, M.steel, 0.003), cx, 0.03, zf - 0.016, grp);
    at(B(0.012, 0.8, 0.014, M.steel, 0.003), x0 + 0.01, 0.43, zf - 0.016, grp);
    at(B(0.012, 0.8, 0.014, M.steel, 0.003), x1 - 0.01, 0.43, zf - 0.016, grp);
    // двухъярусная полка над столом-холодильником
    const sd = 0.34, sz = cz, s1 = TOP + 0.4, s2 = TOP + 0.78;
    for (const px of [x0 + 0.025, x1 - 0.025]) for (const pz of [sz + sd / 2 - 0.015, sz - sd / 2 + 0.015]) {
      at(B(0.025, s2 - TOP + 0.02, 0.025, M.steel, 0.003), px, TOP + (s2 - TOP + 0.02) / 2, pz, grp);
      at(B(0.06, 0.006, 0.05, M.steel, 0.002), px, TOP + 0.003, pz, grp);
    }
    for (const sy of [s1, s2]) {
      at(B(w - 0.03, 0.03, sd, M.steelTop, 0.004), cx, sy, sz, grp);
      at(B(w - 0.03, 0.025, 0.012, M.steel, 0.002), cx, sy + 0.02, sz + sd / 2 - 0.006, grp); // бортик
    }
    grp.userData = { cx, sz, s1, s2, w };
    return grp;
  }

  line.add(sinkTable(...X.sinkL, 1.885, -1));
  line.add(workTable(...X.workA));
  const f1 = fridgeTable(...X.fr1); line.add(f1);
  const f2 = fridgeTable(...X.fr2); line.add(f2);
  line.add(workTable(...X.workB));
  line.add(sinkTable(...X.sinkR, 1.868, 1));

  // ---------- посуда и еда ----------
  const plateGeo = new THREE.LatheGeometry([[0, 0.0], [0.085, 0.0], [0.09, 0.003], [0.1, 0.007], [0.125, 0.018], [0.132, 0.02], [0.13, 0.023], [0.122, 0.021], [0.098, 0.011], [0.0, 0.011]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
  const bowlGeo = new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.045, 0.004], [0.07, 0.03], [0.075, 0.055], [0.07, 0.056], [0.064, 0.032], [0.04, 0.01], [0, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  function chunk(m, s = 0.03) { const c = B(s * T.rr(0.9, 1.2), s * T.rr(0.8, 1.1), s * T.rr(0.9, 1.2), m, s * 0.35); c.rotation.set(T.rr(-0.4, 0.4), T.rr(0, 3), T.rr(-0.4, 0.4)); return c; }
  function skewer(len = 0.6, pieces = 6, raw = false) {
    const s = new THREE.Group();
    at(B(len, 0.002, 0.009, M.steel, 0.0005), 0, 0, 0, s);
    const ring = mesh(new THREE.TorusGeometry(0.02, 0.003, 8, 20), M.steel); ring.position.set(len / 2 + 0.018, 0, 0); ring.rotation.x = Math.PI / 2; s.add(ring);
    for (let i = 0; i < pieces; i++) {
      const x = -len / 2 + 0.08 + i * (len * 0.62 / pieces);
      const isOnion = !raw && i % 3 === 2;
      const p = isOnion ? mesh(new THREE.TorusGeometry(0.014, 0.008, 8, 16), M.onion) : chunk(raw ? M.meatRaw : M.meat, 0.034);
      if (isOnion) p.rotation.y = Math.PI / 2;
      p.position.x = x; s.add(p);
    }
    return s;
  }
  function plateWith(kind = 'shashlik') {
    const p = new THREE.Group(); p.add(mesh(plateGeo, M.ceramic));
    if (kind === 'shashlik') {
      for (let i = 0; i < 6; i++) { const c = chunk(M.meat, 0.034); c.position.set(T.rr(-0.05, 0.05), 0.03, T.rr(-0.05, 0.03)); p.add(c); }
      for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16), M.onion); r.rotation.x = Math.PI / 2 + T.rr(-0.3, 0.3); r.position.set(T.rr(-0.06, 0.06), 0.04, T.rr(-0.06, 0.06)); p.add(r); }
      const t1 = mesh(new THREE.SphereGeometry(0.022, 16, 12), M.tomato); t1.position.set(0.07, 0.03, 0.04); p.add(t1);
      const gr = mesh(new THREE.IcosahedronGeometry(0.03, 1), M.greens); gr.scale.set(1.3, 0.5, 1); gr.position.set(-0.07, 0.025, 0.05); p.add(gr);
      const lav = B(0.12, 0.006, 0.08, M.bread, 0.003); lav.position.set(0, 0.016, 0.07); lav.rotation.y = 0.3; p.add(lav);
    } else if (kind === 'paella') {
      const r = mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.02, 32), M.rice); r.position.y = 0.02; p.add(r);
      for (let i = 0; i < 3; i++) { const s = mesh(new THREE.TorusGeometry(0.018, 0.008, 8, 16, Math.PI * 1.3), M.shrimp); s.rotation.x = -Math.PI / 2; s.rotation.z = i * 2; s.position.set(Math.cos(i * 2.1) * 0.05, 0.035, Math.sin(i * 2.1) * 0.05); p.add(s); }
      const l = mesh(new THREE.SphereGeometry(0.025, 12, 8, 0, Math.PI), M.lemon); l.position.set(0.02, 0.035, -0.02); p.add(l);
    } else if (kind === 'grill') {
      const st = B(0.13, 0.022, 0.08, M.meat, 0.01); st.position.set(-0.02, 0.025, 0); st.rotation.y = 0.3; p.add(st);
      const corn = mesh(new THREE.CapsuleGeometry(0.022, 0.08, 6, 16), M.corn); corn.rotation.z = Math.PI / 2; corn.position.set(0.04, 0.035, 0.06); p.add(corn);
      const gr = mesh(new THREE.IcosahedronGeometry(0.028, 1), M.greens); gr.scale.set(1.2, 0.5, 1); gr.position.set(0.06, 0.025, -0.05); p.add(gr);
    }
    return p;
  }
  const stackOf = (n) => { const s = new THREE.Group(); for (let i = 0; i < n; i++) { const pl = mesh(plateGeo, M.ceramic); pl.position.y = i * 0.012; s.add(pl); } return s; };

  // на полках над холодильниками
  for (const f of [f1, f2]) {
    const { cx, sz, s1, s2, w } = f.userData;
    const kinds = ['shashlik', 'paella', 'grill', 'shashlik'];
    for (let i = 0; i < 4; i++) { if (f === f2 && i === 3) continue; const p = plateWith(kinds[(i + (f === f2 ? 1 : 0)) % 4]); p.position.set(cx - w / 2 + 0.28 + i * 0.42, s1 + 0.015, sz); p.rotation.y = T.rr(0, 6); line.add(p); }
    for (let i = 0; i < 3; i++) { const s = stackOf(8 + (i % 2) * 4); s.position.set(cx - w / 2 + 0.3 + i * 0.6, s2 + 0.015, sz); line.add(s); }
    for (let i = 0; i < 4; i++) { const b = mesh(bowlGeo, M.ceramic); b.position.set(cx - w / 2 + 0.55 + i * 0.12 + (i > 1 ? 0.6 : 0), s2 + 0.015, sz + (i % 2 ? 0.07 : -0.07)); line.add(b); }
  }
  // гастроёмкости на холодильниках
  function gn(x, z, fill) {
    const grp = new THREE.Group();
    const w = 0.176, d = 0.162, h = 0.1;
    at(B(w, 0.004, d, M.steel, 0), 0, 0.002, 0, grp);
    at(B(w, h, 0.004, M.steel, 0), 0, h / 2, d / 2, grp); at(B(w, h, 0.004, M.steel, 0), 0, h / 2, -d / 2, grp);
    at(B(0.004, h, d, M.steel, 0), w / 2, h / 2, 0, grp); at(B(0.004, h, d, M.steel, 0), -w / 2, h / 2, 0, grp);
    at(B(w + 0.02, 0.006, d + 0.02, M.steel, 0.002), 0, h, 0, grp).scale.set(1, 1, 1);
    grp.children[grp.children.length - 1].visible = false;
    for (let i = 0; i < 26; i++) { const c = fill === 'tomato' ? mesh(new THREE.SphereGeometry(0.018, 10, 8), M.tomato) : fill === 'greens' ? mesh(new THREE.IcosahedronGeometry(0.02, 0), M.greens) : fill === 'onion' ? mesh(new THREE.TorusGeometry(0.015, 0.004, 6, 12), M.onion) : chunk(M.pepperR, 0.02); c.position.set(T.rr(-0.07, 0.07), h - 0.02, T.rr(-0.06, 0.06)); grp.add(c); }
    grp.position.set(x, TOP, z); line.add(grp);
  }
  gn(-1.75, -0.63, 'greens'); gn(-1.56, -0.63, 'tomato'); gn(-1.37, -0.63, 'onion'); gn(-1.18, -0.63, 'pepper');
  gn(1.15, -0.63, 'tomato'); gn(1.34, -0.63, 'greens');
  // доска, нож, тарелки на производственных столах
  const board = B(0.45, 0.025, 0.3, M.oak, 0.008); board.position.set(-2.95, TOP + 0.0125, -0.6); line.add(board);
  const knife = new THREE.Group(); at(B(0.2, 0.002, 0.035, M.steel, 0.001), 0, 0, 0, knife); at(B(0.12, 0.018, 0.022, M.blackMatte, 0.006), -0.16, 0.004, 0, knife);
  knife.position.set(-2.9, TOP + 0.027, -0.62); knife.rotation.y = 0.4; line.add(knife);
  for (let i = 0; i < 5; i++) { const t = mesh(new THREE.SphereGeometry(0.035, 16, 12), M.tomato); t.position.set(-3.3 + T.rr(-0.06, 0.06), TOP + 0.035, -0.45 + T.rr(-0.06, 0.06)); line.add(t); }
  const st1 = stackOf(14); st1.position.set(-2.35, TOP, -0.45); line.add(st1);
  const st2 = stackOf(10); st2.position.set(2.0, TOP, -0.42); line.add(st2);
  // лоток с сырыми шампурами — для мангала
  const tray = new THREE.Group(); at(B(0.62, 0.04, 0.4, M.steel, 0.004), 0, 0.02, 0, tray);
  for (let i = 0; i < 6; i++) { const s = skewer(0.6, 6, true); s.rotation.x = T.rr(-0.5, 0.5); s.position.set(0, 0.06, -0.15 + i * 0.06); tray.add(s); }
  tray.position.set(2.75, TOP, -0.55); tray.rotation.y = 0.05; line.add(tray);
  // терминал оплаты
  const term = new THREE.Group(); at(B(0.08, 0.04, 0.16, M.blackPaint, 0.01), 0, 0.02, 0, term); const scr = at(B(0.06, 0.002, 0.07, new THREE.MeshPhysicalMaterial({ color: "#0a0f14", emissive: "#2a4a6a", emissiveIntensity: 0.6, roughness: 0.1 }), 0.001), 0, 0.041, -0.03, term);
  void scr; term.position.set(3.45, TOP, -0.3); term.rotation.y = 0.2; line.add(term);
  // ящики под столами
  const crate = (x, z, c) => { const b = B(0.6, 0.2, 0.4, new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55 }), 0.008); b.position.set(x, 0.215 + 0.1, z); line.add(b); const b2 = b.clone(); b2.position.y += 0.205; line.add(b2); };
  crate(-3.25, -0.6, '#8d9399'); crate(2.3, -0.6, '#8d9399'); crate(3.25, -0.6, '#8d9399');

  // ---------- кухонное оборудование по дуге (координаты из чертежа) ----------
  const kitchen = new THREE.Group(); kitchen.name = 'stations'; root.add(kitchen);

  // Казан на подставке h=550 d=680
  {
    const k = new THREE.Group();
    at(C(0.34, 0.34, 0.5, M.blackMatte, 48), 0, 0.25, 0, k);
    at(mesh(new THREE.TorusGeometry(0.335, 0.015, 10, 48), M.blackMatte), 0, 0.5, 0, k).rotation.x = Math.PI / 2;
    const door = B(0.2, 0.15, 0.03, M.castIron, 0.01); door.position.set(0, 0.17, 0.335); k.add(door);
    const glow = B(0.12, 0.06, 0.01, M.fire, 0.005); glow.position.set(0, 0.17, 0.352); k.add(glow);
    for (let i = 0; i < 3; i++) { const l = C(0.03, 0.03, 0.05, M.blackMatte, 12); l.position.set(Math.cos(i * 2.09) * 0.28, 0.0, Math.sin(i * 2.09) * 0.28); }
    const pot = mesh(new THREE.SphereGeometry(0.31, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.castIron); pot.position.y = 0.55; k.add(pot);
    at(mesh(new THREE.TorusGeometry(0.31, 0.012, 10, 48), M.castIron), 0, 0.55, 0, k).rotation.x = Math.PI / 2;
    for (const s of [1, -1]) { const h = mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI), M.castIron); h.position.set(s * 0.33, 0.55, 0); h.rotation.y = Math.PI / 2; k.add(h); }
    // деревянная крышка из досок с двумя планками
    const lid = new THREE.Group();
    const lidD = 0.6;
    for (let i = -3; i <= 3; i++) {
      const bw = lidD / 7, z = i * bw, half = Math.sqrt(Math.max(0, (lidD / 2) ** 2 - z ** 2));
      const pl = B(half * 2, 0.022, bw - 0.004, M.oak, 0.004); pl.position.set(0, 0, z); lid.add(pl);
    }
    for (const sx of [-0.12, 0.12]) { const sl = B(0.05, 0.03, lidD * 0.86, M.oak, 0.008); sl.position.set(sx, 0.026, 0); lid.add(sl); }
    lid.position.y = 0.575; lid.rotation.y = 0.5; k.add(lid);
    onPlan(k, -3.355, 3.172, 0, kitchen);
  }
  // Набор для паэльи: горелка на треноге, сковорода d=600, баллон 18 л
  {
    const p = new THREE.Group();
    const H = 0.72;
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.3; const top = V(Math.cos(a) * 0.2, H - 0.06, Math.sin(a) * 0.2), bot = V(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34);
      const len = top.distanceTo(bot); const leg = C(0.012, 0.012, len, M.blackMatte, 10);
      leg.position.copy(top.clone().add(bot).multiplyScalar(0.5)); leg.lookAt(top); leg.rotateX(Math.PI / 2); p.add(leg);
    }
    at(mesh(new THREE.TorusGeometry(0.21, 0.012, 8, 40), M.blackMatte), 0, H - 0.06, 0, p).rotation.x = Math.PI / 2;
    at(mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 40), M.steelDark), 0, H - 0.02, 0, p).rotation.x = Math.PI / 2;
    at(mesh(new THREE.TorusGeometry(0.16, 0.006, 6, 60), M.flameBlue), 0, H - 0.0, 0, p).rotation.x = Math.PI / 2;
    // сковорода
    const pan = mesh(new THREE.LatheGeometry([[0, 0], [0.25, 0], [0.3, 0.055], [0.305, 0.058], [0.3, 0.06], [0.246, 0.005], [0, 0.005]].map(([x, y]) => new THREE.Vector2(x, y)), 64), M.steelDark);
    pan.position.y = H + 0.01; p.add(pan);
    for (const s of [1, -1]) { const h = mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 16, Math.PI), M.steelDark); h.position.set(s * 0.32, H + 0.06, 0); h.rotation.set(Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); p.add(h); }
    const rice = mesh(new THREE.CylinderGeometry(0.275, 0.25, 0.03, 64), M.rice); rice.position.y = H + 0.035; p.add(rice);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const s = mesh(new THREE.TorusGeometry(0.03, 0.011, 8, 16, Math.PI * 1.3), M.shrimp); s.rotation.set(-Math.PI / 2, 0, a); s.position.set(Math.cos(a) * 0.19, H + 0.058, Math.sin(a) * 0.19); p.add(s); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.3; const m = mesh(new THREE.SphereGeometry(0.03, 12, 8), M.mussel); m.scale.set(1.5, 0.45, 0.8); m.rotation.y = -a; m.position.set(Math.cos(a) * 0.11, H + 0.056, Math.sin(a) * 0.11); p.add(m); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.6; const l = mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI), M.lemon); l.rotation.set(-Math.PI / 2, 0, a); l.position.set(Math.cos(a) * 0.235, H + 0.052, Math.sin(a) * 0.235); p.add(l); }
    for (let i = 0; i < 40; i++) { const pe = mesh(new THREE.SphereGeometry(0.008, 8, 6), M.pea); const a = T.rnd() * 6.28, r = T.rr(0.02, 0.25); pe.position.set(Math.cos(a) * r, H + 0.053, Math.sin(a) * r); p.add(pe); }
    for (let i = 0; i < 10; i++) { const s = B(0.06, 0.008, 0.012, M.pepperR, 0.003); const a = T.rnd() * 6.28, r = T.rr(0.03, 0.24); s.rotation.y = T.rnd() * 3; s.position.set(Math.cos(a) * r, H + 0.054, Math.sin(a) * r); p.add(s); }
    // газовый баллон и шланг (позади, ближе к дуге)
    const cyl = new THREE.Group();
    at(C(0.15, 0.15, 0.42, M.gasRed, 40), 0, 0.27, 0, cyl);
    at(mesh(new THREE.SphereGeometry(0.15, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.gasRed), 0, 0.48, 0, cyl);
    at(mesh(new THREE.SphereGeometry(0.15, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.gasRed), 0, 0.06, 0, cyl);
    at(C(0.13, 0.13, 0.06, M.gasRed, 32, true), 0, 0.02, 0, cyl);
    at(C(0.025, 0.03, 0.06, M.steel, 16), 0, 0.64, 0, cyl);
    at(C(0.07, 0.07, 0.05, M.gasRed, 24, true), 0, 0.64, 0, cyl);
    cyl.position.set(-0.05, 0, -0.62); p.add(cyl);
    const hose = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.05, 0.66, -0.62), V(-0.05, 0.62, -0.5), V(-0.02, 0.1, -0.35), V(0, 0.03, -0.15), V(0.02, 0.2, -0.05), V(0, H - 0.04, -0.02)]), 40, 0.009, 8), M.hose);
    p.add(hose);
    onPlan(p, -2.55, 3.826, 0, kitchen);
  }
  // Гриль Weber (680×1660, h=1220, решётка 680×480) — открытая крышка, стейки и кукуруза
  {
    const w = new THREE.Group();
    const cabX0 = -0.55, cabX1 = 0.27, cabW = cabX1 - cabX0, cabC = (cabX0 + cabX1) / 2;
    const zBack = -0.3, zFront = 0.25, cd = zFront - zBack, cz = (zFront + zBack) / 2;
    at(B(cabW, 0.62, cd, M.blackPaint, 0.012), cabC, 0.13 + 0.31, cz, w);
    for (const dx of [-0.205, 0.205]) {
      at(B(cabW / 2 - 0.02, 0.54, 0.012, M.blackPaint, 0.006), cabC + dx, 0.44, zFront + 0.006, w);
      at(C(0.009, 0.009, 0.32, M.steel, 12), cabC + dx * 0.12 + (dx > 0 ? 0.03 : -0.03), 0.47, zFront + 0.035, w);
    }
    // колёса
    for (const lx of [cabX0 + 0.05, cabX1 - 0.05]) for (const lz of [zBack + 0.05, zFront - 0.05]) { const wh = C(0.055, 0.055, 0.03, M.rubber, 24); wh.rotation.z = Math.PI / 2; wh.position.set(lx, 0.06, lz); w.add(wh); at(B(0.03, 0.06, 0.03, M.steelDark, 0.004), lx, 0.11, lz, w); }
    // панель управления и ручки
    const cp = B(cabW, 0.12, 0.06, M.blackPaint, 0.01); cp.position.set(cabC, 0.82, zFront + 0.02); cp.rotation.x = -0.35; w.add(cp);
    for (let i = 0; i < 3; i++) { const kb = C(0.026, 0.026, 0.03, M.blackMatte, 20); kb.rotation.x = Math.PI / 2 - 0.35; kb.position.set(cabC - 0.22 + i * 0.22, 0.83, zFront + 0.065); w.add(kb); const ring = C(0.03, 0.03, 0.006, M.redKnob, 20); ring.rotation.x = Math.PI / 2 - 0.35; ring.position.set(cabC - 0.22 + i * 0.22, 0.83, zFront + 0.05); w.add(ring); }
    // котёл (cookbox) и решётка
    at(B(cabW, 0.24, 0.52, M.blackPaint, 0.02), cabC, 0.86, -0.03, w);
    at(B(cabW - 0.06, 0.01, 0.46, M.castIron, 0.0), cabC, 0.985, -0.03, w);
    for (let i = 0; i < 12; i++) at(B(cabW - 0.08, 0.012, 0.012, M.castIron, 0.004), cabC, 0.995, -0.25 + i * 0.04, w);
    // еда на решётке
    for (let i = 0; i < 3; i++) { const st = B(0.15, 0.025, 0.1, M.meat, 0.012); st.position.set(cabC - 0.22 + i * 0.16, 1.015, -0.1); st.rotation.y = T.rr(-0.2, 0.2); w.add(st); }
    for (let i = 0; i < 3; i++) { const corn = mesh(new THREE.CapsuleGeometry(0.026, 0.13, 6, 16), M.corn); corn.rotation.z = Math.PI / 2; corn.position.set(cabC - 0.2 + i * 0.18, 1.03, 0.1); w.add(corn); }
    // открытая крышка (откинута назад)
    const lid = new THREE.Group();
    const shell = mesh(new THREE.CylinderGeometry(0.25, 0.25, cabW, 40, 1, true, 0, Math.PI), M.blackPaint); shell.rotation.z = Math.PI / 2; shell.scale.set(1, 1, 1); lid.add(shell);
    for (const s of [1, -1]) { const cap = mesh(new THREE.CircleGeometry(0.25, 40, 0, Math.PI), M.blackPaint); cap.rotation.y = s * Math.PI / 2; cap.position.x = s * cabW / 2; lid.add(cap); cap.material = M.blackPaint.clone(); cap.material.side = THREE.DoubleSide; }
    shell.material = M.blackPaint.clone(); shell.material.side = THREE.DoubleSide;
    const handle = C(0.014, 0.014, cabW * 0.8, M.steel, 12); handle.rotation.z = Math.PI / 2; handle.position.set(0, 0.0, 0.33); lid.add(handle);
    for (const s of [-0.25, 0.25]) at(B(0.02, 0.02, 0.08, M.steel, 0.005), s, 0, 0.29, lid);
    const therm = C(0.03, 0.03, 0.02, M.steel, 20); therm.rotation.x = Math.PI / 2; therm.position.set(0, 0.17, 0.18); lid.add(therm);
    // ось шарнира у задней кромки
    const hinge = new THREE.Group(); hinge.position.set(cabC, 0.98, -0.29); w.add(hinge);
    lid.position.set(0, 0, 0.26); hinge.add(lid); hinge.rotation.x = -rad(105);
    // боковые столики
    at(B(0.56, 0.03, 0.5, M.steelTop, 0.006), cabX1 + 0.28, 0.92, -0.03, w);
    at(B(0.27, 0.03, 0.5, M.blackPaint, 0.006), cabX0 - 0.135, 0.92, -0.03, w);
    for (let i = 0; i < 4; i++) { const h = B(0.012, 0.012, 0.012, M.steel, 0.002); void h; }
    // щипцы на столике
    const tongs = new THREE.Group(); at(B(0.36, 0.006, 0.015, M.steel, 0.002), 0, 0, 0, tongs); at(B(0.36, 0.006, 0.015, M.steel, 0.002), 0, 0.008, 0.02, tongs);
    tongs.position.set(cabX1 + 0.3, 0.94, 0.05); tongs.rotation.y = 0.3; w.add(tongs);
    const sauce = C(0.03, 0.03, 0.16, new THREE.MeshPhysicalMaterial({ color: '#7a1d14', roughness: 0.2, clearcoat: 1 }), 20); sauce.position.set(cabX1 + 0.45, 1.015, -0.15); w.add(sauce);
    onPlan(w, -0.901, 4.416, 11.77, kitchen);
  }
  // Вертел h=700 l=1800: две треноги, шампур-вертел с мясом, под ним жаровня с углями
  {
    const v = new THREE.Group();
    const H = 0.7;
    for (const sx of [-0.85, 0.85]) {
      const apex = V(sx, H + 0.03, 0);
      for (let i = 0; i < 3; i++) {
        const a = i * 2.094 + (sx > 0 ? 0 : Math.PI);
        const foot = V(sx + Math.cos(a) * 0.12 * (sx > 0 ? 1 : 1), 0, Math.sin(a) * 0.33);
        const len = apex.distanceTo(foot); const leg = C(0.014, 0.016, len, M.blackMatte, 10);
        leg.position.copy(apex.clone().add(foot).multiplyScalar(0.5)); leg.lookAt(apex); leg.rotateX(Math.PI / 2); v.add(leg);
      }
      at(B(0.05, 0.07, 0.05, M.blackMatte, 0.008), sx, H + 0.03, 0, v);
    }
    const rod = C(0.011, 0.011, 2.05, M.steel, 12); rod.rotation.z = Math.PI / 2; rod.position.set(0.03, H, 0); v.add(rod);
    const crank = new THREE.Group(); at(B(0.02, 0.16, 0.02, M.steel, 0.004), 0, -0.08, 0, crank); const kn = C(0.016, 0.016, 0.08, M.oak, 12); kn.rotation.z = Math.PI / 2; kn.position.set(0.04, -0.16, 0); crank.add(kn);
    crank.position.set(1.05, H, 0); v.add(crank);
    // мясо на вертеле (рулет, перевязанный бечёвкой)
    const roast = mesh(new THREE.CapsuleGeometry(0.12, 0.62, 10, 32), M.meat); roast.rotation.z = Math.PI / 2; roast.scale.set(1, 1, 0.92); roast.position.set(0, H, 0); v.add(roast);
    for (let i = 0; i < 7; i++) { const tw = mesh(new THREE.TorusGeometry(0.121, 0.0022, 6, 40), new THREE.MeshPhysicalMaterial({ color: '#8a6a45', roughness: 0.9 })); tw.rotation.y = Math.PI / 2; tw.position.set(-0.3 + i * 0.1, H, 0); tw.scale.set(1, 1, 0.92); v.add(tw); }
    for (const sx of [-0.42, 0.42]) { const fork = C(0.03, 0.03, 0.04, M.steel, 12); fork.rotation.z = Math.PI / 2; fork.position.set(sx, H, 0); v.add(fork); }
    // жаровня с углями
    const pan = new THREE.Group();
    at(B(1.3, 0.012, 0.46, M.steelDark, 0.003), 0, 0.17, 0, pan);
    at(B(1.3, 0.13, 0.012, M.steelDark, 0.003), 0, 0.235, 0.23, pan); at(B(1.3, 0.13, 0.012, M.steelDark, 0.003), 0, 0.235, -0.23, pan);
    at(B(0.012, 0.13, 0.46, M.steelDark, 0.003), 0.65, 0.235, 0, pan); at(B(0.012, 0.13, 0.46, M.steelDark, 0.003), -0.65, 0.235, 0, pan);
    for (const lx of [-0.6, 0.6]) for (const lz of [-0.2, 0.2]) at(B(0.03, 0.17, 0.03, M.steelDark, 0.004), lx, 0.085, lz, pan);
    const coals = mesh(new THREE.BoxGeometry(1.26, 0.04, 0.42, 1, 1, 1), M.coal); coals.position.y = 0.2; pan.add(coals);
    for (let i = 0; i < 60; i++) { const c = mesh(new THREE.DodecahedronGeometry(T.rr(0.02, 0.035), 0), M.coal); c.position.set(T.rr(-0.6, 0.6), 0.225, T.rr(-0.19, 0.19)); c.rotation.set(T.rnd() * 3, T.rnd() * 3, 0); pan.add(c); }
    v.add(pan);
    onPlan(v, 1.8135, 4.241, -19.73, kitchen);
  }
  // Мангал 1500×600 с шашлыком
  {
    const m = new THREE.Group();
    const L = 1.5, Wd = 0.6, top = 0.85, depth = 0.24, bottom = top - depth;
    at(B(L, 0.006, Wd, M.blackMatte, 0.002), 0, bottom, 0, m);
    for (const s of [1, -1]) {
      at(B(L, depth, 0.006, M.blackMatte, 0.002), 0, bottom + depth / 2, s * Wd / 2, m);
      at(B(0.006, depth, Wd, M.blackMatte, 0.002), s * L / 2, bottom + depth / 2, 0, m);
      // отверстия поддува
      for (let i = 0; i < 12; i++) at(C(0.012, 0.012, 0.008, M.rubber, 10), -L / 2 + 0.12 + i * 0.115, bottom + 0.05, s * (Wd / 2 + 0.002), m).rotation.x = Math.PI / 2;
    }
    // прорези под шампуры на верхней кромке
    for (const lx of [-L / 2 + 0.03, L / 2 - 0.03]) for (const lz of [-Wd / 2 + 0.03, Wd / 2 - 0.03]) {
      const leg = B(0.035, bottom, 0.035, M.blackMatte, 0.003); leg.position.set(lx, bottom / 2, lz); m.add(leg);
    }
    at(B(L - 0.1, 0.02, 0.02, M.blackMatte, 0.003), 0, 0.15, Wd / 2 - 0.03, m); at(B(L - 0.1, 0.02, 0.02, M.blackMatte, 0.003), 0, 0.15, -Wd / 2 + 0.03, m);
    // угли
    const coals = mesh(new THREE.BoxGeometry(L - 0.02, 0.05, Wd - 0.02), M.coal); coals.position.y = bottom + 0.06; m.add(coals);
    for (let i = 0; i < 120; i++) { const c = mesh(new THREE.DodecahedronGeometry(T.rr(0.02, 0.04), 0), M.coal); c.position.set(T.rr(-0.7, 0.7), bottom + 0.09, T.rr(-0.27, 0.27)); c.rotation.set(T.rnd() * 3, T.rnd() * 3, 0); m.add(c); }
    // шампуры поперёк
    for (let i = 0; i < 12; i++) { const s = skewer(0.72, 7); s.rotation.order = 'YXZ'; s.rotation.set(T.rr(-0.6, 0.6), Math.PI / 2 + T.rr(-0.03, 0.03), 0); s.position.set(-0.6 + i * 0.105, top + 0.02, 0.03); m.add(s); }
    onPlan(m, 3.475, 3.102, -54.3, kitchen);
  }

  // ---------- мобильное ограждение (дуб, 1180×566, соединение крюком) — слева и справа от линии столов ----------
  const fenceGrp = new THREE.Group(); fenceGrp.name = 'fence'; root.add(fenceGrp);
  function fencePanel(len = 1.18, h = 0.566) {
    const f = new THREE.Group();
    const post = 0.045, footH = 0.05, rail = 0.06;
    for (const s of [-1, 1]) {
      at(B(post, h, post, M.oak, 0.006), s * (len / 2 - post / 2), footH + h / 2, 0, f);
      const foot = B(0.05, 0.05, 0.36, M.oak, 0.008); foot.position.set(s * (len / 2 - post / 2), footH / 2, 0); f.add(foot);
    }
    at(B(len, rail, post + 0.01, M.oak, 0.008), 0, footH + h - rail / 2, 0, f);
    at(B(len - 2 * post, 0.045, post - 0.01, M.oak, 0.006), 0, footH + 0.07, 0, f);
    at(B(0.035, h - rail - 0.1, 0.03, M.oak, 0.004), 0, footH + 0.05 + (h - rail - 0.05) / 2, 0, f);
    const n = 9, y0 = footH + 0.11, y1 = footH + h - rail - 0.02;
    for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n; at(B(len - 2 * post, 0.026, 0.016, M.oak, 0.004), 0, y, 0, f); }
    return f;
  }
  function hook(p, parent) { const hk = mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16, Math.PI), M.blackMatte); hk.position.copy(p); parent.add(hk); return hk; }
  function fenceRun(start, sideSign) {
    // первая секция — от угла мойки к краю плитки, вторая — вдоль дуги
    const pts = [start];
    const Rf = R - 0.12;
    let cur = start.clone();
    for (let k = 0; k < 2; k++) {
      // точка на окружности Rf на расстоянии 1.18 от cur, дальше по направлению «назад»
      let best = null;
      for (let a = 0; a <= 90; a += 0.05) {
        const ang = rad(sideSign < 0 ? 180 - a : a);
        const p = new THREE.Vector2(Math.cos(ang) * Rf, Math.sin(ang) * Rf);
        if (p.y <= cur.y + 0.05) continue;
        const d = p.distanceTo(cur);
        if (Math.abs(d - 1.18) < 0.01) { best = p; break; }
      }
      if (!best) break;
      pts.push(best); cur = best;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const pnl = fencePanel(); onPlan(pnl, mid.x, mid.y, THREE.MathUtils.radToDeg(ang), fenceGrp);
      if (i > 0) { const hk = hook(V(a.x, 0.05 + 0.566 + 0.005, -a.y), fenceGrp); hk.rotation.y = ang + Math.PI / 2; }
    }
  }
  fenceRun(new THREE.Vector2(X.sinkL[0] - 0.03, Y0 + 0.02), -1);
  fenceRun(new THREE.Vector2(X.sinkR[1] + 0.03, Y0 + 0.02), 1);

  // ---------- мусорный бак 240 л на колёсах (для гостей, справа от раздачи) ----------
  {
    const b = new THREE.Group();
    const hgt = 1.0, wb = 0.58, db = 0.68;
    const body = mesh(new THREE.CylinderGeometry(0.5, 0.42, hgt - 0.08, 4, 1), M.binBody);
    body.rotation.y = Math.PI / 4; body.scale.set(wb / 0.707 / 1.0 * 0.707 / 0.5 * 0.5, 1, db / wb * 1); body.position.y = 0.06 + (hgt - 0.08) / 2;
    // проще и точнее — коробка со скруглением
    const bodyB = B(wb, hgt - 0.1, db, M.binBody, 0.04); bodyB.position.y = 0.08 + (hgt - 0.1) / 2; b.add(bodyB);
    void body;
    const lid = B(wb + 0.04, 0.05, db + 0.06, M.binLid, 0.02); lid.position.set(0, hgt + 0.0, 0.01); b.add(lid);
    const handleB = C(0.016, 0.016, wb - 0.06, M.binLid, 12); handleB.rotation.z = Math.PI / 2; handleB.position.set(0, hgt - 0.04, -db / 2 - 0.05); b.add(handleB);
    for (const s of [1, -1]) { const wh = C(0.1, 0.1, 0.05, M.rubber, 28); wh.rotation.z = Math.PI / 2; wh.position.set(s * (wb / 2 - 0.02), 0.1, -db / 2 + 0.04); b.add(wh); }
    at(B(0.08, 0.08, 0.06, M.binBody, 0.02), 0, 0.04, db / 2 - 0.08, b);
    // наклейка
    const lbl = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshPhysicalMaterial({ color: '#e9ece6', roughness: 0.6 })); lbl.position.set(0, 0.68, db / 2 + 0.002); b.add(lbl);
    b.position.set(5.55, 0.006, 0.6); b.rotation.y = -0.35; root.add(b);
  }

  // ---------- люди ----------
  const people = new THREE.Group(); people.name = 'people'; root.add(people);
  const place = (p, x, z, yaw) => { p.position.set(x, 0.006, z); p.rotation.y = yaw; people.add(p); p.updateMatrixWorld(true); return p; };

  // Повар 1 — у гриля, со щипцами
  const c1 = makePerson({ height: 1.8, skin: '#e3b08c', hair: '#2b211b', top: '#f7f7f4', topSleeve: 'rolled', bottom: '#26282c', shoes: '#111', chef: { apron: '#1f2023', hat: 'cap' } },
    { armR: { fwd: 0.95, out: 0.05, elbow: 0.75 }, armL: { fwd: 0.55, out: 0.12, elbow: 1.3 }, lean: 0.14, headPitch: 0.25, legL: { fwd: 0.05 }, legR: { fwd: -0.05 } });
  {
    const gx = -0.901, gy = 4.416, a = rad(11.77);
    const fx = Math.sin(a) * 1, fy = -Math.cos(a); // «вперёд» гриля на плане
    place(c1, gx + fx * 0.72 + Math.cos(a) * -0.12, -(gy + fy * 0.72 + Math.sin(a) * -0.12), Math.atan2(-Math.sin(a), -Math.cos(a)));
    const tg = new THREE.Group(); at(B(0.012, 0.32, 0.006, M.steel, 0.002), 0, -0.14, 0, tg); at(B(0.012, 0.32, 0.006, M.steel, 0.002), 0.02, -0.14, 0, tg);
    c1.userData.arms[-1].hand.add(tg); tg.position.set(0, -0.06, 0.02); tg.rotation.x = 0.5;
  }
  // Повар 2 — на раздаче, подаёт тарелку гостье
  const c2 = makePerson({ height: 1.7, female: true, skin: '#eec3a3', hair: '#5a3a22', hairStyle: 'bun', top: '#f7f7f4', topSleeve: 'rolled', bottom: '#26282c', shoes: '#111', chef: { apron: '#1f2023', hat: 'toque' } },
    { armL: { fwd: 1.2, out: 0.02, elbow: 0.35 }, armR: { fwd: 0.6, out: 0.1, elbow: 1.2 }, lean: 0.16, headPitch: 0.1, headYaw: -0.1 });
  place(c2, -0.65, -1.12, 0);
  holdLevel(c2, 1, plateWith('shashlik'), new THREE.Vector3(0.0, -0.09, 0.06));

  // Гости
  const g1 = makePerson({ height: 1.66, female: true, skin: '#f0c8a8', hair: '#6b4a2e', hairStyle: 'long', top: '#d4705a', bottomType: 'dress', topSleeve: 'none', shoes: '#e9dfd0' },
    { armR: { fwd: 1.05, out: 0.0, elbow: 0.45 }, armL: { fwd: 0.15, out: 0.06, elbow: 0.5 }, lean: 0.06, headPitch: 0.05, headYaw: 0.1 });
  place(g1, -0.72, 0.36, Math.PI + 0.05);
  const g2 = makePerson({ height: 1.81, skin: '#e3b08c', hair: '#3b2a1e', top: '#7fa6c9', topSleeve: 'short', bottom: '#cdbb98', bottomType: 'shorts', shoes: '#f2f2f2' },
    { armR: { fwd: -0.1, out: 0.1, elbow: 0.3 }, armL: { fwd: 0.4, out: 0.05, elbow: 1.5 }, headPitch: -0.2, headYaw: -0.25, legL: { fwd: 0.06 }, legR: { fwd: -0.04 } });
  place(g2, 0.25, 0.62, Math.PI - 0.25);
  const g3 = makePerson({ height: 1.73, skin: '#e8b996', hair: '#b9b5ae', top: '#f3f0e8', topSleeve: 'short', bottom: '#8b8f96', shoes: '#5a4634', hat: 'panama' },
    { armR: { fwd: 0.75, out: 0.05, elbow: 1.05 }, armL: { fwd: -0.25, out: 0.06, elbow: 0.3 }, legL: { fwd: 0.3, knee: 0.1 }, legR: { fwd: -0.22, knee: 0.35 }, headPitch: 0.15 });
  place(g3, 3.1, 2.3, 0.45);
  holdLevel(g3, -1, plateWith('paella'), new THREE.Vector3(0.0, -0.08, 0.05));
  const g4 = makePerson({ height: 1.68, female: true, skin: '#eec3a3', hair: '#c9a46a', hairStyle: 'ponytail', top: '#ffffff', topSleeve: 'short', bottom: '#2f4a6b', bottomType: 'pants', shoes: '#c79a6a' },
    { armR: { fwd: 0.9, out: 0.05, elbow: 1.25 }, armL: { fwd: 0.05, out: 0.06, elbow: 0.2 }, headYaw: 0.15, legL: { fwd: 0.05 }, legR: { fwd: -0.03, knee: 0.08 } });
  place(g4, -3.0, 2.6, 1.2);
  const cup = new THREE.Group(); at(C(0.04, 0.032, 0.11, new THREE.MeshPhysicalMaterial({ color: '#f1ece2', roughness: 0.5 }), 24), 0, 0.055, 0, cup); at(C(0.042, 0.042, 0.012, new THREE.MeshPhysicalMaterial({ color: '#3a2a20', roughness: 0.5 }), 24), 0, 0.112, 0, cup);
  holdLevel(g4, -1, cup, new THREE.Vector3(0, -0.12, 0.03));
  const g5 = makePerson({ height: 1.78, skin: '#d9a47f', hair: '#1e1a17', top: '#6f7a4a', topSleeve: 'short', bottom: '#3a4a63', shoes: '#2a2a2a' },
    { armR: { fwd: 0.85, out: 0.05, elbow: 1.0 }, armL: { fwd: 0.6, out: 0.1, elbow: 1.3 }, headYaw: -0.1, headPitch: 0.1, legL: { fwd: 0.04 }, legR: { fwd: -0.06 } });
  place(g5, -2.2, 3.05, -2.0);
  holdLevel(g5, -1, plateWith('shashlik'), new THREE.Vector3(0, -0.08, 0.05));

  return { root, R };
}
