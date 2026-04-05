# 🔌 Integrações e Fluxo de Arquivos

O **Farol Norte** foi concebido como uma aplicação segura e de uso estritamente local. Portanto, **não há comunicação com APIs externas ou backends remotos** para sincronização de dados no uso diário. Toda a "integração" é feita através da importação e exportação de arquivos pelo usuário.

## 1. Processamento de Dados Bancários
A aplicação possui parsers customizados e dedicados para lidar com extratos e faturas de diferentes instituições.

* **Banco Inter:** 
  * Suporta arquivos **CSV** (extrato de conta).
  * Suporta arquivos **PDF** (fatura de cartão de crédito, processada localmente via PDF.js através de Regex para extrair a data, descrição e valor).
* **Nubank:** Suporta extratos no formato **CSV**.
* **Mercado Pago:** Suporta extratos no formato **CSV**.
* **OFX/Genérico:** Há suporte para um parser genérico para planilhas CSV padronizadas e mapeamento de OFX.

## 2. Automação e Regras (Smart Categorization)
* Ao importar arquivos, a aplicação roda um motor de **Regras de Categorização** (`categorization_rules`), que associa automaticamente descrições contendo termos específicos ("netflix", "ifood", etc.) a categorias predefinidas.

## 3. Mecanismos de Backup e Salvaguarda
Como os dados residem apenas no `localStorage` do navegador, o sistema depende de exportações manuais:
* **Exportação (Nuvem Local):** Gera um dump de todas as chaves do banco de dados em um arquivo `.json`.
* **Restauração (Import):** Lê um arquivo `.json` carregado pelo usuário, substituindo o estado atual do `localStorage`.

## 4. Auditoria e Relatórios
* Exportação do log completo de transações, rateios (splits) e status de reconciliação em formato **CSV** (`relatorio_financeiro_YYYY-MM-DD.csv`), compatível com Excel e Google Sheets.