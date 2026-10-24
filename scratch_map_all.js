import fs from 'fs';
import path from 'path';

const files = [
  { name: "ADETYA YANDRI.png", id: "1gV-OsgQyM2susbN3TmnLLcx2JQ8IVjr2" },
  { name: "Adri Fauzan.png", id: "19noj3JJfVDNnfM2OZKvIePQWz7mS2icF" },
  { name: "Anisah Puspita Sari.png", id: "1YipgKsIS8GVpl4GO-TEhg9yfxcCjObrA" },
  { name: "Arifin Parinduri.png", id: "1HOSuFIKeTEd0EsZDUUo8j5BV_15eEK5D" },
  { name: "DEDY IMAM SETIAWAN", id: "1ZxBojw1O1zroB09irWLUN9bo3aesX13T" },
  { name: "DHARMAWAN INDRA WICAKSANA", id: "11ffnIZgUfRJzp_Gh6_KntYc_xeABzbsq" },
  { name: "Ernawati.jpg", id: "1UdFSclrkb6GOggA2RP7tIb3-EPc_pqvz" },
  { name: "Frahesa Oktafia Rofah", id: "1XEW0Z8ybojMNxupnwLA9cegHuForOaWn" },
  { name: "Qori ah Yanter", id: "1JeQsqKhOLgjVSEiAAwIx5eFfeScKkU8s" },
  { name: "Silvana Rahmawati", id: "1IE4PCy45WdSB-K8VFe7HTYgCji3ecdhJ" }
];

const emps = JSON.parse(fs.readFileSync('data/employees.json', 'utf8'));

for (const fileItem of files) {
  const cleanName = fileItem.name.replace(/\.(png|jpg|jpeg)$/i, '').toLowerCase().replace(/[^a-z]/g, '');
  const emp = emps.find(e => {
    const eName = (e.nama || '').toLowerCase().replace(/[^a-z]/g, '');
    return eName.includes(cleanName) || cleanName.includes(eName);
  });

  if (!emp) {
    console.error(`COULD NOT MATCH ${fileItem.name}`);
    continue;
  }

  const nameSlug = (emp.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const nipTarget = emp.nip && emp.nip !== '-' ? `nip_${emp.nip}.jpg` : null;

  console.log({
    fileItem: fileItem.name,
    driveId: fileItem.id,
    empId: emp.id,
    empNama: emp.nama,
    empNip: emp.nip,
    empJabatan: emp.jabatan,
    empUnit: emp.unit,
    empTgl: emp.tanggalLahir,
    nameSlug: `${nameSlug}.jpg`,
    nipTarget: nipTarget
  });
}
