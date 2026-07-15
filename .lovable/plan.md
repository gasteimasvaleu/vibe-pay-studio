## Novo diálogo "Adicionar nova categoria"

Substituir o diálogo atual (linhas 785–817 de `src/routes/_authenticated/vault.tsx`) por um layout fiel ao screenshot e funcional (criar categoria + associar mídias em uma única ação).

### Layout (uma tela de dialog)

- **Container**: `Dialog` largo (`sm:max-w-3xl`, `rounded-3xl`, `p-6`), fundo branco.
- **Header**: título `ADICIONAR NOVA CATEGORIA` (bold, uppercase, tracking-wide) à esquerda + botão `X` (fechar) no canto superior direito.
- **Campo nome**: input pill (`rounded-full`, borda sutil, `h-12`) com:
  - Ícone à esquerda (`FolderPlus` do lucide-react — proxy do ícone do screenshot).
  - Placeholder `Nome da categoria`.
  - Contador `N / 64` fixo à direita, atualizando conforme o usuário digita.
  - Cap client-side em 64 chars; schema server-side ajustado de 60 → 64 (`createCategorySchema` em `src/lib/vault.functions.ts`).
- **Grid de mídias** (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3`, `max-h-[420px] overflow-y-auto`):
  - **Primeiro tile** sempre visível: quadrado cinza arredondado (`bg-muted rounded-2xl aspect-square`) com `+` grande e texto `Adicionar mídia` centralizados. Clique abre o **modo picker** (segunda visão do mesmo dialog).
  - **Demais tiles**: miniaturas de `pickedItems` (reusa `MediaThumb`), com badge de tipo (vídeo/áudio/gif) e botão `X` no canto superior direito para remover do array.
- **Rodapé** (flex justify-end gap-3):
  - `Confirmar` (pill, `bg-primary text-primary-foreground`; desabilitado quando `!categoryName.trim() || createCatMut.isPending`, com estilo esmaecido igual ao screenshot).
  - `Cancelar` (pill outline `border-2 border-foreground/70`).

### Modo picker (segunda visão do mesmo dialog)

Estado local `dialogView: "form" | "picker"`.

- Header: botão voltar `←` + título `SELECIONAR MÍDIAS` + `X` fechar.
- Grid `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2` com **todas** as mídias do usuário (publicações + envios), com bolinha de seleção no canto superior direito de cada item (mesmo estilo do MediaGrid principal). Áudios ficam disponíveis.
- Dados: nova query `["vault","picker","all"]` com `enabled: addCategoryOpen && dialogView === "picker"` que faz `Promise.all([fnPublications, fnUploads])` (`mediaType: "all"`, `sort: "recent"`, `limit: 300`) e mescla por `createdAt desc`.
- Estado `pickerSelected: Set<string>` (por `item.key`). Clique em qualquer área do tile alterna.
- Rodapé: `Concluído (N)` (primary, desabilitado quando `pickerSelected.size === 0` está OK — permite voltar sem adicionar) + `Cancelar` (outline, volta ao form sem alterar `pickedItems`).
- Ao "Concluído": mescla `pickerSelected` em `pickedItems` (dedup por `key`) e volta ao form.

### Confirmar (funcional)

Refatorar `createCatMut`:

```ts
mutationFn: async ({ name, items }) => {
  const cat = await fnCreateCat({ data: { name } });
  if (items.length > 0) {
    await fnAddToCat({
      data: { categoryId: cat.id, items: items.map(i => ({ source: i.source, id: i.id })) },
    });
  }
  return cat;
},
onSuccess: (cat) => {
  toast.success("Categoria criada");
  setAddCategoryOpen(false);
  resetDialog();
  qc.invalidateQueries({ queryKey: ["vault"] });
  // opcional: navegar direto para a categoria recém-criada via setActiveTab
},
onError: (e) => toast.error(e.message),
```

`resetDialog()`: zera `categoryName`, `pickedItems`, `pickerSelected`, `dialogView = "form"`. Também disparado por `onOpenChange(false)` e pelo `X`/`Cancelar`.

`onClick` do Confirmar: `createCatMut.mutate({ name: categoryName.trim(), items: pickedItems.map(i => ({ source: i.source, id: i.id })) })`.

### Validação

- Nome: trim, obrigatório, ≤ 64 (bloqueado no `maxLength` do input e no schema).
- Itens: filtrados para `source in ("publication","upload")` — `chat` não é selecionável no picker (não existe hoje).
- Duplicatas: `addItemsToCategory` já ignora conflitos via `onConflict` — sem tratamento extra necessário.

### Fora do escopo

- Bolinha de seleção sempre visível no grid principal do Acervo (será tratada em outra iteração).
- Busca/filtros dentro do picker (grid simples com scroll).
- Reordenar mídias dentro da categoria.
- Preview de mídia dentro do picker (clique é apenas seleção).
