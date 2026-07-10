## Nova rota: /subscriptions

Criar `src/routes/_authenticated/subscriptions.tsx` e conectar o botão "Assinaturas" do dashboard (SubscriberDashboard) a essa rota.

### Layout (baseado no screenshot)

```text
[←]              Assinaturas
┌──────────────────────────────────────┐
│ 🔍  Pesquisar                        │
└──────────────────────────────────────┘

     Ativas (ativo)     |     Expiradas
     ──────────────

 (Todas)  Gratuitas  Pagas          [ Ordenar ⌄ ]

 <lista de assinaturas / estado vazio>
```

### Componentes / comportamento
- **Header**: botão voltar (ícone seta, `router.history.back()`), título "Assinaturas" centralizado.
- **Busca**: input com ícone de lupa, placeholder "Pesquisar", filtra a lista por nome do creator (case-insensitive).
- **Tabs**: "Ativas" | "Expiradas" — underline coral na ativa, estado local.
- **Filtros (pills)**: "Todas" | "Gratuitas" | "Pagas" — pill selecionada com borda/texto coral; demais neutras.
- **Ordenar**: botão pill à direita abrindo um Popover com opções (Mais recentes, Mais antigas, Nome A–Z, Nome Z–A).
- **Lista**: por enquanto renderiza estado vazio ("Você ainda não tem assinaturas ativas." / "Nenhuma assinatura expirada.") — sem backend nesta etapa.

### Wiring
- Em `SubscriberDashboard.tsx`, adicionar `to="/subscriptions"` ao `ActionCard` "Assinaturas".
- Nova rota usa `createFileRoute("/_authenticated/subscriptions")` com `head()` (title "Assinaturas · Monetisexy", `robots: noindex`).

Sem alterações de banco, backend ou outras páginas.