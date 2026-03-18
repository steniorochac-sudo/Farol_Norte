/**
 * DataService.ts - Serviço de Persistência em LocalStorage
 * Gerencia transações, contas, cartões, categorias, budgets e regras.
 */

import type {
  Transaction,
  Account,
  CreditCard,
  Category,
  CategorizationRule
} from '../types/index';

import { parseDateBR } from '../utils/helpers'; // Necessário para ordenar o CSV corretamente

// =========================================================
// CONSTANTES
// =========================================================

const APP_KEYS = [
  'transactions',
  'accounts',
  'credit_cards',
  'categories',
  'categorization_rules',
  'theme',
  'selectedAccountId',
  'dashboard_last_month',
  'transactions_period_pref',
  'creditcard_last_month',
] as const;

// =========================================================
// VARIÁVEIS DE CACHE (PRIVADAS)
// =========================================================

let _transactionsCache: Transaction[] | null = null;
let _accountsCache: Account[] | null = null;
let _cardsCache: CreditCard[] | null = null;
let _categoriesCache: Category[] | null = null;
let _budgetCache: Record<string, number> | null = null;

function invalidateTransactionCache(): void { _transactionsCache = null; }
function invalidateAccountCache(): void { _accountsCache = null; }
function invalidateCardCache(): void { _cardsCache = null; }
function invalidateCategoryCache(): void { _categoriesCache = null; }
function invalidateBudgetCache(): void { _budgetCache = null; }

// =========================================================
// SERVIÇO DE TRANSAÇÕES
// =========================================================

export const db = {
  key: 'transactions',
  getAll(): Transaction[] {
    if (_transactionsCache !== null) return _transactionsCache;
    try {
      const data = localStorage.getItem(this.key);
      const parsed: Transaction[] | null = data ? JSON.parse(data) : null;
      _transactionsCache = parsed || [];
      return _transactionsCache;
    } catch {
      console.warn('⚠️ Erro ao carregar transações do localStorage');
      _transactionsCache = [];
      return _transactionsCache;
    }
  },
  save(data: Transaction[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      _transactionsCache = data;
    } catch {
      console.error('❌ Erro ao salvar transações');
    }
  },
  add(transaction: Transaction): void {
    const data = this.getAll();
    data.push(transaction);
    this.save(data);
  },
  addMany(transactions: Transaction[]): void {
    const data = this.getAll();
    const newData = data.concat(transactions);
    this.save(newData);
  },
  update(id: string, newData: Partial<Transaction>): void {
    let data = this.getAll();
    const index = data.findIndex((t) => t.identificador === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...newData };
      this.save(data);
    }
  },
  delete(id: string): void {
    let data = this.getAll();
    const newData = data.filter((t) => t.identificador !== id);
    this.save(newData);
  },
};

// =========================================================
// SERVIÇO DE CONTAS
// =========================================================

export const accountsDb = {
  key: 'accounts',
  getAll(): Account[] {
    if (!_accountsCache) {
      try {
        const data = localStorage.getItem(this.key);
        const parsed: Account[] | null = data ? JSON.parse(data) : null;
        _accountsCache = parsed || [];
      } catch {
        _accountsCache = [];
      }
    }
    return _accountsCache;
  },
  getAtivos(): Account[] {
    return this.getAll().filter((acc) => acc.status === 'active');
  },
  save(data: Account[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      invalidateAccountCache();
    } catch {
      console.error('❌ Erro ao salvar contas');
    }
  },
  add(account: Account): void {
    const data = this.getAll();
    data.push(account);
    this.save(data);
  },
  update(id: string, newData: Partial<Account>): void {
    const data = this.getAll();
    const index = data.findIndex((a) => a.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...newData };
      this.save(data);
    }
  },
  delete(id: string): void {
    let data = this.getAll();
    const newData = data.filter((a) => a.id !== id);
    this.save(newData);
  },
  toggleStatus(id: string): void {
    const data = this.getAll();
    const acc = data.find((a) => a.id === id);
    if (acc) {
      acc.status = acc.status === 'active' ? 'archived' : 'active';
      this.save(data);
    }
  },
};

// =========================================================
// SERVIÇO DE CARTÕES DE CRÉDITO
// =========================================================

