Vou corrigir o travamento do preview focando no overlay global de navegação, porque a página já aparece carregada por trás, mas a camada “Carregando...” continua por cima.

Plano:
1. Tornar o `RouteTransitionOverlay` tolerante a estados `pending` presos no preview:
   - manter o delay antes de aparecer;
   - adicionar um tempo máximo de exibição;
   - esconder automaticamente quando o conteúdo da rota já estiver renderizado, evitando bloquear a UI.

2. Reduzir causas recorrentes de `pending` em rotas autenticadas:
   - trocar `supabase.auth.getUser()` por `supabase.auth.getSession()` nos `beforeLoad` das rotas autenticadas que ainda fazem chamada de rede só para validar sessão;
   - manter consultas reais de dados apenas onde elas são necessárias para montar a página.

3. Validar no preview:
   - abrir `/dashboard` e confirmar que o overlay some;
   - navegar entre rotas principais e confirmar que o carregamento não fica preso;
   - verificar console/logs se ainda houver erro real por trás.