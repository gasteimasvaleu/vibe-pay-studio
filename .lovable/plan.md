## Causa

A tabela `public.video_calls` só possui uma policy de INSERT: `auth.uid() = requester_id`. O fluxo de "Convite de videochamada" (criador convidando assinante) faz o oposto — o criador é o `creator_id` e o assinante é o `requester_id` — então a RLS bloqueia com `new row violates row-level security policy for table "video_calls"`.

## Correção (migração RLS apenas)

Adicionar uma segunda policy de INSERT em `public.video_calls` que permita ao criador criar o convite:

```sql
CREATE POLICY "creator creates video call invite"
ON public.video_calls
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);
```

Mantém a policy existente para o fluxo em que o assinante inicia (`startPaidVideoCall`), e libera o novo fluxo do `createCallInvite` sem alterar backend/frontend.
