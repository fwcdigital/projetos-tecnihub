# Hostinger Deployment Guide - FWC Digital Workflow

## Opção A (Recomendada e mais simples - Hospedagem Compartilhada / Cloud Hostinger):
1. No seu terminal local, rode:
   `npm run build`
2. No painel da Hostinger (hPanel), abra o **Gerenciador de Arquivos** (File Manager) do domínio `projetos.tecnihub.com.br`.
3. Abra a pasta `public_html`.
4. Faça o upload de todo o conteúdo de dentro da pasta `dist/` (incluindo o arquivo `.htaccess` e a pasta `assets/`).
5. Pronto! O site abre instantaneamente.

---

## Opção B (Se usar Web App Node.js no hPanel):
1. No GitHub, certifique-se de que o commit mais recente inclui os arquivos `server.js` e `package.json`.
2. Nas configurações de compilação da Hostinger:
   - **Comando de Compilação (Build Command):** `npm run build`
   - **Comando de Inicialização (Start Command):** `npm start` (ou `node server.js`)
   - **Arquivo de entrada:** `server.js`
   - **Porta:** 3000 (ou porta definida pelo ambiente)
