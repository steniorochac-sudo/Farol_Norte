# 🏛 Arquitetura (Farol Norte)

## 1. Visão Geral
O **Farol Norte** segue uma arquitetura **Client-Side SPA (Single Page Application)** com o paradigma **Offline-First**. Não há servidor de backend (Node.js, Python, etc.) nem banco de dados em nuvem (como PostgreSQL ou Firebase) no fluxo de execução padrão. Todo o processamento de dados, lógica de negócios e persistência ocorrem inteiramente no navegador do usuário.

## 2. Padrão de Fluxo de Dados (Data Flow)
A arquitetura de dados segue um fluxo unidirecional simplificado e centralizado:

1. **Interface do Usuário (UI):** Componentes React interagem com o usuário (formulários, botões de importação, dashboards).
2. **State Management (Context API):** O `FinanceContext` recebe as ações da UI, aplica as regras de negócio em memória e atualiza os estados do React (`transactions`, `categories`, etc.).
3. **Camada de Serviço (DataService):** O `FinanceContext` repassa as alterações para wrappers de serviço dedicados, que se encarregam de estruturar as chaves.
4. **Persistência (Local Storage):** O `DataService` serializa os dados (JSON) e comita diretamente na Storage API do navegador (`window.localStorage`).

## 3. Principais Módulos do Sistema

### A. Motor de Importação e Parsing (Ingestion Engine)
* Responsável por converter arquivos raw (CSV, PDF) em objetos transacionais padronizados.
* Utiliza bibliotecas de terceiros (`pdf.js`, `PapaParse`) instanciadas diretamente no client-side.

### B. Motor de Regras e Categorização (Smart Engine)
* Um interceptador de fluxo que, ao adicionar uma nova transação ou concluir um parsing, varre as descrições em busca de padrões (Regex/Substrings) definidos pelo usuário (`categorization_rules`), atribuindo a categoria correta antes de salvar no contexto global.

### C. Agregação e Relatórios (Reporting)
* O cálculo de totais (Receitas, Despesas, DRE, Filtros de Data) não possui queries otimizadas de banco de dados.
* **Solução arquitetural:** Aplicação de Hooks de memoização (`useMemo`) do React, garantindo que grandes arrays de transações só sejam recalculados quando as dependências (lista de transações, período selecionado) forem efetivamente alteradas.

## 4. Segurança e Privacidade
* **Zero-Knowledge Backend:** A privacidade é nativa pela própria arquitetura. A ausência de sincronização online garante que nenhum dado financeiro sensível deixe a máquina do usuário.
* A responsabilidade de **Disaster Recovery** é repassada ao usuário através da necessidade de backups manuais em `.json`.