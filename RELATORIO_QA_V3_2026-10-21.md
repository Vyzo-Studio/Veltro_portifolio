# GNG Barbearia — Relatório de implementação e QA V3.0

**Data de execução:** 21/10/2026 (horário de Brasília; alguns registros automáticos do GitHub aparecem em UTC no dia 22).  
**Repositório:** https://github.com/Vyzo-Studio/gng_barbearia  
**Site:** https://vyzo-studio.github.io/gng_barbearia/  
**Painel:** https://vyzo-studio.github.io/gng_barbearia/admin.html  
**Base auditada:** `4aa09e8` (idêntica à `main` no começo da execução).  
**Versão final verificada da `main`:** `92b6f67a6dd64eda2349ac9892735bbff1d95f46`.  
**Backup de código:** `backup/pre-v3-remediation-20261021`.  
**Escopo:** 11 achados GNG-001 a GNG-011 e validação adicional de responsividade.

## 1. Resumo executivo

Foram realizadas alterações reais e controladas na `main` do GitHub e aplicadas **cinco migrações versionadas** no Supabase. O fechamento manual de caixa usa agora a mesma regra de data efetiva dos relatórios. A validação de e-mail foi corrigida sem remover o controle confiável `is_gng_admin`. O controle de reservas deixou de impor o limite global compartilhado de 20/min e passou a usar identidade telefônica normalizada, limite individual, proteção a duplicações e teto de pendências.

Também foram adicionados um índice financeiro, contadores claros no relatório, atualização periódica do SEO estático e imagens WebP. O pipeline de QA foi ampliado para HTML, CSS, migrações SQL, JS, autenticação simulada e navegação real no Chromium.

Todos os pagamentos permanecem **presenciais** (dinheiro, Pix recebido presencialmente, débito e crédito). Nenhum gateway, banco ou reembolso automático foi implementado. Não foram alterados ou fechados caixas reais para teste.

## 2. Matriz dos 11 achados

| Achado | Verificação e alteração | Status fundamentado |
|---|---|---|
| **GNG-001** Login e-mail | Reproduzida expressão `\\s` incorreta; regex corrigida; testes com endereços válidos/inválidos, senha simulada e RPC de autorização simulada passaram. Autenticação real não exercitada. | **PARCIAL** (correção implementada e código testado; login real pendente) |
| **GNG-002** Limite global | Confirmado limite compartilhado de 20/min; substituído por limite por telefone, até 3 solicitações/hora, até 2 pendentes e verificação de duplicação; teste SQL de usuários independentes passou. Sem IP confiável para limite por origem. | **IMPLEMENTADO**, com proteção por origem pendente |
| **GNG-003** Normalização | `gng_normalize_brazil_phone` converte número BR válido à mesma representação `55+DDD+número`; variantes com máscara, espaço e `55` equivalem; valores antigos não foram alterados. | **TESTADO E APROVADO** nos casos testados |
| **GNG-004** Senhas vazadas | Aviso de proteção desativada confirmado; projeto Supabase pertence a organização do plano **Free**. Controle nativo não pôde ser ativado no plano/ações disponíveis. | **BLOQUEADO** (limitação de plano/configuração) |
| **GNG-005** SECURITY DEFINER | Foram inspecionados metadados/permissões de 57 funções; quatro acessíveis anon destinadas aos fluxos públicos; todas as rotinas administrativas executáveis tinham guarda `is_gng_admin` no corpo; revogado EXECUTE direto de auxiliares específicos e endurecidos caminhos de funções verificadas. Alertas 4 anon/49 authenticated ainda existem e precisam de revisão funcional completa. | **PARCIAL** |
| **GNG-006** Índice FK | Falta de índice `payment_transactions.cash_session_id` confirmada; criado índice parcial `payment_transactions_cash_session_id_idx`. Advisor de FK sem aviso após criação. | **IMPLEMENTADO** (ganho de desempenho não medido) |
| **GNG-007** Fechamento manual | Diferença `occurred_at` vs `payment_effective_date` confirmada; rotina manual alterada e testada com registro retroativo em transação reversível; caixa, resumo e relatório retornaram valores consistentes. | **CORRIGIDO E TESTADO** em SQL controlado |
| **GNG-008** SEO dinâmico | Criado script que consulta RPC pública para gerar `<title>`, descrição, Open Graph, Twitter e schema.org na própria página estática; workflow horário e manual executou com sucesso; teste de escaping/idempotência aprovado. | **IMPLEMENTADO**; atualização depende do próximo workflow |
| **GNG-009** Testes incompletos | QA ampliado com testes sintáticos e regressivos JS, HTML, CSS, SQL e autenticação simulada; novo Playwright Chromium navegou o site publicado. Teste inicial encontrou overflow mobile; corrigido e **4 de 4** testes de navegador passaram no rerun, incluindo 7 larguras. | **IMPLEMENTADO E TESTADO** para o escopo automatizado |
| **GNG-010** Contadores financeiros | API agora fornece `paid_booking_count` e `financial_transaction_count`; interface/CSV explicam contagens; teste SQL mostrou 1 atendimento, 2 parcelas e R$110 sem duplicação de faturamento. | **CORRIGIDO E TESTADO** no backend; renderização autenticada pendente |
| **GNG-011** Imagens | Gerados WebPs responsivos de ambas fotografias; 2 principais passaram de **957.796 B** em PNG para **72.678 B** em WebP (aprox. **92,4% menores**), além das versões mobile; originais preservados. | **IMPLEMENTADO E MEDIDO** |

