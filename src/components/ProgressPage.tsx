import { calculateExerciseGoal } from '../utils';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { User } from "../firebase";
import { StatItem } from "./StatItem";
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function ProgressPage({ 
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

  const strengthByExercise = useMemo(() => {
    const groups: Record<string, StrengthRecord[]> = {};
    strengthRecords.forEach(r => {
      // Filter out cardio exercises from progress cards
      if (r.isCardio) return;
      
      // Double check by looking at program data if isCardio flag is missing (for older records)
      const isCardioInProgram = Object.values(programData || {}).some((day: any) => 
        day.exercises?.some((ex: any) => ex.name === r.exercise && (ex.isCardio || day.isCardio))
      );
      if (isCardioInProgram) return;

      if (!groups[r.exercise]) groups[r.exercise] = [];
      groups[r.exercise].push(r);
    });
    return groups;
  }, [strengthRecords, programData]);

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
      if (workouts.length < 4) return [];
      const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstWorkoutDate = new Date(sortedWorkouts[0].date);
      
      let weeksDiff = Math.ceil((now.getTime() - firstWorkoutDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      if (weeksDiff < 2) weeksDiff = 2; // Show at least 2 points for a line
      if (weeksDiff > 8) weeksDiff = 8;
      
      for (let i = weeksDiff - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        }).length;
        data.push({ 
          name: format(weekStart, 'd MMM', { locale: ru }), 
          count,
          isActive: count >= 2
        });
      }
    } else if (activityPeriod === '6m') {
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        }).length;
        data.push({ name: format(monthStart, 'MMM', { locale: ru }), count, isActive: count >= 4 });
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
        data.push({ name: format(mStart, 'MMM', { locale: ru }), count, isActive: count >= 4 });
        // Add one month
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }
    return data;
  }, [workouts, activityPeriod]);

  const cardioStats = useMemo(() => {
    let totalMinutes = 0;
    let totalCalories = 0;
    
    // Get latest weight from measurements
    const latestWeight = measurements && measurements.length > 0 
      ? [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].weight || 70
      : 70;
    
    const age = Number(userProfile?.age) || 30;
    const gender = userProfile?.gender || 'male';

    workouts.forEach(w => {
      if (!w.exercises) return;
      w.exercises.forEach(ex => {
        // Check if it's cardio (either by flag or by checking program data for old records)
        const isCardio = ex.isCardio || Object.values(programData || {}).some((day: any) => 
          day.exercises?.some((pEx: any) => pEx.name === ex.name && (pEx.isCardio || day.isCardio))
        );

        if (isCardio) {
          ex.sets?.forEach(set => {
            const values = set.cardioValues || [set.weight, set.reps];
            const fields = ex.fields || ["мин", "пульс"];
            
            const minIdx = fields.indexOf("мин");
            const pulseIdx = fields.indexOf("пульс");
            const kcalIdx = fields.indexOf("ккал");
            
            const mins = minIdx !== -1 ? (Number(values[minIdx]) || 0) : 0;
            const pulse = pulseIdx !== -1 ? (Number(values[pulseIdx]) || 0) : 0;
            const manualKcal = kcalIdx !== -1 ? (Number(values[kcalIdx]) || 0) : 0;
            
            totalMinutes += mins;
            
            let setKcal = 0;
            if (manualKcal > 0) {
              setKcal = manualKcal;
            } else if (mins > 0 && pulse > 0) {
              // Formula based on heart rate (Keytel et al. 2005)
              if (gender === 'female') {
                setKcal = ((-20.4022 + (0.4472 * pulse) - (0.1263 * latestWeight) + (0.074 * age)) / 4.184) * mins;
              } else {
                setKcal = ((-55.0969 + (0.6309 * pulse) + (0.1988 * latestWeight) + (0.2017 * age)) / 4.184) * mins;
              }
            } else if (mins > 0) {
              // Formula based on MET (average 7.5 for general cardio)
              setKcal = 0.0175 * 7.5 * latestWeight * mins;
            }
            
            totalCalories += Math.max(0, setKcal);
          });
        }
      });
    });
    
    const fatBurned = totalCalories / 7700;
    const progressPct = (totalCalories % 7700) / 7700 * 100;
    
    return {
      totalMinutes,
      totalCalories: Math.round(totalCalories),
      fatBurned: fatBurned.toFixed(2),
      progressPct
    };
  }, [workouts, measurements, userProfile]);

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

            {/* Activity Chart or Motivational Card */}
            {workouts.length < 4 ? (
              <div className="bg-gradient-to-br from-surface to-surface-2 border-2 border-accent/20 rounded-3xl p-6 shadow-sm text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="text-accent w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-text mb-2">Начало положено!</h4>
                <p className="text-muted text-sm mb-4">
                  Сделай еще {4 - workouts.length} {4 - workouts.length === 1 ? 'тренировку' : 'тренировки'}, чтобы разблокировать график твоей активности и следить за прогрессом.
                </p>
                <div className="w-full bg-bg rounded-full h-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(workouts.length / 4) * 100}%` }}
                    className="h-full bg-accent"
                  />
                </div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-2">{workouts.length} из 4</p>
              </div>
            ) : (
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
                  className="h-[140px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-muted)' }} 
                        dy={10}
                      />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-surface-2)', opacity: 0.5 }}
                        contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '2px solid var(--color-border)', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: 'var(--color-accent)' }}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      >
                        {activityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isActive ? 'var(--color-accent)' : 'var(--color-border)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
                <div className="mt-4 text-center">
                  <p className="text-xs font-bold text-accent-2 bg-accent-2/10 inline-block px-3 py-1.5 rounded-xl">
                    {(() => {
                      if (activityData.length < 2) return "Отличное начало! Первый шаг сделан ✨";
                      const last = activityData[activityData.length - 1].count;
                      const prev = activityData[activityData.length - 2].count;
                      if (last > prev) return "Ты в ритме! Лучшие 2 недели подряд 🔥";
                      if (last < prev) return "На прошлой неделе было тише — вернёмся в ритм? 💙";
                      return "Стабильность — основа прогресса ✓";
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Cardio Progress Card */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-4 bg-accent rounded-full" />
                <h4 className="text-[11px] text-muted uppercase font-bold tracking-[0.2em]">Кардио прогресс</h4>
              </div>
              <div className="bg-surface border-2 border-border rounded-[32px] p-6 shadow-sm overflow-hidden relative">
                <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                  <div className="text-center">
                    <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Время</div>
                    <div className="text-xl font-display font-bold text-text">
                      {(cardioStats.totalMinutes / 60).toFixed(1)} <span className="text-[10px]">ч</span>
                    </div>
                  </div>
                  <div className="text-center border-x border-border/50">
                    <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Энергия</div>
                    <div className="text-xl font-display font-bold text-accent">{cardioStats.totalCalories} <span className="text-[10px]">ккал</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Жиросжигание</div>
                    <div className="text-xl font-display font-bold text-done">{cardioStats.fatBurned} <span className="text-[10px]">кг</span></div>
                  </div>
                </div>
                
                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-end">
                    <div className="text-[9px] text-muted font-bold uppercase tracking-widest">Прогресс до -1 кг жира</div>
                    <div className="text-[11px] font-mono font-bold text-accent">{Math.round(cardioStats.progressPct)}%</div>
                  </div>
                  <div className="h-3 bg-surface-2 rounded-full overflow-hidden p-[2px] border border-border/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cardioStats.progressPct}%` }}
                      className="h-full bg-gradient-to-r from-accent to-accent-2 rounded-full shadow-[0_0_10px_rgba(244,114,182,0.3)]"
                    />
                  </div>
                </div>
                
                {/* Decorative background element */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
                  <Activity size={120} />
                </div>
              </div>
            </div>

            {/* Strength Cards */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-4 bg-accent-2 rounded-full" />
                <h4 className="text-[11px] text-muted uppercase font-bold tracking-[0.2em]">Силовой прогресс</h4>
              </div>
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
                      <div className="flex justify-between items-center">
                        <h4 className="text-[14px] font-bold text-text">{name}</h4>
                        {latest.isBodyweight && (
                          <span className="text-[8px] bg-accent/10 text-accent px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">
                            Собств. вес
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-surface-2/50 p-3 rounded-2xl text-center flex flex-col justify-between">
                          <div>
                            <div className="text-[8px] text-muted uppercase font-bold">Сейчас</div>
                            <div className="text-[6px] text-muted/60 mb-1 leading-none">Прошлая тренировка</div>
                          </div>
                          <div className="text-xl font-display font-bold text-accent">
                            {chartMetric === 'weight' ? (latest.isBodyweight || latest.isCardio ? latest.reps : latest.weight) : 
                             chartMetric === 'volume' ? (latest.isBodyweight || latest.isCardio ? latest.reps : ((latest.volume || (latest.weight * latest.reps)) / 1000).toFixed(2)) : 
                             latest.reps}
                            <span className="text-[10px] ml-0.5 opacity-70">
                              {chartMetric === 'weight' ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'кг') : 
                               chartMetric === 'volume' ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'т') : 
                               (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз')}
                            </span>
                          </div>
                        </div>
                        <div className="bg-accent-2/10 p-3 rounded-2xl text-center flex flex-col justify-between">
                          <div>
                            <div className="text-[8px] text-muted uppercase font-bold">Рекорд</div>
                            <div className="text-[6px] text-muted/60 mb-1 leading-none">Лучший результат</div>
                          </div>
                          <div className="text-xl font-display font-bold text-accent-2">
                            {chartMetric === 'weight' ? (latest.isBodyweight || latest.isCardio ? Math.max(...sorted.map(e => e.reps)) : best.weight) : 
                             chartMetric === 'volume' ? (latest.isBodyweight || latest.isCardio ? Math.max(...sorted.map(e => e.reps)) : (Math.max(...sorted.map(e => e.volume || (e.weight * e.reps))) / 1000).toFixed(2)) : 
                             Math.max(...sorted.map(e => e.reps))}
                            <span className="text-[10px] ml-0.5 opacity-70">
                              {chartMetric === 'weight' ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'кг') : 
                               chartMetric === 'volume' ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'т') : 
                               (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз')}
                            </span>
                          </div>
                        </div>
                        <div className="bg-done/10 p-3 rounded-2xl text-center flex flex-col justify-between">
                          <div>
                            <div className="text-[8px] text-muted uppercase font-bold">Цель</div>
                            <div className="text-[6px] text-muted/60 mb-1 leading-none">План на сегодня</div>
                          </div>
                          <div className="text-xl font-display font-bold text-done">
                            {(() => {
                              const exDef = (Object.values(programData) as any[]).flatMap(d => d.exercises).find(ex => ex.name === name);
                              const goal = calculateExerciseGoal(exDef, sorted, userProfile?.goalType || 'hypertrophy');
                              
                              if (!goal) return '—';

                              if (chartMetric === 'weight') {
                                return latest.isBodyweight || latest.isCardio ? goal.reps : goal.weight;
                              } else if (chartMetric === 'volume') {
                                return latest.isBodyweight || latest.isCardio ? goal.reps : (goal.volume / 1000).toFixed(2);
                              } else {
                                return goal.reps;
                              }
                            })()}
                            <span className="text-[10px] ml-0.5 opacity-70">
                              {chartMetric === 'weight' ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'кг') : 
                               chartMetric === 'volume' ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'т') : 
                               (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-[100px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.map(d => ({
                            ...d,
                            displayValue: chartMetric === 'weight' ? (latest.isBodyweight || latest.isCardio ? d.reps : d.weight) :
                                         chartMetric === 'volume' ? (latest.isBodyweight || latest.isCardio ? d.reps : (d.volume / 1000).toFixed(2)) :
                                         d.reps
                          }))}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '10px' }}
                              labelStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                              formatter={(value: any) => {
                                const unit = chartMetric === 'weight' 
                                  ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'кг')
                                  : chartMetric === 'volume' 
                                    ? (latest.isBodyweight || latest.isCardio ? (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз') : 'т')
                                    : (latest.unit && latest.unit !== 'кг' ? latest.unit : 'раз');
                                return [`${value} ${unit}`, 'Результат'];
                              }}
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
                              dataKey="displayValue" 
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
                                  placeholder="кг"
                                />
                                <input 
                                  type="number" 
                                  value={editStrengthReps} 
                                  onChange={(e) => setEditStrengthReps(e.target.value)}
                                  className="w-12 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                                  placeholder={entry.unit || "раз"}
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
                                  <span className="font-bold text-text text-[13px]">
                                    {entry.isCardio ? `${entry.weight}${entry.unit || 'мин'} · ${entry.reps} уд/мин` : 
                                     entry.isBodyweight ? `${entry.reps}${entry.unit || 'раз'}` : 
                                     `${entry.weight}кг × ${entry.reps}`}
                                  </span>
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
                          <div className="text-[10px] text-muted mt-1">
                            {w.exercises?.map(ex => {
                              const isCardio = ex.isCardio || Object.values(programData || {}).some((day: any) => 
                                day.exercises?.some((pEx: any) => pEx.name === ex.name && (pEx.isCardio || day.isCardio))
                              );
                              if (isCardio) {
                                const totalMins = ex.sets?.reduce((sum, s) => sum + (Number(s.cardioValues?.[0] || s.weight) || 0), 0);
                                return `${ex.name} (${totalMins} мин)`;
                              }
                              return ex.name;
                            }).join(' · ')}
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

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedMeasure1 || !selectedMeasure2}
                className="w-full py-4 bg-accent text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isAnalyzing ? 'Анализирую...' : 'Сравнить замеры'}
              </button>

              {analysisError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
                  {analysisError}
                </div>
              )}

              {analysisResult && (
                <div className="space-y-4">
                  <div className="p-6 bg-surface-2/50 border-2 border-border rounded-3xl text-[13px] leading-relaxed text-text markdown-body">
                    <ReactMarkdown>{analysisResult}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
