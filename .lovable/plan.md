# Extrato do creator — exportar em PDF e CSV

## Objetivo

Na página Meu Banco (`/banco`), seção "Extrato", adicionar botões para o creator baixar suas movimentações em **CSV** (planilha) e **PDF**.

## O que será feito

1. **Botões de exportação** no cabeçalho da seção Extrato em `src/routes/_authenticated/banco.tsx`: "Baixar CSV" e "Baixar PDF", visíveis quando há movimentações.
2. **CSV** gerado no navegador a partir dos dados já carregados do extrato (data, tipo, descrição, método de pagamento, status, valor bruto, comissão, taxa, valor líquido), com download imediato via blob — compatível com iOS (compartilhar/salvar em Arquivos).
3. **PDF** gerado no navegador com pdf-lib (montado a partir dos dados, não de captura de tela): cabeçalho com nome da plataforma, período coberto, totais (bruto, comissões, taxas, líquido) e tabela de movimentações.
4. **Nome dos arquivos** com data, ex.: `extrato-monetisexy-2026-10-15.csv`.
5. Itens ocultados pelo creator **não** entram na exportação (respeita o que ele vê na tela).

## Detalhes técnicos

- Geração 100% no cliente (Outcome B): sem nova rota de servidor, sem mudanças no banco de dados.
- Instalar `pdf-lib` para o PDF; CSV é texto puro com BOM UTF-8 (abre certo no Excel).
- Download via helper `deliverFile` (blob + share sheet no iOS).
- Verificação: build + teste no preview clicando nos botões e conferindo os arquivos baixados.

## Fora de escopo

- Filtro por período e resumo de totais na tela (podem vir depois, se quiser).
