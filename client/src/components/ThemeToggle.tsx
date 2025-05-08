
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 p-2 rounded-full neumorphic transition-all duration-300 ease-in-out hover:scale-110"
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <span className="text-xl emoji-pulse">🌙</span>
      ) : (
        <span className="text-xl emoji-pulse">🌞</span>
      )}
    </button>
  );
};

export default ThemeToggle;
