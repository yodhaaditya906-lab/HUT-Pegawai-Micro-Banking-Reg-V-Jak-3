import sharp from 'sharp';
import cp from 'child_process';
import fs from 'fs';
import path from 'path';

function createLegibleCardSvg({
  name,
  jabatan,
  boxTop = 366,
  boxWidth = 495,
  boxHeight = 275,
  nameSize = 28,
  roleSize = 19.5,
  wishSize = 21.5,
  mbr5Size = 21
}) {
  const leftStripWidth = 6.5;
  const rx = 16;

  const nameY = boxTop + 43;
  const roleY = boxTop + 76;
  const lineY = boxTop + 100;
  const wishLine1Y = boxTop + 140;
  const wishLine2Y = boxTop + 174;
  const mbr5Y = boxTop + 238;

  return Buffer.from(`
    <svg width="896" height="1200" viewBox="0 0 896 1200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Seamless patch that covers any residual old template text/border below the box -->
        <linearGradient id="trackBlend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020B1C" />
          <stop offset="35%" stop-color="#041224" />
          <stop offset="70%" stop-color="#061830" />
          <stop offset="100%" stop-color="#081F3C" />
        </linearGradient>

        <clipPath id="boxClip">
          <rect x="0" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="${rx}" ry="${rx}" />
        </clipPath>
      </defs>

      <!-- Erase any residual old template text below the box seamlessly -->
      <rect x="0" y="${boxTop + boxHeight - 20}" width="515" height="110" fill="url(#trackBlend)" />

      <!-- Main Compact Box Container -->
      <g clip-path="url(#boxClip)">
        <rect x="0" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" fill="#020B1C" />
        <rect x="0" y="${boxTop}" width="${leftStripWidth}" height="${boxHeight}" fill="#FEB800" />
      </g>

      <!-- Outer Box Border with Subtle Glow -->
      <rect x="0.75" y="${boxTop + 0.75}" width="${boxWidth - 1.5}" height="${boxHeight - 1.5}" rx="${rx}" ry="${rx}" fill="none" stroke="#38BDF8" stroke-width="1.5" stroke-opacity="0.35" />

      <!-- Employee Full Name (Large, Crisp & Bold) -->
      <text x="32" y="${nameY}" font-family="'Plus Jakarta Sans', Arial, Helvetica, sans-serif" font-size="${nameSize}" font-weight="800" fill="#FFFFFF" letter-spacing="0.4">${name}</text>

      <!-- Job Title / Branch Unit (Sky Blue) -->
      <text x="32" y="${roleY}" font-family="'Plus Jakarta Sans', Arial, Helvetica, sans-serif" font-size="${roleSize}" font-weight="600" fill="#38BDF8">${jabatan}</text>

      <!-- Subtle Horizontal Divider Line -->
      <line x1="32" y1="${lineY}" x2="${boxWidth - 28}" y2="${lineY}" stroke="#1E3A5F" stroke-width="1.2" stroke-opacity="0.85" />

      <!-- Indonesian Birthday Wish (Large, Clear & Effortless to read without zoom) -->
      <text x="32" y="${wishLine1Y}" font-family="'Plus Jakarta Sans', Arial, Helvetica, sans-serif" font-size="${wishSize}" font-style="italic" fill="#E2E8F0">Semoga senantiasa diberikan kesehatan,</text>
      <text x="32" y="${wishLine2Y}" font-family="'Plus Jakarta Sans', Arial, Helvetica, sans-serif" font-size="${wishSize}" font-style="italic" fill="#E2E8F0">kebahagiaan, dan kesuksesan yang berlimpah.</text>

      <!-- Signature Tag (- M B R 5 - in Mandiri Gold) -->
      <text x="32" y="${mbr5Y}" font-family="'Plus Jakarta Sans', Arial, Helvetica, sans-serif" font-size="${mbr5Size}" font-weight="800" fill="#FEB800" letter-spacing="3">- M B R 5 -</text>
    </svg>
  `);
}

const CARDS = [
  {
    baseFile: 'andina_rezana_mandasari.jpg',
    name: 'ANDINA REZANA MANDASARI',
    jabatan: 'MKA Bogor Warung Jambu 1',
    boxTop: 366,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 27,
    roleSize: 19.5,
    wishSize: 21.5,
    mbr5Size: 21,
    targets: ['EMP-0109.jpg', 'EMP-0458.jpg', 'andina_rezana_mandasari.jpg', 'nip_1284449196.jpg']
  },
  {
    baseFile: 'dedy_imam_setiawan.jpg',
    name: 'DEDY IMAM SETIAWAN',
    jabatan: 'MBM Jakarta Saharjo 1',
    boxTop: 388,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 19.5,
    wishSize: 21.5,
    mbr5Size: 21,
    targets: ['EMP-0126.jpg', 'dedy_imam_setiawan.jpg', 'nip_1585583198.jpg']
  },
  {
    baseFile: 'ernawati.jpg',
    name: 'ERNAWATI',
    jabatan: 'SGP Depok Cinangka 2',
    boxTop: 478,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 19.5,
    wishSize: 21.5,
    mbr5Size: 21,
    targets: ['EMP-0178.jpg', 'EMP-0173.jpg', 'ernawati.jpg', 'nip_1288190083.jpg']
  },
  {
    baseFile: 'dharmawan_indra_wicaksana.jpg',
    name: 'DHARMAWAN INDRA WICAKSANA',
    jabatan: 'MKA Bogor Klapanunggal 1',
    boxTop: 466,
    boxWidth: 478,
    boxHeight: 270,
    nameSize: 24.5,
    roleSize: 19,
    wishSize: 21,
    mbr5Size: 21,
    targets: ['EMP-0478.jpg', 'dharmawan_indra_wicaksana.jpg', 'nip_2502838089.jpg']
  },
  {
    baseFile: 'qori_ah_yanter.jpg',
    name: "QORI'AH YANTER",
    jabatan: 'MKA Jakarta Universitas Pancasila 1',
    boxTop: 356,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 19.5,
    wishSize: 21.5,
    mbr5Size: 21,
    targets: ['EMP-0485.jpg', 'EMP-0259.jpg', 'qori_ah_yanter.jpg', 'nip_2603894494.jpg']
  }
];

async function generateAll() {
  const outputDir = path.join('public', 'assets', 'f1_cards');

  for (const item of CARDS) {
    console.log(`Generating enlarged legible card for ${item.name}...`);
    const cleanBaseBuffer = cp.execSync(`git show 4bf56a5:public/assets/f1_cards/${item.baseFile}`);

    const svgOverlay = createLegibleCardSvg(item);

    const compositedBuffer = await sharp(cleanBaseBuffer)
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .jpeg({ quality: 96 })
      .toBuffer();

    for (const targetName of item.targets) {
      const targetPath = path.join(outputDir, targetName);
      fs.writeFileSync(targetPath, compositedBuffer);
      console.log(`  -> Saved ${targetName} (${compositedBuffer.length} bytes)`);
    }
  }

  console.log('✅ Semua kartu resmi F1 berhasil diperbarui dengan font ekstra besar, jelas tanpa zoom, dan tidak menutupi tulisan HAPPY BIRTHDAY maupun tokoh!');
}

generateAll();
