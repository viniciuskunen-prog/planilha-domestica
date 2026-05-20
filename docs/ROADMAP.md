# Roadmap de implementação

## Fase 0 — Decisões de base

Objetivo: travar o escopo antes de escrever código demais.

Decisões já tomadas:

- O app será uma PWA.
- O banco será Supabase.
- A hospedagem do frontend pode ser Hostinger.
- O app terá um espaço compartilhado para Vini e Eliane.
- A tabela mensal terá linhas livres.
- Cada linha terá, no MVP: descrição, valor e pago por.
- O cálculo inicial será 50/50.

Decisões pendentes:

- Nome final do app.
- Framework do frontend.
- Estratégia de login: email/senha ou magic link.
- Se o MVP terá realtime ou apenas sincronização ao carregar/salvar.

## Fase 1 — Base técnica

Objetivo: criar o app PWA funcionando localmente.

Tarefas:

1. Criar projeto frontend.
2. Configurar estrutura de pastas.
3. Criar layout base responsivo.
4. Criar manifest da PWA.
5. Criar service worker básico.
6. Configurar variáveis de ambiente.
7. Instalar cliente Supabase.

Critério de pronto:

- App roda localmente.
- App pode ser instalado como PWA.
- Tela inicial abre sem erro no desktop e no celular.

## Fase 2 — Supabase

Objetivo: criar banco, auth e regras de segurança.

Tarefas:

1. Criar projeto Supabase separado do NanoTask.
2. Criar tabelas: profiles, households, household_members, monthly_sheets, expense_rows.
3. Ativar RLS.
4. Criar policies por household.
5. Criar trigger para profile ao criar usuário.
6. Criar seed manual para o household inicial.
7. Cadastrar Vini e Eliane.

Critério de pronto:

- Usuário logado só enxerga dados do household em que participa.
- Vini e Eliane acessam o mesmo espaço.
- Nenhum usuário externo consegue ler ou editar dados.

## Fase 3 — Autenticação

Objetivo: permitir acesso seguro ao app.

Tarefas:

1. Criar tela de login.
2. Criar tela de cadastro ou fluxo manual inicial.
3. Manter sessão ativa.
4. Criar logout.
5. Redirecionar usuário não logado para login.

Critério de pronto:

- Vini e Eliane conseguem entrar em dispositivos diferentes.
- A sessão persiste após fechar e abrir o app.

## Fase 4 — Tabela mensal

Objetivo: construir a função principal.

Tarefas:

1. Criar seletor de mês e ano.
2. Buscar ou criar monthly_sheet do mês selecionado.
3. Listar expense_rows.
4. Adicionar nova linha.
5. Editar descrição inline.
6. Editar valor inline.
7. Escolher quem pagou.
8. Remover linha.
9. Salvar alterações no Supabase.

Critério de pronto:

- A tabela funciona como uma planilha simples.
- Os dois usuários conseguem lançar despesas no mesmo mês.

## Fase 5 — Cálculo de rateio

Objetivo: transformar a tabela em decisão prática.

Tarefas:

1. Calcular total do mês.
2. Calcular total pago por Vini.
3. Calcular total pago por Eliane.
4. Calcular parte 50/50.
5. Calcular quem deve transferir para quem.
6. Exibir resumo no topo.

Critério de pronto:

- O resumo bate com os valores da tabela.
- O app mostra claramente o acerto do mês.

## Fase 6 — Copiar resumo

Objetivo: facilitar fechamento e envio por WhatsApp.

Tarefas:

1. Gerar resumo em texto.
2. Criar botão copiar.
3. Mostrar feedback de cópia.

Critério de pronto:

- O texto copiado é claro e pronto para enviar.

## Fase 7 — Ajuste mobile

Objetivo: deixar o app realmente usável no celular.

Tarefas:

1. Transformar tabela em cards no mobile.
2. Manter edição rápida.
3. Melhorar teclado numérico para valor.
4. Aumentar áreas de toque.
5. Ajustar espaçamentos.

Critério de pronto:

- Dá para usar confortavelmente no iPhone.
- Não precisa ficar dando zoom.

## Fase 8 — Deploy

Objetivo: colocar o app em produção.

Tarefas:

1. Gerar build.
2. Subir arquivos estáticos na Hostinger.
3. Configurar domínio ou subdomínio.
4. Configurar variáveis públicas do Supabase.
5. Testar instalação no celular.

Critério de pronto:

- App acessível por URL.
- App instalável na tela inicial.
- Dados sincronizam entre os dois usuários.

## Pós-MVP

Só entra depois que o básico estiver sendo usado por alguns ciclos reais.

Possíveis melhorias:

- duplicar mês anterior;
- realtime;
- divisão customizada por linha;
- status previsto/pago;
- exportação CSV;
- backup JSON;
- histórico anual;
- logs de alteração;
- tema visual mais refinado.
