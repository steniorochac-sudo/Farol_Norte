# 💻 Tech Stack (Farol Norte)

## 1. Core Framework & Linguagem
* **Biblioteca Principal:** React (versão 18+, utilizando Hooks extensivamente como `useState`, `useEffect`, `useMemo` e Context API).
* **Linguagem:** TypeScript (`.tsx`, tipagem estrita para transações, categorias e regras).

## 2. Gerenciamento de Estado e Dados
* **Estado Global:** React Context API (`FinanceContext.tsx` atuando como a única fonte de verdade para transações, contas e categorias).
* **Persistência de Dados (Banco de Dados Local):** O sistema utiliza uma arquitetura *Offline-First* baseada em **`localStorage`**. Custom wrappers (`DataService`) lidam com coleções (`transactions`, `accounts`, `credit_cards`, `categories`, `categorization_rules`, `budgets`).
* **Cache e Otimização:** Uso de `useMemo` para evitar re-renders desnecessários e cálculos repetitivos pesados (como o DRE e os agrupamentos do Dashboard).

## 3. Estilização e UI
* **Framework CSS:** Bootstrap 5 (inferido pelo uso intenso de classes utilitárias como `container`, `row`, `col-md-6`, `btn-outline-warning`, etc.).
* **Ícones:** Bootstrap Icons (`bi bi-*`).
* **Estilos Customizados:** Classes utilitárias próprias do projeto para temas e animações (`theme-surface`, `fade-in`, `radius-12`, `hover-opacity`).

## 4. Bibliotecas de Terceiros e Utilitários
* **Gráficos (Data Visualization):** Chart.js (utilizado para gráficos de rosca, linha e evolução no `Dashboard` e `Categories`).
* **Processamento de PDF:** PDF.js (`pdf.worker.min.mjs`), usado para ler faturas de cartão de crédito no formato PDF (ex: Banco Inter) diretamente no frontend.
* **Parsing de CSV:** PapaParse (visível no bundle minificado para leitura rápida de extratos em CSV).

## 5. Build Tool & Bundler
* **Ferramenta de Build:** Vite (inferido pela estrutura de arquivos no build final `dist/assets/index-*.js` e padrão de chunking de módulos).