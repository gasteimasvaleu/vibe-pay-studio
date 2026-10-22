# Criar as 4 páginas do rodapé

Criar Imprensa, Uso da Marca, Parcerias e Agências no mesmo estilo das páginas Sobre e Contato: mesmo topo e rodapé, botão "Voltar", título grande e seções de texto. O design atual não muda.

## Páginas
- **/imprensa**: quem somos em poucas linhas, números e fatos sobre a plataforma, kit de imprensa (logo) e e-mail para jornalistas.
- **/uso-da-marca**: como usar o nome e o logo Monetisexy (o que pode e o que não pode), cores e versões do logo, e o contato para pedir autorização.
- **/parcerias**: tipos de parceria (marcas, influenciadores, sites de review e comparativos), o que oferecemos e um botão que leva ao formulário de Contato.
- **/agencias**: o que a agência ganha ao gerenciar creators na plataforma (85% para o creator, saque via PIX, painel de estatísticas) e um botão para falar com a equipe pelo Contato.

## Rodapé
Os links "Imprensa", "Uso da Marca", "Parcerias" e "Agências" passam a abrir essas páginas. Os ícones das redes sociais ficam como estão até você mandar os endereços.

## Outros detalhes
- Cada página ganha título e descrição próprios para o Google e o WhatsApp, e entra na lista de páginas enviada ao Google.
- Os textos serão escritos por mim. Os e-mails de contato (por exemplo imprensa@monetisexy.com) são sugestões. Me envie os endereços reais e eu troco.

## Technical details
- New route files: `src/routes/imprensa.tsx`, `uso-da-marca.tsx`, `parcerias.tsx`, `agencias.tsx`, wrapped in `SiteLayout` and using the `sobre.tsx` article structure and semantic tokens.
- Each `head()` sets title, description, og:title, og:description, og:type, twitter:card, og:url and a canonical link pointing to `https://monetisexy.com/<slug>`.
- `Footer.tsx`: replace the `#` hrefs with the new paths.
- `public/sitemap.xml`: add the 4 URLs.
