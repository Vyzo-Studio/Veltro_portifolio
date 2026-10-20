# GNG Barbearia — implementação administrativa e confiabilidade

Atualizado em 20/10/2026.

## Situação atual

O painel administrativo e o site público foram ampliados sobre a arquitetura existente, preservando o agendamento, autenticação, Supabase e identidade visual da GNG.

O Supabase foi auditado e está ativo. As alterações abaixo foram aplicadas ao banco e ao branch `main`.

## Funcionalidades já existentes e preservadas

- Agenda administrativa por data.
- Pendentes, agendados, finalizados e histórico.
- Confirmação, rejeição, cancelamento e finalização de atendimentos.
- Seleção de forma de pagamento.
- Estorno lógico de pagamentos.
- Criação manual de agendamentos.
- Bloqueio e liberação de horários.
- Barbeiros individuais.
- Caixa diário com abertura e fechamento.
- Resumo de faturamento e formas de pagamento.
- Reserva pública por barbeiro com prevenção de conflitos por duração.
- Notificações administrativas de novas solicitações.

## Implementação adicionada em 20/10/2026

### Banco de dados

Foram adicionados:

- `services`: catálogo persistente de serviços, duração, preço, ordem e status.
- `business_settings`: logotipo, cores, textos, contato, endereço, mapa e horários de funcionamento.
- `gallery_images`: portfólio, interior e fachada.
- `payment_transactions`: razão financeira de pagamentos e estornos.
- `bookings.service_duration_minutes`: preservação histórica da duração.
- `barbers.profile_note`: informação administrativa do profissional.
- bucket público `gng-media` com escrita restrita a administradores autenticados.

Os 13 serviços atuais foram migrados para a tabela de serviços sem alterar os valores existentes.

As imagens atuais de portfólio, interior e fachada foram cadastradas como conteúdo inicial da galeria para poderem ser substituídas pelo painel.

### Financeiro

- Pagamentos e estornos agora possuem transações próprias.
- Receita recebida usa a data real do pagamento.
- Data do atendimento e data do pagamento ficam separadas.
- Proteção contra pagamento duplicado.
- Proteção contra estorno duplicado.
- Caixa não pode ser aberto duas vezes no mesmo dia nem reaberto depois de encerrado.
- Resumo diário, mensal e anual calcula movimentação real.
- Dinheiro, Pix, débito e crédito são calculados separadamente.
- Nova RPC de relatório financeiro por período.
- Histórico financeiro detalhado.
- Exportação CSV pelo painel.

### Agendamento manual

- Nome do cliente passou a ser opcional.
- Telefone passou a ser opcional e é validado quando informado.
- Serviço e barbeiro continuam obrigatórios.
- É possível escolher datas passadas, atuais e futuras.
- É possível registrar atendimento histórico na data original.
- É possível marcar o atendimento manual como concluído.
- É possível registrar Dinheiro, Pix, Débito ou Crédito no lançamento.
- Pagamentos históricos feitos hoje mantêm a data original do atendimento e a data real do recebimento.
- Conflitos de horário continuam protegidos pelo backend.

### Bloqueios e agenda

- Bloqueios continuam podendo atingir um profissional específico ou todos.
- Bloqueios são persistentes no Supabase.
- Bloqueios refletem na disponibilidade do site público.
- A duração do serviço é considerada nos conflitos.
- Horários que ultrapassam o fechamento da barbearia ficam indisponíveis.
- Horário de abertura, fechamento, intervalo e dias de funcionamento passaram a ser configuráveis.

### Personalização

Foi adicionado ao painel um módulo de PERSONALIZAÇÃO com:

- upload e troca do logotipo;
- cores principais;
- textos do site;
- telefone;
- WhatsApp;
- endereço;
- link do Google Maps;
- horário de abertura;
- horário de fechamento;
- intervalo da agenda;
- dias de funcionamento;
- serviços;
- preços;
- duração dos serviços;
- status ativo/inativo dos serviços;
- profissionais;
- informações dos profissionais;
- status ativo/inativo dos profissionais;
- galeria;
- portfólio;
- fotos internas;
- fotos externas.

O site público agora consulta a configuração persistente e usa os dados administrativos sem exigir edição manual do HTML para essas informações.

### Segurança

- RLS permanece ativado.
- Foi adicionada negação explícita de acesso direto às tabelas do domínio.
- RPCs administrativas não podem mais ser executadas pelo papel anônimo.
- Somente quatro RPCs necessárias ao site público permanecem disponíveis sem login:
  - `get_public_barbers`
  - `get_public_unavailable_slots_by_barber`
  - `create_booking_request_by_barber`
  - `get_public_site_config`
- Escrita no bucket de imagens exige usuário autenticado reconhecido como administrador.
- Nenhuma chave `service_role` ou segredo administrativo foi colocado no frontend.

## Arquivos alterados/adicionados

- `index.html`
- `style.css`
- `script.js`
- `site-data.js` — novo
- `admin.html`
- `admin.js`
- `admin-barbers.js`
- `config.js`
- `admin-business.js` — novo
- `ALTERACOES_2026-10.md`

## Migrações aplicadas

- `gng_admin_business_management_v1`
- `gng_rpc_privilege_hardening_v1`
- `gng_schedule_duration_and_gallery_seed_v1`

## Verificações executadas

- Sintaxe JavaScript verificada para:
  - `script.js`
  - `site-data.js`
  - `admin.js`
  - `admin-barbers.js`
  - `admin-business.js`
  - `config.js`
  - `admin-notifications.js`
- Catálogo persistente validado com 13 serviços.
- Preço e duração dinâmicos validados no banco.
- Horários fora do expediente validados.
- Duração que ultrapassa o fechamento validada.
- Reserva pública temporária testada dentro de transação com rollback.
- Bloqueio temporário testado e refletido como indisponível, com rollback.
- Abertura e fechamento de caixa testados dentro de transação com rollback.
- Agendamento histórico com pagamento em Pix testado dentro de transação com rollback.
- Relatório financeiro executado com sucesso.
- Permissões verificadas: RPCs administrativas sem execução anônima.
- Testes temporários não deixaram registros em `bookings`, `blocked_slots`, `cash_sessions` ou `payment_transactions`.

## Validações ainda manuais

O código e o banco foram verificados tecnicamente, mas ainda é recomendável validar visualmente, em sessão administrativa real:

1. Login do administrador.
2. Navegação para Relatórios.
3. Navegação para Personalização.
4. Upload real de uma imagem.
5. Alteração de um texto e confirmação no site público.
6. Alteração temporária de cor e restauração.
7. Criação manual real.
8. Finalização e estorno de um atendimento real.
9. Layout do painel em celular e desktop.

Esses itens dependem da interação visual/autenticada do navegador e não foram marcados como aprovados sem execução real.
