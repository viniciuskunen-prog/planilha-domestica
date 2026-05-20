import { useEffect, useState } from 'react';
import {
  createRow as createRowOnServer,
  createRows as createRowsOnServer,
  deleteRow as deleteRowOnServer,
  fetchMonthlySheetRows,
  fetchOrCreateMonthlySheet,
  updateRow as updateRowOnServer
} from './sheetService.js';

export function useMonthlySheet({ household, period, user, fallbackPaidByUserId }) {
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(household));
  const [copyingStructure, setCopyingStructure] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSheet() {
      if (!household || !period) {
        setSheet(null);
        setRows([]);
        setPreviousRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await fetchOrCreateMonthlySheet({
        householdId: household.id,
        year: period.year,
        month: period.month
      });

      const previousPeriod = shiftPeriod(period, -1);
      const previousResult = await fetchMonthlySheetRows({
        householdId: household.id,
        year: previousPeriod.year,
        month: previousPeriod.month
      });

      if (!active) return;
      setSheet(result.sheet);
      setRows(result.rows || []);
      setPreviousRows(previousResult.rows || []);
      setError(result.error || previousResult.error || null);
      setLoading(false);
    }

    loadSheet();

    return () => {
      active = false;
    };
  }, [household, period]);

  async function addRow() {
    if (!sheet || !user) return null;

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
      return null;
    }

    setRows((current) => current.map((row) => row.id === tempRow.id ? result.row : row));
    return result.row;
  }

  function updateRow(rowId, field, value) {
    const patch = { [field]: value };
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }

  async function saveRow(rowId, field, value) {
    if (String(rowId).startsWith('temp-') || !user) return;

    const patch = { [field]: value };
    const result = await updateRowOnServer(rowId, patch, user.id);

    if (result.error) {
      setError(result.error);
      return;
    }

    setRows((current) => current.map((row) => row.id === rowId ? result.row : row));
  }

  async function updateAndSaveRow(rowId, field, value) {
    updateRow(rowId, field, value);
    await saveRow(rowId, field, value);
  }

  async function removeRow(rowId) {
    const previousRowsSnapshot = rows;
    setRows((current) => current.filter((row) => row.id !== rowId));

    if (String(rowId).startsWith('temp-')) return;

    const result = await deleteRowOnServer(rowId);

    if (result.error) {
      setError(result.error);
      setRows(previousRowsSnapshot);
    }
  }

  async function copyPreviousStructure() {
    if (!sheet || !user || previousRows.length === 0 || rows.length > 0) return;

    setCopyingStructure(true);
    setError(null);

    const rowsToCreate = previousRows.map((row, index) => ({
      sheetId: sheet.id,
      description: row.description,
      amount: 0,
      paidByUserId: row.paidByUserId || fallbackPaidByUserId,
      position: index,
      userId: user.id
    }));

    const result = await createRowsOnServer(rowsToCreate);

    if (result.error) {
      setError(result.error);
      setCopyingStructure(false);
      return;
    }

    setRows(result.rows || []);
    setCopyingStructure(false);
  }

  return {
    sheet,
    rows,
    previousRows,
    loading,
    copyingStructure,
    error,
    addRow,
    updateRow,
    saveRow,
    updateAndSaveRow,
    removeRow,
    copyPreviousStructure
  };
}

function shiftPeriod(period, offset) {
  const date = new Date(period.year, period.month - 1 + offset, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}
