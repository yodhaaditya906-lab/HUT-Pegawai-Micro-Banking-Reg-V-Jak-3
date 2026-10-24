import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MAPPINGS = [
  {
    nameInDrive: 'ADETYA YANDRI.png',
    driveId: '1gV-OsgQyM2susbN3TmnLLcx2JQ8IVjr2',
    empId: 'EMP-0298',
    aliasIds: ['EMP-0360'],
    nama: 'ADETYA YANDRI',
    nip: '1592585640',
    slug: 'adetya_yandri',
    crop: { left: 580, top: 180, width: 370, height: 370 }
  },
  {
    nameInDrive: 'Adri Fauzan.png',
    driveId: '19noj3JJfVDNnfM2OZKvIePQWz7mS2icF',
    empId: 'EMP-0262',
    aliasIds: ['EMP-0429'],
    nama: 'Adri Fauzan',
    nip: '1991020080',
    slug: 'adri_fauzan',
    crop: { left: 580, top: 170, width: 370, height: 370 }
  },
  {
    nameInDrive: 'Anisah Puspita Sari.png',
    driveId: '1YipgKsIS8GVpl4GO-TEhg9yfxcCjObrA',
    empId: 'EMP-0479',
    aliasIds: [],
    nama: 'Anisah Puspita Sari',
    nip: '2602491630',
    slug: 'anisah_puspita_sari',
    crop: { left: 580, top: 150, width: 370, height: 370 }
  },
  {
    nameInDrive: 'Arifin Parinduri.png',
    driveId: '1HOSuFIKeTEd0EsZDUUo8j5BV_15eEK5D',
    empId: 'EMP-0127',
    aliasIds: [],
    nama: 'Arifin Parinduri',
    nip: '1085401321',
    slug: 'arifin_parinduri',
    crop: { left: 590, top: 150, width: 370, height: 370 }
  },
  {
    nameInDrive: 'DEDY IMAM SETIAWAN.png',
    driveId: '1ZxBojw1O1zroB09irWLUN9bo3aesX13T',
    empId: 'EMP-0126',
    aliasIds: [],
    nama: 'DEDY IMAM SETIAWAN',
    nip: '1585583198',
    slug: 'dedy_imam_setiawan',
    crop: { left: 460, top: 130, width: 280, height: 280 }
  },
  {
    nameInDrive: 'DHARMAWAN INDRA WICAKSANA.png',
    driveId: '11ffnIZgUfRJzp_Gh6_KntYc_xeABzbsq',
    empId: 'EMP-0478',
    aliasIds: [],
    nama: 'DHARMAWAN INDRA WICAKSANA',
    nip: '2502838089',
    slug: 'dharmawan_indra_wicaksana',
    crop: { left: 470, top: 130, width: 280, height: 280 }
  },
  {
    nameInDrive: 'Ernawati.jpg',
    driveId: '1UdFSclrkb6GOggA2RP7tIb3-EPc_pqvz',
    empId: 'EMP-0178',
    aliasIds: [],
    nama: 'Ernawati',
    nip: '1288190083',
    slug: 'ernawati',
    crop: { left: 1100, top: 180, width: 640, height: 640 }
  },
  {
    nameInDrive: 'Frahesa Oktafia Rofah.png',
    driveId: '1XEW0Z8ybojMNxupnwLA9cegHuForOaWn',
    empId: 'EMP-0446',
    aliasIds: [],
    nama: 'Frahesa Oktafia Rofah',
    nip: '2400819165',
    slug: 'frahesa_oktafia_rofah',
    crop: { left: 470, top: 130, width: 280, height: 280 }
  },
  {
    nameInDrive: 'Qori ah Yanter.png',
    driveId: '1JeQsqKhOLgjVSEiAAwIx5eFfeScKkU8s',
    empId: 'EMP-0485',
    aliasIds: ['EMP-0259'],
    nama: 'Qori ah Yanter',
    nip: '2603894494',
    slug: 'qori_ah_yanter',
    crop: { left: 470, top: 130, width: 280, height: 280 }
  },
  {
    nameInDrive: 'Silvana Rahmawati.png',
    driveId: '1IE4PCy45WdSB-K8VFe7HTYgCji3ecdhJ',
    empId: 'EMP-0203',
    aliasIds: [],
    nama: 'Silvana Rahmawati',
    nip: '1289453979',
    slug: 'silvana_rahmawati',
    crop: { left: 460, top: 150, width: 280, height: 280 }
  }
];

