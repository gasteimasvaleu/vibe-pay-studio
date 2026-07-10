## Corrigir dialog "Excluir conta"

**`src/routes/_authenticated/settings.myprofile.tsx`**

1. **Ícone de alerta apagado** — remover `strokeWidth={0} fill="transparent"` do `<AlertCircle>`. Usar apenas `className="h-9 w-9 text-primary"` para que o SVG renderize normalmente (círculo + "!" visíveis).
2. **Botões descentralizados** — trocar `justify-end` por `justify-center` na row dos botões "Cancelar" / "Continuar", mantendo `gap-3`.
