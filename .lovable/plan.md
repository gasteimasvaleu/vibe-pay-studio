## Diagnóstico

O screenshot de referência mostra pesos moderados (~700) com desenho arredondado — provavelmente renderizado com a fonte do sistema. O `/dashboard` atual usa:
- Fonte Inter carregada via Google Fonts
- `font-black` (peso 900) em títulos, valores e nome de perfil

Resultado: parece mais grosso e "agressivo" do que a referência, mesmo com tamanhos iguais.

## Mudanças

### 1. Reduzir o peso de `font-black` (900) para `font-bold` (700) nos componentes do dashboard

- `src/components/dashboard/EarningsSummary.tsx`
  - h3 do card: `font-black` → `font-bold`
  - valor `R$ -`: `font-black` → `font-bold`
- `src/components/dashboard/ProfileHeaderCard.tsx`
  - Nome "Caio": `font-black` → `font-bold`
  - Badge/avatar/contador de superfãs: `font-black` → `font-bold`
- `src/components/dashboard/DashboardShell.tsx`
  - Título da seção "Meu painel": manter `font-semibold` (já leve)
  - Eyebrow do `DashboardGroup` ("ÁREA DO CRIADOR"): manter `font-semibold`
- `src/components/dashboard/ActionCard.tsx` — já usa `font-semibold`, sem mudança.
- `src/components/dashboard/SubscriberDashboard.tsx` — mesmo tratamento (`font-black` → `font-bold`).

### 2. Trocar a família de fonte para system stack (opcional, mas casa com o screenshot)

- `src/styles.css`: alterar `--font-sans` de `"Inter", system-ui, sans-serif` para `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- `src/routes/__root.tsx`: remover o preconnect e o `<link>` do Google Fonts para Inter (não é mais necessário).

## Fora de escopo

- Não mexer em cores, layout, ícones, copy ou nos outros arquivos que já foram ajustados (`/sobre`, `/como-funciona`, onboarding).
- Não alterar peso em botões, badges do site público (Navbar/Footer) — só o dashboard.

## Validação

Rodar o build, abrir `/dashboard` e comparar lado a lado com o screenshot: peso dos títulos, valor `R$ -` e nome do perfil devem bater.
