# GNG BARBEARIA — Relatório de implementação e QA
**Data de referência:** 21/10/2026 · **Origem:** VYZO OMEGA REPAIR ENGINE V2.0  
**Repositório:** https://github.com/Vyzo-Studio/gng_barbearia  
**Site:** https://vyzo-studio.github.io/gng_barbearia/  
**Painel:** https://vyzo-studio.github.io/gng_barbearia/admin.html

## 1. Resumo executivo
Foram feitas alterações reais nos arquivos da branch `main` e aplicadas oito migrações de produção, preservando a estrutura original do projeto e criando uma cópia de segurança do código na branch `backup/pre-qa-repair-20261021`. Foi corrigida a estrutura que impedia duas parcelas de pagamento para um mesmo atendimento. Um novo módulo do painel permite pagamentos únicos ou divididos na criação manual, com data efetiva, troco e confirmação de recebimento. Testes transacionais PostgreSQL foram executados com `ROLLBACK`, sem criar transações reais.

**Limite importante:** não foi executado teste visual/interativo autenticado em navegador real, nem avaliação Lighthouse/WCAG completa. Uma validação real no fluxo do painel continua necessária. A resolução integral dos 37 achados não foi certificada.

## 2. Pagamento presencial
Todos os pagamentos continuam **presenciais**: dinheiro, Pix recebido e verificado diretamente pela barbearia, débito e crédito nas maquininhas físicas. O site nunca cobra um pagamento online. Supabase armazena **registros contábeis**, não recursos bancários. Não foi adicionado checkout, gateway, automação Pix nem devolução automática.

## 3. Novo pagamento dividido no agendamento manual
O painel agora apresenta valor do serviço configurado no Supabase, modo pagamento único, opção de dividir em duas formas distintas, valores por parcela, preenchimento sugerido do restante, diferença entre soma e valor cobrado, dinheiro entregue pelo cliente, troco, data real de recebimento e confirmação explícita de que o valor já foi recebido. O backend limita a duas formas distintas, exige soma exata, valida centavos e impede lançamentos duplicados pela operação UUID. Para pagamento de hoje, exige caixa aberto. Agendamentos sem pagamento não geram receita.

Exemplo de teste executado: serviço de **R$ 110,00**, dinheiro R$ 20,00 + Pix R$ 90,00, nota entregue de R$ 50,00, troco R$ 30,00. O sistema registrou duas alocações, valor total correto e troco correto em transação revertida após a verificação.

## 4. Integridade financeira
Índices anteriores permitiam somente um pagamento e um estorno por atendimento. Foram substituídos por unicidade de **forma de pagamento por agendamento e tipo de transação**. Estorno total grava reversões correspondentes às parcelas originais; repetição é recusada e nada transfere dinheiro automaticamente. Data do recebimento foi separada da data de lançamento (`occurred_at`) e da data do serviço. Relatórios e fechamento de caixa consideram essa data efetiva; o CSV agora identifica data do pagamento e data de registro.

**Limites restantes:** estornos parciais por parcela e ajustes históricos específicos não foram implementados; ainda não houve reconciliação com um caixa real usando a interface autenticada. Atualmente, para agendamento finalizado, o estorno disponível é **total**.

## 5. Matriz dos 37 achados
*Esta matriz distingue implementação em código de validação de ponta a ponta. “Parcialmente concluído” não equivale a problema totalmente corrigido.*

