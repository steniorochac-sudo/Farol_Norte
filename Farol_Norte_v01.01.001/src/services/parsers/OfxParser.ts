// src/services/parsers/OfxParser.ts
import { formatarNome } from '../../utils/formatters';
import { gerarFingerprint } from '../../utils/helpers';
import type { ParsedRow } from './types';

export class OfxParser {
    parseRawText(rawText: string, accountId: string, cardId?: string): ParsedRow[] {
        const transactions: ParsedRow[] = [];
        
        // Isola todas as transações (tudo que estiver entre <STMTTRN> e </STMTTRN>)
        const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
        let match;
        let index = 0;

        while ((match = trnRegex.exec(rawText)) !== null) {
            const block = match[1];

            // Extração via RegEx focada apenas nas tags obrigatórias
            const dtMatch = block.match(/<DTPOSTED>(\d{8})/);
            const amtMatch = block.match(/<TRNAMT>([\-\d\.]+)/);
            const memoMatch = block.match(/<MEMO>(.*?)(\r|\n|<|$)/);
            const nameMatch = block.match(/<NAME>(.*?)(\r|\n|<|$)/); // Alguns bancos usam NAME em vez de MEMO

            if (!dtMatch || !amtMatch) continue;

            // Converte a data OFX (YYYYMMDD) para o nosso padrão BR (DD/MM/YYYY)
            const rawDate = dtMatch[1];
            const dataFormatada = `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}/${rawDate.substring(0, 4)}`;

            const valor = parseFloat(amtMatch[1]);
            if (valor === 0) continue;

            // Busca o nome e limpa a string
            let descricaoRaw = 'Transação OFX';
            if (memoMatch && memoMatch[1].trim()) descricaoRaw = memoMatch[1];
            else if (nameMatch && nameMatch[1].trim()) descricaoRaw = nameMatch[1];
            
            const nomeFormatado = formatarNome(descricaoRaw);

            // Geração de Fingerprint Híbrido (Garante colisão de duplicatas mesmo misturando OFX e CSV)
            const identificador = gerarFingerprint('hibrido', dataFormatada, Math.abs(valor), nomeFormatado, index);

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