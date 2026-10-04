// Стилизованные фигуры людей (повара и гости) из примитивов, с позами
import * as THREE from 'three';

const mats = new Map();
export function mat(color, rough = 0.8, extra = {}) {
  const key = color + '|' + rough + '|' + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, ...extra }));
  return mats.get(key);
}
const fabric = (color, rough = 0.9) => mat(color, rough);

// капсула с разными радиусами концов; верх в 0, низ в -len
function taper(len, r0, r1, seg = 24) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(t) * r1, -len + Math.sin(t) * r1)); }
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(t) * r0, Math.sin(t) * r0)); }
  return new THREE.LatheGeometry(pts, seg);
}
// тело вращения по профилю [[y, r], ...] (снизу вверх), сплющенное по глубине
function lathe(profile, depth = 0.62, seg = 40) {
  const g = new THREE.LatheGeometry(profile.map(([y, r]) => new THREE.Vector2(r, y)), seg);
  g.scale(1, 1, depth);
  return g;
}
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; }

const SKIN = ['#e8b996', '#d9a47f', '#f0c8a8', '#c68f6a'];

/**
 * opts: { height, female, skin, hair, hairStyle: 'short'|'long'|'bun'|'none', top, topSleeve: 'short'|'long'|'rolled',
 *         bottom, bottomType: 'pants'|'shorts'|'dress'|'skirt', shoes, chef: {apron, hat}, hat: 'panama'|null }
 * pose: { armL:{fwd,out,elbow,twist}, armR:{...}, legL:{fwd,knee}, legR:{...}, lean, headYaw, headPitch }
 */
