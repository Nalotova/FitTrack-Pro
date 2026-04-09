import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/\/\/ Types[\s\S]*?const DEFAULT_PROGRAM: Record<string, { subtitle: string; isCardio\?: boolean; exercises: any\[\] }> = \{[\s\S]*?\n\};\n/, 'import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from \'./types\';\nimport { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from \'./constants\';\n');
fs.writeFileSync('src/App.tsx', content);
console.log('Cleaned up App.tsx');
