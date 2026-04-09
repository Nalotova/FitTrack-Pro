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
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function StrengthPage({ 
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
        const firstEx = day.exercises?.[0];
        if (firstEx) {
          setExercise(firstEx.name);
          break;
        }
      }
    }
  }, [programData, exercise]);

  const selectedExDef = useMemo(() => {
    for (const day of Object.values(programData) as any[]) {
      const ex = day.exercises?.find((e: any) => e.name === exercise);
      if (ex) return ex;
    }
    return null;
  }, [exercise, programData]);

  const strengthByExercise = useMemo(() => {
    const groups: Record<string, StrengthRecord[]> = {};
    records.forEach(r => {
      if (!groups[r.exercise]) groups[r.exercise] = [];
      groups[r.exercise].push(r);
    });
    return groups;
  }, [records]);

  const handleSave = () => {
    if (!reps || !exercise) return;
    const isBW = selectedExDef?.bodyweight || selectedExDef?.isCardio;
    onSave({ 
      exercise, 
      weight: isBW ? 0 : Number(weight), 
      reps: Number(reps),
      unit: selectedExDef?.unit || (isBW ? 'раз' : 'кг'),
      isBodyweight: isBW || false
    });
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
                {p.exercises?.map((ex: any, idx: number) => (
                  <option key={`${day}-${ex.name}-${idx}`} value={ex.name}>{ex.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="number" 
              placeholder={selectedExDef?.bodyweight || selectedExDef?.isCardio ? "—" : "Вес (кг)"}
              disabled={selectedExDef?.bodyweight || selectedExDef?.isCardio}
              className={`w-full bg-surface-2 border-2 border-border text-text p-4 rounded-2xl text-xl font-bold outline-none focus:border-accent transition-all ${selectedExDef?.bodyweight || selectedExDef?.isCardio ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <input 
              type="number" 
              placeholder={selectedExDef?.unit || "Повторы"}
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
            const isBW = latest.isBodyweight;
            const unit = latest.unit || 'кг';
            const best = sorted.reduce((max, e) => (isBW ? e.reps : e.weight) > (isBW ? max.reps : max.weight) ? e : max, sorted[0]);
            const chartData = sorted.map(e => ({ 
              date: format(new Date(e.date), 'd MMM', { locale: ru }), 
              value: isBW ? e.reps : e.weight 
            }));

            return (
              <div key={name} className="bg-surface border-2 border-border rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <h4 className="text-[14px] font-bold text-text">{name}</h4>
                    {isBW && <span className="text-[8px] text-accent font-bold uppercase">Собственный вес</span>}
                  </div>
                  <Trophy size={16} className="text-accent-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface-2/50 p-3 rounded-2xl text-center">
                    <div className="text-[8px] text-muted uppercase font-bold mb-1">Сейчас</div>
                    <div className="text-xl font-display font-bold text-accent">
                      {isBW ? latest.reps : latest.weight}
                      <span className="text-[10px] ml-0.5 opacity-70">{unit}</span>
                    </div>
                  </div>
                  <div className="bg-accent-2/10 p-3 rounded-2xl text-center">
                    <div className="text-[8px] text-muted uppercase font-bold mb-1">Рекорд</div>
                    <div className="text-xl font-display font-bold text-accent-2">
                      {isBW ? best.reps : best.weight}
                    </div>
                  </div>
                  <div className="bg-done/10 p-3 rounded-2xl text-center">
                    <div className="text-[8px] text-muted uppercase font-bold mb-1">Цель</div>
                    <div className="text-xl font-display font-bold text-done">
                      {isBW ? latest.reps + (unit === 'сек' ? 5 : 2) : latest.weight + 1}
                    </div>
                  </div>
                </div>
                
                <div className="h-[80px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
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
                          {!isBW && (
                            <input 
                              type="number" 
                              value={editWeight} 
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="w-16 bg-surface-2 border border-border p-1 rounded-lg text-xs font-bold"
                            />
                          )}
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
                            {format(new Date(entry.date), 'd MMM', { locale: ru })}: {isBW ? `${entry.reps}${unit}` : `${entry.weight}кг × ${entry.reps}`}
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
