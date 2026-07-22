O usuário quer que o fundo interno do campo de digitação do chat (componente `ChatComposer`) seja branco, conforme seleção no preview.

### Escopo
- Arquivo: `src/components/chat/ChatComposer.tsx`
- Alvo: container principal do input de mensagem (linha aproximada 266)

### Mudança
Trocar a classe de fundo do container de `bg-card` para `bg-white`, forçando o fundo branco no composer.

```diff
- <div className="rounded-2xl border border-border bg-card px-4 pt-3 pb-2 shadow-sm">
+ <div className="rounded-2xl border border-border bg-white px-4 pt-3 pb-2 shadow-sm">
```

### Considerações
- O `Textarea` interno usa `bg-transparent`, então herda a cor do container — trocar o container é suficiente.
- A área de preview de mídia acima (quando há anexos) permanece com `bg-card`, pois não faz parte do fundo interno do campo de digitação. Se o usuário quiser que ela também fique branca, isso pode ser incluído no mesmo ajuste.

### Validação
- Verificar visualmente no preview se o fundo do composer ficou branco.
- Confirmar que o build/typecheck continua passando.