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
        const dateKey = Object.keys(row).find((key) => /date|data|lancamento|lançamento|release/i.test(key));
        const amountKey = Object.keys(row).find((key) => /amount|valor|value|net|saída|entrada/i.test(key));
        const descKey = Object.keys(row).find((key) => /description|descrição|descricao|title|nome|transaction|histórico|historico|estabelecimento|detalhe/i.test(key));

        if (!dateKey || !amountKey) return null;

        let dataValue = row[dateKey] as string | undefined;
        const amountValue = row[amountKey] as string | number | undefined;
        
        let descValue = descKey ? (row[descKey] as string | undefined) : Object.values(row).join(' - ');

        if (!dataValue || !amountValue) return null;

        // Apenas corta horários embutidos. DEIXA OS TRAÇOS INTACTOS.
        dataValue = dataValue.split(' ')[0]; 

        let valor = typeof amountValue === 'string' ? parseMoney(amountValue) : amountValue;
        const nome = formatarNome(descValue || 'Transação Indefinida');

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