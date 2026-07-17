## Menu "..." no card Top Live

Adicionar um menu vertical (kebab, `...`) no canto superior direito do card **Top Live**, seguindo o mesmo padrão já usado no card **Top postagem**.

### Comportamento
- Ícone `MoreVertical` no topo direito do card, alinhado ao título "Top Live".
- Ao clicar, abre o `CardMenu` (dropdown) já existente no arquivo.
- Item do menu: **Exibir estatísticas** (conforme screenshot).
- Ao selecionar, abre um `Dialog` com as estatísticas reais da live em destaque (a mesma live já mostrada no card):
  - Título da live
  - Data de início (`started_at`)
  - Total de views (`total_views`)
  - Faturamento bruto (`gross_cents`, formatado em BRL)
- Se não houver live no período, o item do menu fica desabilitado.

### Alterações técnicas
Arquivo único: `src/routes/_authenticated/my-monetisex-stats.tsx`, componente `TopLiveCard`:

1. Trocar o header atual (linha ~1576) por um `flex items-start justify-between` contendo o título à esquerda e `<CardMenu items={[{ label: "Exibir estatísticas", onSelect: () => setStatsOpen(true) }]} />` à direita.
2. Adicionar `const [statsOpen, setStatsOpen] = useState(false);`.
3. Adicionar um `<Dialog open={statsOpen} onOpenChange={setStatsOpen}>` no final do card com `DialogHeader` "Estatísticas da live" e grid 2 colunas mostrando views e faturamento, além do título e data.

Sem mudanças de backend — os dados já vêm de `getEngajamentoLives`.

### Validação
Rodar typecheck e conferir visualmente no preview que o menu abre e o dialog mostra os dados reais.