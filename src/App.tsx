/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Camera,
  Settings,
  RotateCcw,
  Bell,
  Mic,
  Square,
  Trophy,
  Moon,
  Sun,
  Trash2,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
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
  Area 
} from 'recharts';
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
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
  handleFirestoreError
} from './firebase';

// Types
interface Set {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: Set[];
}

interface TechItem {
  id?: string;
  title: string;
  subtitle: string;
  content: string;
  order: number;
}

interface Workout {
  id?: string;
  userId: string;
  date: string;
  day: string;
  exercises: Exercise[];
  notes?: string;
}

interface WeightMeasurement {
  id?: string;
  userId: string;
  date: string;
  weight: number;
  age?: number;
  fat?: number;
  muscle?: number;
  water?: number;
  chest?: number;
  waist?: number;
  waistHigh?: number;
  waistNavel?: number;
  waistWidest?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  bmi?: number;
  visceralFat?: number;
  skeletalMuscleIndex?: number;
  waistHipRatio?: number;
  bodyType?: string;
  bodyShape?: string;
  bmr?: number;
  boneMass?: number;
  protein?: number;
  fatFreeMass?: number;
  biologicalAge?: number;
  heartRate?: number;
}

interface StrengthRecord {
  id?: string;
  userId: string;
  date: string;
  exercise: string;
  weight: number;
  reps: number;
}

interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'admin';
  age?: string | number;
  goal?: string;
  reminders?: any[];
  createdAt?: string;
  updatedAt?: string;
  uid?: string;
}

