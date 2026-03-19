// src/pages/CreditCards.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { cardsDb, db } from '../services/DataService';
import { formatCurrency } from '../utils/formatters';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import type { CreditCard, Transaction } from '../types/index';

// =========================================================
// INTERFACES LOCAIS (Para o Motor de Faturas)
// =========================================================
interface Fatura {
    gastos: any[];
    pagamentosVinculados: any[];
    totalGastos: number;
    totalPago: number;
    status: 'ABERTO' | 'PAGO' | 'SUPER' | 'PARCIAL';
    saldoRestante: number;
}

interface PagamentoProcessado {
    original: any;
    valorTotal: number;
    valorUsado: number;
    disponivel: number;
}

// =========================================================
// FUNÇÕES PURAS (Regras de Negócio)
// =========================================================
function calcularMesReferencia(dataStr: string, diaFechamento: number): string {
    if (!dataStr) return "";
    const parts = dataStr.split("/");
    const dia = parseInt(parts[0]);
    let mes = parseInt(parts[1]);
    let ano = parseInt(parts[2]);

    if (dia >= diaFechamento) {
        mes++;
        if (mes > 12) {
            mes = 1;
            ano++;
        }
    }
    return `${ano}-${String(mes).padStart(2, "0")}`;
}

function formatMonthLabel(mesIso: string): string {
    const [ano, mes] = mesIso.split("-");
    const dateObj = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const nomeMes = dateObj.toLocaleString("pt-BR", { month: "long" });
    return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + " " + ano;
}