export const cardsDb = {
  key: 'credit_cards',
  getAll(): CreditCard[] {
    if (!_cardsCache) {
      try {
        const data = localStorage.getItem(this.key);
        const parsed: CreditCard[] | null = data ? JSON.parse(data) : null;
        _cardsCache = parsed || [];
      } catch {
        _cardsCache = [];
      }
    }
    return _cardsCache;
  },
  save(data: CreditCard[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      invalidateCardCache();
    } catch {
      console.error('❌ Erro ao salvar cartões');
    }
  },
  add(card: CreditCard): void {
    const data = this.getAll();
    data.push(card);
    this.save(data);
  },
  update(id: string, newData: Partial<CreditCard>): void {
    const data = this.getAll();
    const index = data.findIndex((c) => c.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...newData };
      this.save(data);
    }
  },
  delete(id: string): void {
    let data = this.getAll();
    const newData = data.filter((c) => c.id !== id);
    this.save(newData);
  },
};

// =========================================================
// SERVIÇO DE CATEGORIAS
// =========================================================

export const categoryDb = {
  key: 'categories',
  getAll(): Category[] {
    if (!_categoriesCache) {
      let parsed: Category[] | null = null;
      try {
        const data = localStorage.getItem(this.key);
        parsed = data ? JSON.parse(data) : null;
      } catch (error) {
        console.warn('⚠️ Erro ao carregar categorias', error);
      }

      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        const DEFAULT_CATEGORIES: Category[] = [
          { nome: "Alimentação", natureza: 'variavel', relevancia: 'essencial' },
          { nome: "Transporte", natureza: 'variavel', relevancia: 'essencial' },
          { nome: "Moradia", natureza: 'fixa', relevancia: 'essencial' },
          { nome: "Lazer", natureza: 'variavel', relevancia: 'estilo_vida' },
          { nome: "Saúde", natureza: 'eventual', relevancia: 'essencial' },
          { nome: "Educação", natureza: 'fixa', relevancia: 'investimento' },
          { nome: "Compras", natureza: 'variavel', relevancia: 'estilo_vida' },
          { nome: "Serviços", natureza: 'fixa', relevancia: 'essencial' },
          { nome: "Salário", natureza: 'fixa', relevancia: 'essencial' },
          { nome: "Investimento", natureza: 'variavel', relevancia: 'investimento' },
          { nome: "Outros", natureza: 'eventual', relevancia: 'estilo_vida' },
          { nome: "Pagamento de Fatura", natureza: 'fixa', relevancia: 'essencial' }
        ];
        _categoriesCache = DEFAULT_CATEGORIES;
        localStorage.setItem(this.key, JSON.stringify(DEFAULT_CATEGORIES));
      } else {
        let needsMigration = false;
        _categoriesCache = parsed.map((cat: any) => {
          if (!cat.natureza || !cat.relevancia) {
            needsMigration = true;
          }
          return {
            ...cat,
            natureza: cat.natureza || 'variavel',
            relevancia: cat.relevancia || 'essencial',
          };
        });

        if (needsMigration) {
          localStorage.setItem(this.key, JSON.stringify(_categoriesCache));
        }
      }
    }
    return _categoriesCache || [];
  },
  save(data: Category[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      invalidateCategoryCache();
    } catch {
      console.error('❌ Erro ao salvar categorias');
    }
  },
  add(nome: string): void {
    const data = this.getAll();
    if (!data.some((c) => c.nome === nome)) {
      const newCategory: Category = {
        nome,
        natureza: 'variavel',
        relevancia: 'essencial',
        tipo: 'despesa'
      };
      data.push(newCategory);
      this.save(data);
    }
  },
  update(oldName: string, newData: Partial<Category>): void {
    let data = this.getAll();
    const index = data.findIndex((c) => c.nome === oldName);
    if (index !== -1) {
      data[index] = { ...data[index], ...newData };
      this.save(data);
    }
  },
  delete(nome: string): void {
    let data = this.getAll();
    const newData = data.filter((c) => c.nome !== nome);
    this.save(newData);
  },
};

// =========================================================
// SERVIÇO DE ORÇAMENTOS (BUDGETS)
// =========================================================

export const budgetDb = {
  key: 'budgets',
  getAll(): Record<string, number> {
    if (!_budgetCache) {
      try {
        const data = localStorage.getItem(this.key);
        const parsed: Record<string, number> | null = data ? JSON.parse(data) : null;
        _budgetCache = parsed || {};
      } catch {
        _budgetCache = {};
      }
    }
    return _budgetCache;
  },
  save(data: Record<string, number>): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      invalidateBudgetCache();
    } catch {
      console.error('❌ Erro ao salvar budgets');
    }
  },
  setLimit(categoryName: string, limit: number | string): void {
    const data = this.getAll();
    data[categoryName] = typeof limit === 'string' ? parseFloat(limit) : limit;
    this.save(data);
  },
  getLimit(categoryName: string): number {
    const data = this.getAll();
    return data[categoryName] || 0;
  },
  delete(categoryName: string): void {
    const data = this.getAll();
    delete data[categoryName];
    this.save(data);
  },
};

