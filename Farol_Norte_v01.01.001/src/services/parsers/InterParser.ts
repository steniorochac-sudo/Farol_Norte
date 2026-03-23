// src/services/parsers/InterParser.ts
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseMoney, gerarFingerprint } from '../../utils/helpers';
import { formatarNome } from '../../utils/formatters';
import type { IBankParser, ParsedRow } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export class InterParser implements IBankParser {
  preProcessText(rawText: string): string {
    if (rawText.includes("Data Lançamento")) {
        return rawText.substring(rawText.indexOf("Data Lançamento"));
    }
    return rawText;
  }

  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows
      .map((row, index) => {
        const date = (row['data lançamento'] || row['data lancamento']) as string | undefined;
        const hist = (row['histórico'] || row['historico']) as string | undefined;
        const desc = (row['descrição'] || row['descricao']) as string | undefined;
        const val = row['valor'] as string | number | undefined;

        if (!date || !val) return null;

        let nomeFinal = desc && (desc as string).trim().length > 0 ? desc : hist;
        let tipo = 'Despesa';
        let categoriaFixa: string | undefined;
        let valorNum = typeof val === 'string' ? parseMoney(val) : val;

        const termoBusca = ((nomeFinal as string) || '').toUpperCase().replace(/\s+/g, '');

        if (termoBusca.includes('PAGAMENTOEFETUADO') || termoBusca.includes('PAGAMENTOONLINE')) {
          tipo = 'Pagamento de Fatura';
          categoriaFixa = 'Pagamento de Fatura';
          nomeFinal = 'Pgto. Fatura Cartão Inter';
          valorNum = Math.abs(valorNum);
        } else {
          tipo = valorNum > 0 ? 'Receita' : 'Despesa';
        }

        nomeFinal = formatarNome(nomeFinal as string);
        const identificador = gerarFingerprint('inter-csv', date, valorNum, nomeFinal, index);

        return { data: date, nome: nomeFinal, valor: valorNum, identificador, tipo, categoria: categoriaFixa } as ParsedRow;
      })
      .filter((item): item is ParsedRow => item !== null);
  }

  async parsePDF(arrayBuffer: ArrayBuffer, cardId: string): Promise<ParsedRow[]> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: ParsedRow[] = [];
    const mesesMap: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
    let encontrouSecaoDespesas = false;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((s: any) => s.str).join(' ');

      if (!encontrouSecaoDespesas) {
        if (pageText.toLowerCase().replace(/\s+/g, '').includes('despesasdafatura')) encontrouSecaoDespesas = true;
      }
      if (!encontrouSecaoDespesas && i < 3) continue;

      const regexTabela = /(\d{2})\s+de\s+([a-zç]{3})[a-z]*\.?\s+(\d{4})\s+(.*?)\s+([+-]?\s*R\$\s?[\d.,]+)/gi;
      let match: RegExpExecArray | null;

      while ((match = regexTabela.exec(pageText)) !== null) {
        const dia = match[1], mesTexto = match[2].toLowerCase(), ano = match[3], valorStr = match[5];
        let descricaoMeio = match[4].trim();

        if (descricaoMeio.toUpperCase().includes('TOTAL') || descricaoMeio.toUpperCase().includes('SUBTOTAL')) continue;
        descricaoMeio = descricaoMeio.replace(/[-–+]+$/, '').trim();

        const dataCompleta = `${dia}/${mesesMap[mesTexto] || '01'}/${ano}`;
        let valor = parseMoney(valorStr);
        const descClean = descricaoMeio.toUpperCase().replace(/\s+/g, '');

        let tipo = 'Compra no Crédito', categoriaFixa: string | undefined;

        if (descClean.includes('PAGAMENTOONLINE') || descClean.includes('PAGAMENTOEFETUADO')) {
          tipo = 'Pagamento de Fatura';
          categoriaFixa = 'Pagamento de Fatura';
          valor = Math.abs(valor);
          descricaoMeio = 'Pagamento de Fatura (Inter)';
        } else if (descClean.includes('ESTORNO') || descClean.includes('CRÉDITO') || valorStr.includes('+')) {
          tipo = 'Estorno/Crédito';
          valor = Math.abs(valor);
        } else {
          valor = -Math.abs(valor);
        }

        transactions.push({
          data: dataCompleta, nome: formatarNome(descricaoMeio), valor,
          identificador: gerarFingerprint('inter-pdf', dataCompleta, valor, descricaoMeio, i),
          tipo, categoria: categoriaFixa, card_id: cardId,
        } as ParsedRow);
      }
    }
    return transactions;
  }
}