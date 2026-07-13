## Objetivo
Tornar o background do campo de busca na página `/subscriptions` branco, conforme padronização visual do app.

## Contexto
O usuário selecionou o input de busca no preview da rota `/subscriptions`. Atualmente o componente `Input` usa `bg-muted`, que renderiza um cinza. O padrão adotado nas páginas recentes é background branco (`bg-white`).

## Alteração proposta
No arquivo `src/routes/_authenticated/subscriptions.tsx`, na classe do componente `<Input />` de busca (linha 80), substituir `bg-muted` por `bg-white`.

### Trecho atual
```tsx
<Input
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Pesquisar"
  className="h-12 rounded-2xl border-transparent bg-muted pl-11 text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
/>
```

### Trecho esperado
```tsx
<Input
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Pesquisar"
  className="h-12 rounded-2xl border-transparent bg-white pl-11 text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
/>
```

## Validação
- Verificar visualmente no preview se o input de busca na página Assinaturas ficou com background branco.
- Confirmar que o build/typecheck continua passando.