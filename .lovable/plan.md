## Padronizar header de `/live/nova`

O header atual usa layout próprio (`h-16`, botão à esquerda, título logo ao lado). O padrão do app (ex. `/settings/change-password`, `/settings/privacy-options`) usa layout centralizado com `max-w-3xl`, título centralizado e spacer `w-9` à direita para balancear o botão de voltar.

### Mudança

Em `src/routes/_authenticated/live.nova.tsx` (linhas 46–51), substituir o header por:

```tsx
<header className="relative z-10 border-b border-border bg-card">
  <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
    <button
      type="button"
      onClick={() => navigate({ to: "/dashboard" })}
      className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label="Voltar"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
    <h1 className="text-base font-semibold text-foreground truncate">Nova live</h1>
    <span className="w-9" />
  </div>
</header>
```

Sem outras alterações — só o header.
