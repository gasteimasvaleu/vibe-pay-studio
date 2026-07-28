## Alterações em `src/components/publisher/VaultPickerSheet.tsx`

**1. Centralizar abas (linha 174)** — no mobile centralizar; a partir de `sm` mantém alinhamento à esquerda:
```
flex flex-wrap justify-center sm:justify-start gap-x-1 gap-y-0 px-2
```

**2. Centralizar filtros de tipo (linha 216)** — mesma abordagem:
```
px-4 py-2 flex gap-2 justify-center sm:justify-start overflow-x-auto no-scrollbar border-b
```

**3. Corrigir padding vertical da linha de filtros** — atualmente `py-2` já é simétrico, mas o espaço percebido "maior em cima" vem da margem entre a barra de abas (que tem `py-2` nos botões, sem padding no container) e o `py-2` do wrapper dos filtros somados. Ajustar para `pt-1 pb-2` no wrapper dos filtros equaliza o respiro visual entre as duas barras em desktop e mobile.
