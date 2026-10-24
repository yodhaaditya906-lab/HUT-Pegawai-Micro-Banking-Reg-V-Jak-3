import fs from 'fs';
import path from 'path';

const filesToCheck = [
  'data/employees.json',
  'public/data/employees.json'
];

const targetNames = [
  'ADETYA YANDRI',
  'Adri Fauzan',
  'Anisah Puspita Sari',
  'Arifin Parinduri',
  'DEDY IMAM SETIAWAN',
  'DHARMAWAN INDRA WICAKSANA',
  'Ernawati',
  'Frahesa Oktafia Rofah',
  'Qori ah Yanter',
  'Silvana Rahmawati'
];

for (const f of filesToCheck) {
  if (!fs.existsSync(f)) {
    console.log(`File ${f} does not exist.`);
    continue;
  }
  const emps = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`=== Checking ${f} (Total ${emps.length} records) ===`);
  for (const name of targetNames) {
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const found = emps.filter(e => {
      const eName = (e.nama || '').toLowerCase().replace(/[^a-z]/g, '');
      return eName.includes(cleanName) || cleanName.includes(eName);
    });
    if (found.length > 0) {
      console.log(`Found match for "${name}":`);
      for (const match of found) {
        console.log(`  ID: ${match.id}, Nama: "${match.nama}", Tgl: ${match.tanggalLahir}, Foto: "${match.foto}", Unit: ${match.unitKerja || match.cabang}`);
      }
    } else {
      console.log(`NOT FOUND for "${name}"`);
    }
  }
}
