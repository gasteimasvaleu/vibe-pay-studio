## Plano: página `/content-leak-report`

**Rota nova:** `src/routes/_authenticated/content-leak-report.tsx` (autenticada, `noindex`).

**Link:** no `CreatorDashboard.tsx`, adicionar `to="/content-leak-report"` no `ActionCard` do botão "Vazamento".

**Layout da página** (seguindo os screenshots):

- Header: botão voltar (ArrowLeft, `router.history.back()`) à esquerda + título centralizado **"Reportar vazamento de conteúdo"**.
- Seção **"Qual conteúdo foi vazado?"** (h2 bold) com subtítulo em `text-muted-foreground`: "Informe os detalhes do uso não autorizado do seu conteúdo. O link é essencial para rastrearmos e investigarmos o caso."
- Campo **Título** — `Input` com placeholder `Ex: Meu post foi copiado sem permissão`.
- Campo **URL do conteúdo vazado** — `Input` type url, placeholder `Ex: https://site.com/pagina-com-meu-conteudo`.
- Campo **Descrição** — `Textarea` (rows ~5, maxLength 5000), placeholder `Descreva onde e como seu conteúdo foi vazado`, com contador `{length} / 5000` alinhado à direita abaixo.
- Seção **Enviar mídia (opcional)** com subtítulo "Print, vídeo ou gravação de tela (até 5 mídias)": dropzone quadrado tracejado (`border-dashed`) com ícone `Upload` e texto "Subir mídia"; `<input type="file" multiple accept="image/*,video/*">` escondido, limite 5, mostra thumbnails/lista após seleção com botão remover.
- Botão **Enviar** full-width no rodapé, desabilitado enquanto Título, URL ou Descrição estiverem vazios.

**Estado:** `useState` para title, url, description, files. Submit apenas chama `toast.success("Denúncia enviada")`, limpa o form e volta — sem backend (pode ser adicionado depois).

**Componentes usados:** `Input`, `Textarea`, `Button`, `toast` (sonner) — todos já existem.

**Sem outras mudanças** (nenhum ajuste em backend, rotas ou outros arquivos).
