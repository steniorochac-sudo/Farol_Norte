✦ Os comandos GSD (Get Stuff Done) são orquestradores especializados que automatizam fluxos de trabalho complexos no Gemini CLI. Aqui estão os principais comandos e suas funções:

  Gerenciamento de Projetos e Milestones
   * /gsd-new-project: Inicia um novo projeto do zero. Ele coordena a pesquisa de domínio, define o roadmap, mapeia requisitos e estabelece os critérios de sucesso.
   * /gsd-new-milestone: Cria um novo marco (milestone) dentro de um projeto existente, planejando as fases necessárias para alcançá-lo.

  Planejamento e Execução de Fases
   * /gsd-plan-phase: Realiza a pesquisa técnica e cria um plano de execução detalhado (PLAN.md) para uma fase específica, incluindo análise de riscos e modelo de ameaças.
   * /gsd-execute-plan: Inicia a execução automatizada de um plano aprovado. Ele realiza commits atômicos, gerencia checkpoints e lida com desvios no processo.

  Interface e Experiência do Usuário (UI/UX)
   * /gsd-ui-phase: Focado no desenvolvimento de frontend. Cria especificações de design (UI-SPEC.md) e valida contratos de design antes da implementação.
   * /gsd-ui-review: Realiza uma auditoria visual pós-implementação baseada em 6 pilares de qualidade, gerando um relatório de revisão (UI-REVIEW.md).

  Qualidade, Segurança e Depuração
   * /gsd-debug: Ativa um agente especializado em investigação científica de bugs. Ele reproduz a falha, isola a causa raiz e valida a correção.
   * /gsd-secure-phase: Verifica se as mitigações de segurança planejadas foram devidamente implementadas no código, gerando um relatório SECURITY.md.
   * /gsd-verify: Realiza uma análise "de trás para frente" para confirmar se o que foi entregue na fase realmente cumpre o objetivo final prometido, além de apenas completar tarefas.

  Utilitários de Mapeamento
   * /gsd-map-codebase: Explora e documenta a arquitetura, convenções, stack tecnológica e preocupações do projeto em arquivos Markdown estruturados.

  Cada um desses comandos invoca sub-agentes especialistas (como o gsd-planner, gsd-executor, gsd-debugger, etc.) para garantir que as tarefas sejam executadas com rigor técnico e consistência.