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

export function NavTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 min-w-[90px] py-2.5 px-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all shadow-sm ${
        active ? 'bg-accent text-white border-accent' : 'bg-surface text-muted border-border hover:border-accent/30'
      } border`}
    >
      {label}
    </button>
  );
}
