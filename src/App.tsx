/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Dumbbell, 
  Calendar, 
  ChevronRight, 
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
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  doc, 
  deleteDoc, 
  addDoc,
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
  fat?: number;
  muscle?: number;
  water?: number;
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
}

// Program Data
const PROGRAM: Record<string, { subtitle: string; isCardio?: boolean; exercises: any[] }> = {
  'День 1': {
    subtitle: 'Ягодицы + Ноги',
    exercises: [
      { name: 'Ягодичный мостик со штангой', scheme: '4 × 12', sets: 4, tip: '⭐ Пауза 2 сек наверху! Старт 30-40 кг' },
      { name: 'Болгарские сплит-приседания', scheme: '3 × 10 / нога', sets: 3, tip: 'Корпус вперёд 30-45°, дави в пятку. Старт 5-8 кг' },
      { name: 'Жим ногами высокая постановка', scheme: '3 × 12', sets: 3, tip: 'Пятки высоко = акцент ягодицы. Старт 60-80 кг' },
      { name: 'Румынская тяга', scheme: '3 × 10', sets: 3, tip: 'Спина прямая, тянись тазом назад. Старт 25-35 кг' },
      { name: 'Вакуум', scheme: '3 × 30 сек', sets: 3, tip: 'Живот вваливается внутрь', bodyweight: true, unit: 'сек' },
    ]
  },
  'Кардио Вт': {
    subtitle: 'Горы + Жизнь',
    isCardio: true,
    exercises: [
      { name: 'Ходьба / горы Триберга', scheme: '30-60 мин · пульс 115-130', sets: 1, isCardio: true, fields: ['мин', 'км', 'пульс'] },
      { name: 'Растяжка', scheme: '10 мин', sets: 1, isCardio: true, fields: ['мин'] },
    ]
  },
  'День 2': {
    subtitle: 'Верх + Осанка',
    exercises: [
      { name: 'Жим гантелей сидя', scheme: '3 × 10', sets: 3, tip: 'Старт 8-10 кг × 2' },
      { name: 'Отжимания от пола / от колен', scheme: '3 × 12', sets: 3, tip: 'Тонус груди + кор без перекачки передней дельты', bodyweight: true, unit: 'раз' },
      { name: 'Тяга верхнего блока широким хватом', scheme: '3 × 12', sets: 3, tip: 'Плечи вниз, тяни к груди. Старт 25-35 кг' },
      { name: 'Тяга гантели в наклоне', scheme: '3 × 10 / сторону', sets: 3, tip: 'Спина параллельна полу. Старт 10-12 кг' },
      { name: 'Face pulls', scheme: '3 × 20', sets: 3, tip: '⭐ Тяни к лбу! В конце разводи кулаки — лопатки сводятся. Минимальный вес' },
      { name: 'Разводка в стороны', scheme: '3 × 15', sets: 3, tip: 'Локоть чуть согнут. Старт 3-5 кг' },
      { name: 'Мёртвый жук (Dead Bug)', scheme: '3 × 10 / сторону', sets: 3, tip: 'Поясница намертво к полу! Выдох на движении', bodyweight: true, unit: 'раз' },
      { name: 'Планка', scheme: '3 × 45 сек', sets: 3, tip: 'Дыши, не задерживай', bodyweight: true, unit: 'сек' },
    ]
  },
  'Кардио Чт': {
    subtitle: 'Горы + Жизнь',
    isCardio: true,
    exercises: [
      { name: 'Ходьба / горы Триберга', scheme: '30-60 мин · пульс 115-130', sets: 1, isCardio: true, fields: ['мин', 'км', 'пульс'] },
      { name: 'Растяжка', scheme: '10 мин', sets: 1, isCardio: true, fields: ['мин'] },
    ]
  },
  'День 3': {
    subtitle: 'Задняя линия + Плечи',
    exercises: [
      { name: 'Становая тяга сумо', scheme: '4 × 8', sets: 4, tip: '⭐ Королева упражнений! Спина прямая, колени над носками. Старт 40-50 кг' },
      { name: 'Сгибание ног в тренажёре', scheme: '3 × 15', sets: 3, tip: 'Разгрузка поясницы после становой' },
      { name: 'Сумо-приседания с гантелью', scheme: '3 × 12', sets: 3, tip: 'Старт 12-16 кг' },
      { name: 'Гиперэкстензия с весом', scheme: '3 × 15', sets: 3, tip: 'Скруглённая спина = акцент на ягодицы. Старт 5-10 кг' },
      { name: 'Тяга к подбородку широким хватом', scheme: '3 × 12', sets: 3, tip: 'Визуально сужает талию! Старт 15-20 кг' },
      { name: 'Махи гантелями в наклоне', scheme: '3 × 15', sets: 3, tip: 'Задняя дельта — исправляет сутулость. Старт 4-6 кг' },
      { name: 'Планка боковая', scheme: '3 × 30 сек / сторону', sets: 3, bodyweight: true, unit: 'сек' },
    ]
  },
  'Кардио Вс': {
    subtitle: 'Горы + Отдых',
    isCardio: true,
    exercises: [
      { name: 'Ходьба / горы Триберга', scheme: '30-60 мин · спокойный темп', sets: 1, isCardio: true, fields: ['мин', 'км', 'пульс'] },
      { name: 'Растяжка всего тела', scheme: '15 мин', sets: 1, isCardio: true, fields: ['мин'] },
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

// Main App Component
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([]);
  const [strengthRecords, setStrengthRecords] = useState<StrengthRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'strength' | 'weight' | 'tech'>('today');
  
  // Today's state
  const [currentDay, setCurrentDay] = useState('День 1');
  const [checkedExercises, setCheckedExercises] = useState<number[]>([]);
  const [currentSets, setCurrentSets] = useState<Record<number, any[][]>>({});
  const [currentNotes, setCurrentNotes] = useState<Record<number, string>>({});

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        syncUserProfile(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

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
      await setDoc(userRef, {
        displayName: currentUser.displayName || 'Анонимный пользователь',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        role: 'user'
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
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
      exercises: PROGRAM[currentDay].exercises.map((ex, i) => ({
        name: ex.name,
        sets: currentSets[i]?.map(s => ({ weight: Number(s[0]) || 0, reps: Number(s[1]) || 0 })) || []
      })),
      notes: Object.values(currentNotes).join('\n')
    };

    try {
      await addDoc(collection(db, 'workouts'), workoutToSave);
      
      // Reset state and move to next day
      const days = Object.keys(PROGRAM);
      const nextIdx = (days.indexOf(currentDay) + 1) % days.length;
      setCurrentDay(days[nextIdx]);
      setCheckedExercises([]);
      setCurrentSets({});
      setCurrentNotes({});
      
      alert('🎉 Тренировка завершена! Отличная работа!');
      setActiveTab('progress');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workouts');
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
    try {
      await deleteDoc(doc(db, 'workouts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workouts/${id}`);
    }
  };

  // Weight Logic
  const handleSaveWeight = async (data: Partial<WeightMeasurement>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'measurements'), {
        userId: user.uid,
        date: new Date().toISOString(),
        ...data
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'measurements');
    }
  };

  // Strength Logic
  const handleSaveStrength = async (data: Partial<StrengthRecord>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'strength'), {
        userId: user.uid,
        date: new Date().toISOString(),
        ...data
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'strength');
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
        workouts,
        measurements,
        strengthRecords
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack_backup_${format(new Date(), 'dd-MM-yyyy')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result as string);
        
        // Import workouts
        if (imported.workouts) {
          for (const w of imported.workouts) {
            const { id, ...data } = w;
            await addDoc(collection(db, 'workouts'), { ...data, userId: user.uid });
          }
        }
        
        // Import measurements
        if (imported.measurements) {
          for (const m of imported.measurements) {
            const { id, ...data } = m;
            await addDoc(collection(db, 'measurements'), { ...data, userId: user.uid });
          }
        }

        // Import strength
        if (imported.strengthRecords) {
          for (const s of imported.strengthRecords) {
            const { id, ...data } = s;
            await addDoc(collection(db, 'strength'), { ...data, userId: user.uid });
          }
        }

        alert('✓ Бэкап загружен! Данные импортированы в облако.');
      } catch (error) {
        console.error("Import failed:", error);
        alert('Ошибка при импорте данных.');
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
          className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl border border-border"
        >
          <div className="logo text-5xl mb-4 font-display font-bold text-accent">Таня <span className="text-accent-2">·</span> Тренировки</div>
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
      <header className="header p-8 border-b border-border sticky top-0 bg-bg/80 backdrop-blur-md z-40">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="logo text-2xl font-display font-bold text-accent">Таня <span className="text-accent-2">·</span> Тренировки</div>
            <div className="text-[10px] text-muted uppercase font-semibold tracking-[0.15em] mt-1">{weekLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-display font-bold text-accent leading-none">{streakWeeks}</div>
            <div className="text-[9px] text-muted uppercase font-semibold tracking-[0.15em]">недель подряд</div>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <NavTab active={activeTab === 'today'} onClick={() => setActiveTab('today')} label="Сегодня" />
          <NavTab active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} label="История" />
          <NavTab active={activeTab === 'strength'} onClick={() => setActiveTab('strength')} label="Веса" />
          <NavTab active={activeTab === 'weight'} onClick={() => setActiveTab('weight')} label="Замеры" />
          <NavTab active={activeTab === 'tech'} onClick={() => setActiveTab('tech')} label="Техника" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-6">
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
            />
          )}
          {activeTab === 'progress' && (
            <ProgressPage workouts={workouts} />
          )}
          {activeTab === 'strength' && (
            <StrengthPage records={strengthRecords} onSave={handleSaveStrength} />
          )}
          {activeTab === 'weight' && (
            <WeightPage 
              measurements={measurements} 
              onSave={handleSaveWeight} 
              onExport={handleExportData}
              onImport={handleImportData}
            />
          )}
          {activeTab === 'tech' && (
            <TechPage />
          )}
        </AnimatePresence>
      </main>

      {/* Logout Button (Floating or in Profile) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={handleLogout}
          className="w-14 h-14 bg-white border border-border rounded-2xl flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-all shadow-xl active:scale-90"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 min-w-[90px] py-2.5 px-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all shadow-sm ${
        active ? 'bg-accent text-white border-accent' : 'bg-white text-muted border-border hover:border-accent/30'
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
  workouts
}: any) {
  const program = PROGRAM[currentDay];
  const total = program.exercises.length;
  const done = checkedExercises.length;
  const pct = Math.round((done / total) * 100);

  const isCompletedToday = workouts.some((w: any) => w.day === currentDay && isSameDay(new Date(w.date), new Date()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {Object.keys(PROGRAM).map(day => (
          <button 
            key={day}
            onClick={() => setCurrentDay(day)}
            className={`flex-shrink-0 px-5 py-3 border rounded-2xl text-[11px] font-bold transition-all shadow-sm ${
              currentDay === day ? 'bg-accent text-white border-accent' : 'bg-white border-border text-muted hover:border-accent/30'
            }`}
          >
            {day}<br/>
            <span className={`text-[9px] ${currentDay === day ? 'text-white/80' : 'text-muted/70'}`}>{PROGRAM[day].subtitle}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3 bg-white p-5 rounded-3xl border border-border shadow-sm">
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
        {program.exercises.map((ex: any, idx: number) => (
          <ExerciseCard 
            key={idx}
            exercise={ex}
            index={idx}
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
                if (!updated[idx]) updated[idx] = Array(ex.sets).fill(null).map(() => ['', '']);
                updated[idx][sIdx][field] = val;
                return updated;
              });
            }}
            note={currentNotes[idx] || ''}
            onUpdateNote={(val: string) => setCurrentNotes((prev: any) => ({ ...prev, [idx]: val }))}
          />
        ))}
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

function ExerciseCard({ exercise, index, isChecked, onCheck, sets, onUpdateSet, note, onUpdateNote }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`bg-white border-2 rounded-3xl overflow-hidden transition-all shadow-sm ${isChecked ? 'border-done bg-done/5' : 'border-border'}`}>
      <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className={`font-display text-2xl w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isChecked ? 'bg-done text-white' : 'bg-surface-2 text-muted'}`}>
          {index + 1}
        </div>
        <div className="flex-1">
          <div className={`text-[14px] font-bold ${isChecked ? 'text-done line-through opacity-60' : 'text-text'}`}>{exercise.name}</div>
          <div className="text-[10px] text-accent-2 font-bold uppercase tracking-wider">{exercise.scheme}</div>
          {exercise.tip && <div className="text-[9px] text-muted mt-1 italic">💡 {exercise.tip}</div>}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onCheck(); }}
          className={`w-9 h-9 border-2 rounded-2xl flex items-center justify-center transition-all ${isChecked ? 'bg-done border-done text-white shadow-lg' : 'border-border text-transparent bg-white hover:border-accent/30'}`}
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
                    {exercise.isCardio ? (
                      <div className="flex gap-2">
                        {exercise.fields.map((f: string, fi: number) => (
                          <div key={fi} className="flex flex-col items-center">
                            <input 
                              type="number" 
                              className="w-12 bg-white border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all"
                              value={sets[fi] || ''}
                              onChange={(e) => onUpdateSet(fi, 0, e.target.value)}
                            />
                            <span className="text-[8px] text-muted font-bold mt-1 uppercase">{f}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <input 
                          type="number" 
                          className="w-12 bg-white border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all"
                          placeholder={exercise.bodyweight ? "раз" : "кг"}
                          value={sets[sIdx]?.[0] || ''}
                          onChange={(e) => onUpdateSet(sIdx, 0, e.target.value)}
                        />
                        {!exercise.bodyweight && (
                          <>
                            <span className="text-accent font-bold text-sm">×</span>
                            <input 
                              type="number" 
                              className="w-12 bg-white border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all"
                              placeholder="раз"
                              value={sets[sIdx]?.[1] || ''}
                              onChange={(e) => onUpdateSet(sIdx, 1, e.target.value)}
                            />
                          </>
                        )}
                        <span className="text-muted font-bold text-[10px] ml-1 uppercase">{exercise.unit || (exercise.bodyweight ? 'раз' : 'кг')}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <textarea 
                className="w-full bg-surface-2/50 border-2 border-border rounded-2xl p-3 text-[12px] text-text focus:border-accent outline-none h-16 resize-none transition-all"
                placeholder="Твои мысли, ощущения, победы..."
                value={note}
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

function ProgressPage({ workouts }: { workouts: Workout[] }) {
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="grid grid-cols-3 gap-2">
        <StatItem value={stats.total} label="тренировок" />
        <StatItem value={stats.thisMonth} label="в этом месяце" />
        <StatItem value={stats.best} label="лучшая серия" />
      </div>

      <div className="space-y-6">
        <h3 className="font-display text-2xl text-accent font-bold">История тренировок</h3>
        {workouts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">
            Пока нет завершённых тренировок. <br/>Пора это исправить! 💪
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map(w => (
              <div key={w.id} className="bg-white border-2 border-border rounded-3xl p-5 flex justify-between items-center shadow-sm hover:border-accent/30 transition-all">
                <div>
                  <div className="text-[11px] text-muted font-bold uppercase tracking-wider mb-1">
                    {format(parseISO(w.date), 'd MMMM · HH:mm', { locale: ru })}
                  </div>
                  <div className="text-[15px] font-bold text-text">
                    {w.day} — {PROGRAM[w.day]?.subtitle}
                  </div>
                </div>
                <div className="text-[10px] px-4 py-1.5 rounded-full bg-done/10 text-done border-2 border-done/20 font-bold uppercase tracking-wider">
                  ✓ готово
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white border-2 border-border rounded-3xl p-5 text-center shadow-sm">
      <div className="font-display text-4xl text-accent font-bold leading-none mb-2">{value}</div>
      <div className="text-[10px] text-muted uppercase font-bold tracking-wider">{label}</div>
    </div>
  );
}

function StrengthPage({ records, onSave }: { records: StrengthRecord[]; onSave: (data: any) => void }) {
  const [exercise, setExercise] = useState('Ягодичный мостик со штангой');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="bg-white border-2 border-border rounded-[32px] p-6 space-y-6 shadow-sm">
        <h3 className="font-display text-2xl text-accent font-bold">Записать вес</h3>
        <div className="space-y-4">
          <select 
            className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-[13px] font-bold outline-none focus:border-accent transition-all appearance-none"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            {Object.entries(PROGRAM).map(([day, p]) => (
              <optgroup key={day} label={`${day} — ${p.subtitle}`}>
                {p.exercises.filter(ex => !ex.isCardio && !ex.bodyweight).map(ex => (
                  <option key={ex.name} value={ex.name}>{ex.name}</option>
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
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Повторы</label>
              <input 
                type="number" 
                className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
                value={reps}
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
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">Нет записей. Фиксируй веса после тренировки! 🏋️‍♀️</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byExercise).map(([name, entries]) => {
              const strengthEntries = entries as StrengthRecord[];
              const latest = strengthEntries[0];
              const best = strengthEntries.reduce((max, e) => e.weight > max.weight ? e : max, strengthEntries[0]);
              const prev = strengthEntries[1];
              const trend = prev ? (latest.weight > prev.weight ? '↑' : latest.weight < prev.weight ? '↓' : '→') : '—';
              
              return (
                <div key={name} className="bg-white border-2 border-border rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="text-[14px] font-bold text-text flex-1">{name}</div>
                    <div className={`text-2xl font-bold ${trend === '↑' ? 'text-done' : trend === '↓' ? 'text-accent' : 'text-muted'}`}>{trend}</div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WeightPage({ 
  measurements, 
  onSave,
  onExport,
  onImport
}: { 
  measurements: WeightMeasurement[]; 
  onSave: (data: any) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [water, setWater] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!weight) return;
    onSave({ 
      weight: Number(weight), 
      fat: fat ? Number(fat) : undefined, 
      muscle: muscle ? Number(muscle) : undefined, 
      water: water ? Number(water) : undefined 
    });
    setWeight('');
    setFat('');
    setMuscle('');
    setWater('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="bg-white border-2 border-border rounded-[32px] p-6 space-y-6 shadow-sm">
        <h3 className="font-display text-2xl text-accent font-bold">Новый замер</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Вес (кг)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Жир (%)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Мышцы (%)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Вода (%)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={water}
              onChange={(e) => setWater(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-accent hover:bg-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
        >
          Сохранить замер
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-2xl text-accent font-bold">Динамика</h3>
          <div className="flex gap-2">
            <button 
              onClick={onExport}
              className="text-[10px] text-accent border-2 border-accent/20 px-3 py-1.5 rounded-xl hover:bg-accent/5 transition-all font-bold uppercase tracking-tight"
            >
              Экспорт
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-accent border-2 border-accent/20 px-3 py-1.5 rounded-xl hover:bg-accent/5 transition-all font-bold uppercase tracking-tight"
            >
              Импорт
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={onImport}
              className="hidden"
              accept=".json"
            />
          </div>
        </div>
        {measurements.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">Нет записей. Добавь первый! 📏</div>
        ) : (
          <div className="space-y-3">
            {measurements.map(m => (
              <div key={m.id} className="flex justify-between items-center p-5 bg-white border-2 border-border rounded-3xl shadow-sm hover:border-accent/30 transition-all">
                <span className="text-muted text-[11px] font-bold uppercase tracking-wider">{format(parseISO(m.date), 'd MMM', { locale: ru })}</span>
                <span className="text-accent text-xl font-display font-bold">{m.weight} кг</span>
                <span className="text-muted text-[10px] font-bold uppercase">
                  {m.fat ? `${m.fat}% жир` : ''} {m.muscle ? `· ${m.muscle}% мышцы` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TechPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-serif text-xl text-accent font-light">Памятка по технике</h3>
        <p className="text-[10px] text-muted uppercase tracking-wider">Финальная версия · одобрено куратором 😄</p>
      </div>

      <div className="bg-accent/5 border border-accent/30 rounded-sm p-4 space-y-3">
        <h4 className="font-serif text-lg text-accent">⚡ Важные предупреждения</h4>
        <div className="text-[11px] text-text leading-relaxed space-y-2">
          <p>🍑 <strong className="text-accent-2">Мостик (Пн):</strong> Старт 30-40 кг — ок. Через 2 недели цель 50-60 кг. Должна гореть <span className="text-accent">попа, не поясница.</span></p>
          <p>⚠️ <strong className="text-accent-2">Румынская тяга vs Становая:</strong> В Пн — акцент на растяжение, НЕ гонись за весом. Битва за вес — в Сб на становой.</p>
          <p>💪 <strong className="text-accent-2">Отжимания:</strong> Если 12 раз от колен стало легко — сразу переходи на классику.</p>
        </div>
      </div>

      <TechCard 
        title="Ягодичный мостик со штангой" 
        subtitle="Главное упражнение программы"
        points={[
          "Штанга — на бёдрах, поролоновая накладка обязательна.",
          "Стопы — на ширине плеч, пятки под коленями.",
          "Пауза — 2 сек наверху, сжимай ягодицы максимально.",
          "Не прогибай поясницу наверху — таз толкай вперёд, рёбра вниз."
        ]}
      />

      <TechCard 
        title="Болгарские сплит-приседания" 
        subtitle="Акцент: Ягодицы, не квадрицепс"
        points={[
          "Наклон корпуса — вперёд 30–45°. Спина прямая.",
          "Голень — почти вертикальная. Колено не за носок.",
          "Толчок — строго в пятку.",
          "Задняя нога — просто для равновесия. Не толкайся!"
        ]}
      />

      <TechCard 
        title="Становая тяга сумо" 
        subtitle="Королева упражнений · Старт 40-50 кг"
        points={[
          "Стойка — широкая, носки развёрнуты наружу 45°.",
          "Спина — нейтральная, НИКАКОГО округления!",
          "Начало — отталкивай пол ногами, не тяни спиной.",
          "Наверху — бёдра вперёд, сжимай ягодицы."
        ]}
      />
    </motion.div>
  );
}

function TechCard({ title, subtitle, points }: { title: string; subtitle: string; points: string[] }) {
  return (
    <div className="bg-white border-2 border-border border-l-8 border-l-accent rounded-3xl p-6 space-y-3 shadow-sm">
      <h4 className="font-display text-xl text-accent font-bold">{title}</h4>
      <p className="text-[10px] text-accent-2 uppercase font-bold tracking-widest">{subtitle}</p>
      <ul className="text-[12px] text-text leading-relaxed space-y-2">
        {points.map((p, i) => <li key={i} className="flex gap-2">
          <span className="text-accent">✦</span>
          <span>{p}</span>
        </li>)}
      </ul>
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
