## Objetivo
Transformar o input de handle em um campo com prefixo bloqueado `monetisexy.com/`, onde o usuário só edita o que vem depois — que será o endereço do perfil.

## Mudanças

**Arquivo:** `src/routes/_authenticated/criar-perfil-gratuito.tsx` (linhas 242-254)

- Substituir o `<Input>` atual por um container estilizado (mesma aparência: `rounded-md bg-muted/60 h-12`) que agrupa:
  - Um `<span>` não-editável com o texto `monetisexy.com/` (cor `text-muted-foreground`, sem seleção via `select-none`, `pl-5 pr-1`).
  - Um `<input>` transparente (sem borda/background) que ocupa o resto da largura, mantendo o `value={handle}` e o `onChange` já existentes (sanitização inalterada).
- Ajustar o `placeholder` do input interno para apenas `seuusuario` (o prefixo já está visível ao lado).
- Manter a mensagem de erro `handleValid` logo abaixo, sem alteração de lógica.
- Nenhuma mudança em estado, validação, backend ou fluxo de submissão — apenas apresentação do campo.

## Observações
- O prefixo é puramente visual: o valor salvo em `handle` continua sendo só o username, como já é hoje.
- Foco/click em qualquer área do bloco leva o cursor para o input editável.
