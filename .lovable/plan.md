## Objetivo
Remover o card placeholder "Live (em breve)" do dashboard do creator, já existe o card funcional "Iniciar Live".

## Arquivo alvo
`src/components/dashboard/CreatorDashboard.tsx`

## Alteração
Remover o bloco `ActionCard` com:
- título: `"Live (em breve)"`
- descrição: `"Transmita ao vivo para assinantes"`
- `disabled`

Esse bloco está localizado logo após o card "Agendados" e antes do card "Reportar bug".

## Notas
- O ícone `Radio` continuará sendo importado, pois também é usado pelo card funcional "Iniciar Live".
- Nenhuma outra página ou componente é afetado.
- Não há mudança de lógica de negócio, apenas remoção de UI placeholder.