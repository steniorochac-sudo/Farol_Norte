// src/pages/Transactions.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { parseDateBR, generateUUID } from '../utils/helpers';
import { db, cardsDb } from '../services/DataService';
import ImportModal from '../components/ImportModal'; 
import CustomSelect from '../components/CustomSelect';

export default function Transactions() {
    const { 
        transactions = [], 
        accounts = [], 
        categories = [], 
        currentAccountId, 
        changeAccount, 
        refreshData 
    } = useFinance() || {};

    // ==========================================
    // 1. ESTADOS DE INTERFACE E FILTROS
    // ==========================================
    const [showImportModal, setShowImportModal] = useState(false);

    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('transactions_search_pref') || '');
    const [selectedMonth, setSelectedMonth] = useState(() => localStorage.getItem('transactions_period_pref') || new Date().toISOString().slice(0, 7));
    const [selectedCategory, setSelectedCategory] = useState(() => localStorage.getItem('transactions_category_pref') || 'all');
    const [selectedType, setSelectedType] = useState(() => localStorage.getItem('transactions_type_pref') || 'all');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [selectedIds, setSelectedIds] = useState(new Set());

    const [modalEdit, setModalEdit] = useState({ show: false, transaction: null });
    const [modalMassSplit, setModalMassSplit] = useState({ show: false });

    useEffect(() => {
        localStorage.setItem('transactions_search_pref', searchTerm);
        localStorage.setItem('transactions_period_pref', selectedMonth);
        localStorage.setItem('transactions_category_pref', selectedCategory);
        localStorage.setItem('transactions_type_pref', selectedType);
        setCurrentPage(1); 
        setSelectedIds(new Set()); 
    }, [searchTerm, selectedMonth, selectedCategory, selectedType]);

    // ==========================================
    // 2. MOTOR DE FILTRAGEM (USEMEMO)
    // ==========================================
    const availableMonths = useMemo(() => {
        const months = new Set();
        transactions.forEach((t: any) => {
            if (t.data) {
                const parts = t.data.split('/');
                if (parts.length === 3) months.add(`${parts[2]}-${parts[1]}`);
            }
        });
        const current = new Date().toISOString().slice(0, 7);
        months.add(current);
        return Array.from(months).sort().reverse();
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((t: any) => {
            if (currentAccountId !== 'all' && t.account_id !== currentAccountId) return false;
            if (selectedType !== 'all' && t.tipoLancamento !== selectedType) return false;

            if (selectedMonth !== 'all') {
                const parts = t.data?.split('/');
                if (parts?.length === 3) {
                    const tMonth = `${parts[2]}-${parts[1]}`;
                    if (tMonth !== selectedMonth) return false;
                }
            }

            if (selectedCategory === 'NULL_CAT') {
                if (t.categoria && t.categoria !== 'Não classificada') return false;
            } else if (selectedCategory !== 'all') {
                let match = false;
                if (t.categoria === selectedCategory) match = true;
                if (!match && t.split && t.split.length > 0) {
                    if (t.split.some((part: any) => part.categoria === selectedCategory)) match = true;
                }
                if (!match) return false;
            }

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchNome = (t.nome || '').toLowerCase().includes(term);
                const matchCat = (t.categoria || '').toLowerCase().includes(term);
                let matchSplit = false;
                if (t.split) {
                    matchSplit = t.split.some((part: any) => part.categoria.toLowerCase().includes(term));
                }
                if (!matchNome && !matchCat && !matchSplit) return false;
            }

            return true;
        }).sort((a: any, b: any) => {
            const dateA = parseDateBR(a.data);
            const dateB = parseDateBR(b.data);
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB.getTime() - dateA.getTime();
        });
    }, [transactions, currentAccountId, selectedMonth, selectedCategory, selectedType, searchTerm]);

    const navegarMes = (dir: number) => {
        if (selectedMonth === 'all') return;
        const idx = availableMonths.indexOf(selectedMonth) + dir;
        if (idx >= 0 && idx < availableMonths.length) {
            setSelectedMonth(availableMonths[idx] as string);
        }
    };

    // MOTOR DE KPIs BLINDADO (Ignora Pagamentos de Fatura)
    const summary = useMemo(() => {
        return filteredTransactions.reduce((acc, t: any) => {
            const descLower = (t.nome || '').toLowerCase();
            const isFaturaByDesc = (t.tipoLancamento === 'conta' || !t.tipoLancamento) && t.valor < 0 && (descLower.includes('pagamento fatura') || descLower.includes('pgto fatura') || descLower.includes('pagamento de fatura'));
            const isPagamento = t.tipo === 'Pagamento de Fatura' || t.categoria === 'Pagamento de Fatura' || !!t.ignorarNoFluxo || isFaturaByDesc;

            if (isPagamento) return acc;

            let valorConsiderado = t.valor;
            if (selectedCategory !== 'all' && selectedCategory !== 'NULL_CAT' && t.split) {
                const part = t.split.find((s: any) => s.categoria === selectedCategory);
                if (part) valorConsiderado = part.valor;
            }

            if (valorConsiderado > 0) acc.receitas += valorConsiderado;
            else acc.despesas += Math.abs(valorConsiderado);
            return acc;
        }, { receitas: 0, despesas: 0 });
    }, [filteredTransactions, selectedCategory]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // ==========================================
    // 3. AÇÕES EM MASSA
    // ==========================================
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAllPage = (e: any) => {
        const newSet = new Set(selectedIds);
        paginatedTransactions.forEach((t: any) => {
            if (e.target.checked) newSet.add(t.identificador);
            else newSet.delete(t.identificador);
        });
        setSelectedIds(newSet);
    };

    const handleMassDelete = () => {
        if (!window.confirm(`🔴 PERIGO: Excluir ${selectedIds.size} transações permanentemente?`)) return;
        const allT = db.getAll().filter((t: any) => !selectedIds.has(t.identificador));
        db.save(allT);
        refreshData();
        setSelectedIds(new Set());
    };

    const handleMassCategorize = (novaCategoria: string) => {
        if (!novaCategoria) return;
        if (!window.confirm(`Classificar ${selectedIds.size} itens como "${novaCategoria}"?`)) return;

        const allT = db.getAll();
        allT.forEach((t: any) => {
            if (selectedIds.has(t.identificador)) {
                if (t.tipo === 'Pagamento de Fatura' && novaCategoria !== 'Pagamento de Fatura') return; 
                t.categoria = novaCategoria;
                if (novaCategoria === 'Pagamento de Fatura') t.tipo = 'Pagamento de Fatura';
                delete t.split;
            }
        });
        db.save(allT);
        refreshData();
        setSelectedIds(new Set());
    };

    // ==========================================
    // PREPARAÇÃO DE OPÇÕES PARA OS CUSTOM SELECTS
    // ==========================================
    const accountOptions = [
        { value: 'all', label: '🏦 Todas as Contas' },
        ...accounts.map((acc: any) => ({ value: acc.id, label: acc.nome }))
    ];

    const monthOptions = [
        { value: 'all', label: '📅 Histórico Todo' },
        { value: 'disabled', label: '---', disabled: true },
        ...availableMonths.map((mesAno: any) => {
            const [ano, mes] = mesAno.split('-');
            const dateObj = new Date(ano, mes - 1, 1);
            const nomeMes = dateObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
            return { value: mesAno, label: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) };
        })
    ];

    const categoryOptions = [
        { value: 'all', label: '🏷️ Todas Categorias' },
        { value: 'NULL_CAT', label: '⚠️ Sem Classificação' },
        { value: 'disabled', label: '---', disabled: true },
        ...categories.map((cat: any) => ({ value: cat.nome, label: cat.nome }))
    ];

    const typeOptions = [
        { value: 'all', label: '💳 Todos os Tipos' },
        { value: 'conta', label: 'Débito / Pix' },
        { value: 'cartao', label: 'Cartão de Crédito' }
    ];

    const massCategoryOptions = [
        { value: '', label: 'Classificar como...' },
        { value: 'disabled', label: '---', disabled: true },
        ...categories.map((cat: any) => ({ value: cat.nome, label: cat.nome }))
    ];

    // ==========================================
    // 4. RENDERIZAÇÃO
    // ==========================================
    return (
        <div className="container mt-4 position-relative pb-5 fade-in">
            {/* Cabeçalho e Resumo */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <h2 className="fw-bold"><i className="bi bi-arrow-left-right text-warning me-2"></i> Transações</h2>
                <div className="d-flex gap-2 flex-wrap">
                    <span className="badge bg-success p-2 shadow-sm fs-6 radius-12">Entradas: {formatCurrency(summary.receitas)}</span>
                    <span className="badge bg-danger p-2 shadow-sm fs-6 radius-12">Saídas: {formatCurrency(summary.despesas)}</span>
                    <span className="badge theme-surface border-warning border-opacity-50 p-2 shadow-sm fs-6 text-light radius-12">Saldo: {formatCurrency(summary.receitas - summary.despesas)}</span>
                </div>
            </div>

            {/* Barra de Filtros e Ações */}
            <div className="theme-surface shadow-sm p-3 mb-4 position-relative z-100">
                <div className="d-flex gap-2 mb-3 flex-wrap">
                    <button className="btn btn-warning fw-bold text-dark" onClick={() => setModalEdit({ show: true, transaction: null })}>
                        <i className="bi bi-plus-lg me-2"></i>Nova Transação
                    </button>
                    <button className="btn btn-outline-light fw-bold" onClick={() => setShowImportModal(true)}>
                        <i className="bi bi-cloud-upload me-2"></i>Importar Dados
                    </button>
                    <button className="btn btn-outline-danger fw-bold ms-auto border-0" onClick={() => {
                        setSearchTerm(''); setSelectedCategory('all'); setSelectedType('all');
                    }}><i className="bi bi-eraser-fill me-1"></i> Limpar Filtros</button>
                </div>

                <div className="row g-2">
                    <div className="col-md-2 position-relative" style={{ zIndex: 104 }}>
                        <CustomSelect options={accountOptions} value={currentAccountId} onChange={(val) => changeAccount(val)} textColor="text-warning" />
                    </div>
                    
                    <div className="col-md-3 position-relative" style={{ zIndex: 103 }}> 
                        <div className="input-group flex-nowrap w-100">
                            <button className="btn btn-outline-secondary text-white-50 border-secondary radius-left-8" onClick={() => navegarMes(1)} disabled={selectedMonth === 'all' || availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}><i className="bi bi-chevron-left"></i></button>
                            <div className="w-100 position-relative z-150">
                                <div className="h-100 mx-n1">
                                    <CustomSelect options={monthOptions} value={selectedMonth} onChange={(val) => setSelectedMonth(val)} className="h-100" textColor="text-light" />
                                </div>
                            </div>
                            <button className="btn btn-outline-secondary text-white-50 border-secondary radius-right-8" onClick={() => navegarMes(-1)} disabled={selectedMonth === 'all' || availableMonths.indexOf(selectedMonth) <= 0}><i className="bi bi-chevron-right"></i></button>
                        </div>
                    </div>

                    <div className="col-md-3 position-relative" style={{ zIndex: 102 }}>
                        <CustomSelect options={categoryOptions} value={selectedCategory} onChange={(val) => setSelectedCategory(val)} textColor="text-light" />
                    </div>

                    <div className="col-md-2 position-relative" style={{ zIndex: 101 }}>
                        <CustomSelect options={typeOptions} value={selectedType} onChange={(val) => setSelectedType(val)} textColor="text-light" />
                    </div>

                    <div className="col-md-2">
                        <input type="text" className="form-control" placeholder="🔍 Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ height: '100%' }} />
                    </div>
                </div>
            </div>

            {/* Paginação Superior */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Exibindo {paginatedTransactions.length} de {filteredTransactions.length}</small>
                    <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary text-white-50 border-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><i className="bi bi-chevron-left"></i></button>
                        <button className="btn btn-outline-secondary border-secondary disabled text-light fw-bold" style={{opacity: 1}}>{currentPage} / {totalPages}</button>
                        <button className="btn btn-outline-secondary text-white-50 border-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><i className="bi bi-chevron-right"></i></button>
                    </div>
                </div>
            )}

            {/* Tabela de Dados */}
            <div className="theme-surface shadow-sm border-0">
                <div className="list-group list-group-flush bg-transparent">
                    {/* Header da Tabela */}
                    <div className="list-group-item bg-transparent border-bottom border-secondary border-opacity-50 d-flex align-items-center py-3">
                        <div className="form-check m-0">
                            <input className="form-check-input bg-transparent border-secondary" type="checkbox"
                                checked={paginatedTransactions.length > 0 && paginatedTransactions.every((t: any) => selectedIds.has(t.identificador))}
                                onChange={toggleAllPage} style={{ cursor: 'pointer' }} />
                        </div>
                        <span className="ms-2 small fw-bold text-warning text-uppercase">Selecionar Página</span>
                    </div>

                    {paginatedTransactions.length === 0 ? (
                        <div className="text-center p-5 text-muted">Nenhuma transação encontrada.</div>
                    ) : (
                        paginatedTransactions.map((t: any) => {
                            let valorDisplay = t.valor;
                            let isPartial = false;
                            if (selectedCategory !== 'all' && selectedCategory !== 'NULL_CAT' && t.split) {
                                const part = t.split.find((s: any) => s.categoria === selectedCategory);
                                if (part) { valorDisplay = part.valor; isPartial = true; }
                            }

                            const isSelected = selectedIds.has(t.identificador);
                            const isPositive = valorDisplay >= 0;
                            const isCartao = t.tipoLancamento === 'cartao' || !!t.card_id;
                            const isPago = t.status === 'pago';
                            
                            const descLower = (t.nome || '').toLowerCase();
                            const isFaturaByDesc = (t.tipoLancamento === 'conta' || !t.tipoLancamento) && t.valor < 0 && (descLower.includes('pagamento fatura') || descLower.includes('pgto fatura') || descLower.includes('pagamento de fatura'));
                            const isPagamento = t.tipo === 'Pagamento de Fatura' || t.categoria === 'Pagamento de Fatura' || !!t.ignorarNoFluxo || isFaturaByDesc;

                            let vencStatusClass = "text-muted opacity-75";
                            let vencIcon = "bi-calendar-event opacity-75";
                            let vencText = t.data;
                            let showCompraDate = false;

                            const hoje = new Date();
                            hoje.setHours(0, 0, 0, 0);

                            if (isCartao) {
                                showCompraDate = true;
                                let finalVencimento = t.dataVencimento;
                                const isVencimentoValido = finalVencimento && finalVencimento !== 'undefined' && finalVencimento !== 'NaN' && finalVencimento !== 'null';
                                
                                if (!isVencimentoValido && t.data) {
                                    const cards = cardsDb.getAll();
                                    const card = cards.find(c => c.id === t.card_id || c.id === t.account_id);
                                    if (card) {
                                        const [dStr, mStr, yStr] = t.data.split('/');
                                        const diaCompra = parseInt(dStr, 10);
                                        let mesFatura = parseInt(mStr, 10);
                                        let anoFatura = parseInt(yStr, 10);
                                        
                                        const fechamento = parseInt((card as any).closingDay || (card as any).diaFechamento || '1', 10);
                                        const vencimento = parseInt((card as any).dueDay || (card as any).diaVencimento || '10', 10);
                                        
                                        if (diaCompra >= fechamento) {
                                            mesFatura++;
                                            if (mesFatura > 12) { mesFatura = 1; anoFatura++; }
                                        }
                                        finalVencimento = `${String(vencimento).padStart(2, '0')}/${String(mesFatura).padStart(2, '0')}/${anoFatura}`;
                                    } else {
                                        finalVencimento = t.data;
                                    }
                                }

                                const dataRef = finalVencimento || t.data;
                                const vencDate = parseDateBR(dataRef);

                                if (isPago) {
                                    vencStatusClass = "text-muted opacity-75";
                                    vencIcon = "bi-check-circle-fill text-success opacity-75";
                                    vencText = `Fatura Paga (${dataRef})`;
                                } else if (vencDate) {
                                    if (vencDate < hoje) {
                                        vencStatusClass = "text-danger fw-bold bg-danger bg-opacity-10 px-2 rounded";
                                        vencIcon = "bi-exclamation-circle-fill text-danger";
                                        vencText = `Venc: ${dataRef} (Atrasado)`;
                                    } else if (vencDate.getTime() === hoje.getTime()) {
                                        vencStatusClass = "text-warning fw-bold bg-warning bg-opacity-10 px-2 rounded";
                                        vencIcon = "bi-clock-fill text-warning";
                                        vencText = `Vence Hoje: ${dataRef}`;
                                    } else {
                                        vencStatusClass = "text-info";
                                        vencIcon = "bi-calendar-event";
                                        vencText = `Venc: ${dataRef}`;
                                    }
                                } else {
                                    vencStatusClass = "text-warning";
                                    vencIcon = "bi-exclamation-triangle";
                                    vencText = `Vencimento Indisponível`;
                                }
                            }

                            return (
                                <div key={t.identificador} className={`list-group-item bg-transparent d-flex align-items-center gap-3 py-3 px-3 border-bottom border-secondary border-opacity-25 hover-opacity ${isSelected ? 'bg-primary bg-opacity-25' : ''}`} style={{ borderLeft: isSelected ? '4px solid var(--farol-glow)' : '1px solid transparent' }}>
                                    
                                    {/* 1. CHECKBOX */}
                                    <div className="form-check m-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <input className="form-check-input bg-transparent border-secondary" type="checkbox" checked={isSelected} onChange={() => toggleSelection(t.identificador)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                                    </div>

                                    {/* 7. ÁREA CLICÁVEL COM ÍCONES E TEXTO */}
                                    <div className="d-flex flex-grow-1 align-items-center gap-3 cursor-pointer" style={{ minWidth: 0 }} onClick={() => setModalEdit({ show: true, transaction: t as any })}>
                                        
                                        {/* 2. ÍCONES DINÂMICOS (Verde, Vermelho ou Amarelo) */}
                                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                            <i className={`bi fs-5 ${isCartao ? 'bi-credit-card text-warning' : (isPositive ? 'bi-bank text-success' : 'bi-bank text-danger')}`}></i>
                                        </div>

                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="d-flex justify-content-between align-items-center gap-2">
                                                {/* 3. DESCRIÇÃO */}
                                                <div className="fw-bold text-light text-truncate" title={t.nome} style={{ flex: 1 }}>
                                                    {t.nome}
                                                </div>
                                                {/* 5. VALOR */}
                                                <div className={`fw-bold text-nowrap flex-shrink-0 ${isPositive ? 'text-success' : 'text-danger'}`}>
                                                    {isPartial && <i className="bi bi-pie-chart-fill text-warning me-1" title="Valor rateado"></i>}
                                                    {formatCurrency(valorDisplay)}
                                                </div>
                                            </div>

                                            {/* LINHA DE DATAS E TAGS (Responsiva) */}
                                            <div className="d-flex flex-wrap align-items-center mt-2 gap-2 small" style={{ minWidth: 0 }}>
                                                
                                                {/* 4. LEGENDA DUPLA DE DATAS */}
                                                <div className="d-flex flex-wrap align-items-center gap-2 flex-shrink-0">
                                                    {showCompraDate && (
                                                        <span className="text-muted d-flex align-items-center bg-secondary bg-opacity-10 px-2 rounded" style={{ fontSize: '0.75rem' }} title="Data da Compra">
                                                            <i className="bi bi-cart3 me-1"></i>
                                                            <span className="d-md-none">{t.data.substring(0, 5)}</span>
                                                            <span className="d-none d-md-inline">{t.data}</span>
                                                        </span>
                                                    )}
                                                    <span className={`${vencStatusClass} d-flex align-items-center`} title={isCartao ? "Data de Vencimento" : "Data da Transação"}>
                                                        <i className={`bi ${vencIcon} me-1`}></i>
                                                        <span style={{ fontSize: '0.75rem' }}>{vencText}</span>
                                                    </span>
                                                </div>

                                                {/* 6. TAGS DE CATEGORIA E STATUS */}
                                                <div className="d-flex flex-wrap gap-1" style={{ flex: '1 1 auto', minWidth: '80px' }}>
                                                    {t.split && t.split.length > 0 ? (
                                                        t.split.map((p: any, idx: number) => (
                                                            <span key={idx} className={`badge ${p.categoria === selectedCategory ? 'bg-warning text-dark' : 'bg-transparent text-muted border border-secondary border-opacity-50'}`} style={{ fontSize: '0.7rem' }}>
                                                                {p.categoria}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className={`badge ${t.categoria && t.categoria !== 'Não classificada' ? 'bg-transparent text-muted border border-secondary border-opacity-50' : 'bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50'}`} style={{ fontSize: '0.7rem' }}>
                                                            {t.categoria || 'Não classificada'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="ms-auto flex-shrink-0">
                                                    {isPagamento && <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-50" style={{ fontSize: '0.7rem' }}>Pagamento</span>}
                                                    
                                                    {!isPositive && !isPagamento && (
                                                        <>
                                                            {!isCartao ? (
                                                                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50" style={{ fontSize: '0.7rem' }}><i className="bi bi-check2-all me-1"></i>Pago</span>
                                                            ) : (
                                                                isPago ? (
                                                                    <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50" style={{ fontSize: '0.7rem' }}><i className="bi bi-check2-all me-1"></i>Pago</span>
                                                                ) : (
                                                                    (parseDateBR(t.dataVencimento || t.data) && parseDateBR(t.dataVencimento || t.data)! < hoje) ? (
                                                                        <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50" style={{ fontSize: '0.7rem' }}><i className="bi bi-exclamation-triangle-fill me-1"></i>Pendente</span>
                                                                    ) : (
                                                                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50" style={{ fontSize: '0.7rem' }}>Na Fatura</span>
                                                                    )
                                                                )
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* BARRA FLUTUANTE DE EDIÇÃO EM MASSA */}
            {selectedIds.size > 0 && (
                <div className="position-fixed bottom-0 start-0 w-100 theme-surface p-3 shadow-lg d-flex justify-content-between align-items-center fade-in border-top border-secondary border-opacity-50" style={{ zIndex: 1060, borderRadius: '16px 16px 0 0' }}>
                    <div className="d-flex align-items-center gap-3">
                        <span className="badge bg-warning text-dark fs-6 rounded-pill">{selectedIds.size}</span>
                        <span className="d-none d-md-inline fw-bold text-light">Selecionadas</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        
                        <div style={{ width: '200px' }}>
                            <CustomSelect options={massCategoryOptions} value="" onChange={(val) => handleMassCategorize(val)} textColor="text-light" />
                        </div>

                        <button className="btn btn-sm btn-outline-warning fw-bold d-none d-md-block" onClick={() => setModalMassSplit({ show: true })}>
                            <i className="bi bi-pie-chart-fill me-1"></i> Rateio
                        </button>
                        <button className="btn btn-sm btn-outline-danger fw-bold" onClick={handleMassDelete}>
                            <i className="bi bi-trash"></i> <span className="d-none d-md-inline">Excluir</span>
                        </button>
                        <button className="btn btn-sm theme-surface btn-light ms-2" onClick={() => setSelectedIds(new Set())}><i className="bi bi-x-lg text-dark"></i></button>
                    </div>
                </div>
            )}
            
            <ImportModal show={showImportModal} onClose={() => setShowImportModal(false)} />
            {modalEdit.show && <TransactionEditModal transaction={modalEdit.transaction} onClose={() => setModalEdit({ show: false, transaction: null })} accounts={accounts} categories={categories} refreshData={refreshData} />}
            {modalMassSplit.show && <MassSplitModal selectedIds={selectedIds} categories={categories} onClose={() => { setModalMassSplit({ show: false }); setSelectedIds(new Set()); }} refreshData={refreshData} />}
        </div>
    );
}

// =========================================================
// SUB-COMPONENTE: MODAL DE EDIÇÃO E CRIAÇÃO (COM RATEIO)
// =========================================================
function TransactionEditModal({ transaction, onClose, accounts, categories, refreshData }: any) {
    const isNew = !transaction;

    const [desc, setDesc] = useState(isNew ? '' : (transaction.nome || ''));
    const [valorVisual, setValorVisual] = useState(isNew ? '' : Math.abs(transaction.valor || 0).toString());
    const [dataIso, setDataIso] = useState(() => {
        if (isNew || !transaction.data) return new Date().toISOString().split('T')[0];
        const [d, m, y] = transaction.data.split('/');
        return `${y}-${m}-${d}`;
    });
    const [accountId, setAccountId] = useState(isNew ? (accounts[0]?.id || '') : (transaction.account_id || ''));
    const [isReceita, setIsReceita] = useState(isNew ? false : (transaction.valor >= 0));

    const [isSplit, setIsSplit] = useState(!isNew && transaction.split && transaction.split.length > 0);
    const [singleCategory, setSingleCategory] = useState(isNew ? 'Não classificada' : (transaction.categoria || 'Não classificada'));
    const [splits, setSplits] = useState(!isNew && transaction.split ? transaction.split.map((s: any) => ({ ...s, valor: Math.abs(s.valor || 0) })) : []);

    const handleSave = (e: any) => {
        e.preventDefault();
        const multiplier = isReceita ? 1 : -1;
        const valorFinalVisual = parseFloat(valorVisual);

        if (!desc || isNaN(valorFinalVisual) || !dataIso || !accountId) return alert("Preencha os obrigatórios.");

        const [y, m, d] = dataIso.split('-');
        const dataBR = `${d}/${m}/${y}`;

        // Sincroniza o tipo se classificado manualmente
        let finalTipo = isNew ? (isReceita ? 'Receita Manual' : 'Despesa Manual') : transaction?.tipo || '';
        if (singleCategory === 'Pagamento de Fatura') finalTipo = 'Pagamento de Fatura';

        const isCartao = cardsDb.getAll().some(c => c.id === accountId);

        let finalTransaction: any = {
            identificador: isNew ? `manual-${generateUUID()}` : transaction.identificador,
            data: dataBR,
            dataVencimento: isNew ? dataBR : (transaction.dataVencimento || dataBR),
            dataPagamento: isNew ? dataBR : (transaction.dataPagamento || dataBR),
            nome: desc,
            valor: valorFinalVisual * multiplier,
            account_id: accountId,
            tipoLancamento: isNew ? (isCartao ? 'cartao' : 'conta') : transaction.tipoLancamento,
            status: isNew ? (isCartao ? 'pendente' : 'pago') : transaction.status,
            tipo: finalTipo
        };

        if (isSplit) {
            let somaFatias = 0;
            const splitFinal = splits.map((s: any) => {
                somaFatias += parseFloat(s.valor || 0);
                return { categoria: s.categoria || 'Não classificada', valor: parseFloat(s.valor || 0) * multiplier };
            });

            if (Math.abs(somaFatias - valorFinalVisual) > 0.02) {
                return alert(`A soma do rateio (${formatCurrency(somaFatias)}) não bate com o total (${formatCurrency(valorFinalVisual)}).`);
            }
            finalTransaction.split = splitFinal;
            finalTransaction.categoria = 'Múltipla';
        } else {
            finalTransaction.categoria = singleCategory;
            finalTransaction.split = undefined;
        }

        const allT = db.getAll();
        if (isNew) {
            allT.push(finalTransaction);
        } else {
            const idx = allT.findIndex((t: any) => t.identificador === transaction.identificador);
            if (idx > -1) allT[idx] = { ...allT[idx], ...finalTransaction };
        }

        db.save(allT);
        refreshData();
        onClose();
    };

    const accountOptions = accounts.map((a: any) => ({ value: a.id, label: a.nome }));
    const categoryOptions = [
        { value: 'Não classificada', label: 'Sem Categoria' },
        { value: 'disabled', label: '---', disabled: true },
        ...categories.map((c: any) => ({ value: c.nome, label: c.nome }))
    ];

    const isAccountDisabled = !isNew && transaction.tipoLancamento === 'cartao';

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content theme-surface shadow-lg">
                    <form onSubmit={handleSave}>
                        <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                            <h5 className="modal-title fw-bold text-light">{isNew ? 'Nova Transação' : 'Editar Transação'}</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                        </div>
                        <div className="modal-body p-4">

                            <div className="btn-group w-100 mb-4 shadow-sm" role="group">
                                <input type="radio" className="btn-check" id="radioDesp" checked={!isReceita} onChange={() => setIsReceita(false)} />
                                <label className={`btn ${!isReceita ? 'btn-danger text-white border-danger' : 'btn-outline-danger border-opacity-50'} fw-bold`} htmlFor="radioDesp">Saída (-)</label>

                                <input type="radio" className="btn-check" id="radioRec" checked={isReceita} onChange={() => setIsReceita(true)} />
                                <label className={`btn ${isReceita ? 'btn-success text-white border-success' : 'btn-outline-success border-opacity-50'} fw-bold`} htmlFor="radioRec">Entrada (+)</label>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-8 mb-3 mb-md-0">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Descrição</label>
                                    <input type="text" className="form-control" value={desc || ''} onChange={e => setDesc(e.target.value)} required />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Data</label>
                                    <input type="date" className="form-control text-light" value={dataIso || ''} onChange={e => setDataIso(e.target.value)} required />
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6 mb-3 mb-md-0">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Valor (R$)</label>
                                    <input type="number" step="0.01" className={`form-control fw-bold fs-5 ${!isReceita ? 'text-danger' : 'text-success'}`} value={valorVisual || ''} onChange={e => setValorVisual(e.target.value)} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Conta Vinculada</label>
                                    <div style={{ pointerEvents: isAccountDisabled ? 'none' : 'auto', opacity: isAccountDisabled ? 0.5 : 1, position: 'relative', zIndex: 105 }}>
                                        <CustomSelect options={accountOptions} value={accountId || accounts[0]?.id} onChange={val => setAccountId(val)} textColor="text-light" />
                                    </div>
                                    {isAccountDisabled && <small className="text-warning d-block mt-1" style={{fontSize: '0.75rem'}}><i className="bi bi-info-circle me-1"></i>A conta de cartão não pode ser alterada aqui.</small>}
                                </div>
                            </div>

                            <hr className="border-secondary border-opacity-25 my-4" />

                            <div className="form-check form-switch mb-4">
                                <input className="form-check-input bg-transparent border-secondary" type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} style={{cursor: 'pointer'}} />
                                <label className="form-check-label fw-bold text-light" style={{cursor: 'pointer'}}><i className="bi bi-pie-chart-fill text-warning me-2"></i>Dividir em Múltiplas Categorias (Rateio)</label>
                            </div>

                            {!isSplit ? (
                                <div className="mb-3 bg-white theme-surface bg-opacity-5 p-4 rounded-4 border border-secondary border-opacity-25">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Classificação</label>
                                    <div style={{ position: 'relative', zIndex: 104 }}>
                                        <CustomSelect options={categoryOptions} value={singleCategory || 'Não classificada'} onChange={val => setSingleCategory(val)} textColor="text-light" />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white bg-opacity-5 theme-surface p-4 rounded-4 border border-warning border-opacity-50">
                                    {splits.map((s: any, index: number) => (
                                        <div key={index} className="d-flex gap-2 mb-3 position-relative" style={{ zIndex: 100 - index }}>
                                            <div style={{ flex: 1, minWidth: '140px' }}>
                                                <CustomSelect options={categoryOptions} value={s.categoria || 'Não classificada'} onChange={val => { const newS = [...splits]; newS[index].categoria = val; setSplits(newS); }} textColor="text-light" />
                                            </div>
                                            <input type="number" step="0.01" className="form-control form-control-sm text-light" placeholder="R$" value={s.valor || ''} onChange={e => { const newS = [...splits]; newS[index].valor = e.target.value; setSplits(newS); }} style={{ width: '100px' }} />
                                            <button type="button" className="btn btn-sm btn-outline-danger border-opacity-50" onClick={() => setSplits(splits.filter((_: any, i: number) => i !== index))}><i className="bi bi-trash"></i></button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-sm btn-outline-warning w-100 fw-bold mt-2 border-dashed" onClick={() => setSplits([...splits, { categoria: 'Não classificada', valor: '' }])}>
                                        + Adicionar Fatia de Rateio
                                    </button>
                                    <div className="mt-4 text-end small">
                                        <span className="text-muted fw-bold me-2">Soma do Rateio:</span> 
                                        <span className={`fs-6 fw-bold ${Math.abs(splits.reduce((acc: number, curr: any) => acc + (parseFloat(curr.valor) || 0), 0) - (parseFloat(valorVisual) || 0)) <= 0.02 ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(splits.reduce((acc: number, curr: any) => acc + (parseFloat(curr.valor) || 0), 0))} / {formatCurrency(valorVisual)}
                                        </span>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                            <button type="button" className="btn btn-outline-light border-0" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-warning fw-bold px-4 text-dark shadow-sm">Salvar Registro</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// =========================================================
// SUB-COMPONENTE: MODAL DE RATEIO EM MASSA
// =========================================================
function MassSplitModal({ selectedIds, categories, onClose, refreshData }: any) {
    const [splits, setSplits] = useState([{ categoria: '', pct: '50' }, { categoria: '', pct: '50' }]);
    const totalPct = splits.reduce((acc, s) => acc + (parseFloat(s.pct) || 0), 0);

    const handleApply = () => {
        if (totalPct !== 100) return alert(`O total deve ser exatamente 100%. Atual: ${totalPct}%`);

        const allT = db.getAll();
        let count = 0;

        allT.forEach((t: any) => {
            if (selectedIds.has(t.identificador)) {
                const valorTotal = t.valor; 
                const novosSplits = [];
                let somaParcial = 0;

                for (let i = 0; i < splits.length - 1; i++) {
                    const regra = splits[i];
                    const valorFatia = parseFloat((valorTotal * (parseFloat(regra.pct) / 100)).toFixed(2));
                    novosSplits.push({ categoria: regra.categoria, valor: valorFatia });
                    somaParcial += valorFatia;
                }

                const ultimaRegra = splits[splits.length - 1];
                const resto = parseFloat((valorTotal - somaParcial).toFixed(2));
                novosSplits.push({ categoria: ultimaRegra.categoria, valor: resto });

                t.split = novosSplits;
                t.categoria = 'Múltipla';
                count++;
            }
        });

        db.save(allT);
        refreshData();
        alert(`${count} transações rateadas com sucesso!`);
        onClose();
    };

    const categoryOptions = [
        { value: '', label: 'Selecione...' },
        { value: 'disabled', label: '---', disabled: true },
        ...categories.map((c: any) => ({ value: c.nome, label: c.nome }))
    ];

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog">
                <div className="modal-content theme-surface shadow-lg">
                    <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                        <h5 className="modal-title fw-bold text-light"><i className="bi bi-pie-chart-fill me-2 text-warning"></i>Rateio em Lote ({selectedIds.size} itens)</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        <p className="small text-muted mb-4">Defina as porcentagens matemáticas. A divisão será calculada e aplicada a todas as transações selecionadas.</p>

                        {splits.map((s, index) => (
                            <div key={index} className="d-flex gap-2 mb-3 position-relative" style={{ zIndex: 100 - index }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <CustomSelect options={categoryOptions} value={s.categoria} onChange={val => { const n = [...splits]; n[index].categoria = val; setSplits(n); }} textColor="text-light" />
                                </div>
                                <div className="input-group input-group-sm" style={{ width: '120px' }}>
                                    <input type="number" className="form-control text-light fw-bold" value={s.pct} onChange={e => { const n = [...splits]; n[index].pct = e.target.value; setSplits(n); }} />
                                    <span className="input-group-text bg-transparent border-secondary text-muted">%</span>
                                </div>
                                <button type="button" className="btn btn-sm btn-outline-danger border-opacity-50" onClick={() => setSplits(splits.filter((_: any, i: number) => i !== index))}><i className="bi bi-trash"></i></button>
                            </div>
                        ))}

                        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary border-opacity-25">
                            <button className="btn btn-sm btn-outline-light fw-bold border-dashed" onClick={() => setSplits([...splits, { categoria: '', pct: '0' }])}>+ Adicionar Divisão</button>
                            <span className={`fw-bold fs-5 ${totalPct === 100 ? 'text-success' : 'text-danger'}`}>Total: {totalPct}%</span>
                        </div>
                    </div>
                    <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                        <button type="button" className="btn btn-outline-light border-0" onClick={onClose}>Cancelar</button>
                        <button type="button" className="btn btn-warning fw-bold text-dark shadow-sm" onClick={handleApply}>Aplicar aos Itens</button>
                    </div>
                </div>
            </div>
        </div>
    );
}