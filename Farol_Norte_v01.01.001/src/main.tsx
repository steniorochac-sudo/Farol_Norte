import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// Importando os Provedores TypeScript
import { FinanceProvider } from './context/FinanceContext'
import { runMigrations } from './services/Migrations'
import { ThemeProvider } from './context/ThemeContext'

import 'bootstrap/dist/css/bootstrap.min.css' 
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

runMigrations();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* Envolvendo o App com a nuvem de dados */}
    <ThemeProvider>
      <FinanceProvider>
        <App />
      </FinanceProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
