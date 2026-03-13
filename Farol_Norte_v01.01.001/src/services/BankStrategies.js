import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { parseMoney, gerarFingerprint } from '../utils/helpers';
import { formatarNome } from '../utils/formatters';

// Configuração do Worker do PDF.js para React
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const BANK_STRATEGIES = {
    'generic': { label: 'Genérico (CSV Padrão)', parser: 'GenericParser' },
    'nubank': { label: 'Nubank (CSV)', parser: 'NubankParser' },
    'inter': { label: 'Banco Inter (CSV)', parser: 'InterParser' },
    'itaú': { label: 'Itaú (CSV)', parser: 'ItauParser' },
    'bradesco': { label: 'Bradesco (CSV)', parser: 'BradescoParser' }
};

export class BankStrategyFactory {
    static getStrategy(bankType) {
        switch (bankType) {
            case 'nubank': return new NubankParser();
            case 'inter': return new InterParser();
            default: return new GenericParser();
        }
    }
}

// ==========================================
// 1. MODELO NUBANK 
// ==========================================
class NubankParser {
    parse(rows, _accountId, cardId) {
        return rows.map((row, index) => {
            const date = row.data || row.date;
            const rawAmount = row.amount || row.valor;
            const rawTitle = row.title || row.description || row.descrição || row.descricao;
            const rawId = row.identificador || row.id || null; 

            if (!date || !rawAmount) return null;

            let valorNum = parseMoney(rawAmount); 
            let valorFinal = valorNum;
            let tipo = "Despesa";
            
            const titleLower = (rawTitle || '').toLowerCase();
            const nomeFormatado = formatarNome(rawTitle); 

            let parcelaInfo = null;
            const regexParcela = /(?:Parcela\s+)?(\d+)\/(\d+)/i;
            const matchParcela = rawTitle.match(regexParcela);
            
            if (matchParcela) {
                parcelaInfo = { atual: parseInt(matchParcela[1]), total: parseInt(matchParcela[2]) };
            }

            if (cardId) {
                if (valorNum > 0) {
                    valorFinal = -Math.abs(valorNum); 
                    tipo = "Compra no Crédito";
                } else {
                    valorFinal = Math.abs(valorNum); 
                    if (titleLower.includes('pagamento recebido')) tipo = "Pagamento de Fatura";
                    else tipo = "Estorno/Crédito"; 
                }
            } else {
                valorFinal = valorNum; 
                if (valorNum > 0) {
                    if (titleLower.includes('estorno') || titleLower.includes('reembolso')) tipo = "Estorno/Reembolso";
                    else tipo = "Receita";
                } else {
                    if (titleLower.includes('pagamento de fatura')) tipo = "Pagamento de Fatura";
                    else tipo = "Despesa";
                }
            }

            let identificador;
            if (rawId) {
                const safeId = rawId.toString().replace(/[^a-zA-Z0-9-]/g, '');
                identificador = `nubank-${safeId}-${valorFinal}`;
            } else {
                identificador = gerarFingerprint('nubank', date, valorFinal, nomeFormatado, index);
            }

            return {
                data: date, nome: nomeFormatado, valor: valorFinal,
                identificador: identificador, tipo: tipo, parcela: parcelaInfo, ignorarNoFluxo: false
            };
        }).filter(item => item !== null);
    }
}

// ==========================================
// 2. MODELO BANCO INTER
// ==========================================
class InterParser {
    parse(rows,) {
        return rows.map((row, index) => {
            const date = row['data lançamento'] || row['data lancamento'];
            const hist = row['histórico'] || row['historico'];
            const desc = row['descrição'] || row['descricao'];
            const val = row['valor'];

            if (!date || !val) return null;

            let nomeFinal = (desc && desc.trim().length > 0) ? desc : hist;
            let tipo = 'Despesa';
            let categoriaFixa = null;
            let valorNum = parseMoney(val);

            const termoBusca = (nomeFinal || '').toUpperCase().replace(/\s+/g, '');

            if (termoBusca.includes('PAGAMENTOEFETUADO') || termoBusca.includes('PAGAMENTOONLINE')) {
                tipo = 'Pagamento de Fatura';
                categoriaFixa = 'Pagamento de Fatura';
                nomeFinal = 'Pgto. Fatura Cartão Inter';
                valorNum = Math.abs(valorNum);
            } else {
                tipo = valorNum > 0 ? 'Receita' : 'Despesa';
            }

            nomeFinal = formatarNome(nomeFinal);
            const identificador = gerarFingerprint('inter-csv', date, valorNum, nomeFinal, index);

            return {
                data: date, nome: nomeFinal, valor: valorNum, identificador: identificador, tipo: tipo, categoria: categoriaFixa
            };
        }).filter(item => item !== null);
    }

