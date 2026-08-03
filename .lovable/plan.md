# Confirmação de e-mail feita em outro dispositivo

## O problema

No desktop, o botão "Já confirmei" pergunta ao Supabase quem é o usuário **logado naquele navegador**. Como o cadastro com confirmação de e-mail não cria sessão, o desktop não tem nenhum usuário logado — então a resposta é sempre "ninguém", e a tela mostra "Ainda não detectamos a confirmação", mesmo que o link já tenha sido aberto no celular.

Ou seja: não é falha de propagação, é que a verificação depende de uma sessão que só existe no aparelho onde o link foi aberto.

## A correção

1. Verificação pelo e-mail, no servidor
   - Nova função de servidor que recebe o e-mail exibido na tela e responde apenas `confirmado: true/false`, consultando o Supabase com credencial administrativa.
   - Se já existir sessão no navegador (caso o link tenha sido aberto no próprio desktop), o comportamento atual continua valendo e tem prioridade.

2. O que acontece quando está confirmado
   - Com sessão: segue direto para o app, como hoje.
   - Sem sessão (confirmou no celular): leva para `/entrar` com o e-mail preenchido e a mensagem "E-mail confirmado! Faça login para continuar." — não é possível criar sessão no desktop sem senha/link.

3. Detecção automática
   - Enquanto a página estiver aberta, uma verificação silenciosa a cada ~5s (parando após alguns minutos ou ao trocar de aba) faz a tela avançar sozinha assim que a confirmação acontecer no celular.

## Detalhes técnicos

- `src/lib/auth-confirm.functions.ts` (novo): `checkEmailConfirmed` — `createServerFn` público, valida o e-mail com zod, carrega `supabaseAdmin` dentro do handler (`await import`), busca o usuário por e-mail e retorna somente `{ confirmed: boolean }`. Sem dados pessoais no retorno.
- Proteção contra enumeração: resposta booleana única, sem distinguir "não existe" de "não confirmado", e limite simples por IP/e-mail em memória do handler (janela curta).
- `src/routes/cadastro.confirme-email.tsx`: `handleAlreadyConfirmed` passa a tentar `getUser()` e, em seguida, `checkEmailConfirmed`; adiciona o polling com `setInterval` limpo no unmount; navegação para `/entrar` com `search: { email }`.
- `src/routes/entrar.tsx`: aceita `email` (e um flag de confirmação) no search para pré-preencher o campo e exibir o aviso de sucesso.
