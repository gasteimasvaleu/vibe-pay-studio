## Nova página `/settings/details`

Acessada ao clicar em "Foto de capa, biografia e localização" em `/settings/myprofile`.

### Arquivos

**Criar** `src/routes/_authenticated/settings.details.tsx`
- Rota autenticada, `noindex`, título "Foto de capa, biografia e localização · Monetisexy"
- Header padrão (border-b, back button, título "Foto de capa, biografia e localização")

**Editar** `src/routes/_authenticated/settings.myprofile.tsx`
- Adicionar `to="/settings/details"` no `SettingsRow` "Foto de capa, biografia e localização"

### Layout (seguindo os screenshots)

`main max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4 pb-28` (padding-bottom para não sobrepor à barra fixa de salvar):

1. **Foto de capa** — banner `rounded-2xl h-40 md:h-48` com fundo gradiente cinza (`bg-gradient-to-b from-muted to-foreground/70`), botão redondo escuro (`h-14 w-14 bg-foreground text-background`) centralizado com ícone `Camera`. onClick → toast "Em breve".

2. **Sobre Mim** — container `rounded-2xl bg-muted px-5 py-4` com label "Sobre Mim" (`text-xs text-muted-foreground`) e `Textarea` sem borda/background dentro (`border-0 bg-transparent p-0 min-h-[180px] resize-none shadow-none focus-visible:ring-0`), `maxLength={3000}`, `useState`.
   - Contador `{value.length} / 3000` alinhado à direita abaixo do textarea (`text-xs text-muted-foreground text-right`).

3. **Localização** — container `rounded-2xl bg-muted px-5 py-3` com ícone `MapPin` à esquerda e `Input` "Localização" sem borda/background, `useState`.
   - Texto auxiliar `text-xs text-muted-foreground` abaixo: "Sua localização será exibida abaixo da biografia no seu perfil".

4. **Barra fixa de Salvar** — `fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20`, com `Button` largura total `h-12 rounded-full` texto "Salvar". Habilitado só quando algum campo foi alterado; onClick → toast.info("Em breve") (sem persistência agora).

Sem mudanças de backend nem em outros arquivos.
