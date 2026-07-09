### Ajustes no `/publisher`

#### 1. Sheet de seleção de mídia no desktop
- Atualizar `src/routes/_authenticated/publisher.tsx`.
- No `SheetContent` do picker (`side="bottom"`), adicionar classes para limitar e centralizar a largura em telas maiores:
  - `sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0` (ou equivalente com a utilidade do projeto).
- Manter o comportamento full-width em mobile e o estilo atual `rounded-t-2xl`.

#### 2. Renomear opção do acervo
- Trocar o label `Acervo na Privacy` por `Acervo no Monetisex` no picker de mídia.

#### Arquivos alterados
- `src/routes/_authenticated/publisher.tsx`

#### Fora de escopo
- Backend de upload.
- Lógica dos switches/criação de publicação.
- Reordenamento de mídia.

#### Validação
- Conferir visualmente no preview desktop que o sheet fica centralizado com ~420px de largura.
- Verificar se o texto `Acervo no Monetisex` aparece no picker.