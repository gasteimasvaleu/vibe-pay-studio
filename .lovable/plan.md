## Mudança

No `ExtratosPanel` (`src/routes/_authenticated/my-monetisex-stats.tsx` L869–894), a linha de controles tem 2 chips (`Faturamento`, `Ganhos por produto`) + dropdown de produto. No mobile isso quebra em duas linhas apertadas.

Aplicar o mesmo padrão dos outros SubTabsRow:

- **Mobile (`< sm`)**: renderizar `SubTabsRow` (que já é dropdown no mobile) para `EXTRATO_TABS`, empilhado acima do dropdown de produto (também full-width). Empilhamento vertical com `gap-2`.
- **Desktop (`sm+`)**: manter o layout atual — chips + dropdown lado a lado com `flex-wrap`.

Não altero `EXTRATO_TABS`, `PRODUTO_OPTIONS` ou o dropdown de produto em si; só o wrapper e a renderização dos chips de aba. Substituo o `.map(EXTRATO_TABS)` inline pelo `<SubTabsRow>` já existente, aproveitando a variante mobile pronta.

Layout resultante:
```
mobile:              desktop:
[▼ Faturamento    ]  [Faturamento] [Ganhos por produto] [▼ Todos os produtos]
[▼ Todos os produtos]
```

O dropdown de produto no mobile ganha `w-full`; no desktop volta a `w-auto` via `sm:w-auto`.
