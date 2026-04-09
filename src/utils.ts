import { StrengthRecord } from './types';

export const calculateExerciseGoal = (
  exDef: any,
  history: StrengthRecord[],
  goalType: string
) => {
  if (history.length === 0) return null;
  
  const last = history[0];
  const prev = history[1];
  const prev2 = history[2];
  
  // Extract reps range from scheme (e.g., "3 × 15-20" or "3 × 15")
  const schemeMatch = exDef?.scheme?.match(/(\d+)\s*-\s*(\d+)/);
  const singleMatch = exDef?.scheme?.match(/×\s*(\d+)/);
  const minReps = schemeMatch ? parseInt(schemeMatch[1]) : (singleMatch ? parseInt(singleMatch[1]) : (last.reps || 12));
  const maxReps = schemeMatch ? parseInt(schemeMatch[2]) : (singleMatch ? parseInt(singleMatch[1]) : (last.reps || 15));
  
  // RPE Adjustment (Rate of Perceived Exertion)
  const rpe = last.rpe || 8;
  
  // Determine if it's an isolation exercise
  const isIsolation = /махи|разведения|бицепс|трицепс|разгибания|сгибания|икры|пресс|скручивания/i.test(exDef?.name || '');
  
  // Plateau detection (3 sessions without progress)
  const isPlateau = prev && prev2 && 
    (last.volume || 0) <= (prev.volume || 0) && 
    (prev.volume || 0) <= (prev2.volume || 0);

  if (isPlateau) {
    return {
      type: 'deload',
      label: 'Разгрузка',
      message: 'Плато! Снизь вес на 20% для восстановления',
      weight: Math.round(last.weight * 0.8 * 2) / 2,
      reps: maxReps,
      volume: last.volume ? last.volume * 0.7 : 0
    };
  }

  // Cardio Progression
  if (exDef?.isCardio || last.isCardio) {
    const currentMins = last.weight; // weight field used for minutes in cardio
    const currentPulse = last.reps; // reps field used for pulse in cardio
    
    // Increase duration by 1-2 minutes if RPE is low
    const nextMins = rpe <= 7 ? currentMins + 2 : (rpe >= 9 ? currentMins : currentMins + 1);
    
    return {
      type: 'progression',
      label: 'Прогрессия',
      message: rpe <= 7 ? 'Отлично! Добавь 2 минуты' : 'Хороший темп! Добавь 1 минуту',
      weight: nextMins,
      reps: currentPulse,
      volume: nextMins * currentPulse
    };
  }

  // Double Progression Logic
  if (last.reps < maxReps) {
    // Goal: Increase reps at current weight
    const nextReps = rpe <= 7 ? Math.min(maxReps, last.reps + 2) : Math.min(maxReps, last.reps + 1);
    return {
      type: 'progression',
      label: 'Прогрессия',
      message: `Добавь ${nextReps - last.reps} ${nextReps - last.reps === 1 ? 'повтор' : 'повтора'}`,
      weight: last.weight,
      reps: nextReps,
      volume: last.weight * nextReps
    };
  } else {
    // Goal: Increase weight or stabilize
    if (rpe >= 9) {
      return {
        type: 'stabilize',
        label: 'Стабилизация',
        message: 'Тяжело! Закрепи результат на этом весе',
        weight: last.weight,
        reps: minReps,
        volume: last.weight * minReps
      };
    }

    const weightInc = isIsolation ? 1 : 2.5;
    const nextWeight = last.weight + weightInc;
    return {
      type: 'progression',
      label: 'Прогрессия',
      message: `Добавь ${weightInc}кг`,
      weight: nextWeight,
      reps: minReps,
      volume: nextWeight * minReps
    };
  }

  // If RPE is very high (9-10), don't increase, just stabilize
  if (rpe >= 9) {
    return {
      type: 'stabilize',
      label: 'Закрепление',
      message: 'Тяжело! Закрепи результат с тем же весом',
      weight: last.weight,
      reps: last.reps,
      volume: last.volume || 0
    };
  }

  // Double Progression Logic
  if (last.reps < maxReps) {
    // Add reps first
    const step = rpe <= 6 ? 2 : 1;
    const newReps = Math.min(last.reps + step, maxReps);
    return {
      type: 'reps',
      label: 'Прогресс',
      message: `Цель: +${newReps - last.reps} повтор (${newReps})`,
      weight: last.weight,
      reps: newReps,
      volume: (last.volume || 0) * (newReps / (last.reps || 1))
    };
  } else {
    // Increase weight
    const increment = isIsolation ? 1 : 2.5;
    return {
      type: 'weight',
      label: 'Прогресс',
      message: `Цель: +${increment}кг`,
      weight: last.weight + increment,
      reps: minReps,
      volume: (last.weight + increment) * minReps * (last.setsCount || 3)
    };
  }
};
