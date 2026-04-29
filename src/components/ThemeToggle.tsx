'use client';

import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  className?: string;
  showLabel?: boolean;
};

export default function ThemeToggle({ className = '', showLabel = false }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`flex items-center gap-2 text-gray-300 hover:text-primary transition ${className}`}
    >
      {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
      {showLabel && (
        <span className="text-sm">{isDark ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  );
}
