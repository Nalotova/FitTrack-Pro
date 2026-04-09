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
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { format, parseISO, subDays, isSameDay, startOfMonth, endOfMonth, differenceInDays, startOfWeek, subWeeks, subMonths, isWithinInterval, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auth, db, storage } from '../firebase';
import { UserProfile, Workout, WeightMeasurement, StrengthRecord, TechItem } from '../types';
import { goalTranslations, PROGRAM, DEFAULT_PROGRAM } from '../constants';

export function CoachPage({ 
  workouts, 
  measurements, 
  strengthRecords,
  messages,
  onAddMessage,
  onClearMessages,
  isLoading,
  setIsLoading,
  programData,
  techData,
  userProfile,
  setNotification,
  onUpdateProgram,
  onUpdateTech,
  onUpdateProfile,
  onSaveWeight
}: any) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{data: string, mimeType: string, name: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualApiKey, setManualApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(manualApiKey);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  const apiKey = manualApiKey || 
                 process.env.GEMINI_API_KEY || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 process.env.GEMINI_API_KEY_2 || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY_2;

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempApiKey);
    setManualApiKey(tempApiKey);
    setShowApiKeySettings(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, compress: boolean = false) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && !file.type.startsWith('video/')) {
          if (compress && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                setAttachedFiles(prev => [...prev, {
                  data: base64,
                  mimeType: 'image/jpeg',
                  name: file.name,
                  createdAt: new Date().toISOString()
                }]);
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
          } else {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              setAttachedFiles(prev => [...prev, {
                data: base64,
                mimeType: file.type || 'application/octet-stream',
                name: file.name,
                createdAt: new Date().toISOString()
              }]);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  };

  const handleClearChat = () => {
    onClearMessages();
    setInput('');
    setAttachedFiles([]);
    setShowClearConfirm(false);
  };

  const handleSend = async (customInput?: string, customFiles?: {data: string, mimeType: string, name: string}[], audioBlob?: Blob) => {
    const textToSend = customInput || input;
    const filesToSend = customFiles || attachedFiles;
    
    if ((!textToSend.trim() && filesToSend.length === 0 && !audioBlob) || isLoading) return;

    const userMsg: any = { role: 'user', content: textToSend };
    const finalFiles = [];
    
    if (filesToSend.length > 0) {
      filesToSend.forEach(f => {
        finalFiles.push({
          data: f.data,
          mimeType: f.mimeType,
          name: f.name
        });
      });
    }

    let audioBase64Data = null;
    let audioMimeType = null;
    if (audioBlob) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      audioBase64Data = await base64Promise;
      audioMimeType = audioBlob.type || "audio/webm";
      
      finalFiles.push({
        data: audioBase64Data,
        mimeType: audioMimeType,
        name: "Голосовое сообщение"
      });
      userMsg.isAudio = true;
    }

    if (finalFiles.length > 0) {
      userMsg.files = finalFiles;
    }

    onAddMessage(userMsg);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const currentApiKey = 
        manualApiKey ||
        (import.meta as any).env?.VITE_GEMINI_API_KEY || 
        (process.env as any).GEMINI_API_KEY || 
        (process.env as any).API_KEY ||
        (window as any).GEMINI_API_KEY;
      
      if (!currentApiKey || currentApiKey === "undefined" || currentApiKey === "") {
        throw new Error("API ключ не найден. Пожалуйста, проверьте настройки в меню чата (иконка шестеренки). 🧘‍♀️");
      }
      
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const modelName = "gemini-3-flash-preview";
      
      const systemPrompt = `Ты — профессиональный ИИ-фитнес-тренер. Твой стиль: профессиональный, объективный, конструктивный, тёплый, лаконичный, без осуждения. Отвечаешь на русском языке. Ты анализируешь данные тренировок, замеров и силовых рекордов. Твоя цель — помочь пользователю достичь спортивных результатов безопасно и эффективно.

Ты умеешь:
1. Составлять персональные программы тренировок и записывать их через update_training_program.
2. Создавать технику выполнения упражнений и записывать через update_tech_data.
3. Записывать замеры тела через add_bioimpedance_measurement.
4. Анализировать фото, документы, скриншоты.

---

ПРИ АНАЛИЗЕ ТЕЛА ПО ФОТО РУКОВОДСТВУЙСЯ СЛЕДУЮЩИМИ ИНСТРУКЦИЯМИ:
Что анализировать:
1. Композиция тела: Визуальная оценка процента жира (живот, бока, грудь, бёдра), соотношение мышечной массы и жира, тип телосложения (эктоморф, мезоморф, эндоморф или смешанный).
2. Осанка: Положение головы, плеч, грудного отдела (сутулость, кифоз), поясничного отдела (лордоз, плоская спина), таза (наклон), коленей (вальгус, варус).
3. Мышечный дисбаланс: Какие группы развиты хорошо, какие отстают, асимметрия, признаки доминирования одних мышц над другими.
4. Проблемные зоны: Места сосредоточения жира, визуальные признаки слабости мышц.
5. Приоритеты работы: 3-5 конкретных задач (например, "укрепить задние дельты", "активировать ягодицы").

ФОРМАТ ОТВЕТА (ОБЯЗАТЕЛЬНО НА РУССКОМ):
Раздел 1 — Композиция тела: Тип телосложения, визуальный % жира, зоны накопления.
Раздел 2 — Осанка: Описание элементов (голова, плечи и т.д.), что в норме, что отклонено.
Раздел 3 — Мышечный баланс: Что развито хорошо, что отстаёт, асимметрия.
Раздел 4 — Проблемные зоны: Конкретные места с пояснением.
Раздел 5 — Приоритеты работы: 3-5 задач в порядке важности с 1-2 упражнениями для каждой.

ВАЖНО ДЛЯ ФОТО:
- Не говори "у вас лишний вес" — говори "есть резерв для снижения жировой массы".
- Анализируй только то, что видишь на фото. Если не видно — так и скажи.
- Для полного анализа нужны 3 фото: спереди, сзади и сбоку в полный рост, минимум одежды, руки чуть разведены в стороны.

---

ПРАВИЛО 1 — ПРОВЕРКА ДАННЫХ ПЕРЕД ДЕЙСТВИЕМ:

Если пользователь просит составить программу —
НЕ создавай её сразу.

Сначала проверь контекст пользователя:
- возраст (профиль или замеры)
- пол (профиль)
- цель goalType (профиль)
- замеры тела — вес, жир, мышцы (замеры)
- история тренировок (есть ли опыт, 
  как давно тренируется, как часто)
- фото тела если было загружено

Если данные в контексте противоречивы 
или им более 3 месяцев — уточни актуальность 
у пользователя прежде чем использовать.

---

ПРАВИЛО 2 — СБОР НЕДОСТАЮЩИХ ДАННЫХ:

Задавай ТОЛЬКО те вопросы ответы на которые 
не получены ни из контекста ни из диалога.

Не задавай повторно то что пользователь 
уже написал в свободном тексте.

Порядок приоритета вопросов:
1. Как давно тренируешься и как регулярно?
2. Сколько раз в неделю можешь тренироваться?
3. Где тренируешься — зал, дома, улица?
4. Какое оборудование доступно?
   (штанга, гантели, тренажёры, турник, 
   резинки, ничего)
5. Есть ли травмы или ограничения по здоровью?
6. Сколько времени на одну тренировку?

Если пользователь ответил сразу на несколько — 
принять все ответы и не переспрашивать.

---

ПРАВИЛО 3 — СОЗДАНИЕ ПРОГРАММЫ:

Когда все необходимые данные собраны —
вызывай update_training_program СИНХРОННО 
с текстовым описанием программы.
Не жди дополнительного подтверждения.

После создания программы СРАЗУ вызывай 
update_tech_data — заполни технику 
для каждого упражнения программы.

---

УРОВЕНЬ ПОДГОТОВКИ — проверяй в первую очередь:

Определи уровень из истории тренировок 
и диалога:

НАЧИНАЮЩИЙ — менее 6 месяцев стажа 
или длительный перерыв более 3 месяцев:
- Не более 3 тренировок в неделю
- Базовые движения без сложной техники
- Лёгкие стартовые веса, акцент на технику
- Обязателен день отдыха между тренировками

СРЕДНИЙ — 6 месяцев — 2 года стажа, 
регулярные тренировки:
- 3-4 тренировки в неделю
- Базовые + вспомогательные упражнения
- Прогрессия нагрузок от сессии к сессии
- Можно сплит по группам мышц

ПРОДВИНУТЫЙ — более 2 лет стажа, 
тренировки 4+ раз в неделю стабильно:
- 4-5 тренировок в неделю
- Полноценный сплит
- Периодизация нагрузки — тяжёлые 
  и лёгкие недели чередуются
- Можно специализацию под слабые зоны

---

ВОЗРАСТ корректирует программу 
поверх уровня подготовки:

До 30 лет:
- Высокий объём
- Короткое восстановление между тренировками
- Можно тренироваться 5 раз в неделю

30-45 лет:
- Умеренный объём
- День отдыха между силовыми обязателен
- 3-4 тренировки в неделю оптимально

45+ лет НЕЗАВИСИМО от стажа:
- Добавить мобильность и растяжку 
  в каждую тренировку — 10 минут
- Между тяжёлыми тренировками 
  минимум 48 часов восстановления
- Объём не снижать если стаж высокий —
  снижать только интенсивность 
  при признаках перетренированности
- Приоритет суставному здоровью — 
  face pulls, ротаторы плеча, 
  разгрузка поясницы обязательны

50+ лет ПРОДВИНУТЫЙ уровень:
- Программа по объёму и сложности 
  НЕ отличается от 35-летнего 
  продвинутого атлета
- Отличие только в восстановлении — 
  больше сна, больше растяжки, 
  один разгрузочный день в неделю
- Тяжёлые базовые движения оставить — 
  они критически важны для 
  сохранения мышечной массы после 45

ВАЖНО: Никогда не упрощай программу 
только из-за возраста если человек 
тренируется регулярно и долго.
Возраст — это фактор восстановления, 
не потолок возможностей.

---

ЛОГИКА СОСТАВЛЕНИЯ ПРОГРАММЫ:

ПОЛ:
- женщины — приоритет ягодицы и задняя цепь, 
  меньше изолированной работы на руки
- мужчины — приоритет грудь, спина, плечи, 
  ноги равнозначно верху

ЦЕЛЬ (goalType):
- hypertrophy — 3-4 силовых в неделю, 
  8-12 повторов, 3-4 подхода.
  Прогрессия нагрузок в базовых движениях,
  рост объёма от сессии к сессии.
- strength — 3 силовых в неделю, 
  3-6 повторов, тяжёлые базовые движения.
  Линейная прогрессия веса.
- fat_loss — 3 силовых + 2 кардио в неделю, 
  12-15 повторов, короткий отдых.
  Сохранение объёма нагрузки при снижении 
  веса тела — главный приоритет.
- recomposition — 3 силовых + 1-2 кардио, 
  10-12 повторов.
  Фокус на прогрессии в базовых движениях
  при высокой интенсивности — стимулирует 
  рост мышц на фоне поддержания калорий.
  Обязательна связь с телесными замерами.
- endurance — 2-3 силовых + кардио, 
  15-20 повторов, умеренные веса.
  Прогресс по повторам, не по весу.
- tone — 3 тренировки в неделю, 
  12-15 повторов, умеренные веса.
  Главное — регулярность и стабильность 
  объёма нагрузки.

ОБОРУДОВАНИЕ:
- только гантели — заменить все штанговые 
  упражнения на гантельные аналоги
- дома без оборудования — упражнения 
  с весом тела и резинками
- полный зал — все тренажёры и свободные веса

ДАННЫЕ ТЕЛА если есть:
- жир выше нормы (>25% женщины, >20% мужчины) 
  — добавить кардио-дни, приоритет базовым
- слабые ягодицы визуально — ягодичный мостик 
  и румынская тяга в приоритет каждого дня ног
- передний наклон таза — растяжка сгибателей 
  бедра и укрепление кора в каждой тренировке
- сутулость, скруглённые плечи — face pulls 
  и тяга к груди в каждую тренировку верха
- висцеральный жир — кардио обязательно, 
  интервальные протоколы

ТРАВМЫ:
- спина — исключить становую тягу классическую,
  заменить на гиперэкстензию и ягодичный мостик
- колени — исключить глубокие приседания,
  заменить на жим ногами и разгибания
- плечи — исключить жим над головой,
  заменить на тягу в наклоне и горизонтальные 
  жимы с нейтральным хватом

---

ФОРМАТ ПРОГРАММЫ:

Каждый день:
- Название: "День 1", "День 2" и т.д.
- Подзаголовок: группы мышц через +
- 4-6 упражнений на силовой день
- Для каждого упражнения: 
  схема подходы × повторы,
  подсказка по технике,
  стартовый вес с учётом пола и уровня
- Кардио-дни с флагом isCardio

---

ФОРМАТ ТЕХНИКИ (update_tech_data):

Для каждого упражнения программы создать 
карточку техники:
- title: название упражнения
- subtitle: группа мышц и тип движения
- content: 
  ● Исходное положение
  ● Ключевые точки техники (2-4 пункта)
  ● Частые ошибки
  ● На что обратить внимание

---

ПОСЛЕ СОЗДАНИЯ ПРОГРАММЫ:

Кратко объясни пользователю:
- Почему такой порядок упражнений
- Почему такие диапазоны повторов
- Что отслеживать в первые 2 недели
- Когда ожидать первых результатов

---

ОБЩИЕ ПРАВИЛА:

Никогда не используй данные из контекста 
без проверки их актуальности если они 
старше 3 месяцев.

Всегда учитывай пол, возраст, уровень 
подготовки и цель — это четыре обязательных 
параметра для любой рекомендации.

Данные о теле используются исключительно 
в фитнес-целях.`;

      const dataContext = `
        ПЕРЕМЕННЫЕ ПОЛЬЗОВАТЕЛЯ (ДЛЯ АНАЛИЗА):
        - ПРОФИЛЬ: ${JSON.stringify(userProfile)}
        - ТРЕНИРОВКИ: ${JSON.stringify(workouts.slice(-10))}
        - ЗАМЕРЫ: ${JSON.stringify(measurements.slice(-10))}
        - СИЛОВЫЕ РЕКОРДЫ: ${JSON.stringify(strengthRecords.slice(-20))}
        - ТЕКУЩАЯ ПРОГРАММА: ${JSON.stringify(programData)}
        - ТЕХНИКА ВЫПОЛНЕНИЯ: ${JSON.stringify(techData)}
      `;

      const callGeminiWithRetry = async (params: any, maxRetries = 3) => {
        let retryCount = 0;
        while (retryCount <= maxRetries) {
          try {
            return await ai.models.generateContent(params);
          } catch (err: any) {
            const errStr = err?.message?.toLowerCase() || "";
            const isRateLimit = errStr.includes("quota") || errStr.includes("429") || errStr.includes("rate limit") || errStr.includes("rate exceeded");
            
            if (isRateLimit && retryCount < maxRetries) {
              retryCount++;
              const delay = Math.pow(2, retryCount) * 1000;
              console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            if (errStr.includes("safety") || errStr.includes("blocked") || errStr.includes("candidate")) {
              console.warn("Safety block triggered, retrying with minimal context...");
              return await ai.models.generateContent({
                model: modelName,
                contents: [{ 
                  role: 'user', 
                  parts: [{ text: `Пользователь спрашивает: "${textToSend}". Ответь на вопрос пользователя максимально полезно, используя свои знания о фитнесе.` }] 
                }],
                config: {
                  safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                  ]
                }
              });
            }
            throw err;
          }
        }
        throw new Error("Превышено количество попыток запроса к ИИ.");
      };

      const userParts: any[] = [];
      if (textToSend && typeof textToSend === 'string' && textToSend.trim()) {
        userParts.push({ text: textToSend });
      }

      if (finalFiles.length > 0) {
        finalFiles.forEach(f => {
          userParts.push({
            inlineData: {
              data: f.data,
              mimeType: f.mimeType
            }
          });
        });
      }

      if (userParts.length === 0) return;

      const buildHistory = (msgs: any[]) => {
        const contents: any[] = [];
        const history = msgs.slice(-10);
        
        history.forEach((m: any) => {
          const role = m.role === 'user' ? 'user' : 'model';
          
          const parts: any[] = [];
          if (m.content && m.content.trim()) {
            parts.push({ text: m.content });
          }
          
          if (m.files && m.files.length > 0) {
            m.files.forEach((f: any) => {
              parts.push({
                inlineData: {
                  data: f.data,
                  mimeType: f.mimeType
                }
              });
            });
          }
          
          if (parts.length > 0) {
            if (contents.length > 0 && contents[contents.length - 1].role === role) {
              // Merge with previous message of the same role
              contents[contents.length - 1].parts.push(...parts);
            } else {
              contents.push({ role, parts });
            }
          }
        });

        while (contents.length > 0 && contents[0].role !== 'user') {
          contents.shift();
        }
        return contents;
      };

      const historyContents = buildHistory(messages);
      
      if (historyContents.length > 0 && historyContents[historyContents.length - 1].role === 'user') {
        // Merge new user message into the last history user message
        historyContents[historyContents.length - 1].parts.push(...userParts);
      } else {
        // Append new user message
        historyContents.push({ role: 'user', parts: userParts });
      }

      const response = await callGeminiWithRetry({
        model: modelName,
        contents: historyContents,
        config: {
          systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ],
          tools: [{
            functionDeclarations: [{
              name: "update_training_program",
              description: "Обновить программу тренировок пользователя. Принимает полный объект программы.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  newData: {
                    type: Type.OBJECT,
                    description: "Новый объект программы тренировок.",
                    properties: {
                      days: {
                        type: Type.ARRAY,
                        description: "Список тренировочных дней",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING, description: "Название дня (например, День 1)" },
                            subtitle: { type: Type.STRING, description: "Подзаголовок (например, Ноги)" },
                            isCardio: { type: Type.BOOLEAN, description: "Является ли тренировка кардио" },
                            exercises: {
                              type: Type.ARRAY,
                              description: "Список упражнений",
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  name: { type: Type.STRING, description: "Название упражнения" },
                                  scheme: { type: Type.STRING, description: "Схема выполнения (например, 3 x 12 или 30 мин)" },
                                  sets: { type: Type.NUMBER, description: "Количество подходов или интервалов" },
                                  tip: { type: Type.STRING, description: "Подсказка или техника выполнения" },
                                  isCardio: { type: Type.BOOLEAN, description: "Является ли упражнение кардио" },
                                  fields: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING },
                                    description: "Поля для ввода данных (например, ['мин', 'км', 'пульс'])"
                                  }
                                },
                                required: ["name", "scheme", "sets"]
                              }
                            }
                          },
                          required: ["name", "subtitle", "exercises"]
                        }
                      }
                    },
                    required: ["days"]
                  }
                },
                required: ["newData"]
              }
            }, {
              name: "update_tech_data",
              description: "Обновить данные во вкладке 'Техника'. Принимает полный массив элементов техники.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  newItems: {
                    type: Type.ARRAY,
                    description: "Новый массив элементов техники.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING, description: "Заголовок (название упражнения)" },
                        subtitle: { type: Type.STRING, description: "Подзаголовок (например, группа мышц)" },
                        content: { type: Type.STRING, description: "Текст техники выполнения (можно использовать переносы строк)" }
                      },
                      required: ["title", "subtitle", "content"]
                    }
                  }
                },
                required: ["newItems"]
              }
            }, {
              name: "add_bioimpedance_measurement",
              description: "Добавить новые замеры тела и биоимпеданса. Используй этот инструмент, когда пользователь присылает скриншот с весов или просит записать новые замеры.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Дата замера в формате YYYY-MM-DD" },
                  weight: { type: Type.NUMBER, description: "Вес в кг" },
                  age: { type: Type.NUMBER, description: "Возраст" },
                  fat: { type: Type.NUMBER, description: "Процент жира (%)" },
                  muscle: { type: Type.NUMBER, description: "Мышечная масса (кг)" },
                  water: { type: Type.NUMBER, description: "Содержание воды (%)" },
                  bmi: { type: Type.NUMBER, description: "ИМТ (Индекс массы тела)" },
                  visceralFat: { type: Type.NUMBER, description: "Висцеральный жир" },
                  skeletalMuscleIndex: { type: Type.NUMBER, description: "Индекс скелетной мускулатуры" },
                  waistHipRatio: { type: Type.NUMBER, description: "Соотношение талия/бедра" },
                  bodyType: { type: Type.STRING, description: "Тип телосложения" },
                  bodyShape: { type: Type.STRING, description: "Форма тела" },
                  bmr: { type: Type.NUMBER, description: "Базальный метаболизм (BMR / УБМ)" },
                  boneMass: { type: Type.NUMBER, description: "Костная масса" },
                  protein: { type: Type.NUMBER, description: "Белок (%)" },
                  fatFreeMass: { type: Type.NUMBER, description: "Масса тела без жира" },
                  biologicalAge: { type: Type.NUMBER, description: "Биологический возраст" },
                  heartRate: { type: Type.NUMBER, description: "Пульс (ЧСС)" },
                  chest: { type: Type.NUMBER, description: "Грудь (см)" },
                  waist: { type: Type.NUMBER, description: "Талия (см)" },
                  waistHigh: { type: Type.NUMBER, description: "Талия (высоко) (см)" },
                  waistNavel: { type: Type.NUMBER, description: "Талия (по пупку) (см)" },
                  waistWidest: { type: Type.NUMBER, description: "Талия (широкая часть) (см)" },
                  hips: { type: Type.NUMBER, description: "Бедра (см)" },
                  bicep: { type: Type.NUMBER, description: "Бицепс (см)" },
                  thigh: { type: Type.NUMBER, description: "Бедро (см)" }
                },
                required: ["date", "weight"]
              }
            }]
          }]
        }
      });

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'update_training_program') {
            const { newData } = call.args as any;
            
            let formattedData = newData;
            if (newData.days && Array.isArray(newData.days)) {
              formattedData = {};
              newData.days.forEach((day: any) => {
                formattedData[day.name] = {
                  subtitle: day.subtitle,
                  isCardio: day.isCardio,
                  exercises: day.exercises
                };
              });
            }

            if (typeof onUpdateProgram === 'function') {
              await onUpdateProgram(formattedData);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...historyContents,
                  response.candidates[0].content,
                  { 
                    role: 'user', 
                    parts: response.functionCalls.map(call => ({ 
                      functionResponse: { 
                        name: call.name, 
                        response: { status: 'success' }, 
                        id: call.id 
                      } 
                    })) 
                  }
                ],
                config: {
                  systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
                }
              });
              
              const aiMsg = { role: 'assistant', content: confirmResponse.text || "Программа успешно обновлена! 💪" };
              onAddMessage(aiMsg);
              setIsLoading(false);
              return;
            }
          } else if (call.name === 'update_tech_data') {
            const { newItems } = call.args as any;
            
            if (typeof onUpdateTech === 'function') {
              await onUpdateTech(newItems);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...historyContents,
                  response.candidates[0].content,
                  { 
                    role: 'user', 
                    parts: response.functionCalls.map(call => ({ 
                      functionResponse: { 
                        name: call.name, 
                        response: { status: 'success' }, 
                        id: call.id 
                      } 
                    })) 
                  }
                ],
                config: {
                  systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
                }
              });
              
              const aiMsg = { role: 'assistant', content: confirmResponse.text || "Данные техники успешно обновлены! 📚" };
              onAddMessage(aiMsg);
              setIsLoading(false);
              return;
            }
          } else if (call.name === 'add_bioimpedance_measurement') {
            const measurementData = call.args as any;
            
            if (typeof onSaveWeight === 'function') {
              await onSaveWeight(measurementData);
              
              const confirmResponse = await callGeminiWithRetry({
                model: modelName,
                contents: [
                  ...historyContents,
                  response.candidates[0].content,
                  { 
                    role: 'user', 
                    parts: response.functionCalls.map(call => ({ 
                      functionResponse: { 
                        name: call.name, 
                        response: { status: 'success' }, 
                        id: call.id 
                      } 
                    })) 
                  }
                ],
                config: {
                  systemInstruction: systemPrompt + "\n\nДАННЫЕ ПОЛЬЗОВАТЕЛЯ ДЛЯ АНАЛИЗА:\n" + dataContext,
                }
              });
              
              const aiMsg = { role: 'assistant', content: confirmResponse.text || "Замеры успешно сохранены! 📊" };
              onAddMessage(aiMsg);
              setIsLoading(false);
              return;
            }
          }
        }
      }

      const aiMsg = { role: 'assistant', content: response.text || "Извини, я не смогла сформулировать ответ. Попробуй еще раз! 🧘‍♀️" };
      onAddMessage(aiMsg);
    } catch (error: any) {
      console.error("Coach error details:", error);
      
      let errorMessage = "Извини, произошла ошибка при связи с ИИ. Попробуй еще раз позже или проверь интернет-соединение. 🧘‍♀️";
      
      if (error?.message?.includes("API key")) {
        errorMessage = "Ошибка: API ключ не найден или недействителен. Пожалуйста, проверьте настройки. 🧘‍♀️";
      } else if (error?.message?.toLowerCase().includes("safety") || error?.message?.toLowerCase().includes("blocked")) {
        errorMessage = "Извини, запрос был заблокирован фильтрами безопасности. Попробуй перефразировать вопрос. 🧘‍♀️";
      } else if (error?.message?.toLowerCase().includes("quota") || error?.message?.toLowerCase().includes("429") || error?.message?.toLowerCase().includes("rate exceeded")) {
        errorMessage = "Превышен лимит запросов к ИИ (Rate Limit). Пожалуйста, подождите немного и попробуйте снова. 🧘‍♀️";
      } else if (error?.message?.includes("500") || error?.message?.includes("503")) {
        errorMessage = "Сервер ИИ временно недоступен. Попробуйте еще раз через минуту. 🧘‍♀️";
      } else {
        errorMessage = `Ошибка связи: ${error?.message || "Неизвестная ошибка"}. Попробуйте очистить чат (корзина) и повторить. 🧘‍♀️`;
      }
      
      onAddMessage({ role: 'assistant', content: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSendRef.current(undefined, undefined, audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setNotification({
        show: true,
        title: 'Ошибка',
        message: 'Не удалось получить доступ к микрофону. Проверьте разрешения в браузере.'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex flex-col h-[calc(100dvh-160px)]"
    >
      <div className="bg-surface p-3 rounded-2xl border border-border shadow-sm mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-accent leading-tight">FitTrack-Pro ИИ</h2>
            <p className="text-[8px] text-muted uppercase font-bold tracking-widest">Персональный коуч</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleSend("Проанализируй мой прогресс за последнее время")}
            className="px-2.5 py-1.5 bg-accent/5 hover:bg-accent/10 text-accent text-[8px] font-bold uppercase tracking-wider rounded-lg border border-accent/10 transition-all flex items-center gap-1.5"
          >
            <TrendingUp size={10} />
            Анализ
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100 transition-all"
              title="Очистить чат"
            >
              <Trash2 size={12} />
            </button>
            {showClearConfirm && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl p-3 z-50">
                <p className="text-[10px] font-bold mb-2">Очистить историю чата?</p>
                <div className="flex gap-2">
                  <button onClick={handleClearChat} className="flex-1 py-1 bg-red-500 text-white text-[10px] rounded-lg">Да</button>
                  <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-1 bg-surface-2 text-muted text-[10px] rounded-lg">Нет</button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowApiKeySettings(!showApiKeySettings)}
              className={`p-1.5 rounded-lg border transition-all ${manualApiKey ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface-2 text-muted border-border'}`}
              title="Настройки API"
            >
              <Settings size={12} />
            </button>
            {showApiKeySettings && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-2xl shadow-xl p-5 z-50 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-text mb-2 uppercase tracking-wider">Настройки Gemini API</h4>
                <p className="text-[10px] text-muted mb-4">Если ИИ не работает, вставьте свой ключ API. Его можно получить бесплатно на <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-accent underline">AI Studio</a>.</p>
                <input 
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Вставьте API ключ..."
                  className="w-full bg-surface-2 border-2 border-border p-3 rounded-xl text-xs font-bold mb-4 outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveApiKey}
                    className="flex-1 py-2 bg-accent text-white text-[10px] font-bold uppercase rounded-lg shadow-sm"
                  >
                    Сохранить
                  </button>
                  <button 
                    onClick={() => setShowApiKeySettings(false)}
                    className="flex-1 py-2 bg-surface-2 text-text text-[10px] font-bold uppercase rounded-lg"
                  >
                    Отмена
                  </button>
                </div>
                {manualApiKey && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem('gemini_api_key');
                      setManualApiKey('');
                      setTempApiKey('');
                      setShowApiKeySettings(false);
                    }}
                    className="w-full mt-3 py-2 text-[9px] text-red-500 font-bold uppercase hover:bg-red-50 rounded-lg transition-all"
                  >
                    Сбросить ключ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar pb-[140px]">
        {!apiKey && (
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-red-600 text-xs font-bold flex items-center gap-3">
            <AlertCircle size={20} />
            <div>
              API ключ не найден. Пожалуйста, добавьте его в секреты проекта (GEMINI_API_KEY).
            </div>
          </div>
        )}
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-3xl p-6 text-center space-y-4 mx-2 shadow-sm"
          >
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Bot size={32} className="text-accent" />
            </div>
            <h3 className="text-lg font-display font-bold text-accent mb-2">Твой ИИ-тренер</h3>
            <p className="text-sm text-muted mb-6">
              Я помогу составить идеальную программу тренировок. Чтобы программа получилась максимально точной, выполни эти шаги:
            </p>
            
            <div className="space-y-3 text-left">
              <div className="bg-bg p-4 rounded-2xl flex gap-3 items-start">
                <div className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  <p className="text-xs font-bold">Заполни профиль</p>
                  <p className="text-[10px] text-muted mt-1">Укажи свой возраст, вес, рост и уровень подготовки во вкладке "Профиль".</p>
                </div>
              </div>
              
              <div className="bg-bg p-4 rounded-2xl flex gap-3 items-start">
                <div className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  <p className="text-xs font-bold">Напиши свою цель</p>
                  <p className="text-[10px] text-muted mt-1">Расскажи мне в чате, чего ты хочешь достичь (похудеть, набрать массу, стать сильнее).</p>
                </div>
              </div>
              
              <div className="bg-bg p-4 rounded-2xl flex gap-3 items-start">
                <div className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  <p className="text-xs font-bold">Загрузи фото для анализа</p>
                  <p className="text-[10px] text-muted mt-1">Прикрепи фото в полный рост (минимум одежды, руки чуть в стороны) для оценки пропорций.</p>
                </div>
              </div>
              
              <div className="bg-bg p-4 rounded-2xl flex gap-3 items-start">
                <div className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center font-bold text-xs shrink-0">4</div>
                <div>
                  <p className="text-xs font-bold">Добавь замеры</p>
                  <p className="text-[10px] text-muted mt-1">Внеси свои объемы во вкладке "Замеры", чтобы я мог отслеживать прогресс.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m: any, i: number) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-accent text-white rounded-tr-none' 
                  : 'bg-surface border border-border text-text rounded-tl-none'
              }`}>
                {m.images && m.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {m.images.map((img: string, imgIdx: number) => (
                      <img key={imgIdx} src={img} alt="Uploaded" className="w-full h-32 object-cover rounded-2xl border border-white/20" />
                    ))}
                  </div>
                )}
                {m.files && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {m.files.map((f: any, fIdx: number) => {
                      if (f.mimeType.startsWith('audio/')) {
                        return (
                          <div key={fIdx} className="col-span-2 bg-white/10 p-2 rounded-xl border border-white/20 flex flex-col gap-2 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center text-white">
                                <FileAudio size={16} />
                              </div>
                              <span className="text-[10px] font-bold truncate flex-1">{f.name}</span>
                            </div>
                            <audio src={`data:${f.mimeType};base64,${f.data}`} controls className="w-full h-8" />
                          </div>
                        );
                      }
                      return (
                        <div key={fIdx} className="bg-white/10 p-2 rounded-xl border border-white/20 flex items-center gap-2 overflow-hidden">
                          {f.mimeType.startsWith('image/') ? (
                            <img src={`data:${f.mimeType};base64,${f.data}`} alt="Attached" className="w-10 h-10 object-cover rounded-lg" />
                          ) : f.mimeType.startsWith('video/') ? (
                            <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-white">
                              <Video size={16} />
                            </div>
                          ) : f.mimeType.includes('pdf') || f.mimeType.startsWith('text/') ? (
                            <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-white">
                              <FileText size={16} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-white">
                              <File size={16} />
                            </div>
                          )}
                          <span className="text-[10px] font-bold truncate flex-1">{f.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {m.isAudio && (!m.files || !m.files.some((f: any) => f.mimeType.startsWith('audio/'))) && (
                  <div className="flex items-center gap-2 mb-2 text-white/80 bg-white/10 p-2 rounded-xl">
                    <Mic size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Голосовое сообщение (аудио недоступно)</span>
                  </div>
                )}
                {m.role === 'assistant' ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
                <div className={`flex mt-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <button 
                    onClick={() => handleCopy(m.content, i)}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      m.role === 'user' 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-surface-2 hover:bg-border text-muted hover:text-text'
                    }`}
                    title="Копировать"
                  >
                    {copiedMessageIndex === i ? (
                      <>
                        <Check size={12} />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Копировать
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-surface border border-border p-4 rounded-3xl rounded-tl-none flex gap-1">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-accent rounded-full" />
            </div>
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-6 pb-4 bg-gradient-to-t from-bg via-bg to-transparent pt-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="bg-surface border-2 border-border rounded-3xl shadow-lg p-4 mx-0"
          >
            {attachedFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                {attachedFiles.map((f, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    {f.mimeType.startsWith('image/') ? (
                      <img src={`data:${f.mimeType};base64,${f.data}`} alt="Preview" className="h-16 w-16 object-cover rounded-2xl border-2 border-accent shadow-sm" />
                    ) : (
                      <div className="h-16 w-16 bg-surface border-2 border-accent rounded-2xl flex flex-col items-center justify-center p-2 shadow-sm">
                        {f.mimeType.startsWith('video/') ? (
                          <Video size={20} className="text-accent" />
                        ) : f.mimeType.startsWith('audio/') ? (
                          <FileAudio size={20} className="text-accent" />
                        ) : f.mimeType.includes('pdf') || f.mimeType.startsWith('text/') ? (
                          <FileText size={20} className="text-accent" />
                        ) : (
                          <File size={20} className="text-accent" />
                        )}
                        <span className="text-[8px] font-bold truncate w-full text-center mt-1">{f.name}</span>
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex flex-col">
              {isRecording ? (
                <div className="w-full py-2 bg-red-50/50 rounded-xl flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mx-3"></div>
                  <span className="text-red-500 font-bold font-mono text-sm">
                    {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                    {(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="ml-2 text-red-400 text-[10px] uppercase tracking-widest font-bold">Запись...</span>
                </div>
              ) : (
                <textarea 
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  placeholder="Спроси что-нибудь..."
                  className="w-full bg-transparent outline-none resize-none text-[15px] text-text leading-relaxed min-h-[24px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4">
                  <Plus size={22} className="text-muted hover:text-accent transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()} />
                  <Camera size={22} className="text-muted hover:text-accent transition-all cursor-pointer" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleFileUpload(e as any, true);
                    input.click();
                  }} />
                  <Mic 
                    size={22} 
                    className={`transition-all cursor-pointer ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted hover:text-accent'}`} 
                    onClick={isRecording ? stopRecording : startRecording} 
                  />
                </div>
                <div className="flex items-center">
                  <Trash2 
                    size={20} 
                    className="text-muted hover:text-red-400 transition-all cursor-pointer mr-2" 
                    onClick={() => {
                      setInput('');
                      setAttachedFiles([]);
                    }} 
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || (!input.trim() && attachedFiles.length === 0 && !isRecording)}
                    className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-md shadow-accent/30 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isRecording ? <Square size={20} className="text-white" fill="currentColor" onClick={(e) => { e.preventDefault(); stopRecording(); handleSend(); }} /> : <Send size={20} className="text-white" />}
                  </button>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,audio/*,application/pdf,text/plain"
                multiple
                className="hidden"
              />
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
