# 🧪 Estratégia de Testes (Farol Norte)

Considerando a arquitetura sensível e *offline-first* do sistema (onde erros de lógica corrompem o banco local do usuário), a estratégia de garantia de qualidade (QA) foca na confiabilidade das funções puras de manipulação de dados.

## 1. Testes Unitários (Lógica de Negócios e Parsers)
* **Alvo Principal:** Funções utilitárias (ex: formatação de moeda, cálculo de datas) e, criticamente, os **Parsers de Importação** (`pdf.js`, processamento de CSV).
* **Ferramentas Recomendadas:** Vitest ou Jest.
* **Padrão:** Garantir que diferentes formatos de extrato bancário (Inter, Nubank) sempre resultem no mesmo objeto transacional (`Transaction`), independentemente de variações no layout do banco.

## 2. Testes de Componentes (UI)
* **Alvo Principal:** Componentes de interação complexa, como o modal de adição de transações e a aplicação de regras de categorização.
* **Ferramentas Recomendadas:** React Testing Library.
* **Padrão:** Testar o comportamento a partir da perspectiva do usuário (ex: "Se eu preencher X e clicar em Salvar, a transação deve aparecer na lista").

## 3. Testes End-to-End (E2E)
* **Alvo Principal:** O fluxo crítico de negócio (Importar arquivo -> Validar Regras -> Checar Dashboard -> Exportar Backup).
* **Ferramentas Recomendadas:** Cypress ou Playwright.
* **Padrão:** Validar a persistência correta no `localStorage` após interações de alto nível.

## 4. Validação Manual e Ambiente de Desenvolvimento
* Testes contínuos com arquivos anonimizados de CSV/PDF para garantir que quebras de regex não ocorram silenciosamente.
* O `React.StrictMode` fica habilitado no ambiente de desenvolvimento para detectar side-effects acidentais nos reducers ou context providers.