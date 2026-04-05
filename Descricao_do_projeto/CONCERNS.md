# ⚠️ Preocupações, Limites e Débitos Técnicos (Farol Norte)

Neste documento, listamos as principais limitações arquiteturais, riscos de segurança e potenciais gargalos de escalabilidade identificados no projeto.

## 1. Limitações de Armazenamento (Escalabilidade de Dados)
* **O Problema:** O `localStorage` do navegador possui um limite rígido de armazenamento (geralmente entre 5MB e 10MB por origem). Como todas as transações, regras, contas e configurações são armazenadas em JSON nesse espaço, usuários com histórico financeiro muito longo (múltiplos anos) acabarão atingindo essa cota de armazenamento, travando a aplicação.
* **Possível Solução:** Migrar a camada de persistência do `localStorage` para o **IndexedDB** (usando bibliotecas como `localForage` ou `Dexie.js`), que oferece limites de armazenamento muito maiores (centenas de megabytes ou até gigabytes) e operações assíncronas.

## 2. Risco Crítico de Perda de Dados
* **O Problema:** Sendo uma aplicação 100% *client-side*, a limpeza do cache do navegador, a desinstalação do browser ou o uso excessivo de limpadores de sistema (como CCleaner) apagarão permanentemente o banco de dados do usuário.
* **Possível Solução:** Reforçar os lembretes de backup na interface, criar uma opção de "Autosave" via integração com Google Drive/Dropbox, ou implementar um *Service Worker* para caching mais robusto, embora o backup manual continuará sendo a principal proteção.

## 3. Fragilidade dos Parsers de Importação (Manutenção)
* **O Problema:** A extração de dados de faturas em PDF (ex: Banco Inter) depende fortemente da biblioteca `pdf.js` acoplada a expressões regulares (Regex) rígidas. Se a instituição bancária alterar minimamente o layout ou o texto do extrato (ex: mudar "Total da Fatura" para "Valor Total"), a importação vai quebrar.
* **Possível Solução:** Criar uma interface para que o próprio usuário possa "ensinar" o sistema a ler novos layouts, ou manter testes unitários com amostras anonimizadas atualizadas com frequência.

## 4. Performance da Context API (Gargalo de Renderização)
* **O Problema:** A arquitetura atual utiliza o React Context para prover o estado de `transactions`. Se o array crescer para milhares de itens, qualquer inserção ou edição fará com que toda a árvore de componentes consumidora daquele contexto sofra *re-render*.
* **Possível Solução:** Adotar um gerenciador de estado atômico (como Zustand ou Jotai) ou fatiar o contexto (ex: separar contexto de regras do contexto de relatórios/totais) para mitigar quedas de framerate na UI.

## 5. Segurança e Privacidade
* **O Problema:** Os dados financeiros ficam guardados em *texto plano* (sem criptografia) dentro do `localStorage`. 
    1. Se outra pessoa usar o mesmo computador e perfil de navegador, terá acesso total aos dados.
    2. Uma vulnerabilidade de **XSS** (Cross-Site Scripting) seria catastrófica, permitindo que um script malicioso vazasse todo o histórico financeiro do usuário.
* **Possível Solução:** Criptografar as chaves no `localStorage` utilizando uma senha-mestra definida pelo usuário ao abrir o app (ex: `AES` via `CryptoJS`) e garantir que dependências do `package.json` sejam frequentemente auditadas contra injeção de código.