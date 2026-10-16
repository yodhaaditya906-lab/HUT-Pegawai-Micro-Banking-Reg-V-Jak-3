import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function makeCard(empId) {
  const templatePath = path.join('public', 'assets', 'f1_card_clean_template.jpg');
  const photoPath = path.join('public', 'assets', 'source_photos', `${empId}.jpg`);
  const outputPath = path.join('public', 'assets', 'f1_cards', `${empId}.jpg`);

  if (!fs.existsSync(photoPath)) {
    console.log(`No photo for ${empId}`);
    return;
  }

  const drW = 400;
  const drH = 620;

  // 1. Trim whitespace around person
  const trimmed = await sharp(photoPath)
    .trim({ threshold: 10 })
    .resize({ height: 580, width: drW, fit: 'inside' })
    .toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();

  // 2. Put on top of navy background
  const cardBackdrop = await sharp({
    create: {
      width: drW,
      height: drH,
      channels: 4,
      background: { r: 8, g: 24, b: 48, alpha: 0.95 }
    }
  }).png().toBuffer();

  // Composite trimmed person at bottom center of the card
  const personComposite = await sharp(cardBackdrop)
    .composite([{
      input: trimmed,
      top: drH - trimmedMeta.height,
      left: Math.max(0, Math.round((drW - trimmedMeta.width) / 2))
    }])
    .png()
    .toBuffer();

  // 3. Create rounded mask with bottom gradient fade
  const maskSvg = Buffer.from(
    `<svg width="${drW}" height="${drH}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="white" stop-opacity="1" />
          <stop offset="82%" stop-color="white" stop-opacity="1" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${drW}" height="${drH}" rx="24" fill="url(#grad)" />
    </svg>`
  );

  const masked = await sharp(personComposite)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 4. Subtle gold border
  const borderSvg = Buffer.from(
    `<svg width="${drW}" height="${drH}">
      <rect width="${drW - 4}" height="${drH - 4}" x="2" y="2" rx="24" fill="none" stroke="#FFB800" stroke-width="2.5" stroke-opacity="0.6" />
    </svg>`
  );

  await sharp(templatePath)
    .composite([
      { input: masked, top: 160, left: 450 },
      { input: borderSvg, top: 160, left: 450 }
    ])
    .jpeg({ quality: 95 })
    .toFile(outputPath);

  console.log(`Successfully created card for ${empId} -> ${outputPath}`);
}

async function run() {
  const employees = JSON.parse(fs.readFileSync('data/employees.json', 'utf8'));

  function parseBirthday(tgl) {
    if (!tgl) return null;
    if (tgl.includes('/')) {
      const [d, m] = tgl.split('/').map(Number);
      return { day: d, month: m };
    } else if (tgl.includes('-')) {
      const parts = tgl.split('-').map(Number);
      if (parts.length === 3) return { day: parts[2], month: parts[1] };
    }
    return null;
  }

  // Pre-existing AI cards that should NOT be overwritten:
  const preservedAiCards = new Set([
    'EMP-0003', // Rini
    'EMP-0110', // Subakti
    'EMP-0173', // Ernawati
    'EMP-0259', // Qori'ah
    'EMP-0458', // Andina
    'EMP-0489'  // Prabowo
  ]);

  let count = 0;
  for (const emp of employees) {
    const b = parseBirthday(emp.tanggalLahir);
    if (!b) continue;
    const isOct = b.month === 10 && b.day >= 16;
    const isNov = b.month === 11 && b.day <= 16;
    if (isOct || isNov) {
      if (preservedAiCards.has(emp.id)) {
        continue;
      }
      try {
        await makeCard(emp.id);
        count++;
      } catch (e) {
        console.error(`Error for ${emp.id}: ${e.message}`);
      }
    }
  }
  console.log(`Successfully generated cards for ${count} employees!`);
}

run();
