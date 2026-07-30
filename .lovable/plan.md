## Contador de visualizações no card do creator

- Criar uma consulta autenticada e isolada pelo perfil ativo para contar os registros reais de `profile_views`.
- Carregar esse total no dashboard para o perfil creator pago e para o perfil creator gratuito, inclusive ao alternar entre os dois perfis vinculados.
- Passar a métrica pelo `DashboardShell` e exibi-la no `ProfileHeaderCard`, logo abaixo da métrica atual, com rótulo de visualizações.
- Manter o contador oculto no dashboard de assinantes.
- Invalidar/refazer a consulta ao trocar o perfil ativo e validar os dois modos do creator.