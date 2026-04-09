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

export function TechCard({ title, subtitle, content }: { title: string; subtitle: string; content: string }) {
  // Pre-process content to handle ● and * as markdown lists if they aren't already
  const processedContent = content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('●') || trimmed.startsWith('•')) {
        return `* ${trimmed.substring(1).trim()}`;
      }
      return line;
    })
    .join('\n');

  return (
    <div className="bg-surface border-2 border-border border-l-8 border-l-accent rounded-3xl p-6 space-y-3 shadow-sm">
      <h4 className="font-display text-xl text-accent font-bold">{title}</h4>
      <p className="text-[10px] text-accent-2 uppercase font-bold tracking-widest">{subtitle}</p>
      <div className="text-[12px] text-text leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-li:marker:text-accent">
        <ReactMarkdown>{processedContent}</ReactMarkdown>
      </div>
    </div>
  );
}
