## Diagnóstico

No `src/routes/_authenticated/publisher.tsx`, ao clicar em **"Biblioteca do dispositivo"** o handler faz:

```ts
setPickerOpen(false);
setTimeout(() => fileInputRef.current?.click(), 100);
```

O `setTimeout` quebra a cadeia de user-gesture — Chrome/Safari bloqueiam silenciosamente `input.click()` fora do handler síncrono do clique. Resultado: o diálogo de arquivo nunca abre.

Bucket `publications` (privado) já foi criado com policies:
- INSERT/UPDATE/DELETE apenas para o dono em `posts/{userId}/…`
- SELECT liberado para `authenticated` (feed exibe via signed URL)

## Mudanças em `src/routes/_authenticated/publisher.tsx`

1. Trocar `BUCKET = "criativos"` por `BUCKET = "publications"`.
2. Substituir `getPublicUrl(path)` por `createSignedUrl(path, 60*60*24*365)` (1 ano) — bucket é privado.
3. Corrigir o picker:
   - `triggerFileInput()` passa a chamar `fileInputRef.current?.click()` **sincronamente** e fechar o Sheet em seguida (ordem importa).
   - Não usar `setTimeout`.

O input `<input type="file">` já é renderizado no root da página — mantém.

## Verificação

- `tsgo` para tipagem.
- Reproduzir manualmente: `/publisher` → "selecionar foto ou vídeo" → "Biblioteca" → escolher arquivo → preview aparece, upload conclui, botão "Continuar" habilita.
- Confirmar em `supabase.storage.list('posts/{userId}/drafts', { bucket: 'publications' })` que o arquivo chegou.

## Fora do escopo

- Sem alterar schema `publications`/`publication_media`, RLS de tabelas, feed ou pagamento.
- Mídias antigas em `criativos` continuam funcionando (URLs já persistidas no banco).
