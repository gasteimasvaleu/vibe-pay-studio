## Objetivo
Reformular `/como-funciona` para replicar o layout do screenshot (calculadora com 3 sliders + card escuro de resultado com níveis, e faixa "Como funciona" com 4 ícones horizontais), adaptado ao tema roxo do app.

## Mudanças em `src/routes/como-funciona.tsx`

### 1. Hero (manter simples)
Mantém título/subtítulo, encurta para dar destaque à calculadora logo abaixo.

### 2. Nova seção "Quanto você pode ganhar?" (substitui a calculadora atual)
Grid 2 colunas (empilha no mobile):

**Coluna esquerda — card claro com 3 sliders:**
- `Assinatura mensal` — R$ 9,90 a R$ 199,90 (default R$ 19,90)
- `Seguidores nas redes sociais` — 100 a 500.000 (default 100, escala log)
- `Posts por semana na Privacy` — 1x a 30x (default 1x)

Sliders usam `accent-primary` (roxo) e o mesmo estilo do arquivo atual.

**Coluna direita — card escuro (gradiente `from-background to-primary/20`):**
- Label "VOCÊ RECEBE" (label-caps)
- Valor grande em `text-gradient-primary` (roxo) — ex: `R$ 32`
- "por mês"
- Pill secundária com valor anual (`R$ X por ano`)
- Badge de nível ativo + 4 ícones dos próximos níveis (Iniciante 🌱, Crescente 🔥, Destaque ⭐, Top 👑)
- Ícone `Info` no canto superior direito abrindo Tooltip com a fórmula

**Fórmula:** `ganho = assinatura × 0.85 × estimativa_conversao(seguidores) × frequencia_boost(posts)`
- conversão base: 1,5% dos seguidores viram assinantes; ajustada por posts/semana (1x=1.0, 7x=1.4, 30x=2.0)
- split 85/15 (conforme `asaas.server.ts` atual — não alterar backend)
- Níveis por faixa mensal líquida: Iniciante <R$500, Crescente R$500–5k, Destaque R$5k–20k, Top >R$20k

### 3. Seção "Como funciona" (4 passos em ícones)
Faixa horizontal em card `rounded-3xl border bg-card` com 4 colunas (empilha no mobile):
- 👤✓ **Crie sua conta** — Cadastro gratuito em 2 minutos
- 🎛️ **Configure seu perfil** — Capriche na bio, foto de capa, preço e divulgue em outras redes
- 📷 **Publique conteúdo** — Fotos, vídeos e mensagens exclusivas
- 💲 **Receba pagamentos** — Saque quando quiser, via Pix em até 24h

Ícones em quadrado `rounded-2xl bg-primary/10 text-primary` (adapta o laranja do screenshot para o roxo do app).

Substitui a seção "Steps detailed 01–04" atual.

### 4. Mantém
FAQ e CTA final inalterados.

## Detalhes técnicos
- Sem mudanças no backend, sem migração, sem novas dependências.
- Ícones do `lucide-react` já disponíveis: `UserCheck`, `SlidersHorizontal`, `Camera`, `DollarSign`, `Info`, `Sprout`, `Flame`, `Star`, `Crown`.
- Tooltip via `@/components/ui/tooltip` (já usado no projeto).
- Cores 100% via tokens semânticos (`primary`, `card`, `muted-foreground`, `border`) — nada de laranja hardcoded.
- Split exibido = 85% (coerente com o resto do app).
