// src/services/parsers/NubankParser.ts
import { parseMoney } from '../../utils/helpers';
import { formatarNome } from '../../utils/formatters';
import type { IBankParser, ParsedRow } from './types';

export class NubankParser implements IBankParser {
  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows
      .map((row, index) => {
        // Mapeamento flexível: Suporta Conta Corrente (PT) e Fatura de Cartão (EN)
        const date = (row.data || row.date) as string | undefined;
        const rawAmount = (row.valor || row.amount) as string | number | undefined;
        const rawTitle = (row.descrição || row.descricao || row.title) as string | undefined;
        const rawId = (row.identificador || row.id) as string | undefined;

        if (!date || rawAmount === undefined) return null;

        // 1. Extração "Burra": Apenas converte para número e preserva o sinal que veio no arquivo
        let valorNum = typeof rawAmount === 'string' ? parseMoney(rawAmount) : Number(rawAmount);
        if (valorNum === 0 || isNaN(valorNum)) return null;

        const titleLower = (rawTitle || '').toLowerCase();
        const nomeFormatado = formatarNome(rawTitle || 'Transação Nubank');

        // 2. Delegação Semântica: Sugere o tipo para o Service baseando-se no texto
        let tipo = '';
        if (titleLower.includes('pagamento de fatura') || titleLower.includes('pagamento recebido')) {
            tipo = 'Pagamento de Fatura';
        } else if (titleLower.includes('estorno') || titleLower.includes('reembolso')) {
            tipo = 'Estorno/Reembolso';
        }

        // 3. Identificador Forte vs Genérico
        // Se o banco enviou o ID (Conta Corrente), blindamos a transação com ele.
        // Se não houver ID (alguns arquivos de Cartão de Crédito antigos), delegamos a heurística pro Service com a tag 'generic'.
        let identificador = rawId 
          ? `nubank-${rawId.toString().trim()}`
          : `generic-nubank-${index}`;

        // Extrai dados de parcelamento se houver (ex: "Compra X - Parcela 1/10")
        let parcelaInfo: { atual: number; total: number } | undefined;
        const matchParcela = rawTitle?.match(/(?:Parcela\s+)?(\d+)\/(\d+)/i);
        if (matchParcela) {
          parcelaInfo = { atual: parseInt(matchParcela[1], 10), total: parseInt(matchParcela[2], 10) };
        }

        return {
          data: date,
          nome: nomeFormatado,
          valor: valorNum,
          identificador,
          tipo,
          parcela: parcelaInfo
        } as ParsedRow;
      })
      .filter((item): item is ParsedRow => item !== null);
  }
}