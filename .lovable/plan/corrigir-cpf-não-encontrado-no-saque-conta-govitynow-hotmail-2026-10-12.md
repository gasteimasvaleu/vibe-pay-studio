# Corrigir "CPF não encontrado" no saque (conta govitynow@hotmail.com)

## O que está acontecendo
A conta está com a identidade **verificada** (06/10), mas o cadastro ficou **sem CPF e sem nome completo**. No modo Só PIX, o saque exige o CPF para confirmar que a chave PIX é do próprio creator, por isso ele é bloqueado.

O CPF só é preenchido hoje quando o aviso da Veriff chega e o documento enviado tem número de 11 dígitos. Se a aprovação foi detectada pela checagem da tela de verificação (e não pelo aviso), ou se o documento foi RG/CNH com outro número, o CPF nunca é gravado.

## O que vou fazer
1. **Pedir o CPF na hora do saque**: se faltar o CPF, em vez do erro, a janela de saque abre a caixinha "Informe seu CPF" (a mesma já usada nos pagamentos). Depois de salvar, o saque continua normalmente. A segurança continua: o Asaas confirma no envio que a chave PIX está nesse CPF; se não estiver, o saque é cancelado.
2. **Gravar nome e CPF também pela checagem da tela de verificação**: quando a aprovação for detectada pela tela, buscar os dados da pessoa na Veriff e preencher nome, nascimento e CPF (só se estiverem vazios), igual ao aviso automático.
3. **Recuperar a conta afetada**: tentar buscar na Veriff os dados da verificação já aprovada dessa conta e preencher o CPF. Se a Veriff não tiver CPF (ex.: documento foi RG), o passo 1 resolve na próxima tentativa de saque.

## Detalhes técnicos
- `requestWithdrawal` passa a lançar `cpf_required` quando `profiles.cpf` é nulo no modo pix; `SacarDialog` usa `useCpfGuard` + `CpfPromptDialog` e reexecuta a mutação.
- `onboarding.functions.ts`: ao obter `verified` via API Veriff, chamar o endpoint de pessoa/decisão e aplicar o mesmo preenchimento do webhook (`full_name`, `birth_date`, `cpf` se 11 dígitos e vazio).
- Backfill pontual para `b744c72e-…` via mesma rotina.
- Nenhuma mudança nas regras de chave PIX (5 tipos, checagem de CPF no retorno do Asaas).
