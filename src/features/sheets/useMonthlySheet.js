import { useEffect, useState } from 'react';
import {
  createRow as createRowOnServer,
  deleteRow as deleteRowOnServer,
  fetchOrCreateMonthlySheet,
  updateRow as updateRowOnServer
} from './sheetService.js';

export function useMonthlySheet({ household, period, user, fallbackPaidByUserId }) {
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(household));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSheet() {
      if (!household || !period) {
        setSheet(null);
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await fetchOrCreateMonthlySheet({
        householdId: household.id,
        year: period.year,
        month: period.month
      });

      if (!active) return;
      setSheet(result.sheet);
      setRows(result.rows || []);
      setError(result.error || null);
      setLoading(false);
    }

    loadSheet();

    return () => {
      active = false;
    };
  }, [household, period]);

  async function addRow() {
    if (!sheet || !user) return;

    const tempRow = {
      id: `temp-${crypto.randomUUID()}`,
      description: '',
      amount: 0,
      paidByUserId: fallbackPaidByUserId,
      position: rows.length
    };

    setRows((current) => [...current, tempRow]);

    const result = await createRowOnServer({
      sheetId: sheet.id,
      description: '',
      amount: 0,
      paidByUserId: fallbackPaidByUserId,
      position: rows.length,
      userId: user.id
    });

    if (result.error) {
      setError(result.error);
      setRows((current) => current.filter((row) => row.id !== tempRow.id));
      return;
    }

    setRows((current) => current.map((row) => row.id === tempRow.id ? result.row : row));
  }

  async function updateRow(rowId, field, value) {
    const previousRows = rows;
    const patch = { [field]: value };

    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));

    if (String(rowId).startsWith('temp-') || !user) return;

    const result = await updateRowOnServer(rowId, patch, user.id);

    if (result.error) {
      setError(result.error);
      setRows(previousRows);
      return;
    }

    setRows((current) => current.map((row) => row.id === rowId ? result.row : row));
  }

  async function removeRow(rowId) {
    const previousRows = rows;
    setRows((current) => current.filter((row) => row.id !== rowId));

    if (String(rowId).startsWith('temp-')) return;

    const result = await deleteRowOnServer(rowId);

    if (result.error) {
      setError(result.error);
      setRows(previousRows);
    }
  }

  async function replaceRowsFromStructure(sourceRows) {
    if (!sheet || !user || !Array.isArray(sourceRows)) return;

    for (const row of sourceRows) {
      const result = await createRowOnServer({
        sheetId: sheet.id,
        description: row.description,
        amount: 0,
        paidByUserId: row.paidByUserId || fallbackPaidByUserId,
        position: rows.length,
        userId: user.id
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setRows((current) => [...current, result.row]);
    }
  }

  return {
    sheet,
    rows,
    loading,
    error,
    addRow,
    updateRow,
    removeRow,
    replaceRowsFromStructure
  };
}
