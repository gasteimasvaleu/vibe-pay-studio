# Página `/profile/$username`

Criar nova rota de perfil público acessada pelo botão "Meu Perfil" no dashboard, seguindo os screenshots 1 e 3 (a imagem laranja do screenshot 2 é conteúdo da página clonada e será ignorada).

## Arquivos

**Novo:** `src/routes/_authenticated/profile.$username.tsx`
- Rota dinâmica com `createFileRoute("/_authenticated/profile/$username")`
- Lê `username` via `Route.useParams()`
- `head()` com título "@username · Monetisexy"

**Editar:** `src/components/dashboard/CreatorDashboard.tsx`
- Adicionar `to={`/profile/${username}`}` no `ActionCard` "Meu Perfil" (linha 40-44)

## Layout da página (mobile-first)

```
┌─────────────────────────────────┐
│ ←    Meu perfil            ⋮   │  header
├─────────────────────────────────┤
│ ░░░ cover pattern bege ░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ 🖼 1│
│ (•)                             │  avatar circular sobreposto
│                                 │
│ Nome                            │
│ @username                       │
│ bio                             │
│                                 │
│ ┌───────────────────────────┐  │
│ │      Editar perfil         │ │  botão pill
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ 📱 1 Postagens │ 🎬 1 Mídias   │  tabs (Postagens ativo, underline laranja)
└─────────────────────────────────┘
```

### Componentes/elementos
- **Header**: `ArrowLeft` (voltar → `/dashboard`), título "Meu perfil" centrado, `MoreVertical` à direita que abre dropdown (screenshot 3):
  - Posts agendados (`CalendarCheck`)
  - Arquivados (`Archive`)
  - Editar perfil (`Settings`) → navega para `/settings/myprofile`
  - Solicitar verificação (`BadgeCheck`)
  - Usa `DropdownMenu` do shadcn
- **Card de perfil** (rounded-2xl, border):
  - Cover: altura ~140px, fundo bege com padrão de logos "m" repetidos (usar `bg-muted` + SVG pattern inline ou `bg-repeat` simples)
  - Avatar: 96px, circular, borda branca 4px, posicionado sobrepondo cover (`-mt-12`, `ml-4`)
  - Contador de mídias no canto direito do cover: `ImageIcon` + "1"
  - Nome (h2 bold), `@username` (muted), bio (mock: "teste")
  - Botão "Editar perfil" full-width, pill, `bg-muted` → navega para `/settings/myprofile`
- **Tabs** (rounded-2xl separado):
  - "1 Postagens" (ativo, texto laranja, ícone `Smartphone`, underline laranja embaixo)
  - "1 Mídias" (inativo, ícone `Film`)
  - Estado `activeTab` local

## Mock data
Sem backend nesta iteração. Usar dados mock inline:
```ts
const profile = {
  name: "Caio",
  username: params.username,
  bio: "teste",
  avatarUrl: "/placeholder-avatar.png", // ou inicial
  postsCount: 1,
  mediasCount: 1,
};
```

## Notas técnicas
- Rota fica sob `_authenticated/` (perfil do próprio usuário logado)
- Sem alterar `BottomNav` — a página herda o shell autenticado
- Padding `pb-24` no container para não ficar atrás da BottomNav
