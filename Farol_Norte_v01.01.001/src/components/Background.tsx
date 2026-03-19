// src/components/Background.tsx
import React, { ReactNode } from 'react';

interface BackgroundProps {
    children: ReactNode;
}

export default function Background({ children }: BackgroundProps) {
  return (
    <>
      <div className="farol-background-container">
        {/* O SVG desenha o nosso cenário com matemática (pesa 0 bytes!) */}
        <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="farol-svg">
          <defs>
            {/* O degrade da luz do farol (amarelo para transparente) */}
            <linearGradient id="beamGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(242, 183, 5, 0.4)" />
              <stop offset="60%" stopColor="rgba(242, 183, 5, 0.1)" />
              <stop offset="100%" stopColor="rgba(242, 183, 5, 0)" />
            </linearGradient>
          </defs>

          {/* 1. Estrelas bem sutis ao fundo */}
          <circle cx="150" cy="100" r="1.5" fill="#FFF" opacity="0.3" />
          <circle cx="450" cy="200" r="1" fill="#FFF" opacity="0.5" />
          <circle cx="850" cy="150" r="2" fill="#FFF" opacity="0.8" />
          <circle cx="700" cy="80" r="1" fill="#FFF" opacity="0.4" />
          <circle cx="250" cy="250" r="2" fill="#FFF" opacity="0.2" />
          <circle cx="950" cy="250" r="1.5" fill="#FFF" opacity="0.6" />

          {/* 2. As Montanhas ao longe (O Porto / Continente) */}
          <path d="M 0 420 Q 150 380 300 430 T 700 400 T 1000 440 L 1000 600 L 0 600 Z" fill="#08141F" />
          <path d="M 0 460 Q 250 440 500 480 T 1000 450 L 1000 600 L 0 600 Z" fill="#06101A" />

          {/* 3. O Mar / Água */}
          <rect x="0" y="520" width="1000" height="80" fill="#040A10" opacity="0.8" />
          
          {/* Reflexos Sutis na Água */}
          <rect x="830" y="530" width="40" height="2" fill="#F2B705" opacity="0.2" />
          <rect x="840" y="540" width="20" height="2" fill="#F2B705" opacity="0.1" />

          {/* 4. A Ilha/Penhasco do Farol (À Direita) */}
          <path d="M 720 520 Q 770 450 850 450 Q 930 450 980 520 Z" fill="#03080D" />

          {/* 5. A Estrutura do Farol */}
          <path d="M 830 460 L 850 460 L 850 520 L 830 520 Z" fill="#0A1520" />
          <path d="M 835 440 L 845 440 L 845 460 L 835 460 Z" fill="#1C2833" />
          
          {/* A Lâmpada Acesa */}
          <circle cx="840" cy="445" r="4" fill="#F2B705" opacity="0.9" />

          {/* 6. O Feixe de Luz (com animação CSS no index.css) */}
          <polygon 
            points="840,445 0,380 0,510" 
            fill="url(#beamGradient)" 
            style={{ 
              animation: 'farol-spin 10s infinite linear',
              transformOrigin: '840px 445px'
            }} 
          />
        </svg>
      </div>

      {/* O React injeta o resto do sistema (AppContent) aqui */}
      {children}
    </>
  );
}