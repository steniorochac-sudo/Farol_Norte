// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Importando o nosso Provedor de Dados
import { FinanceProvider } from './context/FinanceContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

import 'bootstrap/dist/css/bootstrap.min.css' 
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import { loadSavedTheme } from './utils/themeManager.js' // 1. IMPORTA THEME MANAGER

// 2. CHAMA O CARREGAMENTO DO TEMA SALVO ANTES DE RENDERIZAR O APP
loadSavedTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Envolvendo o App com a nuvem de dados */}
    <ThemeProvider>
      <FinanceProvider>
        <App />
      </FinanceProvider>
    </ThemeProvider>
  </React.StrictMode>,
)