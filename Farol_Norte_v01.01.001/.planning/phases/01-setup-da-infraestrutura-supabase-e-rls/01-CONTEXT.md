# Phase 1: Setup da Infraestrutura Supabase e RLS - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Criar o projeto no Supabase (via Supabase CLI local), preparar as tabelas com um modelo relacional normalizado (foreign keys, ON DELETE CASCADE) com base no sistema atual, e habilitar regras de segurança RLS (Row Level Security) garantindo o isolamento multi-tenant simples.

</domain>

<decisions>
## Implementation Decisions

### Abordagem do Schema DB
- **D-01:** Adicionar Normalização Estrita no banco de dados, estabelecendo Foreign Keys reais do PostgreSQL (ex: `ON DELETE CASCADE`) refletindo as relações entre accounts, cards, transactions e categories.

### Setup do Supabase
- **D-02:** Utilizar o Supabase CLI localmente. Toda a estrutura do banco (migrations) deve ficar na pasta `supabase/migrations`, para garantir Infraestrutura como Código (IaC) versionada no Git.

### Estratégia do Multi-tenant (RLS)
- **D-03:** Multi-tenant via Vínculo Direto Simples. Toda tabela de domínio principal (ex: accounts, transactions) terá uma coluna `user_id` e a política de RLS fará a checagem direta `user_id = auth.uid()`. Sem uso de tabela de `tenants` por enquanto.

### the agent's Discretion
- Nomenclatura das migrations SQL e organização exata das chaves nas políticas RLS do Supabase (embora as REQ DB-01 a DB-04 prevejam permissões totais sobre os próprios dados do usuário).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Especificação Original
- `.planning/PROJECT.md` — Requisitos do projeto com o escopo global.
- `.planning/REQUIREMENTS.md` — Especificidade das Features do DB e RLS (DB-01 a DB-04).
- `.planning/codebase/ARCHITECTURE.md` — Entendimento do cenário atual local para espelhamento inteligente.

</canonical_refs>

<specifics>
## Specific Ideas

- Tabelas mapeadas: `transactions`, `accounts`, `cards`, `categories`.
- Foreign Keys: `transactions` pertencem a `accounts` (e opcionalmente `cards` ou `categories`), onde a conta pertence ao `user_id`. O `ON DELETE CASCADE` entre esses nós facilita remoção da conta.
- Garantir que a migração inicial CLI gere um banco funcional para testes locais (`supabase start`).
</specifics>

<deferred>
## Deferred Ideas

- Criação de interface visual de Autenticação (Phase 2).
- Adaptação do `src/services/DataService.ts` e sync real (Phase 3).
- Contas Família/Multi-usuários no mesmo Tenant (foi escolhido o Vínculo Direto Simples nesta v1).
</deferred>

---

*Phase: 01-setup-da-infraestrutura-supabase-e-rls*
*Context gathered: 2026-04-12*
