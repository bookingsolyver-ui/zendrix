# Segurança

Se encontrou uma vulnerabilidade, **não abra uma issue pública**. Escreva ao responsável do projeto
com os passos para a reproduzir; respondemos assim que possível.

Princípios do projeto: todo o acesso a dados passa pelo servidor (Prisma); a API pública do Supabase
não tem acesso a nenhuma tabela (RLS ligado e forçado); segredos só existem em módulos `server-only`.
