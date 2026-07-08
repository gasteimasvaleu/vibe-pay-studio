# Plano: Limpar homepage abaixo do hero

## Objetivo
Remover a seção de estatísticas selecionada (`+10M`, `+750K`, `LATAM`) e todas as seções subsequentes da página inicial, mantendo apenas o hero (formulário + card de ilustração).

## Escopo
Edição em `src/routes/index.tsx`.

## Mudanças
1. Remover a seção `STATS` (linha ~127) e todo o seu conteúdo.
2. Remover as seções seguintes:
   - `HOW IT WORKS` (passo a passo)
   - `FEATURES` (diferenciais)
   - `TESTIMONIALS` (depoimentos)
   - `FINAL CTA` (call-to-action final)
3. Preservar o componente `HomePage`, `SiteLayout` e a seção `HERO` intactos.

## Resultado esperado
A homepage exibe apenas a seção hero com o formulário de entrada e o card da ilustração, sem estatísticas, depoimentos, diferenciais ou CTA final.

## Verificação
- Compilar o projeto para garantir que a remoção não quebra importações ou estrutura JSX.
- Capturar screenshot do preview para confirmar que as seções foram removidas.