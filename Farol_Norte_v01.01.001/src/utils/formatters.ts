/**
 * formatters.ts - Funções de formatação para exibição
 */

/**
 * Formata valor monetário para exibição em pt-BR
 * @param val - Valor numérico
 * @param symbol - Se deve incluir símbolo de moeda (default: true)
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(val: number | string | null | undefined, symbol = true): string {
  // Converte para número. Se for null/undefined/texto inválido, vira 0
  const num = Number(val) || 0

  return num.toLocaleString('pt-BR', {
    style: symbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/**
 * Formata data de YYYY-MM-DD para DD/MM/YYYY
 * @param dateString - Data em formato ISO (YYYY-MM-DD)
 * @returns Data formatada em pt-BR
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const parts = dateString.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateString
}

/**
 * Formata mês (YYYY-MM) para exibição legível
 * @param monthStr - Mês em formato YYYY-MM
 * @returns Mês formatado (ex: "Janeiro/2025")
 */
export function formatMonth(monthStr: string | null | undefined): string {
  if (!monthStr) return ''
  const [ano, mes] = monthStr.split('-')
  const date = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1)
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

/**
 * Formata nome/descrição para Title Case
 * Exemplo: "POSTO IPIRANGA" -> "Posto Ipiranga"
 * @param str - String a formatar
 * @returns String formatada
 */
export function formatarNome(str: string | null | undefined): string {
  if (!str) return 'Sem descrição'
  return str
    .toString()
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
