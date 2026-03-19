// src/pages/Dre.tsx
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import type { Account, Category, Transaction } from '../types/index';

// =========================================================
// INTERFACES LOCAIS
// =========================================================
interface DreItem {
    nome: string;
    valor: number;
}

interface DreGroup {
    total: number;
    items: Record<string, number>;
    sortedItems?: DreItem[];
}

interface ExpandSectionsState {
    essencial: boolean;
    estilo_vida: boolean;
    investimento: boolean;
}

export default function Dre() {
    const { 
        transactions = [], 
        accounts = [], 
        categories = [], 
        currentAccountId = 'all', 
        changeAccount = () => {} 
    } = useFinance();

    // ==========================================
    // 1. ESTADOS
    // ==========================================
    const [selectedMonth, setSelectedMonth] = useState<string>(() => localStorage.getItem("dashboard_last_month") || new Date().toISOString().slice(0, 7));
    const [expandSections, setExpandSections] = useState<ExpandSectionsState>({ essencial: false, estilo_vida: false, investimento: false });

    // ==========================================
    // 2. FILTRO DE MESES DISPONÍVEIS
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

    // ==========================================
    // 3. O MOTOR DO DRE (Agrupamento e Cálculo)
    // ==========================================
    const dreData = useMemo(() => {
        const [ano, mes] = selectedMonth.split("-");
        
        let receitas = 0;
        const grupos: Record<string, DreGroup> = {
            essencial: { total: 0, items: {} },
            estilo_vida: { total: 0, items: {} },
            investimento: { total: 0, items: {} },
            nao_classificado: { total: 0, items: {} }
        };

        const currentMonthData = transactions.filter((t: any) => {
            if (currentAccountId !== "all" && t.account_id !== currentAccountId) return false;
            if (t.tipo === "Pagamento de Fatura" || t.ignorarNoFluxo) return false;
            const parts = t.data?.split("/");
            return parts?.[2] === ano && parts?.[1] === mes;
        });

        currentMonthData.forEach((t: any) => {
            if (t.valor > 0) {
                receitas += t.valor;
            } else {
                const processarDespesa = (categoriaNome: string, valorDespesa: number) => {
                    const catObj = categories.find((c: any) => c.nome === categoriaNome);
                    // Fallback: se não achar a categoria ou não tiver relevância, joga para essencial
                    const rel = (catObj as any)?.relevancia || 'essencial';
                    
                    if (!grupos[rel]) grupos[rel] = { total: 0, items: {} };
                    grupos[rel].total += Math.abs(valorDespesa);
                    grupos[rel].items[categoriaNome] = (grupos[rel].items[categoriaNome] || 0) + Math.abs(valorDespesa);
                };

                if (t.split && t.split.length > 0) {
                    t.split.forEach((s: any) => processarDespesa(s.categoria || "Não classificada", s.valor));
                } else {
                    processarDespesa(t.categoria || "Não classificada", t.valor);
                }
            }
        });

        // Ordenar os sub-itens por valor (do maior pro menor)
        Object.keys(grupos).forEach(key => {
            grupos[key].sortedItems = Object.entries(grupos[key].items)
                .map(([nome, valor]) => ({ nome, valor }))
                .sort((a, b) => b.valor - a.valor);
        });

        // Cálculos de Cascata (Waterfall)
        const margemSobrevivencia = receitas - grupos.essencial.total;
        const margemLivre = margemSobrevivencia - grupos.estilo_vida.total;
        const resultadoFinal = margemLivre - grupos.investimento.total;

        // Porcentagens (Regra 50/30/20)
        const pctEssencial = receitas > 0 ? (grupos.essencial.total / receitas) * 100 : 0;
        const pctEstiloVida = receitas > 0 ? (grupos.estilo_vida.total / receitas) * 100 : 0;
        const pctInvestimento = receitas > 0 ? (grupos.investimento.total / receitas) * 100 : 0;

        return { receitas, grupos, margemSobrevivencia, margemLivre, resultadoFinal, pctEssencial, pctEstiloVida, pctInvestimento };
    }, [transactions, categories, selectedMonth, currentAccountId]);

    // ==========================================
    // 4. FUNÇÕES VISUAIS E DE NAVEGAÇÃO
    // ==========================================
    const navegarMes = (dir: number) => {
        const idx = availableMonths.indexOf(selectedMonth) + dir;
        if (idx >= 0 && idx < availableMonths.length) {
            setSelectedMonth(availableMonths[idx]);
            localStorage.setItem("dashboard_last_month", availableMonths[idx]);
        }
    };

    const toggleSection = (section: keyof ExpandSectionsState) => {
        setExpandSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // ==========================================
    // 5. OPÇÕES PARA OS SELECTS
    // ==========================================
    const accountOptions: SelectOption[] = [
        { value: 'all', label: '🏦 Todas as Contas' },
        ...accounts.map((acc: any) => ({ value: acc.id, label: acc.nome }))
    ];

    const monthOptions: SelectOption[] = availableMonths.map(mesIso => {
        const [ano, mes] = mesIso.split('-');
        const dateObj = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        const nome = dateObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        return { value: mesIso, label: nome.charAt(0).toUpperCase() + nome.slice(1) };
    });

    // ==========================================
    // 6. RENDERIZAÇÃO
    // ==========================================
    return (
        <div className="container mt-4 fade-in pb-5">
            {/* HEADER TOOLBAR */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 theme-surface p-3 shadow-sm position-relative z-100 radius-12">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-funnel-fill fs-4 text-warning"></i>
                    <h4 className="mb-0 fw-bold">DRE Pessoal</h4>
                </div>

                <div className="d-flex gap-3 align-items-center flex-wrap">
                    <div className="min-w-180 position-relative" style={{ zIndex: 104 }}>
                        <CustomSelect options={accountOptions} value={currentAccountId} onChange={changeAccount} textColor="text-warning" />
                    </div>

                    <div className="input-group flex-nowrap w-auto position-relative" style={{ zIndex: 103 }}>
                        <button className="btn btn-outline-secondary text-white-50 border-secondary radius-left-8" onClick={() => navegarMes(1)} disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}><i className="bi bi-chevron-left"></i></button>
                        <div className="w-180 position-relative z-150">
                            <div className="h-100 mx-n1">
                                <CustomSelect options={monthOptions} value={selectedMonth} onChange={(val) => { setSelectedMonth(val); localStorage.setItem("dashboard_last_month", val); }} className="h-100" textColor="text-light" />
                            </div>
                        </div>
                        <button className="btn btn-outline-secondary text-white-50 border-secondary radius-right-8" onClick={() => navegarMes(-1)} disabled={availableMonths.indexOf(selectedMonth) <= 0}><i className="bi bi-chevron-right"></i></button>
                    </div>
                </div>
            </div>

            {/* A CASCATA DO DRE */}
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    
                    <div className="text-center mb-4">
                        <small className="text-muted text-uppercase fw-bold text-micro ls-1">Demonstração do Resultado do Exercício</small>
                        <p className="text-muted small mt-1">Análise de eficiência financeira baseada na regra 50 / 30 / 20.</p>
                    </div>

                    <div className="theme-surface shadow-lg radius-12 p-0 overflow-hidden mb-5 border-secondary border-opacity-50">
                        
                        {/* RECEITA BRUTA */}
                        <div className="d-flex justify-content-between align-items-center p-4 bg-success bg-opacity-10 border-bottom border-success border-opacity-25">
                            <div>
                                <h5 className="fw-bold text-success mb-0"><i className="bi bi-plus-circle-fill me-2"></i>Receitas Operacionais</h5>
                                <small className="text-success text-opacity-75 text-micro text-uppercase">Todo o dinheiro que entrou</small>
                            </div>
                            <h4 className="fw-bold text-success mb-0">{formatCurrency(dreData.receitas)}</h4>
                        </div>

                        {/* 1. CUSTO DE SOBREVIVÊNCIA (ESSENCIAL) */}
                        <div className="p-4 border-bottom border-secondary border-opacity-25 hover-opacity cursor-pointer transition-all" onClick={() => toggleSection('essencial')} style={{ backgroundColor: expandSections.essencial ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="fw-bold text-light mb-1"><i className="bi bi-dash-circle-fill text-danger me-2"></i>1. Custo de Sobrevivência <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50 ms-2 text-micro">ESSENCIAL</span></h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="progress bg-secondary bg-opacity-25" style={{ width: '100px', height: '6px' }}>
                                            <div className={`progress-bar ${dreData.pctEssencial > 50 ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${Math.min(dreData.pctEssencial, 100)}%` }}></div>
                                        </div>
                                        <small className={`text-micro fw-bold ${dreData.pctEssencial > 50 ? 'text-danger' : 'text-muted'}`}>{dreData.pctEssencial.toFixed(1)}% (Ideal: 50%)</small>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <h5 className="fw-bold text-light mb-0">- {formatCurrency(dreData.grupos.essencial.total)}</h5>
                                    <small className="text-muted text-micro">Ver detalhes <i className={`bi bi-chevron-${expandSections.essencial ? 'up' : 'down'} ms-1`}></i></small>
                                </div>
                            </div>
                            
                            {expandSections.essencial && (
                                <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 fade-in">
                                    {dreData.grupos.essencial.sortedItems?.map(item => (
                                        <div key={item.nome} className="d-flex justify-content-between py-2 px-3 mb-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <span className="text-muted small">{item.nome}</span>
                                            <span className="text-light small fw-bold">{formatCurrency(item.valor)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* MARGEM DE SOBREVIVÊNCIA (SUBTOTAL 1) */}
                        <div className="d-flex justify-content-between align-items-center py-2 px-4 bg-black bg-opacity-25 border-bottom border-secondary border-opacity-50">
                            <span className="text-muted text-uppercase text-micro fw-bold">= Margem de Sobrevivência</span>
                            <span className="fw-bold text-light">{formatCurrency(dreData.margemSobrevivencia)}</span>
                        </div>

                        {/* 2. ESTILO DE VIDA (DESEJOS) */}
                        <div className="p-4 border-bottom border-secondary border-opacity-25 hover-opacity cursor-pointer transition-all" onClick={() => toggleSection('estilo_vida')} style={{ backgroundColor: expandSections.estilo_vida ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="fw-bold text-light mb-1"><i className="bi bi-dash-circle-fill text-warning me-2"></i>2. Custo de Estilo de Vida <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 ms-2 text-micro">DESEJOS</span></h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="progress bg-secondary bg-opacity-25" style={{ width: '100px', height: '6px' }}>
                                            <div className={`progress-bar ${dreData.pctEstiloVida > 30 ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${Math.min(dreData.pctEstiloVida, 100)}%` }}></div>
                                        </div>
                                        <small className={`text-micro fw-bold ${dreData.pctEstiloVida > 30 ? 'text-danger' : 'text-muted'}`}>{dreData.pctEstiloVida.toFixed(1)}% (Ideal: 30%)</small>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <h5 className="fw-bold text-light mb-0">- {formatCurrency(dreData.grupos.estilo_vida.total)}</h5>
                                    <small className="text-muted text-micro">Ver detalhes <i className={`bi bi-chevron-${expandSections.estilo_vida ? 'up' : 'down'} ms-1`}></i></small>
                                </div>
                            </div>

                            {expandSections.estilo_vida && (
                                <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 fade-in">
                                    {dreData.grupos.estilo_vida.sortedItems?.map(item => (
                                        <div key={item.nome} className="d-flex justify-content-between py-2 px-3 mb-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <span className="text-muted small">{item.nome}</span>
                                            <span className="text-light small fw-bold">{formatCurrency(item.valor)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* CAPACIDADE DE APORTE (SUBTOTAL 2) */}
                        <div className="d-flex justify-content-between align-items-center py-2 px-4 bg-black bg-opacity-25 border-bottom border-secondary border-opacity-50">
                            <span className="text-muted text-uppercase text-micro fw-bold">= Capacidade de Aporte Livre</span>
                            <span className={`fw-bold ${dreData.margemLivre > 0 ? 'text-info' : 'text-danger'}`}>{formatCurrency(dreData.margemLivre)}</span>
                        </div>

                        {/* 3. INVESTIMENTOS (CONSTRUÇÃO) */}
                        <div className="p-4 border-bottom border-secondary border-opacity-50 hover-opacity cursor-pointer transition-all" onClick={() => toggleSection('investimento')} style={{ backgroundColor: expandSections.investimento ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="fw-bold text-light mb-1"><i className="bi bi-dash-circle-fill text-success me-2"></i>3. Investimentos & Futuro <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 ms-2 text-micro">CONSTRUÇÃO</span></h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="progress bg-secondary bg-opacity-25" style={{ width: '100px', height: '6px' }}>
                                            <div className={`progress-bar ${dreData.pctInvestimento < 20 ? 'bg-info' : 'bg-success'}`} style={{ width: `${Math.min(dreData.pctInvestimento, 100)}%` }}></div>
                                        </div>
                                        <small className={`text-micro fw-bold ${dreData.pctInvestimento < 20 ? 'text-info' : 'text-success'}`}>{dreData.pctInvestimento.toFixed(1)}% (Ideal: 20%+)</small>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <h5 className="fw-bold text-light mb-0">- {formatCurrency(dreData.grupos.investimento.total)}</h5>
                                    <small className="text-muted text-micro">Ver detalhes <i className={`bi bi-chevron-${expandSections.investimento ? 'up' : 'down'} ms-1`}></i></small>
                                </div>
                            </div>

                            {expandSections.investimento && (
                                <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 fade-in">
                                    {dreData.grupos.investimento.sortedItems?.map(item => (
                                        <div key={item.nome} className="d-flex justify-content-between py-2 px-3 mb-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <span className="text-muted small">{item.nome}</span>
                                            <span className="text-light small fw-bold">{formatCurrency(item.valor)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RESULTADO LÍQUIDO FINAL */}
                        <div className={`d-flex justify-content-between align-items-center p-4 ${dreData.resultadoFinal >= 0 ? 'bg-info bg-opacity-10 border-top border-info border-opacity-50' : 'bg-danger bg-opacity-10 border-top border-danger border-opacity-50'}`}>
                            <div>
                                <h5 className={`fw-bold mb-0 ${dreData.resultadoFinal >= 0 ? 'text-info' : 'text-danger'}`}>
                                    <i className={`bi ${dreData.resultadoFinal >= 0 ? 'bi-piggy-bank-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                                    Resultado Líquido (Sobra)
                                </h5>
                                <small className={`text-opacity-75 text-micro text-uppercase ${dreData.resultadoFinal >= 0 ? 'text-info' : 'text-danger'}`}>O que não foi gasto nem investido</small>
                            </div>
                            <h3 className={`fw-bold mb-0 ${dreData.resultadoFinal >= 0 ? 'text-info' : 'text-danger'}`}>{formatCurrency(dreData.resultadoFinal)}</h3>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}