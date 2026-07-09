## Objetivo

Substituir tudo que hoje aparece abaixo dos 3 cards de resumo (Faturamento/Liberado/Total) no CreatorDashboard pelos cards dos screenshots, em dois grupos: **Área do Criador** e **Outras Funcionalidades**. Assinante não é tocado.

## Novos grupos e cards (ordem dos screenshots, 2 colunas em `md+`)

### Área do Criador
| Título | Descrição | Ícone lucide |
|---|---|---|
| Meu Perfil | Acesse e visualize seu perfil | `User` |
| Ofertas | Aqui você pode gerir suas Ofertas | `BadgePercent` |
| Perfil Gratuito | Seu perfil gratuito no ar em um clique | `UserPlus` |
| Meu Privacy | Veja suas vendas e engajamento | `LineChart` |
| Chat | Converse com seus assinantes agora | `MessageCircle` |
| Meu Banco | Gerencie saques e saldo disponível | `Landmark` |
| Em Alta | Descubra o que está bombando | `TrendingUp` |
| Meus assinantes | Acompanhe quem mais te apoia | `Users` |
| Assinaturas | Veja os creators que você assina | `UserPlus` |
| Carteira | Escolha como paga e veja seus gastos | `Wallet` |
| Acervo | Gerencie seus conteúdos com praticidade | `FolderPlus` |
| Live (em breve) | Transmita ao vivo para assinantes | `Radio` — **card desabilitado**, opacidade reduzida, sem hover |
| Reportar bug | Teve um problema? Conte pra gente | `Bug` |
| Vazamento | Alguém usou seu conteúdo? | `ShieldAlert` |

### Outras Funcionalidades
| Título | Descrição | Ícone |
|---|---|---|
| Atividades | Acesse suas mídias favoritas salvas | `Bookmark` |
| Definições | Personalize sua experiência | `Settings` |
| Ajuda | Precisa de suporte ou tem dúvidas? | `HelpCircle` |
| Sair | Sair da plataforma | `LogOut` — tone `danger` (título vermelho), aciona `supabase.auth.signOut()` como hoje |

## Ajustes técnicos

- Editar apenas `src/components/dashboard/CreatorDashboard.tsx`. Nada muda no ProfileHeaderCard, EarningsSummary, DashboardShell, ActionCard nem no SubscriberDashboard.
- Substituir os 3 `DashboardGroup` atuais (`Meu negócio` / `Comunicação` / `Conta`) pelos 2 novos (`Área do Criador` / `Outras Funcionalidades`).
- Ajustar os imports do lucide-react para os ícones novos e remover os que deixam de ser usados (`PenSquare`, `DollarSign`).
- `ActionCard` já suporta `disabled`; usar para "Live (em breve)". Já suporta `tone="danger"` para "Sair".
- Nenhuma navegação (`to=`) — todos os cards ficam como botões sem ação por enquanto, exceto Chat (mantém `to="/chat"` que já funciona) e Sair (mantém `onClick` de signout). Rotas reais das outras entradas ficam para próximas mensagens.

## Fora de escopo

- Rotas de destino de cada card (Meu Perfil, Ofertas, Meu Banco, etc.).
- Estado real de "Live" (só desabilitado visualmente).
- Backend/lógica de Reportar bug e Vazamento.
