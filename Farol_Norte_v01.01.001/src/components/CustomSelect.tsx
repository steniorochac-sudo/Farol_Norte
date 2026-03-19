// src/components/CustomSelect.tsx
import React, { useState, useRef, useEffect } from 'react';

// 1. Tipagem exata das opções que o Select recebe
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

// 2. Tipagem das Props do Componente
interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    className?: string;
    textColor?: string;
}

export default function CustomSelect({ 
    value, 
    onChange, 
    options, 
    className = "", 
    textColor = "text-light" 
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isDropUp, setIsDropUp] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fecha o menu se clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // event.target precisa do cast para Node no TypeScript
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
            const menuEstimatedHeight = 250;

            if (spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow) {
                setIsDropUp(true);
            } else {
                setIsDropUp(false);
            }
        }
        setIsOpen(!isOpen);
    };

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    const handleSelect = (val: string) => {
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
                <i className={`bi bi-chevron-${isOpen ? (isDropUp ? 'down' : 'up') : 'down'} text-muted`} style={{ fontSize: '0.8rem' }}></i>
            </div>

            {isOpen && (
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