    async parsePDF(arrayBuffer, cardId) {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const transactions = [];
        console.log(`📄 PDF Inter: Iniciando leitura blindada.`);

        const mesesMap = { 'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12' };
        let encontrouSecaoDespesas = false;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(s => s.str).join(" ");
            
            if (!encontrouSecaoDespesas) {
                const textClean = pageText.toLowerCase().replace(/\s+/g, '');
                if (textClean.includes("despesasdafatura") || textClean.includes("despesasdomês")) encontrouSecaoDespesas = true;
            }
            if (!encontrouSecaoDespesas && i < 3) continue;

            const regexTabela = /(\d{2})\s+de\s+([a-zç]{3})[a-z]*\.?\s+(\d{4})\s+(.*?)\s+([+-]?\s*R\$\s?[\d.,]+)/gi;
            let match;
            while ((match = regexTabela.exec(pageText)) !== null) {
                const dia = match[1];
                const mesTexto = match[2].toLowerCase();
                const ano = match[3];
                let descricaoMeio = match[4].trim();
                const valorStr = match[5];

                if (descricaoMeio.toUpperCase().includes("TOTAL") && descricaoMeio.toUpperCase().includes("CARTÃO")) continue;
                if (descricaoMeio.toUpperCase().includes("SUBTOTAL")) continue;

                descricaoMeio = descricaoMeio.replace(/[-–+]+$/, '').trim();

                const mesNum = mesesMap[mesTexto] || '01';
                const dataCompleta = `${dia}/${mesNum}/${ano}`;
                let valor = parseMoney(valorStr);
                const descClean = descricaoMeio.toUpperCase().replace(/\s+/g, '');
                
                let tipo = 'Compra no Crédito';
                let categoriaFixa = null;

                if (descClean.includes("PAGAMENTOONLINE") || descClean.includes("PAGAMENTODEFATURA") || descClean.includes("PAGAMENTOEFETUADO")) {
                    tipo = 'Pagamento de Fatura';
                    categoriaFixa = 'Pagamento de Fatura';
                    valor = Math.abs(valor); 
                    descricaoMeio = "Pagamento de Fatura (Inter)";
                } else if (descClean.includes("ESTORNO") || descClean.includes("CRÉDITO") || valorStr.includes("+")) {
                    tipo = 'Estorno/Crédito';
                    valor = Math.abs(valor); 
                } else {
                    tipo = 'Compra no Crédito';
                    valor = -Math.abs(valor); 
                }

                transactions.push({
                    data: dataCompleta, nome: formatarNome(descricaoMeio), valor: valor,
                    identificador: gerarFingerprint('inter-pdf-final', dataCompleta, valor, descricaoMeio, i),
                    tipo: tipo, categoria: categoriaFixa, card_id: cardId
                });
            }
        }
        
        if (transactions.length === 0) return this.parsePDFAntigo(arrayBuffer, cardId);
        return transactions;
    }

    async parsePDFAntigo(arrayBuffer, cardId) {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const transactions = [];
        let year = new Date().getFullYear();
        try {
            const p1 = await pdf.getPage(1);
            const t1 = await p1.getTextContent();
            const s1 = t1.items.map(s => s.str).join(" ");
            const matchAno = s1.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (matchAno) year = parseInt(matchAno[3]);
        } catch(error) {
            // Linter fica feliz porque o erro foi logado e o bloco não está vazio
            console.warn("Ano não encontrado na capa do PDF", error);
        }

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(s => s.str).join(" ");
            const regex = /(\d{2}\/\d{2})\s+((?:(?!\d{2}\/\d{2}).)*?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g;
            
            let match;
            while ((match = regex.exec(pageText)) !== null) {
                if (match[0].includes(" de ")) continue; 
                const dataDiaMes = match[1];
                let descricao = match[2].trim();
                let valor = parseMoney(match[3]);
                const descClean = descricao.toUpperCase().replace(/\s+/g, '');

                if (descricao.length < 3 || descClean.includes("SALDO")) continue;

                let tipo = 'Compra no Crédito';
                let catFixa = null;

                if (descClean.includes("PAGAMENTOEFETUADO")) {
                    tipo = 'Pagamento de Fatura';
                    catFixa = 'Pagamento de Fatura';
                    valor = Math.abs(valor);
                } else if (!match[0].includes("-" + match[3])) {
                    valor = -Math.abs(valor);
                } else {
                    valor = Math.abs(valor);
                }

                const [d, m] = dataDiaMes.split('/');
                const dataCompleta = `${d}/${m}/${year}`;

                transactions.push({
                    data: dataCompleta, nome: formatarNome(descricao), valor: valor,
                    identificador: gerarFingerprint('inter-pdf-old', dataCompleta, valor, descricao, i),
                    tipo: tipo, categoria: catFixa, card_id: cardId
                });
            }
        }
        return transactions;
    }
}

// ==========================================
// 3. MODELO GENÉRICO
// ==========================================

class GenericParser {
    parse(rows, accountId, cardId) {
        return rows.map((row, index) => {
            const date = row.data || row.date || Object.values(row)[0];
            const val = row.valor || row.amount || row.value || Object.values(row)[1];
            const desc = row.descricao || row.description || row.title || row.historico || "Sem descrição";

            if (!date || !val) return null;

            let valorNum = parseMoney(val);
            let tipo = valorNum > 0 ? 'Receita' : 'Despesa';

            if (cardId && valorNum > 0 && desc && !desc.toLowerCase().includes('pagamento')) {
                valorNum = -valorNum;
                tipo = 'Compra no Crédito';
            }

            return {
                data: date, descricao: desc, valor: valorNum,
                identificador: gerarFingerprint('gen', date, valorNum, desc, index),
                tipo: tipo
            };
        }).filter(item => item !== null);
    }
}