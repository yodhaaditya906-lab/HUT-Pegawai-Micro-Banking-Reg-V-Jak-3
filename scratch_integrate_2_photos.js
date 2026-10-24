import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TARGETS = [
  {
    name: 'Muhamad Alpan Buhori',
    empId: 'EMP-0324',
    nip: '1893020033',
    slug: 'muhamad_alpan_buhori',
    driveId: '19p1iWtWYK3RR0EBAe2RldVUDogIRfaFx',
    driveUrl: 'https://drive.google.com/file/d/19p1iWtWYK3RR0EBAe2RldVUDogIRfaFx/view?usp=drive_link',
    tempFile: 'temp_EMP-0324.png',
    crop: { left: 570, top: 160, width: 430, height: 430 }
  },
  {
    name: 'Muhamad Hary Erlangga',
    empId: 'EMP-0325',
    nip: '2193060059',
    slug: 'muhamad_hary_erlangga',
    driveId: '1aPhqCh_QaNLtMf8xaweN5iqDWiM7w0rQ',
    driveUrl: 'https://drive.google.com/file/d/1aPhqCh_QaNLtMf8xaweN5iqDWiM7w0rQ/view?usp=drive_link',
    tempFile: 'temp_EMP-0325.png',
    crop: { left: 570, top: 160, width: 430, height: 430 }
  }
];

const f1CardsDir = path.join('public', 'assets', 'f1_cards');
const sourcePhotosDir = path.join('public', 'assets', 'source_photos');
const scratchDownloadedDir = 'scratch_downloaded_photos';

if (!fs.existsSync(f1CardsDir)) fs.mkdirSync(f1CardsDir, { recursive: true });
if (!fs.existsSync(sourcePhotosDir)) fs.mkdirSync(sourcePhotosDir, { recursive: true });
if (!fs.existsSync(scratchDownloadedDir)) fs.mkdirSync(scratchDownloadedDir, { recursive: true });

async function run() {
  console.log('--- Step 1: Processing F1 Cards & Avatars ---');

  for (const item of TARGETS) {
    console.log(`\nProcessing ${item.name} (${item.empId})...`);
    const srcBuf = fs.readFileSync(item.tempFile);

    // Save to scratch_downloaded_photos
    fs.writeFileSync(path.join(scratchDownloadedDir, `${item.name}.png`), srcBuf);

    // 1. High quality JPEG (quality 96, 4:4:4 chroma)
    const jpgBuf = await sharp(srcBuf)
      .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const jpgTargets = [
      `${item.empId}.jpg`,
      `${item.slug}.jpg`,
      item.nip ? `nip_${item.nip}.jpg` : null
    ].filter(Boolean);

    for (const file of jpgTargets) {
      fs.writeFileSync(path.join(f1CardsDir, file), jpgBuf);
      console.log(`  -> Saved Card JPG: ${file}`);
    }

    // PNG targets
    const pngTargets = [
      `${item.empId}.png`,
      `${item.slug}.png`
    ];
    for (const file of pngTargets) {
      fs.writeFileSync(path.join(f1CardsDir, file), srcBuf);
      console.log(`  -> Saved Card PNG: ${file}`);
    }

    // 2. Face avatar crop to source_photos
    const avatarPath = path.join(sourcePhotosDir, `${item.empId}.jpg`);
    await sharp(srcBuf)
      .extract(item.crop)
      .resize(400, 400)
      .jpeg({ quality: 95 })
      .toFile(avatarPath);
    console.log(`  -> Saved Avatar: ${avatarPath}`);
  }

  console.log('\n--- Step 2: Updating card_overrides.json ---');
  const overrideFiles = ['data/card_overrides.json', 'public/data/card_overrides.json'];
  for (const oFile of overrideFiles) {
    let overrides = {};
    if (fs.existsSync(oFile)) {
      overrides = JSON.parse(fs.readFileSync(oFile, 'utf8'));
    }
    for (const item of TARGETS) {
      overrides[item.name] = {
        empId: item.empId,
        nip: item.nip,
        driveId: item.driveId,
        kartu: `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w1200`,
        driveUrl: item.driveUrl,
        cardAsset: `assets/f1_cards/${item.empId}.jpg`
      };
    }
    fs.writeFileSync(oFile, JSON.stringify(overrides, null, 2), 'utf8');
    console.log(`  -> Updated ${oFile}`);
  }

  console.log('\n--- Step 3: Updating employees.json ---');
  const employeeFiles = ['data/employees.json', 'public/data/employees.json'];
  for (const empFile of employeeFiles) {
    if (!fs.existsSync(empFile)) continue;
    const emps = JSON.parse(fs.readFileSync(empFile, 'utf8'));
    for (const item of TARGETS) {
      const emp = emps.find(e => e.id === item.empId || (item.nip && e.nip === item.nip));
      if (emp) {
        emp.kartu = `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w1200`;
        console.log(`  -> Updated ${emp.id} (${emp.nama}): kartu set to Drive thumbnail`);
      } else {
        console.warn(`  -> Warning: Employee ${item.empId} not found in ${empFile}`);
      }
    }
    fs.writeFileSync(empFile, JSON.stringify(emps, null, 2), 'utf8');
    console.log(`  -> Updated ${empFile}`);
  }

  console.log('\n--- Step 4: Cleanup temporary test files ---');
  const tempFiles = [
    'temp_EMP-0324.png',
    'temp_EMP-0325.png',
    'preview_alpan.jpg',
    'preview_hary.jpg',
    'test_face_alpan.jpg',
    'test_face_hary.jpg',
    'test_face_alpan2.jpg',
    'test_face_hary2.jpg',
    'test_face_alpan3.jpg',
    'test_face_hary3.jpg'
  ];
  for (const f of tempFiles) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`  -> Removed ${f}`);
    }
  }

  console.log('\n Integration complete!');
}

run();
