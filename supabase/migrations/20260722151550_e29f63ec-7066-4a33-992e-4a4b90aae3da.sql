-- Corrige banners duplicados entre perfis pagos e gratuitos vinculados.
-- Quando o perfil gratuito foi criado, o banner do perfil pago foi copiado.
-- Atribui o banner global mais recente (profiles.cover_url) ao perfil gratuito,
-- apenas quando os banners ainda estão idênticos (indicando duplicação do bug).
UPDATE public.creator_profiles free_cp
SET cover_url = p.cover_url
FROM public.profiles p
JOIN public.creator_profiles paid_cp
  ON paid_cp.user_id = p.user_id AND paid_cp.kind = 'paid'
WHERE free_cp.user_id = p.user_id
  AND free_cp.kind = 'free'
  AND free_cp.cover_url = paid_cp.cover_url
  AND p.cover_url IS DISTINCT FROM free_cp.cover_url;