Não, provavelmente não é por falta de publicação do projeto.

A publicação do app normalmente não é requisito para conectar um projeto Supabase. Esse botão costuma depender de permissões/estado do conector no workspace e da autorização OAuth com a organização Supabase.

Plano de diagnóstico:

1. Verificar permissões no Supabase
- Confirmar que sua conta é Owner/Admin da organização Supabase conectada.
- Confirmar que o projeto desejado pertence exatamente a essa organização.
- Se o projeto estiver em outra organização, conectar essa outra organização no Lovable.

2. Forçar atualização do estado do conector
- Fechar o modal de Connectors.
- Recarregar o Lovable.
- Abrir novamente Integrations/Connectors > Supabase.
- Clicar em “Manage Connected Organizations” e reconectar/remover e adicionar novamente a organização.

3. Testar hipótese de cache/sessão
- Tentar em aba anônima ou outro navegador.
- Sair e entrar novamente no Lovable.
- Aguardar alguns minutos depois da autorização do Supabase, porque o estado pode demorar a sincronizar.

4. Se continuar desabilitado
- Tratar como instabilidade/bug do conector Lovable ↔ Supabase.
- Enviar ao suporte Lovable o print mostrando: Supabase Enabled, Project Not connected e botão “Connect a project” desabilitado.
- Enquanto isso, não vou usar Lovable Cloud nem criar backend paralelo para evitar conflito com o Supabase próprio.

5. Assim que o botão liberar
- Conectar o projeto Supabase correto.
- Eu removo qualquer configuração conflitante criada anteriormente.
- Aplico as migrations/tabelas diretamente no Supabase conectado.
- Valido autenticação, perfis e regras de acesso.