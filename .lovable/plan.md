# Igualar tamanho do card de animação ao card de login

## Objetivo
Fazer com que o card de animação 9:16 na página `/entrar` tenha exatamente o mesmo tamanho (altura e largura) do card de login ao lado.

## Estado atual
O card de vídeo usa `aspect-[9/16]`, o que o torna proporcionalmente alto e com largura definida pela proporção. Isso faz com que ele não alinhe em altura com o card de login.

## Alterações propostas

### 1. Alinhar alturas com `items-stretch`
Trocar `items-center` por `items-stretch` no grid pai para que ambos os cards estiquem até a mesma altura natural do maior deles (o login).

### 2. Fazer o card de vídeo preencher o espaço
- Remover a proporção fixa do card externo.
- Transformar o card de vídeo em um container flex (`flex flex-col`) com `h-full`.
- Fazer o container interno do vídeo ocupar `flex-1` e `relative`.

### 3. Manter o vídeo preenchendo o card
- O elemento `<video>` continua com `object-cover`, `absolute inset-0`, `h-full w-full`.
- Como a fonte é 9:16 e o card é mais largo, o vídeo será cortado nas laterais para preencher o espaço, mantendo o loop e o formato vertical da mídia.

### 4. Garantir consistência visual
- Manter as mesmas classes de borda (`rounded-3xl border border-border bg-surface overflow-hidden`) do card de login.
- Em mobile, continuar oculto (`hidden md:block`).

## Escopo
- Apenas `src/routes/entrar.tsx`.
- Nenhuma alteração de backend, schema ou dados.
