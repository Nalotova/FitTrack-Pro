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
import { addDoc, collection, writeBatch, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import { User, OperationType, handleFirestoreError } from "../firebase";
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function ProfilePage({ 
  profile, 
  user,
  onUpdate, 
  onLogout,
  setActiveTab,
  onExportData,
  onImportData,
  theme,
  setTheme,
  setCoachMessages,
  setNotification,
  onShowGuide,
  isInitialEditing = false,
  onEditModeChange
}: { 
  profile: UserProfile | null; 
  user: User | null;
  onUpdate: (data: any, photoFile?: File) => Promise<void>; 
  onLogout: () => void;
  setActiveTab: (tab: any) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setCoachMessages: (messages: any[]) => void;
  setNotification: (notif: any) => void;
  onShowGuide: () => void;
  isInitialEditing?: boolean;
  onEditModeChange?: (isEditing: boolean) => void;
}) {
  const [name, setName] = useState(profile?.displayName || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender === 'female' ? 'female' : 'male');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [isEditing, setIsEditing] = useState(isInitialEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isInitialEditing) {
      setIsEditing(true);
    }
  }, [isInitialEditing]);

  const handleToggleEdit = (val: boolean) => {
    setIsEditing(val);
    onEditModeChange?.(val);
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState<{ type: 'delete' | 'logout' | 'export' | 'import' | null; action: () => void }>({ type: null, action: () => {} });
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState(profile?.email || user?.email || '');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportScreenshot, setSupportScreenshot] = useState<string | null>(null);
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setNotification({ message: 'Файл слишком большой (макс. 1.5МБ)', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSupportScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendSupport = async () => {
    if (!supportEmail || !supportMessage) {
      setNotification({ message: 'Заполни все обязательные поля', type: 'error' });
      return;
    }
    setIsSendingSupport(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: user.uid,
        email: supportEmail,
        message: supportMessage,
        screenshot: supportScreenshot,
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      setSupportSuccess(true);
      setTimeout(() => {
        setIsSupportOpen(false);
        setSupportSuccess(false);
        setSupportMessage('');
        setSupportScreenshot(null);
      }, 3000);
    } catch (error) {
      console.error("Error sending support ticket:", error);
      handleFirestoreError(error, OperationType.WRITE, 'support_tickets');
    } finally {
      setIsSendingSupport(false);
    }
  };

  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile || user) {
      setName(profile?.displayName || user?.displayName || '');
      setAge(profile?.age?.toString() || '');
      setGender(profile?.gender || 'male');
      setGoal(profile?.goal || '');
    }
  }, [profile, user]);

  const openConfirm = (type: 'delete' | 'logout' | 'export' | 'import', action: () => void) => {
    setIsConfirmOpen({ type, action });
  };

  const closeConfirm = () => {
    setIsConfirmOpen({ type: null, action: () => {} });
  };

  const handleDeleteAllData = async () => {
    try {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      
      const deleteInBatches = async (querySnapshot: any) => {
        const chunks = [];
        let currentChunk = [];
        querySnapshot.forEach((doc: any) => {
          currentChunk.push(doc);
          if (currentChunk.length === 400) {
            chunks.push(currentChunk);
            currentChunk = [];
          }
        });
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const doc of chunk) {
            batch.delete(doc.ref);
          }
          await batch.commit();
        }
      };

      // Delete user document
      await deleteDoc(doc(db, 'users', userId));
      
      // Delete current_workout document
      await deleteDoc(doc(db, 'current_workout', userId));
      
      // Delete programs document
      await deleteDoc(doc(db, 'programs', userId));
      
      // Delete workouts
      const workoutsQuery = query(collection(db, 'workouts'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(workoutsQuery));
      
      // Delete measurements
      const measurementsQuery = query(collection(db, 'measurements'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(measurementsQuery));
      
      // Delete strength records
      const strengthQuery = query(collection(db, 'strength'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(strengthQuery));
      
      // Delete tech items
      const techQuery = query(collection(db, 'tech'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(techQuery));
      
      // Delete coach messages
      const messagesQuery = query(collection(db, 'coach_messages'), where('userId', '==', userId));
      await deleteInBatches(await getDocs(messagesQuery));
      
      // Clear local storage (chat history)
      localStorage.removeItem('coach_messages');
      setCoachMessages([]);
      
      console.log("All data deleted successfully.");
      onLogout(); // Logout after successful deletion
    } catch (error) {
      console.error("Error deleting all data:", error);
      // Handle error (e.g., show notification)
    } finally {
      closeConfirm();
    }
  };
  
  const handleCancel = () => {
    setName(profile?.displayName || '');
    setAge(profile?.age?.toString() || '');
    setGender(profile?.gender === 'female' ? 'female' : 'male');
    setGoal(profile?.goal || '');
    handleToggleEdit(false);
  };

  const handleSaveProfile = async (photoFile?: File) => {
    setIsSaving(true);
    try {
      await onUpdate({
        displayName: name,
        age: age ? Number(age) : null,
        gender: gender,
        goal: goal
      }, photoFile);
      setNotification({ show: true, title: 'Сохранено', message: 'Профиль обновлён ✓' });
      handleToggleEdit(false);
      setPhotoFile(null); // Clear local file state after success
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setNotification({ 
        show: true, 
        title: 'Ошибка', 
        message: error.message || 'Не удалось сохранить профиль. Попробуйте позже.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center text-accent overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (profile?.photoURL || user?.photoURL) ? (
            <img src={profile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={32} />
          )}
          {isEditing && (
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
              <Camera size={20} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && setPhotoFile(e.target.files[0])} />
            </label>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-text">{profile?.displayName || user?.displayName || 'Пользователь'}</h2>
          <p className="text-xs text-muted font-bold uppercase tracking-widest">{profile?.email || user?.email}</p>
        </div>
      </div>

      <div className="bg-surface border-2 border-border rounded-[32px] p-6 space-y-6 shadow-sm relative">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Личные данные</h3>
          {!isEditing && (
            <button 
              onClick={() => handleToggleEdit(true)}
              className="absolute top-5 right-5 text-muted hover:text-accent transition-all"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Имя</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border-2 border-border text-text p-2.5 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Возраст</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-surface-2 border-2 border-border text-text p-2.5 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Пол</label>
                <div className="flex gap-2">
                  {[
                    { id: 'female', label: 'Ж' },
                    { id: 'male', label: 'М' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id as any)}
                      className={`${gender === g.id ? 'bg-accent text-white' : 'bg-surface-2 border-2 border-border text-muted hover:border-accent/50'} rounded-xl px-5 py-2 text-[13px] font-bold transition-all`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1 ml-1">Главная цель</label>
              <textarea 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Например: Набрать 5кг мышц.&#10;Улучшить выносливость."
                rows={3}
                className="w-full bg-surface-2 border-2 border-border text-text p-3 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="border-b border-border/40 pb-3 mb-3">
              <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Имя</div>
              <div className="text-[15px] font-bold text-text">{name || '—'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-3 mb-3">
              <div>
                <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Возраст</div>
                <div className="text-[15px] font-bold text-text">{age || '—'}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Пол</div>
                <div className="text-[15px] font-bold text-text">
                  {gender === 'male' ? 'Мужской' : 'Женский'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-0.5">Цель</div>
              <div className="text-[13px] font-medium text-text leading-relaxed">{goal || '—'}</div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleCancel}
              className="flex-1 py-3 border-2 border-border text-muted font-bold rounded-2xl hover:bg-surface-2 transition-all"
            >
              Отмена
            </button>
            <button 
              onClick={() => handleSaveProfile(photoFile || undefined)}
              disabled={isSaving}
              className="flex-1 py-3 bg-accent text-white font-bold rounded-2xl shadow-lg hover:bg-accent-2 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Dumbbell size={20} />
                </motion.div>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={onShowGuide}
        className="w-full bg-surface border-2 border-accent/20 rounded-[32px] p-6 flex items-center justify-between hover:border-accent/50 transition-all shadow-sm group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <HelpCircle size={24} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-text uppercase tracking-widest">Как это работает?</h4>
            <p className="text-[10px] text-muted">Гайд по системе прогрессии и целям</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-accent/50 group-hover:text-accent transition-colors" />
      </button>

      <div className="bg-surface border-2 border-border rounded-[32px] p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="text-sm font-bold text-text">Темная тема</span>
        </div>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-accent' : 'bg-border'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setActiveTab('strength')}
          className="bg-surface border-2 border-border rounded-[32px] p-6 flex flex-col items-center gap-3 hover:border-accent/50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
            <Trophy size={24} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Силовые</span>
        </button>
        <button 
          onClick={() => setActiveTab('tech')}
          className="bg-surface border-2 border-border rounded-[32px] p-6 flex flex-col items-center gap-3 hover:border-accent/50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
            <BookOpen size={24} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Техника</span>
        </button>
      </div>

      <div className="bg-surface p-6 rounded-[32px] border-2 border-red-500/10 shadow-sm">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <AlertTriangle size={16} /> Опасная зона
        </h3>
        <div className="space-y-2">
          <button onClick={() => openConfirm('delete', handleDeleteAllData)} className="w-full flex items-center justify-between p-4 bg-red-500/5 rounded-2xl hover:bg-red-500/10 transition-all group border border-red-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"><RotateCcw size={20} /></div>
              <span className="text-sm font-bold text-text group-hover:text-red-600">Сбросить все данные</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </button>
          <button onClick={() => setIsSupportOpen(true)} className="w-full flex items-center justify-between p-4 bg-surface-2/50 rounded-2xl hover:bg-accent/5 transition-all group border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-text"><HelpCircle size={20} /></div>
              <span className="text-sm font-bold text-text">Написать в поддержку</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </button>
          <button onClick={() => openConfirm('logout', onLogout)} className="w-full flex items-center justify-between p-4 bg-surface-2/50 rounded-2xl hover:bg-accent/5 transition-all group border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-text"><LogOut size={20} /></div>
              <span className="text-sm font-bold text-text">Выйти из аккаунта</span>
            </div>
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>
      </div>

      {isSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface p-6 rounded-[32px] border border-border shadow-2xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <HelpCircle size={20} className="text-accent" /> Написать в поддержку
              </h3>
              <button onClick={() => setIsSupportOpen(false)} className="p-2 hover:bg-surface-2 rounded-full transition-colors">
                <X size={20} className="text-muted" />
              </button>
            </div>

            {supportSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-done/10 text-done rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} />
                </div>
                <h4 className="text-xl font-bold text-text">Отправлено!</h4>
                <p className="text-sm text-muted">
                  Твое сообщение успешно доставлено разработчикам. Мы ответим тебе на указанный email в ближайшее время.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1.5 ml-1">Твой Email</label>
                  <input 
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full bg-surface-2 border-2 border-border text-text p-3 rounded-2xl text-sm font-bold outline-none focus:border-accent transition-all"
                    placeholder="example@mail.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1.5 ml-1">Сообщение</label>
                  <textarea 
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-surface-2 border-2 border-border text-text p-3 rounded-2xl text-sm font-bold outline-none focus:border-accent transition-all resize-none"
                    placeholder="Опиши свою проблему или предложение..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold tracking-widest mb-1.5 ml-1">Скриншот (необязательно)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-surface-2 border-2 border-dashed border-border rounded-2xl hover:border-accent/50 cursor-pointer transition-all group">
                      <input type="file" accept="image/*" onChange={handleScreenshotChange} className="hidden" />
                      <ImageIcon size={18} className="text-muted group-hover:text-accent" />
                      <span className="text-xs font-bold text-muted group-hover:text-accent">
                        {supportScreenshot ? 'Скриншот выбран' : 'Прикрепить скрин'}
                      </span>
                    </label>
                    {supportScreenshot && (
                      <button onClick={() => setSupportScreenshot(null)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-muted mt-1.5 ml-1 italic">
                    💡 Скриншот поможет нам быстрее понять и решить твой вопрос.
                  </p>
                </div>

                <button 
                  onClick={handleSendSupport}
                  disabled={isSendingSupport || !supportEmail || !supportMessage}
                  className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all mt-2"
                >
                  {isSendingSupport ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={20} /> Отправить
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {isConfirmOpen.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-surface p-6 rounded-3xl border border-border shadow-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-text mb-2">
              {isConfirmOpen.type === 'delete' ? 'Удалить все данные?' : isConfirmOpen.type === 'logout' ? 'Выйти из аккаунта?' : isConfirmOpen.type === 'export' ? 'Экспортировать данные?' : 'Импортировать данные?'}
            </h3>
            <p className="text-sm text-muted mb-6">
              {isConfirmOpen.type === 'delete' ? 'Это действие нельзя отменить. Все твои тренировки и замеры будут удалены навсегда.' : isConfirmOpen.type === 'logout' ? 'Ты сможешь войти снова в любое время.' : isConfirmOpen.type === 'export' ? 'Будет создан файл с твоими данными.' : 'Это может перезаписать текущие данные.'}
            </p>
            <div className="flex gap-3">
              <button onClick={closeConfirm} className="flex-1 py-3 bg-surface-2 text-text font-bold rounded-xl">Отмена</button>
              <button onClick={isConfirmOpen.action} className={`flex-1 py-3 font-bold rounded-xl ${isConfirmOpen.type === 'delete' ? 'bg-red-500 text-white' : 'bg-accent text-white'}`}>
                {isConfirmOpen.type === 'delete' ? 'Удалить' : isConfirmOpen.type === 'logout' ? 'Выйти' : isConfirmOpen.type === 'export' ? 'Экспорт' : 'Импорт'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
