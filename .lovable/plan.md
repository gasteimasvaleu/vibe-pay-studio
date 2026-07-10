## Criar página `/bugreport`

### 1. Nova rota `src/routes/_authenticated/bugreport.tsx`
- `createFileRoute("/_authenticated/bugreport")`
- `head()`: título "Reportar bug · Monetisexy" + `robots: noindex`
- `beforeLoad` com auth check → redirect `/entrar`
- Layout `max-w-3xl mx-auto`, header padrão com botão voltar e título centralizado "Reportar bug"
- Corpo do formulário (state local, sem persistência):
  - Título de seção: **"O que aconteceu?"** com subtítulo `text-muted-foreground` "Descreva o bug e nos ajude a resolver rápido."
  - Campo **Título** — `Input` com placeholder "Ex: Falha ao sacar", `maxLength={120}`
  - Campo **Descrição** — `Textarea` com placeholder "Conte o que aconteceu e em qual tela você estava...", `maxLength={5000}`, altura ~180px; contador `{n} / 5000` alinhado à direita abaixo
  - Bloco **Enviar mídia (opcional)** — label + subtítulo "Print, vídeo ou gravação de tela (até 5 mídias)"
    - Grid horizontal de miniaturas + tile de upload com borda `border-dashed`, ícone `Upload` e texto "Subir mídia"
    - `input type="file"` oculto, `accept="image/*,video/*"`, `multiple`, limite 5. Preview via `URL.createObjectURL`, botão X para remover cada uma
  - Botão **"Enviar"** full-width no rodapé, desabilitado enquanto `titulo.trim()` ou `descricao.trim()` estiverem vazios; ao clicar: `toast.success("Bug reportado com sucesso")` + reset (mock)

### 2. Editar `src/components/dashboard/CreatorDashboard.tsx` (card "Reportar bug", linha ~107-112)
- Adicionar `to="/bugreport"` ao `ActionCard`

Sem backend/upload real nesta etapa — só UI conforme o screenshot.