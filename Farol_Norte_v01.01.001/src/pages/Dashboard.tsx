// src/pages/Dashboard.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { parseDateBR } from '../utils/helpers';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import type { Account } from '../types/index';

// =========================================================
// INTERFACES LOCAIS (Para Drilldowns e Gráficos)
// =========================================================
interface DrillDownItem {
    nome: string;
    data: string;
    valor?: number;
    valorReal?: number;
    categoria?: string;
    isSplit?: boolean;
}

interface CatDrillDownState {
    show: boolean;
    category: string;
    items: DrillDownItem[];
}

interface DayDrillDownState {
    show: boolean;
    dateStr: string;
    items: DrillDownItem[];
}

interface ChartInstances {
    cat?: Chart | null;
    evol?: Chart | null;
    catEvol?: Chart | null;
    trend?: Chart | null; // NOVO: Gráfico de Tendência
}

export default function Dashboard() {
    const { 
        transactions = [], 
        accounts = [], 
        currentAccountId = 'all', 
        changeAccount = () => {}, 
    } = useFinance();

    // ==========================================
    // ESTADOS
    // ==========================================
    const [selectedMonth, setSelectedMonth] = useState<string>(() => localStorage.getItem("dashboard_last_month") || new Date().toISOString().slice(0, 7));
    const [isCategoryHistoryMode, setIsCategoryHistoryMode] = useState<boolean>(false);
    const [userSelectedCategories, setUserSelectedCategories] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    
    const filterRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [catDrillDown, setCatDrillDown] = useState<CatDrillDownState>({ show: false, category: '', items: [] });
    const [dayDrillDown, setDayDrillDown] = useState<DayDrillDownState>({ show: false, dateStr: '', items: [] });

    const chartCategoriasRef = useRef<HTMLCanvasElement | null>(null);
    const chartEvolucaoRef = useRef<HTMLCanvasElement | null>(null);
    const chartCategoryEvolRef = useRef<HTMLCanvasElement | null>(null);
    const chartTendenciaRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstances = useRef<ChartInstances>({});

    // ==========================================
    // TRAVA GLOBAL: DETECÇÃO ROBUSTA DE FATURA
    // ==========================================
    const isPagamentoFatura = (t: any) => {
        const descLower = (t.nome || '').toLowerCase();
        const isFaturaByDesc = (t.tipoLancamento === 'conta' || !t.tipoLancamento) && t.valor < 0 && 
            (descLower.includes('pagamento fatura') || descLower.includes('pgto fatura') || descLower.includes('pagamento de fatura'));
        return t.tipo === 'Pagamento de Fatura' || t.categoria === 'Pagamento de Fatura' || !!t.ignorarNoFluxo || isFaturaByDesc;
    };

    // ==========================================
    // CÁLCULOS BASE E KPIS
    // ==========================================
    const availableMonths = useMemo(() => {
        const meses = new Set<string>();
        meses.add(new Date().toISOString().slice(0, 7));
        transactions.forEach((t: any) => {
            const parts = t.data?.split("/");
            if (parts?.length === 3) meses.add(`${parts[2]}-${parts[1]}`);
        });
        return Array.from(meses).sort().reverse();
    }, [transactions]);

    const currentMonthData = useMemo(() => {
        const [ano, mes] = selectedMonth.split("-");

        return transactions.filter((t: any) => {
            if (currentAccountId !== "all" && t.account_id !== currentAccountId) return false;
            if (isPagamentoFatura(t)) return false; // Sincronizado com Transactions.tsx

            const parts = t.data?.split("/");
            return parts?.[2] === ano && parts?.[1] === mes;
        });
    }, [transactions, selectedMonth, currentAccountId]);

    const { kpi, trendData } = useMemo(() => {
        let receitasMes = 0, despesasMes = 0;
        let totalReceitasHistorico = 0;
        let mesesComReceita = new Set();
        let saldoAtual = 0, dividasFuturas = 0, atrasadas = 0;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // === LINHA DE CORTE DINÂMICA (Time Travel) ===
        const [selAno, selMes] = selectedMonth.split('-');
        let dataLimiteAtraso = new Date(parseInt(selAno), parseInt(selMes), 0); // Último dia do mês selecionado
        dataLimiteAtraso.setHours(23, 59, 59, 999);

        // Se estiver no mês corrente, a régua de atraso volta a ser HOJE
        if (selAno === String(hoje.getFullYear()) && selMes === String(hoje.getMonth() + 1).padStart(2, '0')) {
            dataLimiteAtraso = new Date(hoje);
            dataLimiteAtraso.setHours(0, 0, 0, 0); 
        }
        // ==============================================

        // Estrutura temporal para a projeção (Próximos 6 meses)
        const projection = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 1);
            return {
                iso: d.toISOString().slice(0, 7),
                label: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
                despesasAgendadas: 0,
                saldoFinal: 0
            };
        });

        transactions.forEach((t: any) => {
            if (currentAccountId !== "all" && t.account_id !== currentAccountId) return;
            if (isPagamentoFatura(t)) return;

            const isReceita = t.valor > 0;
            const absVal = Math.abs(t.valor);
            const tDate = parseDateBR(t.data);
            const vencDate = parseDateBR(t.dataVencimento || t.data);
            const tMesIso = t.data?.split('/').slice(1).reverse().join('-');

            // 1. Saldo Atual (Fluxo de Caixa Realizado)
            if (t.tipoLancamento !== 'cartao' && t.status === 'pago' && tDate && tDate <= hoje) {
                saldoAtual += t.valor;
            }

            // 2. Média Móvel de Receita (Base para Endividamento Global)
            if (isReceita && t.status === 'pago') {
                totalReceitasHistorico += t.valor;
                if (tMesIso) mesesComReceita.add(tMesIso);
            }

            // 3. Indicadores do Mês Selecionado (Uso da Renda Local)
            if (tMesIso === selectedMonth) {
                if (isReceita) receitasMes += t.valor;
                else despesasMes += absVal; // Pega TODAS as despesas (pagas ou pendentes) do mês
            }

            // 4. Mapeamento de Passivo Global e Projeção
            if (!isReceita && t.status !== 'pago') {
                dividasFuturas += absVal;
                
                // === AVALIAÇÃO DE ATRASO RETROATIVA ===
                // Verifica se a conta venceu ANTES do fim do mês que está sendo visualizado
                if (vencDate && vencDate < dataLimiteAtraso) {
                    atrasadas += absVal;
                }

                // Aloca a despesa no mês correto do gráfico de tendência
                const projIdx = projection.findIndex(p => p.iso === tMesIso);
                if (projIdx > -1) projection[projIdx].despesasAgendadas += absVal;
            }
        });

        // Cálculos Finais de KPI
        const receitaMedia = mesesComReceita.size > 0 ? totalReceitasHistorico / mesesComReceita.size : 0;
        const usoDaRenda = receitasMes > 0 ? ((despesasMes / receitasMes) * 100).toFixed(1) : (despesasMes > 0 ? "100+" : "0.0");
        const taxaEndividamento = receitaMedia > 0 ? ((dividasFuturas / receitaMedia) * 100).toFixed(1) : (dividasFuturas > 0 ? "100+" : "0.0");
        
        // Geração da Linha de Tendência (Rolling Balance)
        let saldoProjetado = saldoAtual;
        projection.forEach(p => {
            saldoProjetado += receitaMedia; // Assume a receita média como constante projetada
            saldoProjetado -= p.despesasAgendadas; // Abate as faturas já mapeadas
            p.saldoFinal = saldoProjetado;
        });

        return {
            kpi: { receitas: receitasMes, despesas: despesasMes, saldo: receitasMes - despesasMes, usoDaRenda, taxaEndividamento, atrasadas, dividasFuturas },
            trendData: projection
        };
    }, [currentMonthData, transactions, currentAccountId, selectedMonth]);

    const handleMonthChange = (novoMes: string) => {
        setSelectedMonth(novoMes);
        localStorage.setItem("dashboard_last_month", novoMes);
        setCatDrillDown({ show: false, category: '', items: [] });
        setDayDrillDown({ show: false, dateStr: '', items: [] });
    };

    const navegarMes = (dir: number) => {
        const idx = availableMonths.indexOf(selectedMonth) + dir;
        if (idx >= 0 && idx < availableMonths.length) {
            handleMonthChange(availableMonths[idx]);
        }
    };

    // ==========================================
    // GRÁFICO 1: TOP CATEGORIAS (DOUGHNUT)
    // ==========================================
    useEffect(() => {
        if (!chartCategoriasRef.current || catDrillDown.show) return;

        const catMap: Record<string, number> = {};
        currentMonthData.forEach((t: any) => {
            if (t.valor < 0) {
                const parts = (t.split && t.split.length > 0) ? t.split : [t];
                parts.forEach((s: any) => {
                    const c = s.categoria || "Não classificada";
                    catMap[c] = (catMap[c] || 0) + Math.abs(s.valor || t.valor);
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

        const baseColors = [
            "rgba(31, 166, 122, 0.65)", "rgba(242, 183, 5, 0.65)", "rgba(242, 116, 5, 0.65)", 
            "rgba(9, 130, 140, 0.65)", "rgba(130, 91, 140, 0.65)", "rgba(74, 118, 148, 0.65)", 
            "rgba(84, 140, 91, 0.65)", "rgba(191, 101, 115, 0.65)", "rgba(191, 156, 65, 0.65)", 
            "rgba(103, 163, 179, 0.65)"
        ];
        const hoverColors = baseColors.map(c => c.replace('0.65', '1'));

        if (chartInstances.current.cat) chartInstances.current.cat.destroy();

        chartInstances.current.cat = new Chart(chartCategoriasRef.current, {
            type: "doughnut",
            data: { 
                labels, 
                datasets: [{ 
                    data: values, 
                    backgroundColor: baseColors.slice(0, values.length), 
                    hoverBackgroundColor: hoverColors.slice(0, values.length),
                    borderWidth: 0,
                    hoverOffset: 40 
                }] 
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: "60%",
                layout: { padding: 10 },
                plugins: { 
                    legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10.5 }, color: '#9BA8B4' } } 
                },
                onClick: (_evt, elements) => {
                    if (elements.length > 0) {
                        const catName = labels[elements[0].index];
                        if (catName !== "Sem dados") abrirDetalhesCategoria(catName);
                    }
                }
            }
        });

        return () => chartInstances.current.cat?.destroy();
    }, [currentMonthData, catDrillDown.show]);

    // ==========================================
    // GRÁFICO 2: EVOLUÇÃO MENSAL (LINHA)
    // ==========================================
    useEffect(() => {
        if (!chartEvolucaoRef.current) return;

        const [ano, mes] = selectedMonth.split("-");
        const diasNoMes = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        const diasLabels = Array.from({ length: diasNoMes }, (_, i) => i + 1);

        const receitasPorDia = new Array(diasNoMes).fill(0);
        const despesasPorDia = new Array(diasNoMes).fill(0);

        currentMonthData.forEach((t: any) => {
            const dia = parseInt(t.data.split('/')[0]) - 1;
            if (dia >= 0 && dia < diasNoMes) {
                if (t.valor > 0) receitasPorDia[dia] += t.valor;
                else despesasPorDia[dia] += Math.abs(t.valor);
            }
        });

        if (chartInstances.current.evol) chartInstances.current.evol.destroy();

        chartInstances.current.evol = new Chart(chartEvolucaoRef.current, {
            type: 'line',
            data: {
                labels: diasLabels,
                datasets: [
                    { label: 'Receitas', data: receitasPorDia, borderColor: '#1FA67A', backgroundColor: 'rgba(31, 166, 122, 0.1)', tension: 0.3, fill: true, pointRadius: 2 },
                    { label: 'Despesas', data: despesasPorDia, borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', tension: 0.3, fill: true, pointRadius: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}` } } },
                scales: { y: { beginAtZero: true, ticks: { display: false } }, x: { grid: { display: false } } },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });

        return () => chartInstances.current.evol?.destroy();
    }, [currentMonthData, selectedMonth]);


    // ==========================================
    // GRÁFICO NOVO: TENDÊNCIA E FORECASTING
    // ==========================================
    useEffect(() => {
        if (!chartTendenciaRef.current || trendData.length === 0) return;
        if (chartInstances.current.trend) chartInstances.current.trend.destroy();

        const labels = trendData.map(p => p.label);
        const saldos = trendData.map(p => p.saldoFinal);
        const despesas = trendData.map(p => p.despesasAgendadas);

        chartInstances.current.trend = new Chart(chartTendenciaRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Saldo Projetado (R$)',
                        data: saldos,
                        borderColor: '#F2B705',
                        backgroundColor: 'rgba(242, 183, 5, 0.2)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        type: 'bar',
                        label: 'Despesas/Faturas Agendadas',
                        data: despesas,
                        backgroundColor: 'rgba(220, 53, 69, 0.5)',
                        borderRadius: 4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false } },
                    y: { type: 'linear', display: true, position: 'left', ticks: { callback: (val) => `R$ ${val}` } },
                    y1: { type: 'linear', display: false, position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });

        return () => chartInstances.current.trend?.destroy();
    }, [trendData]);

    // ==========================================
    // GRÁFICO 3: EVOLUÇÃO POR CATEGORIA
    // ==========================================
    const allCategoryNamesInPeriod = useMemo(() => {
        const catSet = new Set<string>();
        if (isCategoryHistoryMode) {
            const mesesParaExibir = getUltimos6Meses(selectedMonth);
            transactions.forEach((t: any) => {
                if (currentAccountId !== "all" && t.account_id !== currentAccountId) return;
                if (t.valor >= 0 || isPagamentoFatura(t)) return;
                const transMes = t.data.split('/').slice(1).reverse().join('-');
                if (mesesParaExibir.includes(transMes)) {
                    const parts = (t.split && t.split.length > 0) ? t.split : [t];
                    parts.forEach((s: any) => catSet.add(s.categoria || "Não classificada"));
                }
            });
        } else {
            currentMonthData.forEach((t: any) => {
                if (t.valor < 0) {
                    const parts = (t.split && t.split.length > 0) ? t.split : [t];
                    parts.forEach((s: any) => catSet.add(s.categoria || "Não classificada"));
                }
            });
        }
        return Array.from(catSet).sort();
    }, [transactions, currentMonthData, isCategoryHistoryMode, currentAccountId, selectedMonth]);

    useEffect(() => {
        if (userSelectedCategories.length === 0 && allCategoryNamesInPeriod.length > 0) {
            setUserSelectedCategories(allCategoryNamesInPeriod.slice(0, 5));
        }
    }, [allCategoryNamesInPeriod, isCategoryHistoryMode]);

    useEffect(() => {
        if (userSelectedCategories.length === 0) {
            if (chartInstances.current.catEvol) {
                chartInstances.current.catEvol.destroy();
                chartInstances.current.catEvol = null;
            }
            return;
        }

        if (!chartCategoryEvolRef.current) return;

        let labels: string[] = [];
        let datasets: any[] = [];
        const colors = [
            "#1FA67A", "#F2B705", "#F27405", "#09828C", "#825B8C", 
            "#4A7694", "#548C5B", "#BF6573", "#BF9C41", "#67A3B3"
        ];

        if (isCategoryHistoryMode) {
            const mesesParaExibir = getUltimos6Meses(selectedMonth);
            labels = mesesParaExibir.map(iso => {
                const [y, m] = iso.split('-');
                const d = new Date(parseInt(y), parseInt(m) - 1);
                return `${d.toLocaleString("pt-BR", { month: "short" })}/${y.slice(-2)}`;
            });

            const catHistory: Record<string, Record<string, number>> = {};
            transactions.forEach((t: any) => {
                if (currentAccountId !== "all" && t.account_id !== currentAccountId) return;
                if (t.valor >= 0 || isPagamentoFatura(t)) return;
                const transMes = t.data.split('/').slice(1).reverse().join('-');

                if (mesesParaExibir.includes(transMes)) {
                    const parts = (t.split && t.split.length > 0) ? t.split : [t];
                    parts.forEach((s: any) => {
                        const c = s.categoria || "Não classificada";
                        if (!catHistory[c]) catHistory[c] = {};
                        catHistory[c][transMes] = (catHistory[c][transMes] || 0) + Math.abs(s.valor || t.valor);
                    });
                }
            });

            datasets = userSelectedCategories.map((cat, index) => ({
                label: cat,
                data: mesesParaExibir.map(m => catHistory[cat]?.[m] || 0),
                borderColor: colors[index % colors.length], backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 3
            }));

        } else {
            const [ano, mes] = selectedMonth.split("-");
            const diasNoMes = new Date(parseInt(ano), parseInt(mes), 0).getDate();
            labels = Array.from({ length: diasNoMes }, (_, i) => (i + 1).toString());

            datasets = userSelectedCategories.map((cat, index) => {
                const dataDia = new Array(diasNoMes).fill(0);
                currentMonthData.forEach((t: any) => {
                    if (t.valor < 0) {
                        const dia = parseInt(t.data.split('/')[0]) - 1;
                        if (dia >= 0 && dia < diasNoMes) {
                            const parts = (t.split && t.split.length > 0) ? t.split : [t];
                            parts.forEach((s: any) => {
                                if ((s.categoria || "Não classificada") === cat) dataDia[dia] += Math.abs(s.valor || t.valor);
                            });
                        }
                    }
                });
                return { label: cat, data: dataDia, borderColor: colors[index % colors.length], backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 1 };
            });
        }

        if (chartInstances.current.catEvol) chartInstances.current.catEvol.destroy();

        chartInstances.current.catEvol = new Chart(chartCategoryEvolRef.current, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}` } } },
                scales: { y: { beginAtZero: true, ticks: { display: false } }, x: { grid: { display: false } } },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });

        return () => chartInstances.current.catEvol?.destroy();
    }, [currentMonthData, userSelectedCategories, isCategoryHistoryMode, transactions, selectedMonth, currentAccountId]);

    // ==========================================
    // FUNÇÕES AUXILIARES E DRILL-DOWNS
    // ==========================================
    function getUltimos6Meses(mesBaseIso: string): string[] {
        const arr: string[] = [];
        let cursor = new Date(mesBaseIso + "-01");
        cursor.setMonth(cursor.getMonth() - 5);
        for (let i = 0; i < 6; i++) {
            arr.push(cursor.toISOString().slice(0, 7));
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return arr;
    }

    const toggleCategoriaDropdown = (e: React.MouseEvent, cat: string) => {
        e.preventDefault();
        e.stopPropagation(); 
        setUserSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const abrirDetalhesCategoria = (categoria: string) => {
        const itens: DrillDownItem[] = [];
        currentMonthData.forEach((t: any) => {
            if (t.valor >= 0) return;
            if (t.split && t.split.length > 0) {
                t.split.forEach((s: any) => {
                    const c = s.categoria || "Não classificada";
                    if (c === categoria) itens.push({ ...t, valorReal: -Math.abs(s.valor), isSplit: true });
                });
            } else {
                const c = t.categoria || "Não classificada";
                if (c === categoria) itens.push({ ...t, valorReal: t.valor, isSplit: false });
            }
        });
        itens.sort((a, b) => (a.valorReal || 0) - (b.valorReal || 0));
        setCatDrillDown({ show: true, category: categoria, items: itens });
    };

    const abrirDetalhesDia = (dia: number) => {
        const [ano, mes] = selectedMonth.split('-');
        const dataStr = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
        const itens = currentMonthData.filter((t: any) => t.data === dataStr && t.valor < 0).sort((a: any, b: any) => a.valor - b.valor);
        setDayDrillDown({ show: true, dateStr: dataStr, items: itens });
    };

    const renderHeatmapGrid = () => {
        const [ano, mes] = selectedMonth.split("-").map(Number);
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();

        const gastosPorDia: Record<number, number> = {};
        let maxGasto = 0;
        currentMonthData.forEach((t: any) => {
            if (t.valor < 0) {
                const dia = parseInt(t.data.split("/")[0]);
                gastosPorDia[dia] = (gastosPorDia[dia] || 0) + Math.abs(t.valor);
                if (gastosPorDia[dia] > maxGasto) maxGasto = gastosPorDia[dia];
            }
        });

        const cells = [];
        for (let i = 0; i < primeiroDiaSemana; i++) cells.push(<div key={`empty-${i}`}></div>);

        for (let d = 1; d <= diasNoMes; d++) {
            const val = gastosPorDia[d] || 0;
            if (val > 0) {
                const ratio = Math.min(val / (maxGasto * 0.8), 1);
                const hue = 120 - ratio * 120;
                let valDisplay = formatCurrency(val).replace("R$", "").trim();
                if (val >= 100) valDisplay = valDisplay.split(',')[0];

                cells.push(
                    <div key={d} onClick={() => abrirDetalhesDia(d)}
                        className="heatmap-cell shadow-sm hover-opacity cursor-pointer text-white"
                        style={{ backgroundColor: `hsl(${hue}, 70%, 40%)`, border: `1px solid hsl(${hue}, 70%, 50%)` }}>
                        <span className="fw-bold text-xxs line-height-1">{d}</span>
                        <span className="text-micro">{valDisplay}</span>
                    </div>
                );
            } else {
                cells.push(
                    <div key={d} className="heatmap-cell heatmap-cell-empty">
                        <span className="text-muted text-xxs">{d}</span>
                    </div>
                );
            }
        }
        return cells;
    };

    // ==========================================
    // OPÇÕES SELECT
    // ==========================================
    const accountOptions: SelectOption[] = [
    { value: 'all', label: '🏦 Todas as Contas' },
    ...accounts.map((acc: Account) => ({ value: acc.id, label: acc.nome }))
    ];

    const monthOptions: SelectOption[] = availableMonths.map(mesIso => {
        const [ano, mes] = mesIso.split('-');
        const dateObj = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        const nome = dateObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        return { value: mesIso, label: nome.charAt(0).toUpperCase() + nome.slice(1) };
    });

    return (
        <div className="container mt-4 fade-in pb-4">
            {/* HEADER TOOLBAR */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 theme-surface p-3 shadow-sm position-relative z-100">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-speedometer2 fs-4 text-warning"></i>
                    <h4 className="mb-0 fw-bold">Dashboard</h4>
                </div>

                <div className="d-flex gap-3 align-items-center flex-wrap">
                    <div className="min-w-180">
                        <CustomSelect options={accountOptions} value={currentAccountId} onChange={(val) => changeAccount(val)} textColor="text-warning" />
                    </div>

                    <div className="input-group flex-nowrap w-auto">
                        <button className="btn btn-outline-secondary text-white-50 border-secondary radius-left-8" onClick={() => navegarMes(1)} disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        
                        <div className="w-180 position-relative z-150">
                            <div className="h-100 mx-n1">
                                <CustomSelect options={monthOptions} value={selectedMonth} onChange={handleMonthChange} className="h-100" textColor="text-light" />
                            </div>
                        </div>

                        <button className="btn btn-outline-secondary text-white-50 border-secondary radius-right-8" onClick={() => navegarMes(-1)} disabled={availableMonths.indexOf(selectedMonth) <= 0}>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI CARDS (Layout Expandido para Novos Indicadores) */}
            <div className="row g-3 mb-4">
                {/* Linha 1: Fluxo de Caixa */}
                <div className="col-12 col-md-4">
                    <div className="theme-surface border-start border-4 border-success shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2 d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-uppercase text-success fw-bold small">Receitas</div>
                                <div className="h4 mb-0 fw-bold text-light">{formatCurrency(kpi.receitas)}</div>
                            </div>
                            <i className="bi bi-arrow-up-circle fs-1 text-success opacity-25"></i>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="theme-surface border-start border-4 border-danger shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2 d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-uppercase text-danger fw-bold small">Despesas</div>
                                <div className="h4 mb-0 fw-bold text-light">{formatCurrency(kpi.despesas)}</div>
                            </div>
                            <i className="bi bi-arrow-down-circle fs-1 text-danger opacity-25"></i>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="theme-surface border-start border-4 border-info shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2 d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-uppercase text-info fw-bold small">Saldo do Mês</div>
                                <div className="h4 mb-0 fw-bold text-light">{formatCurrency(kpi.saldo)}</div>
                            </div>
                            <i className="bi bi-piggy-bank fs-1 text-info opacity-25"></i>
                        </div>
                    </div>
                </div>

                {/* Linha 2: Endividamento Global e Alertas */}
                <div className="col-12 col-md-4">
                    <div className={`theme-surface border-start border-4 ${kpi.atrasadas > 0 ? 'border-danger bg-danger bg-opacity-10' : 'border-secondary'} shadow-sm h-100 py-2 radius-12`}>
                        <div className="card-body px-4 py-2 d-flex justify-content-between align-items-center">
                            <div>
                                <div className={`text-uppercase fw-bold small ${kpi.atrasadas > 0 ? 'text-danger' : 'text-muted'}`}>
                                    {kpi.atrasadas > 0 ? 'Contas Atrasadas' : 'Tudo em Dia'}
                                </div>
                                <div className={`h4 mb-0 fw-bold ${kpi.atrasadas > 0 ? 'text-danger' : 'text-light'}`}>
                                    {kpi.atrasadas > 0 ? formatCurrency(kpi.atrasadas) : 'Nenhum atraso'}
                                </div>
                            </div>
                            <i className={`bi ${kpi.atrasadas > 0 ? 'bi-exclamation-triangle-fill text-danger' : 'bi-check-circle-fill text-muted'} fs-1 opacity-25`}></i>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="theme-surface border-start border-4 border-warning shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2 d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-uppercase text-warning fw-bold small">Uso da Renda (Mês)</div>
                                <div className="h4 mb-0 fw-bold text-light">{kpi.usoDaRenda}%</div>
                            </div>
                            <i className="bi bi-pie-chart fs-1 text-warning opacity-25"></i>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="theme-surface border-start border-4 border-danger shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2 d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-uppercase text-danger fw-bold small">Taxa de Endividamento</div>
                                <div className="h4 mb-0 fw-bold text-light">
                                    {kpi.taxaEndividamento}% <span className="fs-6 fw-normal text-muted ms-1 d-none d-xl-inline">({formatCurrency(kpi.dividasFuturas)})</span>
                                </div>
                            </div>
                            <i className="bi bi-graph-down-arrow fs-1 text-danger opacity-25"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* LINHA DE GRÁFICOS */}
            <div className="row mb-4 g-3">
                <div className="col-md-6">
                    <div className="theme-surface shadow-sm h-100 position-relative">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 fw-bold d-flex justify-content-between align-items-center py-3 px-4">
                            <span>Top Categorias</span>
                            {!catDrillDown.show && <small className="text-muted text-xxs">Toque na fatia p/ detalhes</small>}
                        </div>
                        <div className="card-body p-0 position-relative h-320">
                            <div className={`w-100 h-100 p-3 ${catDrillDown.show ? 'd-none' : 'd-flex'} align-items-center justify-content-center`}>
                                <canvas ref={chartCategoriasRef}></canvas>
                            </div>
                            
                            {catDrillDown.show && (
                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column drilldown-overlay radius-bottom-16 bg-dark bg-opacity-75 backdrop-blur">
                                    <div className="d-flex justify-content-between align-items-center px-4 py-2 border-bottom border-secondary border-opacity-25 mt-2">
                                        <span className="small fw-bold text-warning">Detalhes: {catDrillDown.category}</span>
                                        <button className="btn btn-sm btn-outline-light" onClick={() => setCatDrillDown({ show: false, category: '', items: [] })}>
                                            <i className="bi bi-arrow-left"></i> Voltar
                                        </button>
                                    </div>
                                    <div className="list-group list-group-flush flex-grow-1 overflow-auto bg-transparent">
                                        {catDrillDown.items.length === 0 ? (
                                            <div className="p-3 text-center text-muted">Nenhum item nesta categoria.</div>
                                        ) : (
                                            catDrillDown.items.map((t, i) => (
                                                <div key={i} className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-4 py-2 d-flex justify-content-between align-items-center">
                                                    <div className="max-w-65">
                                                        <div className="fw-bold text-truncate">{t.nome}</div>
                                                        <small className="text-muted">{t.data}</small>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="text-danger fw-bold">{formatCurrency(t.valorReal)}</div>
                                                        {t.isSplit && <span className="badge bg-warning text-dark text-micro">Parcial</span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="theme-surface shadow-sm h-100 position-relative">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 fw-bold d-flex justify-content-between align-items-center py-3 px-4">
                            <span>Intensidade de Gastos</span>
                            {!dayDrillDown.show && <small className="text-muted text-xxs">Toque no dia p/ detalhes</small>}
                        </div>
                        <div className="card-body p-4 position-relative h-320">
                            <div className={`w-100 h-100 flex-column ${dayDrillDown.show ? 'd-none' : 'd-flex'}`}>
                                <div className="heatmap-grid text-center fw-bold text-muted mb-2">
                                    <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
                                </div>
                                <div className="heatmap-grid flex-grow-1">
                                    {renderHeatmapGrid()}
                                </div>
                            </div>
                            
                            {dayDrillDown.show && (
                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column drilldown-overlay radius-bottom-16 bg-dark bg-opacity-75 backdrop-blur">
                                    <div className="d-flex justify-content-between align-items-center px-4 py-2 border-bottom border-secondary border-opacity-25 mt-2">
                                        <span className="small fw-bold text-warning">Gastos do dia {dayDrillDown.dateStr}</span>
                                        <button className="btn btn-sm btn-outline-light" onClick={() => setDayDrillDown({ show: false, dateStr: '', items: [] })}>
                                            <i className="bi bi-arrow-left"></i> Voltar
                                        </button>
                                    </div>
                                    <div className="list-group list-group-flush flex-grow-1 overflow-auto bg-transparent">
                                        {dayDrillDown.items.length === 0 ? (
                                            <div className="p-4 text-center text-muted">Nenhum gasto neste dia.</div>
                                        ) : (
                                            dayDrillDown.items.map((t, i) => (
                                                <div key={i} className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-4 py-3 d-flex justify-content-between align-items-center">
                                                    <div className="max-w-65">
                                                        <div className="fw-bold text-truncate">{t.nome}</div>
                                                        <small className="text-muted">{t.categoria}</small>
                                                    </div>
                                                    <div className="text-danger fw-bold">{formatCurrency(t.valor)}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* GRÁFICO EVOLUÇÃO POR CATEGORIA */}
            <div className="theme-surface shadow-sm mb-4">
                <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="fw-bold text-light">
                        Evolução por Categoria <span className="text-muted small fw-normal ms-2">(Top 5)</span>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <div className="form-check form-switch m-0 me-2">
                            <input className="form-check-input bg-transparent border-secondary cursor-pointer" type="checkbox" id="historyMode" checked={isCategoryHistoryMode} onChange={() => setIsCategoryHistoryMode(!isCategoryHistoryMode)} />
                            <label className="form-check-label text-muted small fw-bold cursor-pointer" htmlFor="historyMode">Visão 6 Meses</label>
                        </div>
                        <div className="dropdown position-relative" ref={filterRef}>
                            <button 
                                className="btn btn-sm btn-outline-secondary text-light border-secondary border-opacity-50" 
                                type="button" 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <i className="bi bi-filter"></i> Filtro {isFilterOpen ? <i className="bi bi-chevron-up ms-1" style={{fontSize: '0.7rem'}}></i> : <i className="bi bi-chevron-down ms-1" style={{fontSize: '0.7rem'}}></i>}
                            </button>
                            
                            {isFilterOpen && (
                                <ul className="dropdown-menu dropdown-menu-end shadow-lg theme-surface scrollable-menu show d-block fade-in" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1050 }}>
                                    <li className="px-3 py-2">
                                        <button className="btn btn-sm btn-outline-warning w-100 fw-bold" onClick={(e) => { e.stopPropagation(); setUserSelectedCategories(allCategoryNamesInPeriod.slice(0, 5)); }}>
                                            <i className="bi bi-arrow-counterclockwise"></i> Resetar (Top 5)
                                        </button>
                                    </li>
                                    <li><hr className="dropdown-divider border-secondary border-opacity-25" /></li>
                                    {allCategoryNamesInPeriod.length === 0 ? (
                                        <li className="text-muted small text-center p-3">Nenhuma categoria no período</li>
                                    ) : (
                                        allCategoryNamesInPeriod.map(cat => (
                                            <li key={cat} className="dropdown-item d-flex align-items-center gap-3 py-2 hover-opacity cursor-pointer" onClick={(e) => toggleCategoriaDropdown(e, cat)}>
                                                <input className="form-check-input mt-0 bg-transparent border-secondary" type="checkbox" readOnly checked={userSelectedCategories.includes(cat)} style={{ pointerEvents: 'none' }} />
                                                <span className="text-truncate fw-bold text-light max-w-160" style={{ pointerEvents: 'none' }}>{cat}</span>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-body p-4">
                    <div className="h-300">
                        <canvas ref={chartCategoryEvolRef}></canvas>
                    </div>
                </div>
            </div>
            
            {/* GRÁFICOS: PROJEÇÃO FUTURA E EVOLUÇÃO MENSAL */}
            <div className="row mb-4 g-3">
                <div className="col-md-6">
                    <div className="theme-surface shadow-sm h-100">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 fw-bold py-3 px-4">Projeção de Saldo (Próximos 6 Meses)</div>
                        <div className="card-body p-4">
                            <div className="h-300">
                                <canvas ref={chartTendenciaRef}></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="theme-surface shadow-sm h-100">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 fw-bold py-3 px-4">Evolução Mensal (Receitas x Despesas)</div>
                        <div className="card-body p-4">
                            <div className="h-300">
                                <canvas ref={chartEvolucaoRef}></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}