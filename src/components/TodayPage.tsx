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
import { ExerciseCard } from "./ExerciseCard";
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function TodayPage({ 
  currentDay, 
  setCurrentDay, 
  checkedExercises, 
  setCheckedExercises, 
  currentSets, 
  setCurrentSets,
  currentNotes,
  setCurrentNotes,
  currentRpes,
  setCurrentRpes,
  onFinish,
  workouts,
  programData,
  onEditProgram,
  onGoToCoach,
  onReset,
  isLoading
}: any) {
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutHeartRate, setWorkoutHeartRate] = useState('');

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
      <div className="text-center py-12 px-6 bg-surface rounded-[40px] border border-border shadow-sm flex flex-col items-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
          <Dumbbell className="text-accent" size={40} />
        </div>
        <h2 className="text-2xl font-display font-bold text-accent mb-3">Программа пуста</h2>
        <p className="text-muted text-sm mb-8 max-w-xs">
          Выбери, как ты хочешь начать свои тренировки:
        </p>
        
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button 
            onClick={onEditProgram} 
            className="w-full py-4 bg-accent text-white rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Settings size={20} />
            Создать вручную
          </button>
          
          <button 
            onClick={onGoToCoach} 
            className="w-full py-4 bg-surface-2 border-2 border-accent/20 text-accent rounded-2xl text-sm font-bold hover:bg-accent/10 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Bot size={20} />
            Создать с ИИ-коучем
          </button>
          
          <button 
            onClick={() => onReset()} 
            className="w-full py-4 bg-transparent border-2 border-border text-muted rounded-2xl text-sm font-bold hover:border-accent/30 hover:text-text active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <AlertTriangle size={20} />
            Использовать стандартную
          </button>
        </div>
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

  const safeChecked = Array.isArray(checkedExercises) ? checkedExercises : [];
  const total = program.exercises.length;
  const done = safeChecked.length;
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
                isChecked={safeChecked.includes(idx)}
                onCheck={() => {
                  setCheckedExercises((prev: any) => {
                    const arr = Array.isArray(prev) ? prev : [];
                    return arr.includes(idx) ? arr.filter(i => i !== idx) : [...arr, idx];
                  });
                }}
                sets={currentSets[idx] || []}
                onAddSet={() => {
                  setCurrentSets((prev: any) => {
                    const updated = { ...prev };
                    const isCardio = ex.isCardio || program.isCardio;
                    const cardioFields = ["мин", "пульс", "ккал", ...(ex.fields || []).filter((f: string) => f !== "мин" && f !== "пульс" && f !== "ккал" && f !== "время" && f !== "средний пульс")];
                    const fieldCount = isCardio ? cardioFields.length : 2;
                    
                    if (!updated[idx]) {
                      updated[idx] = Array(ex.sets).fill(null).map(() => Array(fieldCount).fill(''));
                    }
                    
                    updated[idx] = [...updated[idx], Array(fieldCount).fill('')];
                    return updated;
                  });
                }}
                onRemoveSet={(sIdx: number) => {
                  setCurrentSets((prev: any) => {
                    const updated = { ...prev };
                    if (updated[idx] && updated[idx].length > 1) {
                      updated[idx] = updated[idx].filter((_: any, i: number) => i !== sIdx);
                    }
                    return updated;
                  });
                }}
                onUpdateSet={(sIdx: number, field: number, val: string) => {
                  setCurrentSets((prev: any) => {
                    const updated = { ...prev };
                    const isCardio = ex.isCardio || program.isCardio;
                    const cardioFields = ["мин", "пульс", "ккал", ...(ex.fields || []).filter((f: string) => f !== "мин" && f !== "пульс" && f !== "ккал" && f !== "время" && f !== "средний пульс")];
                    const fieldCount = isCardio ? cardioFields.length : 2;
                    
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
                rpe={currentRpes[idx] || 8}
                onUpdateRpe={(val: number) => setCurrentRpes((prev: any) => ({
                  ...prev,
                  [idx]: val
                }))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {done === total && !isCompletedToday && (
        <div className="space-y-4">
          {!program.isCardio && (
            <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-accent mb-2">Итоги тренировки</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Время (мин)</label>
                  <input
                    type="number"
                    value={workoutDuration}
                    onChange={(e) => setWorkoutDuration(e.target.value)}
                    placeholder="Например, 60"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Ср. пульс (уд/мин)</label>
                  <input
                    type="number"
                    value={workoutHeartRate}
                    onChange={(e) => setWorkoutHeartRate(e.target.value)}
                    placeholder="Опционально"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={() => onFinish(workoutDuration, workoutHeartRate)}
            className="w-full py-5 bg-gradient-to-r from-done to-[#4a8e4a] text-white font-bold text-sm uppercase tracking-[0.2em] rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            ✓ Завершить тренировку
          </button>
        </div>
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
