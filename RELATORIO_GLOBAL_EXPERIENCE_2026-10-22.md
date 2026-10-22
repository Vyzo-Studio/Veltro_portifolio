# GNG Barbearia — Global Experience V1.0
**Implementação:** 22 de outubro de 2026  
**Projeto:** https://github.com/Vyzo-Studio/gng_barbearia  
**Site:** https://vyzo-studio.github.io/gng_barbearia/  
**Admin:** https://vyzo-studio.github.io/gng_barbearia/admin.html  
**Ponto de restauração do código:** `backup/pre-global-experience-20261022`

## Resumo
Implementação de privacidade, termos, aviso de cookies na primeira visita, consentimento para Google Maps, lembrança opcional de nome/telefone e tradução de interface para português (Brasil), inglês, espanhol, japonês e alemão. O HTML/CSS/JavaScript original e a identidade azul-marinho da GNG foram preservados. A arquitetura continua GitHub Pages + Supabase; não foi criado novo banco de clientes ou gateway de pagamentos.

## 1. Funcionalidades implementadas

### Política de Privacidade
- Página preservada e ampliada: `privacidade.html`.
- Documenta coleta de nome, telefone e dados de agendamento; uso para gestão do atendimento; fornecedores Supabase/GitHub/Google Maps/WhatsApp e fontes/imagens externas; transferência internacional já descrita; direitos da LGPD.
- Informa que o idioma e o tema são preferências locais; que a opção de lembrar contato é independente dos cookies de terceiros e retém nome/telefone por **até 90 dias**, com exclusão imediata; que a decisão de conteúdo externo dura **até 180 dias**.
- Traduções internacionais informativas acessíveis pelo seletor de idioma via `legal-i18n.js`.
- **Pendente de validação pela GNG:** identidade jurídica empresarial detalhada e política operacional definitiva de retenção no banco; o conteúdo não equivale a parecer jurídico ou certificação LGPD.

### Termos de Serviço
- Criada `termos.html`, com os mesmos componentes visuais, navegação e suporte a cinco idiomas.
- Explica solicitação pendente, confirmação dependente do estabelecimento, funcionamento de segunda a sábado, domingo fechado, contato do cliente, preços informativos e pagamentos **exclusivamente presenciais**.
- Não foram inventados prazos de cancelamento, multas, penalidades ou reembolsos.
- **A confirmar:** regras específicas de cancelamento, atraso, reagendamento e adesão aos planos.

### Consentimento e cookies
- `privacy.js` foi unificado (substituiu controles limitados a Google Maps).
- Aviso na primeira visita sem decisão existente, com ações igualmente disponíveis: **Aceitar todos**, **Rejeitar opcionais**, **Personalizar**.
- A categoria necessária é informativa; a categoria opcional corresponde ao conteúdo externo **Google Maps**, único embed rastreável controlado por esta implementação.
- Não foram adicionados rastreadores de estatísticas ou publicidade.
- Preferência salva em `localStorage` com versão e prazo máximo de **180 dias**, migrando preferência explícita anterior de mapas.
- Rodapé abre as preferências novamente e permite consentimento ou revogação. Sem consentimento, iframe não possui URL de Google Maps; após revogação, o iframe é desativado. Cookies já criados pelo Google fora do controle do site não podem ser apagados por este sistema.
- Diálogo nativo com retorno de foco, rótulos e ações nos cinco idiomas.

### Preenchimento automático do cliente
- `customer-memory.js` adiciona a opção **Lembrar meus dados neste dispositivo**, desmarcada inicialmente.
- Somente **nome e telefone** são guardados em `localStorage` no navegador após retorno bem-sucedido da RPC de agendamento, quando a escolha voluntária estiver marcada.
- Registro com versão e prazo máximo de **90 dias**; nome e telefone continuam editáveis; desmarcar ou clicar em **Esquecer meus dados deste dispositivo** remove o registro local.
- Sem credenciais, detalhes bancários, histórico de reserva ou sincronização entre dispositivos. Sem consentimento opcional para lembrar, não grava dados de contato. A opção não interfere no sucesso da reserva caso o armazenamento local falhe.
- Em dispositivo ou perfil compartilhado, outras pessoas com acesso ao mesmo navegador podem visualizar os dados; `localStorage` não é criptografado nem isolado entre caminhos de um mesmo domínio.