// =========================================================
// SERVIÇO DE REGRAS DE CATEGORIZAÇÃO
// =========================================================

export const rulesDb = {
  key: 'categorization_rules',
  getAll(): CategorizationRule[] {
    try {
      const data = localStorage.getItem(this.key);
      const parsed: CategorizationRule[] | null = data ? JSON.parse(data) : null;
      return parsed || [];
    } catch {
      return [];
    }
  },
  save(data: CategorizationRule[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      console.error('❌ Erro ao salvar regras');
    }
  },
  add(rule: CategorizationRule): void {
    const data = this.getAll();
    data.push(rule);
    this.save(data);
  },
  delete(term: string): void {
    let data = this.getAll();
    const newData = data.filter((r) => r.term !== term);
    this.save(newData);
  },
  apply(transaction: Transaction): void {
    const rules = this.getAll();
    rules.forEach((rule) => {
      const texto = (transaction.nome || '').toLowerCase();
      const termoBusca = rule.term.toLowerCase();
      if (texto.includes(termoBusca)) {
        if (rule.category) transaction.categoria = rule.category;
      }
    });
  }
};

// =========================================================
// FUNÇÕES UTILITÁRIAS DE BACKUP & EXPORT
// =========================================================

function downloadFile(content: string, fileName: string, contentType: string): void {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

export function exportarDados(): void {
  const backup: Record<string, unknown> = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  APP_KEYS.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
          try { 
              backup[key] = JSON.parse(data); 
          } catch {
              backup[key] = data; 
          }
      }
  });

  const dataStr = JSON.stringify(backup, null, 2);
  downloadFile(dataStr, `backup_financeiro_${timestamp}.json`, 'application/json');
}

export async function importarDados(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
          try {
              const result = e.target?.result as string;
              const data = JSON.parse(result);
              Object.keys(data).forEach(key => {
                  const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
                  localStorage.setItem(key, value);
              });
              
              invalidateAccountCache();
              invalidateCardCache();
              invalidateCategoryCache();
              invalidateBudgetCache();

              resolve(true);
          } catch (error: any) {
              reject(new Error("Erro ao ler JSON: " + error.message));
          }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
  });
}

export function exportarRelatorioCSV(): void {
  const transactions = db.getAll();
  if (transactions.length === 0) {
      alert("Nenhuma transação para exportar.");
      return;
  }

  transactions.sort((a, b) => {
      const da = parseDateBR(a.data);
      const db = parseDateBR(b.data);
      if(!da) return 1; if(!db) return -1;
      return db.getTime() - da.getTime();
  });

  let csvContent = "Data;Descrição;Categoria;Valor;Tipo;Conta/Cartão;Status\n";

  const contas = accountsDb.getAll();
  const cartoes = cardsDb.getAll();

  transactions.forEach(t => {
      const clean = (txt: string) => (txt || "").replace(/;/g, ",").replace(/[\r\n]+/g, " ");
      
      let origem = "Desconhecida";
      if (t.card_id) {
          const card = cartoes.find(c => c.id === t.card_id);
          origem = card ? `Cartão: ${card.nome}` : "Cartão";
      } else {
          const acc = contas.find(a => a.id === t.account_id);
          origem = acc ? `Conta: ${acc.nome}` : "Conta";
      }

      if (t.split && t.split.length > 0) {
          t.split.forEach(part => {
              const descCompleta = `${clean(t.nome)} [${part.categoria}]`;
              const line = [
                  t.data,
                  descCompleta,
                  clean(part.categoria),
                  part.valor.toFixed(2).replace('.', ','),
                  t.tipo,
                  clean(origem),
                  "Rateio"
              ];
              csvContent += line.join(";") + "\n";
          });
      } else {
          const line = [
              t.data,
              clean(t.nome),
              clean(t.categoria),
              t.valor.toFixed(2).replace('.', ','),
              t.tipo,
              clean(origem),
              t.conciliado ? "Conciliado" : "Pendente"
          ];
          csvContent += line.join(";") + "\n";
      }
  });

  const timestamp = new Date().toISOString().slice(0,10);
  downloadFile(csvContent, `relatorio_financeiro_${timestamp}.csv`, 'text/csv;charset=utf-8;');
}

export function limparApenasTransacoes(): void {
  localStorage.removeItem('transactions');
  invalidateTransactionCache();
}

export function limparSistemaCompleto(): void {
  APP_KEYS.forEach(key => localStorage.removeItem(key));
  invalidateTransactionCache();
  invalidateAccountCache();
  invalidateCardCache();
  invalidateCategoryCache();
  invalidateBudgetCache();
}