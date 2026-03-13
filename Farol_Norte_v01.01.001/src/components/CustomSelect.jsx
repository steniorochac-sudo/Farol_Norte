// src/components/CustomSelect.jsx
import React, { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, className = "", textColor = "text-light" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDropUp, setIsDropUp] = useState(false); // NOVO: Controla a direção
    const dropdownRef = useRef(null);

    // Fecha o menu se clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Função inteligente que calcula o espaço antes de abrir
    const toggleOpen = () => {
        if (!isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuEstimatedHeight = 250; // Altura máxima do nosso menu no CSS

            // Se o espaço abaixo for menor que o menu E houver mais espaço em cima, abre para cima!
            if (spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow) {
                setIsDropUp(true);
            } else {
                setIsDropUp(false);
            }
        }
        setIsOpen(!isOpen);
    };

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className={`custom-select-wrapper ${className}`} ref={dropdownRef}>
            <div 
                className={`custom-select-trigger ${isOpen ? 'active' : ''} ${textColor}`}
                onClick={toggleOpen}
            >
                <span className="text-truncate me-2">{selectedOption?.label}</span>
                {/* O ícone inverte dependendo da direção que abriu */}
                <i className={`bi bi-chevron-${isOpen ? (isDropUp ? 'down' : 'up') : 'down'} text-muted`} style={{ fontSize: '0.8rem' }}></i>
            </div>

            {isOpen && (
                // Adicionamos a classe "drop-up" dinamicamente
                <div className={`custom-select-menu theme-surface shadow-lg border-secondary border-opacity-50 ${isDropUp ? 'drop-up' : ''}`}>
                    {options.map((opt, index) => {
                        if (opt.disabled && opt.label === '---') {
                            return <hr key={`sep-${index}`} className="border-secondary border-opacity-25 my-1" />;
                        }
                        if (opt.disabled) {
                            return <div key={`dis-${index}`} className="px-3 py-1 text-muted small fw-bold text-uppercase">{opt.label}</div>;
                        }

                        return (
                            <div 
                                key={opt.value} 
                                className={`custom-select-item ${value === opt.value ? 'selected fw-bold' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                {opt.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}