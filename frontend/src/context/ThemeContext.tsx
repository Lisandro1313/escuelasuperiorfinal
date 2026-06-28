import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'moderno' | 'clasico';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'moderno',
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'campus-theme';

const readInitial = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'clasico' || saved === 'moderno') return saved;
  } catch { /* ignore */ }
  return 'moderno';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  // Aplica el atributo en <html> para que los estilos del tema clásico
  // (definidos en classic-theme.css) tomen efecto en toda la app.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'clasico') root.setAttribute('data-theme', 'clasico');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((t) => (t === 'moderno' ? 'clasico' : 'moderno'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
