## Objetivo
Ao clicar em "Habilitar" na página `/settings/two-factor`, navegar para uma nova página dedicada `/settings/two-factor/setup` que mostra o QR Code para configuração (UI mock, sem integração real).

## Estrutura de rotas
Hoje existe `settings.two-factor.tsx` como leaf. Para adicionar `/settings/two-factor/setup` sem quebrar a leaf, converter em layout:

- **Renomear** `src/routes/_authenticated/settings.two-factor.tsx` → `src/routes/_authenticated/settings.two-factor.index.tsx` (mesmo conteúdo atual; apenas troca o botão "Habilitar" para `<Link to="/settings/two-factor/setup">`).
- **Novo** `src/routes/_authenticated/settings.two-factor.tsx` — layout mínimo: `beforeLoad` auth check + `component: () => <Outlet />`.
- **Novo** `src/routes/_authenticated/settings.two-factor.setup.tsx` — página do QR Code.

## Página de setup (`/settings/two-factor/setup`)
Seguindo o screenshot:

- Header padrão (botão voltar → `router.history.back()`, título "Autenticação de Dois Fatores").
- `main max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6`:
  - Título `h2` bold "Escaneie o QR Code abaixo".
  - Subtítulo `text-muted-foreground`: "Use o aplicativo para escanear o QR Code fornecido ou insira o código manualmente".
  - QR Code centralizado num quadrado branco com padding (`bg-white p-4 rounded-2xl`), tamanho ~256px. Gerado via lib `qrcode` (adicionar dependência) a partir de uma URI `otpauth://` mock fixa usando o email do usuário obtido em `useEffect` com `supabase.auth.getUser()`. Renderizado como `<img src={dataUrl}>`.
  - Campo com o código secreto (string mock fixa `GJRGKYZUHFRWILLGGMYGCLJUGMZTILLBMRSDELLGMJSGCYZSME3WKZJQMM`) dentro de um container `rounded-full bg-muted px-5 py-3` com botão ícone `Copy` (lucide) à direita → `navigator.clipboard.writeText(...)` + `toast.success("Código copiado")`.
- Barra fixa inferior `fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur px-4 md:px-6 py-3` com dois botões lado a lado (`grid grid-cols-2 gap-3 max-w-3xl mx-auto`):
  - "Copiar Código" — variant outline `rounded-full h-12` — copia o código.
  - "Avançar" — `rounded-full h-12 bg-gradient-primary text-primary-foreground` — `toast.info("Em breve")` (mock; próxima etapa não incluída neste plano).

## Dependência
Adicionar `qrcode` (`bun add qrcode` + `bun add -d @types/qrcode`) para gerar o QR code no cliente.

## Observações
- Página é UI mock; nenhum fluxo real de MFA, banco ou backend.
- Nenhuma outra rota é afetada; link do menu Segurança → `/settings/two-factor` continua funcionando (agora resolve para o `index`).
