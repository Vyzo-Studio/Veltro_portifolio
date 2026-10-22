# GNG BARBEARIA — Relatório de implementação e QA V4
**Data:** 22/10/2026 (horário de Brasília)  
**Projeto:** https://github.com/Vyzo-Studio/gng_barbearia  
**Site:** https://vyzo-studio.github.io/gng_barbearia/  
**Painel:** https://vyzo-studio.github.io/gng_barbearia/admin.html  
**Backup pré-alterações:** `backup/pre-v4-hardening-20261022`  
**Fonte de verdade:** código `main` + Supabase `ueqfokfnjsjgocotvdae`.

## Resultado geral
Foram aplicadas **6 migrações** ao banco e atualizados o painel financeiro, a autenticação administrativa, CSS, JavaScript e testes. Os testes automáticos do projeto passaram; o Chromium publicou **13/13 testes aprovados** na execução https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39718768510. Os testes transacionais SQL usaram `BEGIN/ROLLBACK` e não criaram cobranças, reservas nem pagamentos persistentes. **O sistema NÃO é considerado integralmente certificado sem testes com login real de administrador e operações simultâneas sob carga.**

## Matriz dos 14 itens

| Item | Achado e ação | Estado |
|---|---|---|
| 1. Funções antigas de barbeiros | `barber_complete_booking` inseria pagamento sem obedecer ao caixa atual. Sem barbeiros vinculados ao Auth nem códigos ativos no projeto no momento da auditoria. Execução externa revogada de `barber_complete_booking`, `barber_cancel_booking`, `barber_confirm_booking`, `barber_reject_booking` e `claim_gng_barber_access`; funções preservadas para reversão. | **Corrigido no acesso**; portal antigo descontinuado |
| 2. Identidade administrativa | Confirmada uma única conta admin ativa com correspondência única no Auth. `admin_users.auth_user_id` criado e preenchido com pré-validações; `is_gng_admin` usa `auth.uid()`. Frontend exige `auth.getUser()` e confirmação da RPC antes do dashboard. | **Implementado**, login com credenciais reais não executado |
| 3. Conciliação retroativa | `admin_cash_reconciliation` apresenta fechamento original, ajustes realizados depois, conciliação atual e diferença; `admin.js` e `admin-business.js` exibem essas informações, mantendo o valor histórico original. | **Testado com rollback** e integrado em código |
| 4. Segurança financeira | Bloqueios por `cash_sessions ... FOR UPDATE` na finalização, lançamentos manuais, estornos e fechamento automático/manual; idempotência do agendamento manual preservada. Testes de soma exata, duplicação, estorno repetido e caixa conciliado aprovados. | **Testado em transações controladas**, sem teste de stress concorrente entre sessões reais |
| 5. Permissões Supabase | Execução externa retirada das rotinas legadas; RLS permanece ativo. Usuário autenticado aleatório foi explicitamente negado em `admin_cash_reconciliation`, `is_gng_admin` e na leitura direta de pagamentos. | **Parcial**: advisors ainda mostram 4 funções SECURITY DEFINER acessíveis anonimamente e 40 executáveis por authenticated — requer revisão de cada contrato |
| 6. Abuso de agendamento | Mantidos telefone canônico BR, idempotência de duplicatas, até 3 solicitações/hora e máximo de 2 pendentes por telefone. | **Mantido e testado**; proteção robusta por IP/identidade de origem ainda não disponível |
| 7. Login e sessão | Identidade de sessão verificada em rede pelo Auth; permissão sensível não usa e-mail editável. | **Parcial**: MFA, recuperação de senha e proteção nativa de senhas vazadas não configuradas/testadas; evitar riscos de bloqueio do dono |
| 8. Agenda | Revogados acessos às versões `admin_create_booking`, `admin_create_booking_v2`, `admin_create_booking_by_barber`, `admin_block_slot` e `admin_block_slot_v2` que seguiam controles antigos. Fluxos atuais `admin_create_manual_booking_split_v1` e `admin_block_slot_by_barber` preservados. `barber_interval_has_conflict` passou a incluir atendimentos `completed`, evitando duplicar atendimentos no mesmo período. | **Testado com rollback**; stress simultâneo não executado |
| 9. Visuais / tema escuro | Melhorias pontuais em CSS e ARIA, foco via teclado, áreas roláveis, contraste em etiquetas/botões e responsividade. Chromium verificou 7 larguras em navegação básica. | **13/13 testes de navegador passaram** no escopo automatizado |
| 10. Performance / acessibilidade | Removido preload desnecessário do WebP de desktop que era baixado também em mobile. Axe testou site/login em 390 e 1366 px, tema claro/escuro, após a animação completa da troca de tema. Chromium coletou FCP/LCP sintético. | **Testes aprovados no escopo**; sem Lighthouse completo, RUM, ou auditoria de painel autenticado |
| 11. Sincronização site/painel | RPC pública retornou 13/13 serviços, 4/4 imagens e 2/2 barbeiros; nome, horários de abertura e encerramento batem com configuração no banco. SEO estático é sincronizado por workflow existente. | **Conferido na API**; alteração real realizada pelo painel não executada |
| 12. Testes automatizados | Preservados testes estáticos, Chromium e arquivo SQL `tests/integration-finance-v4.rollback.sql`, executado com rollback. Verificações incluem UID negado, split inválido, retry, sobreposição, ajuste retroativo, fechamento e estorno repetido. | **Aprovado em testes unitários/sintáticos e rollback SQL**; sem autenticação de teste real |
| 13. Automações do banco | Confirmados três jobs ativos: abertura 09h BRT, fechamento 23h59 BRT e expiração minuto a minuto. Histórico observado: 1 abertura, 2 fechamentos e 270 expirações bem-sucedidas, sem falhas registradas naquele recorte. | **Verificado por logs**, monitoramento/alerta externo não configurado |
| 14. Auditoria final | Testes JS, HTML, CSS e parsing de SQL pelo CI + browser/axe + permissões SQL + consistência do site. | **Concluído para o escopo testável**, sem certificação integral |

