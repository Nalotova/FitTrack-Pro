import fs from 'fs';

const missingCode = `
  const [selectedMeasure1, setSelectedMeasure1] = useState<string>('');
  const [selectedMeasure2, setSelectedMeasure2] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isDropdown1Open, setIsDropdown1Open] = useState(false);
  const [isDropdown2Open, setIsDropdown2Open] = useState(false);
  const dropdown1Ref = useRef<HTMLDivElement>(null);
  const dropdown2Ref = useRef<HTMLDivElement>(null);

  const [activityPeriod, setActivityPeriod] = useState<'8w' | '6m' | 'all'>('8w');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdown1Ref.current && !dropdown1Ref.current.contains(event.target as Node)) {
        setIsDropdown1Open(false);
      }
      if (dropdown2Ref.current && !dropdown2Ref.current.contains(event.target as Node)) {
        setIsDropdown2Open(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedMeasure1 || !selectedMeasure2) return;
    
    const m1 = measurements.find(m => m.id === selectedMeasure1);
    const m2 = measurements.find(m => m.id === selectedMeasure2);
    
    if (!m1 || !m2) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const getBase64 = async (urlOrData: string) => {
        if (urlOrData.startsWith('data:image')) {
          return urlOrData.split(',')[1];
        }
        const response = await fetch(urlOrData);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      };

      const hasPhotos = m1.photos?.length && m2.photos?.length;
      let photos1: string[] = [];
      let photos2: string[] = [];

      if (hasPhotos) {
        photos1 = await Promise.all(m1.photos!.map(url => getBase64(url)));
        photos2 = await Promise.all(m2.photos!.map(url => getBase64(url)));
      }

      const prompt = \`Проанализируй прогресс между двумя замерами.
      
      Замер 1 (до): Дата \${format(new Date(m1.date), 'd MMMM yyyy', { locale: ru })}, Вес \${m1.weight || 'нет данных'} кг, Жир \${m1.fat || 'нет данных'}%, Мышцы \${m1.muscle || 'нет данных'} кг.
      Замер 2 (после): Дата \${format(new Date(m2.date), 'd MMMM yyyy', { locale: ru })}, Вес \${m2.weight || 'нет данных'} кг, Жир \${m2.fat || 'нет данных'}%, Мышцы \${m2.muscle || 'нет данных'} кг.
      
      \${hasPhotos ? 'Я также прикрепил фото "До" и "После". Сравни их визуально и отметь изменения в композиции тела, рельефе и пропорциях.' : 'Фотографии для визуального сравнения недоступны. Проанализируй только цифровые показатели.'}
      
      Дай профессиональную оценку прогресса и рекомендации по дальнейшим тренировкам и питанию. Отвечай на русском языке в стиле фитнес-коуча. Используй Markdown для форматирования.\`;

      const parts: any[] = [{ text: prompt }];

      if (hasPhotos) {
        parts.push(...photos1.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } })));
        parts.push(...photos2.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } })));
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
      });

      setAnalysisResult(response.text || "Не удалось получить анализ.");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisError("Ошибка при анализе. Попробуйте позже.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = workouts.filter(w => {
      const d = new Date(w.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return {
      total: workouts.length,
      thisMonth,
      streak: streakWeeks
    };
  }, [workouts, streakWeeks]);

  const activityData = useMemo(() => {
    const now = new Date();
    const data = [];

    if (activityPeriod === '8w') {
      if (workouts.length < 4) return [];
      const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstWorkoutDate = new Date(sortedWorkouts[0].date);
      
      let weeksDiff = Math.ceil((now.getTime() - firstWorkoutDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      if (weeksDiff < 2) weeksDiff = 2; // Show at least 2 points for a line
      if (weeksDiff > 8) weeksDiff = 8;
      
      for (let i = weeksDiff - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        }).length;
        data.push({ 
          name: format(weekStart, 'd MMM', { locale: ru }), 
          count,
          isActive: count >= 2
        });
      }
    } else if (activityPeriod === '6m') {
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        }).length;
        data.push({ name: format(monthStart, 'MMM', { locale: ru }), count, isActive: count >= 4 });
      }
    } else if (activityPeriod === 'all') {
      if (workouts.length === 0) return [];
      const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstDate = new Date(sortedWorkouts[0].date);
      const start = startOfMonth(firstDate);
      const end = startOfMonth(now);
      
      let current = start;
      while (current <= end) {
        const mStart = startOfMonth(current);
        const mEnd = endOfMonth(current);
        const count = workouts.filter(w => {
          const d = new Date(w.date);
          return isWithinInterval(d, { start: mStart, end: mEnd });
        }).length;
        data.push({ name: format(mStart, 'MMM', { locale: ru }), count, isActive: count >= 4 });
        // Add one month
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }
    return data;
  }, [workouts, activityPeriod]);

  const cardioStats = useMemo(() => {
    let totalMinutes = 0;
    let totalCalories = 0;
    
    // Get latest weight from measurements
    const latestWeight = measurements && measurements.length > 0 
      ? [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].weight || 70
      : 70;
    
    const age = Number(userProfile?.age) || 30;
    const gender = userProfile?.gender || 'male';

    workouts.forEach(w => {
      if (!w.exercises) return;
      w.exercises.forEach(ex => {
        // Check if it's cardio (either by flag or by checking program data for old records)
        const isCardio = ex.isCardio || Object.values(programData || {}).some((day: any) => 
          day.exercises?.some((pEx: any) => pEx.name === ex.name && (pEx.isCardio || day.isCardio))
        );

        if (isCardio) {
          ex.sets?.forEach(set => {
            const values = set.cardioValues || [set.weight, set.reps];
            const fields = ex.fields || ["мин", "пульс"];
            
            const minIdx = fields.indexOf("мин");
            const pulseIdx = fields.indexOf("пульс");
            const kcalIdx = fields.indexOf("ккал");
            
            const mins = minIdx !== -1 ? (Number(values[minIdx]) || 0) : 0;
            const pulse = pulseIdx !== -1 ? (Number(values[pulseIdx]) || 0) : 0;
            const manualKcal = kcalIdx !== -1 ? (Number(values[kcalIdx]) || 0) : 0;
            
            totalMinutes += mins;
            
            let setKcal = 0;
            if (manualKcal > 0) {
              setKcal = manualKcal;
            } else if (mins > 0 && pulse > 0) {
              // Formula based on heart rate (Keytel et al. 2005)
              if (gender === 'female') {
                setKcal = ((-20.4022 + (0.4472 * pulse) - (0.1263 * latestWeight) + (0.074 * age)) / 4.184) * mins;
              } else {
                setKcal = ((-55.0969 + (0.6309 * pulse) + (0.1988 * latestWeight) + (0.2017 * age)) / 4.184) * mins;
              }
            } else if (mins > 0) {
              // Formula based on MET (average 7.5 for general cardio)
              setKcal = 0.0175 * 7.5 * latestWeight * mins;
            }
            
            totalCalories += Math.max(0, setKcal);
          });
        }
      });
    });
    
    const fatBurned = totalCalories / 7700;
    const progressPct = (totalCalories % 7700) / 7700 * 100;
    
    return {
      totalMinutes,
      totalCalories: Math.round(totalCalories),
      fatBurned: fatBurned.toFixed(2),
      progressPct
    };
  }, [workouts, measurements, userProfile]);
`;

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace('  return (\n    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24">', missingCode + '\n  return (\n    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24">');
fs.writeFileSync('src/App.tsx', content);
console.log('Restored missing code');