// Program Data
const PROGRAM: Record<string, { subtitle: string; isCardio?: boolean; exercises: any[] }> = {
  "День 1": {
    "subtitle": "Ягодицы + Ноги",
    "exercises": [
      {
        "name": "Ягодичный мостик со штангой",
        "scheme": "4 × 12",
        "sets": 4,
        "tip": "⭐ Пауза 2 сек наверху! Старт 30-40 кг"
      },
      {
        "name": "Болгарские сплит-приседания",
        "scheme": "3 × 10 / нога",
        "sets": 3,
        "tip": "Корпус вперёд 30-45°, дави в пятку. Старт 5-8 кг"
      },
      {
        "name": "Жим ногами высокая постановка",
        "scheme": "3 × 12",
        "sets": 3,
        "tip": "Пятки высоко = акцент ягодицы. Старт 60-80 кг"
      },
      {
        "name": "Румынская тяга",
        "scheme": "3 × 10",
        "sets": 3,
        "tip": "Спина прямая, тянись тазом назад. Старт 25-35 кг"
      },
      {
        "name": "Вакуум",
        "scheme": "3 × 30 сек",
        "sets": 3,
        "tip": "Живот вваливается внутрь",
        "bodyweight": true,
        "unit": "сек"
      }
    ]
  },
  "День 2": {
    "subtitle": "Верх + Осанка",
    "exercises": [
      {
        "name": "Жим гантелей сидя",
        "scheme": "3 × 10",
        "sets": 3,
        "tip": "Старт 8-10 кг × 2"
      },
      {
        "name": "Отжимания от пола / от колен",
        "scheme": "3 × 12",
        "sets": 3,
        "tip": "Тонус груди + кор без перекачки передней дельты",
        "bodyweight": true,
        "unit": "раз"
      },
      {
        "name": "Тяга верхнего блока широким хватом",
        "scheme": "3 × 12",
        "sets": 3,
        "tip": "Плечи вниз, тяни к груди. Старт 25-35 кг"
      },
      {
        "name": "Тяга гантели в наклоне",
        "scheme": "3 × 10 / сторону",
        "sets": 3,
        "tip": "Спина параллельна полу. Старт 10-12 кг"
      },
      {
        "name": "Face pulls",
        "scheme": "3 × 20",
        "sets": 3,
        "tip": "⭐ Тяни к лбу! В конце разводи кулаки — лопатки сводятся. Минимальный вес"
      },
      {
        "name": "Разводка в стороны",
        "scheme": "3 × 15",
        "sets": 3,
        "tip": "Локоть чуть согнут. Старт 3-5 кг"
      },
      {
        "name": "Мёртвый жук (Dead Bug)",
        "scheme": "3 × 10 / сторону",
        "sets": 3,
        "tip": "Поясница намертво к полу! Выдох на движении",
        "bodyweight": true,
        "unit": "раз"
      },
      {
        "name": "Планка",
        "scheme": "3 × 45 сек",
        "sets": 3,
        "tip": "Дыши, не задерживай",
        "bodyweight": true,
        "unit": "сек"
      }
    ]
  },
  "День 3": {
    "subtitle": "Задняя линия + Плечи",
    "exercises": [
      {
        "name": "Становая тяга сумо",
        "scheme": "4 × 8",
        "sets": 4,
        "tip": "⭐ Королева упражнений! Спина прямая, колени над носками. Старт 40-50 кг"
      },
      {
        "name": "Сгибание ног в тренажёре",
        "scheme": "3 × 15",
        "sets": 3,
        "tip": "Разгрузка поясницы после становой"
      },
      {
        "name": "Сумо-приседания с гантелью",
        "scheme": "3 × 12",
        "sets": 3,
        "tip": "Старт 12-16 кг"
      },
      {
        "name": "Гиперэкстензия с весом",
        "scheme": "3 × 15",
        "sets": 3,
        "tip": "Скруглённая спина = акцент на ягодицы. Старт 5-10 кг"
      },
      {
        "name": "Тяга к подбородку широким хватом",
        "scheme": "3 × 12",
        "sets": 3,
        "tip": "Визуально сужает талию! Старт 15-20 кг"
      },
      {
        "name": "Махи гантелями в наклоне",
        "scheme": "3 × 15",
        "sets": 3,
        "tip": "Задняя дельта — исправляет сутулость. Старт 4-6 кг"
      },
      {
        "name": "Планка боковая",
        "scheme": "3 × 30 сек / сторону",
        "sets": 3,
        "bodyweight": true,
        "unit": "сек"
      }
    ]
  },
  "Кардио 1": {
    "subtitle": "Горы + Жизнь",
    "isCardio": true,
    "exercises": [
      {
        "name": "Ходьба / горы Триберга",
        "scheme": "30-60 мин · пульс 115-130",
        "sets": 1,
        "isCardio": true,
        "fields": ["мин", "км", "пульс"]
      },
      {
        "name": "Растяжка",
        "scheme": "10 мин",
        "sets": 1,
        "isCardio": true,
        "fields": ["мин"]
      }
    ]
  },
  "Кардио 2": {
    "subtitle": "Активное восстановление",
    "isCardio": true,
    "exercises": [
      {
        "name": "Эллипс / Велосипед",
        "scheme": "30-45 мин",
        "sets": 1,
        "isCardio": true,
        "fields": ["мин", "пульс"]
      }
    ]
  },
  "Кардио 3": {
    "subtitle": "Горы + Отдых",
    "isCardio": true,
    "exercises": [
      {
        "name": "Ходьба / горы Триберга",
        "scheme": "30-60 мин · спокойный темп",
        "sets": 1,
        "isCardio": true,
        "fields": ["мин", "км", "пульс"]
      },
      {
        "name": "Растяжка всего тела",
        "scheme": "15 мин",
        "sets": 1,
        "isCardio": true,
        "fields": ["мин"]
      }
    ]
  }
};

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
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([]);
  const [strengthRecords, setStrengthRecords] = useState<StrengthRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'strength' | 'tech' | 'coach' | 'profile' | 'measurements'>('today');
  const [coachMessages, setCoachMessages] = useState<any[]>(() => {
    const saved = localStorage.getItem('coach_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [programData, setProgramData] = useState<Record<string, any>>(PROGRAM);
  const [isProgramLoading, setIsProgramLoading] = useState(true);
  const [techData, setTechData] = useState<TechItem[]>([]);
  const [isTechLoading, setIsTechLoading] = useState(true);
  const [showProgramEditor, setShowProgramEditor] = useState(false);
  const [showTechEditor, setShowTechEditor] = useState(false);
  const [notification, setNotification] = useState<{show: boolean, title: string, message: string} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Today's state
  const [currentDay, setCurrentDay] = useState('День 1');
  const [checkedExercises, setCheckedExercises] = useState<number[]>([]);
  const [currentSets, setCurrentSets] = useState<Record<number, any[][]>>({});
  const [currentNotes, setCurrentNotes] = useState<Record<number, string>>({});
  const [isWorkoutStateLoading, setIsWorkoutStateLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth Listener
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fallback timeout to ensure app loads even if Firestore hangs
        timeout = setTimeout(() => {
          setLoading(false);
        }, 5000);
        await syncUserProfile(currentUser);
      } else {
        setLoading(false);
      }
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Persistence for Today's state
  useEffect(() => {
    if (!user) {
      setIsWorkoutStateLoading(false);
      return;
    }
    const timeout = setTimeout(() => setIsWorkoutStateLoading(false), 5000);
    const unsub = onSnapshot(doc(db, 'current_workout', user.uid), (snapshot) => {
      clearTimeout(timeout);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentDay(prev => prev !== data.currentDay ? (data.currentDay || 'День 1') : prev);
        setCheckedExercises(prev => JSON.stringify(prev) !== JSON.stringify(data.checkedExercises || []) ? (data.checkedExercises || []) : prev);
        setCurrentSets(prev => {
          let sets = data.currentSets || {};
          if (typeof sets === 'string') {
            try {
              sets = JSON.parse(sets);
            } catch (e) {
              sets = {};
            }
          }
          return JSON.stringify(prev) !== JSON.stringify(sets) ? sets : prev;
        });
        setCurrentNotes(prev => JSON.stringify(prev) !== JSON.stringify(data.currentNotes || {}) ? (data.currentNotes || {}) : prev);
      }
      setIsWorkoutStateLoading(false);
    }, (error) => {
      clearTimeout(timeout);
      setIsWorkoutStateLoading(false);
      handleFirestoreError(error, OperationType.GET, `current_workout/${user.uid}`);
    });
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [user]);

  // Sync currentDay with programData
  useEffect(() => {
    if (!isProgramLoading && !isWorkoutStateLoading && !programData[currentDay]) {
      const firstDay = Object.keys(programData)[0];
      if (firstDay) setCurrentDay(firstDay);
    }
  }, [programData, currentDay, isProgramLoading, isWorkoutStateLoading]);

  // Persistence for Today's state
  useEffect(() => {
    if (!user || isWorkoutStateLoading) return;
    const timer = setTimeout(() => {
      saveWorkoutState({
        currentDay,
        checkedExercises,
        currentSets,
        currentNotes
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentDay, checkedExercises, currentSets, currentNotes, user, isWorkoutStateLoading]);

  // Persistence for Coach messages
  useEffect(() => {
    localStorage.setItem('coach_messages', JSON.stringify(coachMessages));
  }, [coachMessages]);

  const saveWorkoutState = async (updates: any) => {
    if (!user) return;
    try {
      // Serialize nested arrays if they exist (e.g., currentSets)
      const serializedUpdates = { ...updates };
      if (serializedUpdates.currentSets) {
        serializedUpdates.currentSets = JSON.stringify(serializedUpdates.currentSets);
      }
      
      await setDoc(doc(db, 'current_workout', user.uid), serializedUpdates, { merge: true });
    } catch (error) {
      console.error("Failed to save workout state:", error);
    }
  };

  const updateProgramTipWithWeight = async (exercise: string, weight: number) => {
    if (!programData || !exercise || !weight) return;
    const updatedProgram = JSON.parse(JSON.stringify(programData));
    let changed = false;
    Object.keys(updatedProgram).forEach(dayKey => {
      updatedProgram[dayKey].exercises.forEach((ex: any) => {
        if (ex.name.toLowerCase() === exercise.toLowerCase()) {
          const suffix = `${weight}+`;
          if (!ex.tip) {
            ex.tip = suffix;
            changed = true;
          } else {
            // Check if it already ends with a weight pattern like " 50+"
            const weightPattern = /\s\d+(\.\d+)?\+$/;
            if (weightPattern.test(ex.tip)) {
              ex.tip = ex.tip.replace(weightPattern, ` ${suffix}`);
            } else {
              ex.tip = ex.tip.trim() + ` ${suffix}`;
            }
            changed = true;
          }
        }
      });
    });
    if (changed) {
      await handleUpdateProgram(updatedProgram);
    }
  };

  const handleUpdateProgram = async (newData: any) => {
    if (!user) return;
    
    // Validate newData to prevent saving empty or malformed programs
    if (!newData || typeof newData !== 'object' || Object.keys(newData).length === 0) {
      console.error("Attempted to save empty or invalid program data:", newData);
      // If it's empty, we might want to fallback to PROGRAM instead of saving empty
      newData = PROGRAM;
    }

    try {
      // Save data and explicit order of keys to preserve user's preferred order
      await setDoc(doc(db, 'programs', user.uid), { 
        data: newData, 
        order: Object.keys(newData),
        updatedAt: new Date().toISOString() 
      });
      
      // Validate current state against new program
      const days = Object.keys(newData);
      let updatedDay = currentDay;
      if (!days.includes(currentDay)) {
        updatedDay = days[0] || 'День 1';
      }
      
      // Save updated state
      await saveWorkoutState({
        currentDay: updatedDay,
        // If program changed significantly, we might want to clear progress
        // but for now let's just keep it if the day still exists
        ...(updatedDay !== currentDay ? { checkedExercises: [], currentSets: {}, currentNotes: {} } : {})
      });

      // Removed alert for better mobile/iframe compatibility
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `programs/${user.uid}`);
    }
  };

  // Profile Listener
  useEffect(() => {
    if (!user) return;
    (window as any).handleUpdateProgramFromCoach = handleUpdateProgram;
    (window as any).handleUpdateTechFromCoach = handleUpdateTech;
    (window as any).handleUpdateProfileFromCoach = handleUpdateProfile;
    (window as any).handleSaveWeightFromCoach = handleSaveWeight;
    
    // Fallback timeout to ensure app loads even if Firestore hangs
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      clearTimeout(timeout);
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(timeout);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => {
      clearTimeout(timeout);
      unsubProfile();
    };
  }, [user]);

  // Program Listener
  useEffect(() => {
    if (!user) {
      setProgramData(PROGRAM);
      setIsProgramLoading(false);
      setIsTechLoading(false);
      return;
    }

    const timeoutProgram = setTimeout(() => setIsProgramLoading(false), 5000);
    const unsubProgram = onSnapshot(doc(db, 'programs', user.uid), (snapshot) => {
      clearTimeout(timeoutProgram);
      let finalData = PROGRAM;
      if (snapshot.exists()) {
        const snapshotData = snapshot.data();
        const data = snapshotData.data;
        const order = snapshotData.order;

        // Check if the program is "broken" (empty exercises or English keys)
        // We only fallback if the data is completely missing or clearly invalid (e.g. all days empty)
        const hasEnglishKeys = data && Object.keys(data).some(k => 
          k.toLowerCase().includes('day') || 
          k.toLowerCase().includes('cardio') || 
          k.toLowerCase().includes('workout')
        );
        const allEmptyExercises = data && Object.keys(data).length > 0 && Object.values(data).every((d: any) => !d.exercises || d.exercises.length === 0);
        
        if (data && Object.keys(data).length > 0 && !hasEnglishKeys && !allEmptyExercises) {
          // Restore order if it was explicitly saved
          if (order && Array.isArray(order)) {
            const orderedData: any = {};
            order.forEach((key: string) => {
              if (data[key]) orderedData[key] = data[key];
            });
            // Add any keys that might be missing from order (just in case)
            Object.keys(data).forEach(key => {
              if (!orderedData[key]) orderedData[key] = data[key];
            });
            finalData = orderedData;
          } else {
            finalData = data;
          }
        }
      }
      setProgramData(finalData);
      setIsProgramLoading(false);
    }, (error) => {
      clearTimeout(timeoutProgram);
      setIsProgramLoading(false);
      handleFirestoreError(error, OperationType.GET, `programs/${user.uid}`);
    });

    const timeoutTech = setTimeout(() => setIsTechLoading(false), 5000);
    const unsubTech = onSnapshot(
      query(collection(db, 'tech'), where('userId', '==', user.uid)),
      (snapshot) => {
        clearTimeout(timeoutTech);
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          // Migration: if points exists but content doesn't, join them
          let content = d.content || '';
          if (!content && d.points && Array.isArray(d.points)) {
            content = d.points.map((p: string) => `● ${p}`).join('\n');
          }
          return { id: doc.id, ...d, content } as TechItem;
        });
        setTechData(data.sort((a, b) => a.order - b.order));
        setIsTechLoading(false);
      },
      (error) => {
        clearTimeout(timeoutTech);
        setIsTechLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'tech');
      }
    );

    return () => {
      clearTimeout(timeoutProgram);
      clearTimeout(timeoutTech);
      unsubProgram();
      unsubTech();
    };
  }, [user]);

  // Data Listeners
  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setMeasurements([]);
      setStrengthRecords([]);
      return;
    }

    const unsubWorkouts = onSnapshot(
      query(collection(db, 'workouts'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
        setWorkouts(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'workouts')
    );

    const unsubMeasurements = onSnapshot(
      query(collection(db, 'measurements'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightMeasurement));
        setMeasurements(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'measurements')
    );

    const unsubStrength = onSnapshot(
      query(collection(db, 'strength'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StrengthRecord));
        setStrengthRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'strength')
    );

    return () => {
      unsubWorkouts();
      unsubMeasurements();
      unsubStrength();
    };
  }, [user]);

  const syncUserProfile = async (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      const userData = docSnap.exists() ? docSnap.data() : null;
      
      const updates: any = {};
      if (!userData) {
        updates.displayName = currentUser.displayName || 'Анонимный пользователь';
        updates.email = currentUser.email || '';
        updates.photoURL = currentUser.photoURL || '';
        updates.role = 'user';
        updates.uid = currentUser.uid;
        updates.createdAt = new Date().toISOString();
      } else {
        // If name or photo are missing in Firestore but available in Auth, restore them
        if (!userData.displayName && currentUser.displayName) updates.displayName = currentUser.displayName;
        if (!userData.photoURL && currentUser.photoURL) updates.photoURL = currentUser.photoURL;
        // Always ensure email is up to date
        if (userData.email !== currentUser.email) updates.email = currentUser.email || '';
        
        // Ensure required fields for isValidUserProfile are present
        if (!userData.role) updates.role = 'user';
        if (!userData.uid) updates.uid = currentUser.uid;
        if (!userData.createdAt) updates.createdAt = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await setDoc(userRef, updates, { merge: true });
      }
    } catch (error) {
      console.error("Failed to sync user profile:", error);
      // Don't throw here, let the app continue
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        const fullData = {
          ...data,
          displayName: data.displayName || user.displayName || 'Анонимный пользователь',
          email: user.email || '',
          photoURL: data.photoURL || user.photoURL || '',
          role: 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, fullData);
      } else {
        await setDoc(userRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return Promise.resolve();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      return Promise.reject(error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Workout Logic
  const handleFinishWorkout = async () => {
    if (!user) return;
    
    const workoutToSave: Workout = {
      userId: user.uid,
      date: new Date().toISOString(),
      day: currentDay,
      exercises: programData[currentDay].exercises.map((ex: any, i: number) => ({
        name: ex.name,
        sets: currentSets[i]?.map(s => ({ weight: Number(s[0]) || 0, reps: Number(s[1]) || 0 })) || []
      })),
      notes: Object.values(currentNotes).join('\n')
    };

    try {
      await addDoc(collection(db, 'workouts'), workoutToSave);
      
      // Automatically save best sets to strength records
      for (const ex of workoutToSave.exercises) {
        if (ex.sets.length > 0) {
          // Find best set (highest weight, then highest reps)
          const bestSet = ex.sets.reduce((prev, curr) => {
            if (curr.weight > prev.weight) return curr;
            if (curr.weight === prev.weight && curr.reps > prev.reps) return curr;
            return prev;
          }, ex.sets[0]);

          if (bestSet.weight > 0) {
            await handleSaveStrength({
              exercise: ex.name,
              weight: bestSet.weight,
              reps: bestSet.reps
            });
          }
        }
      }
      
      // Reset state and move to next day
      const days = Object.keys(programData);
      const nextIdx = (days.indexOf(currentDay) + 1) % days.length;
      const nextDay = days[nextIdx];
      
      await saveWorkoutState({
        currentDay: nextDay,
        checkedExercises: [],
        currentSets: {},
        currentNotes: {}
      });
      
      setNotification({
        show: true,
        title: 'Отличная работа!',
        message: '🎉 Тренировка завершена!'
      });
      setActiveTab('progress');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workouts');
    }
  };

  const handleDeleteWorkout = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление тренировки',
      message: 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'workouts', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `workouts/${id}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateTech = async (items: TechItem[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Get existing docs to delete
      const existingDocs = await getDocs(query(collection(db, 'tech'), where('userId', '==', user.uid)));
      existingDocs.forEach(doc => batch.delete(doc.ref));

      // Add new items
      items.forEach((item, index) => {
        const newDocRef = doc(collection(db, 'tech'));
        const { id, ...itemData } = item;
        batch.set(newDocRef, { ...itemData, userId: user.uid, order: index });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tech');
    }
  };

  // Weight Logic
  const handleSaveWeight = async (data: Partial<WeightMeasurement>) => {
    if (!user) return;
    try {
      const numberFields = ['weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
      const allowedFields = ['userId', 'date', 'weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bodyType', 'bodyShape', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
      
      // Filter out undefined values, 'id', and any fields not in the schema
      const cleanData = Object.fromEntries(
        Object.entries(data)
          .filter(([k, v]) => v !== undefined && k !== 'id' && allowedFields.includes(k))
          .map(([k, v]) => {
            if (numberFields.includes(k)) {
              const num = Number(v);
              return [k, isNaN(num) || !isFinite(num) ? null : num];
            }
            return [k, v];
          })
          .filter(([k, v]) => v !== null || k === 'weight') // Ensure weight is not removed
      );
      
      if (cleanData.weight === null || cleanData.weight === undefined) {
        cleanData.weight = 0;
      }
      
      let finalDate = new Date().toISOString();
      if (cleanData.date) {
        try {
          finalDate = new Date(cleanData.date).toISOString();
        } catch (e) {
          // fallback to current date if parsing fails
        }
      }

      await addDoc(collection(db, 'measurements'), {
        userId: user.uid,
        ...cleanData,
        date: finalDate
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'measurements');
    }
  };

  const handleDeleteWeight = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление замера',
      message: 'Вы уверены, что хотите удалить этот замер?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'measurements', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `measurements/${id}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateWeight = async (id: string, data: Partial<WeightMeasurement>) => {
    try {
      const numberFields = ['weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
      const allowedFields = ['userId', 'date', 'weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bodyType', 'bodyShape', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
      
      // Filter out undefined values, 'id', and any fields not in the schema
      const cleanData = Object.fromEntries(
        Object.entries(data)
          .filter(([k, v]) => v !== undefined && k !== 'id' && allowedFields.includes(k))
          .map(([k, v]) => {
            if (numberFields.includes(k)) {
              const num = Number(v);
              return [k, isNaN(num) || !isFinite(num) ? null : num];
            }
            return [k, v];
          })
          .filter(([k, v]) => v !== null || k === 'weight') // Ensure weight is not removed
      );
      
      if (cleanData.weight === null) {
        cleanData.weight = 0;
      }
      
      if (cleanData.date) {
        try {
          cleanData.date = new Date(cleanData.date).toISOString();
        } catch (e) {
          // fallback
        }
      }

      await setDoc(doc(db, 'measurements', id), cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `measurements/${id}`);
    }
  };

  // Strength Logic
  const handleSaveStrength = async (data: Partial<StrengthRecord>) => {
    if (!user) return;
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      
      if ('weight' in cleanData) {
        cleanData.weight = isNaN(Number(cleanData.weight)) || !isFinite(Number(cleanData.weight)) ? 0 : Number(cleanData.weight);
      }
      if ('reps' in cleanData) {
        cleanData.reps = isNaN(Number(cleanData.reps)) || !isFinite(Number(cleanData.reps)) ? 0 : Number(cleanData.reps);
      }

      await addDoc(collection(db, 'strength'), {
        userId: user.uid,
        date: new Date().toISOString(),
        ...cleanData
      });
      
      // Update program tip if exercise matches
      if (data.exercise && data.weight) {
        await updateProgramTipWithWeight(data.exercise, data.weight);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'strength');
    }
  };

  const handleUpdateWorkout = async (id: string, data: Partial<Workout>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'workouts', id), cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workouts/${id}`);
    }
  };

  const handleDeleteStrength = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'strength', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `strength/${id}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateStrength = async (id: string, data: Partial<StrengthRecord>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      
      if ('weight' in cleanData) {
        cleanData.weight = isNaN(Number(cleanData.weight)) || !isFinite(Number(cleanData.weight)) ? 0 : Number(cleanData.weight);
      }
      if ('reps' in cleanData) {
        cleanData.reps = isNaN(Number(cleanData.reps)) || !isFinite(Number(cleanData.reps)) ? 0 : Number(cleanData.reps);
      }

      await setDoc(doc(db, 'strength', id), cleanData, { merge: true });
      
      // Update program tip if weight or exercise changed
      const record = strengthRecords.find(r => r.id === id);
      if (record) {
        const exercise = data.exercise || record.exercise;
        const weight = data.weight || record.weight;
        if (exercise && weight) {
          await updateProgramTipWithWeight(exercise, weight);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `strength/${id}`);
    }
  };

  // Stats
  const streakWeeks = useMemo(() => {
    if (workouts.length === 0) return 0;
    // Simple logic: count workouts this month / 3 as a proxy for streak
    const thisMonth = workouts.filter(w => {
      const d = new Date(w.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return Math.floor(thisMonth / 3);
  }, [workouts]);

  const weekLabel = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
    return `Неделя ${weekNum} · ${format(now, 'LLLL yyyy', { locale: ru })}`;
  }, []);

  const handleExportData = async () => {
    if (!user) return;
    try {
      const exportObj = {
        profile: userProfile,
        workouts,
        measurements,
        strengthRecords,
        exportDate: new Date().toISOString(),
        version: "1.1"
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack_full_backup_${format(new Date(), 'dd-MM-yyyy')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      setNotification({
        show: true,
        title: 'Ошибка',
        message: 'Ошибка при экспорте данных.'
      });
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result as string);
        
        let count = 0;

        // Import profile
        if (imported.profile) {
          const cleanProfile: any = {};
          if (imported.profile.displayName && typeof imported.profile.displayName === 'string' && imported.profile.displayName.trim().length > 0) {
            cleanProfile.displayName = imported.profile.displayName.trim();
          }
          if (imported.profile.photoURL && typeof imported.profile.photoURL === 'string') {
            cleanProfile.photoURL = imported.profile.photoURL;
          }
          if (imported.profile.age !== undefined) {
            cleanProfile.age = imported.profile.age;
          }
          if (imported.profile.goal !== undefined) {
            cleanProfile.goal = imported.profile.goal;
          }
          if (imported.profile.createdAt && typeof imported.profile.createdAt === 'string') {
            cleanProfile.createdAt = imported.profile.createdAt;
          }
          if (Array.isArray(imported.profile.reminders)) {
            const cleanReminders = imported.profile.reminders
              .filter((r: any) => r && typeof r === 'object' && typeof r.day === 'string' && typeof r.time === 'string' && r.day.length > 0 && r.time.length > 0)
              .map((r: any) => {
                const cleanR: any = { day: r.day, time: r.time };
                if (r.label && typeof r.label === 'string') {
                  cleanR.label = r.label.substring(0, 199);
                }
                return cleanR;
              });
            cleanProfile.reminders = cleanReminders.slice(0, 20);
          }
          
          if (Object.keys(cleanProfile).length > 0) {
            await handleUpdateProfile(cleanProfile);
            count++;
          }
        }

        // Flexible import logic for other data
        const workoutsToImport = imported.workouts || (Array.isArray(imported) && imported[0]?.exercises ? imported : []);
        const measurementsToImport = imported.measurements || imported.weights || (Array.isArray(imported) && imported[0]?.weight ? imported : []);
        const strengthToImport = imported.strengthRecords || imported.strength || (Array.isArray(imported) && imported[0]?.exercise ? imported : []);

            // Import workouts
            if (workoutsToImport.length > 0) {
              for (const w of workoutsToImport) {
                const { id, sets, notes, ...data } = w;
                
                // Transform if it's the old format (sets as object, no exercises array)
                let workoutToSave: any = { ...data, userId: user.uid };
                
                if (w.sets && !w.exercises && w.day && (programData as any)[w.day]) {
                  const program = (programData as any)[w.day];
                  workoutToSave.exercises = program.exercises.map((ex: any, i: number) => {
                    const rawSets = w.sets[i] || [];
                    return {
                      name: ex.name,
                      sets: rawSets.map((s: any) => ({
                        weight: Number(s[0]) || 0,
                        reps: Number(s[1]) || 0
                      }))
                    };
                  });
                  workoutToSave.notes = typeof w.notes === 'object' ? Object.values(w.notes).join('\n') : (w.notes || '');
                } else if (w.exercises) {
                  // Already has exercises, just use them
                  workoutToSave.exercises = w.exercises;
                  workoutToSave.notes = typeof w.notes === 'object' ? Object.values(w.notes).join('\n') : (w.notes || '');
                } else {
                  // Fallback for unknown structure
                  workoutToSave.exercises = [];
                  workoutToSave.notes = '';
                }

                let validDate = new Date().toISOString();
                if (workoutToSave.date) {
                  try {
                    const d = new Date(workoutToSave.date);
                    if (!isNaN(d.getTime())) {
                      validDate = d.toISOString();
                    }
                  } catch (e) {}
                }

                const cleanWorkout: any = {
                  userId: user.uid,
                  date: validDate,
                  day: String(workoutToSave.day || 'День 1'),
                  exercises: Array.isArray(workoutToSave.exercises) 
                    ? workoutToSave.exercises.slice(0, 50).map((ex: any) => ({
                        name: String(ex.name || ''),
                        sets: Array.isArray(ex.sets) 
                          ? ex.sets.map((s: any) => ({
                              weight: isNaN(Number(s.weight)) || !isFinite(Number(s.weight)) ? 0 : Number(s.weight),
                              reps: isNaN(Number(s.reps)) || !isFinite(Number(s.reps)) ? 0 : Number(s.reps)
                            }))
                          : []
                      }))
                    : [],
                };
                if (workoutToSave.notes !== undefined && workoutToSave.notes !== null && String(workoutToSave.notes).trim() !== '') {
                  cleanWorkout.notes = String(workoutToSave.notes);
                }
                if (workoutToSave.name !== undefined && workoutToSave.name !== null && String(workoutToSave.name).trim() !== '') {
                  cleanWorkout.name = String(workoutToSave.name).substring(0, 100);
                }
                await addDoc(collection(db, 'workouts'), cleanWorkout);
                count++;
              }
            }
            
            // Import measurements
            if (measurementsToImport.length > 0) {
              for (const m of measurementsToImport) {
                const { id, ...data } = m;
                let validDate = new Date().toISOString();
                if (data.date) {
                  try {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                      validDate = d.toISOString();
                    }
                  } catch (e) {}
                }

                const cleanMeasurement: any = {
                  userId: user.uid,
                  date: validDate,
                  weight: isNaN(Number(data.weight)) || !isFinite(Number(data.weight)) ? 0 : Number(data.weight),
                };
                const optionalFields = ['age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
                for (const field of optionalFields) {
                  if (data[field] !== undefined && data[field] !== null) {
                    const num = Number(data[field]);
                    if (!isNaN(num) && isFinite(num)) {
                      cleanMeasurement[field] = num;
                    }
                  }
                }
                const stringFields = ['bodyType', 'bodyShape'];
                for (const field of stringFields) {
                  if (data[field] !== undefined && data[field] !== null) {
                    cleanMeasurement[field] = String(data[field]);
                  }
                }
                await addDoc(collection(db, 'measurements'), cleanMeasurement);
                count++;
              }
            }

            // Import strength
            if (strengthToImport.length > 0) {
              for (const s of strengthToImport) {
                const { id, ...data } = s;
                let validDate = new Date().toISOString();
                if (data.date) {
                  try {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                      validDate = d.toISOString();
                    }
                  } catch (e) {}
                }

                const cleanStrength: any = {
                  userId: user.uid,
                  date: validDate,
                  exercise: String(data.exercise || ''),
                  weight: isNaN(Number(data.weight)) || !isFinite(Number(data.weight)) ? 0 : Number(data.weight),
                  reps: isNaN(Number(data.reps)) || !isFinite(Number(data.reps)) ? 0 : Number(data.reps),
                };
                await addDoc(collection(db, 'strength'), cleanStrength);
                count++;
              }
            }

        if (count > 0) {
          setNotification({
            show: true,
            title: 'Успешно',
            message: `✓ Импорт завершен! Загружено записей: ${count}`
          });
        } else {
          setNotification({
            show: true,
            title: 'Внимание',
            message: '⚠ Файл распознан, но данных для импорта не найдено. Проверьте структуру JSON.'
          });
        }
      } catch (error) {
        console.error("Import failed:", error);
        setNotification({
          show: true,
          title: 'Ошибка',
          message: 'Ошибка при импорте данных. Убедитесь, что файл имеет формат JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Dumbbell className="text-accent w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-surface p-10 rounded-[40px] shadow-2xl border border-border"
        >
          <div className="logo text-5xl mb-4 font-display font-bold text-accent">FitTrack-Pro <span className="text-accent-2">·</span> Тренировки</div>
          <p className="text-muted mb-10 text-lg font-medium">Твой личный фитнес-дневник для сияющих результатов! ✨</p>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full py-4 bg-gradient-to-r from-accent to-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Dumbbell size={20} />
              Войти и начать
            </button>
            <p className="text-[10px] text-muted uppercase tracking-widest font-bold">безопасно через google</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-24">
      {/* Header */}
      <header className="header p-4 border-b border-border sticky top-0 bg-bg/80 backdrop-blur-md z-40">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden cursor-pointer"
              onClick={() => setActiveTab('profile')}
            >
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={16} />
              )}
            </div>
            <div 
              className="cursor-pointer"
              onClick={() => setActiveTab('profile')}
            >
              <div className="logo text-lg font-display font-bold text-accent leading-none">
                {userProfile?.displayName || 'Таня'} <span className="text-accent-2">·</span> Тренировки
              </div>
              <div className="text-[9px] text-muted uppercase font-semibold tracking-[0.15em] mt-0.5">{weekLabel}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display font-bold text-accent leading-none">{streakWeeks}</div>
            <div className="text-[8px] text-muted uppercase font-semibold tracking-[0.15em]">недель подряд</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-2xl mx-auto px-6 pt-6 ${activeTab === 'coach' ? 'pb-[64px]' : 'pb-20'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <TodayPage 
              currentDay={currentDay}
              setCurrentDay={setCurrentDay}
              checkedExercises={checkedExercises}
              setCheckedExercises={setCheckedExercises}
              currentSets={currentSets}
              setCurrentSets={setCurrentSets}
              currentNotes={currentNotes}
              setCurrentNotes={setCurrentNotes}
              onFinish={handleFinishWorkout}
              workouts={workouts}
              programData={programData}
              onEditProgram={() => setShowProgramEditor(true)}
              onReset={() => {
                if (Object.keys(programData).length === 0) {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Восстановление программы',
                    message: 'Программа пуста. Восстановить стандартную программу?',
                    onConfirm: async () => {
                      await handleUpdateProgram(PROGRAM);
                      setConfirmDialog(null);
                    }
                  });
                } else {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Сброс прогресса',
                    message: 'Сбросить текущий прогресс тренировки?',
                    onConfirm: () => {
                      setCheckedExercises([]);
                      setCurrentSets({});
                      setCurrentNotes({});
                      setConfirmDialog(null);
                    }
                  });
                }
              }}
              isLoading={isWorkoutStateLoading || isProgramLoading}
            />
          )}
          {activeTab === 'coach' && (
            <CoachPage 
              workouts={workouts} 
              measurements={measurements} 
              strengthRecords={strengthRecords}
              messages={coachMessages}
              setMessages={setCoachMessages}
              isLoading={isCoachLoading}
              setIsLoading={setIsCoachLoading}
              programData={programData}
              techData={techData}
              userProfile={userProfile}
              setNotification={setNotification}
            />
          )}
          {activeTab === 'progress' && (
            <ProgressPage 
              workouts={workouts} 
              onDelete={handleDeleteWorkout}
              onUpdate={handleUpdateWorkout}
              programData={programData}
            />
          )}
          {activeTab === 'strength' && (
            <StrengthPage 
              records={strengthRecords} 
              onSave={handleSaveStrength}
              onDelete={handleDeleteStrength}
              onUpdate={handleUpdateStrength}
              programData={programData}
            />
          )}
          {activeTab === 'tech' && (
            <TechPage 
              items={techData} 
              onEdit={() => setShowTechEditor(true)} 
              isLoading={isTechLoading}
            />
          )}
          {activeTab === 'measurements' && (
            <WeightPage 
              measurements={measurements} 
              onSave={handleSaveWeight} 
              onDelete={handleDeleteWeight}
              onUpdate={handleUpdateWeight}
            />
          )}
          {activeTab === 'profile' && (
            <ProfilePage 
              profile={userProfile} 
              onUpdate={handleUpdateProfile} 
              onLogout={handleLogout}
              setActiveTab={setActiveTab}
              onExportData={handleExportData}
              onImportData={handleImportData}
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProgramEditor && (
            <ProgramEditor 
              program={programData} 
              onSave={handleUpdateProgram} 
              onClose={() => setShowProgramEditor(false)} 
            />
          )}
          {showTechEditor && (
            <TechEditor 
              items={techData} 
              onSave={handleUpdateTech} 
              onClose={() => setShowTechEditor(false)} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Global Notification Modal */}
      <AnimatePresence>
        {notification?.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center border-4 border-accent/20"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-[30px] flex items-center justify-center text-accent mx-auto mb-6">
                <Bell size={40} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-display font-bold text-accent mb-2">{notification.title}</h3>
              <p className="text-muted mb-8 leading-relaxed">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Понятно!
              </button>
            </motion.div>
          </motion.div>
        )}

        {confirmDialog?.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center border-4 border-accent/20"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-[30px] flex items-center justify-center text-accent mx-auto mb-6">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-display font-bold text-accent mb-2">{confirmDialog.title}</h3>
              <p className="text-muted mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-4 bg-surface-2 text-muted font-bold rounded-2xl active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-4 bg-accent text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  Да
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-safe pt-2 px-2 z-50 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {[
          { id: 'today', label: 'Тренировка', icon: Dumbbell },
          { id: 'measurements', label: 'Замеры', icon: Scale },
          { id: 'strength', label: 'Силовые', icon: Trophy },
          { id: 'progress', label: 'Прогресс', icon: BarChart3 },
          { id: 'coach', label: 'Коуч', icon: Bot },
          { id: 'profile', label: 'Профиль', icon: UserIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-14 h-14 transition-all ${isActive ? 'text-accent' : 'text-muted hover:text-accent/70'}`}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl mb-1 transition-all ${isActive ? 'bg-accent/10' : ''}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-wider ${isActive ? 'text-accent' : 'text-muted'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProgramEditor({ program, onSave, onClose }: { program: any; onSave: (data: any) => Promise<void>; onClose: () => void }) {
  const [localProgram, setLocalProgram] = useState(JSON.parse(JSON.stringify(program)));
  const [selectedDay, setSelectedDay] = useState(Object.keys(localProgram)[0]);
  const [localDayName, setLocalDayName] = useState(Object.keys(localProgram)[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalDayName(selectedDay);
  }, [selectedDay]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localProgram);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const addExercise = (day: string) => {
    const isCardio = localProgram[day]?.isCardio;
    const newExercise = {
      name: isCardio ? 'Бег / Ходьба' : 'Новое упражнение',
      scheme: isCardio ? '30 мин' : '3 x 12',
      sets: isCardio ? 1 : 3,
      tip: '',
      isCardio: isCardio,
      fields: isCardio ? ["мин", "км", "пульс"] : undefined
    };
    setLocalProgram((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: [...prev[day].exercises, newExercise]
      }
    }));
  };

  const removeExercise = (day: string, idx: number) => {
    setLocalProgram((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.filter((_: any, i: number) => i !== idx)
      }
    }));
  };

  const updateExercise = (day: string, idx: number, field: string, value: any) => {
    setLocalProgram((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.map((ex: any, i: number) => 
          i === idx ? { ...ex, [field]: value } : ex
        )
      }
    }));
  };

  const updateDay = (day: string, field: string, value: any) => {
    setLocalProgram((prev: any) => {
      const newDay = { ...prev[day], [field]: value };
      
      // If toggling isCardio, update all exercises in this day
      if (field === 'isCardio') {
        newDay.exercises = newDay.exercises.map((ex: any) => ({
          ...ex,
          isCardio: value,
          fields: value ? (ex.fields || ["мин", "км", "пульс"]) : undefined,
          sets: value ? (ex.sets === 3 ? 1 : ex.sets) : (ex.sets === 1 ? 3 : ex.sets),
          scheme: value ? (ex.scheme === '3 x 12' ? '30 мин' : ex.scheme) : (ex.scheme === '30 мин' ? '3 x 12' : ex.scheme)
        }));
      }
      
      return {
        ...prev,
        [day]: newDay
      };
    });
  };

  const renameDay = (oldName: string, newName: string) => {
    if (!newName || newName === oldName) {
      setLocalDayName(oldName);
      return;
    }
    // Prevent duplicate names
    if (localProgram[newName]) {
      setLocalDayName(oldName);
      return;
    }
    
    setLocalProgram((prev: any) => {
      const entries = Object.entries(prev);
      const updatedEntries = entries.map(([key, value]) => {
        if (key === oldName) return [newName, value];
        return [key, value];
      });
      return Object.fromEntries(updatedEntries);
    });
    setSelectedDay(newName);
  };

  const moveDay = (day: string, direction: 'left' | 'right') => {
    setLocalProgram((prev: any) => {
      const keys = Object.keys(prev);
      const index = keys.indexOf(day);
      const newKeys = [...keys];
      
      if (direction === 'left' && index > 0) {
        [newKeys[index - 1], newKeys[index]] = [newKeys[index], newKeys[index - 1]];
      } else if (direction === 'right' && index < keys.length - 1) {
        [newKeys[index + 1], newKeys[index]] = [newKeys[index], newKeys[index + 1]];
      } else {
        return prev;
      }
      
      const newProgram: any = {};
      newKeys.forEach(k => { newProgram[k] = prev[k]; });
      return newProgram;
    });
  };

  const addDay = () => {
    const dayNum = Object.keys(localProgram).length + 1;
    const dayName = `День ${dayNum}`;
    setLocalProgram((prev: any) => ({
      ...prev,
      [dayName]: {
        subtitle: 'Новый день',
        exercises: []
      }
    }));
    setSelectedDay(dayName);
  };

  const removeDay = (day: string) => {
    if (Object.keys(localProgram).length <= 1) return;
    const updated = { ...localProgram };
    delete updated[day];
    setLocalProgram(updated);
    setSelectedDay(Object.keys(updated)[0]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-bg w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-border"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-xl font-display font-bold text-accent">Редактор программы</h2>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest mt-1">Настрой тренировки под себя</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 text-muted hover:text-accent transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {Object.keys(localProgram).map(day => (
              <div key={day} className="relative group flex-shrink-0">
                <button 
                  onClick={() => setSelectedDay(day)}
                  className={`px-5 py-3 rounded-2xl text-[11px] font-bold border transition-all shadow-sm ${
                    selectedDay === day ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-muted hover:border-accent/30'
                  }`}
                >
                  {day}
                </button>
                {selectedDay === day && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-surface p-1 rounded-full shadow-lg border border-border z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveDay(day, 'left'); }}
                      className="p-1.5 bg-surface-2 rounded-full text-muted hover:text-accent transition-colors"
                      title="Влево"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveDay(day, 'right'); }}
                      className="p-1.5 bg-surface-2 rounded-full text-muted hover:text-accent transition-colors"
                      title="Вправо"
                    >
                      <ChevronRight size={12} />
                    </button>
                    {Object.keys(localProgram).length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeDay(day); }}
                        className="p-1.5 bg-red-50 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                        title="Удалить"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <button 
              onClick={addDay}
              className="px-4 py-2 rounded-xl text-[11px] font-bold border border-dashed border-accent text-accent bg-accent/5 hover:bg-accent/10 transition-all flex items-center gap-1"
            >
              <Plus size={14} /> День
            </button>
          </div>

          {/* Day Settings */}
          <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Название дня</label>
                <input 
                  type="text" 
                  value={localDayName || ''}
                  onChange={(e) => setLocalDayName(e.target.value)}
                  onBlur={() => renameDay(selectedDay, localDayName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameDay(selectedDay, localDayName);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Например: День 1 или Кардио"
                  className="w-full py-3 px-4 bg-surface-2/50 border-2 border-border rounded-xl focus:border-accent outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Подзаголовок дня</label>
                <input 
                  type="text" 
                  value={localProgram[selectedDay]?.subtitle || ''}
                  onChange={(e) => updateDay(selectedDay, 'subtitle', e.target.value)}
                  placeholder="Например: Ягодицы + Ноги"
                  className="w-full py-3 px-4 bg-surface-2/50 border-2 border-border rounded-xl focus:border-accent outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
               <input 
                type="checkbox" 
                id="isCardio"
                checked={localProgram[selectedDay]?.isCardio || false}
                onChange={(e) => updateDay(selectedDay, 'isCardio', e.target.checked)}
                className="w-5 h-5 accent-accent"
              />
              <label htmlFor="isCardio" className="text-sm font-bold text-text">Это кардио-день</label>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Упражнения</h3>
              <button 
                onClick={() => addExercise(selectedDay)}
                className="flex items-center gap-1 text-accent text-[10px] font-bold uppercase tracking-wider hover:underline"
              >
                <Plus size={14} /> Добавить
              </button>
            </div>

            <div className="space-y-3">
              {localProgram[selectedDay].exercises.map((ex: any, idx: number) => (
                <div key={idx} className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-3 relative group">
                  <button 
                    onClick={() => removeExercise(selectedDay, idx)}
                    className="absolute top-2 right-2 p-1 text-muted hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted uppercase font-bold ml-1">Название</label>
                      <input 
                        type="text" 
                        value={ex.name || ''}
                        onChange={(e) => updateExercise(selectedDay, idx, 'name', e.target.value)}
                        className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted uppercase font-bold ml-1">
                        {localProgram[selectedDay]?.isCardio ? 'Цель (напр. 30 мин)' : 'Схема (напр. 3 x 12)'}
                      </label>
                      <input 
                        type="text" 
                        value={ex.scheme || ''}
                        onChange={(e) => updateExercise(selectedDay, idx, 'scheme', e.target.value)}
                        className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted uppercase font-bold ml-1">
                        {localProgram[selectedDay]?.isCardio ? 'Кол-во интервалов' : 'Кол-во сетов'}
                      </label>
                      <input 
                        type="number" 
                        value={ex.sets || 0}
                        onChange={(e) => updateExercise(selectedDay, idx, 'sets', parseInt(e.target.value) || 0)}
                        className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted uppercase font-bold ml-1">
                        {localProgram[selectedDay]?.isCardio ? 'Поля (через запятую)' : 'Подсказка (необязательно)'}
                      </label>
                      {localProgram[selectedDay]?.isCardio ? (
                        <input 
                          type="text" 
                          value={ex.fields?.join(', ') || 'мин, км, пульс'}
                          onChange={(e) => updateExercise(selectedDay, idx, 'fields', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="мин, км, пульс"
                          className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                        />
                      ) : (
                        <input 
                          type="text" 
                          value={ex.tip || ''}
                          onChange={(e) => updateExercise(selectedDay, idx, 'tip', e.target.value)}
                          className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-surface flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 border-2 border-border text-muted font-bold rounded-2xl hover:bg-surface-2 transition-all"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] py-4 bg-accent text-white font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Settings size={22} />
              </motion.div>
            ) : (
              <Save size={22} />
            )}
            {isSaving ? 'Сохранение...' : 'Сохранить программу'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- COACH PAGE ---

function CoachPage({ 
  workouts, 
  measurements, 
  strengthRecords,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  programData,
  techData,
  userProfile,
  setNotification
}: any) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualApiKey, setManualApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(manualApiKey);

  const apiKey = manualApiKey || 
                 process.env.GEMINI_API_KEY || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 process.env.GEMINI_API_KEY_2 || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY_2;

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempApiKey);
    setManualApiKey(tempApiKey);
    setShowApiKeySettings(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          // Check size - limit to 1MB for Firestore base64 safety
          if (file.size > 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max = 800;
                if (width > height) {
                  if (width > max) {
                    height *= max / width;
                    width = max;
                  }
                } else {
                  if (height > max) {
                    width *= max / height;
                    height = max;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                setImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.7)]);
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
          } else {
            const reader = new FileReader();
            reader.onload = (event) => {
              setImages(prev => [...prev, event.target?.result as string]);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('coach_messages');
    setInput('');
    setImages([]);
    setShowClearConfirm(false);
  };

  const handleSend = async (customInput?: string, customImages?: string[], audioBlob?: Blob) => {
    const textToSend = customInput || input;
    const imagesToSend = customImages || images;
    
    if ((!textToSend.trim() && imagesToSend.length === 0 && !audioBlob) || isLoading) return;

    const userMsg: any = { role: 'user', content: textToSend };
    if (imagesToSend.length > 0) userMsg.images = imagesToSend;
    if (audioBlob) userMsg.isAudio = true;

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setImages([]);
    setIsLoading(true);

    try {
      const currentApiKey = 
        manualApiKey ||
        (import.meta as any).env?.VITE_GEMINI_API_KEY || 
        (process.env as any).GEMINI_API_KEY || 
        (process.env as any).API_KEY ||
        (window as any).GEMINI_API_KEY;
      
      if (!currentApiKey || currentApiKey === "undefined" || currentApiKey === "") {
        throw new Error("API ключ не найден. Пожалуйста, проверьте настройки в меню чата (иконка шестеренки). 🧘‍♀️");
      }
      
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const modelName = "gemini-3-flash-preview";
      
      const systemPrompt = `Ты — профессиональный ИИ-фитнес-тренер. Твой стиль: объективный, конструктивный, лаконичный. Ты анализируешь данные тренировок, замеров и силовых рекордов. Твоя цель — помочь пользователю достичь спортивных результатов безопасно и эффективно.
Ты можешь:
1. Обновлять программу тренировок (инструмент update_training_program).
2. Обновлять технику выполнения упражнений (инструмент update_tech_data).
3. Добавлять замеры биоимпеданса (инструмент add_bioimpedance_measurement).
Все данные о теле (замеры, вес) предоставлены исключительно в фитнес-целях.`;

      const dataContext = `
        ПЕРЕМЕННЫЕ ПОЛЬЗОВАТЕЛЯ (ДЛЯ АНАЛИЗА):
        - ТРЕНИРОВКИ: ${JSON.stringify(workouts.slice(-10))}
        - ЗАМЕРЫ: ${JSON.stringify(measurements.slice(-10))}
        - СИЛОВЫЕ РЕКОРДЫ: ${JSON.stringify(strengthRecords.slice(-20))}
        - ТЕКУЩАЯ ПРОГРАММА: ${JSON.stringify(programData)}
        - ТЕХНИКА ВЫПОЛНЕНИЯ: ${JSON.stringify(techData)}
      `;

      const callGeminiWithRetry = async (params: any, maxRetries = 3) => {
        let retryCount = 0;
        while (retryCount <= maxRetries) {
          try {
            return await ai.models.generateContent(params);
          } catch (err: any) {
            const errStr = err?.message?.toLowerCase() || "";
            const isRateLimit = errStr.includes("quota") || errStr.includes("429") || errStr.includes("rate limit") || errStr.includes("rate exceeded");
            
            if (isRateLimit && retryCount < maxRetries) {
              retryCount++;
              const delay = Math.pow(2, retryCount) * 1000;
              console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            if (errStr.includes("safety") || errStr.includes("blocked") || errStr.includes("candidate")) {
              console.warn("Safety block triggered, retrying with minimal context...");
              return await ai.models.generateContent({
                model: modelName,
                contents: [{ 
                  role: 'user', 
                  parts: [{ text: `Пользователь спрашивает: "${textToSend}". Ответь на вопрос пользователя максимально полезно, используя свои знания о фитнесе.` }] 
                }],
                config: {
                  safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                  ]
                }
              });
            }
            throw err;
          }
        }
        throw new Error("Превышено количество попыток запроса к ИИ.");
      };

      const userParts: any[] = [];
      if (textToSend && typeof textToSend === 'string' && textToSend.trim()) {
        userParts.push({ text: textToSend });
      }

      if (audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(audioBlob);
        const base64Data = await base64Promise;
        userParts.push({
          inlineData: {
            data: base64Data,
            mimeType: audioBlob.type || "audio/webm"
          }
        });
      }

      if (imagesToSend.length > 0) {
        imagesToSend.forEach(img => {
          const parts = img.split(',');
          if (parts.length > 1) {
            const mimeType = img.split(';')[0].split(':')[1] || "image/jpeg";
            userParts.push({
              inlineData: {
                data: parts[1],
                mimeType: mimeType
              }
            });
          }
        });
      }

      if (userParts.length === 0) return;

      const buildHistory = (msgs: any[]) => {
        const contents: any[] = [];
        const history = msgs.slice(-10);
        let lastRole = '';
        
        history.forEach((m: any) => {
          const role = m.role === 'user' ? 'user' : 'model';
          if (role === lastRole) return;
          
          const parts: any[] = [];
          if (m.content && m.content.trim()) {
            parts.push({ text: m.content });
          }
          
          if (m.images && m.images.length > 0) {
            m.images.forEach((img: string) => {
              const imgParts = img.split(',');
              if (imgParts.length > 1) {
                const mimeType = img.split(';')[0].split(':')[1] || "image/jpeg";
                parts.push({ inlineData: { data: imgParts[1], mimeType: mimeType } });
              }
            });
          }
          
          if (parts.length > 0) {
            contents.push({ role, parts });
            lastRole = role;
          }
        });

        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
          contents.pop();
        }
        
        while (contents.length > 0 && contents[0].role !== 'user') {
          contents.shift();
        }
        return contents;
      };

      const contents = [...buildHistory(messages), { role: 'user', parts: userParts }];

      const response = await callGeminiWithRetry({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ],
          tools: [{
            functionDeclarations: [{
              name: "update_training_program",
              description: "Обновить программу тренировок пользователя. Принимает полный объект программы.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  newData: {
                    type: Type.OBJECT,
                    description: "Новый объект программы тренировок.",
                    properties: {
                      days: {
                        type: Type.ARRAY,
                        description: "Список тренировочных дней",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING, description: "Название дня (например, День 1)" },
                            subtitle: { type: Type.STRING, description: "Подзаголовок (например, Ноги)" },
                            isCardio: { type: Type.BOOLEAN, description: "Является ли тренировка кардио" },
                            exercises: {
                              type: Type.ARRAY,
                              description: "Список упражнений",
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  name: { type: Type.STRING, description: "Название упражнения" },
                                  scheme: { type: Type.STRING, description: "Схема выполнения (например, 3 x 12 или 30 мин)" },
                                  sets: { type: Type.NUMBER, description: "Количество подходов или интервалов" },
                                  tip: { type: Type.STRING, description: "Подсказка или техника выполнения" },
                                  isCardio: { type: Type.BOOLEAN, description: "Является ли упражнение кардио" },
                                  fields: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING },
                                    description: "Поля для ввода данных (например, ['мин', 'км', 'пульс'])"
                                  }
                                },
                                required: ["name", "scheme", "sets"]
                              }
                            }
                          },
                          required: ["name", "subtitle", "exercises"]
                        }
                      }
                    },
                    required: ["days"]
                  }
                },
                required: ["newData"]
              }
            }, {
              name: "update_tech_data",
              description: "Обновить данные во вкладке 'Техника'. Принимает полный массив элементов техники.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  newItems: {
                    type: Type.ARRAY,
                    description: "Новый массив элементов техники.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING, description: "Заголовок (название упражнения)" },
                        subtitle: { type: Type.STRING, description: "Подзаголовок (например, группа мышц)" },
                        content: { type: Type.STRING, description: "Текст техники выполнения (можно использовать переносы строк)" }
                      },
                      required: ["title", "subtitle", "content"]
                    }
                  }
                },
                required: ["newItems"]
              }
            }, {
              name: "add_bioimpedance_measurement",
              description: "Добавить новые замеры тела и биоимпеданса. Используй этот инструмент, когда пользователь присылает скриншот с весов или просит записать новые замеры.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Дата замера в формате YYYY-MM-DD" },
                  weight: { type: Type.NUMBER, description: "Вес в кг" },
                  age: { type: Type.NUMBER, description: "Возраст" },
                  fat: { type: Type.NUMBER, description: "Процент жира (%)" },
                  muscle: { type: Type.NUMBER, description: "Мышечная масса (кг)" },
                  water: { type: Type.NUMBER, description: "Содержание воды (%)" },
                  bmi: { type: Type.NUMBER, description: "ИМТ (Индекс массы тела)" },
                  visceralFat: { type: Type.NUMBER, description: "Висцеральный жир" },
                  skeletalMuscleIndex: { type: Type.NUMBER, description: "Индекс скелетной мускулатуры" },
                  waistHipRatio: { type: Type.NUMBER, description: "Соотношение талия/бедра" },
                  bodyType: { type: Type.STRING, description: "Тип телосложения" },
                  bodyShape: { type: Type.STRING, description: "Форма тела" },
                  bmr: { type: Type.NUMBER, description: "Базальный метаболизм (BMR / УБМ)" },
                  boneMass: { type: Type.NUMBER, description: "Костная масса" },
                  protein: { type: Type.NUMBER, description: "Белок (%)" },
                  fatFreeMass: { type: Type.NUMBER, description: "Масса тела без жира" },
                  biologicalAge: { type: Type.NUMBER, description: "Биологический возраст" },
                  heartRate: { type: Type.NUMBER, description: "Пульс (ЧСС)" },
                  chest: { type: Type.NUMBER, description: "Грудь (см)" },
                  waist: { type: Type.NUMBER, description: "Талия (см)" },
                  waistHigh: { type: Type.NUMBER, description: "Талия (высоко) (см)" },
                  waistNavel: { type: Type.NUMBER, description: "Талия (по пупку) (см)" },
                  waistWidest: { type: Type.NUMBER, description: "Талия (широкая часть) (см)" },
                  hips: { type: Type.NUMBER, description: "Бедра (см)" },
                  bicep: { type: Type.NUMBER, description: "Бицепс (см)" },
                  thigh: { type: Type.NUMBER, description: "Бедро (см)" }
                },
                required: ["date", "weight"]
              }
            }]
          }]
        }
      });

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'update_training_program') {
            const { newData } = call.args as any;
            
            let formattedData = newData;
            if (newData.days && Array.isArray(newData.days)) {
              formattedData = {};
              newData.days.forEach((day: any) => {
                formattedData[day.name] = {
                  subtitle: day.subtitle,
                  isCardio: day.isCardio,
                  exercises: day.exercises
                };
              });
            }

            if (typeof (window as any).handleUpdateProgramFromCoach === 'function') {
              await (window as any).handleUpdateProgramFromCoach(formattedData);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...contents,
                  response.candidates[0].content,
                  { 
                    role: 'user', 
                    parts: response.functionCalls.map(call => ({ 
                      functionResponse: { 
                        name: call.name, 
                        response: { status: 'success' }, 
                        id: call.id 
                      } 
                    })) 
                  }
                ],
                config: {
                  systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
                }
              });
              
              const aiMsg = { role: 'assistant', content: confirmResponse.text || "Программа успешно обновлена! 💪" };
              setMessages([...newMessages, aiMsg]);
              setIsLoading(false);
              return;
            }
          } else if (call.name === 'update_tech_data') {
            const { newItems } = call.args as any;
            
            if (typeof (window as any).handleUpdateTechFromCoach === 'function') {
              await (window as any).handleUpdateTechFromCoach(newItems);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...contents,
                  response.candidates[0].content,
                  { 
                    role: 'user', 
                    parts: response.functionCalls.map(call => ({ 
                      functionResponse: { 
                        name: call.name, 
                        response: { status: 'success' }, 
                        id: call.id 
                      } 
                    })) 
                  }
                ],
                config: {
                  systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
                }
              });
              
              const aiMsg = { role: 'assistant', content: confirmResponse.text || "Данные техники успешно обновлены! 📚" };
              setMessages([...newMessages, aiMsg]);
              setIsLoading(false);
              return;
            }
          } else if (call.name === 'add_bioimpedance_measurement') {
            const measurementData = call.args as any;
            
            if (typeof (window as any).handleSaveWeightFromCoach === 'function') {
              await (window as any).handleSaveWeightFromCoach(measurementData);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...contents,
                  response.candidates[0].content,
                  { 
                    role: 'user', 
                    parts: response.functionCalls.map(call => ({ 
                      functionResponse: { 
                        name: call.name, 
                        response: { status: 'success' }, 
                        id: call.id 
                      } 
                    })) 
                  }
                ],
                config: {
                  systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
                }
              });
              
              const aiMsg = { role: 'assistant', content: confirmResponse.text || "Замеры успешно сохранены! 📊" };
              setMessages([...newMessages, aiMsg]);
              setIsLoading(false);
              return;
            }
          }
        }
      }

      const aiMsg = { role: 'assistant', content: response.text || "Извини, я не смогла сформулировать ответ. Попробуй еще раз! 🧘‍♀️" };
      setMessages([...newMessages, aiMsg]);
    } catch (error: any) {
      console.error("Coach error details:", error);
      
      let errorMessage = "Извини, произошла ошибка при связи с ИИ. Попробуй еще раз позже или проверь интернет-соединение. 🧘‍♀️";
      
      if (error?.message?.includes("API key")) {
        errorMessage = "Ошибка: API ключ не найден или недействителен. Пожалуйста, проверьте настройки. 🧘‍♀️";
      } else if (error?.message?.toLowerCase().includes("safety") || error?.message?.toLowerCase().includes("blocked")) {
        errorMessage = "Извини, запрос был заблокирован фильтрами безопасности. Попробуй перефразировать вопрос. 🧘‍♀️";
      } else if (error?.message?.toLowerCase().includes("quota") || error?.message?.toLowerCase().includes("429") || error?.message?.toLowerCase().includes("rate exceeded")) {
        errorMessage = "Превышен лимит запросов к ИИ (Rate Limit). Пожалуйста, подождите немного и попробуйте снова. 🧘‍♀️";
      } else if (error?.message?.includes("500") || error?.message?.includes("503")) {
        errorMessage = "Сервер ИИ временно недоступен. Попробуйте еще раз через минуту. 🧘‍♀️";
      } else {
        errorMessage = `Ошибка связи: ${error?.message || "Неизвестная ошибка"}. Попробуйте очистить чат (корзина) и повторить. 🧘‍♀️`;
      }
      
      setMessages([...newMessages, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSend("", [], audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setNotification({
        show: true,
        title: 'Ошибка',
        message: 'Не удалось получить доступ к микрофону. Проверьте разрешения в браузере.'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex flex-col h-[calc(100dvh-160px)]"
    >
      <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-accent">FitTrack-Pro ИИ</h2>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Персональные советы и мотивация</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleSend("Проанализируй мой прогресс за последнее время")}
            className="px-4 py-2 bg-accent/5 hover:bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded-xl border border-accent/20 transition-all flex items-center gap-2"
          >
            <TrendingUp size={14} />
            Анализ
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="p-2 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-100 transition-all"
              title="Очистить чат"
            >
              <Trash2 size={16} />
            </button>
            {showClearConfirm && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl p-3 z-50">
                <p className="text-[10px] font-bold mb-2">Очистить историю чата?</p>
                <div className="flex gap-2">
                  <button onClick={handleClearChat} className="flex-1 py-1 bg-red-500 text-white text-[10px] rounded-lg">Да</button>
                  <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-1 bg-surface-2 text-muted text-[10px] rounded-lg">Нет</button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowApiKeySettings(!showApiKeySettings)}
              className={`p-2 rounded-xl border transition-all ${manualApiKey ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface-2 text-muted border-border'}`}
              title="Настройки API"
            >
              <Settings size={16} />
            </button>
            {showApiKeySettings && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-2xl shadow-xl p-5 z-50 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-text mb-2 uppercase tracking-wider">Настройки Gemini API</h4>
                <p className="text-[10px] text-muted mb-4">Если ИИ не работает, вставьте свой ключ API. Его можно получить бесплатно на <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-accent underline">AI Studio</a>.</p>
                <input 
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Вставьте API ключ..."
                  className="w-full bg-surface-2 border-2 border-border p-3 rounded-xl text-xs font-bold mb-4 outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveApiKey}
                    className="flex-1 py-2 bg-accent text-white text-[10px] font-bold uppercase rounded-lg shadow-sm"
                  >
                    Сохранить
                  </button>
                  <button 
                    onClick={() => setShowApiKeySettings(false)}
                    className="flex-1 py-2 bg-surface-2 text-text text-[10px] font-bold uppercase rounded-lg"
                  >
                    Отмена
                  </button>
                </div>
                {manualApiKey && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem('gemini_api_key');
                      setManualApiKey('');
                      setTempApiKey('');
                      setShowApiKeySettings(false);
                    }}
                    className="w-full mt-3 py-2 text-[9px] text-red-500 font-bold uppercase hover:bg-red-50 rounded-lg transition-all"
                  >
                    Сбросить ключ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar mb-4">
        {!apiKey && (
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-red-600 text-xs font-bold flex items-center gap-3">
            <AlertCircle size={20} />
            <div>
              API ключ не найден. Пожалуйста, добавьте его в секреты проекта (GEMINI_API_KEY).
            </div>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <Sparkles className="mx-auto mb-4 text-accent" size={32} />
            <p className="text-sm font-medium">Привет! Я твой ИИ тренер. <br/> Спроси меня о прогрессе, технике или пришли фото формы! ✨</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m: any, i: number) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-accent text-white rounded-tr-none' 
                  : 'bg-surface border border-border text-text rounded-tl-none'
              }`}>
                {m.images && m.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {m.images.map((img: string, imgIdx: number) => (
                      <img key={imgIdx} src={img} alt="Uploaded" className="w-full h-32 object-cover rounded-2xl border border-white/20" />
                    ))}
                  </div>
                )}
                {m.isAudio && (
                  <div className="flex items-center gap-2 mb-2 text-white/80 bg-white/10 p-2 rounded-xl">
                    <Mic size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Голосовое сообщение</span>
                  </div>
                )}
                {m.role === 'assistant' ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-surface border border-border p-4 rounded-3xl rounded-tl-none flex gap-1">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
            </div>
          </motion.div>
        )}
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="space-y-3"
      >
        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {images.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                <img src={img} alt="Preview" className="h-20 w-20 object-cover rounded-2xl border-2 border-accent shadow-lg" />
                <button 
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="relative">
          {isRecording ? (
            <div className="w-full py-4 pl-24 pr-16 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center shadow-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></div>
              <span className="text-red-500 font-bold font-mono">
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                {(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="ml-2 text-red-400 text-xs uppercase tracking-widest font-bold">Запись...</span>
            </div>
          ) : (
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спроси тренера или прикрепи фото..."
              className="w-full py-4 pl-24 pr-16 bg-surface border-2 border-border rounded-2xl focus:border-accent focus:outline-none transition-all shadow-sm font-medium"
            />
          )}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-all"
          >
            <Camera size={24} />
          </button>
          <button 
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`absolute left-14 top-1/2 -translate-y-1/2 transition-all ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted hover:text-accent'}`}
            title={isRecording ? "Остановить запись" : "Записать голосовое"}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={24} />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
          <button 
            type="submit"
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="absolute right-2 top-2 bottom-2 px-4 bg-accent text-white rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ProfilePage({ 
  profile, 
  onUpdate, 
  onLogout,
  setActiveTab,
  onExportData,
  onImportData,
  theme,
  setTheme
}: { 
  profile: UserProfile | null; 
  onUpdate: (data: any) => Promise<void>; 
  onLogout: () => void;
  setActiveTab: (tab: any) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}) {
  const [name, setName] = useState(profile?.displayName || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [isConfirmOpen, setIsConfirmOpen] = useState<{ type: 'delete' | 'logout' | 'export' | 'import' | null; action: () => void }>({ type: null, action: () => {} });
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const openConfirm = (type: 'delete' | 'logout' | 'export' | 'import', action: () => void) => {
    setIsConfirmOpen({ type, action });
  };

  const closeConfirm = () => {
    setIsConfirmOpen({ type: null, action: () => {} });
  };

  const handleDeleteAllData = async () => {
    try {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      
      // Delete user document
      await deleteDoc(doc(db, 'users', userId));
      
      // Delete current_workout document
      await deleteDoc(doc(db, 'current_workout', userId));
      
      // Delete programs document
      await deleteDoc(doc(db, 'programs', userId));
      
      // Delete workouts
      const workoutsQuery = query(collection(db, 'workouts'), where('userId', '==', userId));
      const workoutsSnapshot = await getDocs(workoutsQuery);
      const batch = writeBatch(db);
      workoutsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete measurements
      const measurementsQuery = query(collection(db, 'measurements'), where('userId', '==', userId));
      const measurementsSnapshot = await getDocs(measurementsQuery);
      measurementsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete strength records
      const strengthQuery = query(collection(db, 'strength'), where('userId', '==', userId));
      const strengthSnapshot = await getDocs(strengthQuery);
      strengthSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete tech items
      const techQuery = query(collection(db, 'tech'), where('userId', '==', userId));
      const techSnapshot = await getDocs(techQuery);
      techSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log("All data deleted successfully.");
      onLogout(); // Logout after successful deletion
    } catch (error) {
      console.error("Error deleting all data:", error);
      // Handle error (e.g., show notification)
    } finally {
      closeConfirm();
    }
  };
  
  const handleSaveProfile = async () => {
    try {
      await onUpdate({
        displayName: name,
        age: age ? Number(age) : null,
        goal: goal
      });
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center text-accent overflow-hidden">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={32} />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-text">{profile?.displayName || 'Пользователь'}</h2>
          <p className="text-xs text-muted font-bold uppercase tracking-widest">{profile?.email}</p>
        </div>
      </div>

      <div className="bg-surface border-2 border-border rounded-[32px] p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Личные данные</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-2">Имя</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-sm font-bold outline-none focus:border-accent transition-all"
            />
          </div>
          
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-2">Возраст</label>
            <input 
              type="number" 
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-sm font-bold outline-none focus:border-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-2">Главная цель</label>
            <input 
              type="text" 
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Например: Набрать 5кг мышц"
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-sm font-bold outline-none focus:border-accent transition-all"
            />
          </div>

          <button 
            onClick={handleSaveProfile}
            className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all mt-4"
          >
            Сохранить изменения
          </button>
        </div>
      </div>

      <div className="bg-surface border-2 border-border rounded-[32px] p-6 space-y-4">
        <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Оформление</h3>
        <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-accent" />}
            <span className="text-sm font-bold text-text">Темная тема</span>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-accent' : 'bg-border'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-accent/5 border-2 border-accent/10 rounded-[32px] p-6 space-y-4 mt-8">
        <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Управление данными</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => openConfirm('export', onExportData)} className="flex flex-col items-center p-6 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-all">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-3"><Download size={24} /></div>
            <span className="text-xs font-bold uppercase">Экспорт</span>
          </button>
          <button onClick={() => openConfirm('import', () => backupFileInputRef.current?.click())} className="flex flex-col items-center p-6 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-all">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-3"><Upload size={24} /></div>
            <span className="text-xs font-bold uppercase">Импорт</span>
          </button>
          <input 
            type="file" 
            ref={backupFileInputRef}
            onChange={(e) => {
              onImportData(e);
              closeConfirm();
            }} 
            accept=".json" 
            className="hidden" 
          />
        </div>
        
        <div className="pt-4 border-t border-border/50">
          <button onClick={() => openConfirm('logout', onLogout)} className="w-full flex items-center justify-between p-4 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-all text-text">
            <span className="font-bold">Выйти из аккаунта</span>
            <LogOut size={20} className="text-muted" />
          </button>
        </div>

        <div className="pt-4 border-t border-border/50">
          <button onClick={() => openConfirm('delete', handleDeleteAllData)} className="w-full flex items-center justify-between p-4 bg-red-500/10 rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all text-red-500">
            <span className="font-bold">Удалить все данные</span>
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      {isConfirmOpen.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-surface p-6 rounded-3xl border border-border shadow-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-text mb-2">
              {isConfirmOpen.type === 'delete' ? 'Удалить все данные?' : isConfirmOpen.type === 'logout' ? 'Выйти из аккаунта?' : isConfirmOpen.type === 'export' ? 'Экспортировать данные?' : 'Импортировать данные?'}
            </h3>
            <p className="text-sm text-muted mb-6">
              {isConfirmOpen.type === 'delete' ? 'Это действие нельзя отменить. Все твои тренировки и замеры будут удалены навсегда.' : isConfirmOpen.type === 'logout' ? 'Ты сможешь войти снова в любое время.' : isConfirmOpen.type === 'export' ? 'Будет создан файл с твоими данными.' : 'Это может перезаписать текущие данные.'}
            </p>
            <div className="flex gap-3">
              <button onClick={closeConfirm} className="flex-1 py-3 bg-surface-2 text-text font-bold rounded-xl">Отмена</button>
              <button onClick={isConfirmOpen.action} className={`flex-1 py-3 font-bold rounded-xl ${isConfirmOpen.type === 'delete' ? 'bg-red-500 text-white' : 'bg-accent text-white'}`}>
                {isConfirmOpen.type === 'delete' ? 'Удалить' : isConfirmOpen.type === 'logout' ? 'Выйти' : isConfirmOpen.type === 'export' ? 'Экспорт' : 'Импорт'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* ... rest of the content ... */}
      
      {/* Update the data management section */}
      <div className="bg-accent/5 border-2 border-accent/10 rounded-[32px] p-6 space-y-4 mt-8">
        <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Управление данными</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => openConfirm('export', onExportData)} className="flex flex-col items-center p-6 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-all">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-3"><Download size={24} /></div>
            <span className="text-xs font-bold uppercase">Экспорт</span>
          </button>
          <button onClick={() => openConfirm('import', () => backupFileInputRef.current?.click())} className="flex flex-col items-center p-6 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-all">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-3"><Upload size={24} /></div>
            <span className="text-xs font-bold uppercase">Импорт</span>
          </button>
          <input 
            type="file" 
            ref={backupFileInputRef}
            onChange={onImportData}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Update the dangerous zone section */}
      <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Опасная зона</h3>
        <div className="space-y-2">
          <button onClick={() => openConfirm('delete', handleDeleteAllData)} className="w-full flex items-center justify-between p-4 bg-surface-2/50 rounded-2xl hover:bg-red-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500"><RotateCcw size={20} /></div>
              <span className="text-sm font-bold text-text group-hover:text-red-600">Сбросить все данные</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </button>
          <button onClick={() => openConfirm('logout', onLogout)} className="w-full flex items-center justify-between p-4 bg-surface-2/50 rounded-2xl hover:bg-accent/5 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-text"><LogOut size={20} /></div>
              <span className="text-sm font-bold text-text">Выйти из аккаунта</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
function NavTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 min-w-[90px] py-2.5 px-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all shadow-sm ${
        active ? 'bg-accent text-white border-accent' : 'bg-surface text-muted border-border hover:border-accent/30'
      } border`}
    >
      {label}
    </button>
  );
}

function TodayPage({ 
  currentDay, 
  setCurrentDay, 
  checkedExercises, 
  setCheckedExercises, 
  currentSets, 
  setCurrentSets,
  currentNotes,
  setCurrentNotes,
  onFinish,
  workouts,
  programData,
  onEditProgram,
  onReset,
  isLoading
}: any) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest">Загрузка плана...</p>
      </div>
    );
  }

  const program = programData[currentDay];
  
  if (Object.keys(programData).length === 0) {
    return (
      <div className="text-center py-20 bg-surface rounded-[40px] border border-border shadow-sm">
        <AlertTriangle className="mx-auto mb-4 text-accent" size={48} />
        <p className="text-sm font-bold text-text mb-4">Программа пуста</p>
        <button 
          onClick={() => onReset()} 
          className="px-6 py-3 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest"
        >
          Восстановить по умолчанию
        </button>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-20 bg-surface rounded-[40px] border border-border shadow-sm">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
        <p className="text-sm font-bold text-text mb-4">День не найден в программе</p>
        <button onClick={() => setCurrentDay(Object.keys(programData)[0])} className="px-6 py-3 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest">
          Вернуться к началу
        </button>
      </div>
    );
  }

  const total = program.exercises.length;
  const done = checkedExercises.length;
  const pct = Math.round((done / total) * 100);

  const isCompletedToday = workouts.some((w: any) => w.day === currentDay && isSameDay(new Date(w.date), new Date()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <Dumbbell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-accent">Твой план</h2>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Тренировка на сегодня</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onEditProgram}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-accent/20 transition-all"
          >
            <Settings size={14} />
            Изменить программу
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {Object.keys(programData).map(day => (
          <button 
            key={day}
            onClick={() => setCurrentDay(day)}
            className={`flex-shrink-0 px-5 py-3 border rounded-2xl text-[11px] font-bold transition-all shadow-sm ${
              currentDay === day ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-muted hover:border-accent/30'
            }`}
          >
            {day}<br/>
            <span className={`text-[9px] ${currentDay === day ? 'text-white/80' : 'text-muted/70'}`}>{programData[day].subtitle}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3 bg-surface p-5 rounded-3xl border border-border shadow-sm">
        <div className="flex justify-between text-[10px] text-muted uppercase font-bold tracking-wider">
          <span>{program.isCardio ? '🏃 ' : '💪 '}{program.subtitle}</span>
          <span className="text-accent">{done}/{total}</span>
        </div>
        <div className="h-[6px] bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {program.isCardio && (
        <div className="bg-accent/5 border-2 border-accent/20 rounded-3xl p-5 text-[12px] text-muted leading-relaxed shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎯</span>
            <span className="text-accent font-bold uppercase tracking-wider">Пульсовая зона: 115–130 уд/мин</span>
          </div>
          <p className="font-medium">Не выше 140! Разговаривать должно быть возможно, но чуть тяжело. Держи темп! 🔥</p>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {program.exercises.map((ex: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <ExerciseCard 
                exercise={ex}
                index={idx}
                isCardioDay={program.isCardio}
                isChecked={checkedExercises.includes(idx)}
                onCheck={() => {
                  setCheckedExercises((prev: number[]) => 
                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                  );
                }}
                sets={currentSets[idx] || []}
                onUpdateSet={(sIdx: number, field: number, val: string) => {
                  setCurrentSets((prev: any) => {
                    const updated = { ...prev };
                    const isCardio = ex.isCardio || program.isCardio;
                    const fieldCount = isCardio ? (ex.fields?.length || 3) : 2;
                    
                    if (!updated[idx]) {
                      updated[idx] = Array(ex.sets).fill(null).map(() => Array(fieldCount).fill(''));
                    }
                    
                    updated[idx] = updated[idx].map((set: any[], i: number) => 
                      i === sIdx ? set.map((v, f) => f === field ? val : v) : set
                    );
                    
                    return updated;
                  });
                }}
                note={currentNotes[idx] || ''}
                onUpdateNote={(val: string) => setCurrentNotes((prev: any) => ({ ...prev, [idx]: val }))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {done === total && !isCompletedToday && (
        <button 
          onClick={onFinish}
          className="w-full py-5 bg-gradient-to-r from-done to-[#4a8e4a] text-white font-bold text-sm uppercase tracking-[0.2em] rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          ✓ Завершить тренировку
        </button>
      )}

      {isCompletedToday && (
        <div className="text-center py-12 bg-done/10 rounded-[40px] border-2 border-done/20 text-done font-bold text-lg shadow-inner">
          ✨ Тренировка на сегодня выполнена! <br/>
          <span className="text-sm opacity-80">Ты просто супер! Отдыхай и восстанавливайся. 🧘‍♀️</span>
        </div>
      )}
    </motion.div>
  );
}

function ExerciseCard({ exercise, index, isCardioDay, isChecked, onCheck, sets, onUpdateSet, note, onUpdateNote }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const isCardio = exercise.isCardio || isCardioDay;

  return (
    <div className={`bg-surface border-2 rounded-3xl overflow-hidden transition-all shadow-sm ${isChecked ? 'border-done bg-done/5' : 'border-border'}`}>
      <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className={`font-display text-2xl w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isChecked ? 'bg-done text-white' : 'bg-surface-2 text-muted'}`}>
          {index + 1}
        </div>
        <div className="flex-1">
          <div className={`text-[14px] font-bold ${isChecked ? 'text-done line-through opacity-60' : 'text-text'}`}>{exercise.name}</div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-accent-2 font-bold uppercase tracking-wider">{exercise.scheme}</div>
            {isCardio && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-lg font-bold uppercase">Кардио</span>}
          </div>
          {exercise.tip && <div className="text-[9px] text-muted mt-1 italic">💡 {exercise.tip}</div>}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onCheck(); }}
          className={`w-9 h-9 border-2 rounded-2xl flex items-center justify-center transition-all ${isChecked ? 'bg-done border-done text-white shadow-lg' : 'border-border text-transparent bg-surface hover:border-accent/30'}`}
        >
          {isChecked ? <CheckCircle2 size={20} /> : <div className="w-2 h-2 rounded-full bg-border" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array(exercise.sets).fill(0).map((_, sIdx) => (
                <div key={sIdx} className="bg-surface-2/50 border border-border rounded-2xl p-3 text-center">
                  <div className="text-[9px] text-muted uppercase font-bold mb-2">Сет {sIdx + 1}</div>
                  <div className="flex items-center justify-center gap-2">
                    {isCardio ? (
                      <div className="flex gap-2 justify-center">
                        {(exercise.fields || ["мин", "км", "пульс"]).map((f: string, fi: number) => (
                          <div key={fi} className="flex flex-col items-center">
                            <input 
                              type="number" 
                              step="any"
                              className="w-14 bg-surface border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all font-bold"
                              value={sets[sIdx]?.[fi] || ''}
                              onChange={(e) => onUpdateSet(sIdx, fi, e.target.value)}
                            />
                            <span className="text-[8px] text-muted font-bold mt-1 uppercase">{f}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center">
                          <input 
                            type="number" 
                            className="w-14 bg-surface border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all font-bold"
                            placeholder={exercise.bodyweight ? "раз" : "кг"}
                            value={sets[sIdx]?.[0] || ''}
                            onChange={(e) => onUpdateSet(sIdx, 0, e.target.value)}
                          />
                          <span className="text-[8px] text-muted font-bold mt-1 uppercase">{exercise.bodyweight ? 'раз' : 'кг'}</span>
                        </div>
                        
                        {!exercise.bodyweight && (
                          <>
                            <span className="text-accent font-bold text-sm mb-5">×</span>
                            <div className="flex flex-col items-center">
                              <input 
                                type="number" 
                                className="w-14 bg-surface border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all font-bold"
                                placeholder="раз"
                                value={sets[sIdx]?.[1] || ''}
                                onChange={(e) => onUpdateSet(sIdx, 1, e.target.value)}
                              />
                              <span className="text-[8px] text-muted font-bold mt-1 uppercase">раз</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <textarea 
                className="w-full bg-surface-2/50 border-2 border-border rounded-2xl p-3 text-[12px] text-text focus:border-accent outline-none h-16 resize-none transition-all"
                placeholder="Твои мысли, ощущения, победы..."
                value={note || ''}
                onChange={(e) => onUpdateNote(e.target.value)}
              />
              <div className="absolute right-3 bottom-3 text-accent/30"><Dumbbell size={14} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressPage({ workouts, onDelete, onUpdate, programData }: { workouts: Workout[]; onDelete: (id: string) => void; onUpdate: (id: string, data: any) => void; programData: any }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editDay, setEditDay] = useState('');

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = workouts.filter(w => {
      const d = new Date(w.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return {
      total: workouts.length,
      thisMonth,
      best: Math.floor(workouts.length / 3) // Placeholder
    };
  }, [workouts]);

  const handleStartEdit = (w: Workout) => {
    setEditingId(w.id);
    setEditDate(w.date.split('T')[0]);
    setEditDay(w.day);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    try {
      const d = new Date(editDate);
      if (!isNaN(d.getTime())) {
        onUpdate(editingId, { date: d.toISOString(), day: editDay });
      }
    } catch (e) {}
    setEditingId(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-accent">Прогресс</h3>
          <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Твои достижения</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatItem value={stats.total} label="тренировок" />
        <StatItem value={stats.thisMonth} label="в этом месяце" />
        <StatItem value={stats.best} label="лучшая серия" />
      </div>

      <div className="space-y-6">
        <h3 className="font-display text-2xl text-accent font-bold">История тренировок</h3>
        {workouts.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">
            Пока нет завершённых тренировок. <br/>Пора это исправить! 💪
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {workouts.map(w => (
                <motion.div 
                  key={w.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                  className="bg-surface border-2 border-border rounded-3xl p-5 shadow-sm hover:border-accent/30 transition-all"
                >
                  {editingId === w.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={editDate || ''}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-surface-2 border-2 border-border p-2 rounded-xl text-xs font-bold"
                      />
                      <select 
                        value={editDay || ''}
                        onChange={(e) => setEditDay(e.target.value)}
                        className="w-full bg-surface-2 border-2 border-border p-2 rounded-xl text-xs font-bold"
                      >
                        {Object.keys(programData).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="flex-1 py-2 bg-done text-white text-[10px] font-bold uppercase rounded-xl">Сохранить</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-surface-3 text-text text-[10px] font-bold uppercase rounded-xl">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[11px] text-muted font-bold uppercase tracking-wider mb-1">
                        {format(parseISO(w.date), 'd MMMM · HH:mm', { locale: ru })}
                      </div>
                      <div className="text-[15px] font-bold text-text">
                        {w.day} — {programData[w.day]?.subtitle}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleStartEdit(w)}
                        className="p-2 text-muted hover:text-accent transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(w.id)}
                        className="p-2 text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-surface border-2 border-border rounded-3xl p-5 text-center shadow-sm">
      <div className="font-display text-4xl text-accent font-bold leading-none mb-2">{value}</div>
      <div className="text-[10px] text-muted uppercase font-bold tracking-wider">{label}</div>
    </div>
  );
}

function StrengthPage({ records, onSave, onDelete, onUpdate, programData }: { records: StrengthRecord[]; onSave: (data: any) => void; onDelete: (id: string) => void; onUpdate: (id: string, data: any) => void; programData: any }) {
  const [exercise, setExercise] = useState('Ягодичный мостик со штангой');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  const byExercise = useMemo(() => {
    const groups: Record<string, StrengthRecord[]> = {};
    records.forEach(r => {
      if (!groups[r.exercise]) groups[r.exercise] = [];
      groups[r.exercise].push(r);
    });
    return groups;
  }, [records]);

  const handleSave = () => {
    if (!weight || !reps) return;
    onSave({ exercise, weight: Number(weight), reps: Number(reps) });
    setWeight('');
    setReps('');
  };

  const handleStartEdit = (r: StrengthRecord) => {
    setEditingId(r.id);
    setEditWeight(r.weight.toString());
    setEditReps(r.reps.toString());
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, { weight: Number(editWeight), reps: Number(editReps) });
    setEditingId(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
          <Scale size={20} />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-accent">Силовые</h3>
          <p className="text-[10px] text-muted uppercase font-bold tracking-widest">История весов</p>
        </div>
      </div>
      <div className="bg-surface border-2 border-border rounded-[32px] p-6 space-y-6 shadow-sm">
        <h3 className="font-display text-2xl text-accent font-bold">Записать вес</h3>
        <div className="space-y-4">
          <select 
            className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-[13px] font-bold outline-none focus:border-accent transition-all appearance-none"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            {Object.entries(programData).map(([day, p]: [string, any]) => (
              <optgroup key={day} label={`${day} — ${p.subtitle}`}>
                {p.exercises.filter((ex: any) => !ex.isCardio && !ex.bodyweight).map((ex: any, idx: number) => (
                  <option key={`${day}-${ex.name}-${idx}`} value={ex.name}>{ex.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Вес (кг)</label>
              <input 
                type="number" 
                className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
                value={weight || ''}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Повторы</label>
              <input 
                type="number" 
                className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
                value={reps || ''}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-accent hover:bg-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
          >
            Сохранить результат
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-display text-2xl text-accent font-bold">Мои веса</h3>
        {Object.keys(byExercise).length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">Нет записей. Фиксируй веса после тренировки! 🏋️‍♀️</div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {Object.entries(byExercise).map(([name, entries]) => {
                const strengthEntries = entries as StrengthRecord[];
                const sortedEntries = [...strengthEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latest = sortedEntries[0];
                const best = sortedEntries.reduce((max, e) => e.weight > max.weight ? e : max, sortedEntries[0]);
                
                return (
                  <motion.div 
                    key={name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                    className="bg-surface border-2 border-border rounded-3xl p-6 space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                    <div className="text-[14px] font-bold text-text flex-1">{name}</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-surface-2/50 p-3 rounded-2xl">
                      <div className="text-[9px] text-muted uppercase font-bold mb-1">Сейчас</div>
                      <div className="text-xl font-display font-bold text-accent">{latest.weight}кг</div>
                      <div className="text-[10px] text-muted font-bold">× {latest.reps}</div>
                    </div>
                    <div className="bg-accent-2/10 p-3 rounded-2xl">
                      <div className="text-[9px] text-muted uppercase font-bold mb-1">Рекорд</div>
                      <div className="text-xl font-display font-bold text-accent-2">{best.weight}кг</div>
                      <div className="text-[10px] text-muted font-bold">× {best.reps}</div>
                    </div>
                    <div className="bg-done/10 p-3 rounded-2xl">
                      <div className="text-[9px] text-muted uppercase font-bold mb-1">Цель</div>
                      <div className="text-xl font-display font-bold text-done">{Math.round((latest.weight + 1) * 2) / 2}кг</div>
                      <div className="text-[10px] text-muted font-bold">+1кг</div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="text-[10px] text-muted uppercase font-bold mb-2">История</div>
                    <AnimatePresence initial={false}>
                      {sortedEntries.map((entry, idx) => (
                        <motion.div 
                          key={entry.id || `${name}-${idx}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-between items-center text-[12px] py-1"
                        >
                          {editingId === entry.id ? (
                          <div className="flex-1 flex gap-2 items-center">
                            <input 
                              type="number" 
                              value={editWeight || ''}
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="w-16 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                            />
                            <span className="text-muted">кг x</span>
                            <input 
                              type="number" 
                              value={editReps || ''}
                              onChange={(e) => setEditReps(e.target.value)}
                              className="w-12 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                            />
                            <button onClick={handleSaveEdit} className="p-1 text-done"><Check size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-muted"><X size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <div className="text-muted font-medium">
                              {format(parseISO(entry.date), 'd MMM', { locale: ru })}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-text">{entry.weight}кг x {entry.reps}</div>
                              <div className="flex gap-1">
                                <button onClick={() => handleStartEdit(entry)} className="p-1 text-muted hover:text-accent"><Edit2 size={14}/></button>
                                <button onClick={() => onDelete(entry.id)} className="p-1 text-muted hover:text-red-500"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WeightPage({ 
  measurements, 
  onSave,
  onDelete,
  onUpdate
}: { 
  measurements: WeightMeasurement[]; 
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
}) {
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [water, setWater] = useState('');
  const [bmi, setBmi] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [skeletalMuscleIndex, setSkeletalMuscleIndex] = useState('');
  const [waistHipRatio, setWaistHipRatio] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [bmr, setBmr] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [protein, setProtein] = useState('');
  const [fatFreeMass, setFatFreeMass] = useState('');
  const [biologicalAge, setBiologicalAge] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [waistHigh, setWaistHigh] = useState('');
  const [waistNavel, setWaistNavel] = useState('');
  const [waistWidest, setWaistWidest] = useState('');
  const [hips, setHips] = useState('');
  const [bicep, setBicep] = useState('');
  const [thigh, setThigh] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editWater, setEditWater] = useState('');
  const [editBmi, setEditBmi] = useState('');
  const [editVisceralFat, setEditVisceralFat] = useState('');
  const [editSkeletalMuscleIndex, setEditSkeletalMuscleIndex] = useState('');
  const [editWaistHipRatio, setEditWaistHipRatio] = useState('');
  const [editBodyType, setEditBodyType] = useState('');
  const [editBodyShape, setEditBodyShape] = useState('');
  const [editBmr, setEditBmr] = useState('');
  const [editBoneMass, setEditBoneMass] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editFatFreeMass, setEditFatFreeMass] = useState('');
  const [editBiologicalAge, setEditBiologicalAge] = useState('');
  const [editHeartRate, setEditHeartRate] = useState('');
  const [editChest, setEditChest] = useState('');
  const [editWaist, setEditWaist] = useState('');
  const [editWaistHigh, setEditWaistHigh] = useState('');
  const [editWaistNavel, setEditWaistNavel] = useState('');
  const [editWaistWidest, setEditWaistWidest] = useState('');
  const [editHips, setEditHips] = useState('');
  const [editThigh, setEditThigh] = useState('');
  const [editBicep, setEditBicep] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!weight) return;
    onSave({ 
      date: new Date(date).toISOString(),
      weight: Number(weight), 
      age: age ? Number(age) : undefined,
      fat: fat ? Number(fat) : undefined, 
      muscle: muscle ? Number(muscle) : undefined, 
      water: water ? Number(water) : undefined,
      bmi: bmi ? Number(bmi) : undefined,
      visceralFat: visceralFat ? Number(visceralFat) : undefined,
      skeletalMuscleIndex: skeletalMuscleIndex ? Number(skeletalMuscleIndex) : undefined,
      waistHipRatio: waistHipRatio ? Number(waistHipRatio) : undefined,
      bodyType: bodyType || undefined,
      bodyShape: bodyShape || undefined,
      bmr: bmr ? Number(bmr) : undefined,
      boneMass: boneMass ? Number(boneMass) : undefined,
      protein: protein ? Number(protein) : undefined,
      fatFreeMass: fatFreeMass ? Number(fatFreeMass) : undefined,
      biologicalAge: biologicalAge ? Number(biologicalAge) : undefined,
      heartRate: heartRate ? Number(heartRate) : undefined,
      chest: chest ? Number(chest) : undefined,
      waist: waist ? Number(waist) : undefined,
      waistHigh: waistHigh ? Number(waistHigh) : undefined,
      waistNavel: waistNavel ? Number(waistNavel) : undefined,
      waistWidest: waistWidest ? Number(waistWidest) : undefined,
      hips: hips ? Number(hips) : undefined,
      bicep: bicep ? Number(bicep) : undefined,
      thigh: thigh ? Number(thigh) : undefined
    });
    setWeight('');
    setAge('');
    setFat('');
    setMuscle('');
    setWater('');
    setBmi('');
    setVisceralFat('');
    setSkeletalMuscleIndex('');
    setWaistHipRatio('');
    setBodyType('');
    setBodyShape('');
    setBmr('');
    setBoneMass('');
    setProtein('');
    setFatFreeMass('');
    setBiologicalAge('');
    setHeartRate('');
    setChest('');
    setWaist('');
    setWaistHigh('');
    setWaistNavel('');
    setWaistWidest('');
    setHips('');
    setBicep('');
    setThigh('');
    setDate(new Date().toISOString().split('T')[0]);
    setSaveSuccess(true);
    setIsAddingNew(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleStartEdit = (m: WeightMeasurement) => {
    setEditingId(m.id || null);
    setEditDate(m.date.split('T')[0]);
    setEditWeight(m.weight.toString());
    setEditAge(m.age?.toString() || '');
    setEditFat(m.fat?.toString() || '');
    setEditMuscle(m.muscle?.toString() || '');
    setEditWater(m.water?.toString() || '');
    setEditBmi(m.bmi?.toString() || '');
    setEditVisceralFat(m.visceralFat?.toString() || '');
    setEditSkeletalMuscleIndex(m.skeletalMuscleIndex?.toString() || '');
    setEditWaistHipRatio(m.waistHipRatio?.toString() || '');
    setEditBodyType(m.bodyType || '');
    setEditBodyShape(m.bodyShape || '');
    setEditBmr(m.bmr?.toString() || '');
    setEditBoneMass(m.boneMass?.toString() || '');
    setEditProtein(m.protein?.toString() || '');
    setEditFatFreeMass(m.fatFreeMass?.toString() || '');
    setEditBiologicalAge(m.biologicalAge?.toString() || '');
    setEditHeartRate(m.heartRate?.toString() || '');
    setEditChest(m.chest?.toString() || '');
    setEditWaist(m.waist?.toString() || '');
    setEditWaistHigh(m.waistHigh?.toString() || '');
    setEditWaistNavel(m.waistNavel?.toString() || '');
    setEditWaistWidest(m.waistWidest?.toString() || '');
    setEditHips(m.hips?.toString() || '');
    setEditThigh(m.thigh?.toString() || '');
    setEditBicep(m.bicep?.toString() || '');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, {
      date: new Date(editDate).toISOString(),
      weight: Number(editWeight),
      age: editAge ? Number(editAge) : null,
      fat: editFat ? Number(editFat) : null,
      muscle: editMuscle ? Number(editMuscle) : null,
      water: editWater ? Number(editWater) : null,
      bmi: editBmi ? Number(editBmi) : null,
      visceralFat: editVisceralFat ? Number(editVisceralFat) : null,
      skeletalMuscleIndex: editSkeletalMuscleIndex ? Number(editSkeletalMuscleIndex) : null,
      waistHipRatio: editWaistHipRatio ? Number(editWaistHipRatio) : null,
      bodyType: editBodyType || null,
      bodyShape: editBodyShape || null,
      bmr: editBmr ? Number(editBmr) : null,
      boneMass: editBoneMass ? Number(editBoneMass) : null,
      protein: editProtein ? Number(editProtein) : null,
      fatFreeMass: editFatFreeMass ? Number(editFatFreeMass) : null,
      biologicalAge: editBiologicalAge ? Number(editBiologicalAge) : null,
      heartRate: editHeartRate ? Number(editHeartRate) : null,
      chest: editChest ? Number(editChest) : null,
      waist: editWaist ? Number(editWaist) : null,
      waistHigh: editWaistHigh ? Number(editWaistHigh) : null,
      waistNavel: editWaistNavel ? Number(editWaistNavel) : null,
      waistWidest: editWaistWidest ? Number(editWaistWidest) : null,
      hips: editHips ? Number(editHips) : null,
      thigh: editThigh ? Number(editThigh) : null,
      bicep: editBicep ? Number(editBicep) : null
    });
    setEditingId(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-6"
    >
      <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-accent">Замеры</h3>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Антропометрия и биоимпеданс</p>
          </div>
        </div>
        
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {!isAddingNew ? (
              <motion.button 
                key="add-button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setIsAddingNew(true)}
                className="w-full py-6 border-2 border-dashed border-border rounded-[32px] flex flex-col items-center justify-center gap-3 text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-all group"
              >
                <div className="w-12 h-12 bg-surface-2 rounded-2xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Plus size={24} className="group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Добавить новый замер</span>
              </motion.button>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-6 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest">Новый замер</h4>
                    <button 
                      onClick={() => setIsAddingNew(false)}
                      className="p-2 text-muted hover:text-accent transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Дата замера</label>
                      <input 
                        type="date" 
                        className="w-full bg-surface-2 border-2 border-border text-text p-3 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all"
                        value={date || ''}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Основные</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Вес (кг)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={weight || ''} onChange={(e) => setWeight(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Возраст</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={age || ''} onChange={(e) => setAge(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">ИМТ</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={bmi || ''} onChange={(e) => setBmi(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Биоимпеданс</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Жир %</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={fat || ''} onChange={(e) => setFat(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Мышцы кг</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={muscle || ''} onChange={(e) => setMuscle(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Вода %</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={water || ''} onChange={(e) => setWater(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Висц. жир</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={visceralFat || ''} onChange={(e) => setVisceralFat(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Кости (кг)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={boneMass || ''} onChange={(e) => setBoneMass(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Белок %</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={protein || ''} onChange={(e) => setProtein(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">BMR (ккал)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={bmr || ''} onChange={(e) => setBmr(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Биол. возр.</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={biologicalAge || ''} onChange={(e) => setBiologicalAge(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Пульс</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={heartRate || ''} onChange={(e) => setHeartRate(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Объемы</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Грудь (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={chest || ''} onChange={(e) => setChest(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Талия выс.</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={waistHigh || ''} onChange={(e) => setWaistHigh(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Талия пупок</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={waistNavel || ''} onChange={(e) => setWaistNavel(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Талия шир.</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={waistWidest || ''} onChange={(e) => setWaistWidest(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Бёдра (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={hips || ''} onChange={(e) => setHips(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Бедро (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={thigh || ''} onChange={(e) => setThigh(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Бицепс (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={bicep || ''} onChange={(e) => setBicep(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-accent hover:bg-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
                  >
                    Сохранить замер
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        <AnimatePresence>
          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-emerald-500 text-xs font-bold"
            >
              ✅ Замер успешно сохранен!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-6">
        <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest px-1">История замеров</h4>
        {measurements.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">Нет записей. Добавь первый! 📏</div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {[...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  layout
                  className="p-5 bg-surface-2/50 border-2 border-border rounded-3xl shadow-sm hover:border-accent/30 transition-all space-y-3"
                >
                  {editingId === m.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Дата</label>
                        <input type="date" value={editDate || ''} onChange={(e) => setEditDate(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div className="col-span-3 border-b border-border pb-1 mt-2">
                        <span className="text-[9px] text-accent uppercase font-bold">Основные</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Вес</label>
                        <input type="number" value={editWeight || ''} onChange={(e) => setEditWeight(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Возраст</label>
                        <input type="number" value={editAge || ''} onChange={(e) => setEditAge(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">ИМТ</label>
                        <input type="number" value={editBmi || ''} onChange={(e) => setEditBmi(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>

                      <div className="col-span-3 border-b border-border pb-1 mt-2">
                        <span className="text-[9px] text-accent uppercase font-bold">Биоимпеданс</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Жир %</label>
                        <input type="number" value={editFat || ''} onChange={(e) => setEditFat(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Мышцы кг</label>
                        <input type="number" value={editMuscle || ''} onChange={(e) => setEditMuscle(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Вода %</label>
                        <input type="number" value={editWater || ''} onChange={(e) => setEditWater(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Висц. жир</label>
                        <input type="number" value={editVisceralFat || ''} onChange={(e) => setEditVisceralFat(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Кости</label>
                        <input type="number" value={editBoneMass || ''} onChange={(e) => setEditBoneMass(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Белок %</label>
                        <input type="number" value={editProtein || ''} onChange={(e) => setEditProtein(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">BMR</label>
                        <input type="number" value={editBmr || ''} onChange={(e) => setEditBmr(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Биол. возр.</label>
                        <input type="number" value={editBiologicalAge || ''} onChange={(e) => setEditBiologicalAge(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Пульс</label>
                        <input type="number" value={editHeartRate || ''} onChange={(e) => setEditHeartRate(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>

                      <div className="col-span-3 border-b border-border pb-1 mt-2">
                        <span className="text-[9px] text-accent uppercase font-bold">Объемы</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Грудь</label>
                        <input type="number" value={editChest || ''} onChange={(e) => setEditChest(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Талия выс</label>
                        <input type="number" value={editWaistHigh || ''} onChange={(e) => setEditWaistHigh(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Талия пупок</label>
                        <input type="number" value={editWaistNavel || ''} onChange={(e) => setEditWaistNavel(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Талия шир</label>
                        <input type="number" value={editWaistWidest || ''} onChange={(e) => setEditWaistWidest(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Бёдра</label>
                        <input type="number" value={editHips || ''} onChange={(e) => setEditHips(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Бедро</label>
                        <input type="number" value={editThigh || ''} onChange={(e) => setEditThigh(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Бицепс</label>
                        <input type="number" value={editBicep || ''} onChange={(e) => setEditBicep(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="flex-1 py-2 bg-done text-white text-[10px] font-bold uppercase rounded-xl">Сохранить</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-surface-3 text-text text-[10px] font-bold uppercase rounded-xl">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-[11px] font-bold uppercase tracking-wider">{format(parseISO(m.date), 'd MMM yyyy', { locale: ru })}</span>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className="text-accent text-xl font-display font-bold">{m.weight} кг</div>
                        </div>
                        <button onClick={() => handleStartEdit(m)} className="p-2 text-muted hover:text-accent transition-colors"><Edit2 size={16}/></button>
                        <button onClick={() => onDelete(m.id!)} className="p-2 text-muted hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    {(m.chest || m.waist || m.waistHigh || m.waistNavel || m.waistWidest || m.hips || m.bicep || m.thigh) && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted font-bold uppercase">
                        {m.chest && <span>Грудь: {m.chest}</span>}
                        {m.waist && <span>Талия: {m.waist}</span>}
                        {m.waistHigh && <span>Талия выс: {m.waistHigh}</span>}
                        {m.waistNavel && <span>Талия пупок: {m.waistNavel}</span>}
                        {m.waistWidest && <span>Самое жирное: {m.waistWidest}</span>}
                        {m.hips && <span>Бёдра: {m.hips}</span>}
                        {m.bicep && <span>Бицепс: {m.bicep}</span>}
                        {m.thigh && <span>Бедро: {m.thigh}</span>}
                      </div>
                    )}
                    <div className="text-[10px] text-muted font-bold uppercase opacity-60 flex flex-wrap gap-x-2">
                      {m.fat && <span>Жир: {m.fat}%</span>}
                      {m.muscle && <span>Мышцы: {m.muscle}кг</span>}
                      {m.water && <span>Вода: {m.water}%</span>}
                      {m.visceralFat && <span>Висц. жир: {m.visceralFat}</span>}
                      {m.bmi && <span>ИМТ: {m.bmi}</span>}
                      {m.boneMass && <span>Кости: {m.boneMass}кг</span>}
                      {m.protein && <span>Белок: {m.protein}%</span>}
                      {m.bmr && <span>BMR: {m.bmr}</span>}
                      {m.biologicalAge && <span>Биол. возр: {m.biologicalAge}</span>}
                      {m.heartRate && <span>Пульс: {m.heartRate}</span>}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
}

function TechPage({ items, onEdit, isLoading }: { items: TechItem[]; onEdit: () => void; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Dumbbell className="text-accent w-8 h-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-serif text-xl text-accent font-light">Памятка по технике</h3>
          <p className="text-[10px] text-muted uppercase tracking-wider">Настраиваемая база знаний</p>
        </div>
        <button 
          onClick={onEdit}
          className="p-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-all"
        >
          <Settings size={20} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-[40px] border border-border shadow-sm">
          <BookOpen className="mx-auto mb-4 text-accent/30" size={48} />
          <p className="text-sm font-bold text-text mb-4">Список пуст</p>
          <button 
            onClick={onEdit} 
            className="px-6 py-3 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest"
          >
            Добавить первый совет
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                layout
              >
                <TechCard 
                  title={item.title} 
                  subtitle={item.subtitle}
                  content={item.content}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function TechEditor({ items, onSave, onClose }: { items: TechItem[]; onSave: (items: TechItem[]) => Promise<void>; onClose: () => void }) {
  const [localItems, setLocalItems] = useState<TechItem[]>(items.length > 0 ? JSON.parse(JSON.stringify(items)) : [
    { title: 'Ягодичный мостик', subtitle: 'Главное упражнение', content: '● Точка 1\n● Точка 2', order: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localItems);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = () => {
    setLocalItems([...localItems, { title: 'Новый совет', subtitle: 'Описание', content: '', order: localItems.length }]);
  };

  const removeItem = (idx: number) => {
    setLocalItems(localItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof TechItem, value: any) => {
    setLocalItems(localItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const moveItem = (idx: number, direction: 'up' | 'down') => {
    const newItems = [...localItems];
    if (direction === 'up' && idx > 0) {
      [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    } else if (direction === 'down' && idx < newItems.length - 1) {
      [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
    }
    setLocalItems(newItems.map((item, i) => ({ ...item, order: i })));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-bg w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-border"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-xl font-display font-bold text-accent">Редактор Техники</h2>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest mt-1">Настрой базу знаний</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-accent transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {localItems.map((item, idx) => (
            <div key={idx} className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-4 relative group">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => moveItem(idx, 'up')} className="p-1 text-muted hover:text-accent"><ChevronUp size={16} /></button>
                <button onClick={() => moveItem(idx, 'down')} className="p-1 text-muted hover:text-accent"><ChevronDown size={16} /></button>
                <button onClick={() => removeItem(idx)} className="p-1 text-muted hover:text-red-500"><Trash2 size={16} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted uppercase font-bold ml-1">Заголовок</label>
                  <input 
                    type="text" 
                    value={item.title}
                    onChange={(e) => updateItem(idx, 'title', e.target.value)}
                    className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted uppercase font-bold ml-1">Подзаголовок</label>
                  <input 
                    type="text" 
                    value={item.subtitle}
                    onChange={(e) => updateItem(idx, 'subtitle', e.target.value)}
                    className="w-full py-2 px-3 bg-surface-2/30 border border-border rounded-lg text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-muted uppercase font-bold ml-1">Описание техники</label>
                <textarea 
                  value={item.content}
                  onChange={(e) => updateItem(idx, 'content', e.target.value)}
                  placeholder="● Носки наружу&#10;● Спина прямая..."
                  className="w-full h-32 py-3 px-4 bg-surface-2/30 border border-border rounded-xl text-xs focus:border-accent outline-none resize-none transition-all"
                />
                <p className="text-[9px] text-muted italic ml-1">Совет: Используй ● или * для списков. Переносы строк сохраняются.</p>
              </div>
            </div>
          ))}

          <button 
            onClick={addItem}
            className="w-full py-4 border-2 border-dashed border-accent text-accent font-bold rounded-3xl hover:bg-accent/5 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Добавить карточку техники
          </button>
        </div>

        <div className="p-6 border-t border-border bg-surface flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 border-2 border-border text-muted font-bold rounded-2xl hover:bg-surface-2 transition-all"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] py-4 bg-accent text-white font-bold rounded-2xl shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Dumbbell size={20} />
              </motion.div>
            ) : (
              <>
                <Save size={20} />
                Сохранить базу знаний
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TechCard({ title, subtitle, content }: { title: string; subtitle: string; content: string }) {
  // Pre-process content to handle ● and * as markdown lists if they aren't already
  const processedContent = content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('●') || trimmed.startsWith('•')) {
        return `* ${trimmed.substring(1).trim()}`;
      }
      return line;
    })
    .join('\n');

  return (
    <div className="bg-surface border-2 border-border border-l-8 border-l-accent rounded-3xl p-6 space-y-3 shadow-sm">
      <h4 className="font-display text-xl text-accent font-bold">{title}</h4>
      <p className="text-[10px] text-accent-2 uppercase font-bold tracking-widest">{subtitle}</p>
      <div className="text-[12px] text-text leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-li:marker:text-accent">
        <ReactMarkdown>{processedContent}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
