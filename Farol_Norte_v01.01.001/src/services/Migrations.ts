// src/services/Migrations.ts
import { cardsDb } from './DataService';
import type { Transaction, CreditCard } from '../types/index';

const CURRENT_DB_VERSION = 1;

export function runMigrations(): void {
    const savedVersion = parseInt(localStorage.getItem('farol_db_version') || '0', 10);

    if (savedVersion >= CURRENT_DB_VERSION) return; // Já está na versão mais recente

    console.log(`Atualizando banco de dados da versão ${savedVersion} para ${CURRENT_DB_VERSION}...`);

    let rawData = localStorage.getItem('farol_transactions');
    let transactions: any[] = rawData ? JSON.parse(rawData) : [];
    
    // Puxamos os cartões para saber os dias de fechamento e vencimento de cada um
    const cards: CreditCard[] = cardsDb.getAll();

    // ====================================================
    // MIGRATION 1: Vencimentos e Pagamentos (Conta vs Cartão)
    // ====================================================
    if (savedVersion < 1) {
        transactions = transactions.map(t => {
            // Se já tiver os campos (por algum teste anterior), mantém
            if (t.dataVencimento !== undefined) return t;

            let dataVenc = t.data;
            let dataPag: string | null = t.data;

            if (t.tipoLancamento === 'cartao') {
                const card = cards.find(c => c.id === t.card_id);
                
                if (card && t.data) {
                    // Calcula em qual fatura a compra caiu
                    const [diaStr, mesStr, anoStr] = t.data.split('/');
                    const diaCompra = parseInt(diaStr, 10);
                    let mesFatura = parseInt(mesStr, 10);
                    let anoFatura = parseInt(anoStr, 10);

                    // Se a compra foi no dia do fechamento ou depois, cai no mês seguinte
                    if (diaCompra >= card.closingDay) {
                        mesFatura += 1;
                        if (mesFatura > 12) {
                            mesFatura = 1;
                            anoFatura += 1;
                        }
                    }
                    
                    dataVenc = `${String(card.dueDay).padStart(2, '0')}/${String(mesFatura).padStart(2, '0')}/${anoFatura}`;
                }
                
                // Transações de cartão antigas ficam como "não pagas" (null) a menos que já estejam com status 'pago' no sistema antigo
                dataPag = t.status === 'pago' ? dataVenc : null; 
            }

            return {
                ...t,
                dataVencimento: dataVenc,
                dataPagamento: dataPag
            };
        });
    }

    // Salva os dados atualizados com os novos campos
    localStorage.setItem('farol_transactions', JSON.stringify(transactions));
    localStorage.setItem('farol_db_version', CURRENT_DB_VERSION.toString());
    
    console.log('Migração concluída com sucesso. Banco de dados atualizado para V1.');
}