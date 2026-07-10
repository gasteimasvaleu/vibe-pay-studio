## Nova página `/settings/myprofile`

Página acessada ao clicar no card de perfil (avatar + nome + @username) em `/settings/creator`.

### Arquivos

**Criar** `src/routes/_authenticated/settings.myprofile.tsx`
- Rota autenticada, `noindex`, título "Meu perfil · Monetisex"
- `beforeLoad` busca `username` do profile (mesmo padrão de `settings.creator.tsx`)
- Header padrão do dashboard (border-b, back button, título "Meu perfil")

**Editar** `src/routes/_authenticated/settings.creator.tsx`
- Trocar o `Link to="/perfil/$username"` do card de perfil por `Link to="/settings/myprofile"`

### Layout da página (seguindo o screenshot)

Bloco central (topo do main):
- Avatar grande (h-28 w-28) centralizado com badge de câmera (ícone `Camera` em círculo escuro no canto inferior direito) — botão sem ação (toast "Em breve")
- Nome (display name) em bold, centralizado
- `@username` em muted, centralizado
- Botão outline arredondado "Copiar meu link Privacy" com ícone `Copy` — copia `${window.location.origin}/perfil/{username}` para clipboard e mostra toast

Lista de opções (mesmo componente `SettingsGroup`/`SettingsRow` de `settings.creator.tsx`, um único grupo sem título):
1. `User` — Nome de perfil e identificador
2. `Image` — Foto de capa, biografia e localização
3. `AtSign` — Redes Sociais
4. `Lock` — Alterar senha
5. `Trash2` — Excluir conta (variante destaque vermelho: `text-destructive`)

Todos os itens sem `to` → `toast.info("Em breve")`. Item "Excluir conta" recebe prop opcional `variant="destructive"` na `SettingsRow` para pintar ícone e label em vermelho.

Nada de backend, nada de outras rotas alteradas.
