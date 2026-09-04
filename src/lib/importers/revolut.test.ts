import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVOLUT_OPTIONS,
  guessCategory,
  isRevolutCsv,
  parseRevolutCsv,
} from "@/lib/importers/revolut";

const IT_STATEMENT = `Conto corrente Riepiloghi
Data,Descrizione,Categoria,"Denaro in entrata/uscita",Saldo,Spese,Entrate,Valuta
"1 gen 2026",Trip.com,Esercente,"-35,01€","289,64€","35,01€","0,00€",EUR
"2 gen 2026",Esselunga Alimentari,Spesa,"-120,50€","169,14€","120,50€","0,00€",EUR
"3 gen 2026",Prelievo da Pocket,Ricarica,"+50,00€","219,14€","0,00€","50,00€",EUR
"3 gen 2026",Spiccioli RevPoints,Ricarica,"+0,42€","219,56€","0,00€","0,42€",EUR
"4 gen 2026",Stipendio gennaio,Entrate,"+1800,00€","2019,56€","0,00€","1800,00€",EUR
Totale,,,,,"155,51€","1850,42€",

`;

const EN_EXPORT = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,Balance,State
CARD_PAYMENT,Visa,2026-01-02 10:00,2026-01-02 10:01,Netflix,-13.49,,EUR,120.55,COMPLETED
EXCHANGE,Card,2026-01-03 09:00,2026-01-03 09:00,Exchange USD to EUR,-25.00,,USD,10.00,COMPLETED
TOPUP,Card,2026-01-03 10:00,2026-01-03 10:00,Top up,100.00,,EUR,110.55,COMPLETED
CARD_PAYMENT,Visa,2026-01-04 11:00,,Uber,-20.00,,EUR,,PENDING
`;

describe("isRevolutCsv", () => {
  it("detects the Italian statement", () => {
    expect(isRevolutCsv(IT_STATEMENT)).toBe(true);
  });

  it("detects the English export", () => {
    expect(isRevolutCsv(EN_EXPORT)).toBe(true);
  });

  it("rejects a generic CSV", () => {
    expect(isRevolutCsv("data,importo\n2026-01-01,10\n")).toBe(false);
  });
});

describe("parseRevolutCsv (Italian variant)", () => {
  const res = parseRevolutCsv(IT_STATEMENT, DEFAULT_REVOLUT_OPTIONS);

  it("skips internal movements (Pocket, RevPoints)", () => {
    expect(res.stats.internalSkipped).toBe(1);
    expect(res.stats.revPointsSkipped).toBe(1);
  });

  it("extracts real transactions", () => {
    expect(res.rows).toHaveLength(3);
    const desc = res.rows.map((r) => r.description);
    expect(desc).toContain("Trip.com");
    expect(desc).toContain("Esselunga Alimentari");
    expect(desc).toContain("Stipendio gennaio");
  });

  it("produces correct types and amounts", () => {
    const trip = res.rows.find((r) => r.description === "Trip.com")!;
    expect(trip.type).toBe("EXPENSE");
    expect(trip.amount).toBe(35.01);
    expect(trip.currency).toBe("EUR");
    expect(trip.date.toISOString().slice(0, 10)).toBe("2026-01-01");

    const stip = res.rows.find((r) => r.description === "Stipendio gennaio")!;
    expect(stip.type).toBe("INCOME");
    expect(stip.amount).toBe(1800);
  });

  it("guesses categories", () => {
    const trip = res.rows.find((r) => r.description === "Trip.com")!;
    expect(trip.categoryName).toBe("Transport and travel");
    const ess = res.rows.find((r) => r.description === "Esselunga Alimentari")!;
    expect(ess.categoryName).toBe("Groceries");
  });

  it("uses deterministic and unique externalId values", () => {
    const ids = res.rows.map((r) => r.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    const again = parseRevolutCsv(IT_STATEMENT, DEFAULT_REVOLUT_OPTIONS);
    expect(again.rows.map((r) => r.externalId)).toEqual(ids);
  });
});

describe("parseRevolutCsv (English variant)", () => {
  const res = parseRevolutCsv(EN_EXPORT, DEFAULT_REVOLUT_OPTIONS);

  it("skips exchange, top-up, and pending rows", () => {
    expect(res.stats.exchangeSkipped).toBe(1);
    expect(res.stats.topupSkipped).toBe(1);
    expect(res.stats.pendingSkipped).toBe(1);
  });

  it("keeps the completed transaction", () => {
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].description).toBe("Netflix");
    expect(res.rows[0].type).toBe("EXPENSE");
    expect(res.rows[0].amount).toBe(13.49);
  });
});

describe("guessCategory", () => {
  it("maps known descriptions", () => {
    expect(guessCategory("SALVATORE PIZZERIA")).toBe("Dining");
    expect(guessCategory("NETFLIX.COM")).toBe("Subscriptions");
    expect(guessCategory("FARMACIA CENTRALE")).toBe("Health");
    expect(guessCategory("LIDL SPESA")).toBe("Groceries");
  });

  it("returns null when unrecognized", () => {
    expect(guessCategory("XXX unknown")).toBeNull();
  });
});
