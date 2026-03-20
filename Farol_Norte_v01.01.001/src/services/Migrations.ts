// src/services/Migrations.ts
import { cardsDb } from './DataService';
import type { Transaction, CreditCard } from '../types/index';

const CURRENT_DB_VERSION = 6; // V6: Blindagem Anti-Crash e Cascata de Faturas

export function runMigrations(): void {
    const savedVersion = parseInt(localStorage.getItem('farol_db_version') || '0', 10);
    if (savedVersion >= CURRENT_DB_VERSION) return;

    console.log(`Atualizando banco de dados para a versão ${CURRENT_DB_VERSION}...`);

    let rawData = localStorage.getItem('farol_transactions');
    let transactions: any[] = rawData ? JSON.parse(rawData) : [];
    const cards: CreditCard[] = cardsDb.getAll();

    const hoje = new Date();
    const mesAtualIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    transactions = transactions.map(t => {
        const isCartao = t.tipoLancamento === 'cartao' || !!t.card_id;

        if (isCartao) {
            const card = cards.find(c => c.id === t.card_id || c.id === t.account_id);
            
            // TRAVA ANTI-CRASH: Se o cartão for deletado ou o dia mudar, usa fallbacks matemáticos.
            let diaFechamento = 1;
            let diaVencimento = 10;
            if (card) {
                diaFechamento = parseInt((card as any).closingDay || (card as any).diaFechamento, 10);
                diaVencimento = parseInt((card as any).dueDay || (card as any).diaVencimento, 10);
                if (isNaN(diaFechamento)) diaFechamento = 1;
                if (isNaN(diaVencimento)) diaVencimento = 10;
            }

            let dataVenc = t.data;
            let mesRef = mesAtualIso;

            // Recalcula as datas ignorando qualquer lixo anterior
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
                    mesRef = `${anoFatura}-${String(mesFatura).padStart(2, '0')}`;
                }
            }

            // AUTO-BAIXA: Se a fatura é de um mês passado, ou já tinha status 'pago', força a quitação.
            const isPago = t.status === 'pago' || t.status === 'caixa' || mesRef < mesAtualIso;

            return {
                ...t,
                dataVencimento: dataVenc,
                dataPagamento: isPago ? (t.dataPagamento && !t.dataPagamento.includes('undefined') ? t.dataPagamento : dataVenc) : null,
                status: isPago ? 'pago' : 'pendente'
            };
        } else {
            return {
                ...t,
                dataVencimento: t.data,
                dataPagamento: t.data,
                status: 'pago' 
            };
        }
    });

    localStorage.setItem('farol_transactions', JSON.stringify(transactions));
    localStorage.setItem('farol_db_version', CURRENT_DB_VERSION.toString());
    
    console.log(`Migração V${CURRENT_DB_VERSION} concluída. Sistema blindado e faturas sincronizadas.`);
}