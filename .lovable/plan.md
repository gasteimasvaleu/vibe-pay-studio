# Padronização final de botões (h-9)

Auditei o app e encontrei ~66 botões que ainda usam `h-10`, `h-11`, `h-12` ou `h-14`, escapando ao padrão fino `h-9` que definimos.

## Regra de decisão

- **CTAs / botões de texto** (full-width, form submit, ação principal ou secundária com label): alterar para `h-9`.
- **Botões de ícone quadrados/circulares** (`h-10 w-10`, `h-11 w-11`, `h-14 w-14` — ex.: enviar mensagem no chat, +/- de quantidade, fechar/confirmar em dialogs de crop, action fab): **manter**, pois são "icon buttons" e o padrão fino não se aplica (viraria alvo de toque pequeno demais em mobile). Se você quiser incluí-los também, me diga.

## Arquivos afetados (CTAs de texto → h-9)

Rotas:
- `perfil.$username.tsx` — botão assinar (h-12 e h-11), subscribe CTA
- `publisher.tsx` — botões de publicar/agendar (h-12), tabs de mídia (h-12)
- `mywallet.index.tsx` — botões de valor rápido e "Recarregar" (h-12, h-11)
- `mywallet.recarregar.tsx` — botão confirmar (mantém +/- circulares)
- `settings.two-factor.index.tsx` — botão ativar/copiar (h-12)
- `settings.chat-settings.tsx` — botão salvar (h-12)
- `vault.tsx` — botões "Selecionar", "Cancelar", "Aplicar" (h-11)
- `bugreport.tsx` — input/botão (h-12)
- `subscriptions.tsx` — busca (h-12) [manter, é input]
- `chat-agendamento.tsx` — CTAs (h-12)
- `postsarquivados.tsx` — CTA (h-14 → h-9)

Componentes:
- `Footer.tsx`, `ScrollLanding.tsx`, `GlassPromoCard.tsx` (se houver CTAs grossos)

## Excluídos (ficam como estão)

- Ícones de ação circulares: chat send (`h-11 w-11`), comentar (`h-11 w-11`), reply story, +/- carteira, avatar/cover crop cancel/confirm.
- Elementos que **não são botão** mas casaram no grep (avatares, inputs, headers, dividers).

## Passos

1. Editar cada arquivo listado substituindo apenas as classes de altura dos CTAs de texto (`h-10|h-11|h-12|h-14` → `h-9`), preservando padding, radius, cor e largura.
2. Rodar o build para confirmar que nada quebra.
3. Verificar visualmente as principais telas (perfil, publisher, wallet, settings) via preview.

## Pergunta rápida

Confirma que quero **manter** os botões de ícone circulares/quadrados na altura atual (h-10/h-11)? Ou você quer que eu afine tudo, inclusive esses?
