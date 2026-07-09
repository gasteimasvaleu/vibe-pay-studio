## Diagnóstico

A tela `/` (`src/routes/index.tsx`) usa um `<div class="flex items-center ...">` com os ícones `Mail`/`Lock` como *irmãos* do `<input>`. Quando o Chrome preenche automaticamente o e-mail/senha, o autofill pinta o input com um fundo branco/azulado (`-webkit-autofill`) e o retângulo do input, por ser irmão no flexbox e ter `w-full`, sobrepõe visualmente o ícone à esquerda — daí a sensação de que "o input está cobrindo o ícone".

## Plano

Editar apenas `src/routes/index.tsx`, nos dois campos (e-mail e senha):

1. **Reposicionar os ícones como `absolute` dentro do wrapper** (`left-3 top-1/2 -translate-y-1/2`) em vez de irmãos flex do input. Assim o input pode ocupar 100% da largura sem sobrepor visualmente o ícone.
2. **Adicionar `pl-10` no input** (e `pr-10` no de senha para o botão do olho, que também vira `absolute right-3`).
3. **Neutralizar o fundo do autofill do Chrome** com uma classe local que aplique:
   - `-webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset;`
   - `-webkit-text-fill-color: #fff;`
   - `caret-color: #fff;`
   Injetado via `<style>` no próprio arquivo, escopado por `data-auth-input` para não vazar para o resto do app.
4. Adicionar `autoComplete="email"` e `autoComplete="current-password"` para consistência.

Não altero comportamento de submit, validação, estilos gerais do card ou lógica de auth.
