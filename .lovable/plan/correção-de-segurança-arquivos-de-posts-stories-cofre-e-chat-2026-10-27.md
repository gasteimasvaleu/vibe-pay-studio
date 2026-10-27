# Correção de segurança: arquivos de posts, stories, cofre e chat

## O que muda para o usuário
- Ninguém logado consegue mais listar ou baixar arquivos pagos de outros creators.
- Quem assinou ou comprou continua vendo tudo. O link de cada arquivo passa a valer 1 hora e é renovado sozinho.
- Avatar, capa, prévias gratuitas e o bucket público "criativos" continuam como hoje.

## Passos
1. **Regras de acesso aos arquivos (migration)**
   - Remover `publications_authenticated_read` e `stories_read_authenticated`.
   - Criar leitura só pelo dono (pasta com o próprio id, incluindo `posts/<uid>/` e `vault/<uid>/`) e por admins, nos buckets `publications` e `stories`.
   - Revisar `chat-paid-uploads`: leitura só pelos participantes do pedido e só após pagamento (ou pelo creator que enviou). Ajustar se a regra atual liberar antes do pagamento.
2. **Servidor gera os links**
   - Novas funções: `getPublicationMediaUrls({ ids[] })` e `getStoryMediaUrls({ ids[] })`. Para cada id, checam `can_see_publication` / `can_see_story` como o usuário logado e geram links de 1 hora com a chave de serviço. Busca em lote para o feed.
   - Cofre: `getVaultMediaUrls({ ids[] })`, somente para o dono.
   - Prévias marcadas como gratuitas recebem link sem checagem de compra.
3. **Parar de salvar links no banco**
   - `publisher.tsx` e `vault.tsx`: remover a validade de 1 ano e gravar só o caminho do arquivo.
4. **Telas que mostram mídia**
   - Feed, perfil, lightbox, story viewer e cofre passam a pedir os links às novas funções.
5. **Limpeza (migration)**
   - Nas tabelas de mídia (`publication_media`, `stories`, `vault_uploads` e afins), extrair o caminho das URLs assinadas salvas e apagar a URL.

## Testes
- Logado sem assinatura/compra: `list('posts/<id do creator>')` volta vazio e baixar um arquivo pago falha.
- Assinante/comprador: feed, perfil, lightbox, stories e cofre continuam abrindo.
- Observação: o projeto usa Supabase externo, então talvez eu não consiga entrar logado para o teste completo. Nesse caso testo via API e indico o que você precisa conferir.

## Links de 1 ano já gerados
Eles continuam válidos até expirar, porque a assinatura não pode ser revogada. A única forma de invalidá-los é mover cada arquivo para um caminho novo (ou trocar a chave de assinatura do projeto, o que derruba todos os links e sessões). Mover é feito por script no servidor: custo de tempo de execução proporcional ao número de arquivos, sem cobrança extra relevante de armazenamento (é cópia + remoção). Posso fazer isso como etapa opcional depois.

## Ao final
Listo as migrations e os arquivos alterados.
