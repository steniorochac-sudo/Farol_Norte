// src/pages/Accounts.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useFinance } from '../context/FinanceContext';
import { accountsDb, cardsDb } from '../services/DataService';
import { getBankOptions } from '../services/BankStrategies';
import { formatCurrency } from '../utils/formatters';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import type { Account, CreditCard, BankType } from '../types/index';

// =========================================================
// INTERFACES LOCAIS (Estados dos Modais)
// =========================================================
interface ModalContaState {
    show: boolean;
    isEditing: boolean;
    id: string | null;
    nome: string;
    saldoInicial: string | number;
    bankType: string;
}

interface ModalCartaoState {
    show: boolean;
    isEditing: boolean;
    id: string | null;
    nome: string;
    closingDay: string | number;
    dueDay: string | number;
    account_id: string;
}

export default function Accounts() {
    const { 
        transactions = [], 
        accounts = [], 
        refreshData = () => {} 
    } = useFinance();
        
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<Chart | null>(null);

    // ==========================================
    // ESTADOS DOS MODAIS
    // ==========================================
    const [modalConta, setModalConta] = useState<ModalContaState>({ 
        show: false, isEditing: false, id: null, nome: '', saldoInicial: '', bankType: 'generic' 
    });
    
    const [modalCartao, setModalCartao] = useState<ModalCartaoState>({ 
        show: false, isEditing: false, id: null, nome: '', closingDay: 5, dueDay: 12, account_id: '' 
    });

    // ==========================================
    // CÁLCULOS DE SALDO E PATRIMÔNIO
    // ==========================================
    const saldosMap = useMemo(() => {
        const mapa: Record<string, number> = {};
        accounts.forEach((c: Account) => {
            const saldoIni = (c as any).saldoInicial;
            const saldoAtu = (c as any).saldo;
            mapa[c.id] = parseFloat(saldoIni !== undefined ? saldoIni : saldoAtu) || 0;
        });

        transactions.forEach((t: any) => {
            if (t.tipoLancamento === 'conta' && mapa[t.account_id] !== undefined) {
                mapa[t.account_id] += (t.valor || 0);
            }
        });
        return mapa;
    }, [accounts, transactions]);

    const { totalEmContas, saldoCartoes, patrimonioLiquido } = useMemo(() => {
        let totalC = 0;
        Object.values(saldosMap).forEach(val => totalC += val);

        let saldoCard = 0;
        transactions.forEach((t: any) => {
            if (t.tipoLancamento === 'cartao') {
                if (t.valor < 0) {
                    saldoCard += t.valor;
                } else {
                    if (t.tipo === 'Pagamento de Fatura') {
                        if (t.faturaLinks && Array.isArray(t.faturaLinks)) {
                            saldoCard += t.faturaLinks.reduce((acc: number, link: any) => acc + link.valor, 0);
                        }
                    } else {
                        saldoCard += t.valor;
                    }
                }
            }
        });

        return {
            totalEmContas: totalC,
            saldoCartoes: saldoCard,
            patrimonioLiquido: totalC + saldoCard
        };
    }, [saldosMap, transactions]);

    // ==========================================
    // GRÁFICO DE EVOLUÇÃO
    // ==========================================
    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const labels: string[] = [];
        const dadosReceitas: number[] = [];
        const dadosDespesas: number[] = [];
        const hoje = new Date();

        for (let i = 11; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const mesStr = (d.getMonth() + 1).toString().padStart(2, '0');
            const anoStr = d.getFullYear().toString(); 
            const chaveData = `${anoStr}-${mesStr}`; 
            
            const nomeMes = d.toLocaleString('pt-BR', { month: 'short' });
            labels.push(`${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${anoStr.slice(-2)}`);

            let receitaMes = 0;
            let despesaMes = 0;

            transactions.forEach((t: any) => {
                const parts = t.data?.split('/');
                if(!parts || parts.length < 3) return;
                const tChave = `${parts[2]}-${parts[1]}`;

                if (tChave === chaveData) {
                    if (t.tipo === 'Pagamento de Fatura') return;
                    if (t.valor > 0) receitaMes += t.valor;
                    else despesaMes += Math.abs(t.valor);
                }
            });

            dadosReceitas.push(receitaMes);
            dadosDespesas.push(despesaMes);
        }

        chartInstance.current = new Chart(chartRef.current, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Receitas', data: dadosReceitas, borderColor: '#1FA67A', backgroundColor: 'rgba(31, 166, 122, 0.1)', tension: 0.3, fill: true },
                    { label: 'Despesas', data: dadosDespesas, borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', tension: 0.3, fill: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        grid: { color: 'rgba(232, 237, 242, 0.05)' },
                        ticks: { color: '#9BA8B4' }
                    },
                    y: {
                        grid: { color: 'rgba(232, 237, 242, 0.05)' },
                        ticks: { color: '#9BA8B4' }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: '#E8EDF2' } },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } }
                }
            }
        });

        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [transactions]);

    // ==========================================
    // FUNÇÕES DE SALVAMENTO
    // ==========================================
    const salvarConta = () => {
        if (!modalConta.nome) return alert("Digite o nome da conta.");
        const saldo = parseFloat(modalConta.saldoInicial.toString()) || 0;

        const payload: any = {
            nome: modalConta.nome, 
            bank: modalConta.bankType as BankType,
            saldoInicial: saldo, 
            saldo: saldo,
            status: 'active'
        };

        if (modalConta.isEditing && modalConta.id) {
            accountsDb.update(modalConta.id, payload);
        } else {
            payload.id = `acc-${Date.now()}`;
            accountsDb.add(payload);
        }
        refreshData();
        setModalConta({ ...modalConta, show: false });
    };

    const excluirConta = (id: string) => {
        if(window.confirm("Tem certeza? Transações vinculadas a esta conta ficarão órfãs.")){
            accountsDb.delete(id);
            refreshData();
        }
    };

    const salvarCartao = () => {
        if (!modalCartao.nome) return alert("Digite o nome do cartão.");
        if (!modalCartao.account_id) return alert("Selecione uma conta para vincular.");

        const payload: any = {
            nome: modalCartao.nome, 
            closingDay: Number(modalCartao.closingDay), 
            dueDay: Number(modalCartao.dueDay),
            account_id: modalCartao.account_id,
            bank: 'generic', 
            status: 'active'
        };

        if (modalCartao.isEditing && modalCartao.id) {
            cardsDb.update(modalCartao.id, payload);
        } else {
            payload.id = `card-${Date.now()}`;
            cardsDb.add(payload);
        }
        refreshData();
        setModalCartao({ ...modalCartao, show: false });
    };

    const excluirCartao = (id: string) => {
        if(window.confirm("Remover este cartão?")){
            cardsDb.delete(id);
            refreshData();
        }
    };

    const cartoes = cardsDb.getAll();

    // ==========================================
    // OPÇÕES PARA OS SELECTS CUSTOMIZADOS
    // ==========================================
    const bankOptions: SelectOption[] = getBankOptions();

    const accountOptions: SelectOption[] = [
        { value: '', label: 'Selecione a conta...', disabled: true },
        ...accounts.map((a: Account) => ({ value: a.id, label: a.nome }))
    ];

    return (
        <div className="container mt-4 position-relative fade-in pb-5">
            
            <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-bank2 fs-4 text-warning"></i>
                <h2 className="mb-0 fw-bold">Gestão de Contas</h2>
            </div>

            {/* 1. HEADER PATRIMÔNIO */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="theme-surface border-start border-4 border-success shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2">
                            <small className="text-uppercase text-success fw-bold text-micro">Saldo Total (Contas)</small>
                            <h3 className="fw-bold mb-0 text-light">{formatCurrency(totalEmContas)}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className={`theme-surface border-start border-4 ${saldoCartoes < 0 ? 'border-danger' : 'border-success'} shadow-sm h-100 py-2 radius-12`}>
                        <div className="card-body px-4 py-2">
                            <small className={`text-uppercase fw-bold text-micro ${saldoCartoes < 0 ? 'text-danger' : 'text-success'}`}>{saldoCartoes < 0 ? 'Dívida de Cartões' : 'Crédito em Cartões'}</small>
                            <h3 className="fw-bold mb-0 text-light">
                                {saldoCartoes < 0 ? `- ${formatCurrency(Math.abs(saldoCartoes))}` : `+ ${formatCurrency(saldoCartoes)}`}
                            </h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="theme-surface border-start border-4 border-info shadow-sm h-100 py-2 radius-12">
                        <div className="card-body px-4 py-2">
                            <small className="text-uppercase text-info fw-bold text-micro">Patrimônio Líquido</small>
                            <h3 className="fw-bold mb-0 text-light">{formatCurrency(patrimonioLiquido)}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. GRÁFICO EVOLUÇÃO */}
            <div className="theme-surface shadow-sm mb-4">
                <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-4">
                    <h6 className="m-0 fw-bold text-light"><i className="bi bi-graph-up text-warning me-2"></i>Evolução Financeira (Últimos 12 Meses)</h6>
                </div>
                <div className="card-body p-4">
                    <div className="h-300 position-relative">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </div>
            </div>

            {/* 3. LISTAS: CONTAS E CARTÕES */}
            <div className="row mb-5 g-4">
                <div className="col-md-6">
                    <div className="theme-surface shadow-sm h-100">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
                            <h5 className="mb-0 fw-bold text-light"><i className="bi bi-wallet2 text-success me-2"></i>Minhas Contas</h5>
                            <button className="btn btn-sm btn-outline-success fw-bold" 
                                onClick={() => setModalConta({ show: true, isEditing: false, id: null, nome: '', saldoInicial: '', bankType: 'generic' })}>
                                <i className="bi bi-plus-lg"></i> Nova
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush bg-transparent">
                                {accounts.length === 0 ? <div className="p-4 text-center text-muted">Nenhuma conta.</div> : 
                                    accounts.map((c: Account) => {
                                        const cBank = c.bank;
                                        const cName = c.nome;
                                        const cIni = (c as any).saldoInicial;
                                        const cSal = (c as any).saldo;

                                        return (
                                            <div key={c.id} className="list-group-item bg-transparent text-light border-bottom border-secondary border-opacity-25 px-4 py-3 d-flex justify-content-between align-items-center hover-opacity">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="fs-4 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                        {cBank === 'nubank' ? <span className="text-white p-1 rounded text-micro" style={{backgroundColor: '#8A05BE'}}>Nu</span> : 
                                                         cBank === 'inter' ? <span className="text-dark bg-warning p-1 rounded fw-bold text-micro">Int</span> :
                                                         cBank === 'mercado_pago' ? <span className="text-white bg-info p-1 rounded fw-bold text-micro">MP</span> :
                                                         <i className="bi bi-bank2 text-muted"></i>}
                                                    </div>
                                                    <div>
                                                        <strong className="fs-6">{cName}</strong><br/>
                                                        <small className={`fw-bold text-micro ${saldosMap[c.id] >= 0 ? 'text-success' : 'text-danger'}`}>
                                                            Saldo: {formatCurrency(saldosMap[c.id])}
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="btn-group">
                                                    <button className="btn btn-sm btn-outline-light border-0 text-white-50" onClick={() => setModalConta({show: true, isEditing: true, id: c.id, nome: cName, bankType: cBank || 'generic', saldoInicial: cIni ?? cSal})}><i className="bi bi-pencil"></i></button>
                                                    <button className="btn btn-sm btn-outline-danger border-0" onClick={() => excluirConta(c.id)}><i className="bi bi-trash"></i></button>
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="theme-surface shadow-sm h-100">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
                            <h5 className="mb-0 fw-bold text-light"><i className="bi bi-credit-card-2-front text-warning me-2"></i>Meus Cartões</h5>
                            <button className="btn btn-sm btn-outline-warning fw-bold"
                                onClick={() => setModalCartao({ show: true, isEditing: false, id: null, nome: '', closingDay: 5, dueDay: 12, account_id: accounts[0]?.id || '' })}>
                                <i className="bi bi-plus-lg"></i> Novo
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush bg-transparent">
                                {cartoes.length === 0 ? <div className="p-4 text-center text-muted">Nenhuma cartão.</div> :
                                    cartoes.map((c: CreditCard) => {
                                        const cAccountId = c.account_id;
                                        const cName = c.nome;
                                        const cClosing = c.closingDay;
                                        
                                        const cVinculada = accounts.find((a: Account) => a.id === cAccountId);
                                        const vincName = cVinculada ? cVinculada.nome : 'Desconhecida';
                                        
                                        return (
                                            <div key={c.id} className="list-group-item bg-transparent text-light border-bottom border-secondary border-opacity-25 px-4 py-3 d-flex justify-content-between align-items-center hover-opacity">
                                                <div>
                                                    <strong className="fs-6 text-warning">{cName}</strong><br/>
                                                    <small className="text-muted text-xxs">Débito: {vincName}</small><br/>
                                                    <span className="badge bg-transparent border border-secondary border-opacity-50 text-muted mt-1 text-xxs">
                                                        Fecha dia {cClosing} • Vence dia {c.dueDay}
                                                    </span>
                                                </div>
                                                <div className="btn-group">
                                                    <button className="btn btn-sm btn-outline-light border-0 text-white-50" onClick={() => setModalCartao({ show: true, isEditing: true, id: c.id, nome: cName, closingDay: cClosing, dueDay: c.dueDay, account_id: cAccountId })}><i className="bi bi-pencil"></i></button>
                                                    <button className="btn btn-sm btn-outline-danger border-0" onClick={() => excluirCartao(c.id)}><i className="bi bi-trash"></i></button>
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* MODAL CONTA */}
            {/* ========================================== */}
            {modalConta.show && (
                <div className="modal show d-block fade-in" style={{backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content theme-surface shadow-lg">
                            <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                                <h5 className="modal-title fw-bold"><i className="bi bi-bank me-2 text-success"></i>{modalConta.isEditing ? 'Editar Conta' : 'Nova Conta'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setModalConta({...modalConta, show: false})}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Nome da Conta</label>
                                    <input type="text" className="form-control" value={modalConta.nome} onChange={e => setModalConta({...modalConta, nome: e.target.value})} placeholder="Ex: NuConta Principal" />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Instituição (Para Importação)</label>
                                    <div className="position-relative" style={{ zIndex: 105 }}>
                                        <CustomSelect 
                                            options={bankOptions} 
                                            value={modalConta.bankType || 'generic'} 
                                            onChange={val => setModalConta({...modalConta, bankType: val})} 
                                            textColor="text-light" 
                                        />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-success small text-uppercase">Saldo Inicial (R$)</label>
                                    <input type="number" step="0.01" className="form-control text-success fw-bold" value={modalConta.saldoInicial} onChange={e => setModalConta({...modalConta, saldoInicial: e.target.value})} />
                                    <small className="text-muted d-block mt-2 text-xxs">O saldo inicial é somado ao histórico de transações.</small>
                                </div>
                            </div>
                            <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                                <button type="button" className="btn btn-outline-light border-0" onClick={() => setModalConta({...modalConta, show: false})}>Cancelar</button>
                                <button type="button" className="btn btn-success fw-bold px-4 shadow-sm" onClick={salvarConta}>Salvar Conta</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* MODAL CARTÃO */}
            {/* ========================================== */}
            {modalCartao.show && (
                <div className="modal show d-block fade-in" style={{backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content theme-surface shadow-lg">
                            <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                                <h5 className="modal-title fw-bold"><i className="bi bi-credit-card me-2 text-warning"></i>{modalCartao.isEditing ? 'Editar Cartão' : 'Novo Cartão'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setModalCartao({...modalCartao, show: false})}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-4">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Nome do Cartão</label>
                                    <input type="text" className="form-control text-warning" value={modalCartao.nome} onChange={e => setModalCartao({...modalCartao, nome: e.target.value})} placeholder="Ex: Nubank Platinum" />
                                </div>
                                <div className="row mb-4">
                                    <div className="col-6">
                                        <label className="form-label fw-bold text-muted small text-uppercase">Dia Fechamento</label>
                                        <input type="number" className="form-control" value={modalCartao.closingDay} onChange={e => setModalCartao({...modalCartao, closingDay: e.target.value})} min="1" max="31" />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label fw-bold text-danger small text-uppercase">Dia Vencimento</label>
                                        <input type="number" className="form-control text-danger fw-bold" value={modalCartao.dueDay} onChange={e => setModalCartao({...modalCartao, dueDay: e.target.value})} min="1" max="31" />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold text-muted small text-uppercase">Debitar da Conta</label>
                                    <div className="position-relative" style={{ zIndex: 105 }}>
                                        <CustomSelect 
                                            options={accountOptions} 
                                            value={modalCartao.account_id || ''} 
                                            onChange={val => setModalCartao({...modalCartao, account_id: val})} 
                                            textColor="text-light" 
                                        />
                                    </div>
                                </div>
                                {modalCartao.isEditing && (
                                    <div className="alert alert-warning border-warning border-opacity-50 bg-transparent text-warning text-xxs mb-0 mt-4">
                                        <i className="bi bi-info-circle me-1"></i> Ao alterar as datas, as faturas serão recalculadas na aba Cartões.
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                                <button type="button" className="btn btn-outline-light border-0" onClick={() => setModalCartao({...modalCartao, show: false})}>Cancelar</button>
                                <button type="button" className="btn btn-warning fw-bold text-dark px-4 shadow-sm" onClick={salvarCartao}>Salvar Cartão</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}