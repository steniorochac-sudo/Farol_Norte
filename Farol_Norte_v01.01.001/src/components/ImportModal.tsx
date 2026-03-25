// src/components/ImportModal.tsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useFinance } from '../context/FinanceContext';
import { db, cardsDb, rulesDb } from '../services/DataService';
import { BankStrategyFactory, BANK_STRATEGIES } from '../services/BankStrategies';
import { OfxParser } from '../services/parsers/OfxParser'; 
import { generateUUID } from '../utils/helpers';

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
            // FASE 1: EXTRAÇÃO BURRA (Parsers apenas leem o texto)
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
            // FASE 2: O PIPELINE CENTRAL DE NORMALIZAÇÃO
            // ========================================================
            const existingTransactions = db.getAll();
            const novasParaSalvar: any[] = [];
            let importedCount = 0;

            transacoesExtraidasBrutas.forEach((tr, index) => {
                tr.account_id = selectedAccountId;
                const rawValor = typeof tr.valor === 'number' ? tr.valor : parseFloat(tr.valor);
                
                // --- ESTÁGIO 1: FORMATAÇÃO DE DATAS ---
                let rawDate = (tr.data || '').split(' ')[0]; 
                const dateMatch = rawDate.match(/^(\d{2,4})[-\/](\d{2})[-\/](\d{2,4})/);
                if (dateMatch) {
                    const p1 = dateMatch[1], p2 = dateMatch[2], p3 = dateMatch[3];
                    tr.data = p1.length === 4 ? `${p3.padStart(2, '0')}/${p2.padStart(2, '0')}/${p1}` : `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${p3}`;
                } else {
                    tr.data = rawDate.replace(/-/g, '/');
                }

                // --- ESTÁGIO 2: ANÁLISE SEMÂNTICA ---
                const descLower = (tr.nome || '').toLowerCase();
                const isPagamentoKeyword = descLower.includes('pagamento') || descLower.includes('fatura') || descLower.includes('pago') || descLower.includes('recebido');
                const isEstornoKeyword = descLower.includes('estorno') || descLower.includes('reembolso') || descLower.includes('cancelamento');

                // --- ESTÁGIO 3: MATEMÁTICA ABSOLUTA E TIPAGEM ---
                if (isCreditCard) {
                    tr.tipoLancamento = 'cartao';
                    tr.card_id = targetId;
                    
                    if (isPagamentoKeyword) {
                        // Pagamento de fatura: Entra positivo (crédito) para abater o saldo devedor do cartão
                        tr.valor = Math.abs(rawValor);
                        tr.tipo = 'Pagamento de Fatura';
                        tr.categoria = 'Pagamento de Fatura';
                    } else if (isEstornoKeyword) {
                        // Estorno: Entra positivo para devolver o limite
                        tr.valor = Math.abs(rawValor);
                        tr.tipo = 'Estorno/Reembolso';
                    } else {
                        // Compras Comuns: Blindado para sempre ser negativo (dívida), não importa como o banco envie
                        tr.valor = -Math.abs(rawValor);
                        tr.tipo = 'Despesa';
                    }
                } else {
                    // Conta Corrente
                    tr.tipoLancamento = 'conta';
                    tr.valor = rawValor; // Mantém o sinal original da conta bancária
                    
                    if (isPagamentoKeyword && tr.valor < 0) {
                        tr.tipo = 'Pagamento de Fatura';
                        tr.categoria = 'Pagamento de Fatura';
                    } else {
                        tr.tipo = tr.valor > 0 ? 'Receita' : 'Despesa';
                    }
                }

                // --- ESTÁGIO 4: VENCIMENTOS E PAGAMENTOS ---
                if (isCreditCard) {
                    tr.status = 'pendente';
                    const cardObj = cardsDb.getAll().find((c: any) => c.id === targetId);
                    if (cardObj && tr.data) {
                        const [dStr, mStr, yStr] = tr.data.split('/');
                        const diaCompra = parseInt(dStr, 10);
                        let mesFat = parseInt(mStr, 10);
                        let anoFat = parseInt(yStr, 10);
                        
                        const fechamento = parseInt(String((cardObj as any).closingDay || (cardObj as any).diaFechamento || '1'), 10);
                        const vencimento = parseInt(String((cardObj as any).dueDay || (cardObj as any).diaVencimento || '10'), 10);
                        
                        if (diaCompra >= fechamento) {
                            mesFat++;
                            if (mesFat > 12) { mesFat = 1; anoFat++; }
                        }
                        tr.dataVencimento = `${String(vencimento).padStart(2, '0')}/${String(mesFat).padStart(2, '0')}/${anoFat}`;
                    }
                } else {
                    tr.status = 'pago'; 
                    tr.dataVencimento = tr.data;
                    tr.dataPagamento = tr.data; 
                }

                // --- ESTÁGIO 5: REASSINATURA UNIVERSAL ---
                // Redefinimos a chave identificadora aqui para que o OFX, CSV e PDF gerem 
                // rigorosamente o mesmo ID, tornando o sistema imune a transações duplicadas em reimportações.
                tr.identificador = `auto-${tr.data}-${tr.valor}-${(tr.nome || '').substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}-${index}`;

                // --- ESTÁGIO 6: ESCUDO ANTI-DUPLICIDADE HEURÍSTICO ---
                const checkDuplicate = (arr: any[]) => arr.some((ext: any) => {
                    if (ext.identificador === tr.identificador) return true;
                    if (ext.account_id === tr.account_id && ext.data === tr.data && ext.valor === tr.valor) {
                        const nomeExt = (ext.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
                        const nomeTr = (tr.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
                        if (nomeExt === nomeTr && nomeExt.length >= 3) return true;
                    }
                    return false;
                });

                if (!checkDuplicate(existingTransactions) && !checkDuplicate(novasParaSalvar)) {
                    rulesDb.apply(tr); // Aplica as regras de categorização automática
                    novasParaSalvar.push(tr);
                    importedCount++;
                }
            });

            if (novasParaSalvar.length > 0) {
                db.addMany(novasParaSalvar);
                refreshData(); 
            }

            alert(`✅ Concluído! \n📥 Importados: ${importedCount} \n(Ignorados ${transacoesExtraidasBrutas.length - importedCount} duplicados)`);
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
                                Aplicando Pipeline de Normalização, por favor aguarde...
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