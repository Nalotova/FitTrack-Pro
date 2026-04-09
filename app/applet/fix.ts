import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
const newLines = [...lines.slice(0, 5216), ...lines.slice(5547)];
fs.writeFileSync('src/App.tsx', newLines.join('\n'));
console.log('Fixed App.tsx');
