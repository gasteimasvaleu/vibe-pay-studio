<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Creator payout mode lives in `payout_accounts.payout_mode` (asaas_split | pix); pix mode skips Asaas split and withdrawals use the platform Asaas key — why: creators without an Asaas account can still get paid.
- Platform commission percent comes from `platform_settings` (national/international), read through `src/lib/commission.ts` and the `platform_commission_pct` DB function, never from a literal in the payment path — why: the admin panel must be able to change the creator split without a code deploy; the constant in `commission.ts` is only a read-failure fallback.
