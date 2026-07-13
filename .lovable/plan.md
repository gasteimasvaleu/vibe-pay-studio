Aplicar a mesma largura padrão (`max-w-3xl mx-auto`) usada no `DashboardShell` e outras páginas ao header, ao card de perfil e ao card de tabs em `src/routes/_authenticated/profile.$username.tsx`.

Mudanças:
- Envolver o `<header>` num container `max-w-3xl mx-auto px-4 md:px-6`
- Trocar o wrapper atual `px-4 space-y-4` do conteúdo por `max-w-3xl mx-auto px-4 md:px-6 space-y-4`

Sem mudanças de conteúdo ou lógica.