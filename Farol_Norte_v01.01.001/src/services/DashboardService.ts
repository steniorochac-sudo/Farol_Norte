// src/services/DashboardService.ts
import { parseDateBR } from '../utils/helpers';
import type { Transaction } from '../types/index';

export class DashboardService {
    // Identificador Universal de Pagamento de Fatura para evitar dupla contagem
    static isPagamentoFatura(t: any): boolean {
        const descLower = (t.nome || '').toLowerCase();
        const isFaturaByDesc = (t.tipoLancamento === 'conta' || !t.tipoLancamento) && t.valor < 0 && 
            (descLower.includes('pagamento fatura') || descLower.includes('pgto fatura') || descLower.includes('pagamento de fatura'));
        return t.tipo === 'Pagamento de Fatura' || t.categoria === 'Pagamento de Fatura' || !!t.ignorarNoFluxo || isFaturaByDesc;
    }

    // ==========================================
    // 1. MOTOR DE KPIs E FORECASTING (TENDÊNCIA)
    // ==========================================
    static buildKPIsAndTrend(transactions: Transaction[], currentAccountId: string, selectedMonth: string) {
        let receitasMes = 0, despesasMes = 0;
        let saldoAtual = 0, dividasFuturas = 0, atrasadas = 0;
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Mapa para Receita Média Curta (Últimos 3 meses reais)
        const receitasPorMes: Record<string, number> = {};

        // Linha de Corte Dinâmica para Atrasos
        const [selAno, selMes] = selectedMonth.split('-');
        let dataLimiteAtraso = new Date(parseInt(selAno, 10), parseInt(selMes, 10), 0);
        dataLimiteAtraso.setHours(23, 59, 59, 999);
        
        if (selAno === String(hoje.getFullYear()) && selMes === String(hoje.getMonth() + 1).padStart(2, '0')) {
            dataLimiteAtraso = new Date(hoje);
            dataLimiteAtraso.setHours(0, 0, 0, 0); 
        }

        // Setup da Projeção (Próximos 6 meses)
        const projection = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 1);
            return {
                iso: d.toISOString().slice(0, 7),
                label: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
                despesasAgendadas: 0,
                saldoFinal: 0
            };
        });

        // Loop Único (Alta Performance O(n))
        transactions.forEach(t => {
            if (currentAccountId !== "all" && t.account_id !== currentAccountId) return;
            if (this.isPagamentoFatura(t)) return;

            const isReceita = t.valor > 0;
            const absVal = Math.abs(Number(t.valor));
            const tDate = parseDateBR(t.data);
            const vencDate = parseDateBR(t.dataVencimento || t.data);
            const tMesIso = t.data?.split('/').slice(1).reverse().join('-');
            const vMesIso = t.dataVencimento ? t.dataVencimento.split('/').slice(1).reverse().join('-') : tMesIso;

            // Saldo Atual (Realizado)
            if (t.tipoLancamento !== 'cartao' && t.status === 'pago' && tDate && tDate <= hoje) {
                saldoAtual += Number(t.valor);
            }

            // Histórico de Receitas (Agrupado por mês)
            if (isReceita && t.status === 'pago' && tMesIso) {
                receitasPorMes[tMesIso] = (receitasPorMes[tMesIso] || 0) + Number(t.valor);
            }

            // KPIs do Mês Selecionado
            if (tMesIso === selectedMonth || (t.tipoLancamento === 'cartao' && vMesIso === selectedMonth)) {
                if (isReceita) receitasMes += Number(t.valor);
                else despesasMes += absVal;
            }

            // Passivo Global (Dívidas e Atrasos)
            if (!isReceita && t.status !== 'pago') {
                dividasFuturas += absVal;
                if (vencDate && vencDate < dataLimiteAtraso) atrasadas += absVal;

                // Aloca na Projeção Futura
                const projIdx = projection.findIndex(p => p.iso === vMesIso);
                if (projIdx > -1) projection[projIdx].despesasAgendadas += absVal;
            }
        });

        // Cálculo da Média Móvel Inteligente (Últimos 3 meses com receita)
        const historicoMeses = Object.keys(receitasPorMes).sort().reverse().slice(0, 3);
        const somaRecentes = historicoMeses.reduce((acc, mes) => acc + receitasPorMes[mes], 0);
        const receitaMedia = historicoMeses.length > 0 ? somaRecentes / historicoMeses.length : 0;

        // Finalização dos KPIs
        const usoDaRenda = receitasMes > 0 ? ((despesasMes / receitasMes) * 100).toFixed(1) : (despesasMes > 0 ? "100+" : "0.0");
        const taxaEndividamento = receitaMedia > 0 ? ((dividasFuturas / receitaMedia) * 100).toFixed(1) : (dividasFuturas > 0 ? "100+" : "0.0");
        
        // Geração da Linha de Tendência Cumulativa
        let saldoProjetado = saldoAtual;
        projection.forEach(p => {
            saldoProjetado += receitaMedia; 
            saldoProjetado -= p.despesasAgendadas;
            p.saldoFinal = saldoProjetado;
        });

        return {
            kpi: { receitas: receitasMes, despesas: despesasMes, saldo: receitasMes - despesasMes, usoDaRenda, taxaEndividamento, atrasadas, dividasFuturas },
            trendData: projection
        };
    }

    // ==========================================
    // 2. EXTRATOR DE CATEGORIAS (SPLITS CONSIDERADOS)
    // ==========================================
    static getTopCategories(monthData: Transaction[]): { labels: string[], values: number[] } {
        const catMap: Record<string, number> = {};
        
        monthData.forEach(t => {
            if (t.valor < 0) {
                const parts = (t.split && t.split.length > 0) ? t.split : [t];
                parts.forEach((s: any) => {
                    const c = s.categoria || "Não classificada";
                    catMap[c] = (catMap[c] || 0) + Math.abs(Number(s.valor || t.valor));
                });
            }
        });

        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const top10 = sorted.slice(0, 10);
        const outros = sorted.slice(10).reduce((acc, curr) => acc + curr[1], 0);

        const labels = top10.map(i => i[0]);
        const values = top10.map(i => i[1]);
        if (outros > 0) { labels.push("Outros"); values.push(outros); }
        if (values.length === 0) { labels.push("Sem dados"); values.push(1); }

        return { labels, values };
    }

    // ==========================================
    // 3. EXTRATOR PARA HEATMAP E EVOLUÇÃO MENSAL
    // ==========================================
    static getDailyFlow(monthData: Transaction[], selectedMonth: string): { receitasPorDia: number[], despesasPorDia: number[], maxDespesa: number } {
        const [ano, mes] = selectedMonth.split("-").map(Number);
        const diasNoMes = new Date(ano, mes, 0).getDate();
        
        const receitasPorDia = new Array(diasNoMes).fill(0);
        const despesasPorDia = new Array(diasNoMes).fill(0);
        let maxDespesa = 0;

        monthData.forEach(t => {
            // Se for cartão, usa a data da compra para o heatmap, e não o vencimento
            const diaStr = t.data.split('/')[0];
            const diaIdx = parseInt(diaStr, 10) - 1;
            
            if (diaIdx >= 0 && diaIdx < diasNoMes) {
                const val = Number(t.valor);
                if (val > 0) {
                    receitasPorDia[diaIdx] += val;
                } else {
                    const absVal = Math.abs(val);
                    despesasPorDia[diaIdx] += absVal;
                    if (despesasPorDia[diaIdx] > maxDespesa) maxDespesa = despesasPorDia[diaIdx];
                }
            }
        });

        return { receitasPorDia, despesasPorDia, maxDespesa };
    }
}