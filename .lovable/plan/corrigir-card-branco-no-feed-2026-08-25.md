# Corrigir card "branco" no feed

## O que está acontecendo

O card não está vazio: é o estado "sem publicações" do feed. O texto existe, mas usa a cor fixa `text-white/70` sobre um fundo claro (`bg-card` no tema light), então fica praticamente invisível — parece um card em branco.

O mesmo problema afeta outros textos da tela que também usam cores fixas de branco:
- "Carregando publicações..." (`text-white/70` sobre `bg-card/[0.04]`)
- spinner de carregamento de mais itens (`text-white/60`)
- "Você chegou ao fim do feed." (`text-white/40`)

## Correção

Trocar as cores fixas por tokens semânticos que funcionam nos dois temas, em `src/routes/_authenticated/feed.tsx`:

- estado vazio: `text-white/70` -> `text-muted-foreground`
- estado carregando: `text-white/70` -> `text-muted-foreground`, e borda/fundo do bloco alinhados aos tokens (`border-border bg-card`)
- spinner e "fim do feed": `text-white/60` e `text-white/40` -> `text-muted-foreground`

Sem mudanças de lógica ou de dados — apenas cores/tokens de apresentação.
