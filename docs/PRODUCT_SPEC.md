# Especificação do produto

## Nome provisório

Planilha Doméstica.

Outras opções:

- Rateio Casa;
- MeiaConta;
- SplitCasa.

## Problema

O controle atual está no app Notas, em uma tabela mensal simples. O problema é que o Notas não calcula automaticamente, não sincroniza como uma planilha compartilhada com regra de rateio e não registra de forma clara quem pagou cada despesa.

O problema real não é só saber o total do mês. O problema é saber quem pagou mais e qual acerto precisa ser feito entre Vini e Eliane.

## Princípio do produto

A tabela deve parecer livre, como uma planilha.

O cálculo deve ser fechado, previsível e automático.

## Usuários iniciais

- Vini;
- Eliane.

Ambos acessam o mesmo espaço doméstico.
Ambos podem editar as linhas do mês.
Cada linha precisa informar quem pagou.

## Modelo mental da tela

O app abre em um mês.

No topo, mostra um resumo:

- total do mês;
- quanto Vini pagou;
- quanto Eliane pagou;
- metade do total;
- acerto do mês.

Abaixo, mostra uma tabela editável:

| Descrição | Valor | Pago por |
|---|---:|---|
| Água | R$ 120,00 | Eliane |
| Luz | R$ 260,00 | Vini |
| Parcela da casa | R$ 1.800,00 | Vini |

## Regra principal de cálculo

Considerando divisão 50/50 no MVP:

```text
Total do mês = soma de todos os valores
Parte de cada um = total / 2
Pago por Vini = soma das linhas em que paid_by_user_id = Vini
Pago por Eliane = soma das linhas em que paid_by_user_id = Eliane
Saldo Vini = pago por Vini - parte de Vini
Saldo Eliane = pago por Eliane - parte de Eliane
```

Se Vini pagou mais que a parte dele, Eliane deve transferir a diferença para Vini.

Se Eliane pagou mais que a parte dela, Vini deve transferir a diferença para Eliane.

Se os saldos forem iguais, não existe acerto.

## Exemplo

```text
Total: R$ 4.000,00
Parte de cada um: R$ 2.000,00

Vini pagou: R$ 2.700,00
Eliane pagou: R$ 1.300,00

Acerto: Eliane transfere R$ 700,00 para Vini.
```

## Funcionalidades do MVP

### Autenticação

- Login por e-mail e senha via Supabase Auth.
- Dois usuários iniciais.
- Cada usuário tem perfil com nome de exibição.

### Espaço compartilhado

- Um household inicial: Casa Vini & Eliane.
- Os dois usuários pertencem a esse household.
- Somente membros podem ler e editar despesas.

### Meses

- Visualização por mês e ano.
- Criar folha mensal automaticamente ao acessar um mês sem dados.
- Navegação entre meses.

### Tabela livre

Colunas fixas no MVP:

- descrição;
- valor;
- pago por.

Comportamentos:

- adicionar linha;
- editar descrição inline;
- editar valor inline;
- escolher pagador com controle rápido;
- apagar linha;
- reordenar linhas depois do MVP, se necessário.

### Resumo automático

- total do mês;
- total pago por cada pessoa;
- metade;
- acerto final.

### Copiar resumo

Gerar texto simples para WhatsApp.

Exemplo:

```text
Resumo despesas Maio/2026

Total: R$ 4.320,00
Parte de cada um: R$ 2.160,00

Vini pagou: R$ 2.850,00
Eliane pagou: R$ 1.470,00

Acerto:
Eliane transfere R$ 690,00 para Vini.
```

## Funcionalidades pós-MVP

- duplicar estrutura do mês anterior;
- realtime entre os dois celulares;
- divisão customizada por linha;
- status previsto/pago;
- exportar CSV;
- backup JSON;
- histórico anual;
- gráficos simples;
- logs de alteração.

## Antirrequisitos

O app não deve virar um sistema financeiro completo no MVP.

Evitar no começo:

- categorias obrigatórias;
- centro de custo;
- cartão de crédito;
- recorrências complexas;
- anexos;
- comprovantes;
- múltiplas moedas;
- metas financeiras;
- relatórios avançados.

A prioridade é reduzir atrito.
