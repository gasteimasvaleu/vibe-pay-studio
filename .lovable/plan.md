## Problema

Em `src/routes/_authenticated/my-monetisex-stats.tsx`, o botão com o texto "Acessar Meu Banco" (linha 575) está configurado com `to="/dashboard"`, ou seja, leva para a página errada.

## Mudança

Alterar o destino do `<Link>` para `/banco`, que é a rota correta do "Meu Banco" do app.

1. Na linha 575, trocar `to="/dashboard"` para `to="/banco"`.

## Verificação

- Abrir `/my-monetisex-stats` e clicar em "Acessar Meu Banco".
- Confirmar que a navegação leva para `/banco`.