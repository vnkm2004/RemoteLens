import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Support ONLY 'light' and 'dark' (Clean Black & Clean White)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Default to clean dark
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark', 'theme-forest');
      root.style.colorScheme = 'light';
      root.style.backgroundColor = '#ffffff';
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#000000';
    } else {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light', 'theme-forest');
      root.style.colorScheme = 'dark';
      root.style.backgroundColor = '#000000';
      body.style.backgroundColor = '#000000';
      body.style.color = '#ffffff';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
