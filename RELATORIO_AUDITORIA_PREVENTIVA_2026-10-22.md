# GNG BARBEARIA — Auditoria de manutenção preventiva, 22/10/2026

**Origem do plano:** checklist de 28 itens encaminhado pelo proprietário.  
**Código:** https://github.com/Vyzo-Studio/gng_barbearia  
**Site:** https://vyzo-studio.github.io/gng_barbearia/  
**Painel:** https://vyzo-studio.github.io/gng_barbearia/admin.html  
**Supabase:** `ueqfokfnjsjgocotvdae` (ACTIVE_HEALTHY, PostgreSQL 17, us-west-2).  
**Ponto de recuperação do código antes destas correções:** branch `backup/pre-preventive-audit-20261022`, a partir do commit `4ad937f5b3f4922c021110088e94b6eed7afc445`.

> **Status: manutenção parcial, NÃO homologação total.** Não foram utilizados login real de administrador, dados financeiros de produção, novas reservas reais, testes destrutivos, stress concorrente ou mudanças de permissões/migrações do banco nesta rodada. Não é possível afirmar certificação financeira, LGPD ou WCAG completa.

## Correções efetivamente implementadas

| ID | Defeito confirmado e correção | Código / evidência |
|---|---|---|
| 12 — Listas vazias | `site-data.js` ignorava resposta contendo listas `[]` e exibia serviços/fotos de exemplo desatualizados. Agora distingue **lista intencionalmente vazia** de **resposta inexistente/indisponível**, remove linhas/fotos antigas, exibe avisos e limpa seleção de serviço inválida. Não remove nenhuma foto/serviço do banco. | `site-data.js`, `experience.css`, `index.html`, `tests/browser.spec.cjs` (mock de API e interface real) |
| 14 — SEO PT-BR | A descrição continha `Monday, Tuesday...` mesmo com `lang=pt-BR`. A rotina gera `De segunda a sábado` e a descrição atual do `index.html` foi atualizada a partir da configuração real do Supabase. **Somente** `dayOfWeek` do schema.org permanece em inglês, como é exigido semanticamente. | `scripts/sync-seo.cjs`, `tests/seo-sync.test.cjs`, metadados do `index.html`. Sincronização horária preservada. |
| 15 — Contato jurídico | Links de WhatsApp fixos das páginas jurídica e traduções poderiam ficar desatualizados. Agora é lido `get_public_site_config`; o contato validado atualiza links e o número exibido. Em falha da API ou telefone inválido, abre `index.html#localizacao`, **sem direcionar para um número antigo**. | `legal-contact.js`, `legal-i18n.js`, `privacidade.html`, `termos.html`. |
| 8/10 — Validação de upload | O frontend aceitava `file.type` sem verificar assinatura e derivava extensão do nome arbitrário de arquivo. Agora confere assinaturas JPEG/PNG/WEBP, mantém limite 5 MB e usa extensão derivada do tipo validado. O bucket também restringe tipo e tamanho no servidor; assinatura não substitui análise completa/antivírus. | `admin-business.js`, `tests/upload-validation.test.cjs`, `.github/workflows/gng-qa.yml`. |
| 16 — Tradução de estados vazios | Avisos novos de lista vazia foram traduzidos nos cinco idiomas preservando a definição comercial original. | `i18n.js`, `tests/browser.spec.cjs` e versões estáticas de assets. |

**Dados preservados:** nenhuma criação/exclusão de agendamento, nenhuma movimentação de caixa ou pagamento, nenhuma migração/ALTER/GRANT/REVOKE no Supabase nesta rodada. Todas as alterações realizadas foram comitadas na `main`.

## Matriz dos 28 itens: verificado, parcial ou pendente

