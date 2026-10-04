// Летний фудкорт «Санаторий Надежда» — интерактивная 3D-сцена (ПК и iPhone) + фото-режим (path tracing) на ПК
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { buildScene } from './build.js';
import { buildCoast, buildPark, COAST } from './env.js';
import { marineBackground } from './sky.js';
import { buildResort, POOL_HOLE } from './resort.js';
import { mergeStatic } from './optimize.js';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w')) || 0, H = Number(params.get('h')) || 0;
const fixedSize = W > 0 && H > 0;
const saveName = params.get('save');           // чистовой рендер: ?save=имя.png&w=&h=&spp=&view=
const finalMode = !!saveName;
const isMobile = params.get('q') === 'mobile' || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900);
const quality = isMobile ? 'mobile' : 'high';
const $ = (id) => document.getElementById(id);
const loadText = $('loadText');
const step = async (t) => { if (loadText) loadText.textContent = t; await new Promise(r => setTimeout(r, 16)); };

// ---------- рендерер ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: finalMode, powerPreference: 'high-performance' });
renderer.setPixelRatio(fixedSize ? 1 : Math.min(devicePixelRatio, isMobile ? 2 : 1.75));
renderer.toneMapping = { agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping }[params.get('tm') || 'agx'];
renderer.toneMappingExposure = Number(params.get('exp')) || 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 600);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 0.8; controls.maxDistance = 45;
controls.zoomToCursor = !isMobile;

// ---------- окружение: свет неба — HDR парка (солнце вырезано), фон — панорама парка, солнце — направленный свет ----------
await step('небо и свет…');
const SUN_AZ = 0.2 * Math.PI;                 // азимут солнца на обеих панорамах (u≈0.6)
const SUN_EL = THREE.MathUtils.degToRad(Number(params.get('sunel')) || 47);
const sunDir = new THREE.Vector3(Math.cos(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), Math.sin(SUN_AZ) * Math.cos(SUN_EL));
// HDR-панорама упакована в JSON (base64): площадка раздаёт только стандартные типы файлов
const hdrJson = await (await fetch('assets/sky_hdr.json')).json();
const hdrBytes = Uint8Array.from(atob(hdrJson.data), (ch) => ch.charCodeAt(0));
const td = new HDRLoader().setDataType(THREE.FloatType).parse(hdrBytes.buffer);
let hdr = new THREE.DataTexture(td.data, td.width, td.height, THREE.RGBAFormat, THREE.FloatType);
hdr.colorSpace = THREE.LinearSRGBColorSpace; hdr.flipY = true;
hdr.minFilter = hdr.magFilter = THREE.LinearFilter; hdr.generateMipmaps = false;
{
  const d = hdr.image.data, n = d.length / 4;
  for (let i = 0; i < n; i++) {
    const l = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    if (l > 8) { const k = 8 / l; d[i * 4] *= k; d[i * 4 + 1] *= k; d[i * 4 + 2] *= k; }
  }
  // нижняя полусфера (трава на панораме) → нейтральная «плитка», чтобы нержавейка не отливала зелёным
  const w = hdr.image.width, h = hdr.image.height;
  for (let y = Math.floor(h / 2); y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    d[i] = l * 1.04; d[i + 1] = l * 1.0; d[i + 2] = l * 0.93;
  }
  if (isMobile) { // на телефонах нет линейной фильтрации float-текстур — переводим в half float
    const half = new Uint16Array(d.length); for (let i = 0; i < d.length; i++) half[i] = THREE.DataUtils.toHalfFloat(d[i]);
    const t = new THREE.DataTexture(half, hdr.image.width, hdr.image.height, THREE.RGBAFormat, THREE.HalfFloatType);
    t.flipY = hdr.flipY; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; hdr = t;
  }
  hdr.needsUpdate = true;
}
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr;
const ENV = params.get('env') || 'resort';
const bgImg = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'assets/je_gray_park_bg.jpg'; });
let bg;
if (ENV === 'coast') bg = marineBackground(bgImg);
else { bg = new THREE.Texture(bgImg); bg.needsUpdate = true; bg.colorSpace = THREE.SRGBColorSpace; bg.mapping = THREE.EquirectangularReflectionMapping; }
scene.background = bg;
scene.backgroundIntensity = 0.95;

const sun = new THREE.DirectionalLight('#fff4e6', Number(params.get('sun')) || 6.3);
sun.position.copy(sunDir).multiplyScalar(40);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isMobile ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 110 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

