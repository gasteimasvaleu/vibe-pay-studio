## Alterar UX do botão de gravação de áudio

Ajustar o `AudioRecorderButton` em `src/routes/_authenticated/settings.chat-settings.tsx` para que, quando ativado (gravando), exiba um mini-widget inline no lugar do botão único atual, seguindo o screenshot:

`[ X vermelho ]  [ ● vermelho  MM:SS ]  [ ✓ verde ]`

### Comportamento

- **Estado idle**: mantém o botão de microfone atual (sem alterações).
- **Estado gravando**: substitui o botão por um grupo compacto arredondado com três controles:
  1. **Cancelar** (`X` em vermelho): para a gravação e descarta o áudio (não chama `onRecorded`).
  2. **Indicador**: bolinha vermelha pulsante + tempo decorrido no formato `MM:SS` (ex.: `00:10`), respeitando o limite `AUDIO_MAX_SEC`.
  3. **Confirmar** (`Check` em verde): para a gravação e envia o arquivo via `onRecorded` (comportamento atual do `stop`).

### Implementação técnica

- Adicionar um ref `cancelledRef` no componente. Novo método `cancel()` seta `cancelledRef.current = true` antes de chamar `mediaRef.current?.stop()`.
- No handler `rec.onstop`, se `cancelledRef.current` for `true`, apenas limpa o timer/stream e reseta o estado sem chamar `onRecorded`; caso contrário mantém o fluxo atual.
- Substituir o `return` do bloco `if (recording)` por um `div` flex com os três controles usando tokens semânticos (`text-red-500`, `text-green-600`, `bg-accent/40`) e `Check` do `lucide-react` (já disponível no projeto).
- Formatar `elapsed` como `MM:SS` com util local.
- Manter acessibilidade: `aria-label` em cada botão ("Cancelar gravação", "Gravando", "Enviar gravação").

Sem mudanças em backend, migrations, ou em outros botões da toolbar.
