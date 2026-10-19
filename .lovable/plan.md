# Proteger o disparo dos lembretes de renovação

## Situação atual
O endereço que dispara os e-mails "sua assinatura expira em breve" não tem um token próprio. Ele aceita qualquer chamada que envie a chave pública do app, e essa chave fica visível no navegador. Na prática, qualquer pessoa poderia disparar o envio. O app evita duplicar e-mails, mas o endereço continua aberto.

## O que fazer
1. Criar um segredo exclusivo para os lembretes, gerado de forma aleatória e guardado só no servidor.
2. Fazer o endereço aceitar apenas chamadas que tragam esse segredo, comparado de forma segura.
3. Atualizar o agendamento diário para enviar o segredo novo.
4. Aplicar a mesma proteção ao disparo de broadcasts, que usa a mesma checagem.

## Detalhes técnicos
- Secret `CRON_SECRET` via generate_secret; header `x-cron-secret`; comparação em tempo constante.
- Arquivos: `src/routes/api/public/hooks/subscription-reminders.ts`, `dispatch-broadcasts.ts`.
- Reagendar os jobs pg_cron com o header novo (lendo o segredo do Vault).
