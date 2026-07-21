Ajustar o alinhamento horizontal das setas de navegação no componente `CircularSteps` para que fiquem centralizadas, alinhadas verticalmente com a fileira de bolinhas indicadoras acima.

**Arquivo:** `src/components/feed/CircularSteps.tsx`

**Mudança:**
- No container dos botões de seta (linha 236), adicionar `justify-center` às classes Tailwind (`flex items-center justify-center gap-3`).
- Isso centraliza as setas na coluna de conteúdo, mantendo-as visualmente alinhadas com as bolinhas que já usam `flex justify-center`.

**Validação:** Verificar no preview que as setas esquerda/direita ficam centralizadas na mesma linha vertical das bolinhas.