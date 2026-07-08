Remover todas as seções do corpo da homepage, mantendo apenas o header (Navbar via SiteLayout) e o footer. As seções a remover são: hero (login + card), stats, "Comece agora", diferenciais/features, depoimentos e CTA final.

Detalhes técnicos:
- Arquivo: src/routes/index.tsx.
- Limpar o conteúdo dentro de `<SiteLayout>` para deixar a homepage vazia entre header e footer.
- Manter as importações necessárias apenas se ainda forem usadas; remover imports não utilizados se surgirem.

Resultado esperado: homepage contendo apenas Navbar no topo e Footer no final, sem conteúdo intermediário.
