## Plano

1. **Corrigir a seleção pela biblioteca**
   - Ajustar o fluxo do botão “Biblioteca do dispositivo” para fechar a Sheet antes de acionar o input de arquivo, mas ainda preservar o clique do usuário.
   - Garantir que o arquivo escolhido seja inserido na tela imediatamente com preview local, antes do upload terminar.

2. **Adicionar progresso de upload**
   - Criar um estado de progresso por mídia (`0–100%`).
   - Exibir uma barra de progresso sobre cada imagem/vídeo enquanto está enviando.
   - Mostrar também progresso agregado no rodapé quando houver uploads ativos.

3. **Trocar o upload para permitir progresso real**
   - Substituir o upload atual do Supabase Storage SDK por uma requisição `XMLHttpRequest` autenticada para o endpoint do Storage.
   - Isso permite capturar `upload.onprogress`, algo que o método atual `.upload()` não expõe no browser.
   - Manter o bucket privado `publications` e continuar gerando signed URL após o upload.

4. **Melhorar tratamento de erro**
   - Se o upload falhar, manter o card visível com estado de falha e mensagem.
   - Se a signed URL falhar, marcar a mídia como erro em vez de sumir silenciosamente.

5. **Verificação**
   - Testar o caminho `/publisher`: abrir seletor, escolher imagem, confirmar preview imediato, barra de progresso e estado pronto após envio.