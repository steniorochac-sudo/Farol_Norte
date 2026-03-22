/**
 * BankStrategies.ts - Parsers para diferentes bancos
 * Factory Pattern para estratégias de parsing de transações
 */

import * as pdfjsLib from 'pdfjs-dist'
import type { BankType } from '../types/index'
import { parseMoney, gerarFingerprint } from '../utils/helpers'
import { formatarNome } from '../utils/formatters'

// @ts-ignore - O Vite processa o sufixo ?url nativamente, o ignore evita alertas no TypeScript
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configuração do Worker do PDF.js blindada para o Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// =========================================================
// TIPOS E INTERFACES BASE
// =========================================================

export interface ParsedRow {
  data: string
  nome: string
  valor: number
  identificador: string
  tipo: string
  parcela?: { atual: number; total: number }
  categoria?: string
  card_id?: string
  account_id?: string
  tipoLancamento?: 'conta' | 'cartao'
  status?: string
  ignorarNoFluxo?: boolean
}

// A interface que todos os parsers devem respeitar
export interface IBankParser {
  preProcessText?(rawText: string): string; // Cada banco limpa seu próprio CSV
  parse(rows: Record<string, unknown>[], accountId: string, cardId?: string): ParsedRow[];
  parsePDF?(arrayBuffer: ArrayBuffer, targetId: string): Promise<ParsedRow[]>;
}

// =========================================================
// 1. NUBANK PARSER
// =========================================================

class NubankParser implements IBankParser {
  parse(rows: Record<string, unknown>[], _accountId: string, cardId?: string): ParsedRow[] {
    return rows
      .map((row, index) => {
        const date = (row.data || row.date) as string | undefined
        const rawAmount = (row.amount || row.valor) as string | number | undefined
        const rawTitle = (row.title || row.description || row.descrição || row.descricao) as string | undefined
        const rawId = (row.identificador || row.id) as string | undefined

        if (!date || !rawAmount) return null

        let valorNum = typeof rawAmount === 'string' ? parseMoney(rawAmount) : rawAmount
        let valorFinal = valorNum
        let tipo = 'Despesa'

        const titleLower = (rawTitle || '').toLowerCase()
        const nomeFormatado = formatarNome(rawTitle || 'Sem descrição')

        let parcelaInfo: { atual: number; total: number } | undefined
        const matchParcela = rawTitle?.match(/(?:Parcela\s+)?(\d+)\/(\d+)/i)
        if (matchParcela) {
          parcelaInfo = { atual: parseInt(matchParcela[1], 10), total: parseInt(matchParcela[2], 10) }
        }

        if (cardId) {
          if (valorNum > 0) {
            valorFinal = -Math.abs(valorNum)
            tipo = 'Compra no Crédito'
          } else {
            valorFinal = Math.abs(valorNum)
            if (titleLower.includes('pagamento recebido')) tipo = 'Pagamento de Fatura'
            else tipo = 'Estorno/Crédito'
          }
        } else {
          valorFinal = valorNum
          if (valorNum > 0) {
            if (titleLower.includes('estorno') || titleLower.includes('reembolso')) tipo = 'Estorno/Reembolso'
            else tipo = 'Receita'
          } else {
            if (titleLower.includes('pagamento de fatura')) tipo = 'Pagamento de Fatura'
            else tipo = 'Despesa'
          }
        }

        let identificador = rawId 
          ? `nubank-${rawId.toString().replace(/[^a-zA-Z0-9-]/g, '')}-${valorFinal}`
          : gerarFingerprint('nubank', date, valorFinal, nomeFormatado, index)

        return {
          data: date,
          nome: nomeFormatado,
          valor: valorFinal,
          identificador,
          tipo,
          parcela: parcelaInfo,
          ignorarNoFluxo: false,
        } as ParsedRow
      })
      .filter((item): item is ParsedRow => item !== null)
  }
}

// =========================================================
// 2. BANCO INTER PARSER
// =========================================================

