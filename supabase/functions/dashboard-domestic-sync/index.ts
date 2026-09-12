import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.12";

const HOUSEHOLD_ID = "32d5d5ff-2cf8-4709-8a1a-fda75a4a2a04";
const VINI_ID = "d8ac6a90-e593-4a44-9b6c-a0979ce7ca4d";
const ELIANE_ID = "f7aa7607-e2be-45ef-893a-d8f358b62a2e";
const ALLOWED_GOOGLE_EMAILS = new Set([
  "falecom@ovinikunen.com.br",
  "vinicius.kunen@gmail.com",
]);
const TIMEZONE = "America/Sao_Paulo";
const DEFAULT_MONTHS = 4;
const MAX_MONTHS = 12;
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function periodIndex(year: number, month: number) {
  return year * 12 + (month - 1);
}

function currentPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function latestIso(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) return null;
  return valid.sort().at(-1) || null;
}

async function authorizeGoogleCaller(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7).trim();
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    const email = String(payload.email || "").toLowerCase();
    return ALLOWED_GOOGLE_EMAILS.has(email) &&
      payload.email_verified === true &&
      typeof payload.aud === "string" &&
      payload.aud.length > 0;
  } catch (error) {
    console.warn("Google OIDC validation failed", error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);
    if (!(await authorizeGoogleCaller(req))) return json({ ok: false, error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      console.error("Missing Supabase server credentials");
      return json({ ok: false, error: "server_configuration_error" }, 500);
    }

    const requestUrl = new URL(req.url);
    const requestedMonths = Number(requestUrl.searchParams.get("months") || DEFAULT_MONTHS);
    const months = Number.isFinite(requestedMonths)
      ? Math.min(MAX_MONTHS, Math.max(1, Math.trunc(requestedMonths)))
      : DEFAULT_MONTHS;

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: members, error: membersError } = await supabase
      .from("household_members")
      .select("user_id, role")
      .eq("household_id", HOUSEHOLD_ID)
      .order("created_at", { ascending: true });
    if (membersError) throw membersError;

    const memberIds = (members || []).map((member) => member.user_id);
    if (memberIds.length !== 2 || !memberIds.includes(VINI_ID) || !memberIds.includes(ELIANE_ID)) {
      console.error("Household membership drift detected", { memberIds });
      return json({ ok: false, error: "household_membership_drift" }, 409);
    }

    const now = currentPeriod();
    const minIndex = periodIndex(now.year, now.month) - (months - 1);
    const maxIndex = periodIndex(now.year, now.month);

    const { data: sheets, error: sheetsError } = await supabase
      .from("monthly_sheets")
      .select("id, year, month, updated_at")
      .eq("household_id", HOUSEHOLD_ID)
      .order("year", { ascending: true })
      .order("month", { ascending: true });
    if (sheetsError) throw sheetsError;

    const selectedSheets = (sheets || []).filter((sheet) => {
      const index = periodIndex(Number(sheet.year), Number(sheet.month));
      return index >= minIndex && index <= maxIndex;
    });

    const sheetIds = selectedSheets.map((sheet) => sheet.id);
    let expenseRows: Array<{
      sheet_id: string;
      amount: number | string | null;
      paid_by_user_id: string | null;
      updated_at: string | null;
    }> = [];

    if (sheetIds.length) {
      const { data, error } = await supabase
        .from("expense_rows")
        .select("sheet_id, amount, paid_by_user_id, updated_at")
        .in("sheet_id", sheetIds);
      if (error) throw error;
      expenseRows = data || [];
    }

    const rowsBySheet = new Map<string, typeof expenseRows>();
    for (const row of expenseRows) {
      const bucket = rowsBySheet.get(row.sheet_id) || [];
      bucket.push(row);
      rowsBySheet.set(row.sheet_id, bucket);
    }

    const rows = selectedSheets.map((sheet) => {
      const expenses = rowsBySheet.get(sheet.id) || [];
      const total = expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      const sharePerPerson = total / memberIds.length;
      const paidByUser: Record<string, number> = { [VINI_ID]: 0, [ELIANE_ID]: 0 };

      for (const row of expenses) {
        if (!row.paid_by_user_id) continue;
        paidByUser[row.paid_by_user_id] = (paidByUser[row.paid_by_user_id] || 0) + (Number(row.amount) || 0);
      }

      const balances = memberIds.map((userId) => ({
        userId,
        paid: paidByUser[userId] || 0,
        balance: (paidByUser[userId] || 0) - sharePerPerson,
      })).sort((a, b) => a.balance - b.balance);

      const debtor = balances[0];
      const creditor = balances[balances.length - 1];
      const amount = debtor && creditor
        ? Math.max(0, Math.min(Math.abs(debtor.balance), creditor.balance))
        : 0;
      const hasSettlement = amount > 0.009;

      return {
        month: `${String(sheet.year).padStart(4, "0")}-${String(sheet.month).padStart(2, "0")}`,
        totalShared: roundMoney(total),
        sharePerPerson: roundMoney(sharePerPerson),
        paidVini: roundMoney(paidByUser[VINI_ID] || 0),
        paidEliane: roundMoney(paidByUser[ELIANE_ID] || 0),
        settlementViniToEliane: hasSettlement && debtor.userId === VINI_ID && creditor.userId === ELIANE_ID
          ? roundMoney(amount)
          : 0,
        settlementElianeToVini: hasSettlement && debtor.userId === ELIANE_ID && creditor.userId === VINI_ID
          ? roundMoney(amount)
          : 0,
        expenseCount: expenses.length,
        updatedAt: latestIso([sheet.updated_at, ...expenses.map((row) => row.updated_at)]),
      };
    });

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      monthsRequested: months,
      rows,
    });
  } catch (error) {
    console.error("dashboard-domestic-sync failed", error);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
