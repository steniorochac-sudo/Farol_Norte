// src/services/parsers/types.ts

export interface ParsedRow {
  data: string;
  nome: string;
  valor: number;
  identificador: string;
  tipo: string;
  parcela?: { atual: number; total: number };
  categoria?: string;
  card_id?: string;
  account_id?: string;
  tipoLancamento?: 'conta' | 'cartao';
  status?: string;
  ignorarNoFluxo?: boolean;
}

export interface IBankParser {
  preProcessText?(rawText: string): string; 
  parse(rows: Record<string, unknown>[], accountId: string, cardId?: string): ParsedRow[];
  parsePDF?(arrayBuffer: ArrayBuffer, targetId: string): Promise<ParsedRow[]>;
}