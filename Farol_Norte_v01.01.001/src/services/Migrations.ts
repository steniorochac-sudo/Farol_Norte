// src/services/Migrations.ts
import { cardsDb } from './DataService';
import type { Transaction, CreditCard } from '../types/index';

const CURRENT_DB_VERSION = 7; // V7: Reconstrução Inteligente Pós-Importação

export function runMigrations(): void {
    const savedVersion = parseInt(localStorage.getItem('farol_db_version') || '0', 10);
    if (savedVersion >= CURRENT_DB_VERSION) return;

    console.log(`Atualizando banco de dados para a versão ${CURRENT_DB_VERSION}...`);

    let rawData = localStorage.getItem('farol_transactions');
    let transactions: any[] = rawData ? JSON.parse(rawData) : [];
    const cards: CreditCard[] = cardsDb.getAll();

    const hoje = new Date();
    const mesAtualIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    // 1. PRIMEIRA PASSAGEM: Padroniza datas e reseta status de cartão para PENDENTE
    transactions = transactions.map(t => {
        const isCartao = t.tipoLancamento === 'cartao' || !!t.card_id;

        if (isCartao && t.tipo !== 'Pagamento de Fatura') {
            const card = cards.find(c => c.id === t.card_id || c.id === t.account_id);
            let diaFechamento = 1;
            let diaVencimento = 10;
            
            if (card) {
                diaFechamento = parseInt((card as any).closingDay || (card as any).diaFechamento, 10);
                diaVencimento = parseInt((card as any).dueDay || (card as any).diaVencimento, 10);
                if (isNaN(diaFechamento)) diaFechamento = 1;
                if (isNaN(diaVencimento)) diaVencimento = 10;
            }

            let dataVenc = t.dataVencimento || t.data; 
            let mesRefTemp = mesAtualIso;
            
            if (t.data && t.data.includes('/')) {
                const parts = t.data.split('/');
                if (parts.length === 3) {
                    const diaCompra = parseInt(parts[0], 10);
                    let mesFatura = parseInt(parts[1], 10);
                    let anoFatura = parseInt(parts[2], 10);

                    if (diaCompra >= diaFechamento) {
                        mesFatura += 1;
                        if (mesFatura > 12) { mesFatura = 1; anoFatura += 1; }
                    }
                    dataVenc = `${String(diaVencimento).padStart(2, '0')}/${String(mesFatura).padStart(2, '0')}/${anoFatura}`;
                    mesRefTemp = `${anoFatura}-${String(mesFatura).padStart(2, '0')}`;
                }
            }

            return {
                ...t,
                dataVencimento: dataVenc,
                dataPagamento: null, // Remove o 'pago' falso do legado
                status: 'pendente',
                _mesRefTemp: mesRefTemp // Prop temporária para o passo 2
            };
        } else if (!isCartao) {
            return {
                ...t,
                dataVencimento: t.data,
                dataPagamento: t.data,
                status: 'pago' 
            };
        }
        return t; 
    });

    // 2. SEGUNDA PASSAGEM: Heurística de Faturas (Criação de Links e Auto-Baixa)
    cards.forEach(card => {
        const cardTrans = transactions.filter(t => t.card_id === card.id || (t.tipoLancamento === 'cartao' && t.account_id === card.id));
        const fatObj: Record<string, { gastos: any[], pagos: number }> = {};

        cardTrans.forEach(t => {
            if (t.tipo !== 'Pagamento de Fatura' && t._mesRefTemp) {
                if (!fatObj[t._mesRefTemp]) fatObj[t._mesRefTemp] = { gastos: [], pagos: 0 };
                fatObj[t._mesRefTemp].gastos.push(t);
            }
        });

        cardTrans.forEach(t => {
            if (t.tipo === 'Pagamento de Fatura') {
                if (t.faturaLinks && t.faturaLinks.length > 0) {
                    t.faturaLinks.forEach((l: any) => {
                        if (fatObj[l.mes]) fatObj[l.mes].pagos += l.valor;
                    });
                } else if (t.data) {
                    // Reconstrução de vínculos para recibos que vieram do backup antigo
                    const parts = t.data.split("/");
                    if (parts.length === 3) {
                        const mesRefPgto = `${parts[2]}-${parts[1]}`;
                        if (fatObj[mesRefPgto]) fatObj[mesRefPgto].pagos += Math.abs(t.valor);
                        t.faturaLinks = [{ mes: mesRefPgto, valor: Math.abs(t.valor) }];
                    }
                }
            }
        });

        Object.keys(fatObj).forEach(mesRef => {
            const fatura = fatObj[mesRef];
            const totalGastos = fatura.gastos.reduce((acc, g) => acc + Math.abs(g.valor), 0);
            
            // Força baixa em meses anteriores a este, ou se o valor do recibo cobrir o gasto
            const isPago = fatura.pagos >= (totalGastos - 0.5) || mesRef < mesAtualIso; 

            if (isPago) {
                fatura.gastos.forEach(g => {
                    const idx = transactions.findIndex(orig => orig.identificador === g.identificador);
                    if (idx > -1) {
                        transactions[idx].dataPagamento = transactions[idx].dataVencimento || transactions[idx].data;
                        transactions[idx].status = 'pago';
                    }
                });
            }
        });
    });

    // Limpeza final
    transactions.forEach(t => delete t._mesRefTemp);

    localStorage.setItem('farol_transactions', JSON.stringify(transactions));
    localStorage.setItem('farol_db_version', CURRENT_DB_VERSION.toString());
    
    console.log(`Migração V${CURRENT_DB_VERSION} concluída. Recalibragem total pós-importação executada.`);
}