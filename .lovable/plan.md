Ajustar o botão "Aplicar" no card "Top postagem" para ocupar toda a largura horizontal do card, alinhado à largura da barra "Ação: Exibir estatísticas".

### O que será alterado
- Arquivo: `src/routes/_authenticated/my-monetisex-stats.tsx`
- Local: wrapper do botão "Aplicar" (linhas ~1507-1517)

### Mudanças
1. Substituir o wrapper atual:
   ```jsx
   <div className="mt-4 flex justify-end">
     <Button size="sm" ...>Aplicar</Button>
   </div>
   ```
   por:
   ```jsx
   <div className="mt-4">
     <Button className="w-full" size="sm" ...>Aplicar</Button>
   </div>
   ```
2. Manter o estado `disabled` e o texto "Aplicando…" inalterados.

### Resultado esperado
- O botão "Aplicar" terá a mesma largura horizontal do card interno (mesma largura da barra de ação e do conteúdo acima).