## Objetivo

Criar o dashboard do assinante na rota autenticada, combinando:
- **Topo**: mesmo cabeçalho de perfil já implementado em `/perfil/$username` (topbar, cover com gradiente, avatar sobreposto, stats, nome + selo, @handle, localização, ícones sociais) — mas exibindo o perfil do próprio usuário logado, sem o CTA "Assinar" (é o dono).
- **Abaixo**: seção "Área do Assinante" com grade 2 colunas (1 no mobile) de cards clicáveis — Chat, Assinaturas, Carteira, Atividades, Definições, Ajuda e Sair — adaptados ao tema escuro roxo/fúcsia.

## Rota

Nova rota `src/routes/_authenticated/assinante.tsx` → URL `/assinante`.

- `beforeLoad`: verifica sessão, carrega `profiles` do usuário, e redireciona para `/creator` se `account_type === "creator"`.
- Retorna `{ userId, username, accountType }` no contexto.
- Inclui `errorComponent`.

Após login, `homeForAccountType("subscriber")` já aponta para o dashboard do assinante — atualizar esse helper para retornar `/assinante` (hoje deve retornar `/feed`), garantindo que assinantes caiam nessa página ao entrar.

## Layout

Estrutura de container idêntica ao `/perfil/$username` (bg escuro + gradient radial + grid de pontos, topbar com voltar/título/menu).

**Bloco 1 — Perfil (topo)**
Reutilizar visualmente o header do perfil já feito:
- Cover em gradiente roxo→fúcsia com cantos arredondados.
- Avatar circular grande sobreposto, borda `bg-background`.
- Chip de stats no canto direito da capa (Fotos, Vídeos, Bloqueados, Curtidas — mock).
- Bloco de identidade: Nome + `BadgeCheck`, @handle, `MapPin` + localização, 3 botões sociais.
- **Sem** botão "Assinar" (é o próprio dono). Opcional: link discreto "Ver meu perfil público" apontando para `/perfil/{username}`.

Para evitar duplicação, extrair o header numa componente reutilizável `src/components/profile/ProfileHeader.tsx` e usar em ambas as rotas (`/perfil/$username` e `/assinante`). Props: `username`, `displayName`, `location`, `stats`, `isOwner`, `subscriptionPrice?`.

**Bloco 2 — Área do Assinante**
- Título "Área do Assinante" (`text-2xl font-black tracking-tight`).
- Grid `grid-cols-1 md:grid-cols-2 gap-4`.
- Cada card: `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5`, com hover realçando borda e leve gradient. Ícone num quadrado `rounded-xl bg-white/5 border border-white/10` com cor `text-fuchsia-300`, título em `font-semibold`, descrição em `text-sm text-white/60`.
- Cards e destinos:
  - **Chat** — `MessageCircle` — "Converse com creators agora" → `/chat` (placeholder por enquanto, sem navegação real; card não navega ainda).
  - **Assinaturas** — `UserPlus` — "Veja os creators que você assina".
  - **Carteira** — `Wallet` — "Escolha como paga e veja seus gastos".
  - **Atividades** — `Bookmark` — "Acesse suas mídias favoritas salvas".
  - **Definições** — `Settings` — "Personalize sua experiência".
  - **Ajuda** — `HelpCircle` — "Precisa de suporte ou tem dúvidas?".
  - **Sair** — `LogOut` — "Sair da plataforma" — em cor de destaque (`text-fuchsia-400`), executa `supabase.auth.signOut()` e redireciona para `/`.

Como as rotas de destino ainda não existem, os cards (exceto Sair) renderizam como `<button>` inertes com cursor default, prontos para virar `<Link>` quando as páginas forem criadas — evita quebra de tipo do TanStack Router.

## Adaptação ao tema

- Fundo escuro (mesmos tokens do `/feed`), sem branco.
- Ícones e títulos em branco/roxo; descrições em `text-white/60`.
- Card "Sair" mantém o mesmo estilo dos demais, mas com ícone e título em `text-fuchsia-400` (equivalente ao vermelho do mockup).

## Arquivos

```text
src/components/profile/ProfileHeader.tsx   (novo — extraído do perfil)
src/routes/_authenticated/assinante.tsx    (novo)
src/routes/_authenticated/perfil.$username.tsx  (refatorar para usar ProfileHeader)
src/lib/auth.ts                             (ajustar homeForAccountType → /assinante)
```

## Fora de escopo

- Páginas de destino dos cards (Chat, Assinaturas, Carteira, Atividades, Definições, Ajuda).
- Dados reais de stats/assinaturas.
- Upload de avatar/cover.
