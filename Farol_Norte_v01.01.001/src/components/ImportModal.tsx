// src/components/ImportModal.tsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useFinance } from '../context/FinanceContext';
import { db, cardsDb, rulesDb } from '../services/DataService';
import { BankStrategyFactory, BANK_STRATEGIES } from '../services/BankStrategies';
import { calcularIdFatura } from '../utils/helpers';
import type { BankType, CreditCard, Transaction } from '../types/index';

interface ImportModalProps {
    show: boolean;
    onClose: () => void;
}

export default function ImportModal({ show, onClose }: ImportModalProps) {
    const { accounts, refreshData } = useFinance();
    
    // Estados Reativos do Modal
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [importTarget, setImportTarget] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    // Estados Calculados
    const [detectedBank, setDetectedBank] = useState<BankType>('generic');
    const [accountCards, setAccountCards] = useState<CreditCard[]>([]);

    // Sempre que a conta mudar, atualiza as opções de cartão e detecta o banco
    useEffect(() => {
        if (!selectedAccountId) {
            setAccountCards([]);
            setImportTarget('');
            return;
        }

        const conta = accounts.find(c => c.id === selectedAccountId);
        // O TypeScript apontou que a propriedade correta é "bank", não "bankType"
        setDetectedBank(conta?.bank || 'generic');
        
        // Em um app completo, cartões também estariam no Context. Aqui usamos a chamada direta do DB.
        const cartoes = cardsDb.getAll().filter(c => c.account_id === selectedAccountId);
        setAccountCards(cartoes);
        setImportTarget(''); // Reseta o destino ao trocar de conta
    }, [selectedAccountId, accounts]);

    const handleImport = async () => {
        if (files.length === 0) return alert("Selecione pelo menos um arquivo.");
        if (!importTarget) return alert("Selecione o destino (Conta ou Fatura).");

        setIsLoading(true);

        try {
            const isCreditCard = importTarget !== 'ACCOUNT';
            const targetId = isCreditCard ? importTarget : selectedAccountId;
            
            const strategy = BankStrategyFactory.getStrategy(detectedBank);
            let todasTransacoes: any[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const isPdf = file.name.toLowerCase().endsWith(".pdf");
                let transacoesDoArquivo: any[] = [];

                if (isPdf) {
                    // Verificamos de forma dinâmica se o parser escolhido suporta leitura de PDF
                    if (!(strategy as any).parsePDF) {
                        throw new Error(`O modelo ${detectedBank} não suporta PDF (${file.name}).`);
                    }
                    const arrayBuffer = await file.arrayBuffer();
                    transacoesDoArquivo = await (strategy as any).parsePDF(arrayBuffer, targetId);
                } else {
                    let cleanText = await file.text();
                    
                    // Delega a limpeza do cabeçalho ao parser específico do banco
                    if (typeof (strategy as any).preProcessText === 'function') {
                        cleanText = (strategy as any).preProcessText(cleanText);
                    }
                    
                    cleanText = cleanText.replace(/"/g, '');

                    const parseResult = Papa.parse(cleanText, {
                        header: true, 
                        skipEmptyLines: true, 
                        transformHeader: (h: string) => h.trim().toLowerCase()
                    });

                    if (parseResult.data) {
                        transacoesDoArquivo = strategy.parse(
                            parseResult.data as Record<string, unknown>[], 
                            selectedAccountId, 
                            isCreditCard ? targetId : undefined
                        );
                    }
                }

                if (transacoesDoArquivo.length > 0) {
                    todasTransacoes = todasTransacoes.concat(transacoesDoArquivo);
                }
            }

            if (todasTransacoes.length === 0) throw new Error("Nenhuma transação válida encontrada nos arquivos.");

            let importedCount = 0;
            const existingIds = new Set(db.getAll().map(t => t.identificador));
            const novasParaSalvar: Transaction[] = [];

            todasTransacoes.forEach(tr => {
                tr.account_id = selectedAccountId;
                if (isCreditCard) {
                    tr.tipoLancamento = 'cartao';
                    tr.card_id = targetId;
                    tr.status = tr.valor < 0 ? 'pendente' : 'pago';
                    if (tr.data) {
                        tr.idFatura = calcularIdFatura(tr.data);
                    }
                } else {
                    tr.tipoLancamento = 'conta';
                    tr.status = 'caixa';
                }

                if (tr.data && tr.data.includes('-')) {
                    const [y, m, d] = tr.data.split('-');
                    tr.data = `${d}/${m}/${y}`;
                }

                if (tr.identificador && !existingIds.has(tr.identificador) && !novasParaSalvar.some(n => n.identificador === tr.identificador)) {
                    rulesDb.apply(tr);
                    novasParaSalvar.push(tr as Transaction);
                    existingIds.add(tr.identificador);
                    importedCount++;
                }
            });

            if (novasParaSalvar.length > 0) {
                db.addMany(novasParaSalvar);
                refreshData(); // 🔥 REACT: AVISA A NUVEM QUE TEM DADO NOVO.
            }

            alert(`✅ Concluído! \n📥 Importados: ${importedCount} \n(Ignorados ${todasTransacoes.length - importedCount} duplicados)`);
            onClose(); // Fecha o modal
            
        } catch (error: any) {
            console.error(error);
            alert("❌ Erro: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content theme-surface shadow-lg">
                    <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                        <h5 className="modal-title fw-bold text-light"><i className="bi bi-cloud-upload me-2 text-warning"></i>Importar Transações</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    
                    <div className="modal-body p-4">
                        {isLoading && (
                            <div className="alert bg-info bg-opacity-25 border border-info border-opacity-50 text-light d-flex align-items-center mb-4">
                                <span className="spinner-border spinner-border-sm me-3 text-info"></span>
                                Processando arquivos, por favor aguarde...
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="form-label fw-bold text-muted small text-uppercase">1. Selecione a Conta</label>
                            <select 
                                className="form-select text-light fw-bold shadow-sm" 
                                value={selectedAccountId} 
                                onChange={(e) => setSelectedAccountId(e.target.value)} 
                                disabled={isLoading}
                                style={{ height: '48px' }}
                            >
                                <option value="" disabled>-- Escolha a conta --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.nome}</option>
                                ))}
                            </select>
                        </div>

                        {selectedAccountId && (
                            <div className="mb-4 fade-in">
                                <label className="form-label fw-bold text-muted small text-uppercase d-flex justify-content-between">
                                    2. Qual o destino? 
                                    <span className="badge bg-transparent border border-warning text-warning ms-2">
                                        Parser: {BANK_STRATEGIES[detectedBank as keyof typeof BANK_STRATEGIES]?.label || detectedBank}
                                    </span>
                                </label>
                                <div className="list-group">
                                    <label className={`list-group-item bg-transparent d-flex gap-3 align-items-center p-3 cursor-pointer border-secondary border-opacity-25 ${importTarget === 'ACCOUNT' ? 'bg-primary bg-opacity-10 border-warning border-opacity-50' : 'hover-opacity'}`}>
                                        <input className="form-check-input bg-transparent border-secondary" type="radio" name="importTarget" checked={importTarget === 'ACCOUNT'} onChange={() => setImportTarget('ACCOUNT')} disabled={isLoading} />
                                        <div>
                                            <span className={`fw-bold d-block ${importTarget === 'ACCOUNT' ? 'text-warning' : 'text-light'}`}><i className="bi bi-bank2 me-2"></i>Extrato da Conta</span>
                                            <small className="text-muted">Débitos, Pix e Transferências (CSV/OFX)</small>
                                        </div>
                                    </label>
                                    
                                    {accountCards.map(card => (
                                        <label key={card.id} className={`list-group-item bg-transparent d-flex gap-3 align-items-center p-3 cursor-pointer border-secondary border-opacity-25 ${importTarget === card.id ? 'bg-primary bg-opacity-10 border-warning border-opacity-50' : 'hover-opacity'}`}>
                                            <input className="form-check-input bg-transparent border-secondary" type="radio" name="importTarget" checked={importTarget === card.id} onChange={() => setImportTarget(card.id)} disabled={isLoading} />
                                            <div>
                                                <span className={`fw-bold d-block ${importTarget === card.id ? 'text-warning' : 'text-light'}`}><i className="bi bi-credit-card me-2"></i>Fatura: {card.nome}</span>
                                                <small className="text-muted">Compras Crédito (PDF/CSV)</small>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {importTarget && (
                            <div className="mb-4 fade-in">
                                <label className="form-label fw-bold text-muted small text-uppercase">3. Selecione os Arquivos (Pode ser mais de um)</label>
                                <input 
                                    className="form-control text-light shadow-sm" 
                                    type="file" 
                                    multiple 
                                    accept=".csv,.pdf,.ofx" 
                                    onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} 
                                    disabled={isLoading} 
                                    style={{ height: '48px' }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                        <button type="button" className="btn btn-outline-light border-0" onClick={onClose} disabled={isLoading}>Cancelar</button>
                        <button type="button" className="btn btn-warning fw-bold text-dark shadow-sm px-4" onClick={handleImport} disabled={files.length === 0 || isLoading}>
                            <i className="bi bi-cloud-upload me-2"></i> Iniciar Importação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}