import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.12";

const ALLOWED_GOOGLE_EMAIL_HASHES = new Set([
  "b6d9a8de045a8672d01c99795d8aecd71e72abbdfd6d002455349d4be25959b6",
  "88671865347f5804fe4b19de7437409c85999c1958c46f21aff18ea02c393807",
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

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function supabaseAdminKey() {
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysJson) {
    try {
      const secretKeys = JSON.parse(secretKeysJson) as Record<string, string>;
      if (secretKeys.default) return secretKeys.default;
    } catch (error) {
      console.error("Invalid SUPABASE_SECRET_KEYS JSON", error);
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || null;
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
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email || payload.email_verified !== true || typeof payload.aud !== "string" || !payload.aud) {
      return false;
    }
    return ALLOWED_GOOGLE_EMAIL_HASHES.has(await sha256Hex(email));
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
    const adminKey = supabaseAdminKey();
    if (!supabaseUrl || !adminKey) {
      console.error("Missing Supabase server credentials");
      return json({ ok: false, error: "server_configuration_error" }, 500);
    }

    const requestUrl = new URL(req.url);
    const requestedMonths = Number(requestUrl.searchParams.get("months") || DEFAULT_MONTHS);
    const months = Number.isFinite(requestedMonths)
      ? Math.min(MAX_MONTHS, Math.max(1, Math.trunc(requestedMonths)))
      : DEFAULT_MONTHS;

    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: households, error: householdsError } = await supabase
      .from("households")
      .select("id")
      .limit(2);
    if (householdsError) throw householdsError;
    if (!households || households.length !== 1) {
      console.error("Expected exactly one household", { count: households?.length || 0 });
      return json({ ok: false, error: "household_topology_drift" }, 409);
    }
    const householdId = households[0].id;

    const { data: members, error: membersError } = await supabase
      .from("household_members")
      .select("user_id, role")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (membersError) throw membersError;

    const owner = (members || []).filter((member) => member.role === "owner");
    const regular = (members || []).filter((member) => member.role === "member");
    if ((members || []).length !== 2 || owner.length !== 1 || regular.length !== 1) {
      console.error("Household membership drift detected", {
        total: members?.length || 0,
        owners: owner.length,
        regularMembers: regular.length,
      });
      return json({ ok: false, error: "household_membership_drift" }, 409);
    }

    const viniId = owner[0].user_id;
    const elianeId = regular[0].user_id;
    const memberIds = [viniId, elianeId];
    const now = currentPeriod();
    const minIndex = periodIndex(now.year, now.month) - (months - 1);
    const maxIndex = periodIndex(now.year, now.month);

    const { data: sheets, error: sheetsError } = await supabase
      .from("monthly_sheets")
      .select("id, year, month, updated_at")
      .eq("household_id", householdId)
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
      const paidByUser: Record<string, number> = { [viniId]: 0, [elianeId]: 0 };

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
        paidVini: roundMoney(paidByUser[viniId] || 0),
        paidEliane: roundMoney(paidByUser[elianeId] || 0),
        settlementViniToEliane: hasSettlement && debtor.userId === viniId && creditor.userId === elianeId
          ? roundMoney(amount)
          : 0,
        settlementElianeToVini: hasSettlement && debtor.userId === elianeId && creditor.userId === viniId
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
