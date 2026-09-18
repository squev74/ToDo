import { RecurrenceConfig } from '../types/recurringTask';

/**
 * Calcule le N-ième jour de la semaine d'un mois cible (ex: le 1er lundi, le dernier vendredi)
 */
export function getSpecificWeekdayOfMonth(
  year: number,
  month: number, // 0-11
  index: 'first' | 'second' | 'third' | 'last',
  dayOfWeek: number // 0-6 (0=Dimanche, 1=Lundi, etc.)
): Date {
  if (index === 'last') {
    // Commence au dernier jour du mois
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
    const lastDayOfWeek = lastDay.getDay();
    let diff = lastDayOfWeek - dayOfWeek;
    if (diff < 0) {
      diff += 7;
    }
    lastDay.setDate(lastDay.getDate() - diff);
    return lastDay;
  } else {
    // Commence au 1er jour du mois
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const firstDayOfWeek = firstDay.getDay();
    let diff = dayOfWeek - firstDayOfWeek;
    if (diff < 0) {
      diff += 7;
    }
    const firstOccurrence = 1 + diff;
    let targetDay = firstOccurrence;
    if (index === 'second') {
      targetDay += 7;
    } else if (index === 'third') {
      targetDay += 14;
    }
    return new Date(year, month, targetDay, 12, 0, 0);
  }
}

/**
 * Fonction pure pour calculer la prochaine date d'échéance à partir d'une date courante et d'une configuration
 */
export function calculateNextDueDate(currentDueDate: Date, recurrenceConfig: RecurrenceConfig): Date {
  const nextDate = new Date(currentDueDate);
  const {
    frequency,
    interval = 1,
    quarterlyOption = 'same_day',
    dayOfWeek,
    dayOfMonth,
    specificDayIndex,
    specificDayWeek,
  } = recurrenceConfig;

  switch (frequency) {
    case 'daily': {
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    }

    case 'weekly': {
      nextDate.setDate(nextDate.getDate() + 7 * interval);
      if (dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay();
        const diff = (dayOfWeek - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + diff);
      }
      break;
    }

    case 'monthly': {
      const targetDay = dayOfMonth ?? currentDueDate.getDate();
      nextDate.setDate(1); // Évite les débordements de setMonth
      nextDate.setMonth(nextDate.getMonth() + interval);
      const maxDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, maxDays));
      break;
    }

    case 'quarterly': {
      const monthsToAdd = 3 * interval;
      if (quarterlyOption === 'same_day') {
        const targetDay = dayOfMonth ?? currentDueDate.getDate();
        nextDate.setDate(1); // Évite les débordements de setMonth
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
        const maxDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(targetDay, maxDays));
      } else {
        // Option specific_day
        nextDate.setDate(1);
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
        const targetYear = nextDate.getFullYear();
        const targetMonth = nextDate.getMonth();
        const targetDayOfWeek = specificDayWeek !== undefined ? specificDayWeek : (dayOfWeek !== undefined ? dayOfWeek : 1);
        const targetIndex = specificDayIndex || 'first';
        const specificDate = getSpecificWeekdayOfMonth(targetYear, targetMonth, targetIndex, targetDayOfWeek);
        nextDate.setTime(specificDate.getTime());
      }
      break;
    }

    case 'yearly': {
      const currentMonth = nextDate.getMonth();
      const currentDate = nextDate.getDate();
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      // Gérer le 29 février pour les années non-bissextiles
      if (currentMonth === 1 && currentDate === 29) {
        const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeap(nextDate.getFullYear())) {
          nextDate.setMonth(1);
          nextDate.setDate(28);
        }
      }
      break;
    }
  }

  return nextDate;
}
