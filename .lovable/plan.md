## Ajustar largura do sheet de comentários no desktop

### Objetivo
Aumentar a largura máxima do sheet inferior de comentários na versão desktop de 480px para 650px, mantendo o comportamento mobile em tela cheia.

### Arquivo a alterar
- `src/components/feed/CommentsSheet.tsx`

### Mudança
Atualizar a classe do `SheetContent` de:
```
sm:max-w-[480px]
```
para:
```
sm:max-w-[650px]
```

Preservando as demais classes já aplicadas:
- `w-full h-[85vh] rounded-t-3xl flex flex-col p-0 border-0 bg-background`
- `sm:mx-auto sm:left-0 sm:right-0`

### Resultado esperado
No desktop, o sheet de comentários terá largura máxima de 650px e ficará centralizado horizontalmente. No mobile continuará ocupando toda a largura da tela.