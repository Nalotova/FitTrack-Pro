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

export function ExerciseCard({ exercise, index, isCardioDay, isChecked, onCheck, sets, onUpdateSet, onAddSet, onRemoveSet, note, onUpdateNote, rpe, onUpdateRpe }: any) {
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
            <div className={isCardio ? "space-y-2" : "grid grid-cols-2 gap-3"}>
              {Array(Math.max(exercise.sets || 0, sets.length)).fill(0).map((_, sIdx) => (
                <div key={sIdx} className={isCardio ? "flex items-center gap-2" : "bg-surface-2/50 border border-border rounded-2xl p-3 text-center"}>
                  {isCardio ? (
                    <>
                      <div className="text-[10px] text-muted font-bold w-8 flex-shrink-0">С{sIdx + 1}</div>
                      <div className="flex-1 flex gap-1.5">
                        {(["мин", "пульс", "ккал", ...(exercise.fields || []).filter((f: string) => f !== "мин" && f !== "пульс" && f !== "ккал" && f !== "время" && f !== "средний пульс")]).map((f: string, fi: number) => (
                          <div key={fi} className="flex-1 min-w-0">
                            <input 
                              type="number" 
                              step="any"
                              placeholder={f}
                              className="w-full bg-surface-2/30 border border-border/50 text-center text-xs p-2 rounded-xl focus:border-accent outline-none transition-all font-mono font-bold"
                              value={sets[sIdx]?.[fi] || ''}
                              onChange={(e) => onUpdateSet(sIdx, fi, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {sets.length > 1 ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveSet(sIdx); }}
                            className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-all"
                            title="Удалить интервал"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <div className="w-8" />
                        )}
                        {sIdx === Math.max(exercise.sets || 0, sets.length) - 1 ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onAddSet(); }}
                            className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center hover:bg-accent/20 transition-all"
                            title="Добавить интервал"
                          >
                            <Plus size={16} />
                          </button>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[9px] text-muted uppercase font-bold mb-2">Сет {sIdx + 1}</div>
                      <div className="flex items-center justify-center gap-2">
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
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {isCardio && (
              <div className="text-[9px] text-muted/70 italic px-1">
                💡 Если тренажер показывает ккал — впиши их, иначе оставь поле пустым для авторасчета.
              </div>
            )}
            {!isCardio && (
              <div className="bg-surface-2/30 p-4 rounded-2xl border border-border/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Сложность (RPE)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    rpe >= 9 ? 'bg-red-500/20 text-red-500' : 
                    rpe >= 7 ? 'bg-accent/20 text-accent' : 
                    'bg-done/20 text-done'
                  }`}>
                    {rpe}/10
                  </span>
                </div>
                <div className="flex gap-1 justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                    <button
                      key={val}
                      onClick={() => onUpdateRpe(val)}
                      className={`flex-1 h-8 rounded-lg text-[10px] font-bold transition-all ${
                        rpe === val 
                          ? (val >= 9 ? 'bg-red-500 text-white' : val >= 7 ? 'bg-accent text-white' : 'bg-done text-white')
                          : 'bg-surface-2 text-muted hover:bg-surface-3'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-muted mt-2 italic">
                  {rpe >= 9 ? 'Отказ или почти отказ. Нужно больше отдыха.' : 
                   rpe >= 7 ? 'Тяжело, но техника сохранена. Хороший темп.' : 
                   'Легко. В следующий раз можно добавить вес.'}
                </p>
              </div>
            )}
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
