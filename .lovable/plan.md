## Objetivo
Ligar a página `/settings/personal` a dados reais: campos travados (CPF, Nome Completo, Data de Nascimento) vindos do Veriff; campos editáveis (Apelido, Celular, Endereço) salvos em `profiles`, com botões Salvar/Cancelar seguindo o padrão do app.

## 1. Migração — novas colunas em `profiles`

Adicionar (todas nullable):
- `full_name text`
- `birth_date date`
- `nickname text`
- `phone text`
- `address_cep text`
- `address_street text`
- `address_number text`
- `address_complement text`
- `address_district text`
- `address_city text`
- `address_state text` (UF, 2 letras)

CPF já existe em `profiles.cpf`. Não haverá novas tabelas nem novas policies (as policies atuais de `profiles` cobrem update pelo próprio usuário).

## 2. Webhook do Veriff — extrair PII no `approved`

Em `src/routes/api/public/webhooks/veriff-decision.ts`:

- Ampliar o tipo do payload para incluir `verification.person` (`firstName`, `lastName`, `dateOfBirth`) e `verification.document` (`number`).
- Quando `nextStatus === "verified"`, popular no `update`:
  - `full_name` = `person.firstName + " " + person.lastName` (trim, só se houver ao menos um)
  - `birth_date` = `person.dateOfBirth` (formato ISO `YYYY-MM-DD` que o Veriff já entrega)
  - `cpf` = dígitos de `document.number` (só se ainda estiver vazio, para não sobrescrever um CPF já digitado no Asaas)
- Manter o resto do fluxo (idempotência, 200 em erro, etc.).

## 3. Server function — leitura + gravação

Novo arquivo `src/lib/personal.functions.ts`:

- `getPersonalProfile` (GET, autenticado): retorna `{ cpf, full_name, birth_date, nickname, phone, address_* }` do próprio `user_id`.
- `updatePersonalProfile` (POST, autenticado): recebe apenas os campos editáveis (`nickname`, `phone`, `address_*`) validados com Zod (UF ∈ BR_STATES, CEP 8 dígitos, campos obrigatórios não-vazios) e faz `update` em `profiles` via `context.supabase` (RLS).

## 4. Tela — `settings.personal.tsx`

- No `loader` (dentro de `_authenticated`, portanto safe para server-fn autenticada): chamar `getPersonalProfile` e retornar como `Route.useLoaderData()`.
- Inicializar todos os `useState` com os valores retornados; guardar `initial` para o Cancelar.
- Formatar exibição de `cpf` (`000.000.000-00`), `birth_date` (`DD/MM/AAAA`) e montar `full_name` a partir do banco — se estiverem vazios, manter placeholder e uma nota "Será preenchido após verificação de identidade".
- Máscaras nos editáveis: CEP `00000-000`, celular `(00) 00000-0000`.
- Trocar `handleSave` para chamar `updatePersonalProfile` via `useServerFn`, com `toast.success`/`toast.error` e atualização do `initial`.
- Adicionar `dirty` (compara estado atual com `initial`) e botões **Salvar** / **Cancelar** no mesmo padrão de `settings.subscription.tsx` (dois botões `w-full`, Salvar desabilitado quando `!dirty` ou saving, Cancelar restaura `initial`).
- `router.invalidate()` após salvar para revalidar o loader.

## Detalhes técnicos

- Novas colunas: sem `NOT NULL`, sem default, sem CHECK — para não quebrar linhas existentes e permitir preenchimento gradual pelo Veriff.
- Webhook: `person`/`document` podem vir `null` em `declined`/`resubmission`; só ler quando `nextStatus === "verified"`.
- `cpf` só é sobrescrito se `profiles.cpf` estiver NULL (usar um segundo update condicional, ou incluir no update principal apenas se estava vazio — checamos antes com um `select`).
- `personal.functions.ts` fica em `src/lib/` (client-safe path). Não importa `client.server` — usa `context.supabase` do `requireSupabaseAuth`.
- Loader roda sob `_authenticated`, então é seguro chamar a server-fn autenticada.
