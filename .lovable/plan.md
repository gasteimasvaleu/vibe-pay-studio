## Apagar o segredo antigo dos lembretes

**O que é:** a senha antiga que o envio automático de lembretes de renovação usava. Nada no app usa esse segredo hoje. Os lembretes e as transmissões agendadas agora usam o CRON_SECRET.

**O que vou fazer:**
1. Confirmar o nome exato na lista de segredos do projeto.
2. Apagar só esse segredo. O CRON_SECRET fica.

**Efeito:** nenhum. Os lembretes continuam funcionando com o CRON_SECRET.
