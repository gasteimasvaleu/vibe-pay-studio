WITH canonical AS (
  SELECT DISTINCT ON (regexp_replace(cpf, '\D', '', 'g'))
         regexp_replace(cpf, '\D', '', 'g') AS clean_cpf,
         asaas_customer_id
  FROM public.profiles
  WHERE cpf IS NOT NULL
    AND regexp_replace(cpf, '\D', '', 'g') <> ''
    AND asaas_customer_id IS NOT NULL
  ORDER BY regexp_replace(cpf, '\D', '', 'g'), created_at ASC
)
UPDATE public.profiles p
SET asaas_customer_id = c.asaas_customer_id
FROM canonical c
WHERE regexp_replace(p.cpf, '\D', '', 'g') = c.clean_cpf
  AND p.asaas_customer_id IS DISTINCT FROM c.asaas_customer_id;