## Banco: seis migrações versionadas
1. `gng_v4_admin_uid_authorization` — vínculo UID/Autenticação.
2. `gng_v4_disable_legacy_barber_mutations` — restrição de chamadas antigas de barbeiros.
3. `gng_v4_disable_obsolete_admin_booking_rpcs` — bloqueio de rotas administrativas obsoletas.
4. `gng_v4_cash_snapshot_reconciliation` — cálculo de fechamento original + ajustes tardios.
5. `gng_v4_payment_cash_close_serialization` — coordenação entre recebimentos e caixa fechado.
6. `gng_v4_include_completed_bookings_in_conflict_checks` — prevenção de duplicidade com agendamentos concluídos.

Arquivos SQL estão em `supabase/migrations/2026102203*.sql`; cada migração passou por pré-validação com transação `ROLLBACK` antes da aplicação de produção. **Reverter a branch do GitHub não reverte o banco; para desfazer funções e permissões é necessária migração compensatória revisada.**

## Código e testes alterados
- **Painel:** `admin.js`, `admin-business.js`, `admin.html`, `config.js`.
- **Público / tema:** `script.js`, `theme.css`, `index.html`, `privacidade.html`.
- **Testes:** `tests/admin-login.test.cjs`, `tests/accessibility.spec.cjs`, `tests/integration-finance-v4.rollback.sql`.
- **CI:** `.github/workflows/gng-browser-qa.yml` espera a versão correta do site publicado antes de testar e também responde a deploys concluídos; arquivo de evidências do Chromium na execução indicada.

## Evidências de testes
- **GitHub QA regressiva:** sintaxe de JS, checks de agendamento, pagamentos, UID simulado, SEO, HTML, CSS e parsing SQL. Execução recente aprovada.
- **Chromium e Axe:** `13 passed` (22/10/2026), cobrindo oito combinações de página/largura/tema e testes básicos de navegação, consentimento, responsividade e desempenho. Nenhuma violação Axe identificada nessas oito combinações estáticas *depois de esperar o fim da animação de 420 ms*.
- **PostgreSQL rollback:** cenários de fechamento original R$30, ajuste posterior R$30, total conciliado R$60, idempotência, sobreposição, soma incorreta e estorno duplicado. Nenhum dado de teste ficou persistido.
- **Segurança de acesso:** usuário autenticado com UID desconhecido recusado pela checagem admin e pela conciliação, sem SELECT direto à tabela de pagamentos.
- **Agendamento:** `open_weekdays=[1,2,3,4,5,6]`; domingo `2026-10-25` negado; segunda `2026-10-26` permitida.
- **Dados reais preservados:** consulta final antes do relatório: zero agendamentos e zero pagamentos; uma sessão de caixa histórica pré-existente não foi modificada.

## Restrições e riscos pendentes
1. **Login real e painel autenticado**: não há conta de testes autorizada para exercitar recuperação de senha, MFA, CRUD e sessões. Simulações de login não substituem autenticação real.
2. **MFA / senha comprometida**: dependem de configuração/recursos do projeto Auth; proteção nativa contra senhas vazadas não habilitada no plano Free identificado anteriormente.
3. **Segurança de funções**: as 4 anônimas e 40 autenticadas SECURITY DEFINER continuam apontadas pelo advisor. Necessitam revisão dinâmica, endpoints e provas de autorização em todos os fluxos. Warning não comprova exploração.
4. **Carga/concorrência**: não foi executado teste paralelo de alto volume em ambiente isolado. SQL com `ROLLBACK` verifica regras e alguns conflitos, não throughput.
5. **Acessibilidade completa**: Axe aprovado no site e login não certifica todas as 17+ telas/estados do painel autenticado, nem toda WCAG 2.2 AA manual.
6. **Segurança de origem e anti-automação**: validação de telefone e limite individual não substituem WAF, CAPTCHA ou limitação por IP confiável.
7. **Financeiro real**: não realizados testes de caixa, venda/estorno com credenciais reais ou movimentação de dinheiro.
8. **SEO e sincronismo**: atualização de dados foi conferida por API, mas não houve escrita real via painel seguida de leitura pública na mesma sessão.

### Prontidão
**Parcialmente verificado — não integralmente certificado para produção.** Correções importantes foram implementadas e testadas; o restante exige ambiente de testes autenticado, validação de segurança adicional e testes de concorrência. Nenhuma senha, chave secreta ou dado pessoal foi publicado neste relatório.