export function makePerson(opts = {}, pose = {}) {
  const o = Object.assign({ height: 1.75, female: false, skin: SKIN[0], hair: '#3b2a1e', hairStyle: 'short',
    top: '#ffffff', topSleeve: 'short', bottom: '#2f3540', bottomType: 'pants', shoes: '#2a2a2a' }, opts);
  const F = o.female;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skinM = mat(o.skin, 0.6);
  const topM = fabric(o.top), botM = fabric(o.bottom), shoeM = mat(o.shoes, 0.5);
  const hairM = mat(o.hair, 0.55);

  const hipY = 0.92, hipX = F ? 0.088 : 0.092;
  // ---------- ноги ----------
  const legs = {};
  for (const side of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(side * hipX, hipY, 0); body.add(hip);
    const thighCovered = o.bottomType === 'pants';
    const thigh = mesh(taper(0.40, F ? 0.092 : 0.095, F ? 0.06 : 0.064), (o.bottomType === 'pants' || o.bottomType === 'shorts') ? botM : skinM);
    hip.add(thigh);
    if (o.bottomType === 'shorts') { const sh = mesh(taper(0.22, 0.104, 0.082), botM); hip.add(sh); thigh.material = skinM; }
    const knee = new THREE.Group(); knee.position.y = -0.41; hip.add(knee);
    const shin = mesh(taper(0.40, F ? 0.056 : 0.062, F ? 0.036 : 0.042), thighCovered ? botM : skinM); knee.add(shin);
    if (thighCovered) { const cuff = mesh(taper(0.38, 0.068, 0.056), botM); knee.add(cuff); }
    const ankle = new THREE.Group(); ankle.position.y = -0.42; knee.add(ankle);
    const shoe = mesh(new THREE.CapsuleGeometry(0.045, 0.17, 6, 16), shoeM);
    shoe.rotation.x = Math.PI / 2; shoe.scale.set(F ? 0.95 : 1.1, 1, 0.75); shoe.position.set(0, -0.045, 0.05); ankle.add(shoe);
    legs[side] = { hip, knee };
  }
  // ---------- туловище ----------
  const spine = new THREE.Group(); spine.position.y = 0.95; body.add(spine);
  const tor = (p) => p.map(([y, r]) => [y - 0.95, r]);
  const lower = F
    ? [[0.84, 0.0], [0.86, 0.15], [0.93, 0.178], [1.0, 0.165], [1.06, 0.14], [1.08, 0.0]]
    : [[0.84, 0.0], [0.86, 0.14], [0.93, 0.163], [1.0, 0.158], [1.06, 0.152], [1.08, 0.0]];
  const upper = F
    ? [[1.0, 0.0], [1.01, 0.145], [1.07, 0.132], [1.15, 0.14], [1.25, 0.158], [1.33, 0.16], [1.41, 0.165], [1.455, 0.13], [1.48, 0.06], [1.49, 0.0]]
    : [[1.0, 0.0], [1.01, 0.158], [1.08, 0.155], [1.18, 0.168], [1.3, 0.183], [1.39, 0.19], [1.45, 0.165], [1.49, 0.07], [1.5, 0.0]];
  const lowerM = (o.bottomType === 'dress') ? topM : botM;
  spine.add(mesh(lathe(tor(lower), 0.66), lowerM));
  spine.add(mesh(lathe(tor(upper), 0.6), topM));
  if (o.bottomType === 'dress' || o.bottomType === 'skirt') {
    const sk = mesh(lathe(tor([[0.48, 0.0], [0.48, 0.225], [0.6, 0.21], [0.76, 0.19], [0.9, 0.175], [1.02, 0.15], [1.06, 0.0]]), 0.78), o.bottomType === 'dress' ? topM : botM);
    sk.material = sk.material.clone(); sk.material.side = THREE.DoubleSide;
    spine.add(sk);
  }
  // фартук повара
  if (o.chef?.apron) {
    const aM = fabric(o.chef.apron, 0.85);
    const ap = mesh(new THREE.CylinderGeometry(0.205, 0.235, 0.52, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84), new THREE.MeshPhysicalMaterial({ color: o.chef.apron, roughness: 0.85, side: THREE.DoubleSide }));
    ap.scale.z = 0.72; ap.position.y = 0.78 - 0.95; spine.add(ap);
    const bib = mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.3, 24, 1, true, -Math.PI * 0.28, Math.PI * 0.56), ap.material);
    bib.scale.z = 0.66; bib.position.y = 1.2 - 0.95; spine.add(bib);
    void aM;
  }
  // ---------- руки ----------
  const arms = {};
  const shY = F ? 1.415 - 0.95 : 1.435 - 0.95, shX = F ? 0.168 : 0.185;
  for (const side of [1, -1]) {
    const sh = new THREE.Group(); sh.position.set(side * shX, shY, -0.005); sh.rotation.order = 'ZXY'; spine.add(sh);
    const longSleeve = o.topSleeve === 'long' || o.topSleeve === 'rolled';
    const upperArm = mesh(taper(0.27, F ? 0.047 : 0.056, F ? 0.036 : 0.042), longSleeve ? topM : skinM); sh.add(upperArm);
    if (!longSleeve && o.topSleeve !== 'none') { const sl = mesh(taper(0.12, F ? 0.054 : 0.062, F ? 0.047 : 0.053), topM); sh.add(sl); }
    const shoulderCap = mesh(new THREE.SphereGeometry(F ? 0.048 : 0.058, 20, 12), o.topSleeve === 'none' ? skinM : topM); sh.add(shoulderCap);
    const elbow = new THREE.Group(); elbow.position.y = -0.28; sh.add(elbow);
    const fore = mesh(taper(0.24, F ? 0.036 : 0.042, F ? 0.026 : 0.03), o.topSleeve === 'long' ? topM : skinM); elbow.add(fore);
    if (o.topSleeve === 'rolled') { const rl = mesh(taper(0.07, F ? 0.046 : 0.052, F ? 0.044 : 0.05), topM); elbow.add(rl); }
    const hand = new THREE.Group(); hand.position.y = -0.255; elbow.add(hand);
    const palm = mesh(new THREE.SphereGeometry(0.046, 16, 12), skinM); palm.scale.set(0.55, 1.1, 0.95); palm.position.y = -0.035; hand.add(palm);
    const thumb = mesh(new THREE.CapsuleGeometry(0.011, 0.03, 4, 8), skinM); thumb.position.set(-side * 0.0, -0.03, 0.03); thumb.rotation.x = 0.5; hand.add(thumb);
    arms[side] = { sh, elbow, hand };
  }
  // ---------- голова ----------
  const neck = mesh(taper(0.09, 0.05, 0.055), skinM); neck.position.y = (F ? 1.56 : 1.58) - 0.95; spine.add(neck);
  const head = new THREE.Group(); head.position.y = (F ? 1.6 : 1.625) - 0.95; spine.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.1, 32, 24), skinM); skull.scale.set(F ? 0.82 : 0.86, 1.08, 0.98); skull.position.y = 0.035; head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(0.075, 24, 16), skinM); jaw.scale.set(F ? 0.95 : 1.05, 0.95, 1); jaw.position.set(0, -0.02, 0.018); head.add(jaw);
  const nose = mesh(new THREE.ConeGeometry(0.014, 0.04, 10), skinM); nose.rotation.x = Math.PI / 2 + 0.25; nose.position.set(0, 0.03, 0.1); head.add(nose);
  for (const s of [1, -1]) { const ear = mesh(new THREE.SphereGeometry(0.022, 10, 8), skinM); ear.scale.set(0.45, 1, 0.7); ear.position.set(s * 0.085, 0.03, -0.005); head.add(ear); }
  // волосы
  if (o.hairStyle !== 'none') {
    const cap = mesh(new THREE.SphereGeometry(0.108, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM);
    cap.scale.set(F ? 0.88 : 0.9, 1.08, 1.04); cap.position.set(0, 0.045, -0.012); cap.rotation.x = -0.32; head.add(cap);
    if (o.hairStyle === 'long') {
      const back = mesh(new THREE.CapsuleGeometry(0.075, 0.2, 8, 20), hairM); back.scale.set(1.15, 1, 0.55); back.position.set(0, -0.06, -0.065); head.add(back);
    } else if (o.hairStyle === 'bun') {
      const bun = mesh(new THREE.SphereGeometry(0.05, 20, 14), hairM); bun.position.set(0, 0.1, -0.09); head.add(bun);
    } else if (o.hairStyle === 'ponytail') {
      const pt = mesh(new THREE.CapsuleGeometry(0.03, 0.16, 6, 12), hairM); pt.position.set(0, -0.02, -0.12); pt.rotation.x = 0.35; head.add(pt);
    }
  }
  if (o.hat === 'panama') {
    const hm = fabric('#d8c9a6', 0.9);
    const brim = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 40), hm); brim.position.y = 0.1; head.add(brim);
    const crown = mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.09, 32), hm); crown.position.y = 0.15; head.add(crown);
    const band = mesh(new THREE.CylinderGeometry(0.101, 0.101, 0.02, 32), mat('#3a3128', 0.8)); band.position.y = 0.115; head.add(band);
  }
  if (o.chef?.hat === 'toque') {
    const hm = fabric('#fbfbf8', 0.85);
    const band = mesh(new THREE.CylinderGeometry(0.1, 0.098, 0.07, 32), hm); band.position.set(0, 0.11, -0.005); head.add(band);
    const puff = mesh(new THREE.SphereGeometry(0.12, 32, 16), hm); puff.scale.set(1, 0.55, 1); puff.position.set(0, 0.17, -0.005); head.add(puff);
  } else if (o.chef?.hat === 'cap') {
    const hm = fabric('#1e1f22', 0.85);
    const cap = mesh(new THREE.SphereGeometry(0.106, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hm); cap.scale.set(0.92, 0.85, 1.02); cap.position.y = 0.06; head.add(cap);
    const visor = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.008, 24, 1, false, -Math.PI / 2, Math.PI), hm); visor.position.set(0, 0.065, 0.075); visor.scale.z = 0.9; head.add(visor);
  }

  // ---------- поза ----------
  const P = Object.assign({ armL: {}, armR: {}, legL: {}, legR: {}, lean: 0, headYaw: 0, headPitch: 0, twist: 0 }, pose);
  const setArm = (side, a) => {
    const { sh, elbow, hand } = arms[side];
    sh.rotation.set(-(a.fwd ?? 0.05), a.twist ?? 0, side * (a.out ?? 0.08));
    elbow.rotation.x = -(a.elbow ?? 0.15);
    hand.rotation.x = -(a.wrist ?? 0);
  };
  setArm(1, P.armL); setArm(-1, P.armR);
  const setLeg = (side, l) => { legs[side].hip.rotation.x = -(l.fwd ?? 0); legs[side].hip.rotation.z = side * (l.out ?? 0.02); legs[side].knee.rotation.x = l.knee ?? 0; };
  setLeg(1, P.legL); setLeg(-1, P.legR);
  spine.rotation.x = P.lean; spine.rotation.y = P.twist;
  head.rotation.set(P.headPitch, P.headYaw, 0);

  root.scale.setScalar(o.height / 1.75);
  root.userData = { arms, legs, head, spine };
  return root;
}

// повесить предмет на руку так, чтобы в мире он был горизонтален (тарелка, стакан)
export function holdLevel(person, side, obj, offset = new THREE.Vector3(0, -0.07, 0.02), worldYaw = 0) {
  person.updateMatrixWorld(true);
  const hand = person.userData.arms[side].hand;
  hand.add(obj);
  obj.position.copy(offset);
  const q = new THREE.Quaternion(); hand.getWorldQuaternion(q);
  const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, worldYaw, 0));
  obj.quaternion.copy(q.invert().multiply(want));
  // компенсируем масштаб фигуры
  obj.scale.setScalar(1 / person.scale.x);
}
