// src/services/DataService.js
import { parseDateBR } from '../utils/helpers.js';

// Lista de chaves do LocalStorage que compõem o Backup Completo
const APP_KEYS = [
    'transactions', 'accounts', 'credit_cards', 'categories', 'categorization_rules',
    'theme', 'selectedAccountId', 'dashboard_last_month', 
    'transactions_period_pref', 'creditcard_last_month'
];

// =========================================================
// VARIÁVEIS DE CACHE (PRIVADAS)
// =========================================================
let _accountsCache = null;
let _cardsCache = null;
let _categoriesCache = null;
let _budgetCache = null;

function invalidateAccountCache() { _accountsCache = null; }
function invalidateCardCache() { _cardsCache = null; }
function invalidateCategoryCache() { _categoriesCache = null; }
function invalidateBudgetCache() { _budgetCache = null; }

// =========================================================
// SERVIÇO DE TRANSAÇÕES (COM ESCUDO ANTI-NULL)
// =========================================================
export const db = {
    key: 'transactions',
    getAll: function() {
        try {
            const data = localStorage.getItem(this.key);
            const parsed = data ? JSON.parse(data) : null;
            return parsed || []; // Se for null ou undefined, devolve lista vazia SEMPRE
        } catch {
            return []; // Se o JSON estiver corrompido, devolve lista vazia e evita Crash
        }
    },
    save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    },
    add: function(transaction) {
        const data = this.getAll();
        data.push(transaction);
        this.save(data);
    },
    addMany: function(transactions) {
        const data = this.getAll();
        const newData = data.concat(transactions);
        this.save(newData);
    },
    update: function(id, newData) {
        let data = this.getAll();
        const index = data.findIndex(t => t.identificador === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...newData };
            this.save(data);
        }
    },
    delete: function(id) {
        let data = this.getAll();
        const newData = data.filter(t => t.identificador !== id);
        this.save(newData);
    }
};

// =========================================================
// SERVIÇO DE CONTAS (COM ESCUDO ANTI-NULL)
// =========================================================
export const accountsDb = {
    key: 'accounts',
    getAll: function() {
        if (!_accountsCache) {
            try {
                const data = localStorage.getItem(this.key);
                const parsed = data ? JSON.parse(data) : null;
                _accountsCache = parsed || [];
            } catch {
                _accountsCache = [];
            }
        }
        return _accountsCache;
    },
    getAtivos: function() {
        return this.getAll().filter(acc => acc.status === 'active');
    },
    save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
        invalidateAccountCache(); 
    },
    add: function(account) {
        const data = this.getAll();
        data.push(account);
        this.save(data);
    },
    update: function(id, newData) {
        const data = this.getAll();
        const index = data.findIndex(a => a.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...newData };
            this.save(data);
        }
    },
    delete: function(id) {
        let data = this.getAll();
        const newData = data.filter(a => a.id !== id);
        this.save(newData);
    },
    toggleStatus: function(id) {
        const data = this.getAll();
        const acc = data.find(a => a.id === id);
        if (acc) {
            acc.status = acc.status === 'active' ? 'archived' : 'active';
            this.save(data);
        }
    }
};

// =========================================================
// SERVIÇO DE CARTÕES (COM ESCUDO ANTI-NULL)
// =========================================================
export const cardsDb = {
    key: 'credit_cards',
    getAll: function() {
        if (!_cardsCache) {
            try {
                const data = localStorage.getItem(this.key);
                const parsed = data ? JSON.parse(data) : null;
                _cardsCache = parsed || [];
            } catch {
                _cardsCache = [];
            }
        }
        return _cardsCache;
    },
    save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
        invalidateCardCache();
    },
    add: function(card) {
        const data = this.getAll();
        data.push(card);
        this.save(data);
    },
    update: function(id, newData) {
        const data = this.getAll();
        const index = data.findIndex(c => c.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...newData };
            this.save(data);
        }
    },
    delete: function(id) {
        let data = this.getAll();
        const newData = data.filter(c => c.id !== id);
        this.save(newData);
    }
};

