import fs from 'fs';

function extractComponent(name: string) {
  const content = fs.readFileSync('src/App.tsx', 'utf-8');
  const lines = content.split('\n');
  
  const startIdx = lines.findIndex(l => l.startsWith(`function ${name}(`));
  if (startIdx === -1) {
    console.log(`Component ${name} not found`);
    return;
  }
  
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
  
  if (endIdx === -1) {
    console.log(`Could not find end of ${name}`);
    return;
  }
  
  const componentLines = lines.slice(startIdx, endIdx + 1);
  
  // Create the component file
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
import ReactMarkdown from 'react-markdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, differenceInDays, startOfWeek, subWeeks, subMonths, isWithinInterval, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export ${componentLines.join('\n')}
`;

  if (!fs.existsSync('src/components')) {
    fs.mkdirSync('src/components');
  }
  fs.writeFileSync(`src/components/${name}.tsx`, componentContent);
  
  // Remove from App.tsx and add import
  const newAppLines = [
    ...lines.slice(0, startIdx),
    ...lines.slice(endIdx + 1)
  ];
  
  // Add import at the top
  const importLine = `import { ${name} } from './components/${name}';`;
  newAppLines.splice(5, 0, importLine);
  
  fs.writeFileSync('src/App.tsx', newAppLines.join('\n'));
  console.log(`Extracted ${name}`);
}

const componentsToExtract = [
  'GuideModal',
  'ProgramEditor',
  'CoachPage',
  'ProfilePage',
  'NavTab',
  'TodayPage',
  'ExerciseCard',
  'ProgressPage',
  'StatItem',
  'StrengthPage',
  'WeightPage',
  'TechPage',
  'TechEditor',
  'TechCard'
];

componentsToExtract.forEach(extractComponent);
