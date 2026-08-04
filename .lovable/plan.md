# Ajustar botão CTA da página Sobre no mobile

O botão final da página `/sobre` está com o texto "Criar minha conta grátis", que estoura a largura em telas pequenas.

## O que muda

- Texto do botão passa a ser **"Criar minha conta"**.
- Padding horizontal do botão fica menor no mobile e volta ao tamanho atual no desktop, para o botão respirar melhor em telas estreitas.
- Nenhuma outra seção da página é alterada; o destino do link (`/cadastro`) continua o mesmo.

## Detalhes técnicos

Arquivo: `src/routes/sobre.tsx`, seção CTA (linhas 218-223).

- Trocar o texto do `<Link>` de `Criar minha conta grátis` para `Criar minha conta`.
- Ajustar a classe de padding de `px-8` para `px-6 md:px-8`.
