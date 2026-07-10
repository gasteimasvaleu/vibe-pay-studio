## Objetivo
Ajustar a página `/settings/personal` para que o botão **Salvar** fique abaixo dos campos do formulário (dentro do fluxo de conteúdo), como mostrado no screenshot, em vez de ficar apenas em uma barra fixa no rodapé.

## Alterações

### 1. `src/routes/_authenticated/settings.personal.tsx`

- Remover a barra fixa de rodapé (`fixed bottom-0 inset-x-0 ...`) que contém o botão Salvar.
- Adicionar o botão Salvar no final do `<main>`, abaixo do componente `<Tabs>`, de forma que ele apareça após os campos da aba ativa (Informações ou Endereço).
- Manter o estilo longo e primário usado nas outras páginas:
  - `w-full h-12 rounded-full text-base font-semibold`
  - `bg-primary text-primary-foreground`
- Ajustar o padding inferior do `<main>` para não reservar espaço para uma barra fixa que não existe mais (remover o `pb-28` ou reduzir para um valor normal).
- Manter o `handleSave` existente com validação da aba Endereço e o `toast.info("Em breve")`.

## Resultado esperado
Na aba Informações e na aba Endereço, o botão laranja "Salvar" aparecerá logo abaixo dos campos, preenchendo a largura do container, igual ao padrão visual do screenshot.
