
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'farol-norte');

    useEffect(() => {
        // Salva a preferência
        localStorage.setItem('app_theme', theme);
        // Injeta o tema na tag <html> para o CSS reconhecer
        document.documentElement.setAttribute('data-theme', theme);
        
        // Ajusta a cor da barra do celular dependendo do tema
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'farol-norte' ? '#0B1E2D' : '#F8F9FA');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);