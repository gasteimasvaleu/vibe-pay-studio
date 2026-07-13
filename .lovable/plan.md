## Ajustes no `PublicationCard`

### 1. Reduzir altura da mídia
No `MediaCarousel` e nos containers de locked/"sem mídia", trocar `aspect-[4/5]` por `aspect-[16/10]` (mais baixo, próximo ao screenshot). O `object-contain` continua garantindo que a imagem não estica; o fundo blur preenche as laterais.

### 2. Novo estilo das setas do carrossel
Substituir os círculos `bg-black/40` por setas "chevron finas" brancas sem fundo, estilo Privacy:
- `absolute left-2 / right-2 top-1/2 -translate-y-1/2`
- Sem background, apenas `text-white/90 drop-shadow-lg hover:text-white`
- Ícone `ChevronLeft` / `ChevronRight` maior (`h-8 w-8`) com `strokeWidth={1.5}`
- Área clicável de `h-12 w-12` (padding invisível)

### 3. Barra de ações inferior
Adicionar após a mídia (antes do `caption`) uma linha de ações:

```
[❤ Curtir]  [💬 Comentar]                    [🔖 Salvar]
```

- Container: `flex items-center gap-4 px-4 pt-3`
- Ícones lucide: `Heart`, `MessageCircle` à esquerda; `Bookmark` empurrado à direita com `ml-auto`
- Botões `type="button"`, `h-10 w-10 grid place-items-center rounded-full hover:bg-white/10 text-white/90`
- Ícones `h-6 w-6` com `strokeWidth={1.75}`
- Estado local: `useState` para `liked` e `saved` — quando ativo, ícone recebe `fill-current` e cor (vermelho para curtir, branco para salvar). Ações são apenas visuais nesta iteração (sem persistência backend).
- Não renderizar a barra quando `item.locked` for `true`.

### 4. Espaçamento
Ajustar `caption` para `px-4 py-2` (menor) já que agora existem as ações acima.

## Fora do escopo
- Persistir curtidas/comentários/favoritos no backend.
- Abrir modal de comentários.
- Contadores numéricos.