| Item | Estado | Evidência ou restrição |
|---|---|---|
| 1. Homologação administrativa | **Pendente** | Sem conta administrativa de homologação; testes do formulário de login sem autenticação não substituem uso real |
| 2. Auditoria financeira | **Parcial** | Migrações e testes transacionais de versão anterior preservados; nesta rodada nenhuma transação financeira real ou stress foi executado |
| 3. Abuso de agendamentos | **Parcial** | Normalização e limites por telefone mantidos; não introduzido rate limit global ou desafio não verificado |
| 4. Disponibilidade e concorrência | **Parcial** | Testes de interface e regras existentes passaram; concorrência de sessões independentes precisa staging |
| 5. Funções privilegiadas | **Parcial** | Advisor aponta 4 SECURITY DEFINER anônimas e 40 authenticated. Funções públicas suportam o site; funções administrativas examinadas contêm chamada a `is_gng_admin()`. Não houve revogação indiscriminada, e cada contrato precisa análise dinâmica |
| 6. Autenticação e MFA | **Parcial** | Autorização por UID mantida, sem testar senha, MFA, recuperação e revogação com conta real |
| 7. RLS | **Verificado no escopo** | As 9 tabelas têm RLS ativo, políticas de acesso direto negado e nenhuma concede SELECT direto a `anon` ou `authenticated`. Uma identidade autenticada com UID desconhecido não passou na RPC administrativa de conciliação |
| 8. Storage | **Parcial** | Bucket `gng-media` público para leitura, gravação/edição/exclusão apenas para administrador autenticado; aceita JPG/PNG/WebP até 5 MiB. Upload frontend endurecido e testado sem conexão ao bucket real |
| 9. Dados salvos no navegador | **Parcial** | Consentimento voluntário e prazo de 90 dias mantidos. A origem GitHub Pages é compartilhada com outros projetos do mesmo domínio: isolamento forte exige domínio/subdomínio próprio, ainda não implementado |
| 10. Injeções e CSV | **Parcial** | Escapes HTML e neutralização de fórmulas de campos textuais da exportação já existiam. Testes adversariais de todos os campos ainda pendentes |
| 11. Dependências/CSP | **Parcial** | CSP e HTTPS identificados; não foi aplicada atualização massiva nem auditoria completa dos provedores externos |
| 12. Sincronização com listas vazias | **Corrigido e testado** | Quando o banco retorna array vazio, conteúdo estático desatualizado não reaparece |
| 13. Painel → site | **Parcial** | Site lê RPC pública; não houve edição real via painel autenticado para aferir sincronismo ponta a ponta |
| 14. SEO e metadata | **Corrigido e testado** | Meta description em português e JSON-LD técnico preservado; rotina automatizada continua disponível |
| 15. Contatos legais | **Corrigido em código** | Novo leitor de configuração pública usa número real validado e fallback não sensível em erro |
| 16. Cinco idiomas | **Parcial** | Transições, estados vazios e responsividade testados; conteúdos comerciais próprios continuam no idioma cadastrado e exigem traduções oficiais |
| 17. Cookies/Maps | **Testado no escopo** | Browser QA existente testa aceite, rejeição, persistência e revogação; não certifica políticas de terceiros |
| 18. Telas e estados responsivos | **Parcial** | Browser QA em 320–1920px no público e login; todas as telas autenticadas permanecem fora do teste |
| 19. Temas e logos | **Testado no escopo** | Testes público/administrativo, claro/escuro, legendas/indicadores e logo transparente preservados |
| 20. WCAG 2.2 AA | **Parcial** | axe sem violações identificadas nos estados do site e login testados, não inclui leitor de tela e painel autenticado completos |
| 21. Recuperação de falhas | **Parcial** | Tratamentos existentes preservados; testes de queda de conexão após commit financeiro precisam staging |
| 22. Jobs automáticos | **Verificado por histórico** | `gng-auto-open-cash` (12:00 UTC), `gng-auto-close-cash` (02:59 UTC) e `gng-expire-pending-bookings` (por minuto) ativos, com 0 falhas no histórico consultado: 2, 2 e 1160 execuções, respectivamente |
| 23. Índices e desempenho SQL | **Avaliado, sem mudanças** | Advisor informa 3 índices não utilizados; não é justificativa para excluí-los. Sem benchmark real de carga |
| 24. Alertas e observabilidade | **Pendente** | GitHub Actions e cron possuem logs, mas não há evidência de notificações externas de incidentes configuradas |
| 25. Backup e recuperação | **Parcial** | Branch pré-mudanças registrada; branch não é backup dos dados Supabase. Estratégia de exportação/restauração testada depende de plano e ambiente separado |
| 26. Remoção de código legado | **Avaliado, sem exclusões** | Mutations antigas de barbeiros seguem sem EXECUTE externo; exclusão física dependeria de análise das dependências |
| 27. Ampliação de testes | **Implementada parcialmente** | Browser mockado para listas vazias e idiomas, teste real da função JS de upload com arquivos simulados e regressão SEO; autenticação/stress financeiros reais ainda pendentes |
| 28. Termos jurídicos/operacionais | **Pendente de validação da empresa** | Identidade jurídica, regras de planos, política de atrasos/cancelamento e retenção não foram inventadas |

