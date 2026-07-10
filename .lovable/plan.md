## Objetivo
Criar página `/settings/privacy-options` (UI mock) com a lista de toggles do screenshot e ligar ao item "Configurações de privacidade" em `/settings/privacy`.

## Arquivos

**Novo:** `src/routes/_authenticated/settings.privacy-options.tsx`
- Rota: `/_authenticated/settings/privacy-options`
- `head()`: título "Configurações de privacidade · Monetisexy", `noindex`
- `beforeLoad`: `supabase.auth.getUser()` → redirect `/entrar` se sem sessão
- Layout:
  - Header padrão (voltar + título "Configurações de privacidade")
  - `main max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6`
  - Lista de linhas (sem card container, como no screenshot). Cada linha:
    - Esquerda: `label` bold + `description` `text-sm text-muted-foreground`
    - Direita: shadcn `Switch` (`@/components/ui/switch`), estado local via `useState<Record<string, boolean>>`, `onCheckedChange` só atualiza estado local (mock).
  - Itens (label / description):
    1. "Restringir perfil das pesquisas" — "Esta opção pode demorar até uma hora para ter efeito."
    2. "Restringir perfil das pesquisas no Brasil" — "Esta opção pode demorar até uma hora para ter efeito. O perfil continuará visível para usuários de outros países."
    3. "Restringir perfil das pesquisas no meu país" — mesma descrição do item 2.
    4. "Exibir quantidade de seguidores no perfil" — "Esta opção permite que o perfil exiba a quantidade de seguidores."
    5. "Restringir menções ao perfil" — "Esta opção permite que o perfil não seja mencionado em outros perfis."
    6. "Restringir amizades" — "Esta opção restringirá que seu perfil apareça como amigo em outros perfis."
    7. "Configuração de envio de e-mails" — "Ao desativar, a Monetisexy não enviará mais e-mails."

**Editado:** `src/routes/_authenticated/settings.privacy.tsx`
- Trocar o array `ITEMS` de strings por objetos `{ label, to? }` e converter os botões: quando `to`, renderizar `<Link>`; senão, `<button>` com `toast.info("Em breve")`. Adicionar `to: "/settings/privacy-options"` no item "Configurações de privacidade".

## Observações
- UI puramente mock; toggles não persistem em backend.
- "Monetisexy" substitui o placeholder "Privacy" que aparece no screenshot do 7º item (nome do app do projeto).
