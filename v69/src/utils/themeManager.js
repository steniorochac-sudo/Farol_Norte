// src/utils/themeManager.js

export const THEMES = {
    farol: {
        id: 'farol',
        name: 'Farol Norte',
        icon: '🌊',
        colors: {
            '--app-bg': '#0A1826',
            '--surface-bg': 'rgba(11, 30, 45, 0.65)',
            '--surface-border': 'rgba(232, 237, 242, 0.1)',
            '--text-main': '#E8EDF2',
            '--text-muted': '#9BA8B4',
            '--farol-glow': '#F2B705',
            '--btn-close-filter': 'none' // Mantém o X branco normal
        }
    },
    light: {
        id: 'light',
        name: 'Café da Manhã',
        icon: '☕',
        colors: {
            '--app-bg': '#F4F0EB',
            '--surface-bg': 'rgba(255, 255, 255, 0.65)',
            '--surface-border': 'rgba(0, 0, 0, 0.08)',
            '--text-main': '#2C2825',
            '--text-muted': '#7A726A',
            '--farol-glow': '#E66B35',
            '--btn-close-filter': 'invert(1)' // Transforma o X branco em preto
        }
    },
    cyber: {
        id: 'cyber',
        name: 'Neon City',
        icon: '🌃',
        colors: {
            '--app-bg': '#0B0514',
            '--surface-bg': 'rgba(23, 10, 40, 0.65)',
            '--surface-border': 'rgba(255, 0, 128, 0.25)',
            '--text-main': '#F2E8FA',
            '--text-muted': '#A18EBD',
            '--farol-glow': '#00FFCC',
            '--btn-close-filter': 'none'
        }
    },
    nature: {
        id: 'nature',
        name: 'Floresta',
        icon: '🍃',
        colors: {
            '--app-bg': '#19241C',
            '--surface-bg': 'rgba(33, 46, 36, 0.65)',
            '--surface-border': 'rgba(150, 180, 160, 0.15)',
            '--text-main': '#E3ECE6',
            '--text-muted': '#8BA896',
            '--farol-glow': '#E69950',
            '--btn-close-filter': 'none'
        }
    }
};

export function applyTheme(themeId) {
    const theme = THEMES[themeId] || THEMES['farol'];
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
    localStorage.setItem('app_theme', themeId);
}

export function loadSavedTheme() {
    const saved = localStorage.getItem('app_theme') || 'farol';
    applyTheme(saved);
}

// ==========================================
// REPOSITÓRIO DE BACKGROUNDS (CENAS VETORIAIS)
// ==========================================
export const BACKGROUNDS = {
    classic: {
        id: 'classic',
        name: 'Farol Clássico',
        icon: '🌊',
        desc: 'O farol à direita vigiando o porto.'
    },
    sunset: {
        id: 'sunset',
        name: 'Pôr do Sol',
        icon: '🌅',
        desc: 'O farol à esquerda num fim de tarde.'
    },
    foggy: {
        id: 'foggy',
        name: 'Noite de Névoa',
        icon: '🌫️',
        desc: 'O farol entre nuvens sob a luz do luar.'
    },
    cyberpunk: {
        id: 'cyberpunk',
        name: 'Metrópole Neon',
        icon: '🏙️',
        desc: 'Cidade cyberpunk com farol à esquerda.'
    }
};
// ... (mantenha as funções applyBackground e getSavedBackground intactas abaixo)
// Funções para gerir a mudança de fundo sem recarregar a página
export function applyBackground(bgId) {
    const safeBg = BACKGROUNDS[bgId] ? bgId : 'farol';
    localStorage.setItem('app_background', safeBg);
    // Dispara um alarme sonoro (evento) para que o nosso componente React ouça e troque a imagem na hora
    window.dispatchEvent(new Event('backgroundChanged'));
}

export function getSavedBackground() {
    return localStorage.getItem('app_background') || 'farol';
}