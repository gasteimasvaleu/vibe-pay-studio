# Remover botão "Fechar esta janela" do último step do onboarding de creator

## Situação atual

Na rota `/creator/onboarding/documentos/veriff-concluido` (`src/routes/_authenticated/creator.onboarding.documentos.veriff-concluido.tsx`) existem dois botões ao final da tela:

1. **"Fechar esta janela"** — chama `window.close()`, que não tem efeito em abas/janelas abertas pelo usuário (navegadores modernos ignoram o comando quando a janela não foi aberta via script).
2. **"Voltar ao painel"** — redireciona para `/dashboard` e funciona corretamente.

## O que muda

Remover o botão inoperante "Fechar esta janela" e manter apenas o botão "Voltar ao painel", centralizando a única ação útil da tela.

## Implementação

1. Editar `src/routes/_authenticated/creator.onboarding.documentos.veriff-concluido.tsx`
   - Remover o botão "Fechar esta janela" e seu handler `window.close()`.
   - Ajustar o container dos botões (remover layout de coluna com gap, já que restará apenas um botão).
   - Manter o botão "Voltar ao painel" redirecionando para `/dashboard`.

2. Verificar se há outros botões "Fechar esta janela" ou `window.close()` no fluxo de onboarding.

## Detalhes técnicos

- Apenas alteração de UI/UX, sem mudança de schema, RLS ou server function.
- O texto da página já informa ao usuário que ele pode fechar a janela, então o botão é redundante.
