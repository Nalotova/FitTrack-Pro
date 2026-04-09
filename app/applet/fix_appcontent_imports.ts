import fs from 'fs';

let content = fs.readFileSync('src/components/AppContent.tsx', 'utf-8');
const importsToAdd = `import { GoogleGenAI } from "@google/genai";
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, differenceInDays, startOfWeek, subWeeks, subMonths, isWithinInterval, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
`;

const importIndex = content.indexOf('import { auth');
content = content.slice(0, importIndex) + importsToAdd + content.slice(importIndex);
fs.writeFileSync('src/components/AppContent.tsx', content);
console.log('Fixed AppContent imports');