### Idiomas
- `i18n.js` centraliza um dicionário de **183 mensagens** nos cinco idiomas e reage a conteúdo criado dinamicamente.
- Tradução de menus, botões, seções, rodapé, estado do formulário, avisos de agendamento, datas do calendário, rótulos de acessibilidade e controles de consentimento/lembrança.
- Páginas jurídicas têm conteúdo informativo traduzido nos quatro idiomas adicionais.
- A preferência é mantida neste navegador pela chave `gng_barbearia_locale_v1`, independentemente de consentimento de marketing.
- O documento atualiza `lang` e título, sem recarregar a página para trocar idioma; os testes confirmaram preservação de dados digitados.
- **Fallback deliberado:** nomes comerciais e descrições oriundos do Supabase permanecem no idioma oficial cadastrado até que a empresa forneça traduções validadas; não são gerados nomes comerciais artificiais ou preços convertidos. Alguns textos ainda dependentes de conteúdo configurado pelo administrador seguem esse fallback.

## 2. Responsividade e acessibilidade
- Rodapé reorganizado em múltiplas colunas no celular; dropdown acessível por clique, toque ou teclado.
- CSS novo `experience.css` reutiliza paleta navy, tipografia e breakpoints. Inclui estilos claro e escuro, foco visível, diálogos responsivos, quebra de palavras compridas em alemão e fontes japonesas do próprio dispositivo.
- Teste Chromium automatizado em **320, 375, 390, 430, 768, 1024, 1366 e 1920 px**, nos cinco idiomas, sem rolagem horizontal detectada.
- Testes axe nas páginas pública e de login administrativo, nos temas claro/escuro e tamanhos testados, sem violações detectadas; isso **não equivale à auditoria WCAG 2.2 AA integral**.

## 3. Arquivos criados/alterados
**Criados:** `termos.html`, `customer-memory.js`, `i18n.js`, `legal-i18n.js`, `experience.css`, `tests/global-experience.spec.cjs`.

**Atualizados:** `index.html`, `privacidade.html`, `privacy.js`, `script.js`, `site-data.js`, `sitemap.xml`, `scripts/validate-static.py`, `tests/browser.spec.cjs`, `tests/accessibility.spec.cjs`, `.github/workflows/gng-qa.yml`, `.github/workflows/gng-browser-qa.yml`.

**Banco:** Nenhuma migração nem modificação de esquema ou configuração Supabase neste escopo. Os dados comerciais existentes permanecem a fonte da verdade.

## 4. Testes, evidências e limitações
- GitHub Actions **GNG QA Regression** passou na verificação de sintaxe JavaScript, testes de agendamento, mutações administrativas, pagamentos manuais, autenticação simulada, SEO e análise estática HTML/CSS/SQL.
- Chromium **GNG Browser QA**, execução https://github.com/Vyzo-Studio/gng_barbearia/actions/runs/39727473373, terminou com **18 testes aprovados**. Incluíram consentimento inicial (aceitar/rejeitar/personalizar), retorno com preferência, retirada da permissão de mapa, teste de armazenamento local com simulação da etapa de sucesso, exclusão de dados, mudanças de idioma e páginas jurídicas, dimensões diversas e verificações gerais.
- O teste de memória utilizou **chamada simulada do gancho local**, **não agendou atendimento real**. O código de gravação está conectado após sucesso da RPC; não foi submetida reserva real em produção como teste.
- **Consulta final ao banco:** 0 agendamentos e 0 transações de pagamento de teste; administrador original mantido vinculado.
- Navegação no site foi executada em Chromium real, mas sem login real de proprietário, e com dados externos sujeitos à configuração publicada.
- O teste no navegador não prova revisão humana da qualidade de todas as traduções e estados futuros do sistema.
- O app mantém conteúdo externo preexistente (fontes, imagens e links) que pode compartilhar dados técnicos usuais. O sistema de consentimento controla especificamente o Google Maps, sem prometer apagar cookies de terceiros.

## 5. Publicação
Todas as alterações foram comitadas na `main` e a branch de backup foi criada antes das mudanças. Foi verificada implantação bem-sucedida do código da experiência em GitHub Pages e execução automatizada aprovada. A última confirmação do deploy pode ser consultada em **Actions → pages build and deployment**; qualquer execução ainda pendente deve ser registrada como não verificada, sem prometer disponibilidade imediata.

## 6. Conclusão
**Concluído para as funcionalidades implementadas e para o escopo efetivamente testado.** Não certifica juridicamente a política, não altera pagamentos/agenda e não garante que traduções livres de erros comerciais existam para cada futuro conteúdo administrativo. Antes de divulgação jurídica definitiva, GNG deve confirmar os campos comerciais indicados.
