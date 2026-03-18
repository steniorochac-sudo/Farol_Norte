import React from 'react'
import { createContext, useContext, useState, ReactNode, useMemo } from 'react'
import type { Transaction, Account, Category } from '../types/index'
import { db, accountsDb, categoryDb } from '../services/DataService'

// =========================================================
// TIPOS
// =========================================================

interface FinanceContextType {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  currentAccountId: string
  changeAccount: (accountId: string) => void
  refreshData: () => void
}

interface FinanceProviderProps {
  children: ReactNode
}

// =========================================================
// CONTEXTO
// =========================================================

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: FinanceProviderProps) {
  // Lazy Initialization: Carrega dados do localStorage apenas UMA VEZ
  const [transactions, setTransactions] = useState<Transaction[]>(() => db.getAll())
  const [accounts, setAccounts] = useState<Account[]>(() => accountsDb.getAll())
  const [categories, setCategories] = useState<Category[]>(() => categoryDb.getAll())
  const [currentAccountId, setCurrentAccountId] = useState<string>(() =>
    localStorage.getItem('selectedAccountId') || 'all'
  )

  // Função para recarregar dados (chamada após importar CSV ou adicionar transação)
  const refreshData = (): void => {
    setTransactions(db.getAll())
    setAccounts(accountsDb.getAll())
    setCategories(categoryDb.getAll())
  }

  // Muda a conta selecionada
  const changeAccount = (accountId: string): void => {
    setCurrentAccountId(accountId)
    localStorage.setItem('selectedAccountId', accountId)
  }

  // Otimização: Memorizando o contexto para evitar re-renders em cascata
  const value = useMemo<FinanceContextType>(
    () => ({
      transactions,
      accounts,
      categories,
      currentAccountId,
      changeAccount,
      refreshData,
    }),
    [transactions, accounts, categories, currentAccountId]
  )

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  )
}

// Hook customizado com tipagem para usar o contexto
// eslint-disable-next-line react-refresh/only-export-components
export function useFinance(): FinanceContextType {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error(
      '❌ useFinance deve ser usado dentro de um FinanceProvider'
    )
  }
  return context
}
