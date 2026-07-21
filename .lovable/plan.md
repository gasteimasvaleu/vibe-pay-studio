## Objetivo
Transformar a página `/cadastro/confirme-email` em um único card com fundo branco contendo duas seções separadas por divisória:
- **Desktop**: imagem 1:1 à esquerda + conteúdo à direita
- **Mobile**: imagem 16:9 no topo + conteúdo abaixo

## Arquivo alterado
`src/routes/cadastro.confirme-email.tsx`

## Mudanças

1. **Estrutura do card externo**
   - Trocar o container atual (`max-w-md` + `bg-surface`) por um card maior `max-w-4xl` com `bg-white` (fundo branco fixo, sem depender de tema).
   - Usar layout responsivo: `flex flex-col md:flex-row` com divisória (`border-b md:border-b-0 md:border-r`).

2. **Seção da imagem**
   - Desktop (`md:`): metade esquerda, aspect `1:1`, imagem `gpt-image-2-1.png`.
   - Mobile: topo, aspect `16:9`, imagem `gpt-image-2-1 (1).png`.
   - Implementar com duas `<img>` — uma visível apenas em `md:` (1:1), outra apenas em mobile (16:9) — usando classes `hidden md:block` e `md:hidden`.
   - `object-cover` + fundo branco no wrapper.

3. **Seção do conteúdo (direita/inferior)**
   - Manter todo o conteúdo atual (h1, textos, botões "Já confirmei" / "Reenviar" / "Usar outro e-mail", mensagens de info/erro).
   - Ajustar o wrapper interno para fundo branco e cor de texto escura fixa (para funcionar bem sobre o branco no dark mode também): título em `text-slate-900`, textos secundários em `text-slate-600`.
   - Botão primário mantém `bg-gradient-primary`.
   - Botão secundário "Reenviar" com borda cinza clara sobre branco.

4. **Bordas e sombras**
   - Card externo: `rounded-3xl overflow-hidden shadow-card border border-slate-200`.

## Detalhes técnicos
- URLs das imagens são referenciadas diretamente (Supabase Storage público), não precisam ir para `lovable-assets`.
- Nenhuma mudança de lógica: `handleAlreadyConfirmed`, `handleResend`, `cooldown`, `searchSchema` e head permanecem intactos.
- Sem novas dependências.