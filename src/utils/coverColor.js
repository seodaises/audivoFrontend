const cache = new Map();
const pending = new Map();

const SAMPLE_SIZE = 24;

function rgbToAccentHex(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  const boostedS = Math.min(1, s * 1.4 + 0.15);
  const clampedL = Math.min(0.55, Math.max(0.22, l));

  const c = (1 - Math.abs(2 * clampedL - 1)) * boostedS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = clampedL - c / 2;
  let [r2, g2, b2] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

function extract(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          count += 1;
        }
        if (count === 0) { cache.set(url, null); resolve(null); return; }

        const color = rgbToAccentHex(r / count, g / count, b / count);
        cache.set(url, color);
        resolve(color);
      } catch {
        cache.set(url, null);
        resolve(null);
      }
    };
    img.onerror = () => { cache.set(url, null); resolve(null); };
    img.src = url;
  });
}
export function getCoverAccentColor(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  if (pending.has(url)) return pending.get(url);

  const promise = extract(url).finally(() => pending.delete(url));
  pending.set(url, promise);
  return promise;
}