import React from 'react'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

// =========================================================
// TIPOS
// =========================================================

type ThemeType = 'farol-norte' | 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
}

interface ThemeProviderProps {
  children: ReactNode
}

// =========================================================
// CONTEXTO
// =========================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app_theme') || 'farol-norte'
    return saved as ThemeType
  })

  // Sincroniza tema com localStorage, DOM e status bar do celular
  useEffect(() => {
    // Salva a preferência no localStorage
    localStorage.setItem('app_theme', theme)

    // Injeta o tema na tag <html> para o CSS reconhecer
    document.documentElement.setAttribute('data-theme', theme)

    // Ajusta a cor da barra do celular dependendo do tema
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      const color = theme === 'farol-norte' ? '#0B1E2D' : '#F8F9FA'
      metaThemeColor.setAttribute('content', color)
    }
  }, [theme])

  const setTheme = (newTheme: ThemeType): void => {
    setThemeState(newTheme)
  }

  const value: ThemeContextType = { theme, setTheme }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook customizado com tipagem para usar o contexto
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error(
      '❌ useTheme deve ser usado dentro de um ThemeProvider'
    )
  }
  return context
}
