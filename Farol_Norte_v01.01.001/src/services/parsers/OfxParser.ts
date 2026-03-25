// src/services/parsers/OfxParser.ts
import { formatarNome } from '../../utils/formatters';
import { gerarFingerprint } from '../../utils/helpers';
import type { ParsedRow } from './types';

export class OfxParser {
    parseRawText(rawText: string, accountId: string, cardId?: string): ParsedRow[] {
        const transactions: ParsedRow[] = [];
        
        const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;
        let index = 0;

        while ((match = trnRegex.exec(rawText)) !== null) {
            const block = match[1];

            const dtMatch = block.match(/<DTPOSTED>\s*(\d{8})/i);
            const amtMatch = block.match(/<TRNAMT>\s*([\-\d\.,]+)/i);
            const memoMatch = block.match(/<MEMO>\s*(.*?)(\r|\n|<|$)/i);
            const nameMatch = block.match(/<NAME>\s*(.*?)(\r|\n|<|$)/i);

            if (!dtMatch || !amtMatch) continue;

            const rawDate = dtMatch[1];
            const dataFormatada = `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}/${rawDate.substring(0, 4)}`;

            const valorStr = amtMatch[1].replace(',', '.');
            const valor = parseFloat(valorStr);
            if (valor === 0 || isNaN(valor)) continue;

            let descricaoRaw = 'Transação OFX';
            if (memoMatch && memoMatch[1].trim()) {
                descricaoRaw = memoMatch[1].trim();
            } else if (nameMatch && nameMatch[1].trim()) {
                descricaoRaw = nameMatch[1].trim();
            }
            
            const nomeFormatado = formatarNome(descricaoRaw);

            // CORREÇÃO: Assinatura alinhada com o motor CSV ('generic') e usando o valor cru para manter a integridade
            const identificador = gerarFingerprint('generic', dataFormatada, valor, nomeFormatado, index);

            transactions.push({
                data: dataFormatada,
                nome: nomeFormatado,
                valor: valor,
                identificador,
                tipo: valor > 0 ? 'Receita' : 'Despesa',
                account_id: accountId,
                card_id: cardId
            } as ParsedRow);

            index++;
        }

        return transactions;
    }
}