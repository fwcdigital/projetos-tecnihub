# Deploy na Hostinger

Esta aplicação não funciona como hospedagem puramente estática: autenticação, clientes, projetos e permissões dependem da API Express e do diretório persistente de dados.

## Web App Node.js

1. Use uma aplicação Node.js com Node 20 ou superior.
2. Instale as dependências com `npm ci`.
3. Gere frontend e backend com `npm run build`.
4. Inicie com `npm start` ou, quando o provedor exigir um arquivo de entrada, `node server.js`.
5. Configure o domínio/reverse proxy para a porta fornecida pela Hostinger.

## Variáveis de ambiente

- `NODE_ENV=production`
- `JWT_SECRET`: chave longa, aleatória e privada; obrigatória em produção.
- `PORT`: porta entregue pelo ambiente da Hostinger. O fallback local é `3000`.
- `DATA_DIR`: caminho absoluto de um diretório persistente e gravável. O fallback é `./data`.

O diretório configurado em `DATA_DIR` deve sobreviver a novos builds e deploys. Sem volume persistente, clientes, projetos e usuários cadastrados serão perdidos quando a instância for recriada.

## Verificação

Após o deploy, confirme que `GET /api/health` responde com `status: "ok"` e valide o login pela própria aplicação.
