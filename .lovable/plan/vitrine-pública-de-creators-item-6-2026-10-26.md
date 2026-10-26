# Vitrine pública de creators (item 6)

## Objetivo
Permitir que o Google e visitantes sem login encontrem os creators que quiserem aparecer, com uma página pública simples por creator. Hoje as páginas de perfil só abrem com login.

## Como fica para o creator
- Em Configurações → Privacidade, uma nova opção desligada por padrão: "Mostrar meu perfil na vitrine pública".
- Ao ligar, o pedido vai para aprovação do admin. Até lá, nada fica público.
- O creator pode desligar a opção quando quiser, e a página sai do ar na hora.

## Como fica para o admin
- No painel do admin, uma lista "Vitrine pública" com os pedidos pendentes, mostrando foto, capa, nome e bio.
- Botões para Aprovar e Recusar. Também é possível tirar da vitrine um perfil já aprovado.
- Se o creator trocar a foto, a capa ou a bio, o perfil volta para a aprovação antes de mudar na vitrine.

## O que aparece na página pública
- Nome, @usuário, foto, capa, bio e preço da assinatura.
- Nenhum conteúdo pago, nenhuma prévia de publicação e nenhum número de seguidores.
- Botão "Assinar" ou "Ver perfil completo", que leva ao cadastro e ao login normais e depois ao perfil de sempre.
- Aviso de conteúdo para maiores de 18 anos na página.

## Páginas novas
- `/creators`: lista dos creators aprovados, com busca por nome.
- `/c/<usuário>`: a página pública de cada creator.
- Cada página tem um título e uma descrição próprios para o Google e o WhatsApp, por exemplo "Fulana (@fulana) · Monetisexy".
- A lista de páginas enviada ao Google passa a incluir automaticamente os creators aprovados.

## O que não muda
- A página inicial e o visual atual continuam iguais.
- O perfil completo e o conteúdo continuam exigindo login.

## Detalhes técnicos
- Em `creator_profiles`, adicionar as colunas `public_listing` (bool, padrão false), `public_listing_status` ('pending' | 'approved' | 'rejected') e `public_listing_reviewed_at`.
- Usar um trigger para voltar a 'pending' quando avatar, capa, bio ou nome mudarem.
- Criar a RPC SECURITY DEFINER `public_creator_directory(_search, _limit, _offset)` e a RPC `public_creator_by_username(_username)`. Elas devolvem só as colunas seguras e apenas quando `public_listing = true` e o status for 'approved'. Liberar EXECUTE para anon, sem SELECT direto em `creator_profiles` para anon.
- Criar as rotas públicas `src/routes/creators.tsx` e `src/routes/c.$username.tsx`, com SSR. O loader chama um `createServerFn` com o cliente publicável, e o `head()` é montado a partir dos dados. O `og:image` vem da capa, que é uma URL absoluta do storage. Também entram canonical, JSON-LD `ProfilePage` e `notFound()` com noindex quando o creator não estiver aprovado.
- Trocar `public/sitemap.xml` por uma rota `src/routes/sitemap[.]xml.ts`, que gera as páginas fixas e os creators aprovados, e remover o arquivo estático.
- Ativar a opção em `settings.privacy-options.tsx`, via `privacy.functions.ts`.
- Criar a tela `admin.directory.tsx`, com server functions que conferem `has_role` de admin antes de aprovar ou recusar.
- Reenviar o sitemap no Search Console depois de publicar.
