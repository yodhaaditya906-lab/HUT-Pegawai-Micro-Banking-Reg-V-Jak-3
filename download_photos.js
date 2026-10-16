import fs from 'fs';
import path from 'path';

const dir = path.join('public', 'assets', 'source_photos');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

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

const ungenerated = [];
for (const emp of employees) {
  const b = parseBirthday(emp.tanggalLahir);
  if (!b) continue;
  const isOct = b.month === 10 && b.day >= 16;
  const isNov = b.month === 11 && b.day <= 16;
  const cardExists = fs.existsSync(path.join('public', 'assets', 'f1_cards', `${emp.id}.jpg`));
  if ((isOct || isNov) && !cardExists && emp.foto) {
    ungenerated.push(emp);
  }
}

console.log(`Downloading source photos for ${ungenerated.length} employees...`);

async function run() {
  let count = 0;
  for (const emp of ungenerated) {
    const dest = path.join(dir, `${emp.id}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      count++;
      continue;
    }
    let url = emp.foto;
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1].split('/')[0];
      url = `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
    } else if (url.includes('id=')) {
      const id = url.split('id=')[1].split('&')[0];
      url = `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
    }
    try {
      await new Promise(r => setTimeout(r, 600));
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 1000) {
        fs.writeFileSync(dest, Buffer.from(buf));
        count++;
        console.log(`Saved ${emp.id} ${emp.nama} (${buf.byteLength} bytes)`);
      } else {
        console.log(`Buffer too small for ${emp.id}: ${buf.byteLength}`);
      }
    } catch (e) {
      console.error(`Failed for ${emp.id}: ${e.message}`);
    }
  }
  console.log(`Finished! Cached ${count} / ${ungenerated.length} source photos.`);
}

run();
