## Dashboard do Assinante — simplificar botões

Ajustar apenas `src/components/dashboard/SubscriberDashboard.tsx` (sem alterar lógica de dados no route loader).

### Layout

1. **Faixa em destaque "Virar creator"** — ocupa a linha inteira acima da grade, com fundo em gradiente (usando `bg-gradient-primary` já existente), ícone `BadgeCheck`, título grande e CTA visual de seta. Mantém o comportamento atual: se `creatorOnboardingStarted` for true, texto vira "Continuar cadastro de creator" e navega para `creatorNextStep`; caso contrário "Virar creator" → mesmo `creatorNextStep`.

2. **Grade 2 colunas** com apenas estes cards, nesta ordem e com estes textos/rotas:

   | Card | Ícone | Descrição | Rota |
   |---|---|---|---|
   | Chat | MessageCircle | Converse com creators agora | `/chat` |
   | Assinaturas | UserPlus | Veja os creators que você assina | `/subscriptions` |
   | Carteira | Wallet | Escolha como paga e veja seus gastos | `/mywallet` |
   | Atividades | Bookmark | Acesse suas mídias favoritas salvas | `/colecoes` |
   | Definições | Settings | Personalize sua experiência | `/settings/creator` |
   | Ajuda | HelpCircle | Precisa de suporte ou tem dúvidas? | `/bugreport` |
   | Sair | LogOut | Sair da plataforma | ação signOut (tone danger) |

### Removidos
- Card "Perfil" (não estava no screenshot).
- Card "Virar creator" da grade (promovido para faixa destacada).

### Nota técnica
`ActionCard` já aceita `to`; preciso adicionar `to` para Carteira (`/mywallet`) — antes não tinha. Nenhuma outra alteração de componente é necessária.
