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
import { User } from "../firebase";
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function WeightPage({ 
  user,
  measurements, 
  onSave,
  onDelete,
  onUpdate,
  onGoToBodyProgress
}: { 
  user: User | null;
  measurements: WeightMeasurement[]; 
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  onGoToBodyProgress: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [water, setWater] = useState('');
  const [bmi, setBmi] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [skeletalMuscleIndex, setSkeletalMuscleIndex] = useState('');
  const [waistHipRatio, setWaistHipRatio] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [bmr, setBmr] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [protein, setProtein] = useState('');
  const [fatFreeMass, setFatFreeMass] = useState('');
  const [biologicalAge, setBiologicalAge] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [waistHigh, setWaistHigh] = useState('');
  const [waistNavel, setWaistNavel] = useState('');
  const [waistWidest, setWaistWidest] = useState('');
  const [hips, setHips] = useState('');
  const [bicep, setBicep] = useState('');
  const [thigh, setThigh] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editWater, setEditWater] = useState('');
  const [editBmi, setEditBmi] = useState('');
  const [editVisceralFat, setEditVisceralFat] = useState('');
  const [editSkeletalMuscleIndex, setEditSkeletalMuscleIndex] = useState('');
  const [editWaistHipRatio, setEditWaistHipRatio] = useState('');
  const [editBodyType, setEditBodyType] = useState('');
  const [editBodyShape, setEditBodyShape] = useState('');
  const [editBmr, setEditBmr] = useState('');
  const [editBoneMass, setEditBoneMass] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editFatFreeMass, setEditFatFreeMass] = useState('');
  const [editBiologicalAge, setEditBiologicalAge] = useState('');
  const [editHeartRate, setEditHeartRate] = useState('');
  const [editChest, setEditChest] = useState('');
  const [editWaist, setEditWaist] = useState('');
  const [editWaistHigh, setEditWaistHigh] = useState('');
  const [editWaistNavel, setEditWaistNavel] = useState('');
  const [editWaistWidest, setEditWaistWidest] = useState('');
  const [editHips, setEditHips] = useState('');
  const [editThigh, setEditThigh] = useState('');
  const [editBicep, setEditBicep] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingIndices, setUploadingIndices] = useState<number[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<{ urls: string[], index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadIndex = useRef<number | null>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSide = 800;

          if (width > height) {
            if (width > maxSide) {
              height *= maxSide / width;
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width *= maxSide / height;
              height = maxSide;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error('Image loading failed'));
        img.src = event.target?.result as string;
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoClick = (index: number) => {
    setUploadError(null);
    currentUploadIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentUploadIndex.current === null || !user) return;

    const index = currentUploadIndex.current;
    setUploadingIndices(prev => [...prev, index]);
    setUploadError(null);

    try {
      const base64String = await compressImage(file);
      
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = base64String;
        return newPhotos;
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError('Ошибка загрузки фото. Попробуйте другое.');
    } finally {
      setUploadingIndices(prev => prev.filter(i => i !== index));
      currentUploadIndex.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const handleSave = () => {
    if (!weight) return;
    onSave({ 
      date: new Date(date).toISOString(),
      weight: Number(weight), 
      age: age ? Number(age) : undefined,
      fat: fat ? Number(fat) : undefined, 
      muscle: muscle ? Number(muscle) : undefined, 
      water: water ? Number(water) : undefined,
      bmi: bmi ? Number(bmi) : undefined,
      visceralFat: visceralFat ? Number(visceralFat) : undefined,
      skeletalMuscleIndex: skeletalMuscleIndex ? Number(skeletalMuscleIndex) : undefined,
      waistHipRatio: waistHipRatio ? Number(waistHipRatio) : undefined,
      bodyType: bodyType || undefined,
      bodyShape: bodyShape || undefined,
      bmr: bmr ? Number(bmr) : undefined,
      boneMass: boneMass ? Number(boneMass) : undefined,
      protein: protein ? Number(protein) : undefined,
      fatFreeMass: fatFreeMass ? Number(fatFreeMass) : undefined,
      biologicalAge: biologicalAge ? Number(biologicalAge) : undefined,
      heartRate: heartRate ? Number(heartRate) : undefined,
      chest: chest ? Number(chest) : undefined,
      waist: waist ? Number(waist) : undefined,
      waistHigh: waistHigh ? Number(waistHigh) : undefined,
      waistNavel: waistNavel ? Number(waistNavel) : undefined,
      waistWidest: waistWidest ? Number(waistWidest) : undefined,
      hips: hips ? Number(hips) : undefined,
      bicep: bicep ? Number(bicep) : undefined,
      thigh: thigh ? Number(thigh) : undefined,
      photos: photos.filter(p => !!p)
    });
    setWeight('');
    setAge('');
    setFat('');
    setMuscle('');
    setWater('');
    setBmi('');
    setVisceralFat('');
    setSkeletalMuscleIndex('');
    setWaistHipRatio('');
    setBodyType('');
    setBodyShape('');
    setBmr('');
    setBoneMass('');
    setProtein('');
    setFatFreeMass('');
    setBiologicalAge('');
    setHeartRate('');
    setChest('');
    setWaist('');
    setWaistHigh('');
    setWaistNavel('');
    setWaistWidest('');
    setHips('');
    setBicep('');
    setThigh('');
    setPhotos([]);
    setDate(new Date().toISOString().split('T')[0]);
    setSaveSuccess(true);
    setIsAddingNew(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editingUploadIndices, setEditingUploadIndices] = useState<number[]>([]);
  
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const currentEditUploadIndex = useRef<number | null>(null);

  const handleEditPhotoClick = (index: number) => {
    setUploadError(null);
    currentEditUploadIndex.current = index;
    editFileInputRef.current?.click();
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentEditUploadIndex.current === null || !user) return;

    const index = currentEditUploadIndex.current;
    setEditingUploadIndices(prev => [...prev, index]);
    setUploadError(null);

    try {
      const base64String = await compressImage(file);
      
      setEditPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = base64String;
        return newPhotos;
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError('Ошибка загрузки фото. Попробуйте другое.');
    } finally {
      setEditingUploadIndices(prev => prev.filter(i => i !== index));
      currentEditUploadIndex.current = null;
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const removeEditPhoto = async (index: number) => {
    setEditPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const handleStartEdit = (m: WeightMeasurement) => {
    setEditingId(m.id || null);
    setEditDate(m.date.split('T')[0]);
    setEditWeight(m.weight.toString());
    setEditAge(m.age?.toString() || '');
    setEditFat(m.fat?.toString() || '');
    setEditMuscle(m.muscle?.toString() || '');
    setEditWater(m.water?.toString() || '');
    setEditBmi(m.bmi?.toString() || '');
    setEditVisceralFat(m.visceralFat?.toString() || '');
    setEditSkeletalMuscleIndex(m.skeletalMuscleIndex?.toString() || '');
    setEditWaistHipRatio(m.waistHipRatio?.toString() || '');
    setEditBodyType(m.bodyType || '');
    setEditBodyShape(m.bodyShape || '');
    setEditBmr(m.bmr?.toString() || '');
    setEditBoneMass(m.boneMass?.toString() || '');
    setEditProtein(m.protein?.toString() || '');
    setEditFatFreeMass(m.fatFreeMass?.toString() || '');
    setEditBiologicalAge(m.biologicalAge?.toString() || '');
    setEditHeartRate(m.heartRate?.toString() || '');
    setEditChest(m.chest?.toString() || '');
    setEditWaist(m.waist?.toString() || '');
    setEditWaistHigh(m.waistHigh?.toString() || '');
    setEditWaistNavel(m.waistNavel?.toString() || '');
    setEditWaistWidest(m.waistWidest?.toString() || '');
    setEditHips(m.hips?.toString() || '');
    setEditThigh(m.thigh?.toString() || '');
    setEditBicep(m.bicep?.toString() || '');
    setEditPhotos(m.photos ? [...m.photos] : []);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, {
      date: new Date(editDate).toISOString(),
      weight: Number(editWeight),
      age: editAge ? Number(editAge) : null,
      fat: editFat ? Number(editFat) : null,
      muscle: editMuscle ? Number(editMuscle) : null,
      water: editWater ? Number(editWater) : null,
      bmi: editBmi ? Number(editBmi) : null,
      visceralFat: editVisceralFat ? Number(editVisceralFat) : null,
      skeletalMuscleIndex: editSkeletalMuscleIndex ? Number(editSkeletalMuscleIndex) : null,
      waistHipRatio: editWaistHipRatio ? Number(editWaistHipRatio) : null,
      bodyType: editBodyType || null,
      bodyShape: editBodyShape || null,
      bmr: editBmr ? Number(editBmr) : null,
      boneMass: editBoneMass ? Number(editBoneMass) : null,
      protein: editProtein ? Number(editProtein) : null,
      fatFreeMass: editFatFreeMass ? Number(editFatFreeMass) : null,
      biologicalAge: editBiologicalAge ? Number(editBiologicalAge) : null,
      heartRate: editHeartRate ? Number(editHeartRate) : null,
      chest: editChest ? Number(editChest) : null,
      waist: editWaist ? Number(editWaist) : null,
      waistHigh: editWaistHigh ? Number(editWaistHigh) : null,
      waistNavel: editWaistNavel ? Number(editWaistNavel) : null,
      waistWidest: editWaistWidest ? Number(editWaistWidest) : null,
      hips: editHips ? Number(editHips) : null,
      thigh: editThigh ? Number(editThigh) : null,
      bicep: editBicep ? Number(editBicep) : null,
      photos: editPhotos.filter(p => !!p)
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-accent">Замеры</h3>
            <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Антропометрия и биоимпеданс</p>
          </div>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-3xl p-6 mb-8 flex gap-4 items-start">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex-shrink-0 flex items-center justify-center text-accent">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-accent mb-1">Автоматическое заполнение</h4>
            <p className="text-xs text-muted leading-relaxed">
              Есть готовый биоимпеданс или скрин из другого приложения? 
              Просто отправь файл или скриншот мне в чат, и я сам внесу все данные в твой профиль.
            </p>
          </div>
        </div>
        
        <div className="space-y-8">
          <div>
            {!isAddingNew ? (
              <button 
                key="add-button"
                onClick={() => setIsAddingNew(true)}
                className="w-full py-6 border-2 border-dashed border-border rounded-[32px] flex flex-col items-center justify-center gap-3 text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-all group"
              >
                <div className="w-12 h-12 bg-surface-2 rounded-2xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Plus size={24} className="group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Добавить новый замер</span>
              </button>
            ) : (
              <div className="overflow-hidden">
                <div className="space-y-6 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest">Новый замер</h4>
                    <button 
                      onClick={() => setIsAddingNew(false)}
                      className="p-2 text-muted hover:text-accent transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <CustomDatePicker 
                        value={date || ''}
                        onChange={(newDate) => setDate(newDate)}
                        label="Дата замера"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Основные</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Вес (кг)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={weight || ''} onChange={(e) => setWeight(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Возраст</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={age || ''} onChange={(e) => setAge(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">ИМТ</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={bmi || ''} onChange={(e) => setBmi(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Биоимпеданс</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Жир %</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={fat || ''} onChange={(e) => setFat(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Мышцы кг</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={muscle || ''} onChange={(e) => setMuscle(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Вода %</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={water || ''} onChange={(e) => setWater(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Висц. жир</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={visceralFat || ''} onChange={(e) => setVisceralFat(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Кости (кг)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={boneMass || ''} onChange={(e) => setBoneMass(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Белок %</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={protein || ''} onChange={(e) => setProtein(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">BMR (ккал)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={bmr || ''} onChange={(e) => setBmr(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Биол. возр.</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={biologicalAge || ''} onChange={(e) => setBiologicalAge(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Пульс</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={heartRate || ''} onChange={(e) => setHeartRate(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Объемы</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Грудь (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={chest || ''} onChange={(e) => setChest(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Талия выс.</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={waistHigh || ''} onChange={(e) => setWaistHigh(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Талия пупок</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={waistNavel || ''} onChange={(e) => setWaistNavel(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Талия шир.</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={waistWidest || ''} onChange={(e) => setWaistWidest(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Бёдра (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={hips || ''} onChange={(e) => setHips(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Бедро (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={thigh || ''} onChange={(e) => setThigh(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1 px-1">Бицепс (см)</label>
                        <input type="number" className="w-full bg-surface-2 border border-border text-text p-2 rounded-lg text-sm font-bold outline-none focus:border-accent transition-all" value={bicep || ''} onChange={(e) => setBicep(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] text-accent uppercase font-bold tracking-widest border-b border-border pb-1">Фото прогресса (до 3 штук)</h5>
                    <p className="text-[10px] text-muted italic leading-relaxed">📸 Для точного AI-анализа: утром натощак · одинаковое освещение каждый раз · минимальная одежда · три ракурса: фас, бок, спина · руки слегка отведены от тела</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="relative aspect-square">
                          {photos[i] ? (
                            <div className="relative w-full h-full">
                              <img src={photos[i]} alt="Progress" className="w-full h-full object-cover rounded-2xl" />
                              <button 
                                onClick={() => removePhoto(i)}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handlePhotoClick(i)}
                              disabled={uploadingIndices.includes(i)}
                              className="w-full h-full bg-surface-2 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent/50 transition-all"
                            >
                              {uploadingIndices.includes(i) ? (
                                <span className="text-[10px] text-accent font-bold uppercase">Загрузка...</span>
                              ) : (
                                <>
                                  <Camera size={20} className="text-muted" />
                                  <span className="text-[9px] text-muted font-bold uppercase">{i === 0 ? 'Фас' : i === 1 ? 'Бок' : 'Спина'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {uploadError && (
                      <div className="text-red-500 text-[10px] font-bold uppercase mt-2">{uploadError}</div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-accent hover:bg-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
                  >
                    Сохранить замер
                  </button>
                </div>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="text-center text-emerald-500 text-xs font-bold">
              ✅ Замер успешно сохранен!
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <History size={20} />
          </div>
          <h3 className="text-lg font-display font-bold text-accent">История</h3>
        </div>
        
        {measurements.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm font-medium">Нет сохраненных замеров</div>
        ) : (
          <div className="space-y-3">
              {[...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                <div 
                  key={m.id}
                  className="p-5 bg-surface-2/50 border-2 border-border rounded-3xl shadow-sm hover:border-accent/30 transition-all space-y-3"
                >
                  {editingId === m.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <CustomDatePicker value={editDate || ''} onChange={(newDate) => setEditDate(newDate)} label="Дата" />
                      </div>
                      <div className="col-span-3 border-b border-border pb-1 mt-2">
                        <span className="text-[9px] text-accent uppercase font-bold">Основные</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Вес</label>
                        <input type="number" value={editWeight || ''} onChange={(e) => setEditWeight(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Возраст</label>
                        <input type="number" value={editAge || ''} onChange={(e) => setEditAge(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">ИМТ</label>
                        <input type="number" value={editBmi || ''} onChange={(e) => setEditBmi(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>

                      <div className="col-span-3 border-b border-border pb-1 mt-2">
                        <span className="text-[9px] text-accent uppercase font-bold">Биоимпеданс</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Жир %</label>
                        <input type="number" value={editFat || ''} onChange={(e) => setEditFat(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Мышцы кг</label>
                        <input type="number" value={editMuscle || ''} onChange={(e) => setEditMuscle(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Вода %</label>
                        <input type="number" value={editWater || ''} onChange={(e) => setEditWater(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Висц. жир</label>
                        <input type="number" value={editVisceralFat || ''} onChange={(e) => setEditVisceralFat(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Кости</label>
                        <input type="number" value={editBoneMass || ''} onChange={(e) => setEditBoneMass(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Белок %</label>
                        <input type="number" value={editProtein || ''} onChange={(e) => setEditProtein(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">BMR</label>
                        <input type="number" value={editBmr || ''} onChange={(e) => setEditBmr(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Биол. возр.</label>
                        <input type="number" value={editBiologicalAge || ''} onChange={(e) => setEditBiologicalAge(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Пульс</label>
                        <input type="number" value={editHeartRate || ''} onChange={(e) => setEditHeartRate(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>

                      <div className="col-span-3 border-b border-border pb-1 mt-2">
                        <span className="text-[9px] text-accent uppercase font-bold">Объемы</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Грудь</label>
                        <input type="number" value={editChest || ''} onChange={(e) => setEditChest(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Талия выс</label>
                        <input type="number" value={editWaistHigh || ''} onChange={(e) => setEditWaistHigh(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Талия пупок</label>
                        <input type="number" value={editWaistNavel || ''} onChange={(e) => setEditWaistNavel(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Талия шир</label>
                        <input type="number" value={editWaistWidest || ''} onChange={(e) => setEditWaistWidest(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Бёдра</label>
                        <input type="number" value={editHips || ''} onChange={(e) => setEditHips(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Бедро</label>
                        <input type="number" value={editThigh || ''} onChange={(e) => setEditThigh(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold ml-1">Бицепс</label>
                        <input type="number" value={editBicep || ''} onChange={(e) => setEditBicep(e.target.value)} className="w-full bg-surface border border-border p-2 rounded-xl text-xs font-bold" />
                      </div>
                    </div>

                    {/* Edit Photos */}
                    <div className="space-y-3 mt-4">
                      <label className="text-[11px] text-muted uppercase font-bold tracking-wider ml-1">Фотографии</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((index) => {
                          const labels = ['Фас', 'Боком', 'Спина'];
                          return (
                            <div key={index} className="space-y-1">
                              <div className="text-[9px] text-muted text-center font-bold uppercase">{labels[index]}</div>
                              <div 
                                onClick={() => !editPhotos[index] && handleEditPhotoClick(index)}
                                className={`aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                                  editPhotos[index] 
                                    ? 'border-accent bg-surface' 
                                    : 'border-dashed border-border bg-surface-2 hover:border-accent/50 hover:bg-accent/5 cursor-pointer'
                                }`}
                              >
                                {editingUploadIndices.includes(index) ? (
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                    <Loader2 size={24} className="text-accent" />
                                  </motion.div>
                                ) : editPhotos[index] ? (
                                  <>
                                    <img src={editPhotos[index]} alt="Progress" className="w-full h-full object-cover" />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeEditPhoto(index);
                                      }}
                                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <Camera size={24} className="text-muted/50 mb-2" />
                                    <span className="text-[10px] font-bold text-muted/50 uppercase">Добавить</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {uploadError && <div className="text-red-500 text-xs text-center font-bold">{uploadError}</div>}
                      <input 
                        type="file" 
                        ref={editFileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleEditFileChange} 
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={handleSaveEdit} className="flex-1 py-2 bg-done text-white text-[10px] font-bold uppercase rounded-xl">Сохранить</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-surface-3 text-text text-[10px] font-bold uppercase rounded-xl">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-[11px] font-bold uppercase tracking-wider">{format(parseISO(m.date), 'd MMM yyyy', { locale: ru })}</span>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className="text-accent text-xl font-display font-bold">{m.weight} кг</div>
                        </div>
                        <button onClick={() => handleStartEdit(m)} className="p-2 text-muted hover:text-accent transition-colors"><Edit2 size={16}/></button>
                        <button onClick={() => onDelete(m.id!)} className="p-2 text-muted hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    {(m.chest || m.waist || m.waistHigh || m.waistNavel || m.waistWidest || m.hips || m.bicep || m.thigh) && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted font-bold uppercase">
                        {m.chest != null && m.chest != 0 && <span>Грудь: {m.chest}</span>}
                        {m.waist != null && m.waist != 0 && <span>Талия: {m.waist}</span>}
                        {m.waistHigh != null && m.waistHigh != 0 && <span>Талия выс: {m.waistHigh}</span>}
                        {m.waistNavel != null && m.waistNavel != 0 && <span>Талия пупок: {m.waistNavel}</span>}
                        {m.waistWidest != null && m.waistWidest != 0 && <span>Самое жирное: {m.waistWidest}</span>}
                        {m.hips != null && m.hips != 0 && <span>Бёдра: {m.hips}</span>}
                        {m.bicep != null && m.bicep != 0 && <span>Бицепс: {m.bicep}</span>}
                        {m.thigh != null && m.thigh != 0 && <span>Бедро: {m.thigh}</span>}
                      </div>
                    )}
                    <div className="text-[10px] text-muted font-bold uppercase opacity-60 flex flex-wrap gap-x-2">
                      {m.fat && <span>Жир: {m.fat}%</span>}
                      {m.muscle && <span>Мышцы: {m.muscle}кг</span>}
                      {m.water && <span>Вода: {m.water}%</span>}
                      {m.visceralFat && <span>Висц. жир: {m.visceralFat}</span>}
                      {m.bmi && <span>ИМТ: {m.bmi}</span>}
                      {m.boneMass && <span>Кости: {m.boneMass}кг</span>}
                      {m.protein && <span>Белок: {m.protein}%</span>}
                      {m.bmr && <span>BMR: {m.bmr}</span>}
                      {m.biologicalAge && <span>Биол. возр: {m.biologicalAge}</span>}
                      {m.heartRate && <span>Пульс: {m.heartRate}</span>}
                    </div>
                    {m.photos && m.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {m.photos.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt="Progress" 
                            className="rounded-xl aspect-square object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setViewerPhoto({ urls: m.photos!, index: idx })}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewerPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setViewerPhoto(null)}
              className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={32} />
            </button>
            
            <div className="relative w-full h-full flex items-center justify-center">
              {viewerPhoto.urls.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronLeft size={48} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ChevronRight size={48} />
                  </button>
                </>
              )}
              <img 
                src={viewerPhoto.urls[viewerPhoto.index]} 
                alt="Fullscreen" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={onGoToBodyProgress}
        className="w-full py-4 bg-accent/10 text-accent font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-accent/20 transition-all mt-4"
      >
        Телесный прогресс <ChevronRight size={14} />
      </button>
    </div>
  );
}
