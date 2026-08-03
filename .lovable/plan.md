# Corrigir logo na página /entrar

## Objetivo
Ajustar o texto do logo em `/src/routes/entrar.tsx` para exibir corretamente **"moneti"** (preto) + **"sexy."** (roxo), conforme a marca do app.

## Estado atual
No arquivo `src/routes/entrar.tsx`, linha ~71-73, o logo está renderizado como:
```tsx
<span className="text-2xl font-black tracking-tight">
  monet<span className="text-gradient-primary">isex</span>
</span>
```
Isso resulta em "monet" + "isex", que não corresponde ao nome correto.

## Alteração proposta
Substituir o bloco por:
```tsx
<span className="text-2xl font-black tracking-tight">
  moneti<span className="text-gradient-primary">sexy.</span>
</span>
```

## Escopo
- Apenas `src/routes/entrar.tsx`.
- Nenhuma mudança de dados, schema ou backend.
- Verificar se existem outros locais com o mesmo erro após a correção.
