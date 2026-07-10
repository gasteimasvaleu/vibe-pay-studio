## Nova página `/settings/social`

Acessada ao clicar na linha "Nome de perfil e identificador" em `/settings/myprofile`.

### Arquivos

**Criar** `src/routes/_authenticated/settings.social.tsx`
- Rota autenticada, `noindex`, título "Nome de perfil e identificador · Monetisexy"
- `beforeLoad` busca `username` (e tenta `display_name` se existir na tabela `profiles`; caso não exista, deriva do username como já é feito hoje)
- Header padrão (border-b, back button, título "Nome de perfil e Identificador")

**Editar** `src/routes/_authenticated/settings.myprofile.tsx`
- Trocar o primeiro `SettingsRow` ("Nome de perfil e identificador") para navegar para `/settings/social` (adicionar prop `to` no componente `SettingsRow`, análogo ao padrão de `settings.creator.tsx`)

### Layout (seguindo o screenshot)

`main max-w-3xl mx-auto py-6 space-y-3`:

1. **Campo "Nome do Perfil"** — container arredondado (`rounded-2xl bg-muted px-5 py-3`) com label flutuante pequena em cima ("Nome do Perfil") e `Input` sem borda/background dentro (`border-0 bg-transparent p-0 h-auto text-lg`), controlado por `useState` inicializado com o display name.

2. **Campo "identificador"** — mesmo estilo, com ícone `AtSign` (ou `MessageCircle` para casar com o balão do screenshot) à esquerda, label pequena "monetisexy.com.br/(seu @)" e valor `@username` abaixo em `text-lg`. Também `Input` controlado.

Sem botão de salvar visível no screenshot; ao editar mostra `toast.info("Em breve")` no `onBlur`/`onChange` debounced — mais simples: apenas armazenar em state local, sem persistência (backend fica para depois). Nada de mudanças em banco.

Observação: o domínio na label passa a ser `monetisexy.com.br` (o screenshot mostra `privacy.com.br` da referência antiga, mas o site já foi renomeado para Monetisexy).