// ---------- сцена ----------
await step('шрифт надписи…');
const FONT = { family: '"Playfair Display", Georgia, serif', weight: 800 };
try { await Promise.race([document.fonts.load(`${FONT.weight} 100px "Playfair Display"`, 'САНАТОРИЙ НАДЕЖДА'), new Promise(r => setTimeout(r, 4000))]); } catch (e) { /* запасной шрифт */ }
await step('газон и плитка…');
const grassImg = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'assets/grass.jpg'; });
await step('оборудование и люди…');
const { root } = buildScene(scene, { font: FONT, grassImg, quality, landEdge: ENV === 'coast' ? COAST.landEdge : null, lawnHoles: ENV === 'resort' ? [POOL_HOLE] : [], plaza: ENV === 'resort' ? 'aggregate' : 'pavers' });
await step('деревья…');
if (ENV === 'coast') buildCoast(root, { quality }); else if (ENV === 'resort') buildResort(root, { quality }); else buildPark(root);
await step('оптимизация…');
mergeStatic(root, ['people', 'fence', 'trees']);
const layers = { people: root.getObjectByName('people'), fence: root.getObjectByName('fence'), trees: root.getObjectByName('trees') };

// ---------- объекты: подписи, карточки, перелёт камеры ----------
const ITEMS = [
  { name: 'Стол с мойкой', dims: '2000 × 700 мм, мойка 400 × 400 · 2 шт.', note: 'По краям линии, развёрнуты внутрь кухни. Смеситель на борту.', p: [-4.06, 1.05, -1.6], cam: [-1.9, 1.9, 0.9] },
  { name: 'Стол производственный', dims: '1700 × 700 мм', note: 'Заготовка: доска, нарезка, тарелки.', p: [-2.86, 1.0, -0.54], cam: [-2.2, 2.0, 1.9] },
  { name: 'Стол-холодильник', dims: '1835 × 700 × 860 мм · 2 шт.', note: 'Со стороны гостей — фасад из перфорированной нержавейки с прорезанной надписью «САНАТОРИЙ НАДЕЖДА». Двери — к поварам.', p: [-0.18, 0.55, -0.2], cam: [0.5, 1.2, 2.7] },
  { name: 'Полка двухъярусная', dims: 'над столами-холодильниками · ярусы ≈ +400 и +780 мм', note: 'Металлическая, на стойках. Нижний ярус — раздача готовых блюд, верхний — чистая посуда.', p: [-0.18, 1.55, -0.54], cam: [1.4, 2.1, 1.9] },
  { name: 'Стол производственный', dims: '2100 × 700 мм', note: 'Лоток с шампурами для мангала, терминал оплаты.', p: [2.7, 1.0, -0.54], cam: [2.9, 2.0, 1.9] },
  { name: 'Казан на подставке', dims: 'h 550 мм, Ø 680 мм', note: 'Печь под казан с деревянной крышкой.', p: [-3.355, 0.75, -3.172], cam: [-1.9, 1.7, -1.6] },
  { name: 'Набор для паэльи', dims: 'сковорода Ø 600 мм · баллон 18 л', note: 'Газовая горелка на треноге, баллон со шлангом.', p: [-2.55, 0.9, -3.826], cam: [-1.3, 1.8, -2.0] },
  { name: 'Гриль Weber', dims: '1660 × 680 мм, h 1220 · решётка 680 × 480', note: 'Газовый гриль с боковыми столиками.', p: [-0.9, 1.1, -4.416], cam: [0.2, 1.9, -2.2] },
  { name: 'Вертел', dims: 'l 1800 мм, h 700 мм', note: 'Две треноги, вертел с ручкой. Под ним — жаровня с углями.', p: [1.81, 0.8, -4.24], cam: [1.0, 1.7, -2.2] },
  { name: 'Мангал', dims: '1500 × 600 мм', note: 'Шашлык на шампурах.', p: [3.475, 1.0, -3.102], cam: [1.9, 1.9, -1.6] },
  { name: 'Мобильное ограждение', dims: 'секция 1180 × 566 мм, дуб', note: 'Слева и справа от линии столов, секции сцепляются крюком.', p: [-4.95, 0.75, -1.0], cam: [-6.6, 1.5, 1.6] },
  { name: 'Мусорный бак', dims: '240 л, на колёсах', note: 'Справа от раздачи, со стороны гостей. Место можно сменить.', p: [5.55, 1.15, 0.6], cam: [4.2, 1.7, 3.2] },
  { name: 'Плитка полукругом', dims: 'R 5,2 м (Ø 10,4 м)', note: 'Зона кухни на плитке, раскладка кольцами. Перед линией столов — площадка для гостей из плит мытого бетона, как на дорожках санатория.', p: [0, 0.05, -2.6], cam: [0.2, 10.5, 5.0] },
];
const VIEWS = {
  front:   { pos: [2.5, 1.6, 5.9], target: [-0.5, 1.0, -1.5], fov: 50, label: 'Гости' },
  aerial:  { pos: [6.8, 5.2, 8.6], target: [-0.2, 0.3, -2.2], fov: 46, label: 'Сверху' },
  left:    { pos: [-6.6, 1.65, 4.6], target: [-0.5, 0.9, -1.8], fov: 48, label: 'Слева' },
  kitchen: { pos: [4.3, 1.65, -4.4], target: [-1.2, 0.9, -1.0], fov: 55, label: 'Кухня' },
  panel:   { pos: [2.55, 1.15, 1.95], target: [0.85, 0.62, -0.25], fov: 45, label: 'Фасад' },
  pool:    { pos: [41, 5.2, 25], target: [6, 0.8, -1.5], fov: 50, label: 'От бассейна' },
  top:     { pos: [0.0, 19, -2.17], target: [0.0, 0, -2.2], fov: 40, label: 'План' },
};
// кадрирование под форму экрана: на вертикальном экране сохраняем ширину охвата (шире угол + камера дальше)
function frame(pos, target, fov) {
  const aspect = camera.aspect, ref = 16 / 9;
  if (aspect >= ref * 0.92) return { pos, fov };
  const h = 0.55 * 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * ref); // охват по ширине (на вертикальном экране боками жертвуем)
  let v = 2 * Math.atan(Math.tan(h / 2) / aspect);
  const vMax = THREE.MathUtils.degToRad(62);
  let k = 1;
  if (v > vMax) { v = vMax; k = Math.tan(h / 2) / Math.tan(Math.atan(Math.tan(v / 2) * aspect)); }
  const t = new THREE.Vector3(...target), p = new THREE.Vector3(...pos).sub(t).multiplyScalar(Math.min(k, 1.6)).add(t);
  return { pos: p.toArray(), fov: THREE.MathUtils.radToDeg(v) };
}

