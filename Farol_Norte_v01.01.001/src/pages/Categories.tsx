// src/pages/Categories.tsx
import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { categoryDb, rulesDb, db } from '../services/DataService';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import type { Category, CategorizationRule } from '../types/index';

// =========================================================
// INTERFACES LOCAIS
// =========================================================
interface ModalCatState {
    show: boolean;
    isEditing: boolean;
    oldName: string;
    nome: string;
    cor: string;
    criarRegra: boolean;
    termoRegra: string;
    natureza: string;
    relevancia: string;
}

interface ModalRuleState {
    show: boolean;
    termo: string;
    categoria: string;
}

export default function Categories() {
    const { 
        categories = [], 
        refreshData = () => {} 
    } = useFinance();
    
    const [rules, setRules] = useState<CategorizationRule[]>([]);
    
    const [modalCat, setModalCat] = useState<ModalCatState>({ 
        show: false, isEditing: false, oldName: '', nome: '', cor: '#F2B705', 
        criarRegra: false, termoRegra: '', natureza: 'variavel', relevancia: 'essencial' 
    });
    
    const [modalRule, setRuleModal] = useState<ModalRuleState>({ show: false, termo: '', categoria: '' });

    useEffect(() => {
        setRules(rulesDb.getAll());
    }, []);

    // ==========================================
    // HELPERS VISUAIS (Matriz 2x2)
    // ==========================================
    const getNaturezaInfo = (nat: string) => {
        if (nat === 'fixa') return { label: 'Fixa', icon: '📅', color: 'text-info border-info' };
        if (nat === 'eventual') return { label: 'Eventual', icon: '⚡', color: 'text-warning border-warning' };
        return { label: 'Variável', icon: '📉', color: 'text-light border-secondary' };
    };

    const getRelevanciaInfo = (rel: string) => {
        if (rel === 'estilo_vida') return { label: 'Estilo de Vida', icon: '✨', color: 'text-warning border-warning' };
        if (rel === 'investimento') return { label: 'Investimento', icon: '🚀', color: 'text-success border-success' };
        return { label: 'Essencial', icon: '🛡️', color: 'text-primary border-primary' };
    };

    // ==========================================
    // LÓGICA DE SALVAMENTO DE CATEGORIAS
    // ==========================================
    const handleSaveCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const nomeFormatado = modalCat.nome.trim();
        if (!nomeFormatado) return alert("Digite um nome para a categoria.");

        const allCats = categoryDb.getAll();

        if (modalCat.isEditing) {
            if (nomeFormatado.toLowerCase() !== modalCat.oldName.toLowerCase() && 
                allCats.find(c => c.nome.toLowerCase() === nomeFormatado.toLowerCase())) {
                return alert("Já existe outra categoria com este nome.");
            }

            if (nomeFormatado !== modalCat.oldName) {
                const todasTransacoes = db.getAll();
                let updated = false;
                todasTransacoes.forEach(t => {
                    if (t.categoria === modalCat.oldName) {
                        t.categoria = nomeFormatado;
                        updated = true;
                    }
                    if (t.split && t.split.length > 0) {
                        t.split.forEach((s) => {
                            if (s.categoria === modalCat.oldName) {
                                s.categoria = nomeFormatado;
                                updated = true;
                            }
                        });
                    }
                });
                if (updated) db.save(todasTransacoes);
            }

            // Tipagem estrita de acordo com o index.ts
            categoryDb.update(modalCat.oldName, {
                nome: nomeFormatado,
                cor: modalCat.cor,
                natureza: modalCat.natureza as any,
                relevancia: modalCat.relevancia as any
            });

        } else {
            if (modalCat.criarRegra && !modalCat.termoRegra.trim()) {
                return alert("Você marcou a opção de regra automática. Por favor, digite o termo.");
            }

            if (allCats.find(c => c.nome.toLowerCase() === nomeFormatado.toLowerCase())) {
                return alert("Já existe uma categoria com este nome.");
            }

            const newCat: Category = { 
                nome: nomeFormatado, 
                cor: modalCat.cor, 
                tipo: 'despesa',
                natureza: modalCat.natureza as any, 
                relevancia: modalCat.relevancia as any
            };

            allCats.push(newCat);
            categoryDb.save(allCats);

            if (modalCat.criarRegra && modalCat.termoRegra.trim()) {
                const allRules = rulesDb.getAll();
                allRules.push({ 
                    term: modalCat.termoRegra.trim().toLowerCase(), 
                    category: nomeFormatado
                });
                rulesDb.save(allRules);
                setRules(rulesDb.getAll());
            }
        }

        refreshData();
        setModalCat({ show: false, isEditing: false, oldName: '', nome: '', cor: '#F2B705', criarRegra: false, termoRegra: '', natureza: 'variavel', relevancia: 'essencial' });
    };

    const handleDeleteCategory = (nome: string) => {
        const msg = `⚠️ ATENÇÃO: Você está apagando a categoria "${nome}".\n\nIsso fará com que TODAS as transações vinculadas a ela voltem a ficar "Não classificada".\n\nDeseja realmente continuar?`;
        if (!window.confirm(msg)) return;

        const todasTransacoes = db.getAll();
        let count = 0;
        todasTransacoes.forEach(t => {
            if (t.categoria === nome) {
                t.categoria = "Não classificada";
                count++;
            }
        });
        if (count > 0) db.save(todasTransacoes);

        categoryDb.delete(nome);
        refreshData();
        alert(`Categoria apagada! ${count} transações foram reclassificadas.`);
    };

    // ==========================================
    // LÓGICA DE REGRAS AUTOMÁTICAS
    // ==========================================
    const handleSaveRule = (e: React.FormEvent) => {
        e.preventDefault();
        const termo = modalRule.termo.trim().toLowerCase();
        if (!termo || !modalRule.categoria) return alert("Preencha todos os campos.");
        
        const allRules = rulesDb.getAll();
        const ruleIndex = allRules.findIndex(r => r.term === termo);
        
        if (ruleIndex > -1) {
            allRules[ruleIndex].category = modalRule.categoria;
        } else {
            allRules.push({ 
                term: termo, 
                category: modalRule.categoria
            });
        }
        rulesDb.save(allRules);
        setRules(rulesDb.getAll());
        setRuleModal({ show: false, termo: '', categoria: '' });
    };

    const handleDeleteRule = (termo: string) => {
        if (!window.confirm(`Remover a regra para "${termo}"?`)) return;
        const novasRegras = rulesDb.getAll().filter(r => r.term !== termo);
        rulesDb.save(novasRegras);
        setRules(rulesDb.getAll());
    };

    const handleApplyRulesRetroactively = () => {
        if (rules.length === 0) return alert("Não há regras cadastradas para aplicar.");
        if (!window.confirm(`Deseja varrer TODAS as transações e aplicar as regras atuais?\n\n⚠️ Isso pode alterar categorias que você definiu manualmente se elas corresponderem a uma regra.`)) return;

        const transacoes = db.getAll();
        let alteradas = 0;
        transacoes.forEach(t => {
            const descricaoLower = (t.nome || '').toLowerCase();
            const regraEncontrada = rules.find(r => descricaoLower.includes(r.term.toLowerCase()));
            if (regraEncontrada && t.categoria !== regraEncontrada.category) {
                t.categoria = regraEncontrada.category;
                alteradas++;
            }
        });

        if (alteradas > 0) {
            db.save(transacoes);
            refreshData(); 
            alert(`Sucesso! ⚡\n${alteradas} transações foram reclassificadas.`);
        } else {
            alert("Varredura concluída.\nNenhuma transação precisou ser alterada.");
        }
    };

    // ==========================================
    // OPÇÕES DOS SELECTS CUSTOMIZADOS
    // ==========================================
    const categoryOptions: SelectOption[] = [
        { value: '', label: 'Selecione a Categoria...' },
        { value: 'disabled', label: '---', disabled: true },
        ...categories.map(c => ({ value: c.nome, label: c.nome }))
    ];

    const naturezaOptions: SelectOption[] = [
        { value: 'fixa', label: '📅 Fixa (Previsível, todo mês)' },
        { value: 'variavel', label: '📉 Variável (Oscila, frequente)' },
        { value: 'eventual', label: '⚡ Eventual (Sazonal, anomalia)' }
    ];

    const relevanciaOptions: SelectOption[] = [
        { value: 'essencial', label: '🛡️ Essencial (Sobrevivência)' },
        { value: 'estilo_vida', label: '✨ Estilo de Vida (Desejos)' },
        { value: 'investimento', label: '🚀 Investimento (Futuro/Construção)' }
    ];

    return (
        <div className="container mt-4 position-relative fade-in pb-5">
            <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-tags fs-4 text-warning"></i>
                <h2 className="mb-0 fw-bold text-light">Categorias & Automação</h2>
            </div>

            <div className="row g-4">
                {/* COLUNA: CATEGORIAS */}
                <div className="col-md-6 mb-4">
                    <div className="theme-surface shadow-sm h-100 radius-12">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
                            <h5 className="mb-0 fw-bold text-light"><i className="bi bi-folder2-open text-muted me-2"></i>Dicionário</h5>
                            <button className="btn btn-sm btn-outline-light fw-bold" onClick={() => setModalCat({ show: true, isEditing: false, oldName: '', nome: '', cor: '#F2B705', criarRegra: false, termoRegra: '', natureza: 'variavel', relevancia: 'essencial' })}>
                                <i className="bi bi-plus-lg"></i> Nova
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush bg-transparent scrollable-menu" style={{ maxHeight: '600px' }}>
                                {categories.map((cat: Category) => {
                                    const catName = cat.nome;
                                    const catNature = cat.natureza;
                                    const catRelevance = cat.relevancia;
                                    const catColor = cat.cor || '#F2B705';

                                    const natInfo = getNaturezaInfo(catNature);
                                    const relInfo = getRelevanciaInfo(catRelevance);
                                    
                                    return (
                                        <div key={catName} className="list-group-item bg-transparent text-light border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4 hover-opacity">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="shadow-sm" style={{ width: '16px', height: '16px', backgroundColor: catColor, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }}></div>
                                                <div>
                                                    <span className="fw-bold d-block text-light">{catName}</span>
                                                    <div className="d-flex gap-2 mt-1">
                                                        <span className={`badge bg-transparent border border-opacity-50 text-micro ${natInfo.color}`}>{natInfo.icon} {natInfo.label}</span>
                                                        <span className={`badge bg-transparent border border-opacity-50 text-micro ${relInfo.color}`}>{relInfo.icon} {relInfo.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-outline-light border-0 text-white-50" onClick={() => setModalCat({
                                                    show: true, isEditing: true, oldName: catName, nome: catName, cor: catColor, 
                                                    natureza: catNature, relevancia: catRelevance, 
                                                    criarRegra: false, termoRegra: ''
                                                })}>
                                                    <i className="bi bi-pencil fs-6"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger border-0 opacity-50" onClick={() => handleDeleteCategory(catName)}>
                                                    <i className="bi bi-trash fs-6"></i>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUNA: REGRAS AUTOMÁTICAS */}
                <div className="col-md-6 mb-4">
                    <div className="theme-surface shadow-sm h-100 border-info border-opacity-25 radius-12">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
                            <h5 className="mb-0 fw-bold text-light"><i className="bi bi-robot text-info me-2"></i>Regras do Farol</h5>
                            <div>
                                <button className="btn btn-sm btn-warning text-dark me-2 fw-bold" onClick={handleApplyRulesRetroactively} title="Reaplicar em todo o histórico">
                                    <i className="bi bi-lightning-fill"></i> Aplicar
                                </button>
                                <button className="btn btn-sm btn-outline-info fw-bold" onClick={() => setRuleModal({ show: true, termo: '', categoria: '' })}>
                                    <i className="bi bi-plus-lg"></i> Nova
                                </button>
                            </div>
                        </div>
                        <div className="px-4 py-2 border-bottom border-secondary border-opacity-10" style={{backgroundColor: 'rgba(31, 199, 150, 0.03)'}}>
                            <small className="text-muted text-xxs"><i className="bi bi-info-circle me-1"></i> Automação baseada em palavras-chave das descrições.</small>
                        </div>
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush bg-transparent scrollable-menu" style={{ maxHeight: '600px' }}>
                                {rules.length === 0 ? (
                                    <div className="p-5 text-center text-muted">Nenhuma automação ativa.</div>
                                ) : (
                                    rules.map((r, idx) => {
                                        return (
                                            <div key={idx} className="list-group-item bg-transparent text-light border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4 hover-opacity">
                                                <div>
                                                    <span className="text-muted text-xxs me-2">Se conter</span>
                                                    <span className="badge bg-transparent border border-secondary border-opacity-50 fw-bold fs-6 text-warning">"{r.term}"</span> 
                                                    <i className="bi bi-arrow-right text-muted mx-2"></i> 
                                                    <span className="badge bg-secondary bg-opacity-25 fw-normal fs-6 ms-1">{r.category}</span>
                                                </div>
                                                <button className="btn btn-sm btn-outline-danger border-0 opacity-50" onClick={() => handleDeleteRule(r.term)}><i className="bi bi-x-lg"></i></button>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAIS */}
            {modalCat.show && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content theme-surface shadow-lg">
                            <form onSubmit={handleSaveCategory}>
                                <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3">
                                    <h5 className="modal-title fw-bold text-light m-0">
                                        <i className={`bi ${modalCat.isEditing ? 'bi-pencil-square' : 'bi-folder-plus'} text-warning me-2`}></i>
                                        {modalCat.isEditing ? 'Editar Categoria' : 'Nova Categoria'}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setModalCat({...modalCat, show: false})}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row mb-4">
                                        <div className="col-md-8 mb-3 mb-md-0">
                                            <label className="form-label fw-bold text-muted text-xxs text-uppercase">Nome da Categoria</label>
                                            <input type="text" className="form-control form-control-lg bg-transparent text-light border-secondary" required value={modalCat.nome} onChange={e => setModalCat({...modalCat, nome: e.target.value})} placeholder="Ex: Mercado, Assinaturas..." />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-bold text-muted text-xxs text-uppercase">Cor (Gráficos)</label>
                                            <input type="color" className="form-control form-control-color w-100 border-0 bg-transparent p-0" style={{height: '45px'}} value={modalCat.cor} onChange={e => setModalCat({...modalCat, cor: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="bg-white theme-surface bg-opacity-5 p-4 radius-12 border border-secondary border-opacity-25 mb-4 position-relative" style={{ zIndex: 105 }}>
                                        <h6 className="fw-bold text-warning mb-3 text-uppercase text-xxs"><i className="bi bi-grid-3x3 me-2"></i>Matriz de Inteligência Financeira</h6>
                                        <div className="row g-3">
                                            <div className="col-md-6 position-relative" style={{ zIndex: 10 }}>
                                                <label className="form-label text-muted text-xxs">1. Eixo da Natureza</label>
                                                <CustomSelect options={naturezaOptions} value={modalCat.natureza} onChange={val => setModalCat({...modalCat, natureza: val})} textColor="text-light" />
                                            </div>
                                            <div className="col-md-6 position-relative" style={{ zIndex: 9 }}>
                                                <label className="form-label text-muted text-xxs">2. Eixo da Relevância</label>
                                                <CustomSelect options={relevanciaOptions} value={modalCat.relevancia} onChange={val => setModalCat({...modalCat, relevancia: val})} textColor="text-light" />
                                            </div>
                                        </div>
                                    </div>
                                    {!modalCat.isEditing && (
                                        <div className="bg-white theme-surface bg-opacity-5 p-3 radius-12 border border-secondary border-opacity-10 position-relative" style={{ zIndex: 104 }}>
                                            <div className="form-check form-switch mb-0">
                                                <input className="form-check-input ms-0 me-2 bg-transparent border-secondary cursor-pointer" type="checkbox" id="checkCriarRegraAuto" checked={modalCat.criarRegra} onChange={e => setModalCat({...modalCat, criarRegra: e.target.checked})} />
                                                <label className="form-check-label fw-bold text-light cursor-pointer" htmlFor="checkCriarRegraAuto">Criar regra de automação junto</label>
                                            </div>
                                            {modalCat.criarRegra && (
                                                <div className="mt-3 fade-in">
                                                    <label className="form-label text-xxs text-muted">Se a descrição bancária contiver a palavra:</label>
                                                    <input type="text" className="form-control form-control-sm bg-transparent text-warning border-secondary" placeholder="Ex: netflix, ifood, posto..." value={modalCat.termoRegra} onChange={e => setModalCat({...modalCat, termoRegra: e.target.value})} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-25 px-4 py-3">
                                    <button type="button" className="btn btn-outline-light border-0 me-2" onClick={() => setModalCat({...modalCat, show: false})}>Cancelar</button>
                                    <button type="submit" className="btn btn-warning fw-bold px-4 text-dark shadow-sm">Salvar Categoria</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {modalRule.show && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content theme-surface shadow-lg border-info border-opacity-50">
                            <form onSubmit={handleSaveRule}>
                                <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3">
                                    <h5 className="modal-title fw-bold text-light m-0"><i className="bi bi-robot text-info me-2"></i>Nova Automação</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setRuleModal({...modalRule, show: false})}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="mb-4">
                                        <label className="form-label fw-bold text-muted text-xxs text-uppercase">Se a descrição contiver:</label>
                                        <input type="text" className="form-control bg-transparent text-light border-secondary" required value={modalRule.termo} onChange={e => setRuleModal({...modalRule, termo: e.target.value})} placeholder="Ex: Posto Ipiranga" />
                                    </div>
                                    <div className="mb-2 position-relative" style={{ zIndex: 105 }}>
                                        <label className="form-label fw-bold text-muted text-xxs text-uppercase">Classificar como:</label>
                                        <CustomSelect options={categoryOptions} value={modalRule.categoria} onChange={val => setRuleModal({...modalRule, categoria: val})} textColor="text-light" />
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-25 px-4 py-3">
                                    <button type="button" className="btn btn-outline-light border-0 me-2" onClick={() => setRuleModal({...modalRule, show: false})}>Cancelar</button>
                                    <button type="submit" className="btn btn-info fw-bold px-4 text-white shadow-sm">Ativar Regra</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}