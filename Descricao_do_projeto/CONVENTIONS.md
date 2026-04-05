# 📏 Convenções de Código (Farol Norte)

A base de código do Farol Norte segue convenções modernas do ecossistema React e TypeScript para garantir legibilidade, manutenção e previsibilidade.

## 1. Padrões de Nomenclatura
* **Componentes e Páginas:** `PascalCase` (ex: `Dashboard.tsx`, `TransactionModal.tsx`).
* **Arquivos Utilitários e Hooks:** `camelCase` (ex: `useFinance.ts`, `formatCurrency.ts`).
* **Tipagens e Interfaces:** `PascalCase`, preferencialmente sem prefixos redundantes como "I" (ex: `Transaction`, não `ITransaction`).
* **Constantes Globais:** `UPPER_SNAKE_CASE` para valores fixos (ex: `LOCAL_STORAGE_KEY`).

## 2. Padrões de Componentes (React)
* **Componentes Funcionais:** Uso exclusivo de *Functional Components* com *Hooks*.
* **Desestruturação:** Props são desestruturadas logo na assinatura do componente para facilitar a leitura.
* **Memoização (Performance):** Uso criterioso de `useMemo` para listas filtradas e cálculos matemáticos pesados (ex: agregações do DRE), e `useCallback` para funções passadas como propriedades em listas longas.

## 3. Padrões de Estilização
* **Utility-First (Bootstrap 5):** A estilização prioriza o uso das classes utilitárias do Bootstrap (ex: `d-flex`, `align-items-center`, `mb-3`) diretamente no JSX.
* **CSS Customizado Reduzido:** Estilos globais ou customizados (`theme-surface`, etc.) são mantidos em arquivos CSS mínimos apenas quando o Bootstrap não atende à necessidade específica de UI/UX.

## 4. Tratamento de Estado
* **Global vs Local:** O estado global (Context API) é reservado estritamente para dados de domínio que afetam múltiplas telas (Transações, Categorias, Contas).
* **Estados de UI:** Modais abertos, abas ativas e valores de formulários não submetidos são mantidos no estado local (`useState`) do próprio componente.

## 5. Tipagem e TypeScript
* **Strict Mode:** TypeScript configurado em modo estrito.
* **Evitar `any`:** Proibido o uso de `any` para entidades de negócios; respostas de parsers de arquivos devem ser validadas e tipadas o mais rápido possível no fluxo de importação.
* **Enums/Union Types:** Uso de *Union Types* (`'INCOME' | 'EXPENSE'`) ou enums para garantir consistência em status e tipos de transação.