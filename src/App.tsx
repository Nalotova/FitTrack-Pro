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
  Send,
  Camera,
  Settings,
  RotateCcw,
  Bell,
  Mic,
  Square,
  Trophy,
  Moon,
  Sun,
  Video,
  Loader2,
  FileText,
  FileAudio,
  File
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
  ReferenceLine
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
  photos?: string[];
}

interface StrengthRecord {
  id?: string;
  userId: string;
  date: string;
  exercise: string;
  weight: number;
  reps: number;
  volume?: number;
  avgWeight?: number;
  maxWeight?: number;
  totalReps?: number;
  setsCount?: number;
}

interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'admin';
  age?: string | number;
  gender?: 'male' | 'female' | 'other';
  goal?: string;
  goalType?: 'hypertrophy' | 'strength' | 'fat_loss' | 'recomposition' | 'endurance' | 'tone';
  goalChangedAt?: string;
  reminders?: any[];
  createdAt?: string;
  updatedAt?: string;
  uid?: string;
}

const goalTranslations: Record<string, { label: string; color: string }> = {
  hypertrophy: { label: '💪 Гипертрофия', color: 'bg-accent/20 text-accent' },
  strength: { label: '🏋️ Сила', color: 'bg-accent-2/20 text-accent-2' },
  fat_loss: { label: '🔥 Жиросжигание', color: 'bg-red-500/20 text-red-500' },
  recomposition: { label: '⚡ Рекомпозиция', color: 'bg-yellow-500/20 text-yellow-500' },
  endurance: { label: '🏃 Выносливость', color: 'bg-blue-500/20 text-blue-500' },
  tone: { label: '🌿 Тонус', color: 'bg-green-500/20 text-green-500' },
};

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
        "name": "Ходьба",
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
        "name": "Ходьба",
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
  const [activeProgressTab, setActiveProgressTab] = useState<'workouts' | 'body'>('workouts');
  const [chartMetric, setChartMetric] = useState<'weight' | 'volume' | 'reps'>('weight');
  const [coachMessages, setCoachMessages] = useState<any[]>([]);
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
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
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

  const cleanupOldFiles = async () => {
    if (!user) return;
    const now = new Date().getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    
    // Check measurements photos
    const measurementsSnapshot = await getDocs(query(collection(db, 'measurements'), where('userId', '==', user.uid)));
    for (const docSnap of measurementsSnapshot.docs) {
      const data = docSnap.data();
      if (data.photos && data.createdAt) {
        const fileDate = new Date(data.createdAt).getTime();
        if (now - fileDate > SEVEN_DAYS) {
          // Delete files from storage
          for (const photoUrl of data.photos) {
            try {
              const fileRef = ref(storage, photoUrl);
              await deleteObject(fileRef);
            } catch (e) { console.error("Error deleting file", e); }
          }
          // Update document to remove photo references
          await setDoc(docSnap.ref, { photos: [] }, { merge: true });
        }
      }
    }

    // Check coach messages (audio)
    const messagesSnapshot = await getDocs(query(collection(db, 'coach_messages'), where('userId', '==', user.uid)));
    for (const docSnap of messagesSnapshot.docs) {
      const data = docSnap.data();
      if (data.files && data.timestamp) {
        const fileDate = new Date(data.timestamp).getTime();
        if (now - fileDate > SEVEN_DAYS) {
          for (const file of data.files) {
            if (file.mimeType && (file.mimeType.startsWith('audio/') || file.mimeType.startsWith('image/'))) {
              try {
                // Assuming files are stored in storage or embedded - if embedded, just update doc
                // If stored in storage, delete here
              } catch (e) { console.error("Error deleting file", e); }
            }
          }
          await setDoc(docSnap.ref, { files: [] }, { merge: true });
        }
      }
    }
  };

  useEffect(() => {
    if (user) cleanupOldFiles();
  }, [user]);

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

  // Persistence for Coach messages (Firestore migration)
  useEffect(() => {
    if (!user) {
      setCoachMessages([]);
      return;
    }
    
    const unsub = onSnapshot(
      query(collection(db, 'coach_messages'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCoachMessages(data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'coach_messages')
    );
    
    return () => unsub();
  }, [user]);

  const handleAddCoachMessage = async (message: { role: string, content: string, files?: any[] }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'coach_messages'), {
        userId: user.uid,
        ...message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coach_messages');
    }
  };

  const handleClearCoachMessages = async () => {
    if (!user) return;
    try {
      const snapshot = await getDocs(query(collection(db, 'coach_messages'), where('userId', '==', user.uid)));
      
      const chunks = [];
      let currentChunk = [];
      snapshot.forEach((doc: any) => {
        currentChunk.push(doc);
        if (currentChunk.length === 400) {
          chunks.push(currentChunk);
          currentChunk = [];
        }
      });
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const doc of chunk) {
          batch.delete(doc.ref);
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'coach_messages');
    }
  };

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

  const updateProgramTipWithWeight = async (exercise: string, currentRecord: Partial<StrengthRecord>) => {
    if (!programData || !exercise || !currentRecord) return;
    
    const goalType = userProfile?.goalType;
    const goalChangedAt = userProfile?.goalChangedAt;
    
    // Filter records by current goal period
    const history = strengthRecords
      .filter(r => r.exercise.toLowerCase() === exercise.toLowerCase())
      .filter(r => !goalChangedAt || new Date(r.date) >= new Date(goalChangedAt))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Add current record to history for analysis if it's not already there
    const fullHistory = [currentRecord as StrengthRecord, ...history];
    
    let suffix = '';
    const last = fullHistory[0];
    const prev = fullHistory[1];
    const prev2 = fullHistory[2];

    if (goalType === 'hypertrophy' || goalType === 'recomposition') {
      const vol = last.volume || 0;
      const pVol = prev?.volume || 0;
      const p2Vol = prev2?.volume || 0;
      const avg = last.avgWeight || 0;
      const pAvg = prev?.avgWeight || 0;

      if (prev && vol < pVol * 0.85) {
        suffix = `Перегрузка! Вес тот же. Цель объём ${Math.round(pVol)}кг`;
      } else if (prev && prev2 && vol > pVol && pVol > p2Vol && avg >= pAvg) {
        suffix = `Адаптация! +вес. Цель объём ${Math.round(vol * 1.06)}кг`;
      } else {
        suffix = `Цель объём ${Math.round(vol * 1.05)}кг (сейчас ${vol})`;
      }
    } else if (goalType === 'strength') {
      const max = last.maxWeight || last.weight || 0;
      suffix = `Цель вес ${Math.round(max * 1.025)}кг (рекорд ${max})`;
    } else if (goalType === 'fat_loss') {
      const vol = last.volume || 0;
      const pVol = prev?.volume || 0;
      if (prev && Math.abs(vol - pVol) / pVol < 0.05) {
        suffix = `Стабильно. Цель +1 повтор к подходу`;
      } else {
        suffix = `Держи объём ${Math.round(vol)}кг`;
      }
    } else if (goalType === 'endurance') {
      suffix = `Цель +2 повтора к подходу`;
    } else if (goalType === 'tone') {
      const vol = last.volume || 0;
      const pVol = prev?.volume || 0;
      const p2Vol = prev2?.volume || 0;
      if (prev && prev2 && Math.abs(vol - pVol) < 10 && Math.abs(pVol - p2Vol) < 10) {
        suffix = `3 сессии стабильно. Можно +вес`;
      } else {
        suffix = `Регулярность — залог успеха!`;
      }
    } else {
      suffix = `${last.weight}кг+`;
    }

    const updatedProgram = JSON.parse(JSON.stringify(programData));
    let changed = false;

    Object.keys(updatedProgram).forEach(dayKey => {
      updatedProgram[dayKey].exercises.forEach((ex: any) => {
        if (ex.name.toLowerCase() === exercise.toLowerCase()) {
          // Pattern to match any existing recommendation suffix
          const weightPattern = /\s(ср\.|рекорд|прошлый раз|Цель|Перегрузка|Адаптация|Стабильно|Держи|3 сессии|Регулярность|\d+(\.\d+)?\+).*$/;
          if (!ex.tip) {
            ex.tip = suffix;
            changed = true;
          } else {
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

  const handleUpdateProfile = async (data: Partial<UserProfile>, photoFile?: File) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      
      let photoURL = data.photoURL !== undefined ? data.photoURL : existingData.photoURL;
      
      if (photoFile) {
        // Limit file size to 5MB
        if (photoFile.size > 5 * 1024 * 1024) {
          throw new Error("Файл слишком большой. Максимальный размер 5МБ.");
        }

        const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
        
        // Add a timeout for upload to prevent infinite hanging
        const uploadPromise = uploadBytes(storageRef, photoFile);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Превышено время ожидания загрузки фото. Проверьте интернет-соединение.")), 30000)
        );
        
        await Promise.race([uploadPromise, timeoutPromise]);
        photoURL = await getDownloadURL(storageRef);
      }
      
      const updateData: any = { ...data, photoURL: photoURL || null, updatedAt: new Date().toISOString() };

      // Task 1: Classification
      if (data.goal && data.goal !== existingData.goal) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Пользователь написал свою фитнес-цель: ${data.goal}. Определи тип цели одним словом из списка: hypertrophy, strength, fat_loss, recomposition, endurance, tone. Верни только одно слово.`,
          });
          const goalType = response.text?.trim().toLowerCase();
          const validGoals = ['hypertrophy', 'strength', 'fat_loss', 'recomposition', 'endurance', 'tone'];
          if (goalType && validGoals.includes(goalType)) {
            updateData.goalType = goalType;
            updateData.goalChangedAt = new Date().toISOString();
          }
        } catch (e) {
          console.error("Gemini classification failed:", e);
        }
      }

      if (!docSnap.exists()) {
        const fullData = {
          ...updateData,
          displayName: data.displayName || user.displayName || 'Анонимный пользователь',
          email: user.email || '',
          role: 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, fullData);
      } else {
        await setDoc(userRef, updateData, { merge: true });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      if (error instanceof Error && !error.message.includes("Файл слишком большой") && !error.message.includes("время ожидания")) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
      throw error;
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

          // Task 3: Calculate volume, avgWeight, setsCount, maxWeight, totalReps
          const volume = ex.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
          const totalReps = ex.sets.reduce((sum, s) => sum + s.reps, 0);
          const avgWeight = totalReps > 0 ? volume / totalReps : 0;
          const maxWeight = Math.max(...ex.sets.map(s => s.weight));
          const setsCount = ex.sets.length;

          if (bestSet.weight > 0 || volume > 0) {
            await handleSaveStrength({
              exercise: ex.name,
              weight: bestSet.weight,
              reps: bestSet.reps,
              volume,
              avgWeight,
              maxWeight,
              totalReps,
              setsCount
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
      const allowedFields = ['userId', 'date', 'weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bodyType', 'bodyShape', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate', 'photos'];
      
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
      const allowedFields = ['userId', 'date', 'weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bodyType', 'bodyShape', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate', 'photos'];
      
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
      if ('volume' in cleanData) {
        cleanData.volume = isNaN(Number(cleanData.volume)) || !isFinite(Number(cleanData.volume)) ? 0 : Number(cleanData.volume);
      }
      if ('avgWeight' in cleanData) {
        cleanData.avgWeight = isNaN(Number(cleanData.avgWeight)) || !isFinite(Number(cleanData.avgWeight)) ? 0 : Number(cleanData.avgWeight);
      }
      if ('setsCount' in cleanData) {
        cleanData.setsCount = isNaN(Number(cleanData.setsCount)) || !isFinite(Number(cleanData.setsCount)) ? 0 : Number(cleanData.setsCount);
      }

      await addDoc(collection(db, 'strength'), {
        userId: user.uid,
        date: new Date().toISOString(),
        ...cleanData
      });
      
      // Update program tip if exercise matches
      if (data.exercise) {
        await updateProgramTipWithWeight(data.exercise, cleanData);
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
      if ('volume' in cleanData) {
        cleanData.volume = isNaN(Number(cleanData.volume)) || !isFinite(Number(cleanData.volume)) ? 0 : Number(cleanData.volume);
      }
      if ('avgWeight' in cleanData) {
        cleanData.avgWeight = isNaN(Number(cleanData.avgWeight)) || !isFinite(Number(cleanData.avgWeight)) ? 0 : Number(cleanData.avgWeight);
      }
      if ('setsCount' in cleanData) {
        cleanData.setsCount = isNaN(Number(cleanData.setsCount)) || !isFinite(Number(cleanData.setsCount)) ? 0 : Number(cleanData.setsCount);
      }

      await setDoc(doc(db, 'strength', id), cleanData, { merge: true });
      
      // Update program tip if weight or exercise changed
      const record = strengthRecords.find(r => r.id === id);
      if (record) {
        const exercise = data.exercise || record.exercise;
        if (exercise) {
          await updateProgramTipWithWeight(exercise, { ...record, ...cleanData });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `strength/${id}`);
    }
  };

  // Stats
  useEffect(() => {
    if (userProfile?.goalType) {
      if (userProfile.goalType === 'hypertrophy' || userProfile.goalType === 'recomposition') {
        setChartMetric('volume');
      } else if (userProfile.goalType === 'strength') {
        setChartMetric('weight');
      } else {
        setChartMetric('reps');
      }
    }
  }, [userProfile?.goalType]);

  const streakWeeks = useMemo(() => {
    if (workouts.length === 0) return 0;
    
    // Get unique workout dates
    const workoutDates = Array.from(new Set(workouts.map(w => format(new Date(w.date), 'yyyy-MM-dd'))));
    
    if (workoutDates.length === 0) return 0;

    const now = new Date();
    let currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    let streak = 0;
    
    const hasWorkoutInWeek = (weekStart: Date) => {
      const interval = { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) };
      return workoutDates.some(dateStr => {
        const d = parseISO(dateStr);
        return isWithinInterval(d, interval);
      });
    };

    // If no workout this week AND no workout last week, streak is 0
    const lastWeekStart = subWeeks(currentWeekStart, 1);
    if (!hasWorkoutInWeek(currentWeekStart) && !hasWorkoutInWeek(lastWeekStart)) {
      return 0;
    }

    // If no workout this week but there was one last week, we start counting from last week
    if (!hasWorkoutInWeek(currentWeekStart)) {
      currentWeekStart = lastWeekStart;
    }

    while (hasWorkoutInWeek(currentWeekStart)) {
      streak++;
      currentWeekStart = subWeeks(currentWeekStart, 1);
    }

    return streak;
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
                {userProfile?.displayName || 'Пользователь'} <span className="text-accent-2">·</span> Тренировки
              </div>
              {userProfile?.goalType ? (
                <div 
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full w-fit mt-1 ${goalTranslations[userProfile.goalType]?.color || 'bg-surface-2 text-muted'}`}
                >
                  {goalTranslations[userProfile.goalType]?.label || userProfile.goalType}
                </div>
              ) : (
                <div 
                  className="text-[9px] font-bold text-accent-2 bg-accent-2/10 px-2 py-0.5 rounded-full w-fit mt-1 hover:bg-accent-2/20 transition-all"
                >
                  ✨ Добавь цель
                </div>
              )}
              <div className="text-[9px] text-muted uppercase font-semibold tracking-[0.15em] mt-1">{weekLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 animate-pulse">
                <AlertCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Offline</span>
              </div>
            )}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-accent hover:border-accent/50 transition-all"
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="text-right">
              <div className="text-2xl font-display font-bold text-accent leading-none">{streakWeeks}</div>
              <div className="text-[8px] text-muted uppercase font-semibold tracking-[0.15em]">недель подряд</div>
            </div>
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
              onAddMessage={handleAddCoachMessage}
              onClearMessages={handleClearCoachMessages}
              isLoading={isCoachLoading}
              setIsLoading={setIsCoachLoading}
              programData={programData}
              techData={techData}
              userProfile={userProfile}
              setNotification={setNotification}
              onUpdateProgram={handleUpdateProgram}
              onUpdateTech={handleUpdateTech}
              onUpdateProfile={handleUpdateProfile}
              onSaveWeight={handleSaveWeight}
            />
          )}
          {activeTab === 'progress' && (
            <ProgressPage 
              user={user}
              workouts={workouts} 
              streakWeeks={streakWeeks}
              onDelete={handleDeleteWorkout}
              onUpdate={handleUpdateWorkout}
              programData={programData}
              strengthRecords={strengthRecords}
              onSaveStrength={handleSaveStrength}
              onDeleteStrength={handleDeleteStrength}
              onUpdateStrength={handleUpdateStrength}
              measurements={measurements}
              activeSubTab={activeProgressTab}
              setActiveSubTab={setActiveProgressTab}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
              userProfile={userProfile}
            />
          )}
          {activeTab === 'measurements' && (
            <WeightPage 
              user={user}
              measurements={measurements} 
              onSave={handleSaveWeight} 
              onDelete={handleDeleteWeight}
              onUpdate={handleUpdateWeight}
              onGoToBodyProgress={() => {
                setActiveTab('progress');
                setActiveProgressTab('body');
              }}
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
              setCoachMessages={setCoachMessages}
              setNotification={setNotification}
            />
          )}
          {activeTab === 'strength' && (
            <StrengthPage 
              records={strengthRecords}
              onSave={handleSaveStrength}
              onDelete={handleDeleteStrength}
              onUpdate={handleUpdateStrength}
              programData={programData}
              onBack={() => setActiveTab('profile')}
            />
          )}
          {activeTab === 'tech' && (
            <TechPage 
              items={techData}
              onEdit={() => setShowTechEditor(true)}
              isLoading={isTechLoading}
              onBack={() => setActiveTab('profile')}
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
          { id: 'coach', label: 'Коуч', icon: Bot },
          { id: 'measurements', label: 'Замеры', icon: Scale },
          { id: 'progress', label: 'Прогресс', icon: BarChart3 },
          { id: 'profile', label: 'Профиль', icon: UserIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'profile' && (activeTab === 'strength' || activeTab === 'tech'));
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-16 h-16 transition-all ${isActive ? 'text-accent' : 'text-muted hover:text-accent/70'}`}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl mb-1 transition-all`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-accent' : 'text-muted'}`}>
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
  onAddMessage,
  onClearMessages,
  isLoading,
  setIsLoading,
  programData,
  techData,
  userProfile,
  setNotification,
  onUpdateProgram,
  onUpdateTech,
  onUpdateProfile,
  onSaveWeight
}: any) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{data: string, mimeType: string, name: string}[]>([]);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, compress: boolean = false) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && !file.type.startsWith('video/')) {
          if (compress && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                setAttachedFiles(prev => [...prev, {
                  data: base64,
                  mimeType: 'image/jpeg',
                  name: file.name,
                  createdAt: new Date().toISOString()
                }]);
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
          } else {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              setAttachedFiles(prev => [...prev, {
                data: base64,
                mimeType: file.type || 'application/octet-stream',
                name: file.name,
                createdAt: new Date().toISOString()
              }]);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  };

  const handleClearChat = () => {
    onClearMessages();
    setInput('');
    setAttachedFiles([]);
    setShowClearConfirm(false);
  };

  const handleSend = async (customInput?: string, customFiles?: {data: string, mimeType: string, name: string}[], audioBlob?: Blob) => {
    const textToSend = customInput || input;
    const filesToSend = customFiles || attachedFiles;
    
    if ((!textToSend.trim() && filesToSend.length === 0 && !audioBlob) || isLoading) return;

    const userMsg: any = { role: 'user', content: textToSend };
    const finalFiles = [];
    
    if (filesToSend.length > 0) {
      filesToSend.forEach(f => {
        finalFiles.push({
          data: f.data,
          mimeType: f.mimeType,
          name: f.name
        });
      });
    }

    let audioBase64Data = null;
    let audioMimeType = null;
    if (audioBlob) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      audioBase64Data = await base64Promise;
      audioMimeType = audioBlob.type || "audio/webm";
      
      finalFiles.push({
        data: audioBase64Data,
        mimeType: audioMimeType,
        name: "Голосовое сообщение"
      });
      userMsg.isAudio = true;
    }

    if (finalFiles.length > 0) {
      userMsg.files = finalFiles;
    }

    onAddMessage(userMsg);
    setInput('');
    setAttachedFiles([]);
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
ОБЯЗАТЕЛЬНО учитывай пол, возраст и цели пользователя при составлении рекомендаций и ответов.
Ты можешь:
1. Обновлять программу тренировок (инструмент update_training_program).
2. Обновлять технику выполнения упражнений (инструмент update_tech_data).
3. Добавлять замеры биоимпеданса (инструмент add_bioimpedance_measurement).
Все данные о теле (замеры, вес) предоставлены исключительно в фитнес-целях.
Ты также можешь анализировать прикрепленные изображения, видео и файлы (например, PDF или текстовые документы с результатами анализов или программами).`;

      const dataContext = `
        ПЕРЕМЕННЫЕ ПОЛЬЗОВАТЕЛЯ (ДЛЯ АНАЛИЗА):
        - ПРОФИЛЬ: ${JSON.stringify(userProfile)}
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

      if (finalFiles.length > 0) {
        finalFiles.forEach(f => {
          userParts.push({
            inlineData: {
              data: f.data,
              mimeType: f.mimeType
            }
          });
        });
      }

      if (userParts.length === 0) return;

      const buildHistory = (msgs: any[]) => {
        const contents: any[] = [];
        const history = msgs.slice(-10);
        
        history.forEach((m: any) => {
          const role = m.role === 'user' ? 'user' : 'model';
          
          const parts: any[] = [];
          if (m.content && m.content.trim()) {
            parts.push({ text: m.content });
          }
          
          if (m.files && m.files.length > 0) {
            m.files.forEach((f: any) => {
              parts.push({
                inlineData: {
                  data: f.data,
                  mimeType: f.mimeType
                }
              });
            });
          }
          
          if (parts.length > 0) {
            if (contents.length > 0 && contents[contents.length - 1].role === role) {
              // Merge with previous message of the same role
              contents[contents.length - 1].parts.push(...parts);
            } else {
              contents.push({ role, parts });
            }
          }
        });

        while (contents.length > 0 && contents[0].role !== 'user') {
          contents.shift();
        }
        return contents;
      };

      const historyContents = buildHistory(messages);
      
      if (historyContents.length > 0 && historyContents[historyContents.length - 1].role === 'user') {
        // Merge new user message into the last history user message
        historyContents[historyContents.length - 1].parts.push(...userParts);
      } else {
        // Append new user message
        historyContents.push({ role: 'user', parts: userParts });
      }

      const response = await callGeminiWithRetry({
        model: modelName,
        contents: historyContents,
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

            if (typeof onUpdateProgram === 'function') {
              await onUpdateProgram(formattedData);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...historyContents,
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
              onAddMessage(aiMsg);
              setIsLoading(false);
              return;
            }
          } else if (call.name === 'update_tech_data') {
            const { newItems } = call.args as any;
            
            if (typeof onUpdateTech === 'function') {
              await onUpdateTech(newItems);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...historyContents,
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
              onAddMessage(aiMsg);
              setIsLoading(false);
              return;
            }
          } else if (call.name === 'add_bioimpedance_measurement') {
            const measurementData = call.args as any;
            
            if (typeof onSaveWeight === 'function') {
              await onSaveWeight(measurementData);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...historyContents,
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
              onAddMessage(aiMsg);
              setIsLoading(false);
              return;
            }
          }
        }
      }

      const aiMsg = { role: 'assistant', content: response.text || "Извини, я не смогла сформулировать ответ. Попробуй еще раз! 🧘‍♀️" };
      onAddMessage(aiMsg);
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
      
      onAddMessage({ role: 'assistant', content: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

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
        handleSendRef.current(undefined, undefined, audioBlob);
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
      <div className="bg-surface p-3 rounded-2xl border border-border shadow-sm mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-accent leading-tight">FitTrack-Pro ИИ</h2>
            <p className="text-[8px] text-muted uppercase font-bold tracking-widest">Персональный коуч</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleSend("Проанализируй мой прогресс за последнее время")}
            className="px-2.5 py-1.5 bg-accent/5 hover:bg-accent/10 text-accent text-[8px] font-bold uppercase tracking-wider rounded-lg border border-accent/10 transition-all flex items-center gap-1.5"
          >
            <TrendingUp size={10} />
            Анализ
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100 transition-all"
              title="Очистить чат"
            >
              <Trash2 size={12} />
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
              className={`p-1.5 rounded-lg border transition-all ${manualApiKey ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface-2 text-muted border-border'}`}
              title="Настройки API"
            >
              <Settings size={12} />
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
                {m.files && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {m.files.map((f: any, fIdx: number) => {
                      if (f.mimeType.startsWith('audio/')) {
                        return (
                          <div key={fIdx} className="col-span-2 bg-white/10 p-2 rounded-xl border border-white/20 flex flex-col gap-2 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center text-white">
                                <FileAudio size={16} />
                              </div>
                              <span className="text-[10px] font-bold truncate flex-1">{f.name}</span>
                            </div>
                            <audio src={`data:${f.mimeType};base64,${f.data}`} controls className="w-full h-8" />
                          </div>
                        );
                      }
                      return (
                        <div key={fIdx} className="bg-white/10 p-2 rounded-xl border border-white/20 flex items-center gap-2 overflow-hidden">
                          {f.mimeType.startsWith('image/') ? (
                            <img src={`data:${f.mimeType};base64,${f.data}`} alt="Attached" className="w-10 h-10 object-cover rounded-lg" />
                          ) : f.mimeType.startsWith('video/') ? (
                            <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-white">
                              <Video size={16} />
                            </div>
                          ) : f.mimeType.includes('pdf') || f.mimeType.startsWith('text/') ? (
                            <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-white">
                              <FileText size={16} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-white">
                              <File size={16} />
                            </div>
                          )}
                          <span className="text-[10px] font-bold truncate flex-1">{f.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {m.isAudio && (!m.files || !m.files.some((f: any) => f.mimeType.startsWith('audio/'))) && (
                  <div className="flex items-center gap-2 mb-2 text-white/80 bg-white/10 p-2 rounded-xl">
                    <Mic size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Голосовое сообщение (аудио недоступно)</span>
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
        className="bg-surface border-2 border-border rounded-3xl shadow-lg p-4 mx-0"
      >
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {attachedFiles.map((f, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                {f.mimeType.startsWith('image/') ? (
                  <img src={`data:${f.mimeType};base64,${f.data}`} alt="Preview" className="h-16 w-16 object-cover rounded-2xl border-2 border-accent shadow-sm" />
                ) : (
                  <div className="h-16 w-16 bg-surface border-2 border-accent rounded-2xl flex flex-col items-center justify-center p-2 shadow-sm">
                    {f.mimeType.startsWith('video/') ? (
                      <Video size={20} className="text-accent" />
                    ) : f.mimeType.startsWith('audio/') ? (
                      <FileAudio size={20} className="text-accent" />
                    ) : f.mimeType.includes('pdf') || f.mimeType.startsWith('text/') ? (
                      <FileText size={20} className="text-accent" />
                    ) : (
                      <File size={20} className="text-accent" />
                    )}
                    <span className="text-[8px] font-bold truncate w-full text-center mt-1">{f.name}</span>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex flex-col">
          {isRecording ? (
            <div className="w-full py-2 bg-red-50/50 rounded-xl flex items-center mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mx-3"></div>
              <span className="text-red-500 font-bold font-mono text-sm">
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                {(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="ml-2 text-red-400 text-[10px] uppercase tracking-widest font-bold">Запись...</span>
            </div>
          ) : (
            <textarea 
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              placeholder="Спроси что-нибудь..."
              className="w-full bg-transparent outline-none resize-none text-[15px] text-text leading-relaxed min-h-[24px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              <Plus size={22} className="text-muted hover:text-accent transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()} />
              <Camera size={22} className="text-muted hover:text-accent transition-all cursor-pointer" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => handleFileUpload(e as any, true);
                input.click();
              }} />
              <Mic 
                size={22} 
                className={`transition-all cursor-pointer ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted hover:text-accent'}`} 
                onClick={isRecording ? stopRecording : startRecording} 
              />
            </div>
            <div className="flex items-center">
              <Trash2 
                size={20} 
                className="text-muted hover:text-red-400 transition-all cursor-pointer mr-2" 
                onClick={() => {
                  setInput('');
                  setAttachedFiles([]);
                }} 
              />
              <button 
                type="submit"
                disabled={isLoading || (!input.trim() && attachedFiles.length === 0 && !isRecording)}
                className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-md shadow-accent/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {isRecording ? <Square size={20} className="text-white" fill="currentColor" onClick={(e) => { e.preventDefault(); stopRecording(); handleSend(); }} /> : <Send size={20} className="text-white" />}
              </button>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,audio/*,application/pdf,text/plain"
            multiple
            className="hidden"
          />
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
  setTheme,
  setCoachMessages,
  setNotification
}: { 
  profile: UserProfile | null; 
  onUpdate: (data: any, photoFile?: File) => Promise<void>; 
  onLogout: () => void;
  setActiveTab: (tab: any) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setCoachMessages: (messages: any[]) => void;
  setNotification: (notif: any) => void;
}) {
  const [name, setName] = useState(profile?.displayName || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile?.gender || 'male');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<{ type: 'delete' | 'logout' | 'export' | 'import' | null; action: () => void }>({ type: null, action: () => {} });
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || 'male');
      setGoal(profile.goal || '');
    }
  }, [profile]);

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
      
      const deleteInBatches = async (querySnapshot: any) => {
        const chunks = [];
        let currentChunk = [];
        querySnapshot.forEach((doc: any) => {
          currentChunk.push(doc);
          if (currentChunk.length === 400) {
            chunks.push(currentChunk);
            currentChunk = [];
          }
        });
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const doc of chunk) {
            batch.delete(doc.ref);
          }
          await batch.commit();
        }
      };

      // Delete user document
      await deleteDoc(doc(db, 'users', userId));
      
      // Delete current_workout document
      await deleteDoc(doc(db, 'current_workout', userId));
      
      // Delete programs document
      await deleteDoc(doc(db, 'programs', userId));
      
      // Delete workouts
      const workoutsQuery = query(collection(db, 'workouts'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(workoutsQuery));
      
      // Delete measurements
      const measurementsQuery = query(collection(db, 'measurements'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(measurementsQuery));
      
      // Delete strength records
      const strengthQuery = query(collection(db, 'strength'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(strengthQuery));
      
      // Delete tech items
      const techQuery = query(collection(db, 'tech'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(techQuery));
      
      // Delete coach messages
      const messagesQuery = query(collection(db, 'coach_messages'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(messagesQuery));
      
      // Clear local storage (chat history)
      localStorage.removeItem('coach_messages');
      setCoachMessages([]);
      
      console.log("All data deleted successfully.");
      onLogout(); // Logout after successful deletion
    } catch (error) {
      console.error("Error deleting all data:", error);
      // Handle error (e.g., show notification)
    } finally {
      closeConfirm();
    }
  };
  
  const handleCancel = () => {
    setName(profile?.displayName || '');
    setAge(profile?.age?.toString() || '');
    setGender(profile?.gender || 'male');
    setGoal(profile?.goal || '');
    setIsEditing(false);
  };

  const handleSaveProfile = async (photoFile?: File) => {
    setIsSaving(true);
    try {
      await onUpdate({
        displayName: name,
        age: age ? Number(age) : null,
        gender: gender,
        goal: goal
      }, photoFile);
      setNotification({ show: true, title: 'Сохранено', message: 'Профиль обновлён ✓' });
      setIsEditing(false);
      setPhotoFile(null); // Clear local file state after success
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setNotification({ 
        show: true, 
        title: 'Ошибка', 
        message: error.message || 'Не удалось сохранить профиль. Попробуйте позже.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center text-accent overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={32} />
          )}
          {isEditing && (
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
              <Camera size={20} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && setPhotoFile(e.target.files[0])} />
            </label>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-text">{profile?.displayName || 'Пользователь'}</h2>
          <p className="text-xs text-muted font-bold uppercase tracking-widest">{profile?.email}</p>
        </div>
      </div>

      <div className="bg-surface border-2 border-border rounded-[32px] p-6 space-y-6 shadow-sm relative">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Личные данные</h3>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-5 right-5 text-muted hover:text-accent transition-all"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Имя</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border-2 border-border text-text p-2.5 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Возраст</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-surface-2 border-2 border-border text-text p-2.5 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Пол</label>
                <div className="flex gap-2">
                  {[
                    { id: 'female', label: 'Ж' },
                    { id: 'male', label: 'М' },
                    { id: 'other', label: '?' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id as any)}
                      className={`${gender === g.id ? 'bg-accent text-white' : 'bg-surface-2 border-2 border-border text-muted hover:border-accent/50'} rounded-xl px-5 py-2 text-[13px] font-bold transition-all`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Главная цель</label>
              <textarea 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Например: Набрать 5кг мышц.&#10;Улучшить выносливость."
                rows={3}
                className="w-full bg-surface-2 border-2 border-border text-text p-3 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="border-b border-border/40 pb-3 mb-3">
              <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Имя</div>
              <div className="text-[15px] font-bold text-text">{name || '—'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-3 mb-3">
              <div>
                <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Возраст</div>
                <div className="text-[15px] font-bold text-text">{age || '—'}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Пол</div>
                <div className="text-[15px] font-bold text-text">
                  {gender === 'male' ? 'Мужской' : gender === 'female' ? 'Женский' : 'Другой'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Цель</div>
              <div className="text-[13px] font-medium text-text leading-relaxed">{goal || '—'}</div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleCancel}
              className="flex-1 py-3 border-2 border-border text-muted font-bold rounded-2xl hover:bg-surface-2 transition-all"
            >
              Отмена
            </button>
            <button 
              onClick={() => handleSaveProfile(photoFile || undefined)}
              disabled={isSaving}
              className="flex-1 py-3 bg-accent text-white font-bold rounded-2xl shadow-lg hover:bg-accent-2 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Dumbbell size={20} />
                </motion.div>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface border-2 border-border rounded-[32px] p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="text-sm font-bold text-text">Темная тема</span>
        </div>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-accent' : 'bg-border'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setActiveTab('strength')}
          className="bg-surface border-2 border-border rounded-[32px] p-6 flex flex-col items-center gap-3 hover:border-accent/50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
            <Trophy size={24} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Силовые</span>
        </button>
        <button 
          onClick={() => setActiveTab('tech')}
          className="bg-surface border-2 border-border rounded-[32px] p-6 flex flex-col items-center gap-3 hover:border-accent/50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
            <BookOpen size={24} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Техника</span>
        </button>
      </div>

      <div className="bg-surface p-6 rounded-[32px] border-2 border-red-500/10 shadow-sm">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <AlertTriangle size={16} /> Опасная зона
        </h3>
        <div className="space-y-2">
          <button onClick={() => openConfirm('delete', handleDeleteAllData)} className="w-full flex items-center justify-between p-4 bg-red-500/5 rounded-2xl hover:bg-red-500/10 transition-all group border border-red-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"><RotateCcw size={20} /></div>
              <span className="text-sm font-bold text-text group-hover:text-red-600">Сбросить все данные</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </button>
          <button onClick={() => openConfirm('logout', onLogout)} className="w-full flex items-center justify-between p-4 bg-surface-2/50 rounded-2xl hover:bg-accent/5 transition-all group border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-text"><LogOut size={20} /></div>
              <span className="text-sm font-bold text-text">Выйти из аккаунта</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
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

function ProgressPage({ 
  user,
  workouts, 
  streakWeeks, 
  onDelete, 
  onUpdate, 
  programData,
  strengthRecords,
  onSaveStrength,
  onDeleteStrength,
  onUpdateStrength,
  measurements,
  activeSubTab,
  setActiveSubTab,
  chartMetric,
  setChartMetric,
  userProfile
}: { 
  user: User | null;
  workouts: Workout[]; 
  streakWeeks: number;
  onDelete: (id: string) => void; 
  onUpdate: (id: string, data: any) => void; 
  programData: any;
  strengthRecords: StrengthRecord[];
  onSaveStrength: (data: any) => void;
  onDeleteStrength: (id: string) => void;
  onUpdateStrength: (id: string, data: any) => void;
  measurements: WeightMeasurement[];
  activeSubTab: 'workouts' | 'body';
  setActiveSubTab: (tab: 'workouts' | 'body') => void;
  chartMetric: 'weight' | 'volume' | 'reps';
  setChartMetric: (metric: 'weight' | 'volume' | 'reps') => void;
  userProfile: UserProfile | null;
}) {
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editWorkoutDate, setEditWorkoutDate] = useState('');
  const [editWorkoutDay, setEditWorkoutDay] = useState('');

  const [strengthExercise, setStrengthExercise] = useState('');
  const [strengthWeight, setStrengthWeight] = useState('');
  const [strengthReps, setStrengthReps] = useState('');
  const [editingStrengthId, setEditingStrengthId] = useState<string | null>(null);
  const [editStrengthWeight, setEditStrengthWeight] = useState('');
  const [editStrengthReps, setEditStrengthReps] = useState('');

  const [selectedMeasure1, setSelectedMeasure1] = useState<string>('');
  const [selectedMeasure2, setSelectedMeasure2] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isDropdown1Open, setIsDropdown1Open] = useState(false);
  const [isDropdown2Open, setIsDropdown2Open] = useState(false);
  const dropdown1Ref = useRef<HTMLDivElement>(null);
  const dropdown2Ref = useRef<HTMLDivElement>(null);

  const [activityPeriod, setActivityPeriod] = useState<'8w' | '6m' | 'all'>('8w');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdown1Ref.current && !dropdown1Ref.current.contains(event.target as Node)) {
        setIsDropdown1Open(false);
      }
      if (dropdown2Ref.current && !dropdown2Ref.current.contains(event.target as Node)) {
        setIsDropdown2Open(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedMeasure1 || !selectedMeasure2) return;
    
    const m1 = measurements.find(m => m.id === selectedMeasure1);
    const m2 = measurements.find(m => m.id === selectedMeasure2);
    
    if (!m1 || !m2) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const getBase64 = async (urlOrData: string) => {
        if (urlOrData.startsWith('data:image')) {
          return urlOrData.split(',')[1];
        }
        const response = await fetch(urlOrData);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      };

      const hasPhotos = m1.photos?.length && m2.photos?.length;
      let photos1: string[] = [];
      let photos2: string[] = [];

      if (hasPhotos) {
        photos1 = await Promise.all(m1.photos!.map(url => getBase64(url)));
        photos2 = await Promise.all(m2.photos!.map(url => getBase64(url)));
      }

      const prompt = `Проанализируй прогресс между двумя замерами.
      
      Замер 1 (до): Дата ${format(new Date(m1.date), 'd MMMM yyyy', { locale: ru })}, Вес ${m1.weight || 'нет данных'} кг, Жир ${m1.fat || 'нет данных'}%, Мышцы ${m1.muscle || 'нет данных'} кг.
      Замер 2 (после): Дата ${format(new Date(m2.date), 'd MMMM yyyy', { locale: ru })}, Вес ${m2.weight || 'нет данных'} кг, Жир ${m2.fat || 'нет данных'}%, Мышцы ${m2.muscle || 'нет данных'} кг.
      
      ${hasPhotos ? 'Я также прикрепил фото "До" и "После". Сравни их визуально и отметь изменения в композиции тела, рельефе и пропорциях.' : 'Фотографии для визуального сравнения недоступны. Проанализируй только цифровые показатели.'}
      
      Дай профессиональную оценку прогресса и рекомендации по дальнейшим тренировкам и питанию. Отвечай на русском языке в стиле фитнес-коуча. Используй Markdown для форматирования.`;

      const parts: any[] = [{ text: prompt }];

      if (hasPhotos) {
        parts.push(...photos1.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } })));
        parts.push(...photos2.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } })));
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
      });

      setAnalysisResult(response.text || "Не удалось получить анализ.");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisError("Ошибка при анализе. Попробуйте позже.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Set initial exercise if empty
  useEffect(() => {
    if (!strengthExercise && programData) {
      for (const day of Object.values(programData) as any[]) {
        const firstStrength = day.exercises?.find((ex: any) => !ex.isCardio && !ex.bodyweight);
        if (firstStrength) {
          setStrengthExercise(firstStrength.name);
          break;
        }
      }
    }
  }, [programData, strengthExercise]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = workouts.filter(w => {
      const d = new Date(w.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return {
      total: workouts.length,
      thisMonth,
      streak: streakWeeks
    };
  }, [workouts, streakWeeks]);

  const activityData = useMemo(() => {
    const now = new Date();
    const data = [];

    if (activityPeriod === '8w') {
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        }).length;
        data.push({ name: `Нед ${8-i}`, count });
      }
    } else if (activityPeriod === '6m') {
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        }).length;
        data.push({ name: format(monthStart, 'MMM', { locale: ru }), count });
      }
    } else if (activityPeriod === 'all') {
      if (workouts.length === 0) return [];
      const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstDate = new Date(sortedWorkouts[0].date);
      const start = startOfMonth(firstDate);
      const end = startOfMonth(now);
      
      let current = start;
      while (current <= end) {
        const mStart = startOfMonth(current);
        const mEnd = endOfMonth(current);
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: mStart, end: mEnd });
        }).length;
        data.push({ name: format(mStart, 'MMM', { locale: ru }), count });
        // Add one month
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }
    return data;
  }, [workouts, activityPeriod]);

  const strengthByExercise = useMemo(() => {
    const groups: Record<string, StrengthRecord[]> = {};
    strengthRecords.forEach(r => {
      if (!groups[r.exercise]) groups[r.exercise] = [];
      groups[r.exercise].push(r);
    });
    return groups;
  }, [strengthRecords]);

  const handleSaveStrength = () => {
    if (!strengthWeight || !strengthReps || !strengthExercise) return;
    onSaveStrength({ exercise: strengthExercise, weight: Number(strengthWeight), reps: Number(strengthReps) });
    setStrengthWeight('');
    setStrengthReps('');
  };

  const handleStartEditStrength = (r: StrengthRecord) => {
    setEditingStrengthId(r.id || null);
    setEditStrengthWeight(r.weight.toString());
    setEditStrengthReps(r.reps.toString());
  };

  const handleSaveEditStrength = () => {
    if (!editingStrengthId) return;
    onUpdateStrength(editingStrengthId, { weight: Number(editStrengthWeight), reps: Number(editStrengthReps) });
    setEditingStrengthId(null);
  };

  const handleStartEditWorkout = (w: Workout) => {
    setEditingWorkoutId(w.id || null);
    setEditWorkoutDate(w.date.split('T')[0]);
    setEditWorkoutDay(w.day);
  };

  const handleSaveEditWorkout = () => {
    if (!editingWorkoutId) return;
    try {
      const d = new Date(editWorkoutDate);
      if (!isNaN(d.getTime())) {
        onUpdate(editingWorkoutId, { date: d.toISOString(), day: editWorkoutDay });
      }
    } catch (e) {}
    setEditingWorkoutId(null);
  };

  const bodyStats = useMemo(() => {
    const latest = measurements[0];
    return {
      weight: latest?.weight ? `${latest.weight}кг` : '—',
      fat: latest?.fat ? `${latest.fat}%` : '—',
      muscle: latest?.muscle ? `${latest.muscle}%` : '—'
    };
  }, [measurements]);

  const weightChartData = useMemo(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return [...measurements]
      .filter(m => new Date(m.date) >= ninetyDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(m => ({
        date: format(new Date(m.date), 'd MMM', { locale: ru }),
        weight: m.weight
      }));
  }, [measurements]);

  const compositionChartData = useMemo(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return [...measurements]
      .filter(m => new Date(m.date) >= ninetyDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(m => ({
        date: format(new Date(m.date), 'd MMM', { locale: ru }),
        fat: m.fat,
        muscle: m.muscle
      }));
  }, [measurements]);

  const dynamics = useMemo(() => {
    if (measurements.length < 1) return [];
    const current = measurements[0];
    const previous = measurements[1];

    const getDelta = (curr: number | undefined, prev: number | undefined, reverse = false) => {
      if (curr === undefined || prev === undefined) return null;
      const diff = curr - prev;
      const isImprovement = reverse ? diff < 0 : diff > 0;
      return {
        diff: diff.toFixed(1),
        isImprovement,
        isNeutral: diff === 0
      };
    };

    return [
      { label: 'Вес', value: current.weight ? `${current.weight} кг` : '—', delta: getDelta(current.weight, previous?.weight, true) },
      { label: 'Жир %', value: current.fat ? `${current.fat}%` : '—', delta: getDelta(current.fat, previous?.fat, true) },
      { label: 'Мышцы %', value: current.muscle ? `${current.muscle}%` : '—', delta: getDelta(current.muscle, previous?.muscle) },
      { label: 'BMR', value: current.bmr ? `${current.bmr} ккал` : '—', delta: getDelta(current.bmr, previous?.bmr) },
      { label: 'Биовозраст', value: current.biologicalAge ? `${current.biologicalAge}` : '—', delta: getDelta(current.biologicalAge, previous?.biologicalAge, true) },
      { label: 'Висц. жир', value: current.visceralFat ? `${current.visceralFat}` : '—', delta: getDelta(current.visceralFat, previous?.visceralFat, true) },
    ];
  }, [measurements]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24">
      {/* Pill Switcher */}
      <div className="bg-surface border-2 border-border rounded-2xl p-1 flex gap-1 sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => setActiveSubTab('workouts')}
          className={`${activeSubTab === 'workouts' ? 'bg-accent text-white' : 'text-muted hover:text-accent'} rounded-xl py-2 flex-1 text-[11px] font-bold uppercase tracking-widest transition-all`}
        >
          Тренировки
        </button>
        <button 
          onClick={() => setActiveSubTab('body')}
          className={`${activeSubTab === 'body' ? 'bg-accent text-white' : 'text-muted hover:text-accent'} rounded-xl py-2 flex-1 text-[11px] font-bold uppercase tracking-widest transition-all`}
        >
          Тело
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'workouts' ? (
          <motion.div 
            key="workouts-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatItem value={stats.total} label="всего" />
              <StatItem value={stats.thisMonth} label="в месяце" />
              <StatItem value={stats.streak} label="недель" />
            </div>

            {/* Activity Chart */}
            <div className="bg-surface border-2 border-border rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest">Активность</h4>
                <div className="flex gap-1 bg-surface-2/50 rounded-xl p-1">
                  {[
                    { id: '8w', label: '8 нед' },
                    { id: '6m', label: '6 мес' },
                    { id: 'all', label: 'Всё' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setActivityPeriod(p.id as any)}
                      className={`${activityPeriod === p.id ? 'bg-accent text-white rounded-lg' : 'text-muted hover:text-accent'} px-3 py-1 text-[10px] font-bold transition-all`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <motion.div 
                key={activityPeriod}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.2 }}
                className="h-[120px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-muted)' }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '2px solid var(--color-border)', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: 'var(--color-accent)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="var(--color-accent)" 
                      fill="var(--color-accent)" 
                      fillOpacity={0.15} 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Strength Cards */}
            <div className="space-y-4">
              <div className="flex gap-2 mb-2 px-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'weight', label: 'Вес' },
                  { id: 'volume', label: 'Объём' },
                  { id: 'reps', label: 'Повторы' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setChartMetric(m.id as any)}
                    className={`text-[10px] px-3 py-1.5 rounded-xl font-bold uppercase transition-all whitespace-nowrap ${
                      chartMetric === m.id ? 'bg-accent text-white shadow-md' : 'bg-surface-2 text-muted hover:bg-surface-3'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {Object.keys(strengthByExercise).length === 0 ? (
                <div className="bg-surface border-2 border-dashed border-border rounded-3xl p-10 text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="text-accent w-8 h-8" />
                  </div>
                  <h4 className="text-text font-bold mb-2">Здесь будет ваш прогресс</h4>
                  <p className="text-muted text-xs leading-relaxed">
                    Завершите тренировку во вкладке «Сегодня», и графики по упражнениям появятся здесь автоматически.
                  </p>
                </div>
              ) : (
                Object.entries(strengthByExercise).map(([name, entries]) => {
                  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  const latest = sorted[sorted.length - 1];
                  const best = sorted.reduce((max, e) => e.weight > max.weight ? e : max, sorted[0]);
                  const chartData = sorted.map(e => ({ 
                    date: format(new Date(e.date), 'd MMM', { locale: ru }), 
                    weight: e.weight,
                    volume: e.volume || (e.weight * e.reps),
                    reps: e.reps,
                    rawDate: e.date
                  }));

                  const goalChangedAt = userProfile?.goalChangedAt;

                  return (
                    <div key={name} className="bg-surface border-2 border-border rounded-3xl p-6 space-y-4 shadow-sm">
                      <h4 className="text-[14px] font-bold text-text">{name}</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-surface-2/50 p-3 rounded-2xl text-center">
                          <div className="text-[8px] text-muted uppercase font-bold mb-1">Сейчас</div>
                          <div className="text-xl font-display font-bold text-accent">
                            {chartMetric === 'weight' ? latest.weight : chartMetric === 'volume' ? (latest.volume || (latest.weight * latest.reps)) : latest.reps}
                          </div>
                        </div>
                        <div className="bg-accent-2/10 p-3 rounded-2xl text-center">
                          <div className="text-[8px] text-muted uppercase font-bold mb-1">Рекорд</div>
                          <div className="text-xl font-display font-bold text-accent-2">
                            {chartMetric === 'weight' ? best.weight : chartMetric === 'volume' ? Math.max(...sorted.map(e => e.volume || (e.weight * e.reps))) : Math.max(...sorted.map(e => e.reps))}
                          </div>
                        </div>
                        <div className="bg-done/10 p-3 rounded-2xl text-center">
                          <div className="text-[8px] text-muted uppercase font-bold mb-1">Цель</div>
                          <div className="text-xl font-display font-bold text-done">
                            {chartMetric === 'weight' ? latest.weight + 1 : chartMetric === 'volume' ? Math.round((latest.volume || (latest.weight * latest.reps)) * 1.05) : latest.reps + 2}
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-[100px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '10px' }}
                              labelStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                            />
                            {goalChangedAt && (
                              <ReferenceLine 
                                x={format(new Date(goalChangedAt), 'd MMM', { locale: ru })} 
                                stroke="var(--color-accent-2)" 
                                strokeDasharray="3 3" 
                                label={{ value: 'Цель', position: 'top', fill: 'var(--color-accent-2)', fontSize: 8 }}
                              />
                            )}
                            <Line 
                              type="monotone" 
                              dataKey={chartMetric} 
                              stroke="var(--color-accent)" 
                              strokeWidth={2} 
                              dot={false} 
                              animationDuration={1000}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/30">
                        {[...sorted].reverse().slice(0, 3).map((entry, idx) => (
                          <div key={entry.id || idx} className="flex justify-between items-center">
                            {editingStrengthId === entry.id ? (
                              <div className="flex gap-2 items-center w-full">
                                <input 
                                  type="number" 
                                  value={editStrengthWeight} 
                                  onChange={(e) => setEditStrengthWeight(e.target.value)}
                                  className="w-16 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                                />
                                <input 
                                  type="number" 
                                  value={editStrengthReps} 
                                  onChange={(e) => setEditStrengthReps(e.target.value)}
                                  className="w-12 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                                />
                                <button onClick={handleSaveEditStrength} className="text-done"><Check size={14}/></button>
                                <button onClick={() => setEditingStrengthId(null)} className="text-muted"><X size={14}/></button>
                              </div>
                            ) : (
                              <>
                                <span className="text-[12px] text-muted font-medium">
                                  {format(new Date(entry.date), 'd MMM', { locale: ru })}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-text text-[13px]">{entry.weight}кг × {entry.reps}</span>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleStartEditStrength(entry)} className="p-1 text-muted hover:text-accent"><Edit2 size={12}/></button>
                                    <button onClick={() => onDeleteStrength(entry.id!)} className="p-1 text-muted hover:text-red-500"><Trash2 size={12}/></button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* History */}
            <div className="space-y-6">
              <h3 className="font-display text-2xl text-accent font-bold">История</h3>
              <div className="space-y-3">
                {workouts.map(w => (
                  <div key={w.id} className="bg-surface border-2 border-border rounded-3xl p-5 shadow-sm">
                    {editingWorkoutId === w.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <CustomDatePicker 
                            value={editWorkoutDate}
                            onChange={(date) => setEditWorkoutDate(date)}
                          />
                          <select 
                            value={editWorkoutDay}
                            onChange={(e) => setEditWorkoutDay(e.target.value)}
                            className="w-full bg-surface-2 border-2 border-border p-2 rounded-xl text-xs font-bold"
                          >
                            {Object.keys(programData).map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEditWorkout} className="flex-1 py-2 bg-done text-white text-[10px] font-bold uppercase rounded-xl">Сохранить</button>
                          <button onClick={() => setEditingWorkoutId(null)} className="flex-1 py-2 bg-surface-3 text-text text-[10px] font-bold uppercase rounded-xl">Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-[11px] text-muted font-bold uppercase tracking-wider mb-1">
                            {format(new Date(w.date), 'd MMMM · HH:mm', { locale: ru })}
                          </div>
                          <div className="text-[15px] font-bold text-text">
                            {w.day} — {programData[w.day]?.subtitle}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleStartEditWorkout(w)} className="p-2 text-muted hover:text-accent transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => onDelete(w.id!)} className="p-2 text-muted hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="body-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Body Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatItem value={bodyStats.weight as any} label="Вес" />
              <StatItem value={bodyStats.fat as any} label="Жир %" />
              <StatItem value={bodyStats.muscle as any} label="Мышцы %" />
            </div>

            {/* Weight Chart */}
            <div className="bg-surface border-2 border-border rounded-3xl p-5 shadow-sm">
              <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest mb-3">Вес</h4>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-muted)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '2px solid var(--color-border)', fontSize: '10px', fontWeight: 'bold' }}
                      formatter={(val) => [`${val} кг`, 'Вес']}
                    />
                    <Area type="monotone" dataKey="weight" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.15} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Composition Chart */}
            <div className="bg-surface border-2 border-border rounded-3xl p-5 shadow-sm">
              <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest mb-3">Состав тела</h4>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compositionChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-muted)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '2px solid var(--color-border)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="fat" stroke="var(--color-accent-2)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="muscle" stroke="var(--color-done)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent-2" />
                  <span className="text-[10px] font-bold text-muted uppercase">Жир %</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-done" />
                  <span className="text-[10px] font-bold text-muted uppercase">Мышцы %</span>
                </div>
              </div>
            </div>

            {/* Dynamics */}
            <div className="space-y-4">
              <h3 className="font-display text-xl text-accent font-bold">Динамика</h3>
              <div className="grid grid-cols-2 gap-3">
                {dynamics.map((item, idx) => (
                  <div key={idx} className="bg-surface border-2 border-border rounded-2xl p-4 shadow-sm space-y-1">
                    <div className="text-[9px] text-muted uppercase font-bold tracking-widest">{item.label}</div>
                    <div className="font-display text-2xl font-bold text-text">{item.value}</div>
                    {item.delta && (
                      <div className={`text-[10px] font-bold flex items-center gap-0.5 ${item.delta.isNeutral ? 'text-muted' : item.delta.isImprovement ? 'text-done' : 'text-red-500'}`}>
                        {item.delta.isNeutral ? '' : item.delta.isImprovement ? '↑' : '↓'} {Math.abs(Number(item.delta.diff))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-surface border-2 border-border rounded-[32px] p-6 shadow-sm space-y-6 overflow-visible">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-display text-xl text-accent font-bold">AI-анализ прогресса</h3>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Сравнение двух замеров</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 relative" ref={dropdown1Ref}>
                  <label className="text-[9px] text-muted uppercase font-bold px-1">Замер 1 (До)</label>
                  <button 
                    onClick={() => setIsDropdown1Open(!isDropdown1Open)}
                    className="w-full bg-surface border-2 border-border text-text p-4 rounded-2xl text-[13px] font-bold outline-none flex items-center justify-between cursor-pointer hover:border-accent/50 transition-all"
                  >
                    <span>
                      {selectedMeasure1 
                        ? (() => {
                            const m = measurements.find(m => m.id === selectedMeasure1);
                            return m ? `${format(new Date(m.date), 'd MMMM yyyy', { locale: ru })}${m.weight ? ` · ${m.weight} кг` : ''}` : 'Выбрать...';
                          })()
                        : 'Выбрать...'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isDropdown1Open ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isDropdown1Open && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-surface border-2 border-border rounded-2xl shadow-xl z-[9999] overflow-hidden"
                      >
                        <div className="max-h-[200px] overflow-y-auto">
                          {measurements.length === 0 ? (
                            <div className="p-4 text-[13px] font-bold text-muted text-center">Нет замеров</div>
                          ) : (
                            [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                              <div 
                                key={m.id} 
                                onClick={() => {
                                  setSelectedMeasure1(m.id!);
                                  setIsDropdown1Open(false);
                                }}
                                className="p-4 text-[13px] font-bold hover:bg-accent/10 transition-all cursor-pointer border-b border-border last:border-0"
                              >
                                {format(new Date(m.date), 'd MMMM yyyy', { locale: ru })}{m.weight ? ` · ${m.weight} кг` : ''}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2 relative" ref={dropdown2Ref}>
                  <label className="text-[9px] text-muted uppercase font-bold px-1">Замер 2 (После)</label>
                  <button 
                    onClick={() => setIsDropdown2Open(!isDropdown2Open)}
                    className="w-full bg-surface border-2 border-border text-text p-4 rounded-2xl text-[13px] font-bold outline-none flex items-center justify-between cursor-pointer hover:border-accent/50 transition-all"
                  >
                    <span>
                      {selectedMeasure2 
                        ? (() => {
                            const m = measurements.find(m => m.id === selectedMeasure2);
                            return m ? `${format(new Date(m.date), 'd MMMM yyyy', { locale: ru })}${m.weight ? ` · ${m.weight} кг` : ''}` : 'Выбрать...';
                          })()
                        : 'Выбрать...'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isDropdown2Open ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isDropdown2Open && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-surface border-2 border-border rounded-2xl shadow-xl z-[9999] overflow-hidden"
                      >
                        <div className="max-h-[200px] overflow-y-auto">
                          {measurements.length === 0 ? (
                            <div className="p-4 text-[13px] font-bold text-muted text-center">Нет замеров</div>
                          ) : (
                            [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                              <div 
                                key={m.id} 
                                onClick={() => {
                                  setSelectedMeasure2(m.id!);
                                  setIsDropdown2Open(false);
                                }}
                                className="p-4 text-[13px] font-bold hover:bg-accent/10 transition-all cursor-pointer border-b border-border last:border-0"
                              >
                                {format(new Date(m.date), 'd MMMM yyyy', { locale: ru })}{m.weight ? ` · ${m.weight} кг` : ''}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[selectedMeasure1, selectedMeasure2].map((id, idx) => {
                  const m = measurements.find(item => item.id === id);
                  if (!m) return <div key={idx} className="aspect-square bg-surface-2/50 rounded-2xl border-2 border-dashed border-border" />;
                  return (
                    <div key={idx} className="bg-surface-2/50 rounded-2xl p-3 space-y-2">
                      {m.photos && m.photos.length > 0 ? (
                        <img src={m.photos[0]} alt="Preview" className="w-full aspect-square object-cover rounded-xl mb-2" />
                      ) : (
                        <div className="w-full aspect-square bg-surface rounded-xl flex items-center justify-center mb-2">
                          <Camera size={24} className="text-muted/30" />
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-text">{format(new Date(m.date), 'd MMMM yyyy', { locale: ru })}</div>
                        {m.weight && <div className="text-[10px] text-muted">{m.weight} кг</div>}
                        {(m.fat || m.muscle) && (
                          <div className="text-[10px] text-accent">
                            {m.fat && `Жир: ${m.fat}%`} {m.muscle && `Мышцы: ${m.muscle}кг`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedMeasure1 || !selectedMeasure2}
                className="w-full py-4 bg-gradient-to-r from-accent to-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                {isAnalyzing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Dumbbell size={20} />
                  </motion.div>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Проанализировать</span>
                  </>
                )}
              </button>

              <AnimatePresence>
                {analysisError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center"
                  >
                    {analysisError}
                  </motion.div>
                )}

                {analysisResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-surface-2 border-2 border-border rounded-3xl shadow-inner space-y-4"
                  >
                    <div className="flex items-center gap-2 text-accent">
                      <Bot size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Результат анализа</span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none text-text text-sm leading-relaxed">
                      <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatItem({ value, label }: { value: any; label: string }) {
  const valueStr = String(value);
  const valueSize = valueStr.length > 5 ? 'text-xl' : 'text-2xl';
  return (
    <div className="bg-surface border-2 border-border rounded-3xl p-5 text-center shadow-sm flex flex-col justify-center min-h-[100px]">
      <div className={`font-display ${valueSize} text-accent font-bold leading-none mb-2 break-words`}>{value}</div>
      <div className="text-[10px] text-muted uppercase font-bold tracking-wider">{label}</div>
    </div>
  );
}

function StrengthPage({ 
  records, 
  onSave, 
  onDelete, 
  onUpdate, 
  programData,
  onBack 
}: { 
  records: StrengthRecord[]; 
  onSave: (data: any) => void; 
  onDelete: (id: string) => void; 
  onUpdate: (id: string, data: any) => void; 
  programData: any;
  onBack: () => void;
}) {
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  // Set initial exercise if empty
  useEffect(() => {
    if (!exercise && programData) {
      for (const day of Object.values(programData) as any[]) {
        const firstStrength = day.exercises?.find((ex: any) => !ex.isCardio && !ex.bodyweight);
        if (firstStrength) {
          setExercise(firstStrength.name);
          break;
        }
      }
    }
  }, [programData, exercise]);

  const strengthByExercise = useMemo(() => {
    const groups: Record<string, StrengthRecord[]> = {};
    records.forEach(r => {
      if (!groups[r.exercise]) groups[r.exercise] = [];
      groups[r.exercise].push(r);
    });
    return groups;
  }, [records]);

  const handleSave = () => {
    if (!weight || !reps || !exercise) return;
    onSave({ exercise, weight: Number(weight), reps: Number(reps) });
    setWeight('');
    setReps('');
  };

  const handleStartEdit = (r: StrengthRecord) => {
    setEditingId(r.id || null);
    setEditWeight(r.weight.toString());
    setEditReps(r.reps.toString());
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, { weight: Number(editWeight), reps: Number(editReps) });
    setEditingId(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-muted hover:text-accent transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h3 className="font-serif text-xl text-accent font-light">Силовые рекорды</h3>
        <div className="w-10" />
      </div>

      {/* Record Form */}
      <div className="bg-surface border-2 border-border rounded-[32px] p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Записать результат</h3>
        <div className="space-y-4">
          <select 
            className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-[13px] font-bold outline-none focus:border-accent transition-all appearance-none"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            {Object.entries(programData).map(([day, p]: [string, any]) => (
              <optgroup key={day} label={`${day} — ${p.subtitle}`}>
                {p.exercises?.filter((ex: any) => !ex.isCardio && !ex.bodyweight).map((ex: any, idx: number) => (
                  <option key={`${day}-${ex.name}-${idx}`} value={ex.name}>{ex.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="number" 
              placeholder="Вес (кг)"
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <input 
              type="number" 
              placeholder="Повторы"
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-accent text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Strength Cards */}
      <div className="space-y-4">
        {Object.keys(strengthByExercise).length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-[40px] border-2 border-border shadow-sm">
            <Trophy className="mx-auto mb-4 text-accent/30" size={48} />
            <p className="text-sm font-bold text-text">Здесь будут ваши рекорды</p>
            <p className="text-xs text-muted mt-2">Запишите свой первый результат выше</p>
          </div>
        ) : (
          Object.entries(strengthByExercise).map(([name, entries]) => {
            const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const latest = sorted[sorted.length - 1];
            const best = sorted.reduce((max, e) => e.weight > max.weight ? e : max, sorted[0]);
            const chartData = sorted.map(e => ({ date: format(new Date(e.date), 'd MMM', { locale: ru }), weight: e.weight }));

            return (
              <div key={name} className="bg-surface border-2 border-border rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h4 className="text-[14px] font-bold text-text">{name}</h4>
                  <Trophy size={16} className="text-accent-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface-2/50 p-3 rounded-2xl text-center">
                    <div className="text-[8px] text-muted uppercase font-bold mb-1">Сейчас</div>
                    <div className="text-xl font-display font-bold text-accent">{latest.weight}</div>
                  </div>
                  <div className="bg-accent-2/10 p-3 rounded-2xl text-center">
                    <div className="text-[8px] text-muted uppercase font-bold mb-1">Рекорд</div>
                    <div className="text-xl font-display font-bold text-accent-2">{best.weight}</div>
                  </div>
                  <div className="bg-done/10 p-3 rounded-2xl text-center">
                    <div className="text-[8px] text-muted uppercase font-bold mb-1">Цель</div>
                    <div className="text-xl font-display font-bold text-done">{latest.weight + 1}</div>
                  </div>
                </div>
                
                <div className="h-[80px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="var(--color-accent)" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/30">
                  {[...sorted].reverse().slice(0, 3).map((entry, idx) => (
                    <div key={entry.id || idx} className="flex justify-between items-center">
                      {editingId === entry.id ? (
                        <div className="flex gap-2 items-center w-full">
                          <input 
                            type="number" 
                            value={editWeight} 
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-16 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                          />
                          <input 
                            type="number" 
                            value={editReps} 
                            onChange={(e) => setEditReps(e.target.value)}
                            className="w-16 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                          />
                          <button onClick={handleSaveEdit} className="text-done p-1"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="text-muted p-1"><X size={16} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="text-[10px] font-bold text-text">
                            {format(new Date(entry.date), 'd MMM', { locale: ru })}: {entry.weight}кг × {entry.reps}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleStartEdit(entry)} className="text-muted hover:text-accent p-1"><Edit2 size={14} /></button>
                            <button onClick={() => onDelete(entry.id!)} className="text-muted hover:text-error p-1"><Trash2 size={14} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function WeightPage({ 
  user,
  measurements, 
  onSave,
  onDelete,
  onUpdate,
  onGoToBodyProgress
}: { 
  user: User | null;
  measurements: WeightMeasurement[]; 
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  onGoToBodyProgress: () => void;
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingIndices, setUploadingIndices] = useState<number[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<{ urls: string[], index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadIndex = useRef<number | null>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSide = 800;

          if (width > height) {
            if (width > maxSide) {
              height *= maxSide / width;
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width *= maxSide / height;
              height = maxSide;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error('Image loading failed'));
        img.src = event.target?.result as string;
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoClick = (index: number) => {
    setUploadError(null);
    currentUploadIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentUploadIndex.current === null || !user) return;

    const index = currentUploadIndex.current;
    setUploadingIndices(prev => [...prev, index]);
    setUploadError(null);

    try {
      const base64String = await compressImage(file);
      
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = base64String;
        return newPhotos;
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError('Ошибка загрузки фото. Попробуйте другое.');
    } finally {
      setUploadingIndices(prev => prev.filter(i => i !== index));
      currentUploadIndex.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

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
      thigh: thigh ? Number(thigh) : undefined,
      photos: photos.filter(p => !!p)
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
    setPhotos([]);
    setDate(new Date().toISOString().split('T')[0]);
    setSaveSuccess(true);
    setIsAddingNew(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editingUploadIndices, setEditingUploadIndices] = useState<number[]>([]);
  
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const currentEditUploadIndex = useRef<number | null>(null);

  const handleEditPhotoClick = (index: number) => {
    setUploadError(null);
    currentEditUploadIndex.current = index;
    editFileInputRef.current?.click();
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentEditUploadIndex.current === null || !user) return;

    const index = currentEditUploadIndex.current;
    setEditingUploadIndices(prev => [...prev, index]);
    setUploadError(null);

    try {
      const base64String = await compressImage(file);
      
      setEditPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = base64String;
        return newPhotos;
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError('Ошибка загрузки фото. Попробуйте другое.');
    } finally {
      setEditingUploadIndices(prev => prev.filter(i => i !== index));
      currentEditUploadIndex.current = null;
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const removeEditPhoto = async (index: number) => {
    setEditPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
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
    setEditPhotos(m.photos ? [...m.photos] : []);
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
      bicep: editBicep ? Number(editBicep) : null,
      photos: editPhotos.filter(p => !!p)
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
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
          <div>
            {!isAddingNew ? (
              <button 
                key="add-button"
                onClick={() => setIsAddingNew(true)}
                className="w-full py-6 border-2 border-dashed border-border rounded-[32px] flex flex-col items-center justify-center gap-3 text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-all group"
              >
                <div className="w-12 h-12 bg-surface-2 rounded-2xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Plus size={24} className="group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Добавить новый замер</span>
              </button>
            ) : (
              <div className="overflow-hidden">
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
                      <CustomDatePicker 
                        value={date || ''}
                        onChange={(newDate) => setDate(newDate)}
                        label="Дата замера"
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

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Фото прогресса (до 3 штук)</h5>
                    <p className="text-[10px] text-muted italic leading-relaxed">📸 Для точного AI-анализа: утром натощак · одинаковое освещение каждый раз · минимальная одежда · три ракурса: фас, бок, спина · руки слегка отведены от тела</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="relative aspect-square">
                          {photos[i] ? (
                            <div className="relative w-full h-full">
                              <img src={photos[i]} alt="Progress" className="w-full h-full object-cover rounded-2xl" />
                              <button 
                                onClick={() => removePhoto(i)}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handlePhotoClick(i)}
                              disabled={uploadingIndices.includes(i)}
                              className="w-full h-full bg-surface-2 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent/50 transition-all"
                            >
                              {uploadingIndices.includes(i) ? (
                                <span className="text-[10px] text-accent font-bold uppercase">Загрузка...</span>
                              ) : (
                                <>
                                  <Camera size={20} className="text-muted" />
                                  <span className="text-[9px] text-muted font-bold uppercase">{i === 0 ? 'Фас' : i === 1 ? 'Бок' : 'Спина'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {uploadError && (
                      <div className="text-red-500 text-[10px] font-bold uppercase mt-2">{uploadError}</div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-accent hover:bg-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
                  >
                    Сохранить замер
                  </button>
                </div>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="text-center text-emerald-500 text-xs font-bold">
              ✅ Замер успешно сохранен!
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <History size={20} />
          </div>
          <h3 className="text-lg font-display font-bold text-accent">История</h3>
        </div>
        
        {measurements.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm font-medium">Нет сохраненных замеров</div>
        ) : (
          <div className="space-y-3">
              {[...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                <div 
                  key={m.id}
                  className="p-5 bg-surface-2/50 border-2 border-border rounded-3xl shadow-sm hover:border-accent/30 transition-all space-y-3"
                >
                  {editingId === m.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <CustomDatePicker value={editDate || ''} onChange={(newDate) => setEditDate(newDate)} label="Дата" />
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

                    {/* Edit Photos */}
                    <div className="space-y-3 mt-4">
                      <label className="text-[11px] text-muted uppercase font-bold tracking-wider ml-1">Фотографии</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((index) => {
                          const labels = ['Фас', 'Боком', 'Спина'];
                          return (
                            <div key={index} className="space-y-1">
                              <div className="text-[9px] text-muted text-center font-bold uppercase">{labels[index]}</div>
                              <div 
                                onClick={() => !editPhotos[index] && handleEditPhotoClick(index)}
                                className={`aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                                  editPhotos[index] 
                                    ? 'border-accent bg-surface' 
                                    : 'border-dashed border-border bg-surface-2 hover:border-accent/50 hover:bg-accent/5 cursor-pointer'
                                }`}
                              >
                                {editingUploadIndices.includes(index) ? (
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                    <Loader2 size={24} className="text-accent" />
                                  </motion.div>
                                ) : editPhotos[index] ? (
                                  <>
                                    <img src={editPhotos[index]} alt="Progress" className="w-full h-full object-cover" />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeEditPhoto(index);
                                      }}
                                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <Camera size={24} className="text-muted/50 mb-2" />
                                    <span className="text-[10px] font-bold text-muted/50 uppercase">Добавить</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {uploadError && <div className="text-red-500 text-xs text-center font-bold">{uploadError}</div>}
                      <input 
                        type="file" 
                        ref={editFileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleEditFileChange} 
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
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
                    {m.photos && m.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {m.photos.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt="Progress" 
                            className="rounded-xl aspect-square object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setViewerPhoto({ urls: m.photos!, index: idx })}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewerPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setViewerPhoto(null)}
              className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={32} />
            </button>
            
            <div className="relative w-full h-full flex items-center justify-center">
              {viewerPhoto.urls.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronLeft size={48} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronRight size={48} />
                  </button>
                </>
              )}
              <img 
                src={viewerPhoto.urls[viewerPhoto.index]} 
                alt="Fullscreen" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={onGoToBodyProgress}
        className="w-full py-4 bg-accent/10 text-accent font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-accent/20 transition-all mt-4"
      >
        Телесный прогресс <ChevronRight size={14} />
      </button>
    </div>
  );
}

function TechPage({ items, onEdit, isLoading, onBack }: { items: TechItem[]; onEdit: () => void; isLoading: boolean; onBack: () => void }) {
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
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-muted hover:text-accent transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="space-y-1">
            <h3 className="font-serif text-xl text-accent font-light">Памятка по технике</h3>
            <p className="text-[10px] text-muted uppercase tracking-wider">Настраиваемая база знаний</p>
          </div>
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