## 3. Correções críticas

### Autenticação
`config.js` passou a validar sintaxe de e-mail sem barras invertidas redundantes. `admin.js` continua exigindo sessão Supabase e resposta positiva da função `is_gng_admin`. Foram testados casos simulados de e-mails válidos, inválidos, senha incorreta e conta não autorizada. **Não houve login real com credenciais do proprietário**, nem testes reais de expiração, recuperação ou revogação de sessão.

### Fechamento de caixa
A data econômica é `coalesce(payment_effective_date, timezone('America/Sao_Paulo', occurred_at)::date)`. `occurred_at` permanece como data de inclusão do registro para fins de auditoria; não foi globalmente substituída. `admin_close_cash`, `system_close_cash`, `admin_cash_summary` e `admin_financial_report` seguem o mesmo critério de atribuição da receita e estorno por dia efetivo.

O teste criou apenas **dentro de uma transação com rollback** um caixa simulado de 20/10, um pagamento dividido R$20 dinheiro + R$90 Pix, lançado retroativamente. Ao fechar manualmente, o total foi R$110, igual ao resumo diário e relatório de 20/10; o relatório de 21/10 não contabilizou esse recebimento. O rollback preservou todos os dados reais. Não foram alterados saldos já fechados.

### Abuso de reservas
A função pública normaliza números e serializa tentativas da mesma identidade com advisory lock. Rejeita pedido idêntico pendente, bloqueia mais que 2 pendências simultâneas e 3 pedidos por hora do mesmo telefone. Outros telefones continuam independentes. **Não há identificação de origem/IP confiável** disponível nesta arquitetura para controles adicionais; um atacante ainda pode tentar usar muitos números. Não foram feitos testes agressivos de carga.

## 4. Segurança e proteção de dados

- RLS permanece ativo nas 9 tabelas públicas relevantes; clientes comuns não receberam privilégios de leitura financeira direta.
- Revisão de 57 funções privilegiadas por função/role e buscas por guardas e SQL dinâmico; os 4 RPCs acessíveis anon são relacionados a dados públicos ou agendamento. Isso **não comprova** ausência de vulnerabilidades em todos os fluxos.
- Execução direta revogada para `barber_interval_has_conflict` e validador telefônico interno; privilégios dos RPCs públicos necessários preservados.
- `search_path` endurecido em cinco funções selecionadas, sem desabilitar RLS.
- Advisor Supabase mantém alertas de funções `SECURITY DEFINER` e proteção contra senhas vazadas. Organização usa plano Free; não foi alterada configuração de senhas, nem senhas reais.
- Testes state-changing em banco executados sob BEGIN/ROLLBACK, sem dados fictícios persistidos; não houve recuperação, exportação nem exposição de dados pessoais reais.
- Google Maps segue com carregamento condicionado à autorização, testado com navegação automatizada.

