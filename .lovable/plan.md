## Objetivo

Usar a mesma navbar da home (`SiteLayout` de `@/components/site/Layout`) nas páginas de cadastro, no lugar do header/footer inline atual.

## Mudanças

### 1. `src/routes/cadastro.tsx`
- Importar `SiteLayout` de `@/components/site/Layout`.
- Envolver o retorno com `<SiteLayout>...</SiteLayout>`.
- Remover o wrapper `min-h-screen ... flex-col`, o logo `<Link to="/">monetisex</Link>` do topo e o `<footer>` inline (a navbar/footer virão do `SiteLayout`).
- Manter o card e o formulário exatamente como estão.

### 2. `src/routes/cadastro.confirme-email.tsx`
- Mesma mudança: envolver com `SiteLayout`, remover o logo do topo e o footer inline.
- Manter o card com "Já confirmei" / "Reenviar e-mail" / "Usar outro e-mail".

## Fora do escopo

- Não altero a página `/entrar` nem outras rotas.
- Sem mudanças em auth, hook de e-mail ou template.
