## Objetivo
Alterar o botão "Copiar meu link Monetisexy" em `/settings/myprofile` para gerar o link de perfil usando o domínio próprio (`monetisexy.com`) em vez do `window.location.origin` atual (que pode ser preview ou subdomínio Lovable).

## Alterações propostas

### 1. Configurar base URL client-safe
- Adicionar `VITE_APP_BASE_URL=https://monetisexy.com` em `.env` e `.env.example`.
- O prefixo `VITE_` torna a variável acessível no bundle do navegador via `import.meta.env`.

### 2. Atualizar `src/routes/_authenticated/settings.myprofile.tsx`
- Substituir a linha:
  ```ts
  const link = `${window.location.origin}/perfil/${username}`;
  ```
  por:
  ```ts
  const baseUrl = import.meta.env.VITE_APP_BASE_URL ?? window.location.origin;
  const link = `${baseUrl}/perfil/${username}`;
  ```
- Manter o texto e ícone do botão inalterados, a menos que o usuário queira ajustar.

### 3. Verificação
- Re-ler o arquivo editado para confirmar que o link copiado será `https://monetisexy.com/perfil/<username>`.
- Garantir que o fallback `window.location.origin` continue funcionando em ambientes sem a variável configurada.

## Escopo
- Apenas o botão selecionado em `/settings/myprofile`.
- Não altera outros links internos (feed, publicações, chat) nem links de compartilhamento de publicações, salvo solicitação posterior.

## Pergunta
Deseja que eu use `https://monetisexy.com` (domínio principal) ou `https://www.monetisexy.com` (com www)?