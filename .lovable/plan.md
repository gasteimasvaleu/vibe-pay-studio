## Página `/settings/personal` — Dados Pessoais

### Alterações

**Criar `src/routes/_authenticated/settings.personal.tsx`**
- `createFileRoute("/_authenticated/settings/personal")`, `noindex`, title "Dados Pessoais · Monetisexy", `beforeLoad` verificando auth.
- Header padrão: botão voltar à esquerda, título **"Dados Pessoais"** centralizado.

**Editar `src/routes/_authenticated/settings.creator.tsx`**
- Adicionar `to="/settings/personal"` no `SettingsRow` "Dados Pessoais" (linha 93).

### Layout (`main max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28`)

**Tabs no topo** com dois triggers: **Informações** e **Endereço**. Estilo underline: linha da aba ativa em `bg-primary` (laranja/âmbar do site), inativas em `text-muted-foreground`, hairline `border-b border-border` de fundo. Uso do componente `Tabs` do shadcn com customização visual, não a versão pill-default.

### Aba "Informações"
Grid `grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4`:

- **Coluna esquerda:**
  1. **Apelido** (editável) — `FloatingField` (rounded-2xl bg-muted): label pequena `Apelido`, valor `Caio`.
  2. Texto informativo entre os campos (col-span-2 no md, mas exibido apenas antes dos disabled): `Os campos abaixo não podem ser editados` (`text-sm text-muted-foreground`).
  3. **CPF** (disabled) — pilha visual igual, mas `text-muted-foreground/70`.
  4. **Nome Completo** (disabled).
- **Coluna direita:**
  1. **Celular** (editável) — pilha idêntica.
  2. **E-mail** (disabled).
  3. **Data de Nascimento** (disabled).

### Aba "Endereço"
- **País** (select disabled com valor `Brasil` e chevron à direita) — full width.
- Grid 2 colunas:
  - **CEP** (obrigatório) + **Endereço** (obrigatório).
  - **Número** (obrigatório) + **Complemento** (opcional).
  - **Bairro** (obrigatório) + **Cidade** (obrigatório).
- **Estado** (select) full width, placeholder `Estado` com chevron.
- Campos obrigatórios vazios mostram: contorno vermelho no field (`ring-2 ring-destructive`) e mensagem `Campo obrigatório` (`text-sm text-destructive`) abaixo — só após tentativa de salvar (flag `attempted`).

### Barra fixa Salvar
- `fixed bottom-0`, `Button` full-width `h-12 rounded-full bg-primary text-primary-foreground`, texto **Salvar**.
- Ao clicar: valida a aba de endereço (marca `attempted=true`); se inválido, alterna para a aba Endereço e mostra os erros; se válido, `toast.info("Em breve")` (sem persistência — colunas não existem no schema).

### Componentes internos
- `FloatingField({ label, value, onChange?, disabled?, error?, placeholder? })` — pilha `rounded-2xl` `bg-muted`, label xs muted no topo, `Input` sem borda `bg-transparent`; quando `error` verdadeiro: `ring-2 ring-destructive` + texto vermelho no valor. Mensagem `Campo obrigatório` renderizada abaixo pelo consumidor.
- `SelectField` similar usando `Select` do shadcn, com chevron.

### Estado local (`useState`)
- Info: `nickname`, `phone` (editáveis); demais valores mock (placeholder).
- Endereço: `country="Brasil"`, `cep`, `address`, `number`, `complement`, `district`, `city`, `state`, `attempted`.

### Tokens
Apenas semânticos: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `text-destructive`, `ring-destructive`, `bg-primary`, `text-primary-foreground`. Sem cores hardcoded, sem lógica de backend.
