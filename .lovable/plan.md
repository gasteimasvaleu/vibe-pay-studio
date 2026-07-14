Ajustar os botões de ação **Mimo** e **Chat** no card de identidade de `src/routes/_authenticated/perfil.$username.tsx`:

1. **Botões mais finos**: reduzir a altura de `h-14` para `h-10` (40 px) e manter o layout centralizado.
2. **Bolinha do ícone proporcional**: reduzir o círculo de `h-8 w-8` para `h-7 w-7` para acompanhar o botão mais fino.
3. **Cor da borda da bolinha**: trocar `border border-border` por `border border-black` no `<span>` que envolve o ícone, tornando o contorno visível conforme solicitado.
4. **Manter comportamento**: os `onClick` de abrir `TipDialog` e navegar para `/chat` permanecem inalterados.

Escopo limitado ao card de perfil; nenhuma outra página ou componente será alterada.