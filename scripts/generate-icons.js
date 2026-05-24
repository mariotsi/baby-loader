#!/usr/bin/env node
// Run this script once to generate the icon PNG files
// Requires: npm install canvas (or use any PNG of 192x192 and 72x72)
// Alternatively, use any image editor to create:
//   - public/icon-72.png  (72x72)
//   - public/icon-192.png (192x192)
//   - public/icon-512.png (512x512)

// Simple SVG-based approach — works without canvas:
const fs = require('fs');
const path = require('path');

const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.25}" fill="#0a0a0a"/>
  <rect width="${size}" height="${size}" rx="${size * 0.25}" fill="none" stroke="#2a2a2a" stroke-width="1"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.3}" fill="#e8d5a3"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.15}" fill="#0a0a0a"/>
</svg>`;

// Save SVGs (browsers and most systems accept SVG as icons)
const publicDir = path.join(__dirname, '../public');

fs.writeFileSync(path.join(publicDir, 'icon-72.svg'), svgTemplate(72));
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svgTemplate(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svgTemplate(512));

console.log('✅ SVG icons generated in public/');
console.log('For production, convert to PNG using: https://svgtopng.com');
console.log('Or use sharp: npm install sharp && node scripts/convert-icons.js');
