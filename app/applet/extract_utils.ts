import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.startsWith('const calculateExerciseGoal ='));
let endIdx = -1;
let braceCount = 0;
let started = false;

for (let i = startIdx; i < lines.length; i++) {
  const line = lines[i];
  for (const char of line) {
    if (char === '{') {
      braceCount++;
      started = true;
    } else if (char === '}') {
      braceCount--;
    }
  }
  if (started && braceCount === 0) {
    endIdx = i;
    break;
  }
}

const utilLines = lines.slice(startIdx, endIdx + 1);

const utilsContent = `import { StrengthRecord } from './types';

export ${utilLines.join('\n')}
`;

fs.writeFileSync('src/utils.ts', utilsContent);

// Remove from App.tsx
const newAppLines = [
  ...lines.slice(0, startIdx),
  ...lines.slice(endIdx + 1)
];

// Add import to App.tsx
newAppLines.splice(5, 0, "import { calculateExerciseGoal } from './utils';");
fs.writeFileSync('src/App.tsx', newAppLines.join('\n'));

// Add import to ProgressPage
let progressContent = fs.readFileSync('src/components/ProgressPage.tsx', 'utf-8');
progressContent = "import { calculateExerciseGoal } from '../utils';\n" + progressContent;
fs.writeFileSync('src/components/ProgressPage.tsx', progressContent);

console.log('Extracted calculateExerciseGoal');
