// src/services/parsers/GenericParser.ts
import { parseMoney, gerarFingerprint } from '../../utils/helpers';
import { formatarNome } from '../../utils/formatters';
import type { IBankParser, ParsedRow } from './types';

export class GenericParser implements IBankParser {
  preProcessText(rawText: string): string {
    if (rawText.includes("RELEASE_DATE")) {
        return rawText.substring(rawText.indexOf("RELEASE_DATE"));
    }
    if (rawText.includes("Data Lançamento")) {
        return rawText.substring(rawText.indexOf("Data Lançamento"));
    }
    return rawText;
  }

  parse(rows: Record<string, unknown>[], _accountId: string, _cardId?: string): ParsedRow[] {
    return rows
      .map((row, index) => {
        const dateKey = Object.keys(row).find((key) => /date|data|data_lancamento|release_date/i.test(key));
        const amountKey = Object.keys(row).find((key) => /amount|valor|value|net_amount/i.test(key));
        const descKey = Object.keys(row).find((key) => /description|descricao|title|nome|transaction_type/i.test(key));

        if (!dateKey || !amountKey) return null;

        let dataValue = row[dateKey] as string | undefined;
        const amountValue = row[amountKey] as string | number | undefined;
        const descValue = descKey ? (row[descKey] as string | undefined) : undefined;

        if (!dataValue || !amountValue) return null;

        dataValue = dataValue.split(' ')[0];
        dataValue = dataValue.replace(/-/g, '/');

        let valor = typeof amountValue === 'string' ? parseMoney(amountValue) : amountValue;
        const nome = formatarNome(descValue || 'Transação');

        return {
          data: dataValue,
          nome,
          valor,
          identificador: gerarFingerprint('generic', dataValue, valor, nome, index),
          tipo: valor > 0 ? 'Receita' : 'Despesa',
        } as ParsedRow;
      })
      .filter((item): item is ParsedRow => item !== null);
  }
}