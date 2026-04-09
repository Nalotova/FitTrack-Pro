export const goalTranslations: Record<string, { label: string; color: string }> = {
  hypertrophy: { label: '💪 Гипертрофия', color: 'bg-accent/20 text-accent' },
  strength: { label: '🏋️ Сила', color: 'bg-accent-2/20 text-accent-2' },
  fat_loss: { label: '🔥 Жиросжигание', color: 'bg-red-500/20 text-red-500' },
  recomposition: { label: '⚡ Рекомпозиция', color: 'bg-yellow-500/20 text-yellow-500' },
  endurance: { label: '🏃 Выносливость', color: 'bg-blue-500/20 text-blue-500' },
  tone: { label: '🌿 Тонус', color: 'bg-green-500/20 text-green-500' },
};

export const PROGRAM: Record<string, { subtitle: string; isCardio?: boolean; exercises: any[] }> = {};

export const DEFAULT_PROGRAM: Record<string, { subtitle: string; isCardio?: boolean; exercises: any[] }> = {
  "День 1": {
    "subtitle": "Блок 1 (Ноги, Плечи, Икры, Пресс)",
    "exercises": [
      { "name": "Приседания", "scheme": "3 × 15-20", "sets": 3, "tip": "Разминка 3 уровня обязательна!" },
      { "name": "Жим гантелей стоя (армейский жим)", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Выпады", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Тяга штанги к подбородку", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Подъем на носки", "scheme": "3 × 15-20", "sets": 3, "tip": "Если икры большие, можно пропустить" },
      { "name": "Скручивания", "scheme": "3 × 15-20", "sets": 3, "tip": "", "bodyweight": true, "unit": "раз" }
    ]
  },
  "День 2": {
    "subtitle": "Блок 2 (Спина, Грудь, Руки)",
    "exercises": [
      { "name": "Тяга штанги в наклоне обратным хватом", "scheme": "3 × 15-20", "sets": 3, "tip": "Разминка 3 уровня обязательна!" },
      { "name": "Жим штанги на горизонтальной скамье", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Подтягивания обратным хватом / Гравитрон", "scheme": "3 × 15-20", "sets": 3, "tip": "Либо тяга вертикального блока (широкая рукоять)" },
      { "name": "Жим гантелей под углом 30 градусов", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Подъем штанги на бицепс", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Разгибание руки в наклоне (трицепс)", "scheme": "3 × 15-20", "sets": 3, "tip": "" }
    ]
  },
  "День 3": {
    "subtitle": "Блок 3 (Ноги, Плечи, Икры, Пресс)",
    "exercises": [
      { "name": "Жим платформы", "scheme": "3 × 15-20", "sets": 3, "tip": "Разминка 3 уровня обязательна!" },
      { "name": "Разведение через стороны", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Мертвая тяга / Разгибание ног", "scheme": "3 × 15-20", "sets": 3, "tip": "Дамы: Мертвая тяга. Юноши: Разгибание ног." },
      { "name": "Тяга с верхнего блока к подбородку", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Икры сидя", "scheme": "3 × 15-20", "sets": 3, "tip": "Если икры большие, можно пропустить" },
      { "name": "Книжка (пресс)", "scheme": "3 × 15-20", "sets": 3, "tip": "", "bodyweight": true, "unit": "раз" }
    ]
  },
  "День 4": {
    "subtitle": "Блок 4 (Спина, Грудь, Руки)",
    "exercises": [
      { "name": "Тяга вертикального блока перед собой (узкая рукоятка)", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Жим узким хватом", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Тяга горизонтального блока (узкая рукоятка)", "scheme": "3 × 15-20", "sets": 3, "tip": "" },
      { "name": "Отжимания от пола", "scheme": "3 × 15-20", "sets": 3, "tip": "", "bodyweight": true, "unit": "раз" },
      { "name": "Отжимания на брусьях / от скамьи (обратные)", "scheme": "3 × 15-20", "sets": 3, "tip": "", "bodyweight": true, "unit": "раз" },
      { "name": "Подъем гантелей на бицепс стоя", "scheme": "3 × 15-20", "sets": 3, "tip": "" }
    ]
  }
};
