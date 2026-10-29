# VELTRO V4 — Recuperação Supabase: plano de isolamento técnico

**Estado atual:** não existe backend Supabase exclusivo da VELTRO. O navegador permanece em `demo-backend-config.js` com `ready:false`, URL e publishable key vazias; o site público usa `VELTRO_DEMO` com dados em `sessionStorage`. Não habilitar autenticação administrativa ou operações financeiras sem um projeto independente e testado.

## Fonte histórica da arquitetura (não dos dados)
Auditoria somente de metadados de schema do projeto GNG, sem exportar ou consultar registros pessoais. Componentes técnicos identificados:
- Tabelas: `admin_users`, `barbers`, `blocked_slots`, `bookings`, `business_settings`, `cash_sessions`, `gallery_images`, `payment_transactions`, `services`.
- RPC públicas a inspecionar: `get_public_site_config`, `get_public_barbers`, `get_public_unavailable_slots_by_barber`, `create_booking_request_by_barber_privacy_v1`.
- RPC administrativas usadas no código: `is_gng_admin` (nome técnico legado; renomear em conjunto com frontend e SQL), `admin_list_bookings_v3`, `admin_get_business_config`, `admin_update_business_settings`, `admin_upsert_service`, `admin_upsert_gallery_image`, `admin_upsert_barber`, rotinas de caixa, pagamento e relatórios.

## Regras inegociáveis
1. Criar projeto **novo e exclusivo**, em organização selecionada pelo proprietário, após avaliação do custo indicado pelo Supabase.
2. Não migrar senhas, usuários de Auth, chaves, clientes, telefones, reservas, caixas, transações, logs nem objetos de Storage da GNG ou HAUS.
3. Criar migrations versionadas e revisar dependências SQL; nenhuma transação financeira real.
4. Habilitar RLS em toda tabela pública; acesso administrativo por identidade autenticada e autorizada por ID do usuário, com políticas de menor privilégio.
5. Revogar `EXECUTE` público não necessário nas RPC, revisar `SECURITY DEFINER`, `search_path` e permissões `anon` / `authenticated`. Funções de agendamento público devem aplicar limites de horário, serviço, duração, colisão e privacidade **no servidor**, não depender da validação JavaScript.
6. Storage e autenticação separados, sem usuários administrativos embutidos no JavaScript. Primeiro usuário criado por fluxo seguro após autorização.
7. Inserir somente os **13 serviços demonstrativos verificados** de `demo-fixtures.js`, os dois profissionais fictícios e os links de imagens licenciadas. Assinaturas Essencial R$85 e Signature R$150 apenas como textos ilustrativos, sem cobrança.
8. Preservar `ready:false` até concluir autenticação, RPC públicas, autorização administrativa, RLS, upload, persistência após recarga, propagação de configurações e testes de caixa com dados sintéticos.
9. Só então inserir URL do projeto separado e **publishable key** pública no frontend e autorizar origens `connect-src` na CSP. **Jamais** usar service-role ou secret key no navegador.
10. Antes de lançar, executar testes de autorização negativa, logout, concorrência de reservas, expiração, upload, refund fictício, exportação CSV, split, troco, abertura/fechamento de caixa, relatórios e isolamento de recursos.

## Bloqueios conhecidos
- Falta definição explícita da organização de destino e confirmação de eventuais custos; nenhuma criação de projeto foi solicitada ao Supabase.
- Não existe acesso administrativo real verificado, nem dados partilhados entre visitantes.
- Os controles de serviço/galeria/caixa do painel são implementações herdadas **não certificadas** no contexto VELTRO.
- Os testes atuais comprovam apenas o modo desconectado de demonstração, sem alegar integridade de um backend que ainda não foi provisionado.
