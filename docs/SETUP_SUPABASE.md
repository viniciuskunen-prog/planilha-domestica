# Setup do Supabase

## Objetivo

Criar um projeto Supabase separado para a Planilha Domestica.

Nao usar o mesmo projeto do NanoTask.

Motivos:

- dados financeiros pessoais;
- regras de acesso proprias;
- menor risco de quebrar schema existente;
- deploy e manutencao mais simples.

## 1. Criar projeto

No Supabase:

1. criar novo projeto;
2. escolher regiao proxima;
3. guardar a senha do banco em local seguro;
4. copiar a Project URL;
5. copiar a anon public key.

Esses dados entram no frontend como variaveis publicas.

Nunca subir chaves em commit.

## 2. Configurar Auth

Para o MVP, usar email e senha.

Configuracoes sugeridas:

- permitir cadastro por email;
- exigir senha;
- desativar providers externos no inicio;
- configurar URL do site depois do deploy;
- configurar redirect URL local durante desenvolvimento.

URLs de referencia:

```text
http://localhost:5173
https://app.seudominio.com.br
```

## 3. Rodar migrations

Executar na ordem:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
```

A primeira cria as tabelas.
A segunda cria helpers e policies de acesso.

## 4. Criar usuarios iniciais

Criar usuarios pelo fluxo normal de cadastro do app ou manualmente pelo painel Auth.

Usuarios iniciais:

- Vini;
- Eliane.

Depois de criar os usuarios, a tabela profiles precisa ter um registro para cada um.

## 5. Criar household inicial

Criar um household para uso real:

```text
Casa Vini e Eliane
```

Depois, inserir os dois usuarios em household_members.

Modelo conceitual:

```text
households:
name = Casa Vini e Eliane
created_by = id do Vini

household_members:
Vini = owner
Eliane = member
```

## 6. Teste minimo de seguranca

Antes de usar dados reais:

1. entrar com Vini;
2. criar uma linha de despesa;
3. entrar com Eliane;
4. verificar se a linha aparece;
5. criar uma linha com Eliane;
6. confirmar que Vini ve a linha;
7. criar um terceiro usuario de teste fora do household;
8. confirmar que ele nao ve nada.

Se o terceiro usuario enxergar dados, parar e corrigir RLS.

## 7. Variaveis do frontend

Criar arquivo local .env no desenvolvimento com:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Criar .env.example no repo, sem valores reais.

## 8. Observacao de seguranca

A anon key do Supabase pode ficar no frontend.

O que protege os dados e a RLS.

Mesmo assim:

- nao subir service role key;
- nao usar service role no frontend;
- nao colocar dados reais em arquivos de seed publicos;
- nao commitar .env.