let pathTracer = null;
let fly = null;
function flyTo(pos0, target, fov0 = camera.fov, ms = 900) {
  const { pos, fov } = frame(pos0, target, fov0);
  fly = { t0: performance.now(), ms, p0: camera.position.clone(), q0: controls.target.clone(), f0: camera.fov,
    p1: new THREE.Vector3(...pos), q1: new THREE.Vector3(...target), f1: fov };
}
function setViewNow(name) {
  const v = VIEWS[name] || VIEWS.front;
  const f = frame(v.pos, v.target, v.fov);
  camera.position.set(...f.pos); controls.target.set(...v.target); camera.fov = f.fov; camera.updateProjectionMatrix(); controls.update();
  if (pathTracer) pathTracer.updateCamera();
}
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function stepFly(now) {
  if (!fly) return;
  const t = Math.min(1, (now - fly.t0) / fly.ms), k = ease(t);
  camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.q0, fly.q1, k);
  camera.fov = fly.f0 + (fly.f1 - fly.f0) * k; camera.updateProjectionMatrix();
  if (t >= 1) fly = null;
  if (pathTracer) pathTracer.updateCamera();
}

// ---------- размеры ----------
function resize() {
  const w = fixedSize ? W : innerWidth, h = fixedSize ? H : innerHeight;
  renderer.setSize(w, h, !fixedSize);
  if (fixedSize) { const k = Math.min(innerWidth / w, innerHeight / h); Object.assign(renderer.domElement.style, { width: `${w * k}px`, height: `${h * k}px` }); }
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (pathTracer) pathTracer.updateCamera();
}
resize();
setViewNow(params.get('view') || 'front');
addEventListener('resize', resize);
controls.addEventListener('change', () => { if (pathTracer && !fly) pathTracer.updateCamera(); });
controls.addEventListener('start', () => { fly = null; });

