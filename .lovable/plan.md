## Plano

1. Backend — gravar prévia também no desafio
   - Em `createPublication`, salvar `preview_url` / `preview_storage_path` quando `visibility === "paid"` **ou** `visibility === "challenge"`, e não só em pagas.

2. Frontend — obrigar prévia no desafio
   - Já é obrigatório em `paid`. Manter também obrigatório em `challenge` (comportamento atual já bloqueia sem prévia — apenas garantir a mensagem/estado corretos no `publisher`).

3. Card do feed com prévia (usuários que não são donos)
   - Como toda publicação paga/desafio agora tem prévia obrigatória, remover o fallback escuro sem imagem. O `LockedOverlay` passa a assumir sempre que há prévia.
   - Mostrar a imagem de prévia totalmente visível (sem gradiente escuro por cima), apenas com um cadeado/troféu translúcido no canto e o CTA embaixo.

4. Trocar botões e progresso pelo roxo padrão do app
   - No overlay bloqueado do card (`LockedOverlay`) e no painel de tiers do desafio (`ChallengeTiersPanel`), substituir o gradiente `from-orange-400 via-orange-500 to-pink-400` (tanto no botão quanto na barra de progresso) por `bg-primary` / `text-primary-foreground`, mantendo consistência com o tema roxo do app.
   - Aplicar a mesma cor em todas as telas escuras de bloqueio (card no feed e no perfil).

5. Verificação
   - Conferir visualmente no `/feed` que o card de desafio de outro usuário mostra a imagem de prévia com cadeado + botão roxo.
   - Conferir que uma publicação de desafio recém-criada persiste `preview_url` no banco.