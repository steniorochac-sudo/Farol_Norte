/**
 * helpers.ts - Funções utilitárias gerais
 */

/**
 * Gera um UUID aleatório
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Converte data em formato BR (DD/MM/YYYY) para objeto Date
 * Retorna null se inválida
 */
export function parseDateBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  const parts = dateStr.split('/')
  if (parts.length !== 3) return null

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  const date = new Date(year, month - 1, day)

  // Validação: verifica se a data criada corresponde aos valores
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null
  }

  return date
}

/**
 * Limpa descrição removendo espaços extras
 */
export function cleanDescription(desc: string | null | undefined): string {
  if (!desc) return 'Sem descrição'
  return desc.trim().replace(/\s+/g, ' ')
}

/**
 * Calcula ID da fatura (YYYY-MM) baseado na data (DD/MM/YYYY)
 */
export function calcularIdFatura(dataStr: string | null | undefined): string {
  if (!dataStr) return ''
  const parts = dataStr.split('/')
  if (parts.length !== 3) return dataStr
  return `${parts[2]}-${parts[1]}`
}

/**
 * Parse de valores monetários
 * Detecta automaticamente se é BR (1.234,56) ou US (1,234.56)
 * @param valueStr - String contendo o valor (pode ter R$, espaços, etc)
 * @returns Número parseado ou 0 se inválido
 */
export function parseMoney(valueStr: string | number | null | undefined): number {
  if (!valueStr) return 0

  let clean = valueStr.toString().trim().replace(/[R$\s]/g, '')

  // Trata valores negativos com "-" no final
  if (clean.endsWith('-')) {
    clean = '-' + clean.slice(0, -1)
  }

  // Detecta formato BR vs US
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',')
    const lastDot = clean.lastIndexOf('.')

    if (lastComma > lastDot) {
      // BR: 1.234,56
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      // US: 1,234.56
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    // Assumir BR: 1,99
    clean = clean.replace(',', '.')
  }

  const finalValue = parseFloat(clean)
  return isNaN(finalValue) ? 0 : finalValue
}

/**
 * Gera fingerprint único para evitar duplicatas de transações
 * @param banco - Tipo de banco (ex: 'nubank', 'inter')
 * @param data - Data da transação (DD/MM/YYYY)
 * @param valor - Valor da transação
 * @param descricao - Descrição da transação
 * @param indexOriginal - Índice original (para casos iguais)
 * @returns Hash único
 */
export function gerarFingerprint(
  banco: string,
  data: string,
  valor: number,
  descricao: string,
  indexOriginal: number = 0
): string {
  const descLimpa = (descricao || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const dataLimpa = (data || '').replace(/[^0-9]/g, '')
  const valorLimpo = Math.round(parseFloat(valor.toString()) * 100)
  return `${banco}-${dataLimpa}-${valorLimpo}-${descLimpa}-${indexOriginal}`
}
