Adicionar uma navbar superior global em todas as páginas autenticadas.

## Novo componente `src/components/site/TopNav.tsx`
Barra fixa no topo, `sticky top-0 z-40`, fundo `bg-card/80 backdrop-blur` com border-bottom. Container `max-w-3xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between`.

- **Esquerda**: `<Link to="/feed">` com `<img>` da logo Monetisexy:
  `https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/monetisexy2..png` (altura ~28px, `alt="Monetisexy"`).
- **Direita**: `<Link to="/dashboard">` com avatar circular 36px (inicial do username em fallback com `bg-gradient-primary`, `text-primary-foreground`). Buscar username via `supabase.auth.getUser()` no `useEffect` do componente, com estado local; enquanto carrega, mostra o círculo sem letra.

## Integração
Editar `src/routes/_authenticated/route.tsx` para renderizar `<TopNav />` acima do `<Outlet />`:
```tsx
<div className="pb-24">
  <TopNav />
  <Outlet />
  <BottomNav />
</div>
```

## Não altero
- Headers internos existentes das páginas (com botão voltar/título) permanecem — a `TopNav` fica acima deles. Ajuste de duplicidade não faz parte deste pedido.
- Páginas públicas (fora de `_authenticated`) não recebem a navbar.