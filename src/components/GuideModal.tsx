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

export function GuideModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  const steps = [
    {
      title: "1. Постановка цели",
      icon: <Target className="text-accent" />,
      text: "Напишите в профиле свою цель своими словами (например, «хочу стать сильнее» или «похудеть к лету»). Наш ИИ автоматически определит тип вашей программы: Сила, Гипертрофия, Жиросжигание и т.д. Вся аналитика будет считаться именно от даты установки этой цели."
    },
    {
      title: "2. Запись тренировки",
      icon: <Dumbbell className="text-accent-2" />,
      text: "Во вкладке «Сегодня» отмечайте выполненные упражнения и записывайте вес и повторы для каждого подхода. Это фундамент для ваших будущих рекордов."
    },
    {
      title: "3. Умный анализ",
      icon: <Zap className="text-done" />,
      text: "После нажатия кнопки «Завершить», система мгновенно рассчитывает: Общий объём (сколько тонн вы подняли), Средний рабочий вес, Максимальный вес и Суммарные повторы. Эти данные сохраняются в вашу личную историю достижений."
    },
    {
      title: "4. Персональная прогрессия",
      icon: <TrendingUp className="text-accent" />,
      text: "На следующей тренировке в поле «Подсказка» вы увидите конкретную числовую цель. Система сравнит ваши последние 3 сессии и, исходя из вашей цели, скажет: пора ли добавить вес, увеличить количество повторов или оставить нагрузку прежней для восстановления."
    },
    {
      title: "5. Визуальный прогресс",
      icon: <BarChart3 className="text-accent-2" />,
      text: "Во вкладке «Прогресс» вы увидите графики по каждому упражнению. Метрика графика подстраивается под вашу цель: для набора массы это Объём, для силы — Максимальный вес, для выносливости — Повторы."
    },
    {
      title: "6. Анализ тела ИИ",
      icon: <Camera className="text-accent" />,
      text: "Загрузите 3 фото (фас, бок, спина) в чат с ИИ-коучем. Система проведет глубокий анализ вашей композиции тела, осанки и мышечного баланса, чтобы составить максимально точный план и поставить реалистичные цели."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface border-2 border-border rounded-[32px] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-2/50">
          <h2 className="font-display text-2xl text-accent font-bold">Как это работает</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-accent transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 text-[13px] text-text leading-relaxed">
            Добро пожаловать в <strong>FitTrack Pro</strong>! Это не просто дневник тренировок, а ваш персональный аналитик, который помогает прогрессировать научно обоснованно.
          </div>

          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center shadow-sm">
                  {step.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-text text-sm">{step.title}</h4>
                  <p className="text-muted text-[12px] leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-bold text-accent text-xs uppercase tracking-widest mb-3">Правила прогрессии</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-surface-2 p-3 rounded-xl border border-border">
                <div className="text-[10px] font-bold text-accent mb-1 uppercase">Гипертрофия</div>
                <div className="text-[11px] text-muted">Вес растет только если Объем рос 2 сессии подряд. Цель: +5% к объему.</div>
              </div>
              <div className="bg-surface-2 p-3 rounded-xl border border-border">
                <div className="text-[10px] font-bold text-accent-2 mb-1 uppercase">Сила</div>
                <div className="text-[11px] text-muted">Постоянный малый прирост веса (+2.5%) при условии выполнения всех подходов.</div>
              </div>
              <div className="bg-surface-2 p-3 rounded-xl border border-border">
                <div className="text-[10px] font-bold text-done mb-1 uppercase">Жиросжигание</div>
                <div className="text-[11px] text-muted">Главное — удержать Объем. Если он стабилен — добавляем повторы.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-2/50 border-t border-border">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-accent text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            Понятно, погнали!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
