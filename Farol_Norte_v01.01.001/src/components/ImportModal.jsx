    // src/components/ImportModal.jsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useFinance } from '../context/FinanceContext';
import { db, cardsDb, rulesDb } from '../services/DataService';
import { BankStrategyFactory, BANK_STRATEGIES } from '../services/BankStrategies';
import { calcularIdFatura } from '../utils/helpers';

export default function ImportModal({ show, onClose }) {
    const { accounts, refreshData } = useFinance();
    
    // Estados Reativos do Modal
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [importTarget, setImportTarget] = useState('');
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados Calculados
    const [detectedBank, setDetectedBank] = useState('generic');
    const [accountCards, setAccountCards] = useState([]);

    // Sempre que a conta mudar, atualiza as opções de cartão e detecta o banco
    useEffect(() => {
        if (!selectedAccountId) {
            setAccountCards([]);
            setImportTarget('');
            return;
        }

        const conta = accounts.find(c => c.id === selectedAccountId);
        setDetectedBank(conta?.bankType || 'generic');
        
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
            let todasTransacoes = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const isPdf = file.name.toLowerCase().endsWith(".pdf");
                let transacoesDoArquivo = [];

                if (isPdf) {
                    if (!strategy.parsePDF) throw new Error(`O modelo ${detectedBank} não suporta PDF (${file.name}).`);
                    const arrayBuffer = await file.arrayBuffer();
                    transacoesDoArquivo = await strategy.parsePDF(arrayBuffer, targetId);
                } else {
                    let cleanText = await file.text();
                    
                    if (detectedBank === 'inter' && cleanText.includes("Data Lançamento")) {
                        cleanText = cleanText.substring(cleanText.indexOf("Data Lançamento"));
                    }
                    cleanText = cleanText.replace(/"/g, '');

                    const parseResult = Papa.parse(cleanText, {
                        header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase()
                    });

                    if (parseResult.data) {
                        transacoesDoArquivo = strategy.parse(parseResult.data, selectedAccountId, isCreditCard ? targetId : null);
                    }
                }

                if (transacoesDoArquivo.length > 0) todasTransacoes = todasTransacoes.concat(transacoesDoArquivo);
            }

            if (todasTransacoes.length === 0) throw new Error("Nenhuma transação válida encontrada nos arquivos.");

            let importedCount = 0;
            const existingIds = new Set(db.getAll().map(t => t.identificador));
            const novasParaSalvar = [];

            todasTransacoes.forEach(tr => {
                tr.account_id = selectedAccountId;
                if (isCreditCard) {
                    tr.tipoLancamento = 'cartao';
                    tr.card_id = targetId;
                    tr.status = tr.valor < 0 ? 'pendente' : 'pago';
                    if (tr.data) tr.idFatura = calcularIdFatura(tr.data);
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
                    novasParaSalvar.push(tr);
                    existingIds.add(tr.identificador);
                    importedCount++;
                }
            });

            if (novasParaSalvar.length > 0) {
                db.addMany(novasParaSalvar);
                refreshData(); // 🔥 A MÁGICA DO REACT: AVISA A NUVEM QUE TEM DADO NOVO!
            }

            alert(`✅ Concluído! \n📥 Importados: ${importedCount} \n(Ignorados ${todasTransacoes.length - importedCount} duplicados)`);
            onClose(); // Fecha o modal
            
        } catch (error) {
            console.error(error);
            alert("❌ Erro: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">Importar Transações</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    
                    <div className="modal-body p-4">
                        {isLoading && (
                            <div className="alert alert-info d-flex align-items-center mb-4">
                                <span className="spinner-border spinner-border-sm me-3"></span>
                                Processando arquivos, por favor aguarde...
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="form-label fw-bold">1. Selecione a Conta</label>
                            <select className="form-select form-select-lg" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} disabled={isLoading}>
                                <option value="" disabled>-- Escolha a conta --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.nome}</option>
                                ))}
                            </select>
                        </div>

                        {selectedAccountId && (
                            <div className="mb-4">
                                <label className="form-label fw-bold">
                                    2. Qual o destino? 
                                    <span className="badge bg-secondary ms-2">Banco: {BANK_STRATEGIES[detectedBank]?.label || detectedBank}</span>
                                </label>
                                <div className="list-group">
                                    <label className={`list-group-item d-flex gap-3 align-items-center p-3 cursor-pointer ${importTarget === 'ACCOUNT' ? 'active' : ''}`}>
                                        <input className="form-check-input" type="radio" name="importTarget" checked={importTarget === 'ACCOUNT'} onChange={() => setImportTarget('ACCOUNT')} disabled={isLoading} />
                                        <div>
                                            <span className="fw-bold d-block">Extrato da Conta</span>
                                            <small>Débitos, Pix e Transferências (CSV/OFX)</small>
                                        </div>
                                    </label>
                                    
                                    {accountCards.map(card => (
                                        <label key={card.id} className={`list-group-item d-flex gap-3 align-items-center p-3 cursor-pointer ${importTarget === card.id ? 'active' : ''}`}>
                                            <input className="form-check-input" type="radio" name="importTarget" checked={importTarget === card.id} onChange={() => setImportTarget(card.id)} disabled={isLoading} />
                                            <div>
                                                <span className="fw-bold d-block">Fatura: {card.nome}</span>
                                                <small>Compras Crédito (PDF/CSV)</small>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {importTarget && (
                            <div className="mb-4">
                                <label className="form-label fw-bold">3. Selecione os Arquivos (Pode ser mais de um)</label>
                                <input className="form-control form-control-lg" type="file" multiple accept=".csv,.pdf,.ofx" onChange={(e) => setFiles(e.target.files)} disabled={isLoading} />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>Cancelar</button>
                        <button type="button" className="btn btn-primary fw-bold" onClick={handleImport} disabled={!files.length || isLoading}>
                            <i className="bi bi-cloud-upload me-2"></i> Importar Dados
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}