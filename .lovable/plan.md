
## Goal

Every switch on `/settings/privacy-options` and `/settings/privacy-mail` persists to Supabase, and the flags actually change behavior across the app. Email prefs are wired so Resend integration later is a one-file change.

## 1. Migration

Add to `public.profiles` (all `boolean NOT NULL`, defaults noted):

- `restrict_search` (false)
- `restrict_search_br` (false)
- `restrict_search_country` (false) — for now honored as "hide from users whose IP is not international"; since we don't have geo IP yet, treated as a synonym of `restrict_search_br` at the query layer (documented with a TODO).
- `show_followers` (true)
- `restrict_mentions` (false)
- `restrict_friendships` (false)
- `emails_enabled` (true) — master email switch.

New table `public.email_preferences`:

| column | type | default |
| --- | --- | --- |
| `user_id` uuid PK, FK `auth.users` ON DELETE CASCADE | — |
| `free_to_paid` bool NOT NULL | true |
| `post_sales` bool NOT NULL | true |
| `subscription_sales` bool NOT NULL | true |
| `content_purchase` bool NOT NULL | true |
| `creator_referrals` bool NOT NULL | true |
| `updated_at` timestamptz NOT NULL | now() |

- GRANT SELECT, INSERT, UPDATE to `authenticated`; GRANT ALL to `service_role`.
- RLS enabled — SELECT / INSERT / UPDATE where `auth.uid() = user_id`.
- `set_updated_at` trigger.
- SQL fn `public.can_send_email(_user_id uuid, _kind text) RETURNS boolean` (SECURITY DEFINER): returns false if `profiles.emails_enabled = false`; otherwise reads the matching column of `email_preferences`, treating a missing row as all-true.

## 2. Server functions — new `src/lib/privacy.functions.ts`

- `getPrivacySettings()` — reads the 7 flags for `auth.uid()`.
- `updatePrivacySetting({ key, value })` — Zod-validated key ∈ 7 columns; RLS-scoped update.
- `getEmailPreferences()` — upserts defaults if missing, returns row.
- `updateEmailPreference({ key, value })` — Zod-validated key ∈ 5 columns; upsert.

All mutations return the fresh row for optimistic reconciliation.

## 3. Wire the settings pages

**`settings.privacy-options.tsx`** — loader fetches `getPrivacySettings()`; each `Switch` calls `updatePrivacySetting` with optimistic UI + revert-on-error. `email_sending` maps to `emails_enabled`.

**`settings.privacy-mail.tsx`** — loader fetches `getEmailPreferences()`; switch semantics inverted at the boundary (UI "on" = "não receber" per copy; DB stores opted-in). One `uiToDb = (v) => !v` helper keeps existing labels untouched.

## 4. Apply the flags across the app

### restrict_search / restrict_search_br / restrict_search_country
- `src/routes/_authenticated/search.tsx` `fetchCreators`: skip profiles with `restrict_search = true` in every search. Skip profiles with `restrict_search_br = true` OR `restrict_search_country = true` for now (no geo yet — TODO comment to lift the country-specific ones once IP geo is available). Own profile is never filtered.
- Same filters applied to `em-alta`/discovery list fetchers that read from `profiles` (`src/routes/_authenticated/em-alta.tsx` and any other public creator listing surfaced via `profiles` queries; audited during implementation).
- Feed / follow-based lists are not restricted — those are relationships, not search.

### show_followers
- Extend `getProfileByUsername` (in `src/lib/profile.functions.ts`) to include `show_followers` in the projection and to return `followersCount` **only** when the flag is true OR the viewer is the owner. Otherwise return `null`.
- `perfil.$username.tsx` / `profile.$username.tsx` renders the followers count only when it's non-null; hide the entire counter block when null (no "0" placeholder that would leak the state).

### restrict_mentions
- App has no mention feature today. Add a shared helper `canBeMentioned(profile)` in `src/lib/privacy.ts` and call it from the future mention search endpoint. Concrete site now: filter suggestions in `search.tsx` when the query is prefixed with `@` (mention-style lookup) — profiles with `restrict_mentions = true` are excluded.

### restrict_friendships
- App uses `follows` (asymmetric), not a friendships graph. To avoid a no-op switch, apply the flag to the "amigos em comum / mutuals" surface: when computing mutual follows on `perfil.$username.tsx` / `profile.$username.tsx`, exclude any profile with `restrict_friendships = true` from the "aparece como amigo em outros perfis" side (i.e. they won't show up in someone else's mutuals list). Own profile is unaffected.

## 5. Resend integration seam (stub, no dispatch yet)

`src/lib/email.server.ts`:
- `sendTransactionalEmail({ userId, kind, ... })`:
  1. `await supabaseAdmin.rpc('can_send_email', { _user_id: userId, _kind: kind })` — if false, return `{ skipped: true }`.
  2. `// TODO: dispatch via Resend once RESEND_API_KEY is configured.`

This guarantees every future email path already respects both the master switch and the per-kind preferences.

## Files touched

- New migration (columns, table, RLS, `can_send_email`).
- `src/lib/privacy.functions.ts` (new).
- `src/lib/privacy.ts` (new — small shared helpers).
- `src/lib/email.server.ts` (new stub).
- `src/lib/profile.functions.ts` (projection + follower gating).
- `src/routes/_authenticated/settings.privacy-options.tsx` (loader + persist).
- `src/routes/_authenticated/settings.privacy-mail.tsx` (loader + persist).
- `src/routes/_authenticated/search.tsx` (search filters, @mention filter).
- `src/routes/_authenticated/em-alta.tsx` and any other creator-listing surfaces (search filters).
- `src/routes/_authenticated/perfil.$username.tsx` / `profile.$username.tsx` (follower gating, mutuals gating).
