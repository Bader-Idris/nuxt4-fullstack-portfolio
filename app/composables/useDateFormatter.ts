import { useI18n } from 'vue-i18n';

export const useDateFormatter = () => {
  const { locale } = useI18n();

  /**
   * Formats a date using a separator (e.g., YYYY-MM-DD).
   */
  const formatDateSeparator = (date: string | Date, separator: string = '-'): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return [year, month, day].join(separator);
  };

  /**
   * Formats a date as "Today", "Yesterday", or the full date.
   */
  const formatDateRelative = (date: string | Date): string => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return new Intl.DateTimeFormat(locale.value, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  };

  /**
   * Formats a date in a human-readable "short" style, locale-aware.
   */
  const formatDateShort = (date: string | Date): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    return new Intl.DateTimeFormat(locale.value, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);
  };

  return {
    formatDateSeparator,
    formatDateRelative,
    formatDateShort
  };
};
