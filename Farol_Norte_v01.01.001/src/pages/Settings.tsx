// src/pages/Settings.tsx
import React, { useState } from 'react';
import { 
    exportarDados, 
    importarDados, 
    exportarRelatorioCSV, 
    limparApenasTransacoes, 
    limparSistemaCompleto 
} from '../services/DataService';

export default function Settings() {
    // ==========================================
    // ESTADOS
    // ==========================================
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [showClearModal, setShowClearModal] = useState<boolean>(false);
    const [clearOption, setClearOption] = useState<'transactions' | 'all'>('transactions');

    // ==========================================
    // MANIPULADORES DE AÇÃO
    // ==========================================
    const handleExport = () => exportarDados();

    const handleImport = async () => {
        if (!fileToImport) return alert("Selecione um arquivo JSON primeiro.");
        if (window.confirm("ATENÇÃO: Isso irá substituir todos os seus dados atuais. Continuar?")) {
            try {
                await importarDados(fileToImport);
                alert("Backup restaurado! Recarregando sistema...");
                window.location.reload();
            } catch (e: any) { 
                alert(e.message || "Erro ao importar dados"); 
            }
        }
    };

    const handleExportCSV = () => exportarRelatorioCSV();

    const handleExecuteClear = () => {
        if (clearOption === "transactions") {
            limparApenasTransacoes();
        } else if (clearOption === "all") {
            limparSistemaCompleto();
        }
        setShowClearModal(false);
        window.location.reload();
    };

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================
    return (
        <div className="container mt-4 mb-5 fade-in pb-5">
            <div className="row justify-content-center">
                <div className="col-md-9 col-lg-8">
                    
                    <div className="d-flex align-items-center gap-2 mb-4">
                        <i className="bi bi-gear-fill fs-4 text-warning"></i>
                        <h2 className="mb-0 fw-bold text-light">Configurações</h2>
                    </div>

                    {/* CARD 1: BACKUP E RESTAURAÇÃO */}
                    <div className="theme-surface shadow-sm mb-4 radius-12">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-4">
                            <h6 className="mb-0 fw-bold text-light">
                                <i className="bi bi-cloud-arrow-down text-warning me-2"></i>Segurança e Backup
                            </h6>
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-4">
                                <div className="col-md-6 border-end border-secondary border-opacity-25">
                                    <h6 className="fw-bold text-light mb-2">Exportar Nuvem Local</h6>
                                    <p className="text-muted small mb-3">Gere um arquivo de salvaguarda (.json) com todo o seu histórico e regras.</p>
                                    <button className="btn btn-outline-warning fw-bold w-100" onClick={handleExport}>
                                        <i className="bi bi-download me-2"></i>Gerar Backup
                                    </button>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="fw-bold text-light mb-2">Restaurar de Arquivo</h6>
                                    <p className="text-muted small mb-3">Importe um arquivo de backup para migrar seus dados de outro dispositivo.</p>
                                    <div className="input-group">
                                        <input 
                                            type="file" 
                                            className="form-control form-control-sm radius-left-8 text-light" 
                                            accept=".json"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFileToImport(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <button className="btn btn-warning radius-right-8" type="button" onClick={handleImport} disabled={!fileToImport}>
                                            <i className="bi bi-upload text-dark"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: RELATÓRIOS */}
                    <div className="theme-surface shadow-sm mb-4 radius-12">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-4">
                            <h6 className="mb-0 fw-bold text-light">
                                <i className="bi bi-file-earmark-spreadsheet text-success me-2"></i>Extração de Dados
                            </h6>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                                <div>
                                    <h6 className="fw-bold text-light mb-1">Planilha de Auditoria (CSV)</h6>
                                    <p className="text-muted small mb-0">
                                        Exporta todas as transações (incluindo rateios) para Excel ou Google Sheets.
                                    </p>
                                </div>
                                <div style={{ minWidth: '180px' }}>
                                    <button className="btn btn-outline-success w-100 fw-bold" onClick={handleExportCSV}>
                                        <i className="bi bi-file-earmark-excel me-2"></i>Baixar Planilha
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: ZONA DE PERIGO */}
                    <div className="theme-surface shadow-sm border border-danger border-opacity-25 mb-5 radius-12">
                        <div className="card-header bg-danger bg-opacity-10 border-bottom border-danger border-opacity-25 py-3 px-4">
                            <h6 className="mb-0 fw-bold text-danger">
                                <i className="bi bi-shield-exclamation me-2"></i>Zona de Perigo
                            </h6>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                                <div>
                                    <h6 className="text-danger fw-bold mb-1">Limpeza Crítica</h6>
                                    <p className="text-muted small mb-0">
                                        Ações irreversíveis de exclusão de dados do navegador.
                                    </p>
                                </div>
                                <div style={{ minWidth: '180px' }}>
                                    <button className="btn btn-outline-danger w-100 fw-bold" onClick={() => setShowClearModal(true)}>
                                        <i className="bi bi-trash3-fill me-2"></i>Limpar Tudo...
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-5 text-muted small">
                        <div className="fw-bold opacity-50 mb-1">FAROL NORTE</div>
                        <div className="opacity-25">React Edition • UI Refactored</div>
                    </div>
                </div>
            </div>

            {/* MODAL DE LIMPEZA DE DADOS */}
            {showClearModal && (
                <div className="modal show d-block fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content theme-surface shadow-lg border-danger border-opacity-50">
                            <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                                <h5 className="modal-title fw-bold text-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>Atenção Crítica</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowClearModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="text-light mb-4">Selecione o nível de limpeza desejado:</p>
                                
                                <div className="list-group bg-transparent">
                                    <label className={`list-group-item bg-transparent border border-secondary border-opacity-25 d-flex gap-3 align-items-start p-3 mb-2 rounded-3 cursor-pointer ${clearOption === 'transactions' ? 'border-warning bg-warning bg-opacity-10' : 'hover-opacity'}`}>
                                        <input 
                                            className="form-check-input flex-shrink-0 mt-1 bg-transparent border-secondary cursor-pointer" 
                                            type="radio" 
                                            name="clearOption" 
                                            checked={clearOption === 'transactions'} 
                                            onChange={() => setClearOption('transactions')} 
                                        />
                                        <div>
                                            <span className={`fw-bold d-block ${clearOption === 'transactions' ? 'text-warning' : 'text-light'}`}>Limpar Histórico de Transações</span>
                                            <small className="text-muted text-xxs">Apaga apenas as entradas e saídas. Suas Contas, Cartões e Regras de Automação serão preservadas.</small>
                                        </div>
                                    </label>
                                    
                                    <label className={`list-group-item bg-transparent border border-danger border-opacity-25 d-flex gap-3 align-items-start p-3 rounded-3 cursor-pointer ${clearOption === 'all' ? 'bg-danger bg-opacity-10 border-opacity-100' : 'hover-opacity'}`}>
                                        <input 
                                            className="form-check-input flex-shrink-0 mt-1 bg-transparent border-danger cursor-pointer" 
                                            type="radio" 
                                            name="clearOption" 
                                            checked={clearOption === 'all'} 
                                            onChange={() => setClearOption('all')} 
                                        />
                                        <div>
                                            <span className="fw-bold d-block text-danger">Reset de Fábrica</span>
                                            <small className="text-muted text-xxs">Elimina absolutamente todos os dados. O Farol Norte voltará ao estado original de primeiro acesso.</small>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                                <button type="button" className="btn btn-outline-light border-0" onClick={() => setShowClearModal(false)}>Cancelar</button>
                                <button type="button" className="btn btn-danger fw-bold px-4 shadow-sm" onClick={handleExecuteClear}>
                                    Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}