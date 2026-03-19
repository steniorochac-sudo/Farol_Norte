// src/pages/Budget.tsx
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { budgetDb } from '../services/DataService';
import { formatCurrency } from '../utils/formatters';
import CustomSelect, { SelectOption } from '../components/CustomSelect';

// =========================================================
// INTERFACES LOCAIS
// =========================================================
interface CategoriaProcessada {
    nome: string;
    cor: string;
    limite: number;
    gasto: number;
    percent: number;
    progressColor: string;
}

export default function Budget() {
    const { 
        transactions = [], 
        accounts = [], 
        categories = [], 
        currentAccountId = 'all', 
        changeAccount = () => {}, 
    } = useFinance();

    // ==========================================
    // ESTADOS REATIVOS
    // ==========================================
    const [selectedMonth, setSelectedMonth] = useState<string>(() => localStorage.getItem('budget_last_month') || new Date().toISOString().slice(0, 7));
    const [budgets, setBudgets] = useState<Record<string, number>>(() => budgetDb.getAll());

    // ==========================================
    // 1. CÁLCULO DE MESES DISPONÍVEIS
    // ==========================================
    const availableMonths = useMemo(() => {
        const meses = new Set<string>();
        meses.add(new Date().toISOString().slice(0, 7));
        
        transactions.forEach((t: any) => {
            if (t.data) {
                const parts = t.data.split('/');
                if (parts.length === 3) meses.add(`${parts[2]}-${parts[1]}`);
            }
        });
        
        return Array.from(meses).sort().reverse();
    }, [transactions]);

    // ==========================================
    // 2. MANIPULADORES DE EVENTOS
    // ==========================================
    const handleMonthChange = (val: string) => {
        setSelectedMonth(val);
        localStorage.setItem('budget_last_month', val);
    };

    const navegarMes = (dir: number) => {
        const idx = availableMonths.indexOf(selectedMonth) + dir;
        if (idx >= 0 && idx < availableMonths.length) {
            handleMonthChange(availableMonths[idx]);
        }
    };

    const handleLimitChange = (categoria: string, valor: string) => {
        const num = parseFloat(valor) || 0;
        budgetDb.setLimit(categoria, num);
        setBudgets({ ...budgetDb.getAll() }); // Atualiza estado local para forçar re-render da barra
    };

    const aplicarMediaHistorica = () => {
        if (!window.confirm("Atenção: Isso irá sobrescrever as metas atuais com base na média dos seus gastos nos últimos 3 meses.\n\nDeseja continuar?")) return;

        const hoje = new Date();
        const somaPorCat: Record<string, number> = {};

        transactions.forEach((t: any) => {
            if (!t.data || t.valor >= 0 || t.tipo === 'Pagamento de Fatura' || t.tipoLancamento === 'transferencia') return;

            const [d, m, y] = t.data.split('/');
            const dataTransacao = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            const diffTime = Math.abs(hoje.getTime() - dataTransacao.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Pega transações dos últimos 90 dias
            if (diffDays <= 90) {
                if (t.split && t.split.length > 0) {
                    t.split.forEach((s: any) => {
                        const cat = s.categoria || 'Não classificada';
                        somaPorCat[cat] = (somaPorCat[cat] || 0) + Math.abs(s.valor);
                    });
                } else {
                    const cat = t.categoria || 'Não classificada';
                    somaPorCat[cat] = (somaPorCat[cat] || 0) + Math.abs(t.valor);
                }
            }
        });

        let alterados = 0;
        categories.forEach((cat: any) => {
            const catNome = cat.nome;
            if (!catNome) return;
            
            const totalUltimos3Meses = somaPorCat[catNome] || 0;
            if (totalUltimos3Meses > 0) {
                const media = Math.ceil(totalUltimos3Meses / 3);
                const metaSugerida = Math.ceil(media / 10) * 10; // Arredonda para a dezena mais próxima
                budgetDb.setLimit(catNome, metaSugerida);
                alterados++;
            }
        });

        setBudgets({ ...budgetDb.getAll() });
        alert(`Orçamentos atualizados! ${alterados} categorias foram ajustadas baseadas na sua média.`);
    };

    // ==========================================
    // 3. MOTOR PRINCIPAL (Transações vs Orçamento)
    // ==========================================
    const budgetData = useMemo(() => {
        const [anoStr, mesStr] = selectedMonth.split('-');
        const gastosReais: Record<string, number> = {};
        let totalGasto = 0;

        transactions.forEach((t: any) => {
            if (currentAccountId !== 'all' && t.account_id !== currentAccountId) return;
            if (!t.data) return;

            const parts = t.data.split('/');
            if (parts[2] === anoStr &&
                parts[1] === mesStr &&
                t.valor < 0 &&
                t.tipoLancamento !== 'transferencia' &&
                t.tipo !== 'Pagamento de Fatura') {

                if (t.split && t.split.length > 0) {
                    t.split.forEach((s: any) => {
                        const cat = s.categoria || 'Não classificada';
                        gastosReais[cat] = (gastosReais[cat] || 0) + Math.abs(s.valor);
                        totalGasto += Math.abs(s.valor);
                    });
                } else {
                    const cat = t.categoria || 'Não classificada';
                    gastosReais[cat] = (gastosReais[cat] || 0) + Math.abs(t.valor);
                    totalGasto += Math.abs(t.valor);
                }
            }
        });

        let totalOrcado = 0;

        // Organiza e processa as categorias em ordem alfabética
        const categoriasProcessadas: CategoriaProcessada[] = categories
            .slice()
            .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''))
            .map((cat: any) => {
                const catNome = cat.nome || 'Desconhecida';
                const catCor = cat.cor || 'var(--farol-glow)';
                const limite = budgets[catNome] || 0;
                const gasto = gastosReais[catNome] || 0;
                
                totalOrcado += limite;

                let percent = 0;
                if (limite > 0) percent = (gasto / limite) * 100;
                else if (gasto > 0) percent = 100;

                let progressColor = 'bg-success';
                if (percent > 75) progressColor = 'bg-warning';
                if (percent > 100) progressColor = 'bg-danger';

                return { 
                    nome: catNome, 
                    cor: catCor, 
                    limite, 
                    gasto, 
                    percent, 
                    progressColor 
                };
            });

        return { categoriasProcessadas, totalGasto, totalOrcado };
    }, [transactions, categories, selectedMonth, currentAccountId, budgets]);

    const { totalOrcado, totalGasto, categoriasProcessadas } = budgetData;
    const saldoOrcamento = totalOrcado - totalGasto;
    const corSaldo = saldoOrcamento >= 0 ? 'success' : 'danger'; 

    // ==========================================
    // 4. KPI DIÁRIO (Cálculo de dias restantes)
    // ==========================================
    const hoje = new Date();
    const [anoSel, mesSel] = selectedMonth.split('-');
    const isMesAtual = (parseInt(anoSel) === hoje.getFullYear() && parseInt(mesSel) === (hoje.getMonth() + 1));

    let textoDiario = "Mês Fechado";
    let valorDiario = 0;
    let classeDiaria = "secondary";

    if (isMesAtual) {
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        const diasRestantes = ultimoDia - hoje.getDate() + 1;

        if (saldoOrcamento > 0) {
            valorDiario = saldoOrcamento / diasRestantes;
            textoDiario = `Diário (${diasRestantes} dias)`;
            classeDiaria = "info"; 
        } else {
            textoDiario = "Orçamento Esgotado";
            classeDiaria = "danger";
        }
    } else if (new Date(parseInt(anoSel), parseInt(mesSel) - 1, 1) > hoje) {
        textoDiario = "Mês Futuro";
    }

    // ==========================================
    // PREPARAÇÃO DE OPÇÕES PARA OS SELECTS
    // ==========================================
    const accountOptions: SelectOption[] = [
        { value: 'all', label: '🏦 Todas as Contas' },
        ...accounts.map((acc: any) => ({ value: acc.id, label: acc.nome || acc.name }))
    ];

    const monthOptions: SelectOption[] = availableMonths.map(mesIso => {
        const [ano, mes] = mesIso.split('-');
        const dateObj = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        const nome = dateObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        return { value: mesIso, label: nome.charAt(0).toUpperCase() + nome.slice(1) };
    });

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================
    return (
        <div className="container mt-4 mb-5 fade-in pb-5">
            {/* HEADER TOOLBAR COM Z-100 */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 theme-surface p-3 shadow-sm position-relative z-100 radius-12">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-bullseye fs-4 text-warning"></i>
                    <h4 className="mb-0 fw-bold text-light">Metas do Mês</h4>
                </div>

                <div className="d-flex gap-3 align-items-center flex-wrap">
                    <button className="btn btn-outline-warning fw-bold text-warning border-warning border-opacity-50 me-2" onClick={aplicarMediaHistorica} title="Auto-definir metas baseadas na média dos últimos 3 meses">
                        <i className="bi bi-magic me-1"></i> <span className="d-none d-md-inline">Auto-definir</span>
                    </button>

                    {/* ESCADINHA DE Z-INDEX PARA OS SELECTS */}
                    <div className="min-w-180 position-relative" style={{ zIndex: 104 }}>
                        <CustomSelect options={accountOptions} value={currentAccountId} onChange={(val) => changeAccount(val)} textColor="text-warning" />
                    </div>

                    <div className="input-group flex-nowrap w-auto position-relative" style={{ zIndex: 103 }}>
                        <button className="btn btn-outline-secondary text-white-50 border-secondary radius-left-8" onClick={() => navegarMes(1)} disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}><i className="bi bi-chevron-left"></i></button>
                        
                        <div className="w-180 position-relative z-150">
                            <div className="h-100 mx-n1">
                                <CustomSelect options={monthOptions} value={selectedMonth} onChange={(val) => handleMonthChange(val)} className="h-100" textColor="text-light" />
                            </div>
                        </div>

                        <button className="btn btn-outline-secondary text-white-50 border-secondary radius-right-8" onClick={() => navegarMes(-1)} disabled={availableMonths.indexOf(selectedMonth) <= 0}><i className="bi bi-chevron-right"></i></button>
                    </div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="row mb-4 g-3">
                <div className="col-6 col-md-3">
                    <div className="theme-surface border-start border-4 border-secondary shadow-sm h-100 py-2 radius-12">
                        <div className="card-body py-2 px-3">
                            <small className="text-uppercase text-muted fw-bold text-micro">Planejado</small>
                            <h5 className="fw-bold mb-0 text-light">{formatCurrency(totalOrcado)}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="theme-surface border-start border-4 border-danger shadow-sm h-100 py-2 radius-12">
                        <div className="card-body py-2 px-3">
                            <small className="text-uppercase text-danger fw-bold text-micro">Realizado</small>
                            <h5 className="fw-bold mb-0 text-light">{formatCurrency(totalGasto)}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className={`theme-surface border-start border-4 border-${corSaldo} shadow-sm h-100 py-2 radius-12`}>
                        <div className="card-body py-2 px-3">
                            <small className={`text-uppercase text-${corSaldo} fw-bold text-micro`}>Saldo</small>
                            <h5 className={`fw-bold mb-0 text-${corSaldo}`}>{formatCurrency(saldoOrcamento)}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className={`theme-surface border-start border-4 border-${classeDiaria} shadow-sm h-100 py-2 radius-12`}>
                        <div className="card-body py-2 px-3">
                            <small className={`text-uppercase text-${classeDiaria} fw-bold text-micro`}>{textoDiario}</small>
                            <h5 className={`fw-bold mb-0 text-${classeDiaria}`}>
                                {isMesAtual && saldoOrcamento > 0 ? formatCurrency(valorDiario) : '-'}
                            </h5>
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTA DE ORÇAMENTOS POR CATEGORIA */}
            <div className="theme-surface shadow-sm mb-4 radius-12">
                <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-4 d-none d-md-block">
                    <div className="row align-items-center small text-uppercase text-muted fw-bold">
                        <div className="col-4">Categoria</div>
                        <div className="col-2 text-center">Meta</div>
                        <div className="col-2 text-center">Realizado</div>
                        <div className="col-4 text-center">Progresso</div>
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="list-group list-group-flush bg-transparent">
                        {categoriasProcessadas.map(cat => (
                            <div key={cat.nome} className="list-group-item bg-transparent text-light border-bottom border-secondary border-opacity-25 py-3 px-4 hover-opacity">

                                {/* ==== LAYOUT DESKTOP ==== */}
                                <div className="row align-items-center d-none d-md-flex">
                                    <div className="col-4 d-flex align-items-center gap-3">
                                        <div className="shadow-sm" style={{ width: '14px', height: '14px', backgroundColor: cat.cor, borderRadius: '50%', opacity: 0.8 }}></div>
                                        <span className="fw-bold text-truncate fs-6" title={cat.nome}>{cat.nome}</span>
                                    </div>
                                    <div className="col-2">
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-transparent border-secondary border-opacity-50 text-muted">R$</span>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm text-center fw-bold"
                                                value={cat.limite || ''}
                                                placeholder="0"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLimitChange(cat.nome, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-2 text-center">
                                        <span className={cat.gasto > cat.limite && cat.limite > 0 ? 'text-danger fw-bold' : 'text-light fw-bold'}>
                                            {formatCurrency(cat.gasto)}
                                        </span>
                                    </div>
                                    <div className="col-4">
                                        <div className="d-flex justify-content-between small mb-1">
                                            <span className="text-muted fw-bold">{cat.percent.toFixed(0)}%</span>
                                            <span className="text-muted text-xxs">
                                                {cat.gasto > cat.limite ? 'Estourou: ' : 'Resta: '}
                                                <strong className={cat.gasto > cat.limite ? 'text-danger' : 'text-success'}>
                                                    {formatCurrency(Math.abs(cat.limite - cat.gasto))}
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="progress bg-secondary bg-opacity-25" style={{ height: '8px' }}>
                                            <div className={`progress-bar ${cat.progressColor} shadow-sm`} role="progressbar" style={{ width: `${Math.min(cat.percent, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* ==== LAYOUT MOBILE ==== */}
                                <div className="d-flex flex-column gap-3 w-100 d-md-none py-1">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                                            <div style={{ width: '12px', height: '12px', backgroundColor: cat.cor, borderRadius: '50%', flexShrink: 0, opacity: 0.8 }}></div>
                                            <span className="fw-bold text-truncate fs-6">{cat.nome}</span>
                                        </div>
                                        <div className="text-end">
                                            <span className={cat.gasto > cat.limite && cat.limite > 0 ? 'text-danger fw-bold' : 'text-light fw-bold'} style={{ fontSize: '0.9rem' }}>
                                                {formatCurrency(cat.gasto)}
                                            </span>
                                            <small className="text-muted text-xxs"> / {formatCurrency(cat.limite)}</small>
                                        </div>
                                    </div>
                                    <div className="progress bg-secondary bg-opacity-25" style={{ height: '6px' }}>
                                        <div className={`progress-bar ${cat.progressColor}`} role="progressbar" style={{ width: `${Math.min(cat.percent, 100)}%` }}></div>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                        <div className="input-group input-group-sm" style={{ width: '130px' }}>
                                            <span className="input-group-text bg-transparent border-secondary border-opacity-50 text-muted py-0 px-2 text-xxs">Meta</span>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm text-center fw-bold py-0 text-xxs"
                                                value={cat.limite || ''}
                                                placeholder="0"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLimitChange(cat.nome, e.target.value)}
                                            />
                                        </div>
                                        <div className="small text-muted text-end text-xxs">
                                            {cat.gasto > cat.limite ? <span className="text-danger">Excedido: </span> : 'Resta: '}
                                            <span className="fw-bold text-light">{formatCurrency(Math.abs(cat.limite - cat.gasto))}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}