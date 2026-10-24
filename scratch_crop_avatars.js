import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const testCrops = [
  { name: 'ADETYA YANDRI.png', left: 560, top: 160, width: 380, height: 380 },
  { name: 'Adri Fauzan.png', left: 550, top: 150, width: 380, height: 380 },
  { name: 'Anisah Puspita Sari.png', left: 550, top: 130, width: 380, height: 380 },
  { name: 'Arifin Parinduri.png', left: 560, top: 130, width: 380, height: 380 },
  { name: 'DEDY IMAM SETIAWAN.png', left: 450, top: 120, width: 280, height: 280 },
  { name: 'DHARMAWAN INDRA WICAKSANA.png', left: 450, top: 120, width: 280, height: 280 },
  { name: 'Ernawati.jpg', left: 1050, top: 130, width: 620, height: 620 },
  { name: 'Frahesa Oktafia Rofah.png', left: 450, top: 120, width: 280, height: 280 },
  { name: 'Qori ah Yanter.png', left: 450, top: 120, width: 280, height: 280 },
  { name: 'Silvana Rahmawati.png', left: 450, top: 140, width: 280, height: 280 }
];

const outDir = 'scratch_crops';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  for (const item of testCrops) {
    const src = path.join('scratch_downloaded_photos', item.name);
    const dest = path.join(outDir, item.name.replace(/\.(png|jpg|jpeg)$/i, '.jpg'));
    await sharp(src)
      .extract({ left: item.left, top: item.top, width: item.width, height: item.height })
      .resize(400, 400)
      .jpeg({ quality: 95 })
      .toFile(dest);
    console.log(`Saved crop for ${item.name}`);
  }
}

run();
