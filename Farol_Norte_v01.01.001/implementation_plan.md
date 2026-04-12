# Phase 1: Setup Supabase e Banco de Dados (RLS)

O objetivo desta fase é inicializar a infraestrutura local do Supabase via CLI, criar a migração `.sql` estruturando as tabelas num modelo relacional (Normalização Estrita, conforme D-01) e aplicar as regras RLS.

## User Review Required

> [!WARNING]
> Mudar o modelo de dados de LocalStorage (onde Categorias eram strings puras, p. ex.) para um banco de dados **Estritamente Normalizado** significa que precisaremos criar IDs reais (UUIDs) para cada entidade e conectá-las adequadamente.
> O modelo a seguir será a fundação da aplicação. Por favor, revise se as tabelas e tipagens estão de acordo com sua visão, em especial as chaves estrangeiras.

## Proposed Changes

### Database Schema (Supabase Migrations)

A migração inicial `00000000000000_init_schema.sql` definirá o seguinte modelo:

**1. users (Supabase Auth)**
- Já fornecida nativamente pelo Supabase (`auth.users`).

**2. accounts**
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES `auth.users(id) ON DELETE CASCADE`
- `nome` TEXT
- `bank` TEXT
- `status` TEXT (enum: 'active', 'archived')
- *Unique Constraint*: (`user_id`, `nome`)

**3. credit_cards**
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES `auth.users(id) ON DELETE CASCADE`
- `account_id` UUID REFERENCES `accounts(id) ON DELETE CASCADE`
- `nome` TEXT
- `limit` NUMERIC(12,2)
- `closing_day` INTEGER
- `due_day` INTEGER
- `status` TEXT (enum: 'active', 'archived')

**4. categories**
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES `auth.users(id) ON DELETE CASCADE`
- `nome` TEXT
- `cor` TEXT
- `natureza` TEXT
- `relevancia` TEXT
- `tipo` TEXT
- *Unique Constraint*: (`user_id`, `nome`)

**5. transactions**
- `id` UUID PRIMARY KEY 
  *(Nota: no código atual usa 'identificador' em texto, mas UUID nativo do Postgres é melhor, faremos parse na migration client se necessário).*
- `user_id` UUID REFERENCES `auth.users(id) ON DELETE CASCADE`
- `account_id` UUID REFERENCES `accounts(id) ON DELETE CASCADE`
- `card_id` UUID REFERENCES `credit_cards(id) ON DELETE CASCADE` (Pode ser nulo)
- `category_id` UUID REFERENCES `categories(id) ON DELETE SET NULL`
- `data_vencimento` DATE
- `data_pagamento` DATE
- `data` DATE NOT NULL
- `valor` NUMERIC(12,2) NOT NULL
- `nome` TEXT NOT NULL
- `tipo` TEXT -- (receita, despesa, transferencia)
- `status` TEXT
- `tipo_lancamento` TEXT -- (conta, cartao, etc)
- `parcela_atual` INTEGER
- `parcela_total` INTEGER
- `fatura_links` JSONB -- Para links flexiveis
- `split` JSONB -- Para multiplas categorias no rateio
- `conciliado` BOOLEAN DEFAULT false
- `ignorar_no_fluxo` BOOLEAN DEFAULT false

**6. categorization_rules**
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES `auth.users(id) ON DELETE CASCADE`
- `term` TEXT
- `category_id` UUID REFERENCES `categories(id) ON DELETE CASCADE`

**7. budgets**
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES `auth.users(id) ON DELETE CASCADE`
- `category_id` UUID REFERENCES `categories(id) ON DELETE CASCADE`
- `limit_amount` NUMERIC(12,2)

### Row Level Security (RLS)

- Habilitar RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) em **todas** as tabelas.
- Criar rotina padronizada que permite `SELECT`, `INSERT`, `UPDATE`, `DELETE` somente onde `user_id = auth.uid()`.

### Infraestrutura 

- Executar `supabase init`.
- Linkar ao projeto remoto (se você tiver o token de acesso).
- Commit das pastas `supabase/migrations/*`.

## Open Questions

> [!IMPORTANT]
> 1. No TypeScript atual `identificador` das transações e dos DataServices era string gerada no front-end. Ao normalizar para Postgres, recomendo usar `UUID DEFAULT gen_random_uuid()` como chave primária, e no Frontend o `identificador` vira `id`. Isso exige uma pequena refatoração no front. De acordo?
> 2. O `category` no schema original era texto. Sugeri mudar o vínculo em `transactions`, `budgets` e `categorization_rules` para usar o `category_id` (UUID), amarrando por Foreign Keys via `ON DELETE CASCADE`. Isso obriga a criar a categoria no DB na primeira sincronização onboarding em vez de texto solto. Faz sentido na sua regra de negócio?

## Verification Plan

### Automated Tests
- Executaremos comandos de verificação ou usaremos queries de validação após `supabase start` para mockar `auth.uid()` num DB local e tentar acessar dados de outro usuário.

### Manual Verification
- Injeção via `psql` para constatar que as políticas RLS rejeitam ações cruzadas.