## Principais fatos de segurança verificados

- Projeto correto: **GNG Barbearia**, `ueqfokfnjsjgocotvdae`; projetos HAUS/Luence não foram alterados.
- Nove tabelas do schema `public`, todas com RLS, `SELECT` direto negado a `anon` e `authenticated`.
- Bucket `gng-media`: público somente para exibir fotos; upload, edição e exclusão exigem `is_gng_admin()`.
- **4 RPCs anônimas** são contratos públicos necessários: `get_public_site_config`, `get_public_barbers`, `get_public_unavailable_slots_by_barber` e `create_booking_request_by_barber_privacy_v1`. Exposição intencional não equivale a vulnerabilidade comprovada.
- **40 RPCs `SECURITY DEFINER` autenticadas** estão sinalizadas pelo advisor. As rotinas `admin_*` de acesso exposto encontradas têm referência ao guard `is_gng_admin()`; isso é uma verificação estática, não auditoria formal das funções.
- SQL negativo com UID autenticado desconhecido confirmou recusa da autorização admin e da conciliação de caixa, sob `BEGIN/ROLLBACK`.
- **3 cron jobs** ativos e sem erro no recorte de execução consultado. Não alteramos cronograma ou fuso.
- **3 índices** sinalizados sem uso, preservados.

## Testes e limitações

- Testes do GitHub `GNG QA Regression` cobrem sintaxe JS, cenários de agendamento, lógica administrativa/financeira simulada, segurança de uploads, SEO e validação estática HTML/CSS/SQL.
- `GNG Browser QA` usa Chromium real e simula respostas da API pública. A execução aprovada antes da última ampliação do teste cobriu **22/22 verificações**, incluindo quatro estados públicos e oito testes axe (site/login, 390 e 1366 px, claro/escuro).
- **Teste de upload**: os arquivos são Blob binários simulados e o `storage.upload` é um mock, não uma escrita real; testa rejeição de MIME adulterado, extensão arbitrária, conteúdo incompatível e arquivos acima de 5 MB.
- **Sem homologação autenticada real** e sem testes destrutivos/de stress em produção.
- Publicação de cada alteração depende do GitHub Pages; consultar a última execução `pages build and deployment` para confirmar o commit publicado.

## Recuperação e operação segura

1. **Código:** a branch `backup/pre-preventive-audit-20261022` preserva o estado anterior. Em incidente, comparar os arquivos com `main` e efetuar revert/cherry-pick seletivo, por commit, após verificar dependências. Evitar substituir toda a árvore se outras alterações legítimas ocorrerem depois.
2. **Banco:** esta rodada **não alterou o esquema nem os dados reais**. O backup de branch GitHub não abrange Supabase; em caso de incidente de dados, usar recuperação oficial compatível com o plano ou backup externo autorizado, protegendo dados pessoais e financeiros.
3. **Migrações anteriores:** existem migrações versionadas em `supabase/migrations`. Uma reversão de código não desfaz procedimentos, GRANTs ou histórico financeiro; mudanças SQL devem usar migrações compensatórias após testes isolados.
4. **Monitoramento:** inspecionar resultados de `GNG QA Regression`, `GNG Browser QA`, `GNG SEO Sync` e `pages build and deployment` no GitHub; acompanhar `cron.job_run_details` no Supabase. Nunca incluir tokens, senhas, telefones integrais ou dados de caixa sensíveis em relatórios públicos.
5. **Validação administrativa antes de homologação final:** usar conta autorizada, dados isolados, permissões mínimas, logs protegidos; validar todos os fluxos administrativos, inclusive autenticação/recuperação e conciliação, sem movimentar pagamentos reais. Documentar falhas/horário/procedimentos.

### Conclusão
As correções comprovadas de listas vazias, SEO em português e contatos jurídicos estão aplicadas; a validação de imagem foi reforçada. O restante é classificado por evidência e restrição. **Não declarar os 28 itens integralmente concluídos** sem homologação administrativa segura, validação humana da documentação jurídica e auditoria dinâmica de funções críticas.
