// src/services/parsers/NubankParser.ts
import { parseMoney, gerarFingerprint } from '../../utils/helpers';
import { formatarNome } from '../../utils/formatters';
import type { IBankParser, ParsedRow } from './types';

export class NubankParser implements IBankParser {
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