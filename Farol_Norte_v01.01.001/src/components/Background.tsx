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
        <circle cx="850" cy="150" r="2" fill="#FFF" opacity="0.2" />
        <circle cx="700" cy="50" r="1" fill="#FFF" opacity="0.6" />
        <circle cx="200" cy="250" r="1.5" fill="#FFF" opacity="0.1" />

        {/* 2. Montanhas ao longe (O Porto / Continente) */}
        <path d="M 0 420 Q 150 380 300 430 T 700 400 T 1000 440 L 1000 600 L 0 600 Z" fill="#08141F" />
        <path d="M 0 460 Q 250 440 500 480 T 1000 450 L 1000 600 L 0 600 Z" fill="#06101A" />

        {/* 3. O Mar / Água */}
        <rect x="0" y="520" width="1000" height="80" fill="#040A10" opacity="0.8" />
        
        {/* Reflexos Sutis na Água */}
        <rect x="830" y="530" width="40" height="2" fill="#F2B705" opacity="0.2" />
        <rect x="840" y="540" width="20" height="2" fill="#F2B705" opacity="0.1" />

        {/* 4. A Ilha/Penhasco do Farol (À Direita) */}
        <path d="M 720 520 Q 770 450 850 450 Q 930 450 980 520 Z" fill="#040A10" />

        {/* 5. A Torre do Farol */}
        <path d="M 830 450 L 840 280 L 860 280 L 870 450 Z" fill="#03070B" /> {/* Corpo */}
        <rect x="835" y="270" width="30" height="10" fill="#1FA67A" opacity="0.8" /> {/* Base da Lanterna verde */}
        <rect x="840" y="255" width="20" height="15" fill="#F2B705" /> {/* Lâmpada Acesa */}
        <polygon points="835,255 865,255 850,240" fill="#03070B" /> {/* Teto */}

        {/* 6. O Feixe de Luz Giratório (Animado pelo CSS) */}
        <g className="light-beam">
          {/* O polígono desenha um feixe que sai da lâmpada e abre para a esquerda */}
          <polygon points="850,262 -200,50 -200,550" fill="url(#beamGradient)" style={{ mixBlendMode: 'screen' }} />
        </g>
      </svg>
    </div>

      {/* O React injeta o resto do sistema (AppContent) aqui */}
      {children}
    </>
  );
}