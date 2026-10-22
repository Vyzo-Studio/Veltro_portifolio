# GNG BARBEARIA — Manutenção preventiva incremental (22/10/2026)

**Repositório:** https://github.com/Vyzo-Studio/gng_barbearia  
**Site:** https://vyzo-studio.github.io/gng_barbearia/  
**Painel:** https://vyzo-studio.github.io/gng_barbearia/admin.html  
**Backup do código:** `backup/pre-preventive-audit-20261022`  
**Escopo deste ciclo:** problemas reproduzidos na sincronização pública de serviços/galerias, texto SEO e verificação de contatos jurídicos. **Não é uma certificação integral dos 28 itens da inspeção ampliada**, nem substitui os relatórios de QA V3 e V4.

## Correções efetivamente implementadas

1. **Listas vazias não mantêm anúncios antigos** (`site-data.js`). Um retorno válido `services: []` agora remove os serviços estáticos anteriores, exibe mensagem neutra e esvazia o seletor de agendamento, que permanece sem permitir envio. Um retorno válido `gallery: []` remove fotos antigas de portfólio e espaço e mostra estados vazios. Se a API não responder ou omitir o array, o fallback atual é preservado, sem interpretar falha de rede como decisão do administrador. Serviço anteriormente selecionado é limpo quando não está mais na lista.
2. **SEO com dias em português** (`scripts/sync-seo.cjs`, `tests/seo-sync.test.cjs`). Descrição para usuários e compartilhamento usa “De segunda a sábado”; `dayOfWeek` em schema.org mantém os nomes padronizados em inglês. Testes de escaping, idempotência, seis dias abertos e ausência de domingo preservados.
3. **Contatos do site e documentos jurídicos** (fluxo já disponível em `legal-contact.js` e `legal-i18n.js`). Confirmada a origem em `get_public_site_config`, com link de WhatsApp construído somente a partir de número validado; na indisponibilidade da API há link neutro para a seção de localização, não um telefone antigo inventado. Foram adicionados dois testes de navegador em `tests/global-experience.spec.cjs` para telefone fictício configurado pelo painel, idioma português/inglês e indisponibilidade de API. O teste foi ajustado para respeitar que a preferência de idioma persiste ao navegar entre páginas; isso foi correção da expectativa de teste, não alteração do produto.

## Arquivos deste ciclo

- **Alterados na aplicação:** `site-data.js`, `scripts/sync-seo.cjs`.
- **Testes:** `tests/browser.spec.cjs` (estado vazio, em versão recente), `tests/seo-sync.test.cjs`, `tests/global-experience.spec.cjs` (contato jurídico e fallback).
- **Sem migrações SQL, sem mudança de RLS/Auth e sem lançamento financeiro.**

## Validação e evidência

- GitHub Actions **GNG QA Regression**: sucesso no commit `ad3c53ff5e2803ecfc635537d60fc7f1ae59bd39`, execução https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39835465349.
- GitHub Pages: implantação bem-sucedida do mesmo commit, execução https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39835464625.
- Chromium: execução anterior https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39833928850 — **22/22 testes aprovados** para a fase inicial dos estados vazios; a execução https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39835114209 passou **23/24**, com falha restrita à expectativa que não considerava o idioma persistido. Após a correção, uma nova execução https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39835465321 foi iniciada. **Não marcar como aprovada sem verificar a conclusão.**
- Verificação somente de leitura no Supabase: **0 reservas** e **0 registros financeiros** persistidos, **1 caixa aberto já existente**, **1 administrador ativo vinculado ao UID** e **3 rotinas automáticas ativas**. Nenhum desses registros foi alterado neste ciclo.

## Segurança / pendências fundamentadas

- Advisor Supabase ainda registra **4 advertências** sobre `SECURITY DEFINER` com execução anônima, **40** com execução autenticada e **1** de proteção contra senhas comprometidas desativada. Avisos de função privilegiada não são prova automática de exploração; revisão por contrato ainda é necessária.
- Performance advisor registra **3 índices não utilizados (INFO)**. Excluir sem medir o custo real ou conhecer cargas de trabalho pode prejudicar o sistema; nenhum índice foi removido.
- Não foi executado login real no painel administrativo, simulação de compras/pagamentos reais nem stress de operações simultâneas.
- Documentos jurídicos, traduções de conteúdo comercial vindo do painel e política operacional de retenção ainda precisam de revisão responsável pela GNG.
- Não houve teste de autenticação por conta real, nem certificação LGPD/WCAG plena.
- **Prontidão:** correções pontuais implementadas e parcialmente validadas; homologação geral de todas as funcionalidades não concluída. Preserve o backup e exija evidências dos testes críticos antes de declarar o projeto plenamente aprovado.
