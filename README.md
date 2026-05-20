# Planilha Doméstica

PWA simples para rateio de despesas domésticas entre duas pessoas.

A proposta não é criar um sistema financeiro completo. É substituir a tabela manual do app Notas por uma planilha compartilhada, editável no celular, com cálculo automático de total, quanto cada pessoa pagou e quanto falta acertar no mês.

## Ideia central

A tabela é livre para lançar. O cálculo é rígido para não dar briga.

O usuário abre o mês, edita linhas como em uma planilha e informa quem pagou cada item.

Exemplo:

| Descrição | Valor | Pago por |
|---|---:|---|
| Água | R$ 120,00 | Eliane |
| Luz | R$ 260,00 | Vini |
| Internet | R$ 110,00 | Vini |

O app calcula:

- total do mês;
- total pago por Vini;
- total pago por Eliane;
- parte de cada um;
- acerto final.

## Decisão técnica inicial

- Frontend: PWA.
- Hospedagem: Hostinger ou outro host estático.
- Banco, login e permissões: Supabase.
- Sincronização: Supabase, com realtime opcional depois do MVP.
- Dados locais: apenas cache, não fonte principal.

## Escopo do MVP

1. Login de dois usuários.
2. Um espaço compartilhado da casa.
3. Meses do ano.
4. Tabela livre por mês.
5. Linha com descrição, valor e pagador.
6. Cálculo automático do rateio.
7. Copiar resumo para WhatsApp.
8. PWA instalável no celular.

## Fora do MVP

- categorias avançadas;
- anexos e comprovantes;
- gráficos;
- cartão de crédito;
- controle de contas pessoais;
- múltiplas casas;
- conciliação bancária;
- importação automática.

Esses itens são úteis, mas podem transformar um app doméstico simples em um NanoFinance antes da hora.