class InterParser implements IBankParser {
  // Limpa o cabeçalho sujo do Inter
  preProcessText(rawText: string): string {
    if (rawText.includes("Data Lançamento")) {
        return rawText.substring(rawText.indexOf("Data Lançamento"));
    }
    return rawText;
  }

  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows
      .map((row, index) => {
        const date = (row['data lançamento'] || row['data lancamento']) as string | undefined
        const hist = (row['histórico'] || row['historico']) as string | undefined
        const desc = (row['descrição'] || row['descricao']) as string | undefined
        const val = row['valor'] as string | number | undefined

        if (!date || !val) return null

        let nomeFinal = desc && (desc as string).trim().length > 0 ? desc : hist
        let tipo = 'Despesa'
        let categoriaFixa: string | undefined
        let valorNum = typeof val === 'string' ? parseMoney(val) : val

        const termoBusca = ((nomeFinal as string) || '').toUpperCase().replace(/\s+/g, '')

        if (termoBusca.includes('PAGAMENTOEFETUADO') || termoBusca.includes('PAGAMENTOONLINE')) {
          tipo = 'Pagamento de Fatura'
          categoriaFixa = 'Pagamento de Fatura'
          nomeFinal = 'Pgto. Fatura Cartão Inter'
          valorNum = Math.abs(valorNum)
        } else {
          tipo = valorNum > 0 ? 'Receita' : 'Despesa'
        }

        nomeFinal = formatarNome(nomeFinal as string)
        const identificador = gerarFingerprint('inter-csv', date, valorNum, nomeFinal, index)

        return { data: date, nome: nomeFinal, valor: valorNum, identificador, tipo, categoria: categoriaFixa } as ParsedRow
      })
      .filter((item): item is ParsedRow => item !== null)
  }

  async parsePDF(arrayBuffer: ArrayBuffer, cardId: string): Promise<ParsedRow[]> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const transactions: ParsedRow[] = []
    const mesesMap: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' }
    let encontrouSecaoDespesas = false

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((s) => (s as any).str).join(' ')

      if (!encontrouSecaoDespesas) {
        if (pageText.toLowerCase().replace(/\s+/g, '').includes('despesasdafatura')) encontrouSecaoDespesas = true
      }
      if (!encontrouSecaoDespesas && i < 3) continue

      const regexTabela = /(\d{2})\s+de\s+([a-zç]{3})[a-z]*\.?\s+(\d{4})\s+(.*?)\s+([+-]?\s*R\$\s?[\d.,]+)/gi
      let match: RegExpExecArray | null

      while ((match = regexTabela.exec(pageText)) !== null) {
        const dia = match[1], mesTexto = match[2].toLowerCase(), ano = match[3], valorStr = match[5]
        let descricaoMeio = match[4].trim()

        if (descricaoMeio.toUpperCase().includes('TOTAL') || descricaoMeio.toUpperCase().includes('SUBTOTAL')) continue
        descricaoMeio = descricaoMeio.replace(/[-–+]+$/, '').trim()

        const dataCompleta = `${dia}/${mesesMap[mesTexto] || '01'}/${ano}`
        let valor = parseMoney(valorStr)
        const descClean = descricaoMeio.toUpperCase().replace(/\s+/g, '')

        let tipo = 'Compra no Crédito', categoriaFixa: string | undefined

        if (descClean.includes('PAGAMENTOONLINE') || descClean.includes('PAGAMENTOEFETUADO')) {
          tipo = 'Pagamento de Fatura'
          categoriaFixa = 'Pagamento de Fatura'
          valor = Math.abs(valor)
          descricaoMeio = 'Pagamento de Fatura (Inter)'
        } else if (descClean.includes('ESTORNO') || descClean.includes('CRÉDITO') || valorStr.includes('+')) {
          tipo = 'Estorno/Crédito'
          valor = Math.abs(valor)
        } else {
          valor = -Math.abs(valor)
        }

        transactions.push({
          data: dataCompleta, nome: formatarNome(descricaoMeio), valor,
          identificador: gerarFingerprint('inter-pdf', dataCompleta, valor, descricaoMeio, i),
          tipo, categoria: categoriaFixa, card_id: cardId,
        } as ParsedRow)
      }
    }
    return transactions
  }
}