| Nº | Achado | Ação/validação observada | Estado |
|---:|---|---|---|
| 01 | Conflito de índice de pagamento dividido | Índices por método; PostgreSQL aprovou alocações simultâneas e soma | TESTADO E APROVADO |
| 02 | Estorno dividido | Duas reversões por método, preservação de originais e bloqueio de repetição testados | TESTADO E APROVADO para estorno total |
| 03 | Consentimento Google Maps | `iframe.src` não é preenchido antes de autorização no código; faltou medição real de rede | IMPLEMENTADO |
| 04 | Validação telefônica | Rejeição de zeros e repetidos, aceitação de números válidos testada em JS e SQL | TESTADO E APROVADO nos exemplos |
| 05 | Mensagens por campo | Avisos legíveis adicionados à confirmação pública; sem teste em navegador | IMPLEMENTADO |
| 06 | Motivos de indisponibilidade | API distingue bloqueado/ocupado/fora do horário; frontend reflete descrições | IMPLEMENTADO |
| 07 | Expiração de pendências | Aviso de cinco minutos mantido e cron de expiração criado | IMPLEMENTADO |
| 08 | Acompanhamento de confirmação | Explicado que depende da barbearia, contato disponível; sem consulta segura de status | PARCIALMENTE CONCLUÍDO |
| 09 | Testes de agendamento desatualizados | Testes atualizados para privacidade e adicionados à CI; execução GitHub Actions aprovou | TESTADO E APROVADO |
| 10 | Injeção de fórmula em CSV | Campos livres neutralizados e assertivas automáticas revisadas | TESTADO E APROVADO no teste estático |
| 11 | Versão Supabase SDK | URL `@2` substituída por `@2.118.0`, release oficial confirmado | IMPLEMENTADO |
| 12 | E-mail administrativo público | E-mail removido de config.js e placeholder; autorização real pelo RPC | IMPLEMENTADO |
| 13 | Abuso automatizado de reservas | Rate limit de 20/min global e 3/h por telefone no banco; sem teste de carga | IMPLEMENTADO; CARGA PENDENTE |
| 14 | Efeito colateral da consulta de disponibilidade | Consulta não expira mais reservas; cron separado ativo a cada minuto | IMPLEMENTADO |
| 15 | Migrações versionadas | Oito arquivos SQL versionados, oito migrações aplicadas no Supabase | IMPLEMENTADO |
| 16 | Acoplamento dos módulos administrativos | Novo módulo isolado, porém dependências de funções globais antigas persistem | PARCIALMENTE CONCLUÍDO |
| 17 | Autenticação e sessão | Revisão estática de `is_gng_admin` e permissões; sem login/logout real testado | PARCIALMENTE CONCLUÍDO |
| 18 | Ciclo de vida do agendamento | Parte verificada via testes de mutações; sem teste completo real | PARCIALMENTE CONCLUÍDO |
| 19 | Reservas concorrentes | Proteções por locks já existem, não houve teste simultâneo de stress | PARCIALMENTE CONCLUÍDO |
| 20 | Agendamento manual e bloqueios | Operação manual SQL validada em rollback; bloqueios não exercitados na UI | PARCIALMENTE CONCLUÍDO |
| 21 | Quatro pagamentos e divisão | 4 métodos únicos + 6 combinações e troco verificados por rollback SQL | TESTADO E APROVADO no backend; UI PENDENTE |
| 22 | Reconciliação financeira | Checagens de soma/estornos/datas feitas em transações de teste; falta relatório renderizado | PARCIALMENTE CONCLUÍDO |
| 23 | Caixa fechado | RPCs atualizadas para exigir caixa aberto hoje; cenário fechado não exercitado em produção | IMPLEMENTADO |
| 24 | Sincronização das configurações | Preços agora passados com centavos ao formulário; faltou prova com navegador | PARCIALMENTE CONCLUÍDO |
| 25 | Segurança do upload | Storage público de imagens com edição só para admin; tipos JPG/PNG/WebP e limite de 5 MB | PARCIALMENTE CONCLUÍDO |
| 26 | Responsividade | Regras existentes preservadas; sem teste visual de todos os viewports solicitados | PARCIALMENTE CONCLUÍDO |
| 27 | Acessibilidade WCAG | Novos labels/hints e estilos; sem auditoria WCAG 2.2 AA completa | PARCIALMENTE CONCLUÍDO |
| 28 | Desempenho | Sem Lighthouse/web-vitals medidos | BLOQUEADO (NÃO MEDIDO) |
| 29 | Cabeçalhos HTTP | CSP/meta existentes; verificação de headers e controle da hospedagem pendentes | PARCIALMENTE CONCLUÍDO |
| 30 | Links externos | URLs existentes de Instagram, WhatsApp e Maps preservados; clique não exercitado | PARCIALMENTE CONCLUÍDO |
| 31 | Imagens | Dois PNGs originais preservados; ainda não convertidos para WebP/AVIF | PARCIALMENTE CONCLUÍDO |
| 32 | Canonical | Canonical adicionado ao site e página de privacidade | IMPLEMENTADO |
| 33 | Metadados sociais | Open Graph e Twitter summary usando logo oficial | IMPLEMENTADO |
| 34 | Dados estruturados LocalBusiness | Schema.org Barbershop com dados conhecidos (sem avaliações inventadas) | IMPLEMENTADO |
| 35 | Sitemap e robots.txt | Arquivos criados no diretório do projeto; robots no GitHub Pages não controla o domínio raiz | IMPLEMENTADO COM LIMITAÇÃO |
| 36 | Histórico da navegação | Fluxos existentes preservados; histórico Voltar/Avançar não exercitado | PARCIALMENTE CONCLUÍDO |
| 37 | Fotografias provisórias | Sem fotografias autênticas fornecidas para troca, originais preservadas | BLOQUEADO (ASSETS) |

