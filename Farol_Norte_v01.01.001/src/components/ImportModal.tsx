// src/components/ImportModal.tsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useFinance } from '../context/FinanceContext';
import { db, cardsDb, rulesDb } from '../services/DataService';
import { BankStrategyFactory, BANK_STRATEGIES } from '../services/BankStrategies';
import { OfxParser } from '../services/parsers/OfxParser'; 
import { ImportTransactionService } from '../services/ImportTransactionService'; // O NOVO CÉREBRO

interface ImportModalProps {
    show: boolean;
    onClose: () => void;
}

export default function ImportModal({ show, onClose }: ImportModalProps) {
    const { accounts, refreshData } = useFinance();
    
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [importTarget, setImportTarget] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const [detectedBank, setDetectedBank] = useState<string>('generic');
    const [accountCards, setAccountCards] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedAccountId) {
            setAccountCards([]);
            setImportTarget('');
            return;
        }

        const conta = accounts.find((c: any) => c.id === selectedAccountId);
        setDetectedBank(conta?.bank || 'generic');
        
        const cartoes = cardsDb.getAll().filter((c: any) => c.account_id === selectedAccountId);
        setAccountCards(cartoes);
        setImportTarget(''); 
    }, [selectedAccountId, accounts]);

    const handleImport = async () => {
        if (files.length === 0) return alert("Selecione pelo menos um arquivo.");
        if (!importTarget) return alert("Selecione o destino (Conta ou Fatura).");

        setIsLoading(true);

        try {
            const isCreditCard = importTarget !== 'ACCOUNT';
            const targetId = isCreditCard ? importTarget : selectedAccountId;
            const strategy = BankStrategyFactory.getStrategy(detectedBank);
            let transacoesExtraidasBrutas: any[] = [];

            // ========================================================
            // FASE 1: EXTRAÇÃO BRUTA (Leitura dos Arquivos)
            // ========================================================
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const isPdf = file.name.toLowerCase().endsWith(".pdf");
                const isOfx = file.name.toLowerCase().endsWith(".ofx");
                let extraidasDoArquivo: any[] = [];

                if (isOfx) {
                    const rawText = await file.text();
                    const ofxParser = new OfxParser();
                    extraidasDoArquivo = ofxParser.parseRawText(rawText, selectedAccountId, isCreditCard ? targetId : undefined);
                } else if (isPdf) {
                    if (!(strategy as any).parsePDF) throw new Error(`O modelo ${detectedBank} não suporta PDF (${file.name}).`);
                    const arrayBuffer = await file.arrayBuffer();
                    extraidasDoArquivo = await (strategy as any).parsePDF(arrayBuffer, targetId);
                } else {
                    let cleanText = await file.text();
                    if (typeof (strategy as any).preProcessText === 'function') cleanText = (strategy as any).preProcessText(cleanText);
                    cleanText = cleanText.replace(/"/g, '');

                    const parseResult = Papa.parse(cleanText, { header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim().toLowerCase() });

                    if (parseResult.meta && parseResult.meta.fields && parseResult.data.length > 0) {
                        const colunas = parseResult.meta.fields.join(' ').toLowerCase();
                        const isExtratoHeaders = colunas.includes('saldo') || colunas.includes('balance') || colunas.includes('release_date') || colunas.includes('net_amount');
                        const isFaturaHeaders = colunas.includes('cartão') || colunas.includes('cartao') || colunas.includes('estabelecimento') || colunas.includes('titular');

                        if (isCreditCard && isExtratoHeaders && !isFaturaHeaders) throw new Error(`O arquivo "${file.name}" é um EXTRATO bancário, mas você selecionou a importação de FATURA.`);
                        if (!isCreditCard && isFaturaHeaders && !isExtratoHeaders) throw new Error(`O arquivo "${file.name}" é uma FATURA de cartão, mas você selecionou a importação de EXTRATO.`);
                    }

                    if (parseResult.data) {
                        extraidasDoArquivo = strategy.parse(parseResult.data as Record<string, unknown>[], selectedAccountId, isCreditCard ? targetId : undefined);
                    }
                }

                if (extraidasDoArquivo.length > 0) transacoesExtraidasBrutas = transacoesExtraidasBrutas.concat(extraidasDoArquivo);
            }

            if (transacoesExtraidasBrutas.length === 0) throw new Error("Nenhuma transação válida encontrada nos arquivos.");

            // ========================================================
            // FASE 2: DELEGAÇÃO PARA O PIPELINE CENTRAL
            // ========================================================
            const existingTransactions = db.getAll();
            const cardsList = cardsDb.getAll();

            const { validTransactions, duplicateCount } = ImportTransactionService.normalizeAndFilter(
                transacoesExtraidasBrutas,
                existingTransactions,
                selectedAccountId,
                isCreditCard,
                targetId,
                cardsList
            );

            // Aplica as regras de categorização e salva
            validTransactions.forEach(tr => rulesDb.apply(tr));

            if (validTransactions.length > 0) {
                db.addMany(validTransactions);
                refreshData(); 
            }

            alert(`✅ Concluído! \n📥 Importados: ${validTransactions.length} \n(Ignorados ${duplicateCount} duplicados)`);
            onClose(); 
            
        } catch (error: any) {
            console.error(error);
            alert("❌ Erro: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content theme-surface shadow-lg border-secondary border-opacity-50">
                    <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3">
                        <h5 className="modal-title fw-bold text-light m-0"><i className="bi bi-cloud-arrow-up text-warning me-2"></i>Importar Transações</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    
                    <div className="modal-body p-4">
                        {isLoading && (
                            <div className="alert alert-info bg-info bg-opacity-10 border-info border-opacity-25 text-info d-flex align-items-center mb-4 radius-12 p-3">
                                <span className="spinner-border spinner-border-sm me-3"></span>
                                Processando transações via Pipeline...
                            </div>
                        )}

                        <div className="mb-4 fade-in">
                            <label className="form-label fw-bold text-muted small text-uppercase">1. Selecione a Conta</label>
                            <select className="form-select form-select-lg bg-transparent text-light border-secondary" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} disabled={isLoading}>
                                <option value="" disabled className="text-dark">-- Escolha a conta --</option>
                                {accounts.map((acc: any) => (
                                    <option key={acc.id} value={acc.id} className="text-dark">{acc.nome}</option>
                                ))}
                            </select>
                        </div>

                        {selectedAccountId && (
                            <div className="mb-4 fade-in">
                                <label className="form-label fw-bold text-muted small text-uppercase d-flex justify-content-between align-items-center">
                                    <span>2. Qual o destino?</span>
                                    <span className="badge bg-secondary bg-opacity-25 text-light border border-secondary border-opacity-50">Motor: {BANK_STRATEGIES[detectedBank]?.label || detectedBank}</span>
                                </label>
                                <div className="list-group">
                                    <label className={`list-group-item bg-transparent d-flex gap-3 align-items-center p-3 cursor-pointer border-secondary border-opacity-25 ${importTarget === 'ACCOUNT' ? 'border-warning bg-warning bg-opacity-10' : 'hover-opacity'}`}>
                                        <input className="form-check-input mt-0 bg-transparent border-secondary" type="radio" name="importTarget" checked={importTarget === 'ACCOUNT'} onChange={() => setImportTarget('ACCOUNT')} disabled={isLoading} style={{ transform: 'scale(1.2)' }} />
                                        <div>
                                            <span className={`fw-bold d-block ${importTarget === 'ACCOUNT' ? 'text-warning' : 'text-light'}`}><i className="bi bi-bank me-2"></i>Extrato da Conta</span>
                                            <small className="text-muted">Débitos, Pix e Transferências (CSV/OFX)</small>
                                        </div>
                                    </label>
                                    
                                    {accountCards.map(card => (
                                        <label key={card.id} className={`list-group-item bg-transparent d-flex gap-3 align-items-center p-3 cursor-pointer border-secondary border-opacity-25 ${importTarget === card.id ? 'border-warning bg-warning bg-opacity-10' : 'hover-opacity'}`}>
                                            <input className="form-check-input mt-0 bg-transparent border-secondary" type="radio" name="importTarget" checked={importTarget === card.id} onChange={() => setImportTarget(card.id)} disabled={isLoading} style={{ transform: 'scale(1.2)' }} />
                                            <div>
                                                <span className={`fw-bold d-block ${importTarget === card.id ? 'text-warning' : 'text-light'}`}><i className="bi bi-credit-card me-2"></i>Fatura: {card.nome}</span>
                                                <small className="text-muted">Compras no Crédito (PDF/CSV/OFX)</small>
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
                                    style={{ height: '48px', backgroundColor: 'rgba(255,255,255,0.05)' }}
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