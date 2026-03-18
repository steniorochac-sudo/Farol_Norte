// src/types/index.ts

export interface Transaction {
  identificador: string;
  data: string;           // DD/MM/YYYY
  valor: number;          // Positivo para receita, negativo para despesa
  nome: string;           // Descrição
  categoria: string;
  tipo: string;           // 'Receita', 'Despesa', 'Compra no Crédito', etc.
  account_id?: string;    
  card_id?: string;       
  parcela?: { atual: number; total: number };
  faturaLinks?: Array<{ mes: string; valor: number }>; // Para pagamentos de fatura
  split?: Array<{ categoria: string; valor: number }>; // Para rateios
  conciliado?: boolean;
  ignorarNoFluxo?: boolean;
}

export type BankType = 'nubank' | 'inter' | 'bradesco' | 'generic' | 'wallet' | 'poupanca';

export interface Account {
  id: string;
  nome: string;           
  bank: BankType;
  status: 'active' | 'archived';
}

export interface CreditCard {
  id: string;
  nome: string;          
  bank: BankType;
  account_id: string;     
  closingDay: number;     
  dueDay: number;         
  limit?: number;         
  status: 'active' | 'archived' | 'cancelled';
}

export type CategoryNature = 'fixa' | 'variavel' | 'eventual' | 'investment';
export type CategoryRelevance = 'essencial' | 'estilo_vida' | 'investimento';

export interface Category {
  nome: string;           // Usado como ID histórico
  cor?: string;           
  natureza: CategoryNature;
  relevancia: CategoryRelevance;
  tipo?: string;          // 'despesa' | 'receita'
}

export interface CategorizationRule {
  id?: string;
  term: string;           // Palavra-chave (legado: term)
  category: string;       // Nome da categoria (legado: category)
}