## 6. Segurança e privacidade
- Proteção de acesso aos dados pelo RLS e execução restrita das rotinas financeiras; RPCs legadas inseguras para recebimento foram revogadas de `authenticated`.
- E-mail de administração deixou de ser revelado publicamente no JS/login; não é segredo do banco.
- Bloqueio de carregamento precoce do Google Maps, autorização opcional mantida.
- Validação de celular brasileiro e rate limiting no backend.
- CSV neutraliza textos iniciados por caracteres usados em fórmulas.
- Bucket `gng-media`: público apenas para leitura, gravações condicionadas a `is_gng_admin()`, tipos `image/jpeg,image/png,image/webp`, limite de 5 MB.
- Alertas Supabase restantes: múltiplas funções `SECURITY DEFINER` ainda exigem revisão caso a caso; proteção de senhas vazadas ainda não está ativa.

## 7. Agendamento
Segunda a sábado das 09:00 às 19:30; domingo fechado; duração respeitada pelo banco. Telefone público validado em frontend e backend. Estados indisponível, ocupado, bloqueado e fora de expediente foram diferenciados. Reserva fica pendente de confirmação pela barbearia; não há pagamento online. Cron de expiração roda em separado.

## 8. Interface, desempenho e SEO
Foi preservada a identidade visual azul-marinho e o tema claro/escuro existentes. Novo módulo de pagamento manual foi desenhado para responsividade. Página pública recebeu canonical, Open Graph, Twitter e JSON-LD Barbershop; novo sitemap e robots project-scoped. Nenhuma pontuação de desempenho foi inventada. Fotografias originais não foram substituídas.

## 9. Arquivos alterados
`admin-barbers.js`, `admin-business.js`, `admin-manual-payment.js`, `admin-manual-payment.css`, `admin.html`, `config.js`, `index.html`, `privacidade.html`, `privacy.js`, `script.js`, `site-data.js`, `theme.css`, `robots.txt`, `sitemap.xml`, `tests/booking-reliability.test.cjs`, `tests/manual-payment.test.cjs`, `.github/workflows/gng-qa.yml` e oito arquivos SQL. Outros arquivos não relacionados preservados.

## 10. Banco de dados — oito migrações aplicadas
1. `gng_split_payment_unique_methods_and_historical_ledger`
2. `gng_atomic_manual_in_person_split_payment_v1`
3. `gng_split_refunds_cash_guard_and_effective_date_reports`
4. `gng_read_only_availability_and_reasons`
5. `gng_phone_validation_and_booking_rate_limit`
6. `gng_strengthen_phone_validation_public_and_manual`
7. `gng_expiry_cron_and_correct_cash_close_date`
8. `gng_block_legacy_payment_rpc_paths`

Schema mantém tabelas de produção e IDs. **Rollback de banco não é equivalente a reverter GitHub**: depois de lançamentos divididos reais, não pode restaurar o índice antigo sem consolidar dados. Reversão exigiria migração de compensação revisada para preservar recibos.

## 11. Testes realizados
- PostgreSQL com `BEGIN/ROLLBACK`: quatro formas individuais, seis pares de formas, troco, lançamento sem pagamento, lançamento retroativo, repetição segura, soma incorreta e estorno duplo. **Aprovados**.
- Frontend: validações de telefone JS e checks sintáticos aprovados.
- GitHub Actions `GNG QA Regression`: sintaxe JS, confiabilidade do agendamento, mutações administrativas e pagamento manual; **execução aprovada**: https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39692821377
- Após os testes SQL, confirmação de **zero agendamentos e zero transações** armazenados em produção, conforme consulta ao banco.
- Não foram realizados teste real com login no painel, teste de rede de consentimento, capturas de tela em cinco larguras, auditoria Lighthouse, cabeçalhos HTTP reais ou simultaneidade sob carga.

## 12. Publicação
Arquivos foram comitados na `main`. GitHub Pages reportou execução de `pages build and deployment` **concluída com sucesso** para o commit de implantação final consultado. A navegação visual efetiva e cache no dispositivo do cliente não foram confirmados.

## 13. Pendências de alto valor
- Exercitar o painel autenticado em navegador nas cinco resoluções e realizar agendamentos com conta de teste em ambiente seguro.
- Implementar, caso aprovado como regra de negócio, estorno por parcela e ajustes financeiros com trilha de auditoria.
- Validar remessas e carga de centenas de agendamentos, políticas de rate limit e comportamento do caixa fechado em banco de testes separado.
- Medir performance, auditar WCAG 2.2 AA e conferir HTTP real da hospedagem.
- Otimizar fotos para formatos modernos e substituir fotografias provisórias somente com imagens oficiais.
- Revisar as funções `SECURITY DEFINER` uma a uma e habilitar proteção contra senhas vazadas no Supabase.

## 14. Estado final
O sistema de **registro financeiro presencial no banco** apresentou melhorias reais e passou nos testes transacionais controlados; a interface foi integrada em código e validada em sintaxe/CI, **mas não recebeu certificação operacional de ponta a ponta**. Não é possível afirmar que todos os 37 achados estejam corrigidos, nem atribuir nova nota objetiva de QA sem avaliação independente.
