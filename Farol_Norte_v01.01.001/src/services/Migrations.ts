// src/services/Migrations.ts
import { cardsDb } from './DataService';
import type { Transaction, CreditCard } from '../types/index';

// SUBIMOS PARA A VERSÃO 2
const CURRENT_DB_VERSION = 2;

export function runMigrations(): void {
    const savedVersion = parseInt(localStorage.getItem('farol_db_version') || '0', 10);

    if (savedVersion >= CURRENT_DB_VERSION) return;

    console.log(`Atualizando banco de dados da versão ${savedVersion} para ${CURRENT_DB_VERSION}...`);

    let rawData = localStorage.getItem('farol_transactions');
    let transactions: any[] = rawData ? JSON.parse(rawData) : [];
    const cards: CreditCard[] = cardsDb.getAll();

    // ====================================================
    // MIGRATION 2: Força o Recálculo Correto de Cartões
    // ====================================================
    if (savedVersion < 2) {
        transactions = transactions.map(t => {
            let dataVenc = t.data;
            let dataPag: string | null = t.data;

            // Deteta se é cartão pelo tipo ou pela existência do card_id
            const isCartao = t.tipoLancamento === 'cartao' || !!t.card_id;

            if (isCartao) {
                // Tenta achar o cartão pelo card_id ou account_id
                const card = cards.find(c => c.id === t.card_id || c.id === t.account_id);
                
                if (card && t.data) {
                    const [diaStr, mesStr, anoStr] = t.data.split('/');
                    const diaCompra = parseInt(diaStr, 10);
                    let mesFatura = parseInt(mesStr, 10);
                    let anoFatura = parseInt(anoStr, 10);

                    // Se comprou no dia do fechamento ou depois, vai para a próxima fatura
                    if (diaCompra >= card.closingDay) {
                        mesFatura += 1;
                        if (mesFatura > 12) {
                            mesFatura = 1;
                            anoFatura += 1;
                        }
                    }
                    
                    dataVenc = `${String(card.dueDay).padStart(2, '0')}/${String(mesFatura).padStart(2, '0')}/${anoFatura}`;
                }
                
                // Transações de cartão antigas ficam como pendentes, a menos que marcadas como pagas
                dataPag = t.status === 'pago' ? dataVenc : null; 
            } else {
                // Se for conta corrente (Pix/Débito), vencimento e pagamento são iguais à data da compra
                dataPag = t.data;
            }

            return {
                ...t,
                dataVencimento: dataVenc,
                dataPagamento: dataPag
            };
        });
    }

    localStorage.setItem('farol_transactions', JSON.stringify(transactions));
    localStorage.setItem('farol_db_version', CURRENT_DB_VERSION.toString());
    
    console.log('Migração V2 concluída. Vencimentos recalculados com sucesso.');
}