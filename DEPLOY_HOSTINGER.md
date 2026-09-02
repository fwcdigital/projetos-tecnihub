# Deploy na Hostinger

Esta aplicação não funciona como hospedagem puramente estática: autenticação, clientes, projetos e permissões dependem da API Express e do PostgreSQL hospedado no Supabase.

## Web App Node.js

1. Use uma aplicação Node.js com Node 20 ou superior.
2. Instale as dependências com `npm ci`.
3. Configure as variáveis de ambiente.
4. Execute as migrations uma vez com `npm run db:migrate`.
5. Gere frontend e backend com `npm run build`.
6. Inicie com `npm start` ou, quando o provedor exigir um arquivo de entrada, `node server.js`.
7. Configure o domínio/reverse proxy para a porta fornecida pela Hostinger.

## Variáveis de ambiente

- `NODE_ENV=production`
- `JWT_SECRET`: chave longa, aleatória e privada; obrigatória em produção.
- `PORT`: porta entregue pelo ambiente da Hostinger. O fallback local é `3000`.
- `DATABASE_URL`: connection string PostgreSQL do Supabase, disponível somente no backend.
- `DATABASE_SSL=true`: habilita TLS para a conexão com o Supabase.
- `DATABASE_SSL_REJECT_UNAUTHORIZED`: mantenha `true`, salvo exigência comprovada do ambiente.
- `DATABASE_POOL_MAX`: limite de conexões do processo Node; o padrão é `10`.

Não configure a connection string, `JWT_SECRET` ou qualquer chave privilegiada como variável `VITE_*`: essas variáveis seriam incluídas no frontend.

## Verificação

Após o deploy, confirme que `GET /api/health` responde com `status: "ok"` e valide o login pela própria aplicação. O seed de demonstração nunca é executado automaticamente.
