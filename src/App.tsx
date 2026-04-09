/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppContent } from './components/AppContent';
import { calculateExerciseGoal } from './utils';
import { TechCard } from './components/TechCard';
import { TechEditor } from './components/TechEditor';
import { TechPage } from './components/TechPage';
import { WeightPage } from './components/WeightPage';
import { StrengthPage } from './components/StrengthPage';
import { StatItem } from './components/StatItem';
import { ProgressPage } from './components/ProgressPage';
import { ExerciseCard } from './components/ExerciseCard';
import { TodayPage } from './components/TodayPage';
import { NavTab } from './components/NavTab';
import { ProfilePage } from './components/ProfilePage';
import { CoachPage } from './components/CoachPage';
import { ProgramEditor } from './components/ProgramEditor';
import { GuideModal } from './components/GuideModal';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2,
  Check,
  AlertCircle,
  Dumbbell, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  LogOut, 
  LogIn, 
  BarChart3, 
  History, 
  User as UserIcon,
  Save,
  X,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  Target,
  Zap,
  Activity,
  Scale,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  AlertTriangle,
  Bot,
  Sparkles,
  MessageSquare,
  ImageIcon,
  Send,
  Camera,
  Settings,
  RotateCcw,
  Bell,
  Mic,
  HelpCircle,
  Square,
  Trophy,
  Moon,
  Sun,
  Video,
  Loader2,
  FileText,
  FileAudio,
  File,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { CustomDatePicker } from './components/CustomDatePicker';
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, differenceInDays, startOfWeek, subWeeks, subMonths, isWithinInterval, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  getDoc,
  doc, 
  deleteDoc, 
  addDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
  User,
  OperationType,
  handleFirestoreError,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from './firebase';

import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from './types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from './constants';

// Error Boundary Component
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    const state = (this as any).state;
    const props = (this as any).props;
    if (state.hasError) {
      let parsedError: any;
      try {
        parsedError = JSON.parse(state.errorInfo || '{}');
      } catch {
        parsedError = { error: state.errorInfo };
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6 font-mono">
          <div className="max-w-md w-full bg-surface border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl shadow-red-500/5">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="text-red-500 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-4">Что-то пошло не так</h2>
            <p className="text-muted mb-6 text-sm">
              {parsedError.error || "Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу."}
            </p>
            {parsedError.operationType && (
              <div className="text-left bg-black/40 rounded-xl p-4 mb-6 font-mono text-xs text-muted overflow-auto max-h-40 border border-border">
                <p className="text-red-400 mb-1 uppercase tracking-wider font-bold">Отладочная информация</p>
                <p>Операция: {parsedError.operationType}</p>
                <p>Путь: {parsedError.path}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              Перезагрузить приложение
            </button>
          </div>
        </div>
      );
    }
    return props.children;
  }
}

const DAYS_OF_WEEK = [
  'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
];



// Main App Component


// --- COACH PAGE ---












export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
