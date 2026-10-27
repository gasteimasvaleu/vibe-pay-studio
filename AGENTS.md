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
- Public creator directory (/creators, /c/$username, /sitemap.xml) reads only through the public_creator_directory / public_creator_by_username RPCs; creator opt-in plus admin approval are enforced by the creator_profiles trigger — why: anon must never get direct SELECT on creator_profiles and creators cannot self-approve.
- Reads of OTHER users' profiles go through the `profiles_public` view; `profiles` is owner/admin-only and protected columns (kyc, ban, account_type, cpf, country, referred_by, asaas_*, veriff) are writable only via service role/admin (trigger-enforced) — why: profiles holds PII and payment credentials.
- Purchase/payment tables (unlocks, live_tickets, tips, subscriptions, video_calls, chat_media_requests, refund_requests) are written only by server code via `adminDb()` (src/lib/admin-db.ts) or `pay_with_wallet`; end users have no write policies and the `aaa_guard_payment_write` trigger rejects paid status/transaction_id from them — why: clients must never mark content as paid.
- Media tables store only storage paths (url columns hold the path); server functions re-sign them per request with a 1h TTL via `src/lib/media-sign.server.ts` after RLS/can_see checks; storage SELECT on publications/stories is owner/admin-only — why: long-lived signed URLs and open bucket reads leaked paid content.
- Cloudflare live URLs/keys live only in `live_session_secrets` (service role); ingest goes to the owner via `getLiveIngest`, playback only via `getLive` after access checks — why: WHIP/WHEP URLs let anyone broadcast or watch paid lives.
- Chat message content/metadata is read only through the masking view `chat_messages_safe`; paid or media messages are inserted by server code with the admin client, and a trigger limits end-user updates (recipient: read_at only) — why: paid DM content leaked via direct SELECT/UPDATE.
