# Explicar a diferença entre "Só PIX" e "Conta Asaas" no cadastro

## O que muda
Em Meu Banco → Cadastrar dados de recebimento, logo abaixo dos dois botões de modo, aparece um quadro curto que muda conforme o modo escolhido:

- **Só PIX**: "Seus ganhos ficam guardados na conta da plataforma até você sacar. No saque, enviamos um PIX para a sua chave. Você não precisa abrir conta no Asaas."
- **Conta Asaas**: "Seus ganhos caem direto na sua conta Asaas a cada venda. Você pode sacar por aqui ou pelo painel do Asaas."

Uma linha extra vale para os dois modos: "Vendas no cartão ficam 15 dias a liberar; no PIX, liberam na hora. Saque mínimo de R$ 50."

## Detalhes técnicos
- Só `src/components/banco/CadastrarBancoForm.tsx`: bloco de texto condicional ao `mode`, com cores do tema (muted). Nenhuma mudança nas regras.
