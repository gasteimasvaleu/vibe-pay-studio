Substituir a imagem de celebração da tela de onboarding "Identidade aprovada" pela imagem fornecida via URL do Supabase Storage.

Arquivo: `src/routes/_authenticated/creator.onboarding.documentos.aprovado.tsx`

Alterações:
1. Remover o import local `import heroImg from "@/assets/onboarding-aprovado.jpg";`.
2. Adicionar uma constante com a URL fornecida:
   ```ts
   const heroImg = "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-021784545806860aaaf13501739a5ff290af8d9343e27fc9037e4_0_1784545870764_ebce0aa8.png";
   ```
3. Manter o uso atual `<img src={heroImg} ... />` inalterado.

Resultado: a imagem local deixa de ser usada e a nova imagem do storage passa a ser exibida no card da tela de aprovação.