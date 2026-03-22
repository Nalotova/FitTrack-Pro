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
  AlertTriangle,
  Bot,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Camera,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
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
  age?: number;
  fat?: number;
  muscle?: number;
  water?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([]);
  const [strengthRecords, setStrengthRecords] = useState<StrengthRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'strength' | 'tech' | 'coach' | 'profile'>('today');
  const [coachMessages, setCoachMessages] = useState<any[]>([]);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  
  // Today's state
  const [currentDay, setCurrentDay] = useState('День 1');
  const [checkedExercises, setCheckedExercises] = useState<number[]>([]);
  const [currentSets, setCurrentSets] = useState<Record<number, any[][]>>({});
  const [currentNotes, setCurrentNotes] = useState<Record<number, string>>({});

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
      } else {
        syncUserProfile(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // Profile Listener
  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserProfile);
      }
      setLoading(false);
    });
    return () => unsubProfile();
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
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          displayName: currentUser.displayName || 'Анонимный пользователь',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          role: 'user',
          createdAt: new Date().toISOString()
        });
      } else {
        // Just update email if it changed, but don't touch displayName/photoURL
        await setDoc(userRef, {
          email: currentUser.email || ''
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      // Removed alert for better mobile/iframe compatibility
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

  const handleUpdateWorkout = async (id: string, data: Partial<Workout>) => {
    try {
      await setDoc(doc(db, 'workouts', id), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workouts/${id}`);
    }
  };

  const handleDeleteStrength = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
    try {
      await deleteDoc(doc(db, 'strength', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `strength/${id}`);
    }
  };

  const handleUpdateStrength = async (id: string, data: Partial<StrengthRecord>) => {
    try {
      await setDoc(doc(db, 'strength', id), data, { merge: true });
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
      alert('Ошибка при экспорте данных.');
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
          await handleUpdateProfile(imported.profile);
          count++;
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
            
            if (w.sets && !w.exercises && w.day && (PROGRAM as any)[w.day]) {
              const program = (PROGRAM as any)[w.day];
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

            await addDoc(collection(db, 'workouts'), workoutToSave);
            count++;
          }
        }
        
        // Import measurements
        if (measurementsToImport.length > 0) {
          for (const m of measurementsToImport) {
            const { id, ...data } = m;
            await addDoc(collection(db, 'measurements'), { ...data, userId: user.uid });
            count++;
          }
        }

        // Import strength
        if (strengthToImport.length > 0) {
          for (const s of strengthToImport) {
            const { id, ...data } = s;
            await addDoc(collection(db, 'strength'), { ...data, userId: user.uid });
            count++;
          }
        }

        if (count > 0) {
          alert(`✓ Импорт завершен! Загружено записей: ${count}`);
        } else {
          alert('⚠ Файл распознан, но данных для импорта не найдено. Проверьте структуру JSON.');
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert('Ошибка при импорте данных. Убедитесь, что файл имеет формат JSON.');
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
      <header className="header p-8 border-b border-border sticky top-0 bg-bg/80 backdrop-blur-md z-40">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden cursor-pointer"
              onClick={() => setActiveTab('profile')}
            >
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
            <div>
              <div className="logo text-xl font-display font-bold text-accent leading-none">
                {userProfile?.displayName || 'Таня'} <span className="text-accent-2">·</span> Тренировки
              </div>
              <div className="text-[10px] text-muted uppercase font-semibold tracking-[0.15em] mt-1">{weekLabel}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-display font-bold text-accent leading-none">{streakWeeks}</div>
            <div className="text-[9px] text-muted uppercase font-semibold tracking-[0.15em]">недель подряд</div>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <NavTab active={activeTab === 'today'} onClick={() => setActiveTab('today')} label="Сегодня" />
          <NavTab active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} label="ИИ Тренер" />
          <NavTab active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} label="История" />
          <NavTab active={activeTab === 'strength'} onClick={() => setActiveTab('strength')} label="Веса" />
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
          {activeTab === 'coach' && (
            <CoachPage 
              workouts={workouts} 
              measurements={measurements} 
              strengthRecords={strengthRecords}
              messages={coachMessages}
              setMessages={setCoachMessages}
              isLoading={isCoachLoading}
              setIsLoading={setIsCoachLoading}
            />
          )}
          {activeTab === 'progress' && (
            <ProgressPage 
              workouts={workouts} 
              onDelete={handleDeleteWorkout}
              onUpdate={handleUpdateWorkout}
            />
          )}
          {activeTab === 'strength' && (
            <StrengthPage 
              records={strengthRecords} 
              onSave={handleSaveStrength}
              onDelete={handleDeleteStrength}
              onUpdate={handleUpdateStrength}
            />
          )}
          {activeTab === 'tech' && (
            <TechPage />
          )}
          {activeTab === 'profile' && (
            <ProfilePage 
              profile={userProfile} 
              onUpdate={handleUpdateProfile} 
              onLogout={handleLogout}
              measurements={measurements}
              onSaveWeight={handleSaveWeight}
              onExportData={handleExportData}
              onImportData={handleImportData}
            />
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

// --- COACH PAGE ---

function CoachPage({ 
  workouts, 
  measurements, 
  strengthRecords,
  messages,
  setMessages,
  isLoading,
  setIsLoading
}: any) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.GEMINI_API_KEY || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 process.env.GEMINI_API_KEY_2 || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY_2;
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    if ((!textToSend.trim() && images.length === 0) || isLoading) return;

    const userMsg: any = { role: 'user', content: textToSend };
    if (images.length > 0) userMsg.images = images;

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setImages([]);
    setIsLoading(true);

    try {
      const currentApiKey = process.env.GEMINI_API_KEY || 
                           (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                           process.env.GEMINI_API_KEY_2 || 
                           (import.meta as any).env?.VITE_GEMINI_API_KEY_2;
      
      if (!currentApiKey) {
        throw new Error("API key is missing");
      }
      
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      
      const parts: any[] = [
        { text: `Ты — экспертный ИИ-фитнес-тренер. Твоя задача — проводить объективный и конструктивный анализ данных пользователя.
        
        ПРАВИЛА ОТВЕТА (КРИТИЧЕСКИ ВАЖНО):
        1. ЧИТАБЕЛЬНОСТЬ: Обязательно используй ПУСТЫЕ СТРОКИ между разделами и пунктами.
        2. СТРУКТУРА: Используй четкие заголовки (### Название раздела).
        3. ЛАКОНИЧНОСТЬ: Минимум вводных слов, только факты и цифры.
        4. ОФОРМЛЕНИЕ: Не выделяй жирным всё подряд. Только ключевые цифры или термины.
        5. ОБЪЕКТИВНОСТЬ: Опирайся строго на предоставленные переменные.
        
        ПЕРЕМЕННЫЕ ПОЛЬЗОВАТЕЛЯ:
        - ТРЕНИРОВКИ (workouts): ${JSON.stringify(workouts.slice(-10))}
        - ЗАМЕРЫ (measurements): ${JSON.stringify(measurements.slice(-10))} (вес, возраст, параметры)
        - СИЛОВЫЕ РЕКОРДЫ (strengthRecords): ${JSON.stringify(strengthRecords)}
        
        ПРИОРИТЕТЫ АНАЛИЗА:
        1. ВОЗРАСТ (из замеров): Адаптация нагрузок и восстановления.
        2. КОМПЛЕКЦИЯ: Вес, % жира, замеры.
        3. ПРОГРЕССИЯ: Сравнение последних тренировок.
        
        История чата:
        ${messages.map((m: any) => `${m.role === 'user' ? 'Пользователь' : 'Тренер'}: ${m.content}`).join('\n')}
        
        Новое сообщение пользователя: ${textToSend}` }
      ];

      if (images.length > 0) {
        images.forEach(img => {
          parts.push({
            inlineData: {
              data: img.split(',')[1],
              mimeType: "image/jpeg"
            }
          });
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: "Ты — профессиональный ИИ-фитнес-тренер. Твой стиль: объективный, конструктивный, лаконичный. ФОРМАТИРОВАНИЕ: Обязательно разделяй блоки текста ПУСТЫМИ СТРОКАМИ. Используй заголовки ### для разделов. Избегай сплошного текста и избыточного выделения жирным. СОДЕРЖАНИЕ: Анализируй только предоставленные данные. Если данных (возраст, вес) не хватает для точного совета — укажи на это. Не называй себя никаким именем.",
        }
      });

      const aiMsg = { role: 'assistant', content: response.text || "Извини, я не смогла сформулировать ответ. Попробуй еще раз! 🧘‍♀️" };
      setMessages([...newMessages, aiMsg]);
    } catch (error: any) {
      console.error("Coach error details:", error);
      const errorMessage = error?.message?.includes("API key") 
        ? "Ошибка: API ключ не найден. Пожалуйста, проверьте настройки. 🧘‍♀️"
        : "Извини, произошла ошибка при связи с ИИ. Попробуй еще раз позже или проверь интернет-соединение. 🧘‍♀️";
      
      setMessages([...newMessages, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex flex-col h-[600px] max-h-[70vh] md:h-[calc(100vh-280px)]"
    >
      <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <Bot size={28} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-accent">Твой ИИ Тренер</h2>
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
              onClick={() => setShowClearConfirm(!showClearConfirm)}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl border border-red-100 transition-all"
              title="Очистить чат"
            >
              <Trash2 size={16} />
            </button>
            {showClearConfirm && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-text mb-3">Очистить историю?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setMessages([]);
                      setShowClearConfirm(false);
                    }}
                    className="flex-1 py-2 bg-red-500 text-white text-[10px] font-bold uppercase rounded-lg"
                  >
                    Да
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2 bg-surface-2 text-text text-[10px] font-bold uppercase rounded-lg"
                  >
                    Нет
                  </button>
                </div>
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
        {messages.map((m: any, i: number) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-accent text-white rounded-tr-none' 
                : 'bg-white border border-border text-text rounded-tl-none'
            }`}>
              {m.images && m.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {m.images.map((img: string, imgIdx: number) => (
                    <img key={imgIdx} src={img} alt="Uploaded" className="w-full h-32 object-cover rounded-2xl border border-white/20" />
                  ))}
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-border p-4 rounded-3xl rounded-tl-none flex gap-1">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
            </div>
          </div>
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
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спроси тренера или прикрепи фото..."
            className="w-full py-4 pl-14 pr-16 bg-white border-2 border-border rounded-2xl focus:border-accent focus:outline-none transition-all shadow-sm font-medium"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-all"
          >
            <Camera size={24} />
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
  measurements,
  onSaveWeight,
  onExportData,
  onImportData
}: { 
  profile: UserProfile | null; 
  onUpdate: (data: any) => Promise<void>; 
  onLogout: () => void;
  measurements: WeightMeasurement[];
  onSaveWeight: (data: any) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [name, setName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.displayName && !name) {
      setName(profile.displayName);
    }
  }, [profile?.displayName]);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSaving(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 400; // Profile pics can be smaller
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
          onUpdate({ photoURL: canvas.toDataURL('image/jpeg', 0.8) }).finally(() => {
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ displayName: name });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8 pb-12">
      <div className="bg-white p-8 rounded-[40px] border border-border shadow-sm text-center relative">
        <div 
          onClick={() => profileFileInputRef.current?.click()}
          className="group w-24 h-24 bg-accent/10 rounded-[32px] flex items-center justify-center text-accent mx-auto mb-6 overflow-hidden border-2 border-accent/20 cursor-pointer relative"
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={48} />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Camera size={20} />
          </div>
        </div>
        <input 
          type="file" 
          ref={profileFileInputRef}
          onChange={handleProfileImageUpload}
          accept="image/*"
          className="hidden"
        />
        <h2 className="text-2xl font-display font-bold text-accent mb-2">Настройки профиля</h2>
        <p className="text-sm text-muted mb-8">Персонализируй приложение под себя ✨</p>

        <div className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-4">Твоё имя</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как тебя называть?"
              className="w-full py-4 px-6 bg-surface-2/50 border-2 border-border rounded-2xl focus:border-accent outline-none transition-all font-medium"
            />
          </div>

          <button 
            onClick={handleSaveName}
            disabled={isSaving}
            className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Settings size={20} />
              </motion.div>
            ) : (
              <Save size={20} />
            )}
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>

          <AnimatePresence>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-emerald-500 text-xs font-bold"
              >
                ✅ Профиль успешно обновлен!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            <Scale size={20} />
          </div>
          <h3 className="text-xl font-display font-bold text-accent">Твои замеры</h3>
        </div>
        
        <WeightPage 
          measurements={measurements} 
          onSave={onSaveWeight} 
          onExportData={onExportData}
          onImportData={onImportData}
        />
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <LogOut size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-text">Выйти из аккаунта</div>
              <div className="text-[10px] text-muted uppercase font-bold tracking-wider">{profile?.email}</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="px-4 py-2 border-2 border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-red-50 transition-all"
          >
            Выйти
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
                if (!updated[idx]) {
                  const fieldCount = ex.isCardio ? (ex.fields?.length || 1) : 2;
                  updated[idx] = Array(ex.sets).fill(null).map(() => Array(fieldCount).fill(''));
                }
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
                              step="any"
                              className="w-12 bg-white border-2 border-border text-center text-sm p-2 rounded-xl focus:border-accent outline-none transition-all"
                              value={sets[0]?.[fi] || ''}
                              onChange={(e) => onUpdateSet(0, fi, e.target.value)}
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

function ProgressPage({ workouts, onDelete, onUpdate }: { workouts: Workout[]; onDelete: (id: string) => void; onUpdate: (id: string, data: any) => void }) {
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
    onUpdate(editingId, { date: new Date(editDate).toISOString(), day: editDay });
    setEditingId(null);
  };

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
              <div key={w.id} className="bg-white border-2 border-border rounded-3xl p-5 shadow-sm hover:border-accent/30 transition-all">
                {editingId === w.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-surface-2 border-2 border-border p-2 rounded-xl text-xs font-bold"
                      />
                      <select 
                        value={editDay}
                        onChange={(e) => setEditDay(e.target.value)}
                        className="w-full bg-surface-2 border-2 border-border p-2 rounded-xl text-xs font-bold"
                      >
                        {Object.keys(PROGRAM).map(day => (
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
                        {w.day} — {PROGRAM[w.day]?.subtitle}
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

function StrengthPage({ records, onSave, onDelete, onUpdate }: { records: StrengthRecord[]; onSave: (data: any) => void; onDelete: (id: string) => void; onUpdate: (id: string, data: any) => void }) {
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
              const sortedEntries = [...strengthEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const latest = sortedEntries[0];
              const best = sortedEntries.reduce((max, e) => e.weight > max.weight ? e : max, sortedEntries[0]);
              
              return (
                <div key={name} className="bg-white border-2 border-border rounded-3xl p-6 space-y-4 shadow-sm">
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
                    {sortedEntries.map(entry => (
                      <div key={entry.id} className="flex justify-between items-center text-[12px] py-1">
                        {editingId === entry.id ? (
                          <div className="flex-1 flex gap-2 items-center">
                            <input 
                              type="number" 
                              value={editWeight}
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="w-16 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                            />
                            <span className="text-muted">кг x</span>
                            <input 
                              type="number" 
                              value={editReps}
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
                      </div>
                    ))}
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
  onExportData,
  onImportData
}: { 
  measurements: WeightMeasurement[]; 
  onSave: (data: any) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [water, setWater] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [bicep, setBicep] = useState('');
  const [thigh, setThigh] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!weight) return;
    onSave({ 
      weight: Number(weight), 
      age: age ? Number(age) : undefined,
      fat: fat ? Number(fat) : undefined, 
      muscle: muscle ? Number(muscle) : undefined, 
      water: water ? Number(water) : undefined,
      chest: chest ? Number(chest) : undefined,
      waist: waist ? Number(waist) : undefined,
      hips: hips ? Number(hips) : undefined,
      bicep: bicep ? Number(bicep) : undefined,
      thigh: thigh ? Number(thigh) : undefined
    });
    setWeight('');
    setAge('');
    setFat('');
    setMuscle('');
    setWater('');
    setChest('');
    setWaist('');
    setHips('');
    setBicep('');
    setThigh('');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest">Новый замер</h4>
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
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Возраст</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={age}
              onChange={(e) => setAge(e.target.value)}
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Грудь (см)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Талия (см)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Бёдра (см)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={hips}
              onChange={(e) => setHips(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Бицепс (см)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={bicep}
              onChange={(e) => setBicep(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">Бедро (см)</label>
            <input 
              type="number" 
              className="w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all"
              value={thigh}
              onChange={(e) => setThigh(e.target.value)}
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

      <div className="bg-accent/5 border-2 border-accent/10 rounded-[32px] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-[11px] text-accent uppercase font-bold tracking-widest">Резервное копирование</h4>
            <p className="text-[9px] text-muted font-medium mt-1 uppercase">Экспорт и импорт всех данных (тренировки, замеры, веса)</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onExportData}
              className="text-[10px] bg-white text-accent border-2 border-accent/20 px-4 py-2 rounded-xl hover:bg-accent/5 transition-all font-bold uppercase tracking-tight shadow-sm"
            >
              Экспорт
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] bg-white text-accent border-2 border-accent/20 px-4 py-2 rounded-xl hover:bg-accent/5 transition-all font-bold uppercase tracking-tight shadow-sm"
            >
              Импорт
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={onImportData}
              className="hidden"
              accept=".json"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest px-1">История замеров</h4>
        {measurements.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-border text-muted text-sm font-medium">Нет записей. Добавь первый! 📏</div>
        ) : (
          <div className="space-y-3">
            {measurements.map(m => (
              <div key={m.id} className="p-5 bg-surface-2/50 border-2 border-border rounded-3xl shadow-sm hover:border-accent/30 transition-all space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted text-[11px] font-bold uppercase tracking-wider">{format(parseISO(m.date), 'd MMM yyyy', { locale: ru })}</span>
                  <div className="text-right">
                    <div className="text-accent text-xl font-display font-bold">{m.weight} кг</div>
                    {m.age && <div className="text-[10px] text-muted font-bold uppercase">{m.age} лет</div>}
                  </div>
                </div>
                {(m.chest || m.waist || m.hips || m.bicep || m.thigh) && (
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted font-bold uppercase">
                    {m.chest && <span>Грудь: {m.chest}</span>}
                    {m.waist && <span>Талия: {m.waist}</span>}
                    {m.hips && <span>Бёдра: {m.hips}</span>}
                    {m.bicep && <span>Бицепс: {m.bicep}</span>}
                    {m.thigh && <span>Бедро: {m.thigh}</span>}
                  </div>
                )}
                <div className="text-[10px] text-muted font-bold uppercase opacity-60">
                  {m.fat ? `${m.fat}% жир` : ''} {m.muscle ? `· ${m.muscle}% мышцы` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
