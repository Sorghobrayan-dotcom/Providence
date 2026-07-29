import sharp from 'sharp';

const OUTPUT_WIDTH = 1152;
const OUTPUT_HEIGHT = 648;

const SCENES = [
  { source: 'art-drop/397173.png', output: 'src/assets/backgrounds/parvis-anges.webp' },
  { source: 'art-drop/397174.png', output: 'src/assets/backgrounds/couloir-cristaux.webp' },
];

for (const scene of SCENES) {
  const meta = await sharp(scene.source).metadata();
  // Center-crop to the canvas ratio, then downscale — same cover behaviour
  // the renderer would otherwise fake at runtime.
  const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
  let cropWidth = meta.width;
  let cropHeight = Math.round(meta.width / targetRatio);
  if (cropHeight > meta.height) {
    cropHeight = meta.height;
    cropWidth = Math.round(meta.height * targetRatio);
  }
  await sharp(scene.source)
    .extract({
      left: Math.floor((meta.width - cropWidth) / 2),
      top: Math.floor((meta.height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight,
    })
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT)
    .webp({ quality: 82 })
    .toFile(scene.output);
  console.log(`Wrote ${scene.output}`);
}
