// src/services/ImportTransactionService.ts
import type { Transaction, CreditCard } from '../types/index';
import type { ParsedRow } from './parsers/types';

export class ImportTransactionService {
    /**
     * Recebe os dados crus dos parsers (CSV, OFX, PDF) e aplica a lógica de negócios
     * para formatar datas, inverter sinais de cartão, calcular vencimentos e barrar duplicatas.
     */
    static normalizeAndFilter(
        rawTransactions: ParsedRow[],
        existingTransactions: Transaction[],
        selectedAccountId: string,
        isCreditCard: boolean,
        targetId: string,
        cardsList: CreditCard[]
    ): { validTransactions: Transaction[], duplicateCount: number } {
        
        const novasParaSalvar: Transaction[] = [];
        let duplicateCount = 0;

        rawTransactions.forEach((tr, index) => {
            const draft: any = { ...tr };
            draft.account_id = selectedAccountId;
            
            const rawValor = typeof draft.valor === 'number' ? draft.valor : parseFloat(draft.valor);
            
            // --- ESTÁGIO 1: FORMATAÇÃO DE DATAS ---
            let rawDate = (draft.data || '').split(' ')[0]; 
            const dateMatch = rawDate.match(/^(\d{2,4})[-\/](\d{2})[-\/](\d{2,4})/);
            if (dateMatch) {
                const p1 = dateMatch[1], p2 = dateMatch[2], p3 = dateMatch[3];
                draft.data = p1.length === 4 ? `${p3.padStart(2, '0')}/${p2.padStart(2, '0')}/${p1}` : `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${p3}`;
            } else {
                draft.data = rawDate.replace(/-/g, '/');
            }

            // [ADICIONE ESTAS 3 LINHAS] Sincroniza a data do identificador
            if (draft.identificador && draft.identificador.includes(rawDate) && rawDate !== draft.data) {
                draft.identificador = draft.identificador.replace(rawDate, draft.data);
            }

            // --- ESTÁGIO 2: DELEGAÇÃO SEMÂNTICA ---
            const tipoDefinidoPeloParser = draft.tipo || '';

            // --- ESTÁGIO 3: MATEMÁTICA ABSOLUTA E TIPAGEM ---
            if (isCreditCard) {
                draft.tipoLancamento = 'cartao';
                draft.card_id = targetId;
                
                if (tipoDefinidoPeloParser === 'Pagamento de Fatura') {
                    draft.valor = Math.abs(rawValor);
                    draft.categoria = 'Pagamento de Fatura';
                } else if (tipoDefinidoPeloParser.includes('Estorno') || tipoDefinidoPeloParser.includes('Reembolso')) {
                    draft.valor = Math.abs(rawValor);
                } else {
                    draft.valor = -Math.abs(rawValor); // Regra imutável: Cartão sempre sai negativo
                    draft.tipo = 'Despesa'; 
                }
            } else {
                // Conta Corrente
                draft.tipoLancamento = 'conta';
                draft.valor = rawValor; 
                
                if (tipoDefinidoPeloParser === 'Pagamento de Fatura' && draft.valor < 0) {
                    draft.categoria = 'Pagamento de Fatura';
                } else if (tipoDefinidoPeloParser.includes('Estorno') && draft.valor > 0) {
                    draft.tipo = 'Estorno/Reembolso';
                } else {
                    draft.tipo = draft.valor > 0 ? 'Receita' : 'Despesa';
                }
            }

            // --- ESTÁGIO 4: VENCIMENTOS E PAGAMENTOS ---
            if (isCreditCard) {
                draft.status = 'pendente';
                const cardObj = cardsList.find((c: any) => c.id === targetId);
                if (cardObj && draft.data) {
                    const [dStr, mStr, yStr] = draft.data.split('/');
                    const diaCompra = parseInt(dStr, 10);
                    let mesFat = parseInt(mStr, 10);
                    let anoFat = parseInt(yStr, 10);
                    
                    const fechamento = parseInt(String((cardObj as any).closingDay || (cardObj as any).diaFechamento || '1'), 10);
                    const vencimento = parseInt(String((cardObj as any).dueDay || (cardObj as any).diaVencimento || '10'), 10);
                    
                    if (diaCompra >= fechamento) {
                        mesFat++;
                        if (mesFat > 12) { mesFat = 1; anoFat++; }
                    }
                    draft.dataVencimento = `${String(vencimento).padStart(2, '0')}/${String(mesFat).padStart(2, '0')}/${anoFat}`;
                }
            } else {
                draft.status = 'pago'; 
                draft.dataVencimento = draft.data;
                draft.dataPagamento = draft.data; 
            }

            // --- ESTÁGIO 5: REASSINATURA UNIVERSAL ---
            if (!draft.identificador || draft.identificador.includes('generic') || draft.identificador.includes('hibrido')) {
                // Preserva o sufixo original do parser (a linha do arquivo) para não perder a identidade matemática
                const suffix = draft.identificador ? draft.identificador.substring(draft.identificador.lastIndexOf('-')) : `-${index}`;
                draft.identificador = `auto-${draft.data}-${draft.valor}-${(draft.nome || '').substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}${suffix}`;
            }

            // --- ESTÁGIO 6: ESCUDO ANTI-DUPLICIDADE INTELIGENTE ---
            const isAbsoluteDuplicate = (arr: any[]) => arr.some((ext: any) => ext.identificador === draft.identificador);
            
            const isHeuristicDuplicate = (arr: any[]) => arr.some((ext: any) => {
                const extIsGeneric = ext.identificador.startsWith('auto-') || ext.identificador.startsWith('generic') || ext.identificador.startsWith('hibrido');
                const trIsGeneric = draft.identificador.startsWith('auto-') || draft.identificador.startsWith('generic') || draft.identificador.startsWith('hibrido');
                
                if (extIsGeneric && trIsGeneric) {
                    if (ext.account_id === draft.account_id && ext.data === draft.data && ext.valor === draft.valor) {
                        const nomeExt = (ext.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
                        const nomeTr = (draft.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
                        if (nomeExt === nomeTr && nomeExt.length >= 3) return true;
                    }
                }
                return false;
            });

            // 1. Contra o Banco de Dados (Passado): Usa força máxima (Absoluto + Heurístico)
            const blockedByDB = isAbsoluteDuplicate(existingTransactions) || isHeuristicDuplicate(existingTransactions);
            
            // 2. Contra o Arquivo Atual (Presente): Usa APENAS o Absoluto. Permite compras gêmeas (2 cafés no mesmo dia).
            const blockedByCurrentFile = isAbsoluteDuplicate(novasParaSalvar);

            if (!blockedByDB && !blockedByCurrentFile) {
                novasParaSalvar.push(draft as Transaction);
            } else {
                duplicateCount++;
            }
        });

        return { validTransactions: novasParaSalvar, duplicateCount };
    }
}