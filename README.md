# Painel financeiro

Site e app (PWA) do controle financeiro. Só tem as telas: os dados vêm da API `painel-api` no Supabase,
depois do login pelo link que o bot do Telegram manda (comando **painel**). Nada de dado ou chave aqui.

- `index.html`, `estilo.css`, `app.js`: o painel (sem build, JavaScript puro).
- `sw.js`, `manifest.webmanifest`, `icone*`: instalação como app no celular.

Publicado pelo GitHub Pages: Settings → Pages → Deploy from a branch → `main` / `(root)`.
