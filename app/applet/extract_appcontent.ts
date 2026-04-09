import fs from 'fs';

const name = 'AppContent';
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.startsWith(`function ${name}(`));
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

const componentLines = lines.slice(startIdx, endIdx + 1);

const componentContent = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Edit2, Check, AlertCircle, Dumbbell, Calendar, ChevronRight, ChevronLeft,
  LogOut, LogIn, BarChart3, History, UserIcon, Save, X, PlusCircle, MinusCircle,
  TrendingUp, Target, Zap, Activity, Scale, BookOpen, CheckCircle2, ChevronDown, ChevronUp,
  Download, Upload, AlertTriangle, Bot, Sparkles, MessageSquare, ImageIcon, Send, Camera,
  Settings, RotateCcw, Bell, Mic, HelpCircle, Square, Trophy, Moon, Sun, Video, Loader2,
  FileText, FileAudio, File, Copy
} from 'lucide-react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, query, where, onSnapshot, setDoc, getDoc, doc, deleteDoc, addDoc, writeBatch, getDocs, serverTimestamp, User, OperationType, handleFirestoreError, storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';
import { calculateExerciseGoal } from '../utils';

import { GuideModal } from './GuideModal';
import { ProgramEditor } from './ProgramEditor';
import { CoachPage } from './CoachPage';
import { ProfilePage } from './ProfilePage';
import { NavTab } from './NavTab';
import { TodayPage } from './TodayPage';
import { ProgressPage } from './ProgressPage';
import { StrengthPage } from './StrengthPage';
import { WeightPage } from './WeightPage';
import { TechPage } from './TechPage';
import { TechEditor } from './TechEditor';

export ${componentLines.join('\n')}
`;

fs.writeFileSync('src/components/AppContent.tsx', componentContent);

// Remove from App.tsx and add import
const newAppLines = [
  ...lines.slice(0, startIdx),
  ...lines.slice(endIdx + 1)
];

// Add import at the top
const importLine = `import { AppContent } from './components/AppContent';`;
newAppLines.splice(5, 0, importLine);

fs.writeFileSync('src/App.tsx', newAppLines.join('\n'));
console.log('Extracted AppContent');
