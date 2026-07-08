## Plano: destravar o botão "Connect" do Supabase

Como você é **owner** e o botão aparece **cinza/desabilitado**, isso quase sempre é um dos 4 casos abaixo. Vamos eliminar em ordem — pare no primeiro que resolver.

### 1. Reautorizar o app Lovable no Supabase (causa mais comum)
O token OAuth entre Lovable ↔ Supabase pode ter expirado ou perdido escopo. Isso deixa o botão cinza mesmo para owners.

- No Lovable: canto superior direito → **Account Settings → Integrations → Supabase → Disconnect**.
- No Supabase Dashboard: **Account (avatar) → Access Tokens** e também **Organization → Settings → OAuth Apps / Integrations** → revogue qualquer "Lovable" que estiver listado.
- Volte no Lovable → botão do Supabase no projeto → **Connect** → refaça o OAuth escolhendo a organização certa.

### 2. Confirmar que a organização certa foi autorizada
No fluxo OAuth do Supabase existe a tela "Select organizations to grant access". Se numa autorização anterior você marcou só 1 org, outras orgs ficam invisíveis para o Lovable (o dropdown aparece vazio → botão cinza).

- Ao reconectar (passo 1), na tela do Supabase **marque a organização** onde está o projeto que você quer conectar.

### 3. Limitações da organização Supabase
Não há limite público de projetos por org no conector, mas duas coisas travam o botão:
- Org em **modo somente leitura** por atingir o limite do Free tier (2 projetos ativos por org grátis). Solução: pausar/deletar um projeto não usado, ou upgrade da org.
- **2FA obrigatório** na org sem 2FA na sua conta. Solução: ativar 2FA na conta Supabase.

### 4. Cache/sessão do navegador
Se após reconectar o botão continuar cinza:
- Faça logout do Lovable e do Supabase, limpe cookies dos dois domínios, abra em janela anônima e refaça.

### Se nada resolver
Coleta pro suporte (print do botão cinza + nome da org + ID do projeto Supabase) e abrir ticket em `support@lovable.dev`. Enquanto isso, seguimos com o **Plano B** já discutido: rodar o SQL da tabela `profiles` manualmente no SQL Editor do Supabase para desbloquear o app.

### Próximo passo sugerido
Comece pelo **passo 1** (desconectar + reconectar OAuth marcando a org). Me diga o que aconteceu e eu ajusto daqui.
