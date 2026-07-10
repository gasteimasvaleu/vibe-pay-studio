## Nova página `/settings/social-media`

Acessada ao clicar em "Redes Sociais" em `/settings/myprofile`.

### Arquivos

**Criar** `src/routes/_authenticated/settings.social-media.tsx`
- Rota autenticada, `noindex`, título "Redes Sociais · Monetisexy"
- Header padrão (border-b, back button, título "Redes Sociais")

**Editar** `src/routes/_authenticated/settings.myprofile.tsx`
- Adicionar `to="/settings/social-media"` no `SettingsRow` "Redes Sociais"

### Layout (seguindo o screenshot)

`main max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3 pb-28`:

Três campos com o mesmo padrão (`rounded-2xl bg-muted px-5 py-3 flex items-center gap-3`), cada um com ícone à esquerda e `Input` sem borda/background (`border-0 bg-transparent p-0 h-auto text-base shadow-none focus-visible:ring-0`):

1. **Instagram** — ícone `Instagram` (lucide), placeholder `instagram.com/`, state `instagram`.
2. **TikTok** — SVG inline do logo TikTok (não existe no lucide-react), placeholder `tiktok.com/(seu @)`, state `tiktok`.
3. **X** — SVG inline do logo X (Twitter), placeholder `x.com/(seu @)`, state `x`.

Cada input sanitiza para minúsculas + `[a-z0-9_.]` e limite 30 chars.

**Barra fixa "Salvar"** no rodapé: `fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20` com `Button` largura total `h-12 rounded-full`, desabilitado quando nenhum campo mudou; onClick → `toast.info("Em breve")`.

Sem backend nem outras alterações.
