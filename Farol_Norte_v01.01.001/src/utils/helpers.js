// src/utils/helpers.js

// Gera ID único (caso você não tenha)
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Converte data BR (DD/MM/YYYY) para objeto Date
export function parseDateBR(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 2100) return null;

    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
        return null;
    }

    return date;
}

// Limpa descrição (remove excesso de espaços)
export function cleanDescription(desc) {
  if (!desc) return "Sem descrição";
  return desc.trim().replace(/\s+/g, " ");
}

// Calcula ID da fatura (YYYY-MM) baseado na data da compra
export function calcularIdFatura(dataStr) {
  if (!dataStr) return "";
  const parts = dataStr.split("/");
  if (parts.length !== 3) return dataStr; 
  return `${parts[2]}-${parts[1]}`;
}

// Detecta se é 1.234,56 (BR) ou 1,234.56 (US)
export function parseMoney(valueStr) {
  if (!valueStr) return 0;

  let clean = valueStr.toString().trim().replace(/[R$\s]/g, "");

  if (clean.endsWith("-")) {
    clean = "-" + clean.slice(0, -1);
  }

  if (clean.includes(",") && clean.includes(".")) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");

    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  }

  const finalValue = parseFloat(clean);
  return isNaN(finalValue) ? 0 : finalValue;
}

// Gera ID único para evitar duplicatas
export function gerarFingerprint(banco, data, valor, descricao, indexOriginal = 0) {
    const descLimpa = (descricao || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const dataLimpa = (data || '').replace(/[^0-9]/g, '');
    const valorLimpo = Math.round(parseFloat(valor) * 100); 
    return `${banco}-${dataLimpa}-${valorLimpo}-${descLimpa}-${indexOriginal}`;
}