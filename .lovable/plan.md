## Ajuste do card do assinante

- Alterar o `ProfileHeaderCard` para não renderizar uma estatística padrão quando o perfil não for creator.
- Manter “Superfãs” como métrica padrão somente nos dashboards de creator.
- Preservar a possibilidade de exibir uma métrica no card do assinante futuramente quando ela for fornecida explicitamente via `stat`.
- Validar o dashboard do assinante no mobile e desktop para confirmar que nome, usuário e espaçamento permanecem harmoniosos sem a linha “0 Assinaturas”.