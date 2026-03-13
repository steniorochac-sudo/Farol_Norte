export function formatCurrency(val, symbol = true) {
    // Converte para número. Se for null/undefined/texto inválido, vira 0
    const num = Number(val) || 0; 
    
    return num.toLocaleString('pt-BR', { 
        style: symbol ? 'currency' : 'decimal', 
        currency: 'BRL', 
        minimumFractionDigits: 2 
    });
}

export function formatDate(dateString) {
    // Aceita YYYY-MM-DD e retorna DD/MM/YYYY
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
}

export function formatMonth(monthStr) {
    // Ex: "2025-01" -> "Janeiro/2025"
    if (!monthStr) return '';
    const [ano, mes] = monthStr.split('-');
    const date = new Date(ano, mes - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

// Padroniza nomes (Ex: "POSTO IPIRANGA" -> "Posto Ipiranga")
export function formatarNome(str) {
    if (!str) return "Sem descrição";
    return str.toString()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}