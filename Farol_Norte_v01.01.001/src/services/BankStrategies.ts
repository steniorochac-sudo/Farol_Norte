/**
 * BankStrategies.ts - Parsers para diferentes bancos
 * Factory Pattern para estratégias de parsing de transações
 */

import * as pdfjsLib from 'pdfjs-dist'
import type { BankType } from '../types/index'
import { parseMoney, gerarFingerprint } from '../utils/helpers'
import { formatarNome } from '../utils/formatters'

// Configuração do Worker do PDF.js
// Usa o caminho relativo ao node_modules
const workerPath = new URL(
  '../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath

// =========================================================
// TIPOS INTERNOS
// =========================================================

interface ParsedRow {
  data: string
  nome: string
  valor: number
  identificador: string
  tipo: string
  parcela?: { atual: number; total: number }
  categoria?: string
  card_id?: string
  ignorarNoFluxo?: boolean
}

// =========================================================
// FACTORY PATTERN
// =========================================================

export class BankStrategyFactory {
  static getStrategy(bankType: BankType): BankParser {
    switch (bankType) {
      case 'nubank':
        return new NubankParser()
      case 'inter':
        return new InterParser()
      default:
        return new GenericParser()
    }
  }
}

// =========================================================
// INTERFACE BASE
// =========================================================

abstract class BankParser {
  abstract parse(
    rows: Record<string, unknown>[],
    accountId: string,
    cardId?: string
  ): ParsedRow[]
}

// =========================================================
// 1. NUBANK PARSER
// =========================================================

class NubankParser extends BankParser {
  parse(
    rows: Record<string, unknown>[],
    _accountId: string,
    cardId?: string
  ): ParsedRow[] {
    return rows
      .map((row, index) => {
        const date = (row.data || row.date) as string | undefined
        const rawAmount = (row.amount || row.valor) as string | number | undefined
        const rawTitle =
          (row.title ||
            row.description ||
            row.descrição ||
            row.descricao) as string | undefined
        const rawId = (row.identificador || row.id) as string | undefined

        if (!date || !rawAmount) return null

        let valorNum = typeof rawAmount === 'string' ? parseMoney(rawAmount) : rawAmount
        let valorFinal = valorNum
        let tipo = 'Despesa'

        const titleLower = (rawTitle || '').toLowerCase()
        const nomeFormatado = formatarNome(rawTitle || 'Sem descrição')

        // Detecta parcelas (ex: "Parcela 1/3")
        let parcelaInfo: { atual: number; total: number } | undefined
        const regexParcela = /(?:Parcela\s+)?(\d+)\/(\d+)/i
        const matchParcela = rawTitle?.match(regexParcela)

        if (matchParcela) {
          parcelaInfo = {
            atual: parseInt(matchParcela[1], 10),
            total: parseInt(matchParcela[2], 10),
          }
        }

        // Lógica de determinação de tipo
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
            if (titleLower.includes('estorno') || titleLower.includes('reembolso'))
              tipo = 'Estorno/Reembolso'
            else tipo = 'Receita'
          } else {
            if (titleLower.includes('pagamento de fatura')) tipo = 'Pagamento de Fatura'
            else tipo = 'Despesa'
          }
        }

        // Gera fingerprint único para evitar duplicatas
        let identificador: string
        if (rawId) {
          const safeId = rawId.toString().replace(/[^a-zA-Z0-9-]/g, '')
          identificador = `nubank-${safeId}-${valorFinal}`
        } else {
          identificador = gerarFingerprint('nubank', date, valorFinal, nomeFormatado, index)
        }

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

class InterParser extends BankParser {
  parse(
    rows: Record<string, unknown>[],
    _accountId: string,
    _cardId?: string
  ): ParsedRow[] {
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

        const termoBusca = ((nomeFinal as string) || '')
          .toUpperCase()
          .replace(/\s+/g, '')

        if (
          termoBusca.includes('PAGAMENTOEFETUADO') ||
          termoBusca.includes('PAGAMENTOONLINE')
        ) {
          tipo = 'Pagamento de Fatura'
          categoriaFixa = 'Pagamento de Fatura'
          nomeFinal = 'Pgto. Fatura Cartão Inter'
          valorNum = Math.abs(valorNum)
        } else {
          tipo = valorNum > 0 ? 'Receita' : 'Despesa'
        }

        nomeFinal = formatarNome(nomeFinal as string)
        const identificador = gerarFingerprint('inter-csv', date, valorNum, nomeFinal, index)

        return {
          data: date,
          nome: nomeFinal,
          valor: valorNum,
          identificador,
          tipo,
          categoria: categoriaFixa,
        } as ParsedRow
      })
      .filter((item): item is ParsedRow => item !== null)
  }

  async parsePDF(arrayBuffer: ArrayBuffer, cardId: string): Promise<ParsedRow[]> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const transactions: ParsedRow[] = []
    console.log('📄 PDF Inter: Iniciando leitura blindada.')

    const mesesMap: Record<string, string> = {
      jan: '01',
      fev: '02',
      mar: '03',
      abr: '04',
      mai: '05',
      jun: '06',
      jul: '07',
      ago: '08',
      set: '09',
      out: '10',
      nov: '11',
      dez: '12',
    }

    let encontrouSecaoDespesas = false

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((s) => (s as any).str).join(' ')

      if (!encontrouSecaoDespesas) {
        const textClean = pageText.toLowerCase().replace(/\s+/g, '')
        if (
          textClean.includes('despesasdafatura') ||
          textClean.includes('despesasdomês')
        ) {
          encontrouSecaoDespesas = true
        }
      }
      if (!encontrouSecaoDespesas && i < 3) continue

      const regexTabela =
        /(\d{2})\s+de\s+([a-zç]{3})[a-z]*\.?\s+(\d{4})\s+(.*?)\s+([+-]?\s*R\$\s?[\d.,]+)/gi
      let match: RegExpExecArray | null

      while ((match = regexTabela.exec(pageText)) !== null) {
        const dia = match[1]
        const mesTexto = match[2].toLowerCase()
        const ano = match[3]
        let descricaoMeio = match[4].trim()
        const valorStr = match[5]

        if (
          descricaoMeio.toUpperCase().includes('TOTAL') &&
          descricaoMeio.toUpperCase().includes('CARTÃO')
        )
          continue
        if (descricaoMeio.toUpperCase().includes('SUBTOTAL')) continue

        descricaoMeio = descricaoMeio.replace(/[-–+]+$/, '').trim()

        const mesNum = mesesMap[mesTexto] || '01'
        const dataCompleta = `${dia}/${mesNum}/${ano}`
        let valor = parseMoney(valorStr)
        const descClean = descricaoMeio.toUpperCase().replace(/\s+/g, '')

        let tipo = 'Compra no Crédito'
        let categoriaFixa: string | undefined

        if (
          descClean.includes('PAGAMENTOONLINE') ||
          descClean.includes('PAGAMENTODEFATURA') ||
          descClean.includes('PAGAMENTOEFETUADO')
        ) {
          tipo = 'Pagamento de Fatura'
          categoriaFixa = 'Pagamento de Fatura'
          valor = Math.abs(valor)
          descricaoMeio = 'Pagamento de Fatura (Inter)'
        } else if (descClean.includes('ESTORNO') || descClean.includes('CRÉDITO') || valorStr.includes('+')) {
          tipo = 'Estorno/Crédito'
          valor = Math.abs(valor)
        } else {
          tipo = 'Compra no Crédito'
          valor = -Math.abs(valor)
        }

        transactions.push({
          data: dataCompleta,
          nome: formatarNome(descricaoMeio),
          valor,
          identificador: gerarFingerprint('inter-pdf-final', dataCompleta, valor, descricaoMeio, i),
          tipo,
          categoria: categoriaFixa,
          card_id: cardId,
        } as ParsedRow)
      }
    }

    if (transactions.length === 0) return this.parsePDFAntigo(arrayBuffer, cardId)
    return transactions
  }

  private async parsePDFAntigo(arrayBuffer: ArrayBuffer, cardId: string): Promise<ParsedRow[]> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const transactions: ParsedRow[] = []
    let year = new Date().getFullYear()

    try {
      const p1 = await pdf.getPage(1)
      const t1 = await p1.getTextContent()
      const s1 = t1.items.map((s) => (s as any).str).join(' ')
      const matchAno = s1.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (matchAno) year = parseInt(matchAno[3], 10)
    } catch (error) {
      console.warn('⚠️ Ano não encontrado na capa do PDF', error)
    }

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((s) => (s as any).str).join(' ')
      const regex = /(\d{2}\/\d{2})\s+((?:(?!\d{2}\/\d{2}).)*?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g

      let match: RegExpExecArray | null
      while ((match = regex.exec(pageText)) !== null) {
        if (match[0].includes(' de ')) continue

        const dataDiaMes = match[1]
        let descricao = match[2].trim()
        let valor = parseMoney(match[3])
        const descClean = descricao.toUpperCase().replace(/\s+/g, '')

        if (descricao.length < 3 || descClean.includes('SALDO')) continue

        let tipo = 'Compra no Crédito'
        let catFixa: string | undefined

        if (descClean.includes('PAGAMENTOEFETUADO')) {
          tipo = 'Pagamento de Fatura'
          catFixa = 'Pagamento de Fatura'
          valor = Math.abs(valor)
        } else if (!match[0].includes('-' + match[3])) {
          valor = -Math.abs(valor)
        } else {
          valor = Math.abs(valor)
        }

        const [d, m] = dataDiaMes.split('/')
        const dataCompleta = `${d}/${m}/${year}`

        transactions.push({
          data: dataCompleta,
          nome: formatarNome(descricao),
          valor,
          identificador: gerarFingerprint('inter-pdf-old', dataCompleta, valor, descricao, i),
          tipo,
          categoria: catFixa,
          card_id: cardId,
        } as ParsedRow)
      }
    }

    return transactions
  }
}

