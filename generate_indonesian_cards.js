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
  mbr5Size = 21,
  eraseResidual = true
}) {
  const leftStripWidth = 6.5;
  const rx = 16;

  const nameY = boxTop + 43;
  const roleY = boxTop + 76;
  const lineY = boxTop + 100;
  const wishLine1Y = boxTop + 140;
  const wishLine2Y = boxTop + 174;
  const mbr5Y = boxTop + 238;

  const eraseRect = eraseResidual ? `
    <!-- Erase any residual old template text below the box seamlessly -->
    <rect x="0" y="${boxTop + boxHeight - 20}" width="515" height="110" fill="url(#trackBlend)" />
  ` : '';

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

      ${eraseRect}

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

const CARDS_THIS_WEEK = [
  {
    tgl: '19/10',
    baseFile: 'andina_rezana_mandasari.jpg',
    name: 'ANDINA REZANA MANDASARI',
    jabatan: 'MKA Bogor Warung Jambu 1',
    boxTop: 366,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 27,
    roleSize: 19,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0109.jpg', 'EMP-0458.jpg', 'andina_rezana_mandasari.jpg', 'nip_1284449196.jpg']
  },
  {
    tgl: '20/10',
    baseFile: 'qori_ah_yanter.jpg',
    name: "QORI'AH YANTER",
    jabatan: 'MKA Jakarta Universitas Pancasila 1',
    boxTop: 356,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 18,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0485.jpg', 'EMP-0259.jpg', 'qori_ah_yanter.jpg', 'nip_2603894494.jpg']
  },
  {
    tgl: '21/10',
    baseFile: 'dedy_imam_setiawan.jpg',
    name: 'DEDY IMAM SETIAWAN',
    jabatan: 'MBM Jakarta Saharjo 1',
    boxTop: 388,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 19,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0126.jpg', 'dedy_imam_setiawan.jpg', 'nip_1585583198.jpg']
  },
  {
    tgl: '21/10',
    baseFile: 'dharmawan_indra_wicaksana.jpg',
    name: 'DHARMAWAN INDRA WICAKSANA',
    jabatan: 'MKA Bogor Klapanunggal 1',
    boxTop: 466,
    boxWidth: 478,
    boxHeight: 270,
    nameSize: 24,
    roleSize: 18.5,
    wishSize: 21,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0478.jpg', 'dharmawan_indra_wicaksana.jpg', 'nip_2502838089.jpg']
  },
  {
    tgl: '22/10',
    baseFile: 'silvana_rahmawati.jpg',
    name: 'SILVANA RAHMAWATI',
    jabatan: 'MKA Depok Jatijajar 1',
    boxTop: 366,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 19,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0203.jpg', 'silvana_rahmawati.jpg', 'nip_1289453979.jpg']
  },
  {
    tgl: '22/10',
    baseFile: 'frahesa_oktafia_rofah.jpg',
    name: 'FRAHESA OKTAFIA ROFAH',
    jabatan: 'MKA Bogor Nirwana Residence 1',
    boxTop: 366,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 26,
    roleSize: 18,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0446.jpg', 'frahesa_oktafia_rofah.jpg', 'nip_2400819165.jpg']
  },
  {
    tgl: '22/10',
    baseFile: 'anisah_puspita_sari.jpg',
    name: 'ANISAH PUSPITA SARI',
    jabatan: 'SGP Micro Banking Reg V/Jak 3',
    boxTop: 366,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 18.5,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0479.jpg', 'anisah_puspita_sari.jpg', 'nip_2602491630.jpg']
  },
  {
    tgl: '24/10',
    baseFile: 'arifin_parinduri.jpg',
    name: 'ARIFIN PARINDURI',
    jabatan: 'KM Micro Banking Reg V/Jak 3',
    boxTop: 366,
    boxWidth: 495,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 18.5,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: true,
    targets: ['EMP-0127.jpg', 'arifin_parinduri.jpg', 'nip_1085401321.jpg']
  },
  {
    tgl: '24/10',
    baseFile: 'adetya_yandri.jpg',
    name: 'ADETYA YANDRI',
    jabatan: 'MKA Jonggol 1',
    boxTop: 410,
    boxWidth: 485,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 19,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: false,
    targets: ['EMP-0298.jpg', 'adetya_yandri.jpg', 'nip_1592585640.jpg']
  },
  {
    tgl: '25/10',
    baseFile: 'adri_fauzan.jpg',
    name: 'ADRI FAUZAN',
    jabatan: 'SGP Micro Banking Reg V/Jak 3',
    boxTop: 410,
    boxWidth: 485,
    boxHeight: 275,
    nameSize: 28,
    roleSize: 18.5,
    wishSize: 21.5,
    mbr5Size: 21,
    eraseResidual: false,
    targets: ['EMP-0262.jpg', 'adri_fauzan.jpg', 'nip_1991020080.jpg']
  }
];

async function generateAll() {
  const outputDir = path.join('public', 'assets', 'f1_cards');

  for (const item of CARDS_THIS_WEEK) {
    console.log(`Generating card for ${item.name} (${item.tgl} - ${item.jabatan})...`);
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

  console.log('✅ Semua 10 kartu resmi untuk yang ultah minggu ini berhasil digenerate dengan jabatan & unit terbaru!');
}

generateAll();
