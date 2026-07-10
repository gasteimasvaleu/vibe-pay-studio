## Rename Monetisex → Monetisexy

Substituição global em strings visíveis do app.

### Mudanças

1. **Botão em `settings.myprofile.tsx`**: "Copiar meu link Privacy" → "Copiar meu link Monetisexy".

2. **Substituir `Monetisex` por `Monetisexy` em todo o conteúdo** dos arquivos abaixo (via `sed`, apenas texto — sem tocar em nomes de arquivo/rota como `my-monetisex-stats.tsx`, nem em identificadores CSS/domínios):
   - `src/routes/__root.tsx`, `index.tsx`, `sobre.tsx`, `entrar.tsx`, `cadastro.tsx`, `como-funciona.tsx`
   - `src/routes/_authenticated/`: `dashboard.tsx`, `feed.tsx`, `follow.tsx`, `publisher.tsx`, `promotion.tsx`, `promotions.tsx`, `perfil.$username.tsx`, `banco.tsx`, `banco.cadastrar.tsx`, `mywallet.index.tsx`, `mywallet.recarregar.tsx`, `mywallet.extrato.tsx`, `my-monetisex-stats.tsx`, `content-leak-report.tsx`, `settings.creator.tsx`, `settings.myprofile.tsx`, `creator.onboarding.assinatura.tsx`, `creator.onboarding.redes-sociais.tsx`, `creator.onboarding.documentos.index.tsx`, `creator.onboarding.documentos.aprovado.tsx`, `creator.onboarding.documentos.verificando.tsx`
   - `src/components/site/Footer.tsx`, `src/components/dashboard/CreatorDashboard.tsx`

Nada de mudanças em banco, rotas, ou nomes de arquivo.
