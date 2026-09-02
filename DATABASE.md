# PostgreSQL / Supabase

O Supabase é usado somente como PostgreSQL hospedado. O navegador não usa SDK, chave `anon`, `service_role` ou conexão direta; usuários, clientes, projetos, vínculos, briefings e tarefas passam pela API Express.

## Configuração inicial

1. Copie `.env.example` para `.env` e configure `DATABASE_URL` e `JWT_SECRET`.
2. Para migrations, prefira a connection string direta do Supabase. No runtime pode ser usada a URL do pooler quando o ambiente não suportar conexão direta.
3. Execute `npm run db:migrate`.
4. Escolha no máximo uma carga inicial explícita:
   - `npm run db:import-json` para importar `data/app_database.json`;
   - `npm run db:seed` para inserir dados de demonstração em desenvolvimento.
5. Inicie com `npm run dev` ou gere o bundle com `npm run build` e use `npm start`.

Nenhuma migration ou seed é executada automaticamente no startup. Se o banco estiver indisponível ou sem schema, o servidor falha de forma explícita e não tenta ler JSON.

## Migrations

As migrations versionadas ficam em `server/database/migrations`. A tabela `schema_migrations` registra nome, checksum e data de aplicação. Uma migration aplicada não deve ser editada; crie um novo arquivo numerado para qualquer evolução.

## Importação do JSON legado

`npm run db:import-json` importa somente `users`, `clients`, `projects` e `project_members`. IDs legados são convertidos deterministicamente para UUID, preservando relacionamentos. O comando usa transação e `ON CONFLICT DO NOTHING`, portanto pode ser repetido sem duplicar os mesmos registros.

Defina `LEGACY_JSON_PATH` quando o arquivo estiver em outro local. Tarefas e demais módulos futuros são deliberadamente ignorados.

## Seed de demonstração

O seed é explícito, idempotente e usa IDs fixos. Em produção ele é bloqueado, salvo quando `ALLOW_DEMO_SEED=true` for definido conscientemente para aquela execução. Não mantenha essa variável habilitada.

O seed inclui os registros claramente prefixados com `[TESTE]` para o cenário João/Pedro/Maria/Lucas, administradores de teste, dois projetos e tarefas persistidas. A senha inicial dessas contas controladas é `Admin@123`; não use o seed em produção. Remova somente esse conjunto com `npm run db:clear-test-data`.

Valide o cenário contra uma aplicação em execução com `npm run test:rbac-live`. Use `BASE_URL` quando a API não estiver em `http://127.0.0.1:3000`.
