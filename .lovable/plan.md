## Problema

A página `/certificar-perfil` não usa o cabeçalho padrão do app. Hoje ela renderiza, dentro do próprio conteúdo, um link "‹ Voltar" em texto pequeno e, abaixo, um título com ícone de escudo — sem barra fixa, sem borda inferior e sem o botão circular de voltar.

O padrão das outras páginas (ex.: `/subscriptions`, `/vault`, `/banco`, `/mywallet`) é:

```text
<header sticky top-0 z-20, borda inferior, bg-background/90 backdrop-blur>
   [← botão redondo à esquerda]   Título centralizado   [espaço/ação à direita]
</header>
<main ...>  conteúdo  </main>
```

## O que fazer

Em `src/routes/_authenticated/certificar-perfil.tsx`:

1. Substituir o bloco atual do link "Voltar" + título por um `<header>` fixo idêntico ao de `/subscriptions`:
   - `sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur`
   - container `mx-auto max-w-2xl px-4 py-3`, título centralizado "Certificar perfil" (`text-base font-semibold truncate`)
   - botão de voltar circular à esquerda (`h-9 w-9`, ícone `ArrowLeft`, `aria-label="Voltar"`), usando `router.history.back()` como nas demais páginas
2. Mover o conteúdo restante para um `<main className="mx-auto max-w-2xl px-4 pb-24 pt-4 space-y-4">`, removendo o `backdrop-blur` do wrapper externo (ele passa a viver no header) e mantendo `min-h-screen text-foreground`.
3. Ajustar imports: entra `ArrowLeft` e `useRouter`; saem `ChevronLeft` e o `Link` (se não for mais usado). O ícone `ShieldCheck` deixa de ser necessário no título — mantido apenas se ainda usado em outro ponto da página.

Nenhuma lógica, consulta ou funcionalidade de certificação é alterada — apenas a estrutura visual do cabeçalho.
