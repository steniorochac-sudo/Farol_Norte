// MercadoPagoParser.ts// src/services/parsers/MercadoPagoParser.ts
import { parseMoney, gerarFingerprint } from '../../utils/helpers';
import { formatarNome } from '../../utils/formatters';
import type { IBankParser, ParsedRow } from './types';

export class MercadoPagoParser implements IBankParser {
  preProcessText(rawText: string): string {
    if (rawText.includes("RELEASE_DATE")) {
        return rawText.substring(rawText.indexOf("RELEASE_DATE"));
    }
    return rawText;
  }

  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows.map((row, index) => {
        let dataStr = row['release_date'] as string | undefined;
        
        if (dataStr) {
            dataStr = dataStr.split(' ')[0];
            dataStr = dataStr.replace(/-/g, '/');
        }

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