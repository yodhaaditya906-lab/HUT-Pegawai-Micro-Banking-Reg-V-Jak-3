import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const filesToUpdate = ['data/employees.json', 'public/data/employees.json'];

for (const jsonFile of filesToUpdate) {
  if (!fs.existsSync(jsonFile)) continue;
  const emps = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

  // Clear EMP-0259 kartu back to ""
  const e259 = emps.find(e => e.id === 'EMP-0259');
  if (e259) e259.kartu = '';

  // Set EMP-0485 kartu to Qori ah Yanter's driveId
  const e485 = emps.find(e => e.id === 'EMP-0485');
  if (e485) e485.kartu = 'https://drive.google.com/thumbnail?id=1JeQsqKhOLgjVSEiAAwIx5eFfeScKkU8s&sz=w1200';

  fs.writeFileSync(jsonFile, JSON.stringify(emps, null, 2), 'utf8');
}

// Remove incorrect alias files if they were overwritten
// Restore EMP-0259, EMP-0360, EMP-0429 from git if they existed or check git status
console.log('Fixed employees.json for EMP-0485 and EMP-0259');
