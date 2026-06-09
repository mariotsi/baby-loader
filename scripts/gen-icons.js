const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function gen() {
  const files = [
    { src: 'public/icon-72.svg', out: 'public/icon-72.png', size: 72 },
    { src: 'public/icon-192.svg', out: 'public/icon-192.png', size: 192 },
    { src: 'public/icon-512.svg', out: 'public/icon-512.png', size: 512 },
  ];

  for (const f of files) {
    const srcPath = path.resolve(f.src);
    const outPath = path.resolve(f.out);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Source not found: ${srcPath}`);
      continue;
    }
    try {
      const svgBuffer = fs.readFileSync(srcPath);
      await sharp(svgBuffer)
        .resize(f.size, f.size, { fit: 'contain' })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log(`Wrote ${outPath}`);
    } catch (err) {
      console.error(`Failed to convert ${srcPath}:`, err);
    }
  }
}

gen();
