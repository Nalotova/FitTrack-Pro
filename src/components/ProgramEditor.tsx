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

export function ProgramEditor({ program, onSave, onClose }: { program: any; onSave: (data: any) => Promise<void>; onClose: () => void }) {
  const [localProgram, setLocalProgram] = useState(JSON.parse(JSON.stringify(program)));
  const [selectedDay, setSelectedDay] = useState(Object.keys(localProgram)[0]);
  const [localDayName, setLocalDayName] = useState(Object.keys(localProgram)[0]);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevExercisesLength = useRef<number>(0);

  useEffect(() => {
    const currentLength = localProgram[selectedDay]?.exercises?.length || 0;
    if (currentLength > prevExercisesLength.current && scrollRef.current) {
      // Small delay to allow DOM to update
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
    prevExercisesLength.current = currentLength;
  }, [localProgram[selectedDay]?.exercises?.length, selectedDay]);

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

  const addExercise = (day: string, type: 'strength' | 'cardio' | 'static') => {
    const isCardio = type === 'cardio';
    const isStatic = type === 'static';
    const newExercise: any = {
      name: isStatic ? 'Планка' : (isCardio ? 'Бег / Ходьба' : 'Новое упражнение'),
      scheme: isStatic ? '3 x 60 сек' : (isCardio ? '30 мин' : '3 x 12'),
      sets: isCardio ? 1 : 3,
      tip: '',
      isCardio: isCardio,
      isStatic: isStatic
    };
    if (isCardio) {
      newExercise.fields = ["дистанция"];
    }
    if (isStatic) {
      newExercise.staticType = 'time';
    }
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
        newDay.exercises = newDay.exercises.map((ex: any) => {
          const updatedEx = {
            ...ex,
            isCardio: value,
            sets: value ? (ex.sets === 3 ? 1 : ex.sets) : (ex.sets === 1 ? 3 : ex.sets),
            scheme: value ? (ex.scheme === '3 x 12' ? '30 мин' : ex.scheme) : (ex.scheme === '30 мин' ? '3 x 12' : ex.scheme)
          };
          if (value) {
            updatedEx.fields = ex.fields || ["мин", "км", "пульс"];
          } else {
            delete updatedEx.fields;
          }
          return updatedEx;
        });
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-xl font-display font-bold text-accent">Редактор программы</h2>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest mt-1">Настрой тренировки под себя</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-accent transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar">
          {/* Day Selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Выбери день</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {Object.keys(localProgram).map(day => (
                <button 
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-5 py-3 rounded-2xl text-[11px] font-bold border transition-all shadow-sm flex-shrink-0 ${
                    selectedDay === day ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-muted hover:border-accent/30'
                  }`}
                >
                  {day}
                </button>
              ))}
              <button 
                onClick={addDay}
                className="px-5 py-3 rounded-2xl text-[11px] font-bold border border-dashed border-accent text-accent bg-accent/5 hover:bg-accent/10 transition-all flex items-center gap-1 flex-shrink-0"
              >
                <Plus size={14} /> День
              </button>
            </div>
          </div>

          {/* Day Settings */}
          {selectedDay && localProgram[selectedDay] ? (
            <>
              <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm space-y-6">
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
                  className="w-full p-4 bg-surface-2/50 border-2 border-border rounded-2xl focus:border-accent outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Подзаголовок дня</label>
                <input 
                  type="text" 
                  value={localProgram[selectedDay]?.subtitle || ''}
                  onChange={(e) => updateDay(selectedDay, 'subtitle', e.target.value)}
                  placeholder="Например: Ягодицы + Ноги"
                  className="w-full p-4 bg-surface-2/50 border-2 border-border rounded-2xl focus:border-accent outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Тип тренировки</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => updateDay(selectedDay, 'isCardio', !localProgram[selectedDay]?.isCardio)}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                    localProgram[selectedDay]?.isCardio 
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' 
                      : 'bg-transparent border-border text-muted hover:border-accent/30'
                  }`}
                >
                  {localProgram[selectedDay]?.isCardio ? '🏃 Кардио-день' : '💪 Силовая тренировка'}
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => moveDay(selectedDay, 'left')}
                    className="w-14 h-14 flex items-center justify-center bg-surface-2 border-2 border-border rounded-2xl text-muted hover:text-accent hover:border-accent/30 transition-all"
                    title="Переместить влево"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => moveDay(selectedDay, 'right')}
                    className="w-14 h-14 flex items-center justify-center bg-surface-2 border-2 border-border rounded-2xl text-muted hover:text-accent hover:border-accent/30 transition-all"
                    title="Переместить вправо"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </div>

            {Object.keys(localProgram).length > 1 && (
              <div className="pt-2 border-t border-border/50">
                <button 
                  onClick={() => removeDay(selectedDay)}
                  className="w-full py-3 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Удалить этот день
                </button>
              </div>
            )}
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 px-1">
              <h3 className="text-[10px] text-accent uppercase font-bold tracking-widest">Упражнения</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => addExercise(selectedDay, 'strength')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface-2 border-2 border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-text hover:border-accent/30 transition-all"
                >
                  <Plus size={14} className="text-accent" /> Силовое
                </button>
                <button 
                  onClick={() => addExercise(selectedDay, 'cardio')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface-2 border-2 border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-text hover:border-accent/30 transition-all"
                >
                  <Plus size={14} className="text-accent" /> Кардио
                </button>
                <button 
                  onClick={() => addExercise(selectedDay, 'static')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface-2 border-2 border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-text hover:border-accent/30 transition-all"
                >
                  <Plus size={14} className="text-accent" /> Bodyweight
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {localProgram[selectedDay].exercises.map((ex: any, idx: number) => (
                <div key={idx} className="bg-surface p-5 rounded-[32px] border border-border shadow-sm space-y-4 relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest ${
                      ex.isStatic ? 'bg-purple-500/10 text-purple-500' : 
                      ex.isCardio ? 'bg-blue-500/10 text-blue-500' : 
                      'bg-accent/10 text-accent'
                    }`}>
                      {ex.isStatic ? 'Bodyweight' : ex.isCardio ? 'Кардио' : 'Силовое'}
                    </div>
                    <button 
                      onClick={() => removeExercise(selectedDay, idx)}
                      className="p-2 text-muted hover:text-red-500 transition-all bg-surface-2/50 rounded-xl"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Название</label>
                      <input 
                        type="text" 
                        value={ex.name || ''}
                        onChange={(e) => updateExercise(selectedDay, idx, 'name', e.target.value)}
                        className="w-full p-4 bg-surface-2/30 border-2 border-border rounded-2xl text-sm font-bold focus:border-accent outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">
                        {ex.isStatic ? 'Цель (напр. 60 сек)' : ex.isCardio ? 'Цель (напр. 30 мин)' : 'Схема (напр. 3 x 12)'}
                      </label>
                      <input 
                        type="text" 
                        value={ex.scheme || ''}
                        onChange={(e) => updateExercise(selectedDay, idx, 'scheme', e.target.value)}
                        className="w-full p-4 bg-surface-2/30 border-2 border-border rounded-2xl text-sm font-bold focus:border-accent outline-none transition-all"
                      />
                    </div>
                  </div>

                  {ex.isStatic && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Учет прогресса</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            updateExercise(selectedDay, idx, 'staticType', 'time');
                            updateExercise(selectedDay, idx, 'scheme', (ex.sets || 3) + ' x 60 сек');
                          }}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                            ex.staticType === 'time' ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-muted'
                          }`}
                        >
                          По времени
                        </button>
                        <button 
                          onClick={() => {
                            updateExercise(selectedDay, idx, 'staticType', 'reps');
                            updateExercise(selectedDay, idx, 'scheme', (ex.sets || 3) + ' x 15');
                          }}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                            ex.staticType === 'reps' ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-muted'
                          }`}
                        >
                          По повторам
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">
                        {ex.isCardio ? 'Кол-во интервалов' : 'Кол-во сетов'}
                      </label>
                      <input 
                        type="number" 
                        value={ex.sets || 0}
                        onChange={(e) => updateExercise(selectedDay, idx, 'sets', parseInt(e.target.value) || 0)}
                        className="w-full p-4 bg-surface-2/30 border-2 border-border rounded-2xl text-sm font-bold focus:border-accent outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">
                        {ex.isCardio ? 'Доп. поля (мин, пульс, ккал — всегда)' : 'Подсказка (необязательно)'}
                      </label>
                      {ex.isCardio ? (
                        <input 
                          type="text" 
                          value={ex.fieldsRaw !== undefined ? ex.fieldsRaw : (ex.fields || []).filter((f: string) => f !== "мин" && f !== "пульс" && f !== "ккал" && f !== "время" && f !== "средний пульс").join(', ')}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateExercise(selectedDay, idx, 'fieldsRaw', val);
                            const fields = val.split(',').map(s => s.trim()).filter(s => s && s !== "мин" && s !== "пульс" && s !== "ккал" && s !== "время" && s !== "средний пульс");
                            updateExercise(selectedDay, idx, 'fields', fields);
                          }}
                          placeholder="дистанция, темп, калории (через запятую)"
                          className="w-full p-4 bg-surface-2/30 border-2 border-border rounded-2xl text-sm font-bold focus:border-accent outline-none transition-all"
                        />
                      ) : (
                        <input 
                          type="text" 
                          value={ex.tip || ''}
                          onChange={(e) => updateExercise(selectedDay, idx, 'tip', e.target.value)}
                          className="w-full p-4 bg-surface-2/30 border-2 border-border rounded-2xl text-sm font-bold focus:border-accent outline-none transition-all"
                        />
                      )}
                    </div>
                  </div>
                  {ex.isCardio && (
                    <div className="mt-4 space-y-2">
                      <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">
                        Подсказка (необязательно)
                      </label>
                      <input 
                        type="text" 
                        value={ex.tip || ''}
                        onChange={(e) => updateExercise(selectedDay, idx, 'tip', e.target.value)}
                        placeholder="Напр. Держи темп или Следи за пульсом"
                        className="w-full p-4 bg-surface-2/30 border-2 border-border rounded-2xl text-sm font-bold focus:border-accent outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted">
              <p>Добавьте первый день тренировки, нажав на кнопку "+ День"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface flex gap-3">
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
