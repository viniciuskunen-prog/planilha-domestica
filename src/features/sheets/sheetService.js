import { supabase } from '../../lib/supabaseClient.js';

export async function fetchOrCreateMonthlySheet({ householdId, year, month }) {
  if (!supabase) return { sheet: null, rows: [], error: new Error('Supabase nao configurado') };

  const found = await supabase
    .from('monthly_sheets')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (found.error) return { sheet: null, rows: [], error: found.error };

  let sheet = found.data;

  if (!sheet) {
    const created = await supabase
      .from('monthly_sheets')
      .insert({ household_id: householdId, year, month })
      .select('*')
      .single();

    if (created.error) return { sheet: null, rows: [], error: created.error };
    sheet = created.data;
  }

  const rowsResult = await fetchRows(sheet.id);

  return {
    sheet,
    rows: rowsResult.rows,
    error: rowsResult.error
  };
}

export async function fetchMonthlySheetRows({ householdId, year, month }) {
  if (!supabase) return { sheet: null, rows: [], error: new Error('Supabase nao configurado') };

  const found = await supabase
    .from('monthly_sheets')
    .select('*')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (found.error) return { sheet: null, rows: [], error: found.error };
  if (!found.data) return { sheet: null, rows: [], error: null };

  const rowsResult = await fetchRows(found.data.id);

  return {
    sheet: found.data,
    rows: rowsResult.rows,
    error: rowsResult.error
  };
}

export async function fetchRows(sheetId) {
  if (!supabase) return { rows: [], error: new Error('Supabase nao configurado') };

  const result = await supabase
    .from('expense_rows')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('position', { ascending: true });

  return {
    rows: (result.data || []).map(mapRowFromDb),
    error: result.error
  };
}

export async function createRow({ sheetId, description = '', amount = 0, paidByUserId, position, userId }) {
  if (!supabase) return { row: null, error: new Error('Supabase nao configurado') };

  const result = await supabase
    .from('expense_rows')
    .insert({
      sheet_id: sheetId,
      description,
      amount,
      paid_by_user_id: paidByUserId,
      position,
      created_by_user_id: userId,
      updated_by_user_id: userId
    })
    .select('*')
    .single();

  return {
    row: result.data ? mapRowFromDb(result.data) : null,
    error: result.error
  };
}

export async function createRows(rows) {
  if (!supabase) return { rows: [], error: new Error('Supabase nao configurado') };
  if (!Array.isArray(rows) || rows.length === 0) return { rows: [], error: null };

  const result = await supabase
    .from('expense_rows')
    .insert(rows.map(mapRowToDb))
    .select('*');

  return {
    rows: (result.data || []).map(mapRowFromDb),
    error: result.error
  };
}

export async function updateRow(rowId, patch, userId) {
  if (!supabase) return { row: null, error: new Error('Supabase nao configurado') };

  const dbPatch = mapPatchToDb(patch);
  dbPatch.updated_by_user_id = userId;

  const result = await supabase
    .from('expense_rows')
    .update(dbPatch)
    .eq('id', rowId)
    .select('*')
    .single();

  return {
    row: result.data ? mapRowFromDb(result.data) : null,
    error: result.error
  };
}

export async function deleteRow(rowId) {
  if (!supabase) return { error: new Error('Supabase nao configurado') };

  const result = await supabase
    .from('expense_rows')
    .delete()
    .eq('id', rowId);

  return { error: result.error };
}

export function subscribeToSheetRows(sheetId, callback) {
  if (!supabase || !sheetId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`sheet-rows-${sheetId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expense_rows',
        filter: `sheet_id=eq.${sheetId}`
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          row: payload.new?.id ? mapRowFromDb(payload.new) : null,
          oldRowId: payload.old?.id || null
        });
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}

function mapRowFromDb(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount || 0),
    paidByUserId: row.paid_by_user_id,
    position: row.position
  };
}

function mapRowToDb(row) {
  return {
    sheet_id: row.sheetId,
    description: row.description,
    amount: row.amount,
    paid_by_user_id: row.paidByUserId,
    position: row.position,
    created_by_user_id: row.userId,
    updated_by_user_id: row.userId
  };
}

function mapPatchToDb(patch) {
  const output = {};

  if (Object.prototype.hasOwnProperty.call(patch, 'description')) output.description = patch.description;
  if (Object.prototype.hasOwnProperty.call(patch, 'amount')) output.amount = patch.amount;
  if (Object.prototype.hasOwnProperty.call(patch, 'paidByUserId')) output.paid_by_user_id = patch.paidByUserId;
  if (Object.prototype.hasOwnProperty.call(patch, 'position')) output.position = patch.position;

  return output;
}
