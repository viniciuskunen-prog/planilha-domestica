# Arquitetura frontend

## Decisão

Usar Vite + React + Supabase JS.

Motivo: o app precisa de autenticação, estado de sessão, tabela editável, sincronização com banco e boa experiência mobile. React resolve isso sem trazer peso desnecessário.

Não usar Next.js no MVP. O app não precisa de SSR, rotas complexas nem backend próprio.

## Stack

- Vite
- React
- JavaScript ou TypeScript
- Supabase JS
- CSS modular simples
- PWA com manifest e service worker

Recomendação: usar TypeScript se o objetivo for manter o projeto limpo desde o começo. Se a prioridade for velocidade máxima, JavaScript puro com boa organização também serve.

## Princípios de implementação

1. Interface simples, mobile-first.
2. Tabela livre visualmente, dados estruturados por baixo.
3. Cálculo sempre derivado das linhas, nunca salvo manualmente.
4. Supabase como fonte principal dos dados.
5. Estado local apenas para tela e edição temporária.
6. Nada de backend próprio no MVP.

## Estrutura sugerida

```text
src/
  app/
    App.jsx
    routes.jsx

  components/
    Button.jsx
    Card.jsx
    Input.jsx
    MonthPicker.jsx

  features/
    auth/
      LoginPage.jsx
      authService.js
      useAuth.js

    household/
      householdService.js
      useHousehold.js

    sheets/
      SheetPage.jsx
      SheetSummary.jsx
      ExpenseTable.jsx
      ExpenseRow.jsx
      expenseService.js
      useMonthlySheet.js

    settlement/
      settlement.js
      SettlementCard.jsx
      summaryText.js

  lib/
    supabaseClient.js
    money.js
    dates.js

  styles/
    globals.css
    tokens.css

public/
  manifest.webmanifest
  icons/
```

## Telas do MVP

### Login

Responsável por:

- entrar com e-mail e senha;
- manter sessão;
- redirecionar usuário logado para o app.

### Planilha mensal

Tela principal.

Componentes:

- seletor de mês;
- resumo do mês;
- tabela/lista de despesas;
- botão de nova linha;
- botão copiar resumo.

## Modelo de estado da tela mensal

```js
{
  user: {
    id: string,
    displayName: string
  },
  household: {
    id: string,
    name: string,
    members: []
  },
  selectedMonth: {
    year: 2026,
    month: 5
  },
  sheet: {
    id: string,
    rows: []
  }
}
```

## Linha de despesa no frontend

```js
{
  id: string,
  description: string,
  amount: number,
  paidByUserId: string,
  position: number,
  isSaving?: boolean,
  error?: string
}
```

## Regra para edição inline

A edição deve ser rápida, mas não precisa salvar a cada tecla no MVP.

Fluxo recomendado:

1. Usuário toca na célula.
2. Edita o valor.
3. Ao sair do campo, salva no Supabase.
4. Se falhar, mostra erro discreto e mantém o valor editável.

Evitar autosave agressivo por tecla. Isso gera muita chamada e abre margem para conflito bobo.

## Cálculo de rateio

O cálculo fica em função pura:

```js
calculateSettlement(rows, members)
```

Entrada:

- linhas da tabela;
- membros do household.

Saída:

```js
{
  total: number,
  sharePerPerson: number,
  paidByUser: {
    [userId]: number
  },
  settlement: {
    fromUserId: string | null,
    toUserId: string | null,
    amount: number
  }
}
```

No MVP, assumir dois membros e divisão igual.

## Formatação monetária

Toda formatação em Real deve passar por helper único.

```js
formatBRL(1200.5) // R$ 1.200,50
parseBRL('1.200,50') // 1200.5
```

Não espalhar lógica de dinheiro pelos componentes.

## Mobile

No desktop, a interface pode parecer tabela.

No celular, a mesma informação deve virar card editável:

```text
Água
R$ 120,00
Pago por: Eliane
```

Evitar tabela horizontal apertada no iPhone.

## Realtime

Fora do MVP obrigatório.

Primeira versão pode atualizar ao abrir o mês, adicionar linha ou salvar edição.

Realtime entra depois para refletir edição simultânea entre Vini e Eliane.

## Antipadrões

Evitar:

- formulário grande para cadastrar despesa;
- modal para cada lançamento;
- categorias obrigatórias;
- salvar total no banco;
- lógica financeira misturada no componente visual;
- tabela 100% livre com colunas infinitas;
- usar localStorage como fonte principal.