const f1CardsDir = path.join('public', 'assets', 'f1_cards');
const sourcePhotosDir = path.join('public', 'assets', 'source_photos');

if (!fs.existsSync(f1CardsDir)) fs.mkdirSync(f1CardsDir, { recursive: true });
if (!fs.existsSync(sourcePhotosDir)) fs.mkdirSync(sourcePhotosDir, { recursive: true });

async function processAll() {
  console.log('--- Step 1: Processing Cards & Avatars ---');

  for (const item of MAPPINGS) {
    const srcFile = path.join('scratch_downloaded_photos', item.nameInDrive);
    if (!fs.existsSync(srcFile)) {
      console.error(`Missing source file: ${srcFile}`);
      continue;
    }

    console.log(`\nProcessing ${item.nama} (${item.empId})...`);

    // 1. Generate full high-quality JPEG buffer
    const cardJpgBuffer = await sharp(srcFile)
      .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
      .toBuffer();

    // Target files in public/assets/f1_cards/
    const targets = [
      `${item.empId}.jpg`,
      `${item.slug}.jpg`,
      item.nip && item.nip !== '-' ? `nip_${item.nip}.jpg` : null,
      ...item.aliasIds.map(id => `${id}.jpg`)
    ].filter(Boolean);

    for (const t of targets) {
      const outPath = path.join(f1CardsDir, t);
      fs.writeFileSync(outPath, cardJpgBuffer);
      console.log(`  -> Card saved: ${t} (${cardJpgBuffer.length} bytes)`);
    }

    // Also copy uncompressed PNG if source was PNG
    if (item.nameInDrive.endsWith('.png')) {
      const pngTargets = [
        `${item.empId}.png`,
        `${item.slug}.png`
      ];
      for (const pt of pngTargets) {
        fs.copyFileSync(srcFile, path.join(f1CardsDir, pt));
      }
    }

    // 2. Crop Face Avatar and save to source_photos
    const avatarPath = path.join(sourcePhotosDir, `${item.empId}.jpg`);
    await sharp(srcFile)
      .extract(item.crop)
      .resize(400, 400)
      .jpeg({ quality: 95 })
      .toFile(avatarPath);
    console.log(`  -> Avatar saved: ${item.empId}.jpg (face crop)`);

    for (const aliasId of item.aliasIds) {
      const aliasAvatar = path.join(sourcePhotosDir, `${aliasId}.jpg`);
      fs.copyFileSync(avatarPath, aliasAvatar);
    }
  }

  // Step 2: Update employees.json in data/ and public/data/
  console.log('\n--- Step 2: Updating employees.json database ---');
  const filesToUpdate = ['data/employees.json', 'public/data/employees.json'];

  for (const jsonFile of filesToUpdate) {
    if (!fs.existsSync(jsonFile)) continue;
    const emps = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    for (const item of MAPPINGS) {
      const emp = emps.find(e => e.id === item.empId || (item.aliasIds.length && item.aliasIds.includes(e.id)));
      if (emp) {
        emp.kartu = `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w1200`;
        // Keep or update foto
        console.log(`  Updated ${emp.id} (${emp.nama}): kartu set to Drive thumbnail`);
      }
    }

    fs.writeFileSync(jsonFile, JSON.stringify(emps, null, 2), 'utf8');
    console.log(`Successfully updated ${jsonFile}`);
  }

  console.log('\n✅ All 10 photos successfully integrated into the website!');
}

processAll();
