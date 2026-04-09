import fs from 'fs';

function addImports(file: string, imports: string) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const importIndex = lines.findIndex(l => l.startsWith('import { auth, db, storage }'));
  if (importIndex !== -1) {
    lines.splice(importIndex, 0, imports);
    fs.writeFileSync(file, lines.join('\n'));
  }
}

// Fix CoachPage
let coachContent = fs.readFileSync('src/components/CoachPage.tsx', 'utf-8');
coachContent = coachContent.replace('import { GoogleGenAI } from "@google/genai";', 'import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";');
fs.writeFileSync('src/components/CoachPage.tsx', coachContent);

// Fix ProfilePage
addImports('src/components/ProfilePage.tsx', 'import { addDoc, collection, writeBatch, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";\nimport { User, OperationType, handleFirestoreError } from "../firebase";');

// Fix ProgressPage
addImports('src/components/ProgressPage.tsx', 'import { User } from "../firebase";\nimport { StatItem } from "./StatItem";');
let progressContent = fs.readFileSync('src/components/ProgressPage.tsx', 'utf-8');
// calculateExerciseGoal is in App.tsx, we need to move it to a utils file or export it from App.tsx.
// Let's create src/utils.ts and move calculateExerciseGoal there.

// Fix TechPage
addImports('src/components/TechPage.tsx', 'import { TechCard } from "./TechCard";');

// Fix TodayPage
addImports('src/components/TodayPage.tsx', 'import { ExerciseCard } from "./ExerciseCard";');

// Fix WeightPage
addImports('src/components/WeightPage.tsx', 'import { User } from "../firebase";');

console.log('Fixed imports');
