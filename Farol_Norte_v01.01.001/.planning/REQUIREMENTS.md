# Requirements

## Active

### Database & Auth Infra
- [ ] **DB-01**: Setup Supabase Project (PostgreSQL database and Auth).
- [ ] **DB-02**: Criar esquema de banco de dados (tabelas para transactions, accounts, cards, categories).
- [ ] **DB-03**: Habilitar RLS (Row Level Security) em todas as tabelas.
- [ ] **DB-04**: Criar políticas de RLS garantindo que usuários (onde `user_id = auth.uid()`) só possam fazer SELECT, INSERT, UPDATE e DELETE nos seus próprios registros.

### Autenticação UI
- [ ] **AUTH-01**: Criar tela de "Login" (E-mail / Senha).
- [ ] **AUTH-02**: Criar tela de "Cadastro / Criar Conta".
- [ ] **AUTH-03**: Criar fluxo/tela de "Recuperação de Senha" (Esqueci minha senha).
- [ ] **AUTH-04**: Proteger rotas internas da aplicação (redirecionar para login caso o usuário tente acessar rotas protegidas e não esteja autenticado... *nota: o acesso offline Freemium pode afetar essa regra, a validar*).

### Refatoração de Dados (Migração Local -> Cloud)
- [ ] **MIG-01**: Atualizar `DataService.ts` para converter operações síncronas do localStorage para chamadas assíncronas do cliente Supabase (`@supabase/supabase-js`).
- [ ] **MIG-02**: Sincronização de Onboarding: Ao criar conta ou no primeiro login, ler todas as coleções de `localStorage`.
- [ ] **MIG-03**: Fazer UPSERT / Bulk INSERT dos dados lidos do `localStorage` para as tabelas correspondentes no Supabase.
- [ ] **MIG-04**: Limpar o `localStorage` (deleção dos dados locais) imediatamente após a confirmação de sucesso do Bulk Insert no Supabase, adotando a nuvem como fonte única da verdade.

## Out of Scope
- Configuração de login social (Google, Apple, etc.) neste primeiro momento.
- Refazer o layout / componentes visuais (o objetivo é manter a interface existente).

## Traceability
*This section maps requirements to roadmap phases and tracks completion status.*

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DB-01 | Phase 1 | Not Started |
| DB-02 | Phase 1 | Not Started |
| DB-03 | Phase 1 | Not Started |
| DB-04 | Phase 1 | Not Started |
| AUTH-01 | Phase 2 | Not Started |
| AUTH-02 | Phase 2 | Not Started |
| AUTH-03 | Phase 2 | Not Started |
| AUTH-04 | Phase 2 | Not Started |
| MIG-01 | Phase 3 | Not Started |
| MIG-02 | Phase 3 | Not Started |
| MIG-03 | Phase 3 | Not Started |
| MIG-04 | Phase 3 | Not Started |
