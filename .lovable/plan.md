## Centralizar RangeSelector no mobile

Em `src/routes/_authenticated/my-monetisex-stats.tsx` linha 290, o container do seletor de período usa `flex flex-wrap items-center gap-3` e fica alinhado à esquerda no mobile.

**Alteração:** trocar por `flex flex-wrap items-center justify-center gap-3 sm:justify-start` — centraliza "Período" e o botão de datas no mobile e mantém o alinhamento à esquerda em telas ≥ sm.
