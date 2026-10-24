import fs from 'fs';
import path from 'path';

const files = [
  {
    name: "ADETYA YANDRI.png",
    id: "1gV-OsgQyM2susbN3TmnLLcx2JQ8IVjr2"
  },
  {
    name: "Adri Fauzan.png",
    id: "19noj3JJfVDNnfM2OZKvIePQWz7mS2icF"
  },
  {
    name: "Anisah Puspita Sari.png",
    id: "1YipgKsIS8GVpl4GO-TEhg9yfxcCjObrA"
  },
  {
    name: "Arifin Parinduri.png",
    id: "1HOSuFIKeTEd0EsZDUUo8j5BV_15eEK5D"
  },
  {
    name: "DEDY IMAM SETIAWAN",
    id: "1ZxBojw1O1zroB09irWLUN9bo3aesX13T"
  },
  {
    name: "DHARMAWAN INDRA WICAKSANA",
    id: "11ffnIZgUfRJzp_Gh6_KntYc_xeABzbsq"
  },
  {
    name: "Ernawati.jpg",
    id: "1UdFSclrkb6GOggA2RP7tIb3-EPc_pqvz"
  },
  {
    name: "Frahesa Oktafia Rofah",
    id: "1XEW0Z8ybojMNxupnwLA9cegHuForOaWn"
  },
  {
    name: "Qori ah Yanter",
    id: "1JeQsqKhOLgjVSEiAAwIx5eFfeScKkU8s"
  },
  {
    name: "Silvana Rahmawati",
    id: "1IE4PCy45WdSB-K8VFe7HTYgCji3ecdhJ"
  }
];

const destDir = path.join('scratch_downloaded_photos');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

async function downloadAll() {
  for (const item of files) {
    const ext = item.name.toLowerCase().endsWith('.jpg') || item.name.toLowerCase().endsWith('.jpeg') ? '.jpg' : '.png';
    const cleanBase = item.name.replace(/\.(png|jpg|jpeg)$/i, '');
    const filename = cleanBase + ext;
    const destPath = path.join(destDir, filename);

    console.log(`Downloading ${item.name} (${item.id})...`);
    // Try w2000 or w1600 for max quality
    const url = `https://drive.google.com/thumbnail?id=${item.id}&sz=w2000`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1000) throw new Error(`Too small (${buf.byteLength} bytes)`);
      fs.writeFileSync(destPath, Buffer.from(buf));
      console.log(`  -> Saved ${filename} (${buf.byteLength} bytes)`);
    } catch (e) {
      console.error(`  -> Failed: ${e.message}`);
    }
  }
  console.log('All downloads completed!');
}

downloadAll();
