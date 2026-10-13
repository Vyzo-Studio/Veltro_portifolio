# Correções de confiabilidade — GNG Barbearia

Este pacote parte exatamente do ZIP `gng_barbearia-main.zip` fornecido e corresponde aos arquivos do branch `main` consultados em 12/10/2026. O pacote foi enviado a uma branch de revisão no GitHub; não foi incorporado à main nem publicado em produção.

## Alterações

- `script.js`: consultas de horários falham em modo seguro; dados inesperados são tratados como erro; respostas obsoletas não sobrescrevem o estado atual; envio permanece bloqueado enquanto a disponibilidade não estiver confirmada; sucesso no cadastro é independente da abertura do WhatsApp; cliente recebe link manual de continuidade.
- `style.css`: interface discreta para mensagens persistentes de sucesso e erro.
- `index.html`: versões de cache atualizadas para JavaScript e CSS público.
- `admin.js`: chamadas concorrentes de mutação para a mesma reserva são agrupadas ou bloqueadas, evitando duplicação no cliente; mensagem de estorno passa a informar que o registro contábil não faz uma devolução financeira automática.
- `admin-barbers.js`: disponibilidade administrativa desativada em falhas, prevenção de resultados assíncronos antigos, bloqueio de repetição de formulários e remoção de interceptação global de `supabaseClient.rpc`.
- `admin-notifications.js`: consulta diretamente a RPC `admin_list_active_pending_bookings_v2` e exibe o profissional sem interceptar o cliente compartilhado.
- `config.js`, `admin.html`: versões dos scripts de administração atualizadas para invalidar cache.
- `tests/*.test.cjs`: testes isolados de falhas, concorrência e dupla mutação.

## Testes realizados

- `node --check` para todos os arquivos JavaScript: passou.
- `node tests/booking-reliability.test.cjs`: passou.
- `node tests/admin-mutations.test.cjs`: passou.

## Limitações e validações obrigatórias

A implementação SQL das RPCs e políticas RLS não faz parte do ZIP. O projeto Supabase apareceu como `INACTIVE` e a tentativa de conexão SQL terminou em timeout. Não foi possível verificar nem corrigir regras de concorrência, durações, autorização ou estornos no banco.

É obrigatório testar o sistema com o Supabase ativo antes de publicar. Execute reserva pública, troca rápida de barbeiro, conflito de horários com duração, criação manual, bloqueios, confirmação, cancelamento, finalização, registro de estorno e notificações, em desktop e celular. A proteção de mutações no JavaScript não substitui idempotência transacional no backend.

## Como executar testes locais

```bash
node --check script.js
node --check admin.js
node --check admin-barbers.js
node --check admin-notifications.js
node --check config.js
node tests/booking-reliability.test.cjs
node tests/admin-mutations.test.cjs
```

## Publicação

Revise o pull request da branch `fix/booking-reliability-2026-10`, execute os testes no ambiente e valide os fluxos com Supabase ativo antes de integrar à branch `main`.
