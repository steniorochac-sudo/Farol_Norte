import { JSX, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import Background from './components/Background'

import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import CreditCards from './pages/CreditCards'
import Categories from './pages/Categories'
import Budget from './pages/Budget'
import Dre from './pages/Dre'
import Settings from './pages/Settings'

function AppContent(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const closeMenu = (): void => setIsMenuOpen(false)
  const location = useLocation()

  const getPageTitle = (): string => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard'
      case '/transacoes':
        return 'Transações'
      case '/contas':
        return 'Contas'
      case '/cartoes':
        return 'Cartões'
      case '/categorias':
        return 'Categorias e Regras'
      case '/orcamentos':
        return 'Orçamentos'
      case '/configuracoes':
        return 'Configurações'
      case '/dre':
        return 'DRE'
      default:
        return 'Farol Norte'
    }
  }

  return (
    <div className="d-flex flex-column h-100 position-relative z-10">
      
      {/* HEADER MOBILE (Apenas telas pequenas) */}
      <div className="d-md-none theme-surface border-bottom border-secondary border-opacity-25 px-4 py-3 d-flex justify-content-between align-items-center shadow-sm position-sticky top-0" style={{ zIndex: 1040 }}>
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-compass-fill fs-3 text-warning"></i>
          <h5 className="mb-0 fw-bold text-light ls-1">{getPageTitle()}</h5>
        </div>
      </div>

      <div className="d-flex flex-grow-1 overflow-hidden">
        
        {/* === SIDEBAR DESKTOP === */}
        <div className="d-none d-md-flex flex-column theme-surface h-100 border-end border-secondary border-opacity-25 shadow-lg position-relative z-100" style={{ width: '280px', transition: 'all 0.3s ease' }}>
          
          <div className="p-4 d-flex align-items-center gap-3 border-bottom border-secondary border-opacity-25">
            <i className="bi bi-compass-fill fs-1 text-warning drop-shadow-warning"></i>
            <div>
              <h4 className="mb-0 fw-bold text-light ls-1">FAROL NORTE</h4>
              <small className="text-warning text-micro fw-bold text-uppercase tracking-wider">React Edition</small>
            </div>
          </div>

          <nav className="flex-grow-1 p-3 mt-2" style={{ overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div className="text-muted text-micro fw-bold text-uppercase mb-3 px-3 ls-1">Visão Geral</div>
            
            <NavLink to="/" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-speedometer2 fs-5"></i>
              </div>
              Dashboard
            </NavLink>

            <NavLink to="/transacoes" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/transacoes' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-arrow-left-right fs-5"></i>
              </div>
              Transações
            </NavLink>

            <div className="text-muted text-micro fw-bold text-uppercase mb-3 mt-4 px-3 ls-1">Gestão</div>

            <NavLink to="/contas" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/contas' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-bank2 fs-5"></i>
              </div>
              Contas
            </NavLink>

            <NavLink to="/cartoes" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/cartoes' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-credit-card-2-front fs-5"></i>
              </div>
              Cartões
            </NavLink>

            <NavLink to="/orcamentos" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/orcamentos' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-bullseye fs-5"></i>
              </div>
              Orçamentos
            </NavLink>

            <NavLink to="/dre" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/dre' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-funnel-fill fs-5"></i>
              </div>
              DRE Pessoal
            </NavLink>

            <div className="text-muted text-micro fw-bold text-uppercase mb-3 mt-4 px-3 ls-1">Sistema</div>

            <NavLink to="/categorias" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-warning text-dark fw-bold shadow-sm' : 'text-light hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/categorias' ? 'bg-dark bg-opacity-10' : 'bg-white bg-opacity-10'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-robot fs-5 text-info"></i>
              </div>
              Categorias
            </NavLink>

            <NavLink to="/configuracoes" className={({ isActive }) => `nav-link mb-2 p-3 radius-12 d-flex align-items-center transition-all ${isActive ? 'bg-danger text-white fw-bold shadow-sm' : 'text-danger hover-opacity'}`}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${location.pathname === '/configuracoes' ? 'bg-dark bg-opacity-10' : 'bg-danger bg-opacity-10 border border-danger border-opacity-25'}`} style={{ width: '36px', height: '36px' }}>
                <i className="bi bi-gear-fill fs-5"></i>
              </div>
              Configurações
            </NavLink>

          </nav>
        </div>

        {/* ÁREA PRINCIPAL (ONDE AS PÁGINAS RENDERIZAM) */}
        <div className="flex-grow-1 overflow-auto position-relative z-1" id="main-scroll-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transacoes" element={<Transactions />} />
            <Route path="/contas" element={<Accounts />} />
            <Route path="/cartoes" element={<CreditCards />} />
            <Route path="/categorias" element={<Categories />} />
            <Route path="/orcamentos" element={<Budget />} />
            <Route path="/dre" element={<Dre />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Routes>
        </div>

      </div>

      {/* === BOTTOM NAV MOBILE === */}
      <div className="d-md-none position-fixed bottom-0 w-100 theme-surface border-top border-secondary border-opacity-50 d-flex justify-content-around align-items-center pb-2 pt-2 px-1" style={{ zIndex: 1050, height: '70px' }}>
        
        {/* Lado Esquerdo (2 itens) */}
        <NavLink to="/" className={({ isActive }) => `nav-link d-flex flex-column align-items-center justify-content-center ${isActive ? 'text-warning fw-bold' : 'text-light opacity-75'}`} style={{ minWidth: '50px', flex: 1 }}>
          <i className="bi bi-speedometer2 fs-4 mb-1 line-height-1"></i>
          <span className="text-micro">Painel</span>
        </NavLink>
        
        <NavLink to="/transacoes" className={({ isActive }) => `nav-link d-flex flex-column align-items-center justify-content-center ${isActive ? 'text-warning fw-bold' : 'text-light opacity-75'}`} style={{ minWidth: '50px', flex: 1 }}>
          <i className="bi bi-arrow-left-right fs-4 mb-1 line-height-1"></i>
          <span className="text-micro">Trans.</span>
        </NavLink>

        {/* Botão Central Flutuante (Menu) */}
        <div className="nav-link d-flex flex-column align-items-center justify-content-center position-relative" style={{ minWidth: '70px', marginTop: '-30px' }} onClick={() => setIsMenuOpen(true)}>
          <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center shadow-lg hover-scale" style={{ width: '56px', height: '56px', border: '4px solid var(--farol-bg)' }}>
            <i className="bi bi-list fs-1"></i>
          </div>
        </div>

        {/* Lado Direito (2 itens) */}
        <NavLink to="/contas" className={({ isActive }) => `nav-link d-flex flex-column align-items-center justify-content-center ${isActive ? 'text-warning fw-bold' : 'text-light opacity-75'}`} style={{ minWidth: '50px', flex: 1 }}>
          <i className="bi bi-bank2 fs-4 mb-1 line-height-1"></i>
          <span className="text-micro">Contas</span>
        </NavLink>

        <NavLink to="/dre" className={({ isActive }) => `nav-link d-flex flex-column align-items-center justify-content-center ${isActive ? 'text-warning fw-bold' : 'text-light opacity-75'}`} style={{ minWidth: '50px', flex: 1 }}>
          <i className="bi bi-funnel-fill fs-4 mb-1 line-height-1"></i>
          <span className="text-micro">DRE</span>
        </NavLink>

      </div>

      {/* === OFFCANVAS MENU MOBILE === */}
      {isMenuOpen && (
        <div className="d-md-none position-fixed top-0 start-0 w-100 h-100 fade-in" style={{ zIndex: 1060 }}>
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-black bg-opacity-75 backdrop-blur" onClick={closeMenu}></div>
          <div className="position-absolute bottom-0 start-0 w-100 theme-surface radius-top-24 slide-up overflow-hidden" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            
            <div className="p-4 border-bottom border-secondary theme-surface border-opacity-25 d-flex justify-content-between align-items-center bg-white bg-opacity-5">
              <div className="d-flex align-items-center gap-3">
                <i className="bi bi-compass-fill fs-1 text-warning drop-shadow-warning"></i>
                <div>
                  <h4 className="mb-0 fw-bold text-light ls-1">FAROL NORTE</h4>
                  <small className="text-warning text-micro fw-bold text-uppercase tracking-wider">Menu Principal</small>
                </div>
              </div>
              <button className="btn btn-outline-light border-0 rounded-circle" onClick={closeMenu} style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="list-group list-group-flush overflow-auto">
              <Link to="/" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-speedometer2 text-warning fs-5"></i>
                </div>
                Dashboard Resumo
              </Link>
              <Link to="/transacoes" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-arrow-left-right text-warning fs-5"></i>
                </div>
                Gestão de Transações
              </Link>
              <Link to="/contas" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-bank2 text-warning fs-5"></i>
                </div>
                Minhas Contas
              </Link>
              <Link to="/cartoes" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-credit-card-2-front text-warning fs-5"></i>
                </div>
                Meus Cartões
              </Link>
              <Link to="/orcamentos" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-bullseye text-warning fs-5"></i>
                </div>
                Metas & Orçamentos
              </Link>
              <Link to="/dre" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-funnel-fill text-warning fs-5"></i>
                </div>
                DRE Pessoal
              </Link>
              <Link to="/categorias" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-light hover-opacity">
                <div className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <i className="bi bi-robot text-info fs-5"></i>
                </div>
                Categorias & Automações
              </Link>
              <Link to="/configuracoes" onClick={closeMenu} className="list-group-item bg-transparent border-secondary border-opacity-25 list-group-item-action py-4 fs-6 d-flex align-items-center fw-bold text-danger hover-opacity">
                <div className="rounded-circle bg-danger bg-opacity-10 border border-danger border-opacity-25 d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-gear-fill text-danger fs-5"></i>
                </div>
                Configurações do Sistema
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Background>
        <AppContent />
      </Background>
    </BrowserRouter>
  )
}