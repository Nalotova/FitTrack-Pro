import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Dumbbell, BarChart2, Camera, Utensils } from 'lucide-react';

interface SuggestedActionsProps {
  onAction: (action: string) => void;
}

const actions = [
  { label: 'Обновить программу', icon: Dumbbell, prompt: 'Помоги мне обновить мою программу тренировок.' },
  { label: 'Анализ прогресса', icon: BarChart2, prompt: 'Проанализируй мой прогресс за последний месяц.' },
  { label: 'Анализ техники', icon: Camera, prompt: 'Я хочу прислать видео для анализа техники.' },
  { label: 'Совет по питанию', icon: Utensils, prompt: 'Дай совет по питанию на сегодня.' },
];

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({ onAction }) => {
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {actions.map((action) => (
        <motion.button
          key={action.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.prompt)}
          className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-full text-xs font-medium text-text hover:bg-accent hover:text-white transition-colors"
        >
          <action.icon size={14} />
          {action.label}
        </motion.button>
      ))}
    </div>
  );
};
