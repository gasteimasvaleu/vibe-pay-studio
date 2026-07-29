UPDATE public.live_sessions
SET status = 'ended',
    ended_at = COALESCE(ended_at, updated_at, now()),
    cf_webrtc_url = NULL
WHERE status = 'live'
  AND updated_at < now() - interval '5 minutes';