## Objetivo

Nos inputs de Redes Sociais, exibir o prefixo fixo (`instagram.com/`, `tiktok.com/`, `x.com/`) bloqueado dentro do campo, permitindo que o usuário edite apenas o handle depois da "/", como no screenshot.

## Alterações

**`src/routes/_authenticated/settings.social-media.tsx`**

- Refatorar `SocialField` para renderizar uma "linha" clicável estilo input (mesmo container arredondado atual) contendo:
  - Ícone da rede à esquerda.
  - Texto fixo `instagram.com/` / `tiktok.com/` / `x.com/` (não editável, `select-none`, cor levemente esmaecida).
  - `<input>` transparente, sem borda, `flex-1`, que contém apenas o handle. Placeholder = `seuusuario`.
- O clique em qualquer parte da linha foca o `<input>` (usar `<label>` envolvendo tudo).
- Manter sanitização (`sanitize`) apenas sobre o handle digitado.
- Estado `dirty`, botões Salvar/Cancelar e chamada a `updateSocialLinks` permanecem iguais.
- Nenhuma mudança de schema, server function ou card de perfil.

## Detalhes técnicos

- Estrutura por campo:
  ```tsx
  <label className="[classes do input atual] flex items-center gap-2 cursor-text">
    <Icon />
    <span className="text-muted-foreground select-none">{prefix}</span>
    <input
      className="flex-1 bg-transparent outline-none border-0 p-0"
      value={value}
      onChange={(e) => onChange(sanitize(e.target.value))}
      placeholder="seuusuario"
    />
  </label>
  ```
- Prefixos: `instagram.com/`, `tiktok.com/`, `x.com/` (o handle do TikTok continua salvo sem `@`; a URL final do card segue usando `tiktok.com/@{handle}`).
