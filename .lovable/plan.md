## Redirecionar assinantes para /feed após login

Hoje `homeForAccountType("subscriber")` em `src/lib/auth.ts` retorna `/assinante`, usado por `routeAfterAuth` e também como guarda em `/creator` e `/assinante`.

### Mudança
- Em `src/lib/auth.ts`, trocar o retorno padrão de `homeForAccountType` de `/assinante` para `/feed`. Creator continua indo para `/creator`.

### Efeitos
- Login/cadastro de assinante → cai em `/feed`.
- Guarda de `/creator`: se um assinante acessa, é mandado para `/feed` (era `/assinante`). OK — `/feed` é a nova home.
- `/assinante` continua acessível como página de perfil/conta (não é mais a home, mas o botão "Ver meu perfil público" e o CTA de virar creator seguem funcionando ao entrar manualmente).

### Arquivos
- `src/lib/auth.ts` — uma linha alterada.

Sem migrações, sem mudanças de UI.