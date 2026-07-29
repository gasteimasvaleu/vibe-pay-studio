Plano de ajuste

1. Corrigir o modal de publicar story
- Remover o comportamento `sticky` do `DialogHeader` dentro de `PublishStoryDialog`, porque ele está ficando por cima do botão de fechar e dos campos ao rolar.
- Manter o scroll no corpo do dialog para caber no mobile, mas sem deixar o cabeçalho flutuando sobre os elementos.
- Ajustar o espaçamento superior/direito do conteúdo para respeitar o botão `X` nativo do modal.

2. Melhorar a responsividade vertical no mobile
- Manter `max-height` em `dvh` no `DialogContent`.
- Usar uma estrutura com conteúdo rolável e espaçamentos seguros para que preview, legenda, preço e botão fiquem acessíveis sem cortes.
- Garantir que o botão “Publicar story” não fique colado ou escondido no final do scroll.

3. Validar visualmente
- Conferir no viewport mobile atual que:
  - o título não cobre o botão `X`;
  - o header não sobrepõe preview/campos ao rolar;
  - o botão final aparece inteiro;
  - o modal continua centralizado e com largura adequada.