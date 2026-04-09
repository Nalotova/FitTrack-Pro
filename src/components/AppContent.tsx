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
import { GoogleGenAI } from "@google/genai";
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, differenceInDays, startOfWeek, subWeeks, subMonths, isWithinInterval, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, query, where, onSnapshot, setDoc, getDoc, doc, deleteDoc, addDoc, writeBatch, getDocs, serverTimestamp, User, OperationType, handleFirestoreError, storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';
import { calculateExerciseGoal, calculateCaloriesBurned } from '../utils';

import { GuideModal } from './GuideModal';
import { ProgramEditor } from './ProgramEditor';
import { CoachPage } from './CoachPage';
import { ProfilePage } from './ProfilePage';
import { NavTab } from './NavTab';
import { TodayPage } from './TodayPage';
import { ProgressPage } from './ProgressPage';
import { StrengthPage } from './StrengthPage';
import { WeightPage } from './WeightPage';
import { TechPage } from './TechPage';
import { TechEditor } from './TechEditor';

export function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([]);
  const [strengthRecords, setStrengthRecords] = useState<StrengthRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'strength' | 'tech' | 'coach' | 'profile' | 'measurements'>('today');
  const [activeProgressTab, setActiveProgressTab] = useState<'workouts' | 'body'>('workouts');
  const [chartMetric, setChartMetric] = useState<'weight' | 'volume' | 'reps'>('weight');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<any[]>([]);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [programData, setProgramData] = useState<Record<string, any>>(PROGRAM);
  const [isProgramLoading, setIsProgramLoading] = useState(true);
  const [techData, setTechData] = useState<TechItem[]>([]);
  const [isTechLoading, setIsTechLoading] = useState(true);
  const [showProgramEditor, setShowProgramEditor] = useState(false);
  const [showTechEditor, setShowTechEditor] = useState(false);
  const [currentRpes, setCurrentRpes] = useState<Record<string, Record<number, number>>>({});
  const [notification, setNotification] = useState<{show: boolean, title: string, message: string, type?: 'info' | 'success' | 'error'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [profileEditMode, setProfileEditMode] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Today's state
  const [currentDay, setCurrentDay] = useState('День 1');
  const [checkedExercises, setCheckedExercises] = useState<Record<string, number[]>>({});
  const [currentSets, setCurrentSets] = useState<Record<string, Record<number, any[][]>>>({});
  const [currentNotes, setCurrentNotes] = useState<Record<string, Record<number, string>>>({});
  const [isWorkoutStateLoading, setIsWorkoutStateLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cleanupOldFiles = async () => {
    if (!user) return;
    const now = new Date().getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    
    // Check measurements photos
    const measurementsSnapshot = await getDocs(query(collection(db, 'measurements'), where('userId', '==', user.uid)));
    for (const docSnap of measurementsSnapshot.docs) {
      const data = docSnap.data();
      if (data.photos && data.createdAt) {
        const fileDate = new Date(data.createdAt).getTime();
        if (now - fileDate > SEVEN_DAYS) {
          // Delete files from storage
          for (const photoUrl of data.photos) {
            try {
              const fileRef = ref(storage, photoUrl);
              await deleteObject(fileRef);
            } catch (e) { console.error("Error deleting file", e); }
          }
          // Update document to remove photo references
          await setDoc(docSnap.ref, { photos: [] }, { merge: true });
        }
      }
    }

    // Check coach messages (audio)
    const messagesSnapshot = await getDocs(query(collection(db, 'coach_messages'), where('userId', '==', user.uid)));
    for (const docSnap of messagesSnapshot.docs) {
      const data = docSnap.data();
      if (data.files && data.timestamp) {
        const fileDate = new Date(data.timestamp).getTime();
        if (now - fileDate > SEVEN_DAYS) {
          for (const file of data.files) {
            if (file.mimeType && (file.mimeType.startsWith('audio/') || file.mimeType.startsWith('image/'))) {
              try {
                // Assuming files are stored in storage or embedded - if embedded, just update doc
                // If stored in storage, delete here
              } catch (e) { console.error("Error deleting file", e); }
            }
          }
          await setDoc(docSnap.ref, { files: [] }, { merge: true });
        }
      }
    }
  };

  useEffect(() => {
    if (user) cleanupOldFiles();
  }, [user]);

  // Auth Listener
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fallback timeout to ensure app loads even if Firestore hangs
        timeout = setTimeout(() => {
          setLoading(false);
        }, 5000);
        await syncUserProfile(currentUser);
      } else {
        setLoading(false);
      }
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Persistence for Today's state
  useEffect(() => {
    if (!user) {
      setIsWorkoutStateLoading(false);
      return;
    }
    const timeout = setTimeout(() => setIsWorkoutStateLoading(false), 5000);
    const unsub = onSnapshot(doc(db, 'current_workout', user.uid), (snapshot) => {
      clearTimeout(timeout);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentDay(prev => prev !== data.currentDay ? (data.currentDay || 'День 1') : prev);
        setCheckedExercises(prev => {
          let checked = data.checkedExercises || {};
          if (Array.isArray(checked)) {
            // Migration: if it's an array, it's old data, put it in the current day
            checked = { [data.currentDay || 'День 1']: checked };
          } else if (typeof checked === 'object') {
            // Ensure all values are arrays
            const validatedChecked: Record<string, number[]> = {};
            Object.keys(checked).forEach(key => {
              validatedChecked[key] = Array.isArray(checked[key]) ? checked[key] : [];
            });
            checked = validatedChecked;
          }
          return JSON.stringify(prev) !== JSON.stringify(checked) ? checked : prev;
        });
        setCurrentSets(prev => {
          let sets = data.currentSets || {};
          if (typeof sets === 'string') {
            try {
              sets = JSON.parse(sets);
            } catch (e) {
              sets = {};
            }
          }
          if (sets && !sets['День 1'] && !sets['День 2'] && Object.keys(sets).some(k => !isNaN(Number(k)))) {
            // Migration: if it's a flat object with numeric keys, it's old data
            sets = { [data.currentDay || 'День 1']: sets };
          }
          return JSON.stringify(prev) !== JSON.stringify(sets) ? sets : prev;
        });
        setCurrentNotes(prev => {
          let notes = data.currentNotes || {};
          if (notes && !notes['День 1'] && !notes['День 2'] && Object.keys(notes).some(k => !isNaN(Number(k)))) {
            // Migration: if it's a flat object with numeric keys, it's old data
            notes = { [data.currentDay || 'День 1']: notes };
          }
          return JSON.stringify(prev) !== JSON.stringify(notes) ? notes : prev;
        });
      }
      setIsWorkoutStateLoading(false);
    }, (error) => {
      clearTimeout(timeout);
      setIsWorkoutStateLoading(false);
      handleFirestoreError(error, OperationType.GET, `current_workout/${user.uid}`);
    });
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [user]);

  // Sync currentDay with programData
  useEffect(() => {
    if (!isProgramLoading && !isWorkoutStateLoading && !programData[currentDay]) {
      const firstDay = Object.keys(programData)[0];
      if (firstDay) setCurrentDay(firstDay);
    }
  }, [programData, currentDay, isProgramLoading, isWorkoutStateLoading]);

  // Persistence for Today's state
  useEffect(() => {
    if (!user || isWorkoutStateLoading) return;
    const timer = setTimeout(() => {
      saveWorkoutState({
        currentDay,
        checkedExercises,
        currentSets,
        currentNotes
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentDay, checkedExercises, currentSets, currentNotes, user, isWorkoutStateLoading]);

  // Persistence for Coach messages (Firestore migration)
  useEffect(() => {
    if (!user) {
      setCoachMessages([]);
      return;
    }
    
    const unsub = onSnapshot(
      query(collection(db, 'coach_messages'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCoachMessages(data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'coach_messages')
    );
    
    return () => unsub();
  }, [user]);

  const handleAddCoachMessage = async (message: { role: string, content: string, files?: any[] }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'coach_messages'), {
        userId: user.uid,
        ...message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coach_messages');
    }
  };

  const handleClearCoachMessages = async () => {
    if (!user) return;
    try {
      const snapshot = await getDocs(query(collection(db, 'coach_messages'), where('userId', '==', user.uid)));
      
      const chunks = [];
      let currentChunk = [];
      snapshot.forEach((doc: any) => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'coach_messages');
    }
  };

  const saveWorkoutState = async (updates: any) => {
    if (!user) return;
    try {
      // Serialize nested arrays if they exist (e.g., currentSets)
      const serializedUpdates = { ...updates };
      if (serializedUpdates.currentSets) {
        serializedUpdates.currentSets = JSON.stringify(serializedUpdates.currentSets);
      }
      
      await setDoc(doc(db, 'current_workout', user.uid), serializedUpdates, { merge: true });
    } catch (error) {
      console.error("Failed to save workout state:", error);
    }
  };

  const updateProgramTipWithWeight = async (exercise: string, currentRecord: Partial<StrengthRecord>) => {
    if (!programData || !exercise || !currentRecord) return;
    
    const goalType = userProfile?.goalType;
    const goalChangedAt = userProfile?.goalChangedAt;
    
    // Filter records by current goal period
    const history = strengthRecords
      .filter(r => r.exercise.toLowerCase() === exercise.toLowerCase())
      .filter(r => !goalChangedAt || new Date(r.date) >= new Date(goalChangedAt))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const fullHistory = [currentRecord as StrengthRecord, ...history];
    const last = fullHistory[0];

    const updatedProgram = JSON.parse(JSON.stringify(programData));
    let changed = false;

    Object.keys(updatedProgram).forEach(dayKey => {
      updatedProgram[dayKey].exercises.forEach((ex: any) => {
        if (ex.name.toLowerCase() === exercise.toLowerCase()) {
          const goal = calculateExerciseGoal(ex, fullHistory, goalType || 'hypertrophy');
          let suffix = '';
          
          if (goal) {
            if (goal.type === 'deload') {
              suffix = `🔄 ${goal.message}`;
            } else if (goal.type === 'weight') {
              suffix = `🚀 ${goal.message} (вес ${goal.weight}кг)`;
            } else if (goal.type === 'stabilize') {
              suffix = `⚖️ ${goal.message}`;
            } else {
              suffix = `📈 ${goal.message}`;
            }
          } else {
            suffix = `${last.weight}кг+`;
          }

          // Pattern to match any existing recommendation suffix
          const weightPattern = /\s(ср\.|рекорд|прошлый раз|Цель|Перегрузка|Адаптация|Стабильно|Держи|3 сессии|Регулярность|🔄|🚀|📈|⚖️|\d+(\.\d+)?\+).*$/;
          if (!ex.tip) {
            ex.tip = suffix;
            changed = true;
          } else {
            if (weightPattern.test(ex.tip)) {
              ex.tip = ex.tip.replace(weightPattern, ` ${suffix}`);
            } else {
              ex.tip = ex.tip.trim() + ` ${suffix}`;
            }
            changed = true;
          }
        }
      });
    });

    if (changed) {
      await handleUpdateProgram(updatedProgram);
    }
  };

  const handleUpdateProgram = async (newData: any) => {
    if (!user) return;
    
    // Validate newData to prevent saving empty or malformed programs
    if (!newData || typeof newData !== 'object' || Object.keys(newData).length === 0) {
      console.error("Attempted to save empty or invalid program data:", newData);
      // If it's empty, we might want to fallback to PROGRAM instead of saving empty
      newData = PROGRAM;
    }

    try {
      // Save data and explicit order of keys to preserve user's preferred order
      await setDoc(doc(db, 'programs', user.uid), { 
        data: newData, 
        order: Object.keys(newData),
        updatedAt: new Date().toISOString() 
      });
      
      // Validate current state against new program
      const days = Object.keys(newData);
      let updatedDay = currentDay;
      if (!days.includes(currentDay)) {
        updatedDay = days[0] || 'День 1';
      }
      
      // Save updated state
      const isResettingToDefault = newData === DEFAULT_PROGRAM;
      
      await saveWorkoutState({
        currentDay: updatedDay,
        ...(isResettingToDefault || updatedDay !== currentDay ? { 
          checkedExercises: { ...checkedExercises, [updatedDay]: [] }, 
          currentSets: { ...currentSets, [updatedDay]: {} }, 
          currentNotes: { ...currentNotes, [updatedDay]: {} } 
        } : {})
      });
      
      if (isResettingToDefault) {
        setCheckedExercises({});
        setCurrentSets({});
        setCurrentNotes({});
      }

      // Removed alert for better mobile/iframe compatibility
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `programs/${user.uid}`);
    }
  };

  // Profile Listener
  useEffect(() => {
    if (!user) return;
    
    // Fallback timeout to ensure app loads even if Firestore hangs
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      clearTimeout(timeout);
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(timeout);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => {
      clearTimeout(timeout);
      unsubProfile();
    };
  }, [user]);

  // Program Listener
  useEffect(() => {
    if (!user) {
      setProgramData(PROGRAM);
      setIsProgramLoading(false);
      setIsTechLoading(false);
      return;
    }

    const timeoutProgram = setTimeout(() => setIsProgramLoading(false), 5000);
    const unsubProgram = onSnapshot(doc(db, 'programs', user.uid), (snapshot) => {
      clearTimeout(timeoutProgram);
      let finalData = PROGRAM;
      if (snapshot.exists()) {
        const snapshotData = snapshot.data();
        const data = snapshotData.data;
        const order = snapshotData.order;

        // Check if the program is "broken" (empty exercises or English keys)
        // We only fallback if the data is completely missing or clearly invalid (e.g. all days empty)
        const hasEnglishKeys = data && Object.keys(data).some(k => 
          k.toLowerCase().includes('day') || 
          k.toLowerCase().includes('cardio') || 
          k.toLowerCase().includes('workout')
        );
        const allEmptyExercises = data && Object.keys(data).length > 0 && Object.values(data).every((d: any) => !d.exercises || d.exercises.length === 0);
        
        if (data && Object.keys(data).length > 0 && !hasEnglishKeys && !allEmptyExercises) {
          // Restore order if it was explicitly saved
          if (order && Array.isArray(order)) {
            const orderedData: any = {};
            order.forEach((key: string) => {
              if (data[key]) orderedData[key] = data[key];
            });
            // Add any keys that might be missing from order (just in case)
            Object.keys(data).forEach(key => {
              if (!orderedData[key]) orderedData[key] = data[key];
            });
            finalData = orderedData;
          } else {
            finalData = data;
          }
        }
      }
      setProgramData(finalData);
      setIsProgramLoading(false);
    }, (error) => {
      clearTimeout(timeoutProgram);
      setIsProgramLoading(false);
      handleFirestoreError(error, OperationType.GET, `programs/${user.uid}`);
    });

    const timeoutTech = setTimeout(() => setIsTechLoading(false), 5000);
    const unsubTech = onSnapshot(
      query(collection(db, 'tech'), where('userId', '==', user.uid)),
      (snapshot) => {
        clearTimeout(timeoutTech);
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          // Migration: if points exists but content doesn't, join them
          let content = d.content || '';
          if (!content && d.points && Array.isArray(d.points)) {
            content = d.points.map((p: string) => `● ${p}`).join('\n');
          }
          return { id: doc.id, ...d, content } as TechItem;
        });
        setTechData(data.sort((a, b) => a.order - b.order));
        setIsTechLoading(false);
      },
      (error) => {
        clearTimeout(timeoutTech);
        setIsTechLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'tech');
      }
    );

    return () => {
      clearTimeout(timeoutProgram);
      clearTimeout(timeoutTech);
      unsubProgram();
      unsubTech();
    };
  }, [user]);

  // Data Listeners
  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setMeasurements([]);
      setStrengthRecords([]);
      return;
    }

    const unsubWorkouts = onSnapshot(
      query(collection(db, 'workouts'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
        setWorkouts(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'workouts')
    );

    const unsubMeasurements = onSnapshot(
      query(collection(db, 'measurements'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightMeasurement));
        setMeasurements(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'measurements')
    );

    const unsubStrength = onSnapshot(
      query(collection(db, 'strength'), where('userId', '==', user.uid)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StrengthRecord));
        setStrengthRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'strength')
    );

    return () => {
      unsubWorkouts();
      unsubMeasurements();
      unsubStrength();
    };
  }, [user]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const syncUserProfile = async (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      const userData = docSnap.exists() ? docSnap.data() : null;
      
      const updates: any = {};
      if (!userData) {
        updates.displayName = currentUser.displayName || 'Анонимный пользователь';
        updates.email = currentUser.email || '';
        updates.photoURL = currentUser.photoURL || '';
        updates.role = 'user';
        updates.uid = currentUser.uid;
        updates.createdAt = new Date().toISOString();
      } else {
        // If name or photo are missing in Firestore but available in Auth, restore them
        // Use loose check (null, undefined, or empty string)
        if (!userData.displayName && currentUser.displayName) updates.displayName = currentUser.displayName;
        if (!userData.photoURL && currentUser.photoURL) updates.photoURL = currentUser.photoURL;
        // Always ensure email is up to date
        if (userData.email !== currentUser.email) updates.email = currentUser.email || '';
        
        // Ensure required fields for isValidUserProfile are present
        if (!userData.role) updates.role = 'user';
        if (!userData.uid) updates.uid = currentUser.uid;
        if (!userData.createdAt) updates.createdAt = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await setDoc(userRef, updates, { merge: true });
      }
    } catch (error) {
      console.error("Failed to sync user profile:", error);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>, photoFile?: File) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      
      let photoURL = data.photoURL !== undefined ? data.photoURL : existingData.photoURL;
      
      if (photoFile) {
        // Limit file size to 5MB
        if (photoFile.size > 5 * 1024 * 1024) {
          throw new Error("Файл слишком большой. Максимальный размер 5МБ.");
        }

        // Convert to base64 and resize to fit in Firestore document
        photoURL = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 300;
              const MAX_HEIGHT = 300;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              } else {
                reject(new Error("Не удалось обработать изображение"));
              }
            };
            img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
            img.src = e.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
          reader.readAsDataURL(photoFile);
        });
      }
      
      const updateData: any = { ...data, photoURL: photoURL || null, updatedAt: new Date().toISOString() };

      // Task 1: Classification
      if (data.goal && data.goal !== existingData.goal) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Пользователь написал свою фитнес-цель: ${data.goal}. Определи тип цели одним словом из списка: hypertrophy, strength, fat_loss, recomposition, endurance, tone. Верни только одно слово.`,
          });
          const goalType = response.text?.trim().toLowerCase();
          const validGoals = ['hypertrophy', 'strength', 'fat_loss', 'recomposition', 'endurance', 'tone'];
          if (goalType && validGoals.includes(goalType)) {
            updateData.goalType = goalType;
            updateData.goalChangedAt = new Date().toISOString();
          }
        } catch (e) {
          console.error("Gemini classification failed:", e);
        }
      }

      if (!docSnap.exists()) {
        const fullData = {
          ...updateData,
          displayName: data.displayName || user.displayName || 'Анонимный пользователь',
          email: user.email || '',
          role: 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, fullData);
      } else {
        await setDoc(userRef, updateData, { merge: true });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      if (error instanceof Error && !error.message.includes("Файл слишком большой") && !error.message.includes("время ожидания")) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
      throw error;
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Workout Logic
  const handleFinishWorkout = async (duration?: string, avgHeartRate?: string) => {
    if (!user || !programData || !programData[currentDay]) return;
    
    setNotification({
      show: true,
      title: 'Сохранение...',
      message: 'Пожалуйста, подождите, мы сохраняем ваши результаты. ⏳',
      type: 'info'
    });

    let totalVolume = 0;
    
    const workoutToSave: Workout = {
      userId: user.uid,
      date: new Date().toISOString(),
      day: currentDay,
      exercises: programData[currentDay].exercises.map((ex: any, i: number) => {
        const isCardio = ex.isCardio || programData[currentDay].isCardio || false;
        const exerciseSets = (currentSets[currentDay] || {})[i] || [];
        const cardioFields = isCardio ? ["мин", "пульс", "ккал", ...(ex.fields || []).filter((f: string) => f !== "мин" && f !== "пульс" && f !== "ккал" && f !== "время" && f !== "средний пульс")] : [];
        
        const sets = exerciseSets.map((s: any) => {
          const row = Array.isArray(s) ? s : [];
          const setObj: any = { 
            weight: Number(row[0]) || 0, 
            reps: Number(row[1]) || 0
          };
          if (isCardio) {
            setObj.cardioValues = row.map((v: any) => Number(v) || 0);
          } else {
            totalVolume += setObj.weight * setObj.reps;
          }
          return setObj;
        });

        const exObj: any = {
          name: ex.name,
          isCardio,
          sets
        };
        if (isCardio) {
          exObj.fields = cardioFields;
        }
        return exObj;
      }),
      notes: Object.values(currentNotes[currentDay] || {}).filter(Boolean).join('\n'),
      isCardio: programData[currentDay].isCardio || false
    };

    const isCardioWorkout = programData[currentDay].isCardio || false;
    
    // Calculate calories
    let caloriesBurned = 0;
    let finalDuration = 0;
    let finalHeartRate = 0;
    
    if (isCardioWorkout) {
      // For cardio, sum up duration and calories from sets if available
      workoutToSave.exercises.forEach(ex => {
        ex.sets.forEach((set: any) => {
          if (set.cardioValues && set.cardioValues.length >= 3) {
            finalDuration += set.cardioValues[0] || 0;
            caloriesBurned += set.cardioValues[2] || 0;
          }
        });
      });
    } else {
      finalDuration = Number(duration) || 0;
      finalHeartRate = Number(avgHeartRate) || 0;
      
      if (finalDuration > 0) {
        const userWeight = measurements.length > 0 ? measurements[0].weight : 70;
        const userAge = Number(userProfile?.age) || 30;
        const userGender = userProfile?.gender || 'male';
        
        caloriesBurned = calculateCaloriesBurned(
          finalDuration,
          finalHeartRate > 0 ? finalHeartRate : undefined,
          userWeight,
          userAge,
          userGender,
          false
        );
      }
    }

    if (finalDuration > 0) workoutToSave.duration = finalDuration;
    if (finalHeartRate > 0) workoutToSave.avgHeartRate = finalHeartRate;
    if (caloriesBurned > 0) workoutToSave.caloriesBurned = Math.round(caloriesBurned);
    if (!isCardioWorkout && totalVolume > 0) workoutToSave.totalVolume = totalVolume;

    try {
      // Clean workoutToSave of any undefined values just in case
      const cleanWorkout = JSON.parse(JSON.stringify(workoutToSave));
      
      await addDoc(collection(db, 'workouts'), cleanWorkout);
      
      // Automatically save best sets to strength records
      const dayExercises = programData[currentDay].exercises;
      for (let i = 0; i < workoutToSave.exercises.length; i++) {
        const ex = workoutToSave.exercises[i];
        const originalEx = dayExercises[i];
        
        if (ex.sets.length > 0 && originalEx) {
          // Find best set (highest weight, then highest reps)
          const isBW = originalEx.bodyweight || originalEx.isCardio || false;
          const bestSet = ex.sets.reduce((prev, curr) => {
            if (isBW) return curr.reps > prev.reps ? curr : prev;
            if (curr.weight > prev.weight) return curr;
            if (curr.weight === prev.weight && curr.reps > prev.reps) return curr;
            return prev;
          }, ex.sets[0]);

          // Calculate volume, avgWeight, setsCount, maxWeight, totalReps
          const volume = ex.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
          const totalReps = ex.sets.reduce((sum, s) => sum + s.reps, 0);
          const avgWeight = totalReps > 0 ? volume / totalReps : 0;
          const maxWeight = Math.max(...ex.sets.map(s => s.weight));
          const setsCount = ex.sets.length;

          // Save if it has some result
          const isCardio = originalEx.isCardio || programData[currentDay].isCardio || false;
          const hasResult = isCardio 
            ? (bestSet.weight > 0 || bestSet.reps > 0) 
            : (bestSet.weight > 0 || totalReps > 0 || volume > 0);

          if (hasResult) {
            const rpe = (currentRpes[currentDay] || {})[i] || 8;
            await handleSaveStrength({
              exercise: ex.name,
              weight: bestSet.weight,
              reps: bestSet.reps,
              volume,
              avgWeight,
              maxWeight,
              totalReps,
              setsCount,
              unit: originalEx.unit || (isCardio ? 'мин' : 'раз'),
              isBodyweight: originalEx.bodyweight || false,
              isCardio: isCardio,
              rpe
            });
          }
        }
      }
      
      // Reset state and move to next day
      const days = Object.keys(programData);
      const nextIdx = (days.indexOf(currentDay) + 1) % days.length;
      const nextDay = days[nextIdx];
      
      const updatedChecked = { ...checkedExercises, [currentDay]: [] };
      const updatedSets = { ...currentSets, [currentDay]: {} };
      const updatedNotes = { ...currentNotes, [currentDay]: {} };
      const updatedRpes = { ...currentRpes, [currentDay]: {} };

      // Update local state immediately
      setCurrentDay(nextDay);
      setCheckedExercises(updatedChecked);
      setCurrentSets(updatedSets);
      setCurrentNotes(updatedNotes);
      setCurrentRpes(updatedRpes);

      await saveWorkoutState({
        currentDay: nextDay,
        checkedExercises: updatedChecked,
        currentSets: updatedSets,
        currentNotes: updatedNotes,
        currentRpes: updatedRpes
      });
      
      let successMessage = '🎉 Тренировка завершена! Твой прогресс сохранен.';
      if (!isCardioWorkout && totalVolume > 0) {
        successMessage += `\nОбъем: ${totalVolume} кг`;
      }
      if (caloriesBurned > 0) {
        successMessage += `\nСожжено: ${Math.round(caloriesBurned)} ккал`;
      }

      setNotification({
        show: true,
        title: 'Отличная работа!',
        message: successMessage,
        type: 'success'
      });
      setActiveTab('progress');
    } catch (error) {
      console.error("Error finishing workout:", error);
      setNotification({
        show: true,
        title: 'Ошибка',
        message: 'Не удалось сохранить тренировку. Проверь интернет и попробуй снова. 🧘‍♀️',
        type: 'error'
      });
      handleFirestoreError(error, OperationType.CREATE, 'workouts');
    }
  };

  const handleDeleteWorkout = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление тренировки',
      message: 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'workouts', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `workouts/${id}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateTech = async (items: TechItem[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Get existing docs to delete
      const existingDocs = await getDocs(query(collection(db, 'tech'), where('userId', '==', user.uid)));
      existingDocs.forEach(doc => batch.delete(doc.ref));

      // Add new items
      items.forEach((item, index) => {
        const newDocRef = doc(collection(db, 'tech'));
        const { id, ...itemData } = item;
        batch.set(newDocRef, { ...itemData, userId: user.uid, order: index });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tech');
    }
  };

  // Weight Logic
  const handleSaveWeight = async (data: Partial<WeightMeasurement>) => {
    if (!user) return;
    try {
      const numberFields = ['weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
      const allowedFields = ['userId', 'date', 'weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bodyType', 'bodyShape', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate', 'photos'];
      
      // Filter out undefined values, 'id', and any fields not in the schema
      const cleanData = Object.fromEntries(
        Object.entries(data)
          .filter(([k, v]) => v !== undefined && k !== 'id' && allowedFields.includes(k))
          .map(([k, v]) => {
            if (numberFields.includes(k)) {
              const num = Number(v);
              return [k, isNaN(num) || !isFinite(num) ? null : num];
            }
            return [k, v];
          })
          .filter(([k, v]) => v !== null || k === 'weight') // Ensure weight is not removed
      );
      
      if (cleanData.weight === null || cleanData.weight === undefined) {
        cleanData.weight = 0;
      }
      
      let finalDate = new Date().toISOString();
      if (cleanData.date) {
        try {
          finalDate = new Date(cleanData.date).toISOString();
        } catch (e) {
          // fallback to current date if parsing fails
        }
      }

      await addDoc(collection(db, 'measurements'), {
        userId: user.uid,
        ...cleanData,
        date: finalDate
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'measurements');
    }
  };

  const handleDeleteWeight = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление замера',
      message: 'Вы уверены, что хотите удалить этот замер?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'measurements', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `measurements/${id}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateWeight = async (id: string, data: Partial<WeightMeasurement>) => {
    try {
      const numberFields = ['weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
      const allowedFields = ['userId', 'date', 'weight', 'age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bodyType', 'bodyShape', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate', 'photos'];
      
      // Filter out undefined values, 'id', and any fields not in the schema
      const cleanData = Object.fromEntries(
        Object.entries(data)
          .filter(([k, v]) => v !== undefined && k !== 'id' && allowedFields.includes(k))
          .map(([k, v]) => {
            if (numberFields.includes(k)) {
              const num = Number(v);
              return [k, isNaN(num) || !isFinite(num) ? null : num];
            }
            return [k, v];
          })
          .filter(([k, v]) => v !== null || k === 'weight') // Ensure weight is not removed
      );
      
      if (cleanData.weight === null) {
        cleanData.weight = 0;
      }
      
      if (cleanData.date) {
        try {
          cleanData.date = new Date(cleanData.date).toISOString();
        } catch (e) {
          // fallback
        }
      }

      await setDoc(doc(db, 'measurements', id), cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `measurements/${id}`);
    }
  };

  // Strength Logic
  const handleSaveStrength = async (data: Partial<StrengthRecord>) => {
    if (!user) return;
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
      );
      
      if ('weight' in cleanData) {
        cleanData.weight = isNaN(Number(cleanData.weight)) || !isFinite(Number(cleanData.weight)) ? 0 : Number(cleanData.weight);
      }
      if ('reps' in cleanData) {
        cleanData.reps = isNaN(Number(cleanData.reps)) || !isFinite(Number(cleanData.reps)) ? 0 : Number(cleanData.reps);
      }
      if ('volume' in cleanData) {
        cleanData.volume = isNaN(Number(cleanData.volume)) || !isFinite(Number(cleanData.volume)) ? 0 : Number(cleanData.volume);
      }
      if ('avgWeight' in cleanData) {
        cleanData.avgWeight = isNaN(Number(cleanData.avgWeight)) || !isFinite(Number(cleanData.avgWeight)) ? 0 : Number(cleanData.avgWeight);
      }
      if ('maxWeight' in cleanData) {
        cleanData.maxWeight = isNaN(Number(cleanData.maxWeight)) || !isFinite(Number(cleanData.maxWeight)) ? 0 : Number(cleanData.maxWeight);
      }
      if ('totalReps' in cleanData) {
        cleanData.totalReps = isNaN(Number(cleanData.totalReps)) || !isFinite(Number(cleanData.totalReps)) ? 0 : Number(cleanData.totalReps);
      }
      if ('setsCount' in cleanData) {
        cleanData.setsCount = isNaN(Number(cleanData.setsCount)) || !isFinite(Number(cleanData.setsCount)) ? 0 : Number(cleanData.setsCount);
      }

      await addDoc(collection(db, 'strength'), {
        userId: user.uid,
        date: new Date().toISOString(),
        ...cleanData
      });
      
      // Update program tip if exercise matches
      if (data.exercise) {
        await updateProgramTipWithWeight(data.exercise, cleanData);
      }
    } catch (error) {
      console.error("Error saving strength record:", error);
      handleFirestoreError(error, OperationType.CREATE, 'strength');
    }
  };

  const handleUpdateWorkout = async (id: string, data: Partial<Workout>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'workouts', id), cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workouts/${id}`);
    }
  };

  const handleDeleteStrength = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'strength', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `strength/${id}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateStrength = async (id: string, data: Partial<StrengthRecord>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      
      if ('weight' in cleanData) {
        cleanData.weight = isNaN(Number(cleanData.weight)) || !isFinite(Number(cleanData.weight)) ? 0 : Number(cleanData.weight);
      }
      if ('reps' in cleanData) {
        cleanData.reps = isNaN(Number(cleanData.reps)) || !isFinite(Number(cleanData.reps)) ? 0 : Number(cleanData.reps);
      }
      if ('volume' in cleanData) {
        cleanData.volume = isNaN(Number(cleanData.volume)) || !isFinite(Number(cleanData.volume)) ? 0 : Number(cleanData.volume);
      }
      if ('avgWeight' in cleanData) {
        cleanData.avgWeight = isNaN(Number(cleanData.avgWeight)) || !isFinite(Number(cleanData.avgWeight)) ? 0 : Number(cleanData.avgWeight);
      }
      if ('setsCount' in cleanData) {
        cleanData.setsCount = isNaN(Number(cleanData.setsCount)) || !isFinite(Number(cleanData.setsCount)) ? 0 : Number(cleanData.setsCount);
      }

      await setDoc(doc(db, 'strength', id), cleanData, { merge: true });
      
      // Update program tip if weight or exercise changed
      const record = strengthRecords.find(r => r.id === id);
      if (record) {
        const exercise = data.exercise || record.exercise;
        if (exercise) {
          await updateProgramTipWithWeight(exercise, { ...record, ...cleanData });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `strength/${id}`);
    }
  };

  // Stats
  useEffect(() => {
    if (userProfile?.goalType) {
      if (userProfile.goalType === 'hypertrophy' || userProfile.goalType === 'recomposition') {
        setChartMetric('volume');
      } else if (userProfile.goalType === 'strength') {
        setChartMetric('weight');
      } else {
        setChartMetric('reps');
      }
    }
  }, [userProfile?.goalType]);

  const streakWeeks = useMemo(() => {
    if (workouts.length === 0) return 0;
    
    // Get unique workout dates
    const workoutDates = Array.from(new Set(workouts.map(w => format(new Date(w.date), 'yyyy-MM-dd'))));
    
    if (workoutDates.length === 0) return 0;

    const now = new Date();
    let currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    let streak = 0;
    
    const hasWorkoutInWeek = (weekStart: Date) => {
      const interval = { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) };
      return workoutDates.some(dateStr => {
        const d = parseISO(dateStr);
        return isWithinInterval(d, interval);
      });
    };

    // If no workout this week AND no workout last week, streak is 0
    const lastWeekStart = subWeeks(currentWeekStart, 1);
    if (!hasWorkoutInWeek(currentWeekStart) && !hasWorkoutInWeek(lastWeekStart)) {
      return 0;
    }

    // If no workout this week but there was one last week, we start counting from last week
    if (!hasWorkoutInWeek(currentWeekStart)) {
      currentWeekStart = lastWeekStart;
    }

    while (hasWorkoutInWeek(currentWeekStart)) {
      streak++;
      currentWeekStart = subWeeks(currentWeekStart, 1);
    }

    return streak;
  }, [workouts]);

  const weekLabel = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
    return `Неделя ${weekNum} · ${format(now, 'LLLL yyyy', { locale: ru })}`;
  }, []);

  const handleExportData = async () => {
    if (!user) return;
    try {
      const exportObj = {
        profile: userProfile,
        workouts,
        measurements,
        strengthRecords,
        exportDate: new Date().toISOString(),
        version: "1.1"
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack_full_backup_${format(new Date(), 'dd-MM-yyyy')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      setNotification({
        show: true,
        title: 'Ошибка',
        message: 'Ошибка при экспорте данных.'
      });
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result as string);
        
        let count = 0;

        // Import profile
        if (imported.profile) {
          const cleanProfile: any = {};
          if (imported.profile.displayName && typeof imported.profile.displayName === 'string' && imported.profile.displayName.trim().length > 0) {
            cleanProfile.displayName = imported.profile.displayName.trim();
          }
          if (imported.profile.photoURL && typeof imported.profile.photoURL === 'string') {
            cleanProfile.photoURL = imported.profile.photoURL;
          }
          if (imported.profile.age !== undefined) {
            cleanProfile.age = imported.profile.age;
          }
          if (imported.profile.goal !== undefined) {
            cleanProfile.goal = imported.profile.goal;
          }
          if (imported.profile.createdAt && typeof imported.profile.createdAt === 'string') {
            cleanProfile.createdAt = imported.profile.createdAt;
          }
          if (Array.isArray(imported.profile.reminders)) {
            const cleanReminders = imported.profile.reminders
              .filter((r: any) => r && typeof r === 'object' && typeof r.day === 'string' && typeof r.time === 'string' && r.day.length > 0 && r.time.length > 0)
              .map((r: any) => {
                const cleanR: any = { day: r.day, time: r.time };
                if (r.label && typeof r.label === 'string') {
                  cleanR.label = r.label.substring(0, 199);
                }
                return cleanR;
              });
            cleanProfile.reminders = cleanReminders.slice(0, 20);
          }
          
          if (Object.keys(cleanProfile).length > 0) {
            await handleUpdateProfile(cleanProfile);
            count++;
          }
        }

        // Flexible import logic for other data
        const workoutsToImport = imported.workouts || (Array.isArray(imported) && imported[0]?.exercises ? imported : []);
        const measurementsToImport = imported.measurements || imported.weights || (Array.isArray(imported) && imported[0]?.weight ? imported : []);
        const strengthToImport = imported.strengthRecords || imported.strength || (Array.isArray(imported) && imported[0]?.exercise ? imported : []);

            // Import workouts
            if (workoutsToImport.length > 0) {
              for (const w of workoutsToImport) {
                const { id, sets, notes, ...data } = w;
                
                // Transform if it's the old format (sets as object, no exercises array)
                let workoutToSave: any = { ...data, userId: user.uid };
                
                if (w.sets && !w.exercises && w.day && (programData as any)[w.day]) {
                  const program = (programData as any)[w.day];
                  workoutToSave.exercises = program.exercises.map((ex: any, i: number) => {
                    const rawSets = w.sets[i] || [];
                    return {
                      name: ex.name,
                      sets: rawSets.map((s: any) => ({
                        weight: Number(s[0]) || 0,
                        reps: Number(s[1]) || 0
                      }))
                    };
                  });
                  workoutToSave.notes = typeof w.notes === 'object' ? Object.values(w.notes).join('\n') : (w.notes || '');
                } else if (w.exercises) {
                  // Already has exercises, just use them
                  workoutToSave.exercises = w.exercises;
                  workoutToSave.notes = typeof w.notes === 'object' ? Object.values(w.notes).join('\n') : (w.notes || '');
                } else {
                  // Fallback for unknown structure
                  workoutToSave.exercises = [];
                  workoutToSave.notes = '';
                }

                let validDate = new Date().toISOString();
                if (workoutToSave.date) {
                  try {
                    const d = new Date(workoutToSave.date);
                    if (!isNaN(d.getTime())) {
                      validDate = d.toISOString();
                    }
                  } catch (e) {}
                }

                const cleanWorkout: any = {
                  userId: user.uid,
                  date: validDate,
                  day: String(workoutToSave.day || 'День 1'),
                  exercises: Array.isArray(workoutToSave.exercises) 
                    ? workoutToSave.exercises.slice(0, 50).map((ex: any) => ({
                        name: String(ex.name || ''),
                        sets: Array.isArray(ex.sets) 
                          ? ex.sets.map((s: any) => ({
                              weight: isNaN(Number(s.weight)) || !isFinite(Number(s.weight)) ? 0 : Number(s.weight),
                              reps: isNaN(Number(s.reps)) || !isFinite(Number(s.reps)) ? 0 : Number(s.reps)
                            }))
                          : []
                      }))
                    : [],
                };
                if (workoutToSave.notes !== undefined && workoutToSave.notes !== null && String(workoutToSave.notes).trim() !== '') {
                  cleanWorkout.notes = String(workoutToSave.notes);
                }
                if (workoutToSave.name !== undefined && workoutToSave.name !== null && String(workoutToSave.name).trim() !== '') {
                  cleanWorkout.name = String(workoutToSave.name).substring(0, 100);
                }
                await addDoc(collection(db, 'workouts'), cleanWorkout);
                count++;
              }
            }
            
            // Import measurements
            if (measurementsToImport.length > 0) {
              for (const m of measurementsToImport) {
                const { id, ...data } = m;
                let validDate = new Date().toISOString();
                if (data.date) {
                  try {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                      validDate = d.toISOString();
                    }
                  } catch (e) {}
                }

                const cleanMeasurement: any = {
                  userId: user.uid,
                  date: validDate,
                  weight: isNaN(Number(data.weight)) || !isFinite(Number(data.weight)) ? 0 : Number(data.weight),
                };
                const optionalFields = ['age', 'fat', 'muscle', 'water', 'chest', 'waist', 'waistHigh', 'waistNavel', 'waistWidest', 'hips', 'bicep', 'thigh', 'bmi', 'visceralFat', 'skeletalMuscleIndex', 'waistHipRatio', 'bmr', 'boneMass', 'protein', 'fatFreeMass', 'biologicalAge', 'heartRate'];
                for (const field of optionalFields) {
                  if (data[field] !== undefined && data[field] !== null) {
                    const num = Number(data[field]);
                    if (!isNaN(num) && isFinite(num)) {
                      cleanMeasurement[field] = num;
                    }
                  }
                }
                const stringFields = ['bodyType', 'bodyShape'];
                for (const field of stringFields) {
                  if (data[field] !== undefined && data[field] !== null) {
                    cleanMeasurement[field] = String(data[field]);
                  }
                }
                await addDoc(collection(db, 'measurements'), cleanMeasurement);
                count++;
              }
            }

            // Import strength
            if (strengthToImport.length > 0) {
              for (const s of strengthToImport) {
                const { id, ...data } = s;
                let validDate = new Date().toISOString();
                if (data.date) {
                  try {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                      validDate = d.toISOString();
                    }
                  } catch (e) {}
                }

                const cleanStrength: any = {
                  userId: user.uid,
                  date: validDate,
                  exercise: String(data.exercise || ''),
                  weight: isNaN(Number(data.weight)) || !isFinite(Number(data.weight)) ? 0 : Number(data.weight),
                  reps: isNaN(Number(data.reps)) || !isFinite(Number(data.reps)) ? 0 : Number(data.reps),
                };
                await addDoc(collection(db, 'strength'), cleanStrength);
                count++;
              }
            }

        if (count > 0) {
          setNotification({
            show: true,
            title: 'Успешно',
            message: `✓ Импорт завершен! Загружено записей: ${count}`
          });
        } else {
          setNotification({
            show: true,
            title: 'Внимание',
            message: '⚠ Файл распознан, но данных для импорта не найдено. Проверьте структуру JSON.'
          });
        }
      } catch (error) {
        console.error("Import failed:", error);
        setNotification({
          show: true,
          title: 'Ошибка',
          message: 'Ошибка при импорте данных. Убедитесь, что файл имеет формат JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Dumbbell className="text-accent w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-surface p-6 sm:p-10 rounded-[40px] shadow-2xl border border-border"
        >
          <div className="logo text-3xl sm:text-4xl md:text-5xl mb-4 font-display font-bold text-accent leading-tight">FitTrack-Pro <br className="sm:hidden" /><span className="text-accent-2">·</span> Тренировки</div>
          <p className="text-muted mb-8 sm:mb-10 text-base sm:text-lg font-medium">Твой личный фитнес-дневник для сияющих результатов! ✨</p>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-4 bg-gradient-to-r from-accent to-accent-2 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
            >
              {isLoggingIn ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Settings size={20} />
                </motion.div>
              ) : (
                <Dumbbell size={20} />
              )}
              {isLoggingIn ? 'Вход...' : 'Войти и начать'}
            </button>
            <p className="text-[10px] text-muted uppercase tracking-widest font-bold">безопасно через google</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-24">
      {/* Header */}
      <header className="header px-4 py-3 bg-surface border-b border-border shadow-sm sticky top-0 z-40 backdrop-blur-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div 
              className={`w-11 h-11 rounded-full border border-accent/20 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm ${(userProfile?.photoURL || user?.photoURL) ? 'bg-accent/10' : 'bg-accent text-white'}`}
              onClick={() => setActiveTab('profile')}
            >
              {(userProfile?.photoURL || user?.photoURL) ? (
                <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-sm font-bold uppercase tracking-widest">
                  {(userProfile?.displayName || user?.displayName) ? (userProfile?.displayName || user?.displayName || '').split(' ').map(n => n[0]).join('').substring(0, 2) : <UserIcon size={20} />}
                </div>
              )}
            </div>
            <div 
              className="cursor-pointer flex flex-col"
              onClick={() => {
                setActiveTab('profile');
                setProfileEditMode(false);
              }}
            >
              <div className="text-xl font-display font-bold text-accent leading-tight">
                {userProfile || user ? (userProfile?.displayName || user?.displayName || 'Пользователь') : (
                  <div className="h-6 w-32 bg-accent/10 animate-pulse rounded-lg" />
                )}
              </div>
              
              <div className="flex flex-col mt-0.5">
                {userProfile?.goalType ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[10px] font-bold px-3 py-1 rounded-2xl w-fit flex items-center gap-1.5 shadow-sm ${goalTranslations[userProfile.goalType]?.color || 'bg-accent/10 text-accent'}`}
                  >
                    {goalTranslations[userProfile.goalType]?.label || userProfile.goalType}
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('profile');
                      setProfileEditMode(true);
                    }}
                    className="text-[10px] font-bold text-accent bg-accent/10 px-3 py-1 rounded-2xl w-fit hover:bg-accent/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    ✨ Добавь цель
                  </motion.div>
                )}
                <div className="text-[10px] text-muted uppercase font-semibold tracking-wider mt-1 opacity-70">{weekLabel}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              {!isOnline && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 animate-pulse">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Offline</span>
                </div>
              )}
              <div className="text-right flex flex-col items-end">
                <div className={`text-3xl font-display font-bold leading-none ${streakWeeks > 0 ? 'text-accent' : 'text-muted'}`}>{streakWeeks}</div>
                <div className="text-[8px] text-muted uppercase font-bold tracking-widest mt-0.5">недель подряд</div>
              </div>
            </div>
            
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-accent hover:border-accent/50 transition-all shadow-sm"
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-2xl mx-auto px-6 pt-6 ${activeTab === 'coach' ? 'pb-[64px]' : 'pb-20'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <TodayPage 
              currentDay={currentDay}
              setCurrentDay={setCurrentDay}
              checkedExercises={Array.isArray(checkedExercises[currentDay]) ? checkedExercises[currentDay] : []}
              setCheckedExercises={(newChecked: number[] | ((prev: number[]) => number[])) => {
                setCheckedExercises(prev => ({
                  ...prev,
                  [currentDay]: typeof newChecked === 'function' ? newChecked(Array.isArray(prev[currentDay]) ? prev[currentDay] : []) : newChecked
                }));
              }}
              currentSets={currentSets[currentDay] || {}}
              setCurrentSets={(newSets: any | ((prev: any) => any)) => {
                setCurrentSets(prev => ({
                  ...prev,
                  [currentDay]: typeof newSets === 'function' ? newSets(prev[currentDay] || {}) : newSets
                }));
              }}
              currentNotes={currentNotes[currentDay] || {}}
              setCurrentNotes={(newNotes: any | ((prev: any) => any)) => {
                setCurrentNotes(prev => ({
                  ...prev,
                  [currentDay]: typeof newNotes === 'function' ? newNotes(prev[currentDay] || {}) : newNotes
                }));
              }}
              currentRpes={currentRpes[currentDay] || {}}
              setCurrentRpes={(newRpes: any | ((prev: any) => any)) => {
                setCurrentRpes(prev => ({
                  ...prev,
                  [currentDay]: typeof newRpes === 'function' ? newRpes(prev[currentDay] || {}) : newRpes
                }));
              }}
              onFinish={handleFinishWorkout}
              workouts={workouts}
              programData={programData}
              onEditProgram={() => setShowProgramEditor(true)}
              onGoToCoach={() => setActiveTab('coach')}
              onReset={() => {
                if (Object.keys(programData).length === 0) {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Загрузка стандартной программы',
                    message: 'Вы уверены, что хотите загрузить стандартную программу? Она рассчитана на 4 дня, подходит как мужчинам, так и женщинам и направлена на развитие базового физического здоровья. После загрузки вы не сможете вернуться к выбору режима, так как программа будет активирована.',
                    onConfirm: async () => {
                      await handleUpdateProgram(DEFAULT_PROGRAM);
                      setConfirmDialog(null);
                    }
                  });
                } else {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Сброс прогресса',
                    message: 'Сбросить текущий прогресс тренировки?',
                    onConfirm: () => {
                      setCheckedExercises(prev => ({ ...prev, [currentDay]: [] }));
                      setCurrentSets(prev => ({ ...prev, [currentDay]: {} }));
                      setCurrentNotes(prev => ({ ...prev, [currentDay]: {} }));
                      setConfirmDialog(null);
                    }
                  });
                }
              }}
              isLoading={isWorkoutStateLoading || isProgramLoading}
            />
          )}
          {activeTab === 'coach' && (
            <CoachPage 
              workouts={workouts} 
              measurements={measurements} 
              strengthRecords={strengthRecords}
              messages={coachMessages}
              onAddMessage={handleAddCoachMessage}
              onClearMessages={handleClearCoachMessages}
              isLoading={isCoachLoading}
              setIsLoading={setIsCoachLoading}
              programData={programData}
              techData={techData}
              userProfile={userProfile}
              setNotification={setNotification}
              onUpdateProgram={handleUpdateProgram}
              onUpdateTech={handleUpdateTech}
              onUpdateProfile={handleUpdateProfile}
              onSaveWeight={handleSaveWeight}
            />
          )}
          {activeTab === 'progress' && (
            <ProgressPage 
              user={user}
              workouts={workouts} 
              streakWeeks={streakWeeks}
              onDelete={handleDeleteWorkout}
              onUpdate={handleUpdateWorkout}
              programData={programData}
              strengthRecords={strengthRecords}
              onSaveStrength={handleSaveStrength}
              onDeleteStrength={handleDeleteStrength}
              onUpdateStrength={handleUpdateStrength}
              measurements={measurements}
              activeSubTab={activeProgressTab}
              setActiveSubTab={setActiveProgressTab}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
              userProfile={userProfile}
            />
          )}
          {activeTab === 'measurements' && (
            <WeightPage 
              user={user}
              measurements={measurements} 
              onSave={handleSaveWeight} 
              onDelete={handleDeleteWeight}
              onUpdate={handleUpdateWeight}
              onGoToBodyProgress={() => {
                setActiveTab('progress');
                setActiveProgressTab('body');
              }}
            />
          )}
          {activeTab === 'profile' && (
            <ProfilePage 
              profile={userProfile} 
              user={user}
              onUpdate={handleUpdateProfile} 
              onLogout={handleLogout}
              setActiveTab={setActiveTab}
              onExportData={handleExportData}
              onImportData={handleImportData}
              theme={theme}
              setTheme={setTheme}
              setCoachMessages={setCoachMessages}
              setNotification={setNotification}
              onShowGuide={() => setIsGuideOpen(true)}
              isInitialEditing={profileEditMode}
              onEditModeChange={setProfileEditMode}
            />
          )}
          {activeTab === 'strength' && (
            <StrengthPage 
              records={strengthRecords}
              onSave={handleSaveStrength}
              onDelete={handleDeleteStrength}
              onUpdate={handleUpdateStrength}
              programData={programData}
              onBack={() => setActiveTab('profile')}
            />
          )}
          {activeTab === 'tech' && (
            <TechPage 
              items={techData}
              onEdit={() => setShowTechEditor(true)}
              isLoading={isTechLoading}
              onBack={() => setActiveTab('profile')}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProgramEditor && (
            <ProgramEditor 
              program={programData} 
              onSave={handleUpdateProgram} 
              onClose={() => setShowProgramEditor(false)} 
            />
          )}
          {showTechEditor && (
            <TechEditor 
              items={techData} 
              onSave={handleUpdateTech} 
              onClose={() => setShowTechEditor(false)} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Global Notification Modal */}
      <AnimatePresence>
        {notification?.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center border-4 border-accent/20"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-[30px] flex items-center justify-center text-accent mx-auto mb-6">
                <Bell size={40} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-display font-bold text-accent mb-2">{notification.title}</h3>
              <p className="text-muted mb-8 leading-relaxed">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Понятно!
              </button>
            </motion.div>
          </motion.div>
        )}

        {confirmDialog?.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center border-4 border-accent/20"
            >
              <div className="w-20 h-20 bg-accent/10 rounded-[30px] flex items-center justify-center text-accent mx-auto mb-6">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-display font-bold text-accent mb-2">{confirmDialog.title}</h3>
              <p className="text-muted mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-4 bg-surface-2 text-muted font-bold rounded-2xl active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-4 bg-accent text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  Да
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-safe pt-2 px-2 z-50 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {[
          { id: 'today', label: 'Тренировка', icon: Dumbbell },
          { id: 'coach', label: 'Коуч', icon: Bot },
          { id: 'measurements', label: 'Замеры', icon: Scale },
          { id: 'progress', label: 'Прогресс', icon: BarChart3 },
          { id: 'profile', label: 'Профиль', icon: UserIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'profile' && (activeTab === 'strength' || activeTab === 'tech'));
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-16 h-16 transition-all ${isActive ? 'text-accent' : 'text-muted hover:text-accent/70'}`}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl mb-1 transition-all`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-accent' : 'text-muted'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
