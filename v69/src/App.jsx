// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import Background from './components/Background.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import CreditCards from './pages/CreditCards.jsx';
import Categories from './pages/Categories.jsx';
import Budget from './pages/Budget.jsx';
import Dre from './pages/Dre.jsx';
import Settings from './pages/Settings.jsx';

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);
  const location = useLocation(); 

  const getPageTitle = () => {
    switch(location.pathname) {
      case '/': return 'Dashboard';
      case '/transacoes': return 'Transações';
      case '/contas': return 'Contas';
      case '/cartoes': return 'Cartões';
      case '/categorias': return 'Categorias e Regras';
      case '/orcamentos': return 'Orçamentos';
      case '/configuracoes': return 'Configurações';
      case '/dre': return 'DRE';
      default: return 'Farol Norte';
    }
  };

  return (
      // 1. AQUI FOI A CORREÇÃO: Removemos bg-light e forçamos o transparent
      <div className="d-flex flex-column h-100 w-100" style={{ background: 'transparent' }}>
        {/* Novo fundo figurativo animado */}
        <Background />
        
        {/* HEADER DESKTOP PREMIUM */}
        <nav className="navbar navbar-expand-md shadow-sm d-none d-md-flex flex-shrink-0 theme-surface border-bottom border-secondary border-opacity-25" style={{ borderRadius: 0, height: '70px' }}>
          <div className="container h-100">
            <span className="navbar-brand fw-bold text-light fs-4 d-flex align-items-center h-100">
              <i className="bi bi-brightness-high-fill me-2 text-warning" style={{ filter: 'drop-shadow(0 0 8px rgba(242,183,5,0.6))' }}></i> 
              Farol Norte
            </span>
            <div className="d-flex gap-4 align-items-center h-100">
              <NavLink to="/" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>Dashboard</NavLink>
              <NavLink to="/transacoes" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>Transações</NavLink>
              <NavLink to="/contas" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>Contas</NavLink>
              <NavLink to="/cartoes" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>Cartões</NavLink>
              <NavLink to="/orcamentos" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>Metas</NavLink>
              <NavLink to="/dre" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>DRE</NavLink>
              <NavLink to="/categorias" className={({isActive}) => `text-decoration-none nav-link-desktop ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}>Categorias</NavLink>
              <NavLink to="/configuracoes" className={({isActive}) => `text-decoration-none nav-link-desktop ms-2 ${isActive ? 'text-warning fw-bold active' : 'text-light opacity-75 hover-opacity'}`}><i className="bi bi-gear-fill fs-5"></i></NavLink>
              
            </div>
          </div>
        </nav>

        {/* HEADER MOBILE */}
        <header className="theme-surface text-light p-3 shadow-sm d-md-none d-flex justify-content-center align-items-center flex-shrink-0 z-3 border-bottom border-secondary border-opacity-25" style={{ borderRadius: 0 }}>
            <span className="fw-bold fs-5 tracking-wide">{getPageTitle()}</span>
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <main className="container-fluid container-md py-3 flex-grow-1 overflow-y-auto" style={{ background: 'transparent' }}>
          <Routes>
            {/* Suas rotas continuam aqui... */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/transacoes" element={<Transactions />} />
            <Route path="/contas" element={<Accounts />} />
            <Route path="/cartoes" element={<CreditCards />} />
            <Route path="/categorias" element={<Categories />} />
            <Route path="/orcamentos" element={<Budget />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/dre" element={<Dre />} />
          </Routes>
        </main>

        {/* BOTTOM NAVIGATION BAR MOBILE PREMIUM */}
        <nav className="glass-nav d-flex justify-content-around align-items-center d-md-none shadow-lg flex-shrink-0" style={{ height: '70px', zIndex: 1040, paddingBottom: '5px' }}>
            <NavLink to="/" onClick={closeMenu} className={({isActive}) => `d-flex flex-column align-items-center justify-content-center text-decoration-none w-100 h-100 ${isActive && !isMenuOpen ? 'mobile-nav-active fw-bold' : 'text-white-50'}`}>
                <i className="bi bi-house-door-fill fs-4 mb-1" style={{ lineHeight: 1 }}></i>
                <span style={{ fontSize: '0.65rem' }}>Início</span>
            </NavLink>
            
            <NavLink to="/transacoes" onClick={closeMenu} className={({isActive}) => `d-flex flex-column align-items-center justify-content-center text-decoration-none w-100 h-100 ${isActive && !isMenuOpen ? 'mobile-nav-active fw-bold' : 'text-white-50'}`}>
                <i className="bi bi-arrow-left-right fs-4 mb-1" style={{ lineHeight: 1 }}></i>
                <span style={{ fontSize: '0.65rem' }}>Extrato</span>
            </NavLink>
            
            <NavLink to="/contas" onClick={closeMenu} className={({isActive}) => `d-flex flex-column align-items-center justify-content-center text-decoration-none w-100 h-100 ${isActive && !isMenuOpen ? 'mobile-nav-active fw-bold' : 'text-white-50'}`}>
                <i className="bi bi-bank2 fs-4 mb-1" style={{ lineHeight: 1 }}></i>
                <span style={{ fontSize: '0.65rem' }}>Contas</span>
            </NavLink>

            <NavLink to="/orcamentos" onClick={closeMenu} className={({isActive}) => `d-flex flex-column align-items-center justify-content-center text-decoration-none w-100 h-100 ${isActive && !isMenuOpen ? 'mobile-nav-active fw-bold' : 'text-white-50'}`}>
                <i className="bi bi-bullseye fs-4 mb-1" style={{ lineHeight: 1 }}></i>
                <span style={{ fontSize: '0.65rem' }}>Metas</span>
            </NavLink>

            <div className={`d-flex flex-column align-items-center justify-content-center text-decoration-none w-100 h-100 cursor-pointer ${isMenuOpen ? 'mobile-nav-active fw-bold' : 'text-white-50'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <i className="bi bi-grid-fill fs-4 mb-1" style={{ lineHeight: 1 }}></i>
                <span style={{ fontSize: '0.65rem' }}>Menu</span>
            </div>
        </nav>

        {/* OVERLAY DE MENU MOBILE (Agora escuro e transparente) */}
        {isMenuOpen && (
            <div className="position-fixed top-0 start-0 w-100 h-100 theme-surface d-md-none fade-in d-flex flex-column" style={{ zIndex: 1050, borderRadius: 0 }}>
                <div className="border-bottom border-secondary border-opacity-25 text-light p-3 shadow-sm d-flex justify-content-between align-items-center flex-shrink-0">
                    <span className="fw-bold fs-5">Menu</span>
                    <button className="btn btn-sm btn-outline-light border-0" onClick={closeMenu}><i className="bi bi-x-lg fs-5"></i></button>
                </div>
                <div className="p-4 flex-grow-1 overflow-y-auto">
                    <div className="list-group list-group-flush border-top border-bottom border-secondary border-opacity-25 bg-transparent">
                        <Link to="/cartoes" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                            <div className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)'}}><i className="bi bi-credit-card text-warning fs-5"></i></div>
                            Meus Cartões de Crédito
                        </Link>
                        <Link to="/categorias" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                            <div className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)'}}><i className="bi bi-robot text-info fs-5"></i></div>
                            Categorias & Automações
                        </Link>
                        <Link to="/configuracoes" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-danger hover-opacity">
                            <div className="rounded-circle bg-danger bg-opacity-10 border border-danger border-opacity-25 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{width: '40px', height: '40px'}}><i className="bi bi-gear-fill text-danger fs-5"></i></div>
                            Configurações do Sistema
                        </Link>
                    </div>
                </div>
            </div>
        )}

      </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}