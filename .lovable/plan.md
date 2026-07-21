## Objetivo
Aproximar o card branco de confirmação de e-mail da navbar superior, tanto no desktop quanto no mobile, na rota `/cadastro/confirme-email`.

## Estado atual
- Arquivo: `src/routes/cadastro.confirme-email.tsx`
- O container do card usa `py-16` (linha 92), criando um espaçamento vertical grande entre a navbar e o card.

## Plano de ação
1. **Ajustar padding vertical do container**  
   Substituir `py-16` por `py-8` no `<div className="flex items-center justify-center px-4 py-16">` para reduzir a distância entre o card e a navbar em ambos os breakpoints.

2. **Verificar responsividade**  
   Como o layout já é responsivo (imagem 16:9 no topo no mobile e 1:1 à esquerda no desktop), a redução do padding vertical afeta os dois casos de forma uniforme, sem quebrar a estrutura do card.

3. **Validar no preview**  
   Conferir visualmente no preview que o card subiu e ficou mais próximo da navbar, mantendo legibilidade e sem colar demais.

## Arquivo envolvido
- `src/routes/cadastro.confirme-email.tsx`

## Resultado esperado
Card de confirmação de e-mail visualmente mais próximo da navbar, com espaçamento mais equilibrado em desktop e mobile.