// =========================================================
// 3. GENERIC PARSER (Fallback)
// =========================================================

class GenericParser extends BankParser {
  parse(
    rows: Record<string, unknown>[],
    _cardId?: string
  ): ParsedRow[] {
    return rows
      .map((row, index) => {
        // Tenta encontrar as colunas padrão
        const date = Object.keys(row).find((key) =>
          /date|data|data_lancamento/i.test(key)
        )
        const amount = Object.keys(row).find((key) =>
          /amount|valor|value/i.test(key)
        )
        const description = Object.keys(row).find((key) =>
          /description|descricao|title|nome/i.test(key)
        )

        if (!date || !amount) return null

        const dataValue = row[date]! as string | undefined
        const amountValue = row[amount]! as string | number | undefined
        const descValue = description ? (row[description] as string | undefined) : undefined

        if (!dataValue || !amountValue) return null

        let valor = typeof amountValue === 'string' ? parseMoney(amountValue) : amountValue
        const tipo = valor > 0 ? 'Receita' : 'Despesa'
        const nome = formatarNome(descValue || 'Transação')
        const identificador = gerarFingerprint('generic', dataValue, valor, nome, index)

        return {
          data: dataValue,
          nome,
          valor,
          identificador,
          tipo,
        } as ParsedRow
      })
      .filter((item): item is ParsedRow => item !== null)
  }
}

// =========================================================
// EXPORT
// =========================================================

export const BANK_STRATEGIES = {
  generic: { label: 'Genérico (CSV Padrão)', parser: 'GenericParser' },
  nubank: { label: 'Nubank (CSV)', parser: 'NubankParser' },
  inter: { label: 'Banco Inter (CSV/PDF)', parser: 'InterParser' },
} as const