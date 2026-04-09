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
import { TechCard } from "./TechCard";
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function TechPage({ items, onEdit, isLoading, onBack }: { items: TechItem[]; onEdit: () => void; isLoading: boolean; onBack: () => void }) {
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
