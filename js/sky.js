// Фон для приморья: берём небо и облака с панорамы, а полосу у горизонта (деревья на фото) заменяем морской дымкой
import * as THREE from 'three';

export function marineBackground(img, { hazeTop = 9, fade = 6 } = {}) {
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const elevRow = (deg) => Math.round((0.5 - deg / 180) * H);
  const yTop = elevRow(hazeTop + fade), yHaze = elevRow(hazeTop), yHor = elevRow(0);
  // цвет дымки — средний цвет неба над зоной замены, слегка высветленный
  const sample = g.getImageData(0, yTop - 6, W, 6).data;
  let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < sample.length; i += 4) { r += sample[i]; gg += sample[i + 1]; b += sample[i + 2]; n++; }
  r /= n; gg /= n; b /= n;
  const haze = `rgb(${Math.min(255, r * 1.06 + 10) | 0},${Math.min(255, gg * 1.05 + 10) | 0},${Math.min(255, b * 1.03 + 8) | 0})`;
  const grd = g.createLinearGradient(0, yTop, 0, yHor);
  grd.addColorStop(0, `rgba(${r | 0},${gg | 0},${b | 0},0)`);
  grd.addColorStop((yHaze - yTop) / (yHor - yTop), haze);
  grd.addColorStop(1, haze);
  g.fillStyle = grd; g.fillRect(0, yTop, W, yHor - yTop + 1);
  // ниже горизонта — цвет моря (почти всё перекроет геометрия)
  g.fillStyle = '#3d6f7c'; g.fillRect(0, yHor, W, H - yHor);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}
