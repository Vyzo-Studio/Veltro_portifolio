# VELTRO — Barber Atelier
## Demonstração fictícia desenvolvida pela VYZO Studio

**Status do projeto:** desenvolvimento seguro em branch — **NÃO PUBLICADO e NÃO pronto para vendas como sistema administrativo totalmente funcional**.

**Marca:** VELTRO — Barber Atelier (fictícia).  
**Direção visual:** carvão grafite, verde mineral, cobre envelhecido e marfim.  
**Contato comercial aprovado:** +55 61 8515-4156 (links usam o número exato `556185154156`, sem acrescentar dígitos). A existência de conta válida no WhatsApp ainda **não foi confirmada**.  
**Branch:** `work/vyzo-independent-demo-v2`.  
**Backup do antigo projeto:** `backup/pre-vyzo-demo-20261028`.  
**Data do relatório:** 28/10/2026.

## O que foi implementado

- Marca, logotipos SVG próprios, favicon, nova paleta, aviso destacado de projeto demonstrativo.
- Rebrand da página pública (início, navegação, serviços demonstrativos, fotografias de referência, portfólio, planos, rodapé, localização e CTA comercial VYZO).
- Substituição das antigas referências a telefone, Instagram, endereço e mapa por informações do conceito fictício e pelo canal comercial autorizado.
- Rebrand visual do HTML administrativo, inclusive login, cabeçalho, título e identidade compartilhada. Os componentes existentes de agendamentos, caixa, relatórios, horários e galerias permanecem no código.
- Política de Privacidade, Termos de Uso e traduções informativas para PT-BR, inglês, espanhol, japonês e alemão adequados a uma operação **fictícia**.
- Dados de demonstração: 13 serviços, dois profissionais inventados e quatro imagens ilustrativas, sem copiar clientes ou empregados.
- Reserva de **simulação, limitada ao sessionStorage desta aba**, sem salvar nome/telefone na reserva demonstrativa e sem enviar requisições ao Supabase anterior.
- **Fail closed** para a administração: `window.VELTRO_BACKEND.ready=false` e URL/chave vazias. Nenhum Auth de outra empresa é usado.
- Transformação da automação SEO antiga: sem consulta ao banco GNG, sem avaliações/LocalBusiness fictício; tipo `CreativeWork`; `noindex,nofollow` até o ambiente separado ser concluído.
- Remoção dos ativos de marca originais e dos SQLs/testes legados **da branch**, com recuperação integral pela branch backup.

## Backend e painel — o que ainda NÃO está pronto

**Não existe projeto Supabase exclusivo VELTRO.** Os únicos projetos identificados na conta conectada eram GNG Barbearia e Haus Barber, ambos inadequados como banco da demonstração.

Portanto, a versão da branch **não permite login administrativo real**, não sincroniza dados entre navegadores e não persiste agendamentos, alterações de serviços, bloqueios, galerias, caixa ou pagamentos em um banco independente. As interfaces administrativas permanecem no código para migração futura, mas **não foram validadas em operação com backend dedicado**.

A implantação segura ainda exige, nesta ordem:

1. Escolher e aprovar a organização Supabase para criação de um novo projeto VELTRO e aprovar eventual custo informado pelo provedor.
2. Portar e adaptar esquema, funções e políticas RLS a um banco **novo e vazio**, sem migrar dados ou credenciais da GNG; criar bucket separado e autenticação administrativa própria.
3. Criar usuários administrativos reais autorizados pelo UID de Supabase Auth, nunca hardcode de credenciais.
4. Inserir apenas dados fictícios, com rastreabilidade de simulação.
5. Configurar `demo-backend-config.js` com **somente URL pública e publishable key do projeto VELTRO**, nunca secret/service_role; atualizar CSP para o novo hostname.
6. Testar ponta a ponta admin, pagamentos presenciais fictícios, pagamentos divididos, relatórios, caixa, conflito de agenda, upload, bloqueios e SEO de integração, em ambiente isolado.
7. Rever as páginas jurídicas e consentimentos ao ativar tratamento efetivo de dados.
8. Publicar em um endereço de demonstração separado, com URL apropriada, evitando manter ou associar a vitrine à empresa anterior.

A criação e seleção da organização Supabase é uma etapa que requer confirmação do proprietário conforme o conector; nenhum projeto novo foi criado nem qualquer registro do banco anterior alterado.

## Fotografias ilustrativas e créditos

Imagens vinculadas por URLs de `images.unsplash.com`; licença consultada na Unsplash, que permite uso comercial em projetos, sujeita às suas condições. **Não representam a antiga empresa nem uma loja VELTRO real**.

- Mehdi pezhvak — fotografia ilustrativa de atendimento: Unsplash `RxEjW5oADRk`, URL `photo-1747832910187-f27508ac4c60`.
- TinPics_ — fotografia ilustrativa de corte: Unsplash `NXyCiopqAb0`, URL `photo-1721697956161-f1584fad9d37`.
- Barney Goodman — ambiente de barbearia: Unsplash `AXurvQTtO3Y`, URL `photo-1781455793310-8427c96454c7`.
- Redd Francisco — referência visual de barbearia: Unsplash `BBGyxhtPpC0`, URL `photo-1702865272115-5afdbae975af`.

Os servidores de imagem podem processar dados técnicos ao entregar fotografias; o funcionamento de CDN externo não está sob controle da VYZO.

## Segurança e separação dos dados

- Nenhuma atualização do Supabase GNG ou Haus foi aplicada.
- O código VELTRO não inclui URL/chave do banco GNG; as páginas jurídicas não consultam sua configuração pública.
- O login do painel fica inacessível por design enquanto não houver projeto isolado. Não há administrador público irrestrito, nem senha de demonstração embutida.
- Os dados fictícios da reserva são registrados somente em `sessionStorage` e são apagados quando a sessão da aba termina. O formulário pode oferecer opção separada de guardar nome/telefone localmente por até 90 dias no navegador; o usuário deve consentir.
- Nunca se deve vender, publicar ou demonstrar o painel como conectado/persistente antes de conclusão e testes de integração.

## Critérios de QA

`node tests/veltro-demo-isolation.test.cjs` inspeciona a identidade e verifica localmente reservas de exemplo, conflito, recusa em domingos e negação de RPCs administrativas.

`tests/veltro-demo-browser.spec.cjs` visita o servidor local de teste com Chromium, cobre a interface pública e a tela de login (sem autenticação real), layouts mobile/tablet/desktop, páginas jurídicas e ausência de requisições ao Supabase antigo.

Workflow: `.github/workflows/veltro-demo-qa.yml`. Um teste só pode ser considerado aprovado após resultado **success** na execução correspondente ao commit final. O fluxo original de QA do cliente foi removido desta branch; seu histórico permanece no backup.

## Riscos restantes

- **Bloqueador:** novo Supabase e autenticação exclusiva ainda não provisionados.
- **Bloqueador:** painel e financeiro não são funcionais até migração/validação independente das RPCs e RLS.
- **Pendente:** confirmação de funcionamento do WhatsApp informado.
- **Pendente:** verificação humana de traduções e licenças de futuros ativos.
- **Pendente:** testes de segurança de backend e desempenho de produção após criação e conexão do novo projeto.

O projeto só deve ser considerado concluído quando o banco próprio estiver funcional e todos os testes críticos passarem sem conexão com a antiga empresa.
