import fs from 'fs';
import path from 'path';

const employeesFile = 'data/employees.json';
const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

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

const list = [];
for (const emp of employees) {
  const b = parseBirthday(emp.tanggalLahir);
  if (!b) continue;
  const isOct = b.month === 10 && b.day >= 16;
  const isNov = b.month === 11 && b.day <= 16;
  if (isOct || isNov) {
    const cardPath = path.join('public', 'assets', 'f1_cards', `${emp.id}.jpg`);
    const cardExists = fs.existsSync(cardPath);
    list.push({
      id: emp.id,
      nama: emp.nama,
      jabatan: emp.jabatan,
      tgl: emp.tanggalLahir,
      day: b.day,
      month: b.month,
      cardExists: cardExists,
      foto: emp.foto
    });
  }
}

list.sort((a, b) => {
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
});

console.log('Total 30 Days Employees:', list.length);
console.log('Already generated:', list.filter(x => x.cardExists).length);
console.log('Need generation:', list.filter(x => !x.cardExists).length);

const ungenerated = list.filter(x => !x.cardExists);
console.log('\n--- UNGENERATED LIST (NEXT 30 DAYS: OCT 16 - NOV 16) ---');
ungenerated.forEach((x, i) => {
  console.log(`${i + 1}. [${x.id}] ${x.nama} (${x.tgl}) - ${x.jabatan}`);
});
