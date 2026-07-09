Problema identificado:

A URL muda para `/creator/onboarding/documentos/verificando`, mas a tela continua mostrando o conteúdo de `/documentos` com botão “Preparando...”. Isso acontece porque `src/routes/_authenticated/creator.onboarding.documentos.tsx` virou rota-pai de `verificando` e `aprovado`, mas não renderiza `<Outlet />`. No TanStack Router, uma rota-pai sem `<Outlet />` bloqueia a renderização dos filhos — por isso o loading roxo da rota `verificando` nunca aparece.

Do I know what the issue is? Sim: o problema não é mais Veriff nem popup; é arquitetura de rota pai/filha.

Plano de correção:

1. **Transformar `/documentos` em layout pai correto**
   - Alterar `src/routes/_authenticated/creator.onboarding.documentos.tsx` para renderizar apenas `<Outlet />`.
   - Isso permite que `/documentos/verificando` e `/documentos/aprovado` apareçam de verdade.

2. **Mover a página atual de documentos para a rota index**
   - Criar `src/routes/_authenticated/creator.onboarding.documentos.index.tsx` com o conteúdo atual da tela “Verificação de documentos”.
   - Essa página continua respondendo em `/creator/onboarding/documentos`.
   - O botão continua criando a sessão Veriff, abrindo a URL real, e depois navegando para `/creator/onboarding/documentos/verificando`.

3. **Manter `/documentos/verificando` como loading real**
   - A rota existente `creator.onboarding.documentos.verificando.tsx` passa a renderizar corretamente.
   - Ela mantém fundo escuro, loader gooey roxo e texto “Verificação de identidade em andamento”.

4. **Limpar pendings que atrapalham**
   - Remover o pending customizado da rota `_authenticated` se ainda estiver interferindo.
   - Não adicionar loading roxo global; ele deve aparecer apenas na rota `verificando`.

5. **Validar**
   - Confirmar que `/creator/onboarding/documentos` mostra os cards e botão.
   - Confirmar que `/creator/onboarding/documentos/verificando` mostra o loader roxo, não a tela de documentos.
   - Confirmar que o fluxo é: clicar → Veriff abre → aba atual vai para `verificando`.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>