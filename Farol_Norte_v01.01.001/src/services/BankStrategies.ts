// src/services/BankStrategies.ts
import type { IBankParser, ParsedRow } from './parsers/types';
import { GenericParser } from './parsers/GenericParser';
import { NubankParser } from './parsers/NubankParser.ts';
import { InterParser } from './parsers/InterParser';
import { MercadoPagoParser } from './parsers/MercadoPagoParser';

// Re-exporta as interfaces para os componentes que já consumiam daqui (como o ImportModal)
export type { IBankParser, ParsedRow };

export const BANK_STRATEGIES: Record<string, { label: string, parser: IBankParser }> = {
  generic: { label: 'Genérico (CSV Padrão)', parser: new GenericParser() },
  nubank: { label: 'Nubank (CSV)', parser: new NubankParser() },
  inter: { label: 'Banco Inter (CSV/PDF)', parser: new InterParser() },
  mercado_pago: { label: 'Mercado Pago (CSV)', parser: new MercadoPagoParser() },
};

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