function criarFaturaVazia(): Fatura {
    return { gastos: [], pagamentosVinculados: [], totalGastos: 0, totalPago: 0, status: "ABERTO", saldoRestante: 0 };
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
export default function CreditCards() {
    const { transactions = [], currentAccountId = 'all', refreshData = () => {} } = useFinance();
    
    // 1. ESTADOS PRINCIPAIS
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState<string | null>(() => localStorage.getItem("creditcard_last_month") || null);
    
    // 2. ESTADOS DO NOVO MODAL WIZARD (Passo a Passo)
    const [showModal, setShowModal] = useState<boolean>(false);
    const [linkStep, setLinkStep] = useState<number>(1);
    const [targetInvoiceMonth, setTargetInvoiceMonth] = useState<string | null>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());

    // 3. DADOS BÁSICOS (Cartões)
    const cartoes = cardsDb.getAll();
    const cartoesDaConta = currentAccountId === "all" ? cartoes : cartoes.filter((c: any) => c.account_id === currentAccountId);

    // EFEITO: Seleção Automática Inicial
    useEffect(() => {
        if (cartoesDaConta.length > 0 && (!selectedCardId || !cartoesDaConta.find(c => c.id === selectedCardId))) {
            setSelectedCardId(cartoesDaConta[0].id);
        }
    }, [cartoesDaConta, selectedCardId]);

    // 4. MEMORIZAÇÃO: Processamento Pesado da Fatura
    const { faturas, pagamentosProcessados, closingDay } = useMemo(() => {
        if (!selectedCardId) return { faturas: {} as Record<string, Fatura>, pagamentosProcessados: [], closingDay: 1 };
        
        const cardObj = cartoesDaConta.find((c) => c.id === selectedCardId);
        const cDay = cardObj ? parseInt((cardObj as any).closingDay) : 1;
        const allTrans = transactions.filter((t: any) => t.card_id === selectedCardId);

        const fatObj: Record<string, Fatura> = {};
        const pgtosProc: PagamentoProcessado[] = [];

        allTrans.forEach((t: any) => {
            if (t.tipo !== "Pagamento de Fatura") {
                const mesRef = calcularMesReferencia(t.data, cDay);
                if (!fatObj[mesRef]) fatObj[mesRef] = criarFaturaVazia();

                fatObj[mesRef].gastos.push(t);
                if (t.valor < 0) fatObj[mesRef].totalGastos += Math.abs(t.valor);
                else fatObj[mesRef].totalGastos -= t.valor;
            }
        });

        allTrans.forEach((t: any) => {
            if (t.tipo === "Pagamento de Fatura") {
                const valorTotal = t.valor;
                let valorUsado = 0;

                if (t.faturaLinks && Array.isArray(t.faturaLinks)) {
                    t.faturaLinks.forEach((link: any) => {
                        if (!fatObj[link.mes]) fatObj[link.mes] = criarFaturaVazia();
                        fatObj[link.mes].pagamentosVinculados.push({ ...t, valorVinculado: link.valor });
                        fatObj[link.mes].totalPago += link.valor;
                        valorUsado += link.valor;
                    });
                }

                const disponivel = valorTotal - valorUsado;
                pgtosProc.push({ original: t, valorTotal, valorUsado, disponivel: disponivel > 0.01 ? disponivel : 0 });
            }
        });

        Object.keys(fatObj).forEach((mes) => {
            const f = fatObj[mes];
            if (f.totalGastos < 0) f.totalGastos = 0;
            const saldo = f.totalGastos - f.totalPago;
            f.saldoRestante = saldo;

            if (saldo <= 1 && saldo >= -1) f.status = "PAGO";
            else if (saldo < -1) f.status = "SUPER";
            else if (f.totalPago > 0) f.status = "PARCIAL";
            else f.status = "ABERTO";
        });

        return { faturas: fatObj, pagamentosProcessados: pgtosProc, closingDay: cDay };
    }, [transactions, selectedCardId, cartoesDaConta]);

    // 5. GERENCIAMENTO DE MÊS DA FATURA
    const mesesDisponiveis = useMemo(() => Object.keys(faturas).sort().reverse(), [faturas]);

    useEffect(() => {
        if (mesesDisponiveis.length > 0) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            if (!selectedInvoiceMonth || !faturas[selectedInvoiceMonth]) {
                const saved = localStorage.getItem("creditcard_last_month");
                if (saved && faturas[saved]) setSelectedInvoiceMonth(saved);
                else if (faturas[currentMonth]) setSelectedInvoiceMonth(currentMonth);
                else setSelectedInvoiceMonth(mesesDisponiveis[0]);
            }
        }
    }, [mesesDisponiveis, faturas, selectedInvoiceMonth]);

    const changeMonth = (val: string) => {
        setSelectedInvoiceMonth(val);
        localStorage.setItem('creditcard_last_month', val);
    };

    const navegarFatura = (dir: number) => {
        if (!selectedInvoiceMonth) return;
        const idx = mesesDisponiveis.indexOf(selectedInvoiceMonth) + dir;
        if (idx >= 0 && idx < mesesDisponiveis.length) {
            changeMonth(mesesDisponiveis[idx]);
        }
    };

    // 6. AÇÕES DE VÍNCULO (MÚLTIPLOS RECIBOS)
    const iniciarVinculo = (mes: string) => {
        setTargetInvoiceMonth(mes);
        setLinkStep(2);
    };

    const handleConfirmarVinculo = () => {
        if (selectedPaymentIds.size === 0 || !targetInvoiceMonth) return;
        
        const faturaAlvo = faturas[targetInvoiceMonth];
        if (!faturaAlvo) return;

        let totalSelecionado = 0;
        selectedPaymentIds.forEach(id => {
            const p = pagamentosProcessados.find(x => x.original.identificador === id);
            if (p) totalSelecionado += p.disponivel;
        });

        if (faturaAlvo.status === "PAGO" || faturaAlvo.status === "SUPER" || (faturaAlvo.saldoRestante > 0 && totalSelecionado > faturaAlvo.saldoRestante)) {
            if (!window.confirm(`ATENÇÃO: O valor dos recibos (${formatCurrency(totalSelecionado)}) ultrapassa a dívida desta fatura.\n\nO excedente será adicionado automaticamente como CRÉDITO EXTRA. Deseja confirmar?`)) return;
        }

        const allT = db.getAll();
        let saldoVirtual = faturaAlvo.saldoRestante; 

        selectedPaymentIds.forEach(id => {
            const pgto = pagamentosProcessados.find(p => p.original.identificador === id);
            if (!pgto) return;

            const creditoDisponivel = pgto.disponivel;
            let valorParaVincular = 0;

            if (saldoVirtual <= 0) {
                valorParaVincular = creditoDisponivel; 
            } else {
                valorParaVincular = Math.min(saldoVirtual, creditoDisponivel); 
            }

            saldoVirtual -= valorParaVincular; 

            const tIndex = allT.findIndex((t: any) => t.identificador === pgto.original.identificador);
            if (tIndex > -1) {
                const trans: any = allT[tIndex];
                if (!trans.faturaLinks) trans.faturaLinks = [];
                trans.faturaLinks.push({ mes: targetInvoiceMonth, valor: valorParaVincular });
                if (trans.faturaReferencia) delete trans.faturaReferencia; 
            }
        });

        db.save(allT);
        refreshData(); 
        
        setLinkStep(1);
        setSelectedPaymentIds(new Set());
        setTargetInvoiceMonth(null);
    };

    const handleDesfazerVinculo = (idTransacao: string, mesAlvo: string) => {
        const allT = db.getAll();
        const tIndex = allT.findIndex((t: any) => t.identificador === idTransacao);
        if (tIndex > -1 && (allT[tIndex] as any).faturaLinks) {
            (allT[tIndex] as any).faturaLinks = (allT[tIndex] as any).faturaLinks.filter((l: any) => l.mes !== mesAlvo);
            db.save(allT);
            refreshData();
        }
    };

    const fecharModal = () => {
        setShowModal(false);
        setLinkStep(1);
        setSelectedPaymentIds(new Set());
        setTargetInvoiceMonth(null);
    };

    const monthOptions: SelectOption[] = mesesDisponiveis.map(m => {
        const fat = faturas[m];
        let icon = "";
        if (fat.status === "PAGO") icon = "✅";
        else if (fat.status === "PARCIAL") icon = "⚠️";
        else if (fat.status === "SUPER") icon = "💎";
        return { value: m, label: `${formatMonthLabel(m)} ${icon}` };
    });

    // =========================================================
    // RENDERIZAÇÃO
    // =========================================================
    if (cartoesDaConta.length === 0) {
        return (
            <div className="container mt-5 text-center fade-in">
                <i className="bi bi-credit-card fs-1 text-muted opacity-50"></i>
                <h5 className="mt-3 text-muted">Nenhum cartão encontrado.</h5>
                <p className="text-muted opacity-75">Cadastre seus cartões na aba "Contas".</p>
            </div>
        );
    }

    const faturaAtual = selectedInvoiceMonth ? faturas[selectedInvoiceMonth] : null;

    return (
        <div className="container mt-4 pb-5 fade-in">
            <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-credit-card-2-front fs-4 text-warning"></i>
                <h2 className="mb-0 fw-bold text-light">Cartões de Crédito</h2>
            </div>

            {/* ABAS DOS CARTÕES */}
            <ul className="nav nav-pills mb-4 gap-2 overflow-auto flex-nowrap" style={{scrollbarWidth: 'none'}}>
                {cartoesDaConta.map((c: any) => (
                    <li className="nav-item flex-shrink-0" key={c.id}>
                        <button 
                            className={`nav-link px-4 rounded-pill border ${c.id === selectedCardId ? "bg-warning text-dark border-warning fw-bold" : "bg-transparent text-light border-secondary border-opacity-50"}`} 
                            onClick={() => setSelectedCardId(c.id)}>
                            {c.nome}
                        </button>
                    </li>
                ))}
            </ul>

            {/* CONTROLES DA FATURA */}
            {mesesDisponiveis.length > 0 ? (
                <div className="theme-surface shadow-sm mb-4 position-relative z-100">
                    <div className="card-body py-4 px-4">
                        <div className="row g-4 align-items-center justify-content-center">
                            <div className="col-md-6 text-center text-md-start">
                                <label className="small text-muted mb-2 text-uppercase fw-bold">Fatura (Fecha dia {closingDay})</label>
                                
                                <div className="input-group flex-nowrap justify-content-center justify-content-md-start position-relative" style={{ zIndex: 105, width: '100%' }}>
                                    <button className="btn btn-outline-secondary border-secondary text-white-50 radius-left-8" onClick={() => navegarFatura(1)} disabled={selectedInvoiceMonth ? mesesDisponiveis.indexOf(selectedInvoiceMonth) === mesesDisponiveis.length - 1 : true}><i className="bi bi-chevron-left"></i></button>
                                    
                                    <div className="position-relative z-150" style={{ minWidth: '220px', maxWidth: '300px' }}>
                                        <div className="h-100 mx-n1">
                                            <CustomSelect 
                                                options={monthOptions} 
                                                value={selectedInvoiceMonth || ""} 
                                                onChange={(val) => changeMonth(val)} 
                                                className="h-100 text-center" 
                                                textColor="text-light fw-bold" 
                                            />
                                        </div>
                                    </div>

                                    <button className="btn btn-outline-secondary border-secondary text-white-50 radius-right-8" onClick={() => navegarFatura(-1)} disabled={selectedInvoiceMonth ? mesesDisponiveis.indexOf(selectedInvoiceMonth) === 0 : true}><i className="bi bi-chevron-right"></i></button>
                                </div>
                            </div>
                            <div className="col-md-6 text-center text-md-end border-start border-secondary border-opacity-25 d-none d-md-block">
                                <label className="small text-muted mb-2 text-uppercase fw-bold">Gestão de Pagamentos</label><br />
                                <button className="btn btn-outline-warning fw-bold px-4" onClick={() => setShowModal(true)}>
                                    <i className="bi bi-link-45deg me-2"></i> Vincular Recibos
                                </button>
                            </div>
                            {/* Botão Mobile */}
                            <div className="col-12 text-center d-md-none mt-2">
                                <button className="btn btn-outline-warning w-100 fw-bold" onClick={() => setShowModal(true)}>
                                    <i className="bi bi-link-45deg me-2"></i> Vincular Recibos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="theme-surface text-center shadow-sm p-4 text-muted border-info border-opacity-50">
                    <i className="bi bi-clock-history fs-3 mb-2 d-block"></i>
                    Nenhuma fatura gerada para este cartão ainda.
                </div>
            )}

            {/* DETALHES DA FATURA SELECIONADA */}
            {faturaAtual && (
                <div className="invoice-details fade-in position-relative" style={{ zIndex: 10 }}>
                    <div className={`theme-surface shadow-sm mb-4 border-top border-4 border-${faturaAtual.status === 'PAGO' ? 'success' : faturaAtual.status === 'SUPER' ? 'info' : faturaAtual.status === 'PARCIAL' ? 'warning' : 'danger'}`}>
                        <div className="card-body p-4">
                            <div className="row text-center">
                                <div className="col-4 border-end border-secondary border-opacity-25">
                                    <small className="text-muted text-uppercase text-micro">Total Gastos</small>
                                    <div className="fs-5 fw-bold text-light mt-1">{formatCurrency(faturaAtual.totalGastos)}</div>
                                </div>
                                <div className="col-4 border-end border-secondary border-opacity-25">
                                    <small className="text-muted text-uppercase text-micro">Valor Pago</small>
                                    <div className="fs-5 fw-bold text-success mt-1">{formatCurrency(faturaAtual.totalPago)}</div>
                                </div>
                                <div className="col-4">
                                    <small className="text-muted text-uppercase text-micro">Restante</small>
                                    <div className={`fs-5 fw-bold mt-1 text-${faturaAtual.saldoRestante > 0 ? 'danger' : 'success'}`}>
                                        {faturaAtual.saldoRestante > 0 ? formatCurrency(faturaAtual.saldoRestante) : "R$ 0,00"}
                                    </div>
                                </div>
                            </div>
                            
                            {faturaAtual.saldoRestante < -1 && (
                                <div className="alert alert-info bg-transparent border-info border-opacity-50 text-info mt-4 mb-0 py-2 small text-center text-xxs">
                                    <i className="bi bi-piggy-bank me-2"></i> Existe um crédito de <strong>{formatCurrency(Math.abs(faturaAtual.saldoRestante))}</strong>.
                                </div>
                            )}
                        </div>
                    </div>

                    <h6 className="text-muted border-bottom border-secondary border-opacity-25 pb-2 mb-3 px-2">Extrato Detalhado da Fatura</h6>
                    <div className="theme-surface shadow-sm mb-5 p-0 overflow-hidden">
                        <div className="list-group list-group-flush bg-transparent">
                            {[...faturaAtual.gastos, ...faturaAtual.pagamentosVinculados].sort((a, b) => {
                                const [da, ma, ya] = a.data.split("/");
                                const [db, mb, yb] = b.data.split("/");
                                return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
                            }).map(t => {
                                const isPagamento = t.tipo === "Pagamento de Fatura";
                                const valorExibido = isPagamento ? t.valorVinculado || t.valor : Math.abs(t.valor);
                                return (
                                    <div key={`${t.identificador}-${valorExibido}`} className={`list-group-item bg-transparent border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4 ${isPagamento ? 'bg-success bg-opacity-10' : 'hover-opacity'}`}>
                                        <div className="d-flex gap-3 align-items-center">
                                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                <i className={`bi fs-5 ${isPagamento ? 'bi-cash-coin text-success' : 'bi-bag text-warning'}`}></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold text-light">{t.nome}</div>
                                                <small className="text-muted">{t.data} • {t.categoria}</small>
                                                {isPagamento && <span className="badge bg-success ms-2 text-micro">PAGAMENTO VINCULADO</span>}
                                            </div>
                                        </div>
                                        <div className={`fw-bold ${t.valor > 0 ? "text-success" : "text-light"}`}>
                                            {formatCurrency(valorExibido)}
                                        </div>
                                    </div>
                                );
                            })}
                            {faturaAtual.gastos.length === 0 && faturaAtual.pagamentosVinculados.length === 0 && (
                                <div className="text-center text-muted p-4">Sem lançamentos na fatura.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE VÍNCULOS (WIZARD UX) */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content theme-surface shadow-lg border-secondary border-opacity-50">
                            
                            {/* PASSO 1: LISTA DE FATURAS */}
                            {linkStep === 1 && (
                                <div className="fade-in">
                                    <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3">
                                        <h5 className="modal-title fw-bold text-light m-0"><i className="bi bi-calendar3 text-warning me-2"></i>Escolha a Fatura</h5>
                                        <button type="button" className="btn-close btn-close-white" onClick={fecharModal}></button>
                                    </div>
                                    <div className="modal-body p-4">
                                        <p className="text-muted small mb-4">Selecione para qual mês você deseja alocar um pagamento ou verificar os vínculos atuais.</p>
                                        <div className="list-group bg-transparent scrollable-menu" style={{ maxHeight: '55vh' }}>
                                            {mesesDisponiveis.map(mes => {
                                                const fat = faturas[mes];
                                                return (
                                                    <div key={mes} className="list-group-item bg-transparent border border-secondary border-opacity-25 mb-3 rounded-3 p-3">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <strong className="fs-5 text-light">{formatMonthLabel(mes)}</strong> 
                                                                {fat.status === 'ABERTO' && <span className="badge bg-danger bg-opacity-25 text-danger ms-2 text-micro">Aberto</span>}
                                                                {fat.status === 'PARCIAL' && <span className="badge bg-warning bg-opacity-25 text-warning ms-2 text-micro">Parcial</span>}
                                                                {fat.status === 'SUPER' && <span className="badge bg-info bg-opacity-25 text-info ms-2 text-micro">Crédito</span>}
                                                                {fat.status === 'PAGO' && <span className="badge bg-success bg-opacity-25 text-success ms-2 text-micro">Pago</span>}
                                                                <br/>
                                                                <span className={`small ${fat.saldoRestante > 0 ? "text-danger fw-bold" : "text-success"}`}>
                                                                    Falta pagar: {fat.saldoRestante > 0 ? formatCurrency(fat.saldoRestante) : "R$ 0,00"}
                                                                </span>
                                                            </div>
                                                            <button className="btn btn-sm btn-outline-warning text-warning border-opacity-50 fw-bold px-3 py-2 shadow-sm" onClick={() => iniciarVinculo(mes)}>
                                                                <i className="bi bi-plus-circle me-1 d-none d-md-inline"></i> Vincular
                                                            </button>
                                                        </div>

                                                        {fat.pagamentosVinculados && fat.pagamentosVinculados.length > 0 && (
                                                            <div className="mt-3 pt-3 border-top border-secondary border-opacity-25">
                                                                <small className="text-muted d-block mb-2 text-uppercase text-micro">Recibos Atrelados:</small>
                                                                {fat.pagamentosVinculados.map((v: any) => (
                                                                    <div key={v.identificador} className="d-flex justify-content-between align-items-center mb-2 px-3 py-2 rounded" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}>
                                                                        <span className="text-light small d-flex align-items-center">
                                                                            <i className="bi bi-check-circle-fill text-success me-2"></i>
                                                                            <strong className="text-success me-1">{formatCurrency(v.valorVinculado)}</strong> 
                                                                            <span className="text-muted text-xxs d-none d-md-inline">({v.data})</span>
                                                                        </span>
                                                                        <button className="btn btn-link text-danger p-0 ms-2 text-decoration-none opacity-75 hover-opacity" onClick={(e) => { e.stopPropagation(); handleDesfazerVinculo(v.identificador, mes); }} title="Remover Vínculo">
                                                                            <i className="bi bi-x-circle fs-5"></i>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASSO 2: ESCOLHER OS RECIBOS (MÚLTIPLOS) */}
                            {linkStep === 2 && (
                                <div className="fade-in">
                                    {(() => {
                                        const totalSelecionado = Array.from(selectedPaymentIds).reduce((acc, id) => {
                                            const p = pagamentosProcessados.find(x => x.original.identificador === id);
                                            return acc + (p ? p.disponivel : 0);
                                        }, 0);
                                        const faturaAlvo = targetInvoiceMonth ? faturas[targetInvoiceMonth] : null;
                                        const saldoFatura = faturaAlvo ? faturaAlvo.saldoRestante : 0;

                                        return (
                                            <>
                                                <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3 d-flex align-items-center">
                                                    <button className="btn btn-sm btn-link text-light p-0 me-3 hover-opacity text-decoration-none" onClick={() => { setLinkStep(1); setSelectedPaymentIds(new Set()); }}>
                                                        <i className="bi bi-arrow-left fs-4"></i>
                                                    </button>
                                                    <h5 className="modal-title fw-bold text-light m-0"><i className="bi bi-check2-all text-success me-2"></i>Escolher Recibos</h5>
                                                    <button type="button" className="btn-close btn-close-white ms-auto" onClick={fecharModal}></button>
                                                </div>
                                                <div className="modal-body p-4">
                                                    
                                                    <div className="alert bg-success bg-opacity-10 border border-success border-opacity-25 text-success mb-4 d-flex align-items-center gap-3 radius-12 p-3">
                                                        <i className="bi bi-info-circle fs-4"></i>
                                                        <div>
                                                            <div className="fw-bold small text-uppercase">Destino dos Pagamentos</div>
                                                            <div className="fs-5 fw-bold text-light">Fatura de {targetInvoiceMonth ? formatMonthLabel(targetInvoiceMonth) : ''}</div>
                                                        </div>
                                                    </div>

                                                    <div className="list-group bg-transparent scrollable-menu" style={{ maxHeight: '45vh' }}>
                                                        {pagamentosProcessados.sort((a, b) => {
                                                            const esgotadoA = a.disponivel <= 0.01;
                                                            const esgotadoB = b.disponivel <= 0.01;
                                                            if (esgotadoA !== esgotadoB) return esgotadoA ? 1 : -1;
                                                            const [da, ma, ya] = a.original.data.split("/");
                                                            const [db, mb, yb] = b.original.data.split("/");
                                                            return new Date(parseInt(yb), parseInt(mb) - 1, parseInt(db)).getTime() - new Date(parseInt(ya), parseInt(ma) - 1, parseInt(da)).getTime();
                                                        }).map(p => {
                                                            const esgotado = p.disponivel <= 0.01;
                                                            const isSelected = selectedPaymentIds.has(p.original.identificador);
                                                            
                                                            return (
                                                                <div key={p.original.identificador} 
                                                                     className={`list-group-item bg-transparent d-flex flex-column border border-secondary border-opacity-25 mb-3 rounded-3 p-3 ${esgotado ? 'opacity-50' : 'cursor-pointer'} ${isSelected ? 'border-warning bg-warning bg-opacity-10' : 'hover-opacity'}`}
                                                                     onClick={() => {
                                                                         if (esgotado) return;
                                                                         const newSet = new Set(selectedPaymentIds);
                                                                         if (newSet.has(p.original.identificador)) newSet.delete(p.original.identificador);
                                                                         else newSet.add(p.original.identificador);
                                                                         setSelectedPaymentIds(newSet);
                                                                     }}>
                                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                                        <div>
                                                                            <div className="fw-bold mb-1 text-light"><i className="bi bi-calendar-event text-muted me-2"></i>Pago em {p.original.data}</div>
                                                                            <div className={esgotado ? "text-muted" : isSelected ? "text-warning fw-bold fs-5" : "text-success fw-bold fs-5"}>
                                                                                {formatCurrency(p.disponivel)} <small className="fw-normal opacity-75 fs-6">livres</small>
                                                                            </div>
                                                                            <small className="text-muted text-xxs">Valor original do recibo: {formatCurrency(p.valorTotal)}</small>
                                                                        </div>
                                                                        <div>
                                                                            {esgotado ? <span className="badge bg-secondary bg-opacity-25 text-muted border border-secondary border-opacity-50 text-micro">ESGOTADO</span> : 
                                                                             isSelected ? <i className="bi bi-check-square-fill fs-2 text-warning"></i> : <i className="bi bi-square fs-3 text-muted"></i>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="progress mt-3 bg-secondary bg-opacity-25" style={{height: '6px', borderRadius: '4px'}}>
                                                                        <div className={`progress-bar ${esgotado ? "bg-secondary" : isSelected ? "bg-warning" : "bg-success"}`} style={{width: `${Math.round((p.valorUsado / p.valorTotal) * 100)}%`}}></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {pagamentosProcessados.length === 0 && <div className="text-muted text-center py-5">Nenhum pagamento de fatura identificado.</div>}
                                                    </div>
                                                </div>
                                                
                                                {/* BARRA INFERIOR COM O SOMATÓRIO EM TEMPO REAL */}
                                                <div className="modal-footer border-top border-secondary border-opacity-25 px-4 py-3 d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span className="text-muted small d-block line-height-1 mb-1">Soma Selecionada:</span>
                                                        <span className={`fw-bold fs-5 ${totalSelecionado > saldoFatura && saldoFatura > 0 ? 'text-info' : 'text-warning'}`}>
                                                            {formatCurrency(totalSelecionado)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <button type="button" className="btn btn-outline-light border-0 me-2" onClick={() => { setLinkStep(1); setSelectedPaymentIds(new Set()); }}>Cancelar</button>
                                                        <button type="button" className="btn btn-warning fw-bold text-dark shadow-sm" onClick={handleConfirmarVinculo} disabled={selectedPaymentIds.size === 0}>
                                                            Vincular ({selectedPaymentIds.size}) <i className="bi bi-check2 ms-1"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}