## Plano

1. **Corrigir o overlay de entrada**
   - Atualizar `/chat/call/$callId` para não depender apenas da promessa de `frame.join()` para remover o texto “Entrando na chamada…”.
   - Escutar eventos reais do Daily (`joined-meeting`, erro e saída) e liberar a interface assim que a pessoa entra na sala.

2. **Adicionar proteção contra travamento**
   - Criar um timeout curto: se o iframe do Daily já carregou/foi criado, mas o evento de entrada demora demais, mostrar a chamada e trocar o texto para um estado acionável em vez de deixar a tela bloqueada indefinidamente.
   - Exibir erro claro com opção de voltar ao chat quando a entrada falhar.

3. **Evitar joins duplicados**
   - Impedir que o efeito da rota execute `joinVideoCall` duas vezes no mesmo carregamento, porque os requests mostram chamadas duplicadas para o mesmo `callId`.
   - Preservar a limpeza correta ao sair da página para destruir o frame Daily.

4. **Melhorar controles da sala**
   - Manter o botão de encerrar chamada próprio do app.
   - Ajustar o estado visual para que o iframe Daily fique utilizável quando a sala estiver pronta.

## Detalhes técnicos

- O backend já está retornando `roomUrl` e `token` corretamente para o `callId` atual.
- A sala Daily também já foi criada e persistida em `video_calls.room_url`.
- O problema está no frontend da rota `src/routes/_authenticated/chat.call.$callId.tsx`: o overlay continua por cima do iframe enquanto o estado permanece `joining`.

## Validação

- Abrir `/chat/call/628cba61-a486-453a-b124-6f12e4e7a29f`.
- Confirmar que o texto “Entrando na chamada…” desaparece quando a sala Daily fica pronta.
- Confirmar que não há duas chamadas consecutivas para `joinVideoCall` no carregamento.
- Confirmar que o botão de encerrar volta para o chat e finaliza a chamada.