## 5. Integridade financeira

O relatório contabiliza **atendimentos recebidos** como IDs únicos com saldo de transações positivo no período; **transações financeiras** contam parcelas de pagamentos e estornos individualmente. Exemplo controlado: um serviço de R$110 pago R$20 em dinheiro e R$90 Pix = um atendimento, duas transações e R$110 líquidos. Esses números estão também no CSV.

Limitações: a contagem de atendimentos depende da janela de **data efetiva de pagamento**, e não da data de serviço; esse critério foi documentado na interface. O painel autenticado não foi testado em funcionamento real. Estornos permanecem registros presenciais, sem automação bancária.

## 6. Melhorias no site público

- `scripts/sync-seo.cjs` lê apenas configurações públicas do Supabase e sincroniza metadados visíveis a crawlers dentro do HTML. `gng-seo-sync.yml` executa a cada hora (programação sujeito à disponibilidade do GitHub Actions). O HTML não depende da execução JavaScript do visitante para manter metadados atualizados após a sincronização.
- Fotografias PNG mantidas; alternativas WebP principais 35.034 B e 37.644 B, mobile 30.896 B e 33.462 B, referenciadas por `srcset` e dimensões explícitas.
- Corrigida a rolagem horizontal de 140 px reportada pelo Chromium em largura de 320 px, ajustando a coluna da `.hero-grid` para `minmax(0,1fr)` e a contenção de `.quick-info`. **Rerun com 4/4 testes aprovados após GitHub Pages publicar o CSS**.
- Mantidos os dois temas, identidade e Instagram.

## 7. Migrações V3.0 efetivamente aplicadas

1. `gng_v3_cash_close_effective_receipt_date` — fechamento por data efetiva.
2. `gng_v3_fair_rate_limit_canonical_phone` — normalização e limites individuais.
3. `gng_v3_cash_session_foreign_key_index` — índice de sessão de caixa.
4. `gng_v3_financial_distinct_bookings_and_transactions` — contadores separados.
5. `gng_v3_internal_helper_privileges_and_paths` — grants e search paths.

Arquivos versionados em `supabase/migrations/20261021214100_...`, `...214400_...`, `...214700_...`, `...215000_...` e `...215500_...`. O histórico Supabase confirmou as cinco migrações aplicadas. Reverter commits de GitHub **não reverte alterações do banco**; mudanças de banco exigem migração compensatória específica.

## 8. Arquivos alterados / adicionados

**Aplicação:** `config.js`, `admin.html`, `admin-business.js`, `index.html`, `privacidade.html`, `theme.css`.

**Ativos:** `assets/gng-corte-01.webp`, `assets/gng-corte-01-mobile.webp`, `assets/gng-corte-02.webp`, `assets/gng-corte-02-mobile.webp`.

**Scripts:** `scripts/sync-seo.cjs`, `scripts/optimize-images.py`, `scripts/validate-static.py`.

**Testes:** `tests/admin-login.test.cjs`, `tests/seo-sync.test.cjs`, `tests/browser.spec.cjs`.

**Workflows:** `.github/workflows/gng-qa.yml`, `.github/workflows/gng-seo-sync.yml`, `.github/workflows/gng-optimize-images.yml`, `.github/workflows/gng-browser-qa.yml`.

**Banco:** cinco arquivos SQL correspondentes às migrações V3.0 acima.

## 9. Testes realizados e evidências