// ---------- фото-режим (path tracing) — только ПК ----------
let ptEnabled = finalMode;
const targetSpp = Number(params.get('spp')) || (finalMode ? 1500 : 500);
async function initPT() {
  if (pathTracer) return;
  const { WebGLPathTracer } = await import('three-gpu-pathtracer');
  const pt = new WebGLPathTracer(renderer);
  pt.bounces = 6; pt.transmissiveBounces = 4; pt.filterGlossyFactor = 0.4;
  pt.textureSize.setScalar(Number(params.get('ts')) || 2048);
  pt.multipleImportanceSampling = true;
  if (finalMode) { const t = Number(params.get('tiles')) || 4; pt.tiles.set(t, t); pt.minSamples = 1; pt.renderDelay = 0; pt.fadeDuration = 0; }
  else { pt.tiles.set(1, 1); pt.renderDelay = 300; pt.minSamples = 24; pt.fadeDuration = 700; pt.dynamicLowRes = false; pt.rasterizeScene = true; }
  await new Promise(r => setTimeout(r, 30));
  pt.setScene(scene, camera);
  pathTracer = pt; window.__pt = pt;
}
window.__save = async (name) => {
  if (!finalMode) renderer.render(scene, camera); // без preserveDrawingBuffer снимаем кадр сразу после отрисовки
  const blob = await new Promise(r => renderer.domElement.toBlob(r, 'image/png'));
  return (await fetch('/save/' + name, { method: 'POST', body: blob })).text();
};
window.__setView = setViewNow; window.__camera = camera; window.__controls = controls; window.__scene = scene;

// ---------- интерфейс ----------
const labelsEl = $('labels');
const pins = ITEMS.map((it, i) => {
  const b = document.createElement('button'); b.className = 'pin'; b.type = 'button';
  b.innerHTML = `<span class="n">${i + 1}</span><span class="t">${it.name}</span>`;
  b.setAttribute('aria-label', it.name);
  b.onclick = () => select(i, true); labelsEl.appendChild(b);
  return { el: b, v: new THREE.Vector3(...it.p) };
});
const itemsEl = $('items');
const itemRows = ITEMS.map((it, i) => {
  const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button';
  b.innerHTML = `<span class="n">${i + 1}</span><span><span class="nm">${it.name}</span><span class="dm">${it.dims}</span></span>`;
  b.onclick = () => { select(i, true); closeSheet(); };
  li.appendChild(b); itemsEl.appendChild(li); return li;
});
function select(i, flyCam) {
  pins.forEach((p, k) => p.el.classList.toggle('sel', k === i));
  itemRows.forEach((b, k) => b.classList.toggle('sel', k === i));
  const card = $('card');
  if (i < 0) { card.hidden = true; return; }
  const it = ITEMS[i];
  $('cardName').textContent = `${i + 1}. ${it.name}`; $('cardDims').textContent = it.dims; $('cardNote').textContent = it.note;
  card.hidden = false;
  if (flyCam) {
    flyTo(it.cam, it.p, 50);
  }
  setActiveView(null);
}
$('cardClose').onclick = () => select(-1);

const viewBtns = [];
function setActiveView(name) { viewBtns.forEach(b => b.classList.toggle('on', b.dataset.v === name)); }
for (const host of [$('views'), $('dockViews')]) {
  for (const [k, v] of Object.entries(VIEWS)) {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = v.label; b.dataset.v = k;
    b.onclick = () => { select(-1); flyTo(v.pos, v.target, v.fov); setActiveView(k); };
    host.appendChild(b); viewBtns.push(b);
  }
}
setActiveView(params.get('view') || 'front');

function rebuildPT() { renderer.shadowMap.needsUpdate = true; window.__redraw?.(); if (pathTracer) pathTracer.setScene(scene, camera); }
const toggles = [
  ['Подписи', (on) => { labelsEl.classList.toggle('off', !on); window.__redraw?.(); }],
  ['Люди', (on) => { layers.people.visible = on; rebuildPT(); }],
  ['Ограждение', (on) => { layers.fence.visible = on; rebuildPT(); }],
  ['Деревья', (on) => { layers.trees.visible = on; rebuildPT(); }],
];
for (const [name, fn] of toggles) {
  const b = document.createElement('button'); b.className = 'tg on'; b.type = 'button'; b.textContent = name;
  b.setAttribute('aria-pressed', 'true');
  b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); fn(on); };
  $('toggles').appendChild(b);
}

// мобильная шторка
const panel = $('panel');
function closeSheet() { panel.classList.remove('open'); $('more').textContent = 'Детали'; }
$('more').onclick = () => { const o = panel.classList.toggle('open'); $('more').textContent = o ? 'Закрыть' : 'Детали'; };
$('grab').onclick = closeSheet;

