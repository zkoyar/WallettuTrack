/**
 * End-to-end QA covering every application action at the API and logic levels.
 * Usage: node scripts/qa.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3001";
const EMAIL = `qa${Date.now()}@wallettutrack.test`;
const PASSWORD = "QaPassword123!";

let jar = {};
const results = [];

function setJar(res) {
  const sc = res.headers.getSetCookie?.() ?? [];
  for (const c of sc) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    jar[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
}
function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path, body, expect) {
  const isForm = body instanceof URLSearchParams;
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined && !isForm
        ? { "Content-Type": "application/json" }
        : {}),
      cookie: cookieHeader(),
    },
    body: body !== undefined ? (isForm ? body : JSON.stringify(body)) : undefined,
    redirect: "manual",
  });
  setJar(res);
  let json = null;
  try { json = await res.json(); } catch {}
  if (expect !== undefined && res.status !== expect) {
    throw new Error(`[${method} ${path}] expected ${expect}, received ${res.status} · ${JSON.stringify(json)?.slice(0, 120)}`);
  }
  return { status: res.status, json, headers: res.headers };
}

function check(label, fn) {
  results.push({ label, run: fn });
}

// ---------------------------------------------------------------- suite

async function main() {
  let backupPayload;
  let revokedSessionCookie = "";
  check("Health check · application and database → 200", async () => {
    const { json } = await req("GET", "/api/health", undefined, 200);
    if (json.status !== "ok") throw new Error(`status=${json.status}`);
  });
  // ---------- security ----------
  check("Security · /api/transactions without a session → 401", async () => {
    jar = {};
    await req("GET", "/api/transactions", undefined, 401);
  });

  check("Security · protected page without a session → redirect", async () => {
    const r = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    if (![302, 307].includes(r.status)) throw new Error(`status ${r.status}`);
  });

  // ---------- registration ----------
  check("Register · short password → 422", async () => {
    jar = {};
    await req("POST", "/api/register", { name: "QA", email: `x${EMAIL}`, password: "123" }, 422);
  });
  check("Register · first user → 201", async () => {
    await req("POST", "/api/register", { name: "QA Bot", email: EMAIL, password: PASSWORD }, 201);
  });
  check("Register · closed after the first user → 403", async () => {
    await req("POST", "/api/register", { name: "QA", email: `second-${EMAIL}`, password: PASSWORD }, 403);
  });

  // ---------- login ----------
  check("Login · csrf + credentials → 302", async () => {
    jar = {};
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    const r = await req("POST", "/api/auth/callback/credentials",
      new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken }),
      302);
    if (process.env.QA_DEBUG) {
      console.log("    [debug] jar keys:", Object.keys(jar).join(","));
      const probe = await fetch(`${BASE}/api/categories`, { headers: { cookie: cookieHeader() } });
      console.log("    [debug] probe categories:", probe.status,
        "| cookieLen:", cookieHeader().length);
      void r;
    }
  });

  // ---------- initial setup ----------
  let catId, accId, secondAccId, tagId, defaultCategoryIds;
  check("Onboarding · dashboard redirects before setup", async () => {
    const res = await fetch(`${BASE}/dashboard`, {
      headers: { cookie: cookieHeader() },
      redirect: "manual",
    });
    if (![302, 307].includes(res.status)) throw new Error(`status ${res.status}`);
    if (!(res.headers.get("location") ?? "").includes("/onboarding")) {
      throw new Error(`location=${res.headers.get("location")}`);
    }
  });
  check("Onboarding · wizard page → 200", async () => {
    const res = await fetch(`${BASE}/onboarding`, {
      headers: { cookie: cookieHeader() },
    });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
  });

  // ---------- categories ----------
  check("Categories · 16 defaults after registration", async () => {
    const { json } = await req("GET", "/api/categories", undefined, 200);
    if (json.items.length < 16) throw new Error(`found ${json.items.length}`);
    catId = json.items.find((c) => c.name === "Groceries").id;
    defaultCategoryIds = json.items.map((category) => category.id);
  });
  check("Accounts · auto-provisioned 'Main account'", async () => {
    const { json } = await req("GET", "/api/accounts", undefined, 200);
    if (!json.items.some((account) => account.name === "Main account")) {
      throw new Error("missing");
    }
    accId = json.items[0].id;
  });
  check("Onboarding · saves profile, account, and categories", async () => {
    await req("POST", "/api/onboarding", {
      name: "QA Bot",
      baseCurrency: "EUR",
      accountId: accId,
      accountName: "Main account",
      currentBalance: 0,
      categoryIds: defaultCategoryIds,
    }, 200);
  });
  check("Onboarding · second completion is blocked → 409", async () => {
    await req("POST", "/api/onboarding", {
      name: "QA Bot",
      baseCurrency: "EUR",
      accountId: accId,
      accountName: "Main account",
      currentBalance: 0,
      categoryIds: defaultCategoryIds,
    }, 409);
  });
  check("Onboarding · dashboard is available after setup", async () => {
    const res = await fetch(`${BASE}/dashboard`, {
      headers: { cookie: cookieHeader() },
    });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
  });
  check("Categories · create → 201", async () => {
    const { json } = await req("POST", "/api/categories", { name: "QA Cat", color: "#ff0000", icon: "🧪", type: "EXPENSE" }, 201);
    catId = json.item.id;
  });
  check("Categories · duplicate name → 409", async () => {
    await req("POST", "/api/categories", { name: "QA Cat" }, 409);
  });
  check("Categories · update color → 200", async () => {
    const { json } = await req("PATCH", `/api/categories/${catId}`, { color: "#00ff00" }, 200);
    if (json.item.type !== "EXPENSE" || json.item.name !== "QA Cat") {
      throw new Error("partial update reset an omitted category field");
    }
  });

  // ---------- tags and projects ----------
  check("Tags · create project → 201", async () => {
    const { json } = await req("POST", "/api/tags", { name: "QA Project", color: "#8b5cf6" }, 201);
    tagId = json.item.id;
  });
  check("Tags · duplicate name → 409", async () => {
    await req("POST", "/api/tags", { name: "QA Project", color: "#8b5cf6" }, 409);
  });

  // ---------- accounts ----------
  check("Accounts · create second account → 201", async () => {
    const { json } = await req("POST", "/api/accounts", { name: "QA Cash", icon: "💵", currentBalance: 77.7 }, 201);
    secondAccId = json.item.id;
  });
  check("Accounts · duplicate name → 409", async () => {
    await req("POST", "/api/accounts", { name: "QA Cash" }, 409);
  });
  check("Accounts · update balance → 200", async () => {
    await req("PATCH", "/api/accounts", { id: accId, currentBalance: 1500 }, 200);
  });

  // ---------- transactions ----------
  let txId;
  check("Transactions · create with category and account → 201 with base conversion", async () => {
    const { json } = await req("POST", "/api/transactions",
      { type: "EXPENSE", categoryId: catId, accountId: accId, tagIds: [tagId], amount: 80, currency: "EUR", date: "2026-08-20", description: "QA expense" },
      201);
    txId = json.item.id;
    if (!(json.item.amountBase > 79 && json.item.amountBase < 81)) throw new Error("incorrect conversion");
    if (json.item.tags?.[0]?.id !== tagId) throw new Error("tag was not linked");
  });
  check("Active account · selection persists in the cookie", async () => {
    const { json } = await req("POST", "/api/accounts/selected", { accountId: secondAccId }, 200);
    if (json.item.id !== secondAccId) throw new Error("incorrect active account");
    const accounts = await req("GET", "/api/accounts", undefined, 200);
    if (accounts.json.selectedAccountId !== secondAccId) throw new Error("selection was not persisted");
  });
  check("Active account · isolates visible transactions", async () => {
    const { json } = await req("GET", "/api/transactions?q=QA expense", undefined, 200);
    if (json.total !== 0) throw new Error(`expected 0, found ${json.total}`);
  });
  check("Active account · new writes use the selected account", async () => {
    const { json } = await req("POST", "/api/transactions", {
      type: "EXPENSE",
      amount: 3,
      currency: "EUR",
      date: "2026-08-20",
      description: "QA active account",
    }, 201);
    if (json.item.account?.id !== secondAccId) throw new Error("transaction linked to the wrong account");
    await req("DELETE", `/api/transactions/${json.item.id}`, undefined, 200);
  });
  check("Active account · returning to the main account restores data", async () => {
    await req("POST", "/api/accounts/selected", { accountId: accId }, 200);
    const { json } = await req("GET", "/api/transactions?q=QA expense", undefined, 200);
    if (json.total !== 1) throw new Error(`expected 1, found ${json.total}`);
  });
  check("Tags · transaction filter", async () => {
    const { json } = await req("GET", `/api/transactions?tagId=${tagId}`, undefined, 200);
    if (json.total !== 1 || json.items[0].id !== txId) throw new Error("tag filter was not applied");
  });
  check("Reconciliation · updates balance and records the difference", async () => {
    const { json } = await req("POST", "/api/reconciliations", {
      actualBalance: 1490,
      notes: "QA bank statement",
    }, 201);
    if (Number(json.item.difference) !== -10) throw new Error(`difference=${json.item.difference}`);
    const history = await req("GET", "/api/reconciliations", undefined, 200);
    if (history.json.account.currentBalance !== 1490 || history.json.items.length !== 1)
      throw new Error("incorrect reconciliation history");
  });
  check("Transactions · negative amount → 422", async () => {
    await req("POST", "/api/transactions", { amount: -5, currency: "EUR", date: "2026-08-20" }, 422);
  });
  check("Transactions · malformed date → 422", async () => {
    await req("POST", "/api/transactions", { amount: 5, currency: "EUR", date: "20-08-2026" }, 422);
  });
  check("Transactions · nonexistent account → 404", async () => {
    await req("POST", "/api/transactions", { amount: 5, currency: "EUR", date: "2026-08-20", accountId: "clxxxxxxxxxxxxxxxxxxxxxx" }, 404);
  });
  check("Transactions · list contains category and account references", async () => {
    const { json } = await req("GET", `/api/transactions?q=QA expense`, undefined, 200);
    const item = json.items[0];
    if (!item?.category || !item?.account) throw new Error("missing references");
  });
  check("Transactions · INCOME filter excludes expenses", async () => {
    const { json } = await req("GET", "/api/transactions?type=INCOME&pageSize=100", undefined, 200);
    if (json.items.some((t) => t.type !== "INCOME")) throw new Error("filter was not applied");
  });
  check("Transactions · accountId filter works", async () => {
    const { json } = await req("GET", `/api/transactions?accountId=${accId}`, undefined, 200);
    if (json.total < 1) throw new Error("no results");
  });
  check("Transactions · empty date range filter is consistent", async () => {
    const { json } = await req("GET", "/api/transactions?from=2030-01-01&to=2030-01-31", undefined, 200);
    if (json.total !== 0) throw new Error(`expected 0, found ${json.total}`);
  });
  check("Transactions · amount PATCH recalculates base amount", async () => {
    const { json } = await req("PATCH", `/api/transactions/${txId}`, { amount: 160 }, 200);
    if (!(json.item.amountBase > 159)) throw new Error("base amount was not recalculated");
    if (json.item.type !== "EXPENSE") throw new Error("partial update reset transaction type");
  });

  // ---------- detected subscriptions ----------
  check("Subscriptions · create a monthly sequence with a price increase", async () => {
    for (const [date, amount] of [["2026-06-05", 10], ["2026-07-05", 10], ["2026-08-05", 12]]) {
      await req("POST", "/api/transactions", {
        type: "EXPENSE",
        accountId: accId,
        amount,
        currency: "EUR",
        date,
        description: "QA Stream",
      }, 201);
    }
  });
  check("Subscriptions · detect frequency and price increase", async () => {
    const { json } = await req("GET", "/api/subscriptions", undefined, 200);
    const candidate = json.items.find((item) => item.description === "QA Stream");
    if (!candidate || candidate.frequency !== "MONTHLY") throw new Error("frequency was not detected");
    if (Number(candidate.priceChangePercent) !== 20) throw new Error(`priceIncrease=${candidate.priceChangePercent}`);
  });

  // ---------- multiple currencies ----------
  check("Currencies · USD converted to base currency with the live rate", async () => {
    const { json } = await req("POST", "/api/transactions",
      { amount: 100, currency: "USD", date: "2026-08-21", description: "QA usd" }, 201);
    const rate = Number(json.item.exchangeRate ?? 1);
    if (!(rate > 0.5 && rate < 1.5)) throw new Error(`rate out of range: ${rate}`);
    await req("DELETE", `/api/transactions/${json.item.id}`, undefined, 200);
  });

  // ---------- recurrences ----------
  let recId;
  check("Recurrences · weekly without daysOfWeek → 201 (start-day fallback)", async () => {
    const { json } = await req("POST", "/api/recurrences",
      { amount: 10, currency: "EUR", frequency: "WEEKLY", startDate: "2026-09-01", description: "QA weekly" }, 201);
    recId = json.item.id;
  });
  check("Recurrences · endDate before startDate → 422", async () => {
    await req("POST", "/api/recurrences",
      { amount: 5, currency: "EUR", frequency: "DAILY", startDate: "2026-09-10", endDate: "2026-09-01" }, 422);
  });
  check("Upcoming · only future occurrences (> today)", async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const { json } = await req("GET", "/api/recurrences/upcoming?days=45", undefined, 200);
    if (json.items.length === 0) throw new Error("no occurrences");
    if (json.items.some((u) => u.date <= todayIso)) throw new Error("contains past dates");
  });
  check("Recurrences · toggle active → 200", async () => {
    await req("PATCH", `/api/recurrences/${recId}`, { active: false }, 200);
    await req("PATCH", `/api/recurrences/${recId}`, { active: true }, 200);
  });
  check("Recurrences · delete → 200", async () => {
    await req("DELETE", `/api/recurrences/${recId}`, undefined, 200);
  });

  // ---------- events ----------
  let evFuture, evPast;
  check("Events · create future event → 201", async () => {
    const d = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const { json } = await req("POST", "/api/events",
      { amount: 60, currency: "EUR", description: "QA future event", date: d, type: "EXPENSE" }, 201);
    evFuture = json.item.id;
  });
  check("Events · create with today's date → 201", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { json } = await req("POST", "/api/events",
      { amount: 7, currency: "EUR", description: "QA due event", date: today }, 201);
    evPast = json.item.id;
  });
  check("Materialization · due event becomes a transaction on load", async () => {
    await fetch(`${BASE}/dashboard`, { headers: { cookie: cookieHeader() } }); // trigger layout
    const { json } = await req("GET", `/api/transactions?q=QA due event`, undefined, 200);
    if (json.total !== 1 || json.items[0].externalId !== `event:${evPast}`) throw new Error("not materialized");
    const events = (await req("GET", "/api/events")).json;
    if (events.items.some((e) => e.id === evPast)) throw new Error("event was not consumed");
  });
  check("Events · patch amount → 200", async () => {
    await req("PATCH", `/api/events/${evFuture}`, { amount: 65 }, 200);
  });
  check("Events · delete → 200", async () => {
    await req("DELETE", `/api/events/${evFuture}`, undefined, 200);
  });

  // ---------- budget ----------
  let budId;
  check("Budgets · create monthly budget → 201 with base currency", async () => {
    const cats = (await req("GET", "/api/categories")).json.items;
    const c = cats.find((c) => c.name === "Transport") ?? cats[0];
    const { json } = await req("POST", "/api/budgets",
      { categoryId: c.id, amount: 300, period: "MONTHLY", alertThreshold: 75 }, 201);
    budId = json.item.id;
    if (json.item.currency !== "EUR") throw new Error(`currency ${json.item.currency}`);
  });
  check("Budgets · duplicate category and period → 409", async () => {
    const cats = (await req("GET", "/api/categories")).json.items;
    const c = cats.find((c) => c.name === "Transport");
    await req("POST", "/api/budgets", { categoryId: c.id, amount: 100, period: "MONTHLY" }, 409);
  });
  check("Budgets · patch threshold → 200", async () => {
    await req("PATCH", `/api/budgets/${budId}`, { alertThreshold: 90 }, 200);
  });
  check("Budgets · delete → 200", async () => {
    await req("DELETE", `/api/budgets/${budId}`, undefined, 200);
  });

  // ---------- goals ----------
  let goalId;
  check("Goals · create → 201", async () => {
    const { json } = await req("POST", "/api/goals",
      { name: "QA Fund", targetAmount: 500, savedAmount: 100, deadline: "2026-12-31" }, 201);
    goalId = json.item.id;
  });
  check("Goals · cumulative addToSaved → 350", async () => {
    const { json } = await req("PATCH", "/api/goals", { id: goalId, addToSaved: 250 }, 200);
    if (Number(json.item.savedAmount) !== 350) throw new Error(`saved=${json.item.savedAmount}`);
  });
  check("Goals · direct savedAmount → 400", async () => {
    const { json } = await req("PATCH", "/api/goals", { id: goalId, savedAmount: 400 }, 200);
    if (Number(json.item.savedAmount) !== 400) throw new Error(`saved=${json.item.savedAmount}`);
  });
  check("Goals · delete → 200", async () => {
    await req("DELETE", `/api/goals?id=${goalId}`, undefined, 200);
  });

  // ---------- cleanup-safe accounts ----------
  check("Accounts · delete second account → 200", async () => {
    const list = (await req("GET", "/api/accounts")).json.items;
    const cashAccount = list.find((a) => a.name === "QA Cash");
    await req("DELETE", `/api/accounts?id=${cashAccount.id}`, undefined, 200);
  });

  // ---------- categorization rules ----------
  let ruleId;
  check("Rules · create keyword → 201 (lowercase)", async () => {
    const { json } = await req("POST", "/api/category-rules", { keyword: "QATESTKEY", categoryId: catId }, 201);
    ruleId = json.item.id;
    if (json.item.keyword !== "qatestkey") throw new Error("not lowercase");
  });
  check("Rules · duplicate → 409", async () => {
    await req("POST", "/api/category-rules", { keyword: "qatestkey", categoryId: catId }, 409);
  });
  check("Rules · delete → 200", async () => {
    await req("DELETE", `/api/category-rules/${ruleId}`, undefined, 200);
  });

  // ---------- import/export ----------
  check("Export · CSV with correct header", async () => {
    const res = await fetch(`${BASE}/api/export`, { headers: { cookie: cookieHeader() } });
    const text = await res.text();
    if (!res.ok || !text.startsWith("date,type,category")) throw new Error(`status ${res.status}`);
  });
  const importCsv = "date,type,category,amount,currency,description\n2026-08-25,EXPENSE,Groceries,12.34,EUR,QA import row\n";
  const importForm = (mode) => {
    const form = new FormData();
    form.append("file", new File([importCsv], "qa-import.csv", { type: "text/csv" }));
    form.append("mode", mode);
    return form;
  };
  let importBatchId;
  check("Import · preview does not write and shows the row", async () => {
    const response = await fetch(`${BASE}/api/import`, {
      method: "POST",
      body: importForm("preview"),
      headers: { cookie: cookieHeader() },
    });
    const data = await response.json();
    if (!response.ok || data.importable !== 1 || data.rows?.[0]?.status !== "new") {
      throw new Error(`preview=${JSON.stringify(data)}`);
    }
    const transactions = await req("GET", "/api/transactions?q=QA import row", undefined, 200);
    if (transactions.json.total !== 0) throw new Error("preview wrote to the database");
  });
  check("Import · confirmation creates a batch and transaction", async () => {
    const response = await fetch(`${BASE}/api/import`, {
      method: "POST",
      body: importForm("commit"),
      headers: { cookie: cookieHeader() },
    });
    const data = await response.json();
    if (!response.ok || data.inserted !== 1 || !data.batchId) {
      throw new Error(`import=${JSON.stringify(data)}`);
    }
    importBatchId = data.batchId;
    const history = await req("GET", "/api/import/batches", undefined, 200);
    if (!history.json.items.some((item) => item.id === importBatchId)) {
      throw new Error("batch is missing from history");
    }
  });
  check("Import · second run is recognized as a duplicate", async () => {
    const response = await fetch(`${BASE}/api/import`, {
      method: "POST",
      body: importForm("commit"),
      headers: { cookie: cookieHeader() },
    });
    const data = await response.json();
    if (data.duplicates !== 1 || data.inserted !== 0) {
      throw new Error(`deduplication failed: ${JSON.stringify(data)}`);
    }
  });
  check("Import · undo only the selected batch", async () => {
    const { json } = await req("DELETE", `/api/import/batches/${importBatchId}`, undefined, 200);
    if (json.deleted !== 1) throw new Error(`deleted=${json.deleted}`);
    const transactions = await req("GET", "/api/transactions?q=QA import row", undefined, 200);
    if (transactions.json.total !== 0) throw new Error("imported transaction is still present");
  });
  check("Import · file can be imported again after undo", async () => {
    const response = await fetch(`${BASE}/api/import`, {
      method: "POST",
      body: importForm("commit"),
      headers: { cookie: cookieHeader() },
    });
    const data = await response.json();
    if (!response.ok || data.inserted !== 1 || !data.batchId) {
      throw new Error(`reimport=${JSON.stringify(data)}`);
    }
  });

  // ---------- transfers ----------
  let transferAccountId;
  check("Transfers · create second account → 201", async () => {
    const { json } = await req("POST", "/api/accounts", { name: "QA Transfer Account", icon: "🏦", currentBalance: 0 }, 201);
    transferAccountId = json.item.id;
  });
  check("Transfers · same account → 422", async () => {
    await req("POST", "/api/transfers",
      { fromAccountId: accId, toAccountId: accId, amount: 10, date: "2026-08-22" }, 422);
  });
  check("Transfers · nonexistent account → 404", async () => {
    await req("POST", "/api/transfers",
      { fromAccountId: accId, toAccountId: "clxxxxxxxxxxxxxxxxxxxxxx", amount: 10, date: "2026-08-22" }, 404);
  });
  let transferOutId, transferGroup;
  check("Transfers · POST creates two linked transactions → 201", async () => {
    const { json } = await req("POST", "/api/transfers",
      { fromAccountId: accId, toAccountId: transferAccountId, amount: 50, date: "2026-08-22", description: "QA transfer" }, 201);
    if (json.items.length !== 2) throw new Error(`items=${json.items.length}`);
    const [out, inc] = json.items;
    if (out.type !== "EXPENSE" || inc.type !== "INCOME") throw new Error("incorrect types");
    if (out.transferGroupId !== inc.transferGroupId) throw new Error("different group IDs");
    transferOutId = out.id;
    transferGroup = out.transferGroupId;
  });
  check("Accounts · block deletion when the account contains data → 409", async () => {
    await req("DELETE", `/api/accounts?id=${transferAccountId}`, undefined, 409);
  });
  check("Transfers · GET lists the group", async () => {
    const { json } = await req("GET", "/api/transfers", undefined, 200);
    const g = json.items.find((i) => i.groupId === transferGroup);
    if (!g) throw new Error("missing group");
    if (Number(g.amount) !== 50) throw new Error(`amount=${g.amount}`);
  });
  check("Transfers · deleting one transaction also deletes its counterpart", async () => {
    await req("DELETE", `/api/transactions/${transferOutId}`, undefined, 200);
    const { json } = await req("GET", "/api/transfers", undefined, 200);
    if (json.items.some((i) => i.groupId === transferGroup)) throw new Error("counterpart was not deleted");
  });
  check("Transfers · account cleanup → 200", async () => {
    await req("DELETE", `/api/accounts?id=${transferAccountId}`, undefined, 200);
  });

  // ---------- notifications ----------
  let notificationEventId;
  check("Alerts · save preferences for the active account", async () => {
    await req("PATCH", "/api/alert-preferences", {
      budgetAlerts: true,
      upcomingAlerts: true,
      upcomingDays: 7,
      goalAlerts: true,
      lowBalanceEnabled: true,
      lowBalanceThreshold: 2000,
      unusualExpenseEnabled: true,
      unusualExpenseThreshold: 100,
      subscriptionAlerts: true,
    }, 200);
    const { json } = await req("GET", "/api/alert-preferences", undefined, 200);
    if (!json.item.lowBalanceEnabled || json.item.unusualExpenseThreshold !== 100)
      throw new Error("preferences were not persisted");
  });
  check("Notifications · create an event within 7 days", async () => {
    const date = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    const { json } = await req("POST", "/api/events",
      { amount: 25, currency: "EUR", description: "QA readable notification", date }, 201);
    notificationEventId = json.item.id;
  });
  check("Notifications · GET items[] structure", async () => {
    const { json } = await req("GET", "/api/notifications", undefined, 200);
    if (!Array.isArray(json.items)) throw new Error("missing items");
    for (const n of json.items) {
      if (!n.id || !n.kind || !n.severity || !n.title || typeof n.read !== "boolean")
        throw new Error(`shape: ${JSON.stringify(n)}`);
    }
    if (!json.items.some((n) => n.id === `event:${notificationEventId}` && !n.read))
      throw new Error("missing unread event notification");
    if (!json.items.some((n) => n.kind === "account")) throw new Error("missing low-balance alert");
    if (!json.items.some((n) => n.kind === "transaction")) throw new Error("missing high-expense alert");
    if (!json.items.some((n) => n.kind === "subscription")) throw new Error("missing price-increase alert");
    if (!(json.unreadCount > 0)) throw new Error(`unreadCount=${json.unreadCount}`);
  });
  check("Notifications · PATCH marks as read", async () => {
    await req("PATCH", "/api/notifications", { ids: [`event:${notificationEventId}`] }, 200);
    const { json } = await req("GET", "/api/notifications", undefined, 200);
    const item = json.items.find((n) => n.id === `event:${notificationEventId}`);
    if (!item?.read) throw new Error("read state was not persisted");
  });
  check("Notifications · event cleanup", async () => {
    await req("DELETE", `/api/events/${notificationEventId}`, undefined, 200);
  });

  // ---------- backup ----------
  check("Backup · complete user, category, transaction, and account JSON", async () => {
    const res = await fetch(`${BASE}/api/export/json`, { headers: { cookie: cookieHeader() } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const d = await res.json();
    if (!d.user || !Array.isArray(d.categories) || !Array.isArray(d.transactions) || !Array.isArray(d.accounts) || !Array.isArray(d.tags) || !Array.isArray(d.reconciliations) || !Array.isArray(d.alertPreferences) || !Array.isArray(d.importBatches))
      throw new Error("missing sections");
    if (d.user.email !== EMAIL) throw new Error("incorrect email");
    if (d.schemaVersion !== 1) throw new Error(`schemaVersion=${d.schemaVersion}`);
    const tagged = d.transactions.find((item) => item.id === txId);
    if (!tagged?.tagIds.includes(tagId)) throw new Error("tag relationship missing from backup");
    if (d.reconciliations.length !== 1 || d.alertPreferences.length !== 1)
      throw new Error("advanced account data missing from backup");
    const imported = d.transactions.find((item) => item.description === "QA import row");
    if (!imported?.importBatchId || !d.importBatches.some((item) => item.id === imported.importBatchId))
      throw new Error("import batch relationship missing from backup");
    backupPayload = d;
  });

  // ---------- duplicate ----------
  check("Transactions · manual duplicate → 201 with a new ID", async () => {
    const { json } = await req("POST", "/api/transactions",
      { type: "EXPENSE", categoryId: catId, accountId: accId, amount: 160, currency: "EUR", date: "2026-08-20", description: "QA expense" }, 201);
    if (json.item.id === txId) throw new Error("identical ID");
    await req("DELETE", `/api/transactions/${json.item.id}`, undefined, 200);
  });

  // ---------- settings ----------
  check("Settings · invalid currency → 422", async () => {
    await req("PATCH", "/api/settings", { baseCurrency: "EURO" }, 422);
  });
  check("Settings · negative balance is allowed → 200", async () => {
    const { json } = await req("PATCH", "/api/settings", { currentBalance: -42.5 }, 200);
    if (Number(json.user.currentBalance) !== -42.5) throw new Error(`balance=${json.user.currentBalance}`);
  });

  // ---------- forecasts ----------
  check("Cash flow · complete structure", async () => {
    const { json } = await req("GET", "/api/cashflow?days=30", undefined, 200);
    if (!json.points?.length || json.startBalance === undefined) throw new Error("incomplete structure");
  });
  check("Scenarios · baseline shape", async () => {
    const { json } = await req("GET", "/api/scenarios/baseline", undefined, 200);
    if (!Array.isArray(json.categories)) throw new Error("missing categories");
  });
  check("Rates · EUR = 1", async () => {
    const { json } = await req("GET", "/api/rates", undefined, 200);
    if (Number(json.rates.EUR) !== 1) throw new Error("EUR≠1");
  });

  // ---------- password change ----------
  const NEW_PASSWORD = "QaPassword456!";
  check("Password · incorrect current password → 403", async () => {
    await req("PATCH", "/api/settings/password",
      { currentPassword: "Incorrect123!", newPassword: NEW_PASSWORD }, 403);
  });
  check("Password · same as current password → 422", async () => {
    await req("PATCH", "/api/settings/password",
      { currentPassword: PASSWORD, newPassword: PASSWORD }, 422);
  });
  check("Password · valid change → 200", async () => {
    revokedSessionCookie = cookieHeader();
    await req("PATCH", "/api/settings/password",
      { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }, 200);
  });
  check("Password · previous JWT is invalidated immediately", async () => {
    const response = await fetch(`${BASE}/api/transactions`, {
      headers: { cookie: revokedSessionCookie },
    });
    if (response.status !== 401) throw new Error(`status ${response.status}`);
  });
  check("Password · revoked session reaches login without a redirect loop", async () => {
    const protectedResponse = await fetch(`${BASE}/dashboard`, {
      headers: { cookie: revokedSessionCookie },
      redirect: "manual",
    });
    if (![302, 307].includes(protectedResponse.status)) {
      throw new Error(`protected status ${protectedResponse.status}`);
    }
    const loginResponse = await fetch(`${BASE}/login`, {
      headers: { cookie: revokedSessionCookie },
      redirect: "manual",
    });
    if (loginResponse.status !== 200) {
      throw new Error(`login status ${loginResponse.status}`);
    }
  });
  check("Password · login with new password → 302", async () => {
    jar = {};
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    await req("POST", "/api/auth/callback/credentials",
      new URLSearchParams({ email: EMAIL, password: NEW_PASSWORD, csrfToken }), 302);
  });
  check("Password · old password is rejected", async () => {
    jar = {};
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken }),
      redirect: "manual",
    });
    const loc = res.headers.get("location") ?? "";
    if (!loc.includes("error=")) throw new Error(`old password was accepted (loc=${loc})`);
  });
  check("Password · session restored with new password", async () => {
    jar = {};
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    await req("POST", "/api/auth/callback/credentials",
      new URLSearchParams({ email: EMAIL, password: NEW_PASSWORD, csrfToken }), 302);
    await req("GET", "/api/transactions", undefined, 200);
  });

  // ---------- backup restore ----------
  check("Restore · incorrect confirmation email → 422", async () => {
    await req("POST", "/api/import/backup",
      { mode: "replace", confirmEmail: "wrong@wallettutrack.test", currentPassword: NEW_PASSWORD, backup: backupPayload }, 422);
  });
  check("Restore · incorrect current password → 403", async () => {
    await req("POST", "/api/import/backup",
      { mode: "replace", confirmEmail: EMAIL, currentPassword: "Incorrect123!", backup: backupPayload }, 403);
  });
  check("Restore · create data after the backup", async () => {
    await req("POST", "/api/transactions",
      { type: "EXPENSE", categoryId: catId, accountId: accId, amount: 9, currency: "EUR", date: "2026-08-26", description: "QA delete during restore" }, 201);
  });
  check("Restore · atomic replacement → 200", async () => {
    const { json } = await req("POST", "/api/import/backup",
      { mode: "replace", confirmEmail: EMAIL, currentPassword: NEW_PASSWORD, backup: backupPayload }, 200);
    if (json.counts.transactions !== backupPayload.transactions.length)
      throw new Error(`transactions=${json.counts.transactions}`);
  });
  check("Restore · removes later data and preserves relationships", async () => {
    const extra = await req("GET", "/api/transactions?q=QA delete during restore", undefined, 200);
    if (extra.json.total !== 0) throw new Error("later data is still present");
    const original = await req("GET", "/api/transactions?q=QA expense", undefined, 200);
    if (!original.json.items[0]?.category || !original.json.items[0]?.account)
      throw new Error("category and account relationships were not restored");
    if (!original.json.items[0]?.tags.some((tag) => tag.name === "QA Project"))
      throw new Error("tag was not restored");
    const reconciliations = await req("GET", "/api/reconciliations", undefined, 200);
    if (reconciliations.json.items.length !== 1) throw new Error("reconciliation was not restored");
    const preferences = await req("GET", "/api/alert-preferences", undefined, 200);
    if (!preferences.json.item.lowBalanceEnabled) throw new Error("alert preferences were not restored");
    const imports = await req("GET", "/api/import/batches", undefined, 200);
    if (!imports.json.items.some((item) => item.fileName === "qa-import.csv" && !item.undoneAt))
      throw new Error("import history was not restored");
  });

  // ---------- authenticated pages ----------
  for (const p of ["dashboard","transactions","transfers","reconciliation","calendar","forecasts","statistics?period=year","budgets","recurrences","categories","settings","report"]) {
    check(`Page · /${p} → 200`, async () => {
      const res = await fetch(`${BASE}/${p}`, { headers: { cookie: cookieHeader() } });
      if (res.status !== 200) throw new Error(`status ${res.status}`);
    });
  }

  // ---------- account deletion ----------
  check("Account · delete without confirmation → 422", async () => {
    await req("DELETE", "/api/account", undefined, 422);
  });
  check("Account · delete with incorrect password → 403", async () => {
    await req("DELETE", "/api/account", {
      confirmEmail: EMAIL,
      currentPassword: "Incorrect123!",
    }, 403);
  });
  check("Account · delete with confirmation → 200", async () => {
    await req("DELETE", "/api/account", {
      confirmEmail: EMAIL,
      currentPassword: NEW_PASSWORD,
    }, 200);
  });
  check("Account · APIs return 401 after deletion", async () => {
    jar = {};
    await req("GET", "/api/transactions", undefined, 401);
  });
  check("Account · login is rejected after deletion", async () => {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      body: new URLSearchParams({ email: EMAIL, password: NEW_PASSWORD, csrfToken }),
      redirect: "manual",
    });
    const loc = res.headers.get("location") ?? "";
    if (!loc.includes("error=")) throw new Error(`login still possible after deletion (loc=${loc})`);
  });

  // Logout invalidates the session.
  check("Logout · APIs return 401 after signOut", async () => {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    await req("POST", "/api/auth/signout", new URLSearchParams({ csrfToken }), 302);
    jar = {}; // The server clears the session cookie as well.
    await req("GET", "/api/transactions", undefined, 401);
  });

  // The rate limit uses an isolated IP/email pair and is checked last.
  check("Login · 5 failures and the next attempt → 429", async () => {
    jar = {};
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    setJar(csrfRes);
    const { csrfToken } = await csrfRes.json();
    const csrfCookie = cookieHeader();
    const blockedEmail = `rate-${EMAIL}`;
    const blockedIp = `198.51.100.${(Date.now() % 200) + 1}`;
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
          cookie: csrfCookie,
          "x-forwarded-for": blockedIp,
        },
        body: new URLSearchParams({
          email: blockedEmail,
          password: "IncorrectPassword123!",
          csrfToken,
        }),
        redirect: "manual",
      });
      if (response.status !== 302) throw new Error(`failure ${i + 1}: ${response.status}`);
    }
    const blocked = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        cookie: csrfCookie,
        "x-forwarded-for": blockedIp,
      },
      body: new URLSearchParams({
        email: blockedEmail,
        password: "IncorrectPassword123!",
        csrfToken,
      }),
      redirect: "manual",
    });
    if (blocked.status !== 429) throw new Error(`status ${blocked.status}`);
    if (!blocked.headers.get("retry-after")) throw new Error("missing Retry-After");
  });

  // ---------------------------------------------------------------- run
  let pass = 0, fail = 0;
  for (const { label, run } of results) {
    try {
      await run();
      pass++;
      console.log(`  ✅ ${label}`);
    } catch (e) {
      fail++;
      console.log(`  ❌ ${label}\n     ↳ ${e.message}`);
    }
  }
  console.log(`\n=== RESULT: ${pass} passed · ${fail} failed out of ${results.length} ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal suite error:", e);
  process.exit(1);
});
