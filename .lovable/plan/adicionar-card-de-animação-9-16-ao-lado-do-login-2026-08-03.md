# Adicionar card de animação 9:16 ao lado do login

## Objetivo
Na página `/entrar`, adicionar um segundo card à direita do card de login contendo a animação fornecida, no formato 9:16 e em loop contínuo.

## Referência visual
- URL do vídeo: `https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/02178465912133300000000000000000000ffffc0a8b2417262a0.mp4`
- Proporção: 9:16 (vertical)
- Comportamento: looping automático

## Alterações propostas

### 1. Layout em duas colunas
Transformar o container central de `/src/routes/entrar.tsx` de uma única coluna centralizada em um grid de duas colunas em telas médias/grandes (`md:`), mantendo o card de login à esquerda e o novo card de vídeo à direita. Em mobile, os cards devem empilhar verticalmente (vídeo opcionalmente oculto ou acima do login, a decidir).

### 2. Card de vídeo
Criar um card com:
- Mesma estética de borda arredondada (`rounded-3xl`) e fundo (`bg-surface`) do card de login para manter consistência visual.
- Container com aspect-ratio 9:16 (`aspect-[9/16]`).
- Elemento `<video>` carregando o vídeo da URL fornecida.
- Atributos: `autoPlay`, `muted`, `loop`, `playsInline`, sem controles visíveis.
- `object-cover` para preencher o espaço sem distorcer.
- Limite de altura para não ultrapassar a viewport (ex.: `max-h-[70vh]` ou `h-full` dentro do grid).

### 3. Responsividade
- Em telas menores que `md`, o card de vídeo deve ser oculto ou reposicionado abaixo do login para não quebrar a usabilidade.
- Garantir que o card de login continue funcionando e centralizado em mobile.

### 4. Ajustes de espaçamento
- Reduzir a largura máxima do container quando houver duas colunas (ex.: `max-w-4xl` ou `max-w-5xl`).
- Ajustar padding e gaps para que os cards fiquem harmoniosos.

## Escopo
- Apenas `src/routes/entrar.tsx`.
- Nenhuma alteração de backend, schema ou dados.
- O vídeo é carregado diretamente da URL pública fornecida.
