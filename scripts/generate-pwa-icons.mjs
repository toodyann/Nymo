import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../public/pwa/favicon-dark.png', import.meta.url);
const OUT_192 = new URL('../public/pwa/icon-192.png', import.meta.url);
const OUT_512 = new URL('../public/pwa/icon-512.png', import.meta.url);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function buildIcon(size, { insetRatio = 0.22 } = {}) {
  const inset = Math.round(size * clamp(insetRatio, 0.05, 0.45));
  const logoSize = Math.max(1, size - inset * 2);

  const logo = await sharp(fileURLToPath(SRC))
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#000000'
    }
  });

  return base
    .composite([{ input: logo, left: inset, top: inset }])
    .png()
    .toFile(fileURLToPath(size === 192 ? OUT_192 : OUT_512));
}

async function main() {
  await buildIcon(192, { insetRatio: 0.22 });
  await buildIcon(512, { insetRatio: 0.22 });
  console.log('PWA icons generated.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

