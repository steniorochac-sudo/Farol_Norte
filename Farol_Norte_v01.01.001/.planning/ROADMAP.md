# Project Roadmap

This document outlines the phased execution plan for the [Farol Norte] current milestone. Phases are designed to be shipped iteratively, with each phase delivering a cohesive slice of functionality.

## Overall Progress

- Total Phases: 3
- Completed Phases: 0
- Current Phase: None (Not Started)

## Phase 1: Setup da Infraestrutura Supabase e RLS
**Goal:** Criar o projeto no Supabase, preparar as tabelas e habilitar as regras de segurança RLS baseadas em `auth.uid()`.
**Depends on:** None
**Status:** Not Started

### Requirements
- **DB-01**: Setup Supabase Project (PostgreSQL database and Auth).
- **DB-02**: Criar esquema de banco de dados (tabelas para transactions, accounts, cards, categories).
- **DB-03**: Habilitar RLS (Row Level Security) em todas as tabelas.
- **DB-04**: Criar políticas de RLS garantindo que usuários...

### Success Criteria
- O projeto Supabase deve existir e os endpoints/API Keys devem estar disponíveis.
- Tabelas de domínio mapeadas no PostgreSQL e regras de proteção RLS 100% cobrindo CRUD por User ID.

---

## Phase 2: Interface e Fluxo de Autenticação
**Goal:** Construir as telas de Login, Cadastro e Recuperação de senha conectadas ao Supabase Auth, preparando o gateway de acesso para o usuário SaaS.
**Depends on:** Phase 1
**Status:** Not Started

### Requirements
- **AUTH-01**: Tela de "Login"
- **AUTH-02**: Tela de "Cadastro / Criar Conta"
- **AUTH-03**: Fluxo/Tela de "Recuperação de Senha"
- **AUTH-04**: Proteger rotas internas da aplicação para garantir usuário logado.

### Success Criteria
- O usuário consegue criar uma conta nova e fazer login com sucesso.
- O token JWT constará na sessão do navegador após login.
- O fluxo de esqueci minha senha envia e-mail de recuperação.

---

## Phase 3: Adaptação do DataService e Sincronização Local (Onboarding)
**Goal:** Substituir o uso direto de LocalStorage pelo cliente Supabase no DataService e aplicar a lógica de leitura do legado local -> Upsert no PG -> Deleção do legado ao cadastrar a conta SaaS.
**Depends on:** Phase 1, Phase 2
**Status:** Not Started

### Requirements
- **MIG-01**: Atualizar `DataService.ts`
- **MIG-02**: Sincronização de Onboarding (Leitura)
- **MIG-03**: Bulk Insert/Upsert Supabase
- **MIG-04**: Wipe LocalStorage após confirmação de sucesso

### Success Criteria
- O código da aplicação realiza chamadas REST assíncronas via client do supabase-js ao invés de usar `localStorage.setItem`.
- O registro local antigo é perfeitamente espelhado na nuvem no momento em que um usuário "Free/offline" cria seu cadastro SaaS, sem duplicações ou perdas.