| Teste | Ambiente | Esperado | Resultado |
|---|---|---|---|
| Validador de e-mail | JavaScript isolado | Aceitar formatos normais e recusar inválidos | **PASSOU**; casos válidos, inválidos, normalização |
| Autenticação simulada | Node.js com mocks | Login e senha incorreta, autorização RPC | **PASSOU** na CI; não é login real |
| Fechamento manual/retroativo | PostgreSQL em BEGIN/ROLLBACK | Caixa, resumo e relatório fecham R$110 em 20/10 sem lançar em 21/10 | **PASSOU**; nenhum dado persistido |
| Contagens financeiras | PostgreSQL BEGIN/ROLLBACK | 1 atendimento, 2 parcelas, R$110 | **PASSOU** |
| Reserva pública anon | PostgreSQL BEGIN/ROLLBACK | Mesma identidade com `55`/máscara é limitada, outro cliente permitido | **PASSOU** |
| Índice e grants | Consultas PostgreSQL | Índice existe; helper interno não é RPC de usuários; booking público funciona | **PASSOU** |
| QA JS, HTML, CSS, SQL | GitHub Actions | Parser e regressões sem erro | **PASSOU**, execução `39703963648` e outras |
| SEO dinâmico | GitHub Actions + teste Node | Atualização estática, proteção de conteúdo e idempotência | **PASSOU**, execução `39702139285` |
| Codificação WebP | GitHub Actions + contagem bytes | Arquivos otimizados, originais preservados | **PASSOU**, execução `39702320064` |
| Navegação real em 7 larguras | Chromium, GitHub Actions, RPCs simulados | Sem rolagem horizontal documental | **PASSOU após correção**, execução `39703995148` (rerun) |
| Consentimento, tema e login sem sessão | Chromium, RPCs simulados | Mapas não carregam antes da opção; tema alterna; painel bloqueado | **PASSOU**, 4/4 testes |
| Login autorizado real e operação painel | — | Sessão real, CRUD, caixa e pagamentos reais | **NÃO EXECUTADO** por falta de acesso de teste autenticado seguro |
| Stress, Lighthouse, auditoria WCAG 2.2 AA | — | Métricas e conformidade | **NÃO EXECUTADO** |

Os testes de navegador foram **de verdade, com Chromium visitando o site publicado**, mas com respostas de banco simuladas para evitar qualquer mutação de produção. Capturas disponíveis no artifact da execução: https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39703995148

## 10. GitHub e publicação

- Branch: `main`.
- Backup: `backup/pre-v3-remediation-20261021`.
- Comparação do backup até o HEAD V3: **29 commits** e arquivos circunscritos à GNG.
- HEAD antes deste relatório: `92b6f67a6dd64eda2349ac9892735bbff1d95f46`.
- GitHub Pages: build/deploy **sucesso** em `39703995263` para esse HEAD.
- GitHub Browser QA: execução `39703995148`, **rerun aprovado 4/4** depois do deploy.
- GitHub QA estática: execução `39703963648`, **sucesso**.
- Após testes, banco tinha **zero agendamentos** e **zero pagamentos** persistidos; um caixa real que já estava aberto foi deixado inalterado.

## 11. Pendências reais

1. Validar autenticação autorizada com conta de teste segura, incluindo recuperação, expiração, revogação, logout e restauração; também testes CRUD/caixa do painel autenticado.
2. Função Supabase de proteção contra senhas vazadas não disponível/habilitada no plano Free atual. Não alterar plano sem aprovação.
3. A proteção por telefone reduz abuso simples, mas não tem limite por origem/IP proveniente de uma camada de infraestrutura confiável.
4. Prosseguir com revisão manual aprofundada dos 49 alertas `SECURITY DEFINER` autenticados e quatro públicos conforme dependências e fluxo real; alertas em si não provam exploração.
5. Verificar políticas de segurança e privacidade por testes de rede, além de avaliação jurídica LGPD adequada.
6. Performance Lighthouse/Core Web Vitals e conformidade WCAG 2.2 AA integral não foram medidas.
7. Execução de cron horário de SEO é eventual (não imediatamente após cada mudança administrativa).

## 12. Prontidão operacional

**Classificação: VERIFICAÇÃO INSUFICIENTE para certificação integral de produção.**

O sistema público e financeiro recebeu correções testadas, inclusive com navegação real, mas **não foi possível executar operações administrativas autenticadas de ponta a ponta** sem uma conta de teste segura. Não é correto classificar todas as operações sensíveis como verificadas ou emitir uma nova nota de QA independente.

**Recomendação:** realizar auditoria independente pós-correção, verificar conta de teste autenticada e monitoração inicial dos fluxos reais antes de considerar o sistema plenamente certificado. Nenhuma senha ou chave privilegiada foi publicada neste relatório.