// =========================================================
// SERVIÇO DE CATEGORIAS (COM MIGRAÇÃO DA FASE 1 CORRIGIDA)
// =========================================================
export const categoryDb = {
    key: 'categories',
    getAll: function() {
        if (!_categoriesCache) {
            let parsed = null;
            try {
                const data = localStorage.getItem(this.key);
                parsed = data ? JSON.parse(data) : null;
            } catch (error) {
                // Fallback silencioso: Ignora o erro de parse e deixa o sistema recriar as categorias abaixo
                console.warn("Aviso: Formato de categorias inválido no armazenamento local.", error);
            }

            if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
                const defaultCats = [
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
                _categoriesCache = defaultCats;
                // CORREÇÃO: Salva direto no localStorage para não disparar o 'invalidateCache'
                localStorage.setItem(this.key, JSON.stringify(defaultCats));
            } else {
                let needsMigration = false;
                _categoriesCache = parsed.map(cat => {
                    if (!cat.natureza || !cat.relevancia) needsMigration = true;
                    return {
                        ...cat,
                        natureza: cat.natureza || 'variavel', 
                        relevancia: cat.relevancia || 'essencial' 
                    };
                });
                // CORREÇÃO: Salva direto no localStorage para não apagar a própria memória
                if (needsMigration) {
                    localStorage.setItem(this.key, JSON.stringify(_categoriesCache));
                }
            }
        }
        return _categoriesCache || [];
    },


    save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
        invalidateCategoryCache();
    },
    add: function(name) {
        const data = this.getAll();
        if (!data.some(c => c.nome === name)) {
            data.push({ nome: name, natureza: 'variavel', relevancia: 'essencial' });
            this.save(data);
        }
    },
    update: function(oldName, newData) {
        let data = this.getAll();
        const index = data.findIndex(c => c.nome === oldName);
        if (index !== -1) {
            data[index] = { ...data[index], ...newData };
            this.save(data);
        }
    },
    delete: function(name) {
        let data = this.getAll();
        const newData = data.filter(c => c.nome !== name);
        this.save(newData);
    }
};


// =========================================================
// SERVIÇO DE ORÇAMENTOS (BUDGETS)
// =========================================================
export const budgetDb = {
    key: 'budgets',
    getAll: function() {
        if (!_budgetCache) {
            try {
                const data = localStorage.getItem(this.key);
                const parsed = data ? JSON.parse(data) : null;
                _budgetCache = parsed || {}; // Se null, retorna objeto vazio!
            } catch {
                _budgetCache = {};
            }
        }
        return _budgetCache;
    },
    save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
        invalidateBudgetCache();
    },
    setLimit: function(categoryName, limit) {
        const data = this.getAll();
        data[categoryName] = parseFloat(limit);
        this.save(data);
    },
    getLimit: function(categoryName) {
        const data = this.getAll();
        return data[categoryName] || 0;
    },
    delete: function(categoryName) {
        const data = this.getAll();
        delete data[categoryName];
        this.save(data);
    }
};

// =========================================================
// SERVIÇO DE REGRAS DE IMPORTAÇÃO
// =========================================================
export const rulesDb = {
    key: 'categorization_rules',
    getAll: function() {
        try {
            const data = localStorage.getItem(this.key);
            const parsed = data ? JSON.parse(data) : null;
            return parsed || [];
        } catch {
            return [];
        }
    },
    save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    },
    add: function(rule) {
        const data = this.getAll();
        data.push(rule);
        this.save(data);
    },
    delete: function(id) {
        let data = this.getAll();
        const newData = data.filter(r => r.id !== id);
        this.save(newData);
    },
    apply: function(transaction) {
        const rules = this.getAll();
        rules.forEach(rule => {
            const texto = (transaction.nome || '').toLowerCase();
            const termo = rule.term.toLowerCase();
            if (texto.includes(termo)) {
                if (rule.category) transaction.categoria = rule.category;
            }
        });
    }
};

// ==========================================
// 1. BACKUP E RESTAURAÇÃO (JSON)
// ==========================================
export function exportarDados() {
    const backup = {};
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

export function importarDados(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                Object.keys(data).forEach(key => {
                    const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
                    localStorage.setItem(key, value);
                });
                
                invalidateAccountCache();
                invalidateCardCache();
                invalidateCategoryCache();
                invalidateBudgetCache();

                resolve(true);
            } catch (error) {
                reject("Erro ao ler JSON: " + error.message);
            }
        };
        reader.readAsText(file);
    });
}

// ==========================================
// 2. EXPORTAÇÃO PARA EXCEL/CSV
// ==========================================
export function exportarRelatorioCSV() {
    const transactions = db.getAll();
    if (transactions.length === 0) return alert("Nenhuma transação para exportar.");

    transactions.sort((a, b) => {
        const da = parseDateBR(a.data);
        const db = parseDateBR(b.data);
        if(!da) return 1; if(!db) return -1;
        return db - da;
    });

    let csvContent = "Data;Descrição;Categoria;Valor;Tipo;Conta/Cartão;Status\n";

    const contas = accountsDb.getAll();
    const cartoes = cardsDb.getAll();

    transactions.forEach(t => {
        const clean = (txt) => (txt || "").replace(/;/g, ",").replace(/[\r\n]+/g, " ");
        
        let origem = "Desconhecida";
        if (t.tipoLancamento === 'cartao') {
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

// ==========================================
// 3. LIMPEZA DE DADOS
// ==========================================
export function limparApenasTransacoes() {
    localStorage.removeItem('transactions');
}

export function limparSistemaCompleto() {
    APP_KEYS.forEach(key => localStorage.removeItem(key));
}

// ==========================================
// 4. HELPERS INTERNOS
// ==========================================
export function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}