// src/types/index.ts

export interface Transaction {
  identificador: string;
  dataVencimento?: string; 
  dataPagamento?: string | null;  
  data: string;           
  valor: number;          
  nome: string;           
  categoria: string;
  tipo: string;           
  status?: string;         //  'caixa', 'pendente', 'pago', etc.
  tipoLancamento?: string; //  'conta', 'cartao', 'transferencia'
  account_id?: string;    
  card_id?: string;       
  parcela?: { atual: number; total: number };
  faturaLinks?: Array<{ mes: string; valor: number }>; 
  split?: Array<{ categoria: string; valor: number }>; 
  conciliado?: boolean;
  ignorarNoFluxo?: boolean;
}

export type BankType = 'generic' | 'nubank' | 'inter' | 'bradesco' | 'mercado_pago' | string;

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