// =========================================================
// 3. MERCADO PAGO PARSER
// =========================================================

class MercadoPagoParser implements IBankParser {
  // O Mercado Pago traz saldos nas primeiras linhas. Cortamos tudo antes de RELEASE_DATE
  preProcessText(rawText: string): string {
    if (rawText.includes("RELEASE_DATE")) {
        return rawText.substring(rawText.indexOf("RELEASE_DATE"));
    }
    return rawText;
  }

  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows.map((row, index) => {
        let dataStr = row['release_date'] as string | undefined;
        // CORREÇÃO: Remove o fuso horário/hora antes de processar
        if (dataStr) dataStr = dataStr.split(' ')[0]; 

        const descricao = row['transaction_type'] as string | undefined;
        const valorStr = row['transaction_net_amount'] as string | number | undefined;

        if (!dataStr || !descricao || valorStr === undefined) return null;

        const valor = typeof valorStr === 'string' ? parseMoney(valorStr) : valorStr;
        if (valor === 0) return null;

        const nomeFormatado = formatarNome(descricao);
        const identificador = `mp-${gerarFingerprint('mercado_pago', dataStr, valor, nomeFormatado, index)}`;

        return {
            data: dataStr,
            nome: nomeFormatado,
            valor: valor,
            identificador,
            tipo: valor > 0 ? 'Receita' : 'Despesa'
        } as ParsedRow;
    }).filter((item): item is ParsedRow => item !== null);
  }
}

// =========================================================
// 4. GENERIC PARSER (Fallback)
// =========================================================

class GenericParser implements IBankParser {
  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows
      .map((row, index) => {
        const dateKey = Object.keys(row).find((key) => /date|data|data_lancamento/i.test(key))
        const amountKey = Object.keys(row).find((key) => /amount|valor|value/i.test(key))
        const descKey = Object.keys(row).find((key) => /description|descricao|title|nome/i.test(key))

        if (!dateKey || !amountKey) return null

        const dataValue = row[dateKey] as string | undefined
        const amountValue = row[amountKey] as string | number | undefined
        const descValue = descKey ? (row[descKey] as string | undefined) : undefined

        if (!dataValue || !amountValue) return null

        let valor = typeof amountValue === 'string' ? parseMoney(amountValue) : amountValue
        const nome = formatarNome(descValue || 'Transação')

        return {
          data: dataValue,
          nome,
          valor,
          identificador: gerarFingerprint('generic', dataValue, valor, nome, index),
          tipo: valor > 0 ? 'Receita' : 'Despesa',
        } as ParsedRow
      })
      .filter((item): item is ParsedRow => item !== null)
  }
}

// =========================================================
// O DICIONÁRIO CENTRAL (ÚNICA FONTE DE VERDADE)
// =========================================================

export const BANK_STRATEGIES: Record<string, { label: string, parser: IBankParser }> = {
  generic: { label: 'Genérico (CSV Padrão)', parser: new GenericParser() },
  nubank: { label: 'Nubank (CSV)', parser: new NubankParser() },
  inter: { label: 'Banco Inter (CSV/PDF)', parser: new InterParser() },
  mercado_pago: { label: 'Mercado Pago (CSV)', parser: new MercadoPagoParser() },
}

// Usada pela UI para preencher selects automaticamente
export function getBankOptions() {
  return Object.entries(BANK_STRATEGIES).map(([value, config]) => ({
      value,
      label: config.label
  }));
}

export class BankStrategyFactory {
  static getStrategy(bankCode: string): IBankParser {
    return BANK_STRATEGIES[bankCode]?.parser || BANK_STRATEGIES['generic'].parser;
  }
}