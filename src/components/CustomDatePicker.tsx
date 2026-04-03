import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  isToday,
  isValid
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose?: () => void;
  label?: string;
  showDelete?: boolean;
  onDelete?: () => void;
}

export function CustomDatePicker({ value, onChange, onClose, label, showDelete, onDelete }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getInitialDate = (val: string) => {
    if (!val) return new Date();
    const parsed = parseISO(val);
    return isValid(parsed) ? parsed : new Date();
  };

  const [selectedDate, setSelectedDate] = useState(() => getInitialDate(value));
  const [viewDate, setViewDate] = useState(selectedDate);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      const d = getInitialDate(value);
      setSelectedDate(d);
      setViewDate(d);
    }
  }, [isOpen, value]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    onChange(format(selectedDate, 'yyyy-MM-dd'));
    handleClose();
  };

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

  return (
    <div className="relative w-full">
      {label && <label className="text-[10px] text-muted uppercase font-bold block mb-2 px-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-surface-2 border-2 border-border text-text p-3 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all flex items-center justify-between"
      >
        <span>{value ? format(parseISO(value), 'd MMMM yyyy', { locale: ru }) : 'Выбрать дату'}</span>
        <CalendarIcon size={18} className="text-accent" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] bg-surface rounded-[40px] shadow-2xl z-[120] overflow-hidden border-2 border-border"
            >
              {/* Header */}
              <div className="bg-surface-2 p-8 text-text border-b border-border">
                <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">{format(selectedDate, 'yyyy')}</div>
                <div className="text-3xl font-display font-bold text-accent">
                  {format(selectedDate, 'eeeeee, d MMM.', { locale: ru })}
                </div>
              </div>

              {/* Calendar Body */}
              <div className="p-6 bg-surface">
                <div className="flex items-center justify-between mb-6 px-2">
                  <button onClick={prevMonth} className="p-2 text-muted hover:text-accent transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-sm font-bold text-text capitalize">
                    {format(viewDate, 'LLLL yyyy г.', { locale: ru })}
                  </div>
                  <button onClick={nextMonth} className="p-2 text-muted hover:text-accent transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-2">
                  {weekDays.map((day, idx) => (
                    <div key={`${day}-${idx}`} className="text-center text-[10px] font-bold text-muted py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {calendarDays.map((day, i) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    
                    return (
                      <div key={i} className="flex justify-center items-center aspect-square">
                        <button
                          onClick={() => handleDateClick(day)}
                          disabled={!isCurrentMonth}
                          className={`
                            w-9 h-9 rounded-full text-xs font-bold transition-all flex items-center justify-center
                            ${isSelected ? 'bg-accent text-white shadow-lg shadow-accent/20' : ''}
                            ${!isSelected && isCurrentMonth ? 'text-text hover:bg-surface-2' : ''}
                            ${!isCurrentMonth ? 'text-muted/20 cursor-default' : ''}
                            ${isToday(day) && !isSelected ? 'border border-accent/50 text-accent' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3">
                  <button 
                    onClick={handleConfirm}
                    className="w-full py-4 bg-accent text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-95"
                  >
                    Установить
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleClose}
                      className="flex-1 py-3 border-2 border-border text-muted font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-surface-2 transition-all"
                    >
                      Отмена
                    </button>
                    {showDelete && (
                      <button 
                        onClick={() => {
                          onDelete?.();
                          handleClose();
                        }}
                        className="flex-1 py-3 border-2 border-border text-red-500/70 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-red-500/5 transition-all"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
