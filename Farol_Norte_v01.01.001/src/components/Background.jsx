// src/components/Background.jsx
import React, { useState, useEffect } from 'react';
import { getSavedBackground } from '../utils/themeManager';

export default function Background() {
    const [currentBg, setCurrentBg] = useState(getSavedBackground());

    useEffect(() => {
        const handleBgChange = () => setCurrentBg(getSavedBackground());
        window.addEventListener('backgroundChanged', handleBgChange);
        return () => window.removeEventListener('backgroundChanged', handleBgChange);
    }, []);

    return (
        <div className="farol-background-container">
            {/* 1. CENA: FAROL CLÁSSICO (DIREITA) */}
            {currentBg === 'classic' && (
                <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="farol-svg fade-in">
                    <defs>
                        <linearGradient id="beamClassic" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--farol-glow)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--farol-glow)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Montanhas */}
                    <path d="M 0 420 Q 150 380 300 430 T 700 400 T 1000 440 L 1000 600 L 0 600 Z" fill="var(--text-main)" opacity="0.03" />
                    <path d="M 0 460 Q 250 440 500 480 T 1000 450 L 1000 600 L 0 600 Z" fill="var(--text-main)" opacity="0.06" />
                    {/* Mar */}
                    <rect x="0" y="520" width="1000" height="80" fill="var(--text-main)" opacity="0.1" />
                    <rect x="830" y="530" width="40" height="2" fill="var(--farol-glow)" opacity="0.3" />
                    {/* Ilha e Farol à Direita */}
                    <path d="M 720 520 Q 770 450 850 450 Q 930 450 980 520 Z" fill="var(--text-main)" opacity="0.15" />
                    <path d="M 830 450 L 840 280 L 860 280 L 870 450 Z" fill="var(--text-main)" opacity="0.2" /> 
                    <rect x="835" y="270" width="30" height="10" fill="var(--surface-bg)" /> 
                    <rect x="840" y="255" width="20" height="15" fill="var(--farol-glow)" /> 
                    <polygon points="835,255 865,255 850,240" fill="var(--text-main)" opacity="0.3" /> 
                    {/* Luz Animada */}
                    <g className="light-beam-rotate">
                        <polygon points="850,262 -200,50 -200,550" fill="url(#beamClassic)" style={{ mixBlendMode: 'screen' }} />
                    </g>
                </svg>
            )}

            {/* 2. CENA: PÔR DO SOL (ESQUERDA) */}
            {currentBg === 'sunset' && (
                <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="farol-svg fade-in">
                    <defs>
                        <linearGradient id="beamSunset" x1="1" y1="0" x2="0" y2="0">
                            <stop offset="0%" stopColor="var(--farol-glow)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--farol-glow)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Sol gigante à direita */}
                    <circle cx="850" cy="400" r="120" fill="var(--farol-glow)" opacity="0.15" />
                    <circle cx="850" cy="400" r="80" fill="var(--farol-glow)" opacity="0.3" />
                    {/* Mar calmo */}
                    <rect x="0" y="480" width="1000" height="120" fill="var(--text-main)" opacity="0.05" />
                    <rect x="750" y="490" width="200" height="4" fill="var(--farol-glow)" opacity="0.2" />
                    <rect x="780" y="510" width="140" height="4" fill="var(--farol-glow)" opacity="0.15" />
                    {/* Ilha e Farol à Esquerda */}
                    <path d="M 20 480 Q 70 400 150 400 Q 230 400 280 480 Z" fill="var(--text-main)" opacity="0.12" />
                    <path d="M 130 400 L 140 230 L 160 230 L 170 400 Z" fill="var(--text-main)" opacity="0.2" /> 
                    <rect x="140" y="215" width="20" height="15" fill="var(--farol-glow)" /> 
                    <polygon points="135,215 165,215 150,200" fill="var(--text-main)" opacity="0.3" /> 
                    {/* Luz Animada invertida */}
                    <g className="light-beam-rotate-reverse">
                        <polygon points="150,222 1200,50 1200,550" fill="url(#beamSunset)" style={{ mixBlendMode: 'screen' }} />
                    </g>
                </svg>
            )}

            {/* 3. CENA: NOITE DE NÉVOA (CENTRO) */}
            {currentBg === 'foggy' && (
                <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="farol-svg fade-in">
                    <defs>
                        <radialGradient id="moonGlow">
                            <stop offset="0%" stopColor="var(--text-main)" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="var(--text-main)" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    {/* Lua no centro */}
                    <circle cx="500" cy="200" r="100" fill="url(#moonGlow)" />
                    <circle cx="500" cy="200" r="40" fill="var(--text-main)" opacity="0.8" />
                    {/* Penhasco central */}
                    <path d="M 400 600 L 450 450 L 550 450 L 600 600 Z" fill="var(--text-main)" opacity="0.1" />
                    {/* Farol Central */}
                    <path d="M 480 450 L 490 300 L 510 300 L 520 450 Z" fill="var(--text-main)" opacity="0.2" />
                    <rect x="490" y="285" width="20" height="15" fill="var(--farol-glow)" opacity="0.8" /> 
                    <polygon points="485,285 515,285 500,270" fill="var(--text-main)" opacity="0.4" /> 
                    {/* Nuvens / Névoa passando na frente (Animadas) */}
                    <g className="cloud-drift">
                        <path d="M -200 500 Q 100 450 300 520 T 800 480 T 1200 550 L 1200 600 L -200 600 Z" fill="var(--surface-bg)" opacity="0.7" />
                        <path d="M -200 550 Q 200 500 500 560 T 1000 520 T 1200 600 L -200 600 Z" fill="var(--app-bg)" opacity="0.9" />
                    </g>
                </svg>
            )}

            {/* CENA: CYBERPUNK (ESQUERDA) */}
            {currentBg === 'cyberpunk' && (
                <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="farol-svg fade-in">
                    <defs>
                        <linearGradient id="grad-sky-cyber" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--app-bg)" />
                            <stop offset="100%" stopColor="var(--surface-bg)" />
                        </linearGradient>
                        <radialGradient id="farol-glow-rad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="var(--farol-glow)" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="var(--farol-glow)" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* 1. Céu e Estrelas */}
                    <rect width="1000" height="600" fill="url(#grad-sky-cyber)" />
                    <circle cx="200" cy="150" r="1" fill="var(--farol-glow)" opacity="0.8" />
                    <circle cx="800" cy="120" r="1" fill="var(--farol-glow)" opacity="0.6" />

                    {/* 2. Montanhas ao Fundo */}
                    <path d="M0 450 L150 320 L300 450 L500 280 L750 450 L1000 350 L1000 600 L0 600 Z" fill="var(--text-main)" opacity="0.05" />

                    {/* 3. Skyline Cyberpunk */}
                    <g opacity="0.1" fill="var(--text-main)">
                        <rect x="500" y="350" width="40" height="250" />
                        <rect x="550" y="300" width="60" height="300" />
                        <rect x="680" y="250" width="50" height="350" />
                        <rect x="850" y="200" width="40" height="400" />
                    </g>

                    {/* 4. Janelas (Glow) */}
                    <g fill="var(--farol-glow)" opacity="0.3">
                        <rect x="565" y="320" width="10" height="10" />
                        <rect x="695" y="270" width="10" height="10" />
                        <rect x="865" y="230" width="10" height="10" />
                    </g>

                    {/* 5. Água / Reflexo */}
                    <rect x="0" y="520" width="1000" height="80" fill="var(--surface-bg)" opacity="0.4" />

                    {/* 6. O Farol (Lado Esquerdo) */}
                    <g transform="translate(100, 550)">
                        <path d="M-40 0 L-25 -250 L25 -250 L40 0 Z" fill="var(--text-main)" opacity="0.8" />
                        <path d="M-30 -250 L-30 -270 Q0 -300 30 -270 L30 -250 Z" fill="var(--text-main)" />
                        <circle cx="0" cy="-275" r="15" fill="var(--farol-glow)" className="light-beam-pulse" />
                        <g className="light-beam-rotate-reverse">
                            <path d="M0 -275 L400 -350 L400 -200 Z" fill="url(#farol-glow-rad)" opacity="0.4" />
                        </g>
                    </g>

                    {/* 7. Névoa Frontal */}
                    <rect x="0" y="550" width="1000" height="50" fill="var(--app-bg)" opacity="0.3" className="cloud-drift" />
                </svg>
              )}
                        
        </div>
    );
}