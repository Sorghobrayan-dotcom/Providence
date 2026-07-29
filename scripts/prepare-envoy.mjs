import sharp from 'sharp';

const SOURCE = 'art-drop/397175.png';
const OUTPUT = 'src/assets/sprites/envoy.webp';
const OUTPUT_HEIGHT = 260; // ~2.7x the on-screen size, keeps edges crisp when scaled down

// White-background removal tuned for this plate: the background is pure
// low-chroma white, while the sword's glow is a pale *yellow* (blue channel
// sags), so keying on "bright AND colourless" erases the backdrop without
// amputating the glow.
const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const min = Math.min(r, g, b);
  const chroma = Math.max(r, g, b) - min;
  if (chroma < 14) {
    if (min > 232) {
      data[i + 3] = 0;
    } else if (min > 210) {
      // feather the last few grey levels so the cut edge doesn't alias
      data[i + 3] = Math.round(255 * ((232 - min) / 22));
    }
  }
}

let minX = info.width;
let minY = info.height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 8) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const pad = 6;
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const width = Math.min(info.width, maxX + pad) - left;
const height = Math.min(info.height, maxY + pad) - top;

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .extract({ left, top, width, height })
  .resize({ height: OUTPUT_HEIGHT })
  .webp({ quality: 90, alphaQuality: 85 })
  .toFile(OUTPUT);

console.log(`Wrote ${OUTPUT} (cropped ${width}x${height} from ${info.width}x${info.height})`);
