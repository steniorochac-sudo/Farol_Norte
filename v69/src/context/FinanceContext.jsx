// src/context/FinanceContext.jsx
import React, { createContext, useContext, useState } from 'react';
// 1. Removido o cardsDb que não estava sendo usado
import { db, accountsDb, categoryDb } from '../services/DataService';

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
    
    // 2. CORREÇÃO DE PERFORMANCE (Lazy Initialization)
    // Em vez de começar vazio e usar um useEffect (que causa 2 renderizações na tela),
    // nós passamos uma função () => dentro do useState. 
    // Assim, o React vai no LocalStorage apenas UMA VEZ na hora que o app abre.
    const [transactions, setTransactions] = useState(() => db.getAll());
    const [accounts, setAccounts] = useState(() => accountsDb.getAll());
    const [categories, setCategories] = useState(() => categoryDb.getAll());
    const [currentAccountId, setCurrentAccountId] = useState(() => 
        localStorage.getItem('selectedAccountId') || 'all'
    );

    // O useEffect inteiro foi apagado daqui! O app vai carregar mais rápido agora.

    // Esta função continua existindo para ser chamada APENAS quando os dados mudarem 
    // (ex: após importar um CSV ou adicionar uma transação manual)
    const refreshData = () => {
        setTransactions(db.getAll());
        setAccounts(accountsDb.getAll());
        setCategories(categoryDb.getAll());
    };

    const changeAccount = (accountId) => {
        setCurrentAccountId(accountId);
        localStorage.setItem('selectedAccountId', accountId);
    };

    // ========================================================
    // OTIMIZAÇÃO: Memorizando o Contexto (Impede Re-renderizações em Cascata)
    // ========================================================
    const value = React.useMemo(() => ({
        transactions,
        accounts,
        categories,
        currentAccountId,
        changeAccount,
        refreshData 
    }), [transactions, accounts, categories, currentAccountId]); 
    // Só avisa as páginas para recarregarem se UM DESTES 4 itens realmente mudar!

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
}

// 3. CORREÇÃO DO FAST REFRESH
// Este comentário especial diz ao linter: "Pode ignorar a regra de exportação nesta linha, eu sei o que estou fazendo".
// É o padrão da indústria para exportar Hooks de Contexto junto com seus Providers.
// eslint-disable-next-line react-refresh/only-export-components
export const useFinance = () => useContext(FinanceContext);