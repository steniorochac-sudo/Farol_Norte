# 📂 Estrutura de Diretórios (Farol Norte)

Abaixo está o mapeamento conceitual inferido da organização dos arquivos e pastas do projeto para manter a escalabilidade do código frontend:

```text
farol-norte/
├── public/                 # Assets estáticos, workers (como o pdf.worker.min.mjs) e ícones.
├── src/
│   ├── components/         # Componentes React reutilizáveis de UI (Botões, Modais, Cards, Gráficos).
│   ├── context/            # Armazena a Context API (FinanceContext.tsx), provedora do estado global.
│   ├── hooks/              # Custom React Hooks (ex: abstrações para usar o contexto ou lidar com forms).
│   ├── pages/              # Componentes de nível de página (Dashboard, Lançamentos, Configurações).
│   ├── services/           # Lógica de persistência e comunicação (DataService.ts, parsers).
│   ├── utils/              # Funções utilitárias puras (formatação de moeda, datas, geradores de ID).
│   ├── types/              # Arquivos `.d.ts` ou `.ts` com definições de interfaces e tipos TypeScript.
│   ├── App.tsx             # Componente raiz que estrutura os Providers e Rotas.
│   └── main.tsx            # Ponto de entrada do Vite (renderização no DOM).
├── index.html              # Template principal carregado pelo Vite.
├── package.json            # Gerenciamento de dependências (React, Chart.js, Vite, Bootstrap, etc.).
└── tsconfig.json           # Configurações do compilador TypeScript.
```

## Notas sobre a Estrutura
* **Separação de Preocupações:** A estrutura tenta isolar claramente a renderização (UI - `components`/`pages`) da lógica de negócios e estado (`context`/`services`).
* **Domain-driven Lite:** Dentro de `services` ou `types`, os arquivos geralmente seguem o domínio do negócio (ex: `TransactionService`, `CategoryTypes`, `BudgetRules`).