import fs from 'fs';

const emps = JSON.parse(fs.readFileSync('data/employees.json', 'utf8'));
const ids = ['EMP-0298', 'EMP-0262', 'EMP-0479', 'EMP-0127', 'EMP-0126', 'EMP-0478', 'EMP-0178', 'EMP-0446', 'EMP-0485', 'EMP-0203'];
const targetEmps = emps.filter(e => ids.includes(e.id));
console.log(JSON.stringify(targetEmps, null, 2));