// галерея готовых рендеров
const RENDERS = [['front', 'Вид со стороны гостей'], ['aerial', 'Вид сверху'], ['kitchen', 'Кухня и станции'], ['panel', 'Фасад стола-холодильника'], ['left', 'Вид слева'], ['pool', 'Вид от бассейна'], ['top', 'План']];
const lb = $('lightbox'); let lbIndex = 0; const shots = [];
function openLb(i) { lbIndex = (i + shots.length) % shots.length; $('lbImg').src = shots[lbIndex].src; $('lbImg').alt = shots[lbIndex].alt; lb.hidden = false; }
$('lbClose').onclick = () => { lb.hidden = true; };
$('lbPrev').onclick = () => openLb(lbIndex - 1); $('lbNext').onclick = () => openLb(lbIndex + 1);
lb.onclick = (e) => { if (e.target === lb) lb.hidden = true; };
(async () => {
  for (const [k, alt] of RENDERS) {
    const img = new Image(); img.alt = alt; img.src = `renders/${k}_thumb.jpg`;
    try { await img.decode(); } catch { continue; }
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', alt);
    const idx = shots.length; shots.push({ src: `renders/${k}.jpg`, alt });
    b.appendChild(img); b.onclick = () => openLb(idx); $('gallery').appendChild(b);
  }
  if (!shots.length) $('gallery').closest('.sec').hidden = true;
})();

// подсказка
const hint = $('hint');
hint.textContent = isMobile ? 'Один палец — вращать · два — двигать и приближать' : 'Левая кнопка — вращать · правая — сдвигать · колесо — приближать';
setTimeout(() => hint.classList.add('gone'), 6000);
renderer.domElement.addEventListener('pointerdown', () => hint.classList.add('gone'), { once: true });

// ---------- метки ----------
const tmp = new THREE.Vector3();
function updatePins() {
  if (labelsEl.classList.contains('off')) return;
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  for (const p of pins) {
    tmp.copy(p.v).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
    p.el.style.display = vis ? '' : 'none';
    if (vis) p.el.style.transform = `translate(${((tmp.x + 1) / 2 * w - 13).toFixed(1)}px, ${((1 - tmp.y) / 2 * h - 13).toFixed(1)}px)`;
  }
}

// ---------- запуск ----------
if (finalMode) {
  labelsEl.classList.add('off');
  document.querySelectorAll('.plate,.panel,.dock,.more,.hint').forEach(e => { e.hidden = true; });
  await step('подготовка фото-рендера…');
  await initPT();
}
$('loader').classList.add('done');
window.__done = false;

const batch = (params.get('batch') || '').split(',').filter(Boolean);
let batchIdx = 0, busy = false, currentView = params.get('view') || 'front';
if (finalMode && batch.length) { currentView = batch[batchIdx++]; setViewNow(currentView); pathTracer.updateCamera(); pathTracer.reset(); }
let dirty = true;
const redraw = () => { dirty = true; };
window.__redraw = redraw;
controls.addEventListener('change', redraw);
addEventListener('resize', redraw);
// тени статичной сцены считаем один раз (и после переключения слоёв), а не каждый кадр
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
const mc = new MessageChannel();
mc.port1.onmessage = () => loop();
const tStart = performance.now();
function loop() {
  // чистовой рендер крутится не на requestAnimationFrame — продолжается и в скрытой вкладке
  if (finalMode && !window.__done) setTimeout(() => mc.port2.postMessage(0), 4); else requestAnimationFrame(loop);
  if (finalMode) {
    if (busy) return;
    if (pathTracer.samples < targetSpp) { pathTracer.renderSample(); return; }
    // кадр готов: сохраняем; в пакетном режиме (?batch=a,b,c) переходим к следующему ракурсу
    busy = true;
    const name = batch.length ? `raw_${currentView}.png` : saveName;
    window.__save(name).then(r => {
      window.__saved = r; window.__log = (window.__log || '') + name + ' ' + ((performance.now() - tStart) / 1000).toFixed(0) + 's; ';
      if (batchIdx < batch.length) { currentView = batch[batchIdx++]; setViewNow(currentView); pathTracer.updateCamera(); pathTracer.reset(); busy = false; }
      else { window.__done = true; }
    });
    return;
  }
  // рисуем только когда что-то изменилось: в покое видеокарта не нагружается
  if (fly) { stepFly(performance.now()); dirty = true; }
  if (controls.update()) dirty = true;
  if (!dirty) return;
  dirty = false;
  renderer.render(scene, camera);
  updatePins();
}
loop();
