# Mostrar ao creator o link da página pública

Hoje o creator não vê o endereço da página pública em nenhum lugar do app.

## O que muda
- Em Configurações → Privacidade, logo abaixo da opção "Mostrar meu perfil na vitrine pública", quando o perfil estiver aprovado:
  - aparece o link, por exemplo `monetisexy.com/c/fulana`;
  - um botão **Copiar link**;
  - um botão **Compartilhar**, que no celular abre o menu do aparelho (WhatsApp, Instagram etc.);
  - um botão **Abrir**, para ver a página como os visitantes veem.
- Enquanto o perfil aguarda aprovação ou foi recusado, o link não aparece. No lugar dele fica o aviso atual.

## Detalhes técnicos
- `getMyPublicListing` passa a devolver também o `username` do perfil ativo.
- Na `PublicListingToggle` (`settings.privacy-options.tsx`), mostrar o bloco do link quando `enabled && status === 'approved'`. Usar `navigator.clipboard` para copiar, com toast, e `navigator.share` quando existir. A URL fixa é `https://monetisexy.com/c/<username>`.
