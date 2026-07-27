## Plano

Adaptar o fluxo de live para ter uma **tela de configuração de vídeo** antes de iniciar a transmissão (como no screenshot enviado), e corrigir o problema anterior de dono caindo na tela de espectador.

### 1. Nova tela `/live/nova` = Configurações de vídeo (pré-live)

Substitui a tela atual de "Nova live" por um layout de duas colunas:

**Coluna esquerda — Preview da câmera**
- Vídeo ao vivo (muted) mostrando a câmera selecionada em tempo real.
- Texto “Toque nas configurações para alterar” abaixo.

**Coluna direita — Configurações**
- Select **Câmera utilizada** (lista `enumerateDevices` → `videoinput`).
- Select **Microfone utilizado** (lista `enumerateDevices` → `audioinput`).
- Toggle **Live só para seguidores** (Apenas quem segue você poderá assistir).
- Campo **Título da live**.
- Campo **Valor do ticket (R$)** (mantido; opcional, padrão 0,00 = gratuita).
- Botão roxo grande **Iniciar transmissão** (com ícone de sinal).

**Comportamento**
- Ao abrir, pede permissão de câmera/mic uma única vez e mostra o preview.
- Trocar câmera/mic no select recria o `MediaStream` e atualiza o preview.
- Se estiver rodando dentro do iframe do editor (sem `allow=camera; microphone`), mostra CTA “Abrir em nova aba” no lugar do preview.
- Ao clicar “Iniciar transmissão”: chama `startLive` com `{ title, priceCents, followersOnly }`, passa o `MediaStream` já pronto para a próxima tela via ref/singleton, e navega para `/live/$liveId/transmitir`.

### 2. Tela `/live/$liveId/transmitir` (transmissor)

- Recebe o `MediaStream` já autorizado (sem re-pedir permissão) e faz apenas o handshake WHIP.
- Se chegar sem stream (recarregou a página), pede a mídia novamente e reaproveita o fluxo atual.
- Mantém logs `[whip]` e overlay de estado (câmera → oferta → ICE → POST → conexão → AO VIVO).
- Continua com o `DELETE` no `Location` ao sair, `sendonly` transceivers e STUN Cloudflare.

### 3. Dono nunca cai na tela de espectador

- `/live/$liveId`: se `getLive` retornar `isOwner: true`, redireciona automaticamente para `/live/$liveId/transmitir`.
- No perfil do próprio creator, o botão de live ativa passa a ser **CONTINUAR TRANSMISSÃO** (vai para `/transmitir`); para os demais usuários continua **ASSISTIR LIVE**.

### 4. Backend

- `live_sessions`: adicionar coluna `followers_only boolean not null default false`.
- `startLive` aceita `followersOnly` e grava na coluna.
- `getLive`: se `followers_only = true` e o espectador não segue o criador nem é dono, `canWatch = false` e o paywall mostra “Live exclusiva para seguidores”.

### 5. Validação

- Abrir `/live/nova`, ver preview da câmera, alternar dispositivos, marcar “Só seguidores”, iniciar.
- Confirmar que o transmissor entra direto em “AO VIVO” sem prompt duplicado de permissão.
- Confirmar que outro usuário assiste normalmente (ou é bloqueado quando "Só seguidores" está ativo e ele não segue).

### Detalhes técnicos

- `MediaStream` é passado entre rotas via um módulo simples (`src/lib/live-media-handoff.ts`) que guarda o stream em memória por `liveId`, com fallback para `getUserMedia` na tela de transmissão.
- `enumerateDevices` só retorna labels após o primeiro `getUserMedia` com sucesso — o preview roda antes dos selects para popular os nomes corretamente.
- Migração adiciona somente `followers_only` (a checagem de seguidor usa a tabela `follows` existente).