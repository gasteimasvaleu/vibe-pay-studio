## Página `/publisher` — fluxo de publicação em steps

Nova rota autenticada em `src/routes/_authenticated/publisher.tsx` acionada pelo botão central "Postar" do `BottomNav`. Um wizard com 3 steps, estado local mantido no componente pai enquanto o usuário navega entre eles.

### Steps (baseados nos screenshots)

**Step 1 — Enviando mídia (vazio)**
- Header: seta voltar (à esquerda) + título centralizado "Enviando mídia".
- Subtítulo "Fotos e vídeos" + contador "0 de 10 - Você pode enviar até 10 mídias".
- Card grande centralizado com `+` e texto "selecionar foto ou vídeo". Ao clicar, abre o modal do Step 2.
- Botão inferior "Continuar" desabilitado (sem mídias).

**Step 2 — Modal "Selecionar mídia"**
- Overlay escurecido sobre o Step 1.
- Bottom sheet/modal com título "Selecionar mídia" e botão `x` de fechar.
- 3 opções em pílulas: `Biblioteca do dispositivo`, `Acervo na Privacy`, `Câmera` (cada uma com ícone).
- Ao clicar em qualquer opção, aciona `<input type="file" accept="image/*,video/*">` (mock — as opções apenas selecionam o mesmo input por ora; comportamento real será definido depois).

**Step 3 — Enviando mídia (com mídia)**
- Mesmo header/subtítulo, contador atualizado ("1 de 10 …").
- Preview da mídia enviada centralizado com botão `x` (canto sup. direito) para remover.
- Duas ações lado a lado: `+ Adicionar mídia` (ativo) e `⇄ Reordenar` (desabilitado se <2 mídias).
- Botão inferior `Continuar` ativo (cor primária/laranja) — avança para Step 4.

**Step 4 — Criando publicação**
- Header: voltar + título "Criando publicação".
- Preview vertical da(s) mídia(s) no topo (esquerda).
- Textarea "Escreva uma legenda…".
- Ações: `🎤 Gravar áudio` e `⇄ Reordenar` (desabilitado).
- Divisor.
- Lista de toggles (Switch shadcn) com ícone + label:
  - `Publicação paga` (cadeado)
  - `Desafio` (saco de dinheiro)
  - `Post 24 horas` (relógio)
  - `Agendar publicação` (calendário)
  - `Desligar comentários` (balão cortado)
  - `Postar fixado ao topo` (pin)
- Botão inferior "Postar" com gradiente laranja→rosa.

### Arquivos

- **Criar** `src/routes/_authenticated/publisher.tsx` — rota `/publisher` com o wizard (state `step`, `mediaFiles[]`, `caption`, toggles). Header próprio (voltar via `router.history.back()`), sem BottomNav visualmente sobreposto — usar `pb-24` já herdado do layout.
- **Editar** `src/components/site/BottomNav.tsx` — transformar `CenterPost` em `<Link to="/publisher">` mantendo o visual do botão gradient.

### Notas técnicas

- Componentes shadcn: `Button`, `Switch`, `Textarea`, `Dialog`/`Sheet` para o modal do Step 2.
- Cores: usar tokens do tema (`bg-background`, `text-foreground`, `border`, `bg-muted`) + gradiente laranja/rosa somente nos CTAs primários (mesmo do botão central do BottomNav).
- Upload: `<input type="file" hidden multiple>` + `URL.createObjectURL` para preview. Sem backend nesta etapa.
- `head()` da rota com `title` "Nova publicação" e `robots: noindex`.
- Wizard usa `useState` local para `step` (não navegação de rota), assim o botão voltar do header retrocede o step antes de sair da página.

### Fora de escopo (aguardando instruções)

- Comportamento real dos switches (formulários condicionais de valor pago, prazo do desafio, data do agendamento, etc.).
- Integração com backend/storage para upload das mídias.
- Reordenação drag-and-drop das mídias.
