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

export function TechEditor({ items, onSave, onClose }: { items: TechItem[]; onSave: (items: TechItem[]) => Promise<void>; onClose: () => void }) {
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
