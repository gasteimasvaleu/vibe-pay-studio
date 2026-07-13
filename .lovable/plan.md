## Objetivo

1. O botão "Editar perfil" (em `src/routes/_authenticated/perfil.$username.tsx`, linha ~181) deve navegar para `/settings/creator`.
2. A página `/settings/creator` deve detectar o `account_type` do usuário. No modo **assinante**, mostra uma versão restrita (conforme o screenshot); no modo **creator**, mantém o layout atual.

## Alterações

### 1. `src/routes/_authenticated/perfil.$username.tsx`
Trocar o `<button>` da linha 181 por um `<Link to="/settings/creator">` mantendo as mesmas classes visuais.

### 2. `src/routes/_authenticated/settings.creator.tsx`

**No `beforeLoad`:** adicionar `account_type` ao select do perfil e retorná-lo no contexto junto com `username`.

**No componente:** ler `accountType` do contexto. Se `accountType !== "creator"`, renderizar a versão restrita; caso contrário, manter o layout atual.

**Versão restrita (assinante) — segue o screenshot:**

- Header idêntico (botão voltar + título "Configurações de Perfil").
- Card de perfil (Avatar + nome + `@username`) reutilizando o link atual para `/settings/myprofile`, com um badge/label extra **"Perfil Grátis"** em laranja (`text-orange-500`) abaixo do `@username`.
- Um único grupo **"Geral"** contendo apenas:
  - Privacidade (`EyeOff`) → `/settings/privacy`
  - Link de indicação (`Link2`) → placeholder `toast.info("Em breve")` (rota ainda não existe)
  - Configuração do chat (`MessageCircle`) → `/settings/chat-settings`
  - Assinantes restritos (`UserX`) → `/settings/restrictions`
- Banner informativo no rodapé (fundo `bg-orange-50`, texto centralizado):
  > "Outras personalizações do menu estão disponíveis apenas no perfil pago."

Os componentes internos `SettingsGroup` e `SettingsRow` já existentes serão reutilizados.

## Detalhes técnicos

- Nenhuma nova rota é criada; "Link de indicação" fica como placeholder até que a rota exista.
- `account_type` é lido do `profiles` (mesmo padrão de `dashboard.tsx`).
- Sem mudanças em lógica de negócio: apenas navegação e apresentação condicional.