## Objetivo
Fazer com que os botões "Salvar" e "Cancelar" na página `/settings/social` tenham exatamente a mesma largura horizontal dos inputs de cima (Nome do Perfil e identificador @).

## Arquivo a ser alterado
- `src/routes/_authenticated/settings.social.tsx`

## Problema atual
Os inputs usam `rounded-2xl bg-muted px-5 py-3`, ocupando toda a largura do container principal (`max-w-3xl mx-auto px-4 md:px-6`).
Já os botões estão dentro de um wrapper com `px-5 pt-2`, o que cria um desalinhamento visual — os botões ficam ligeiramente mais estreitos ou com margens diferentes em relação aos campos.

## Solução
1. Remover o padding lateral do wrapper dos botões (`px-5`) para que os botões ocupem a mesma largura externa dos inputs.
2. Manter os botões com `w-full` e as classes de estilo existentes (`bg-primary text-primary-foreground`, `rounded-md` ou equivalente).
3. Garantir que o espaçamento vertical (`gap-3`) e o padding superior (`pt-2`) sejam preservados.
4. Verificar visualmente no preview que os botões agora começam e terminam exatamente nas mesmas bordas verticais dos inputs acima.

## Resultado esperado
Botões "Salvar" e "Cancelar" alinhados horizontalmente com os inputs de texto, sem recuo lateral, conforme o screenshot enviado.