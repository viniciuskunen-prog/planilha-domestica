# Deploy na Hostinger

## Objetivo

Publicar a PWA da Planilha Domestica em uma URL acessivel para Vini e Eliane.

## Configuracao recomendada

Repositorio:

```text
viniciuskunen-prog/planilha-domestica
```

Branch:

```text
main
```

Build command:

```text
npm install && npm run build
```

Diretorio de publicacao:

```text
dist
```

## Variaveis de ambiente

Adicionar na Hostinger:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Usar os mesmos valores do arquivo local `.env`.

Nao subir `.env` no GitHub.

## Supabase Auth

Depois que a URL final estiver funcionando, configurar no Supabase:

```text
Authentication > URL Configuration
```

Site URL:

```text
https://SEU-DOMINIO-OU-SUBDOMINIO
```

Redirect URLs:

```text
https://SEU-DOMINIO-OU-SUBDOMINIO
https://SEU-DOMINIO-OU-SUBDOMINIO/
```

Se o app ficar em subdominio, exemplo:

```text
https://rateio.seudominio.com.br
```

usar exatamente esse endereco.

## Teste pos-deploy

1. Abrir a URL publica.
2. Entrar com o usuario Vini.
3. Confirmar que a Casa Vini e Eliane aparece.
4. Criar uma linha de teste.
5. Entrar com Eliane em outro dispositivo.
6. Confirmar que a linha aparece apos atualizar.
7. Testar copiar estrutura do mes anterior.
8. Testar instalar como PWA no iPhone.

## iPhone

No Safari:

```text
Compartilhar > Adicionar a Tela de Inicio
```

Depois abrir pelo icone instalado.

## Observacoes

A anon key do Supabase pode ficar no frontend.

A seguranca dos dados depende da RLS.

Nunca usar service role key no frontend.
