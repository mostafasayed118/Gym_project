// Script to generate PNG icons from SVG
// Run: node scripts/generate-icons.js
// Requires: npm install sharp (dev dependency)
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, "..", "public", "icons", "icon.svg");
const outputDir = path.join(__dirname, "..", "public", "icons");

async function generateIcons() {
  try {
    const sharp = require("sharp");
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
      console.log(`Generated: icon-${size}x${size}.png`);
    }

    // Generate shortcut icons
    const shortcutSizes = [96];
    for (const size of shortcutSizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `shortcut-workout.png`));
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `shortcut-dashboard.png`));
      console.log(`Generated shortcut icons`);
    }

    console.log("All icons generated!");
  } catch {
    console.error(
      "Sharp not installed. Install it with: npm install sharp --save-dev",
    );
    console.log("For now, you can use the SVG icon or generate PNGs manually.");
    console.log("Online tool: https://maskable.app/ or https://app-manifest.mbrgl.nl/");
  }
}

generateIcons();
