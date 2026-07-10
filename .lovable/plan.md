## Correção — divisor do header em `/content-leak-report`

Após varredura de `src/routes/_authenticated/*.tsx`, **apenas `content-leak-report.tsx`** está sem a linha inferior do header. Todas as outras páginas com botão voltar já usam a classe padrão `border-b border-border backdrop-blur-md bg-card/80`.

**Mudança em `src/routes/_authenticated/content-leak-report.tsx`:**

Reorganizar o layout para seguir o mesmo padrão de `mywallet.recarregar.tsx`:

- Wrapper externo full-width (sem padding lateral).
- `<header>` full-width com `relative z-10 border-b border-border backdrop-blur-md bg-card/80`, contendo um inner `max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3` com botão voltar à esquerda, `<h1>` ao centro e spacer `w-9` à direita.
- `<main className="max-w-3xl mx-auto px-4 md:px-6 py-8">` envolvendo o formulário existente (todos os campos, upload e botão Enviar permanecem iguais).

Sem outras alterações.
