## Objetivo

Criar um padrão de campo com rótulo flutuante e 3 estados visuais, adaptado à paleta roxa do app, e aplicá-lo nos formulários de perfil/configurações.

## Os 3 estados (adaptados ao tema)

1. **Repouso** — preenchido, sem borda visível. `bg-muted/60`, `border-transparent`, rótulo em `text-muted-foreground`.
2. **Hover** — borda sutil aparece. `border-border`, fundo levemente mais claro (`bg-muted/40`).
3. **Foco** — borda destacada em roxo e rótulo colorido. `border-primary`, `ring-1 ring-primary/30`, rótulo em `text-primary`, fundo `bg-background`.

Transição suave (`transition-colors`) entre estados. Rótulo sempre "flutuando" acima do valor dentro do campo (não sobe/desce), como nos screenshots.

## Componentes novos

- `src/components/ui/floating-input.tsx` — wrapper com `<label>` interno + `<input>`. Props: `label`, e todas as props nativas de input. Altura ~ `h-14` para acomodar rótulo + valor. Estados via `group` + `peer` do Tailwind + `focus-within`.
- `src/components/ui/floating-textarea.tsx` — mesma lógica para áreas longas (bio).

Ambos usam apenas tokens semânticos (`--primary`, `--muted`, `--border`, `--foreground`, `--muted-foreground`) — funcionam automaticamente em dark mode.

## Onde aplicar (só formulários de perfil/configurações)

Substituir `<Input>`/`<Textarea>` por `<FloatingInput>`/`<FloatingTextarea>` (com prop `label` no lugar do `<Label>` externo) em:

- `src/routes/_authenticated/settings.personal.tsx` (Apelido, bio, etc.)
- `src/routes/_authenticated/settings.details.tsx`
- `src/routes/_authenticated/settings.social.tsx`
- `src/routes/_authenticated/settings.change-password.tsx`
- `src/routes/_authenticated/settings.subscription.tsx` (apenas campos de edição, se houver)
- `src/components/banco/CadastrarBancoForm.tsx`
- `src/components/banco/SacarDialog.tsx`

Fora do escopo desta rodada: chat composer, busca, dialogs de pagamento, admin, auth — continuam com o `Input` atual.

## Detalhes técnicos

```tsx
// floating-input.tsx (essência)
<div className="group relative rounded-2xl bg-muted/60 border border-transparent
                hover:border-border hover:bg-muted/40
                focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30
                focus-within:bg-background transition-colors">
  <label className="block px-4 pt-2 text-xs text-muted-foreground
                    group-focus-within:text-primary transition-colors">
    {label}
  </label>
  <input className="w-full bg-transparent px-4 pb-2 text-base
                    outline-none placeholder:text-muted-foreground/60" ... />
</div>
```

- `rounded-2xl` (pill/arredondado como no screenshot).
- Erro (opcional, futuro): prop `error` troca `border-primary` por `border-destructive`.
- Disabled: `opacity-60 cursor-not-allowed`, sem hover.

## Validação

Após implementar, abrir `/settings/personal` e `/banco/cadastrar` e verificar visualmente os 3 estados (repouso, hover, foco) em light e dark mode.
