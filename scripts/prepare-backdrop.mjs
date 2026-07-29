import sharp from 'sharp';

const SOURCE = 'src/assets/backgrounds/temple-arena.png';
const OUTPUT = 'src/assets/backgrounds/temple-arena.webp';
const CROP = { left: 0, top: 550, width: 1248, height: 702 };
const OUTPUT_WIDTH = 1152;
const OUTPUT_HEIGHT = 648;

await sharp(SOURCE)
  .extract(CROP)
  .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT)
  .webp({ quality: 82 })
  .toFile(OUTPUT);

console.log(`Wrote ${OUTPUT}`);
