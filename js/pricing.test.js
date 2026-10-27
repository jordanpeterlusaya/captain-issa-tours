/**
 * Basic tests for Captain Issa tour pricing rules.
 * Run: node js/pricing.test.js
 */
const assert = require("assert");
const PricingConfig = require("./pricing-config");
const Pricing = require("./pricing");

function cfg(overrides) {
  return PricingConfig.deepMerge(PricingConfig.getDefaultConfig(), overrides || {});
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("boat fare is flat TSh 60,000 for up to 7 guests", () => {
  const quote = Pricing.calculateQuote(
    { guests: 7, durationHours: 2, foreignGuests: 7, localGuests: 0, attractions: [] },
    cfg()
  );
  assert.equal(quote.ok, true);
  const boat = quote.lines.find((l) => l.id === "boat-fare");
  assert.equal(boat.amount.amount, 60000);
  assert.equal(boat.amount.currency, "TSH");
  assert.equal(boat.category, "included");
  assert.equal(quote.totals.tsh, 60000);
});

test("rejects more than 7 guests", () => {
  const quote = Pricing.calculateQuote(
    { guests: 8, durationHours: 2, foreignGuests: 8, localGuests: 0 },
    cfg()
  );
  assert.equal(quote.ok, false);
  assert.ok(quote.errors.some((e) => /7/.test(e)));
});

test("extra hours pending when admin rate is not configured", () => {
  const quote = Pricing.calculateQuote(
    { guests: 2, durationHours: 4, foreignGuests: 2, localGuests: 0 },
    cfg({ boat: { extraHourRateTsh: null } })
  );
  assert.equal(quote.ok, true);
  const extra = quote.lines.find((l) => l.id === "boat-extra-hours");
  assert.equal(extra.pending, true);
  assert.equal(extra.quantity, 2);
  assert.ok(quote.warnings.length > 0);
  assert.equal(quote.totals.tsh, 60000);
});

test("extra hours charge when admin configures rate", () => {
  const quote = Pricing.calculateQuote(
    { guests: 2, durationHours: 4, foreignGuests: 2, localGuests: 0 },
    cfg({ boat: { extraHourRateTsh: 25000 } })
  );
  assert.equal(quote.ok, true);
  const extra = quote.lines.find((l) => l.id === "boat-extra-hours");
  assert.equal(extra.amount.amount, 50000);
  assert.equal(quote.totals.tsh, 110000);
});

test("does not charge Prison Island when only marine is selected", () => {
  const quote = Pricing.calculateQuote(
    {
      guests: 2,
      durationHours: 2,
      foreignGuests: 2,
      localGuests: 0,
      attractions: ["marine-conservation"],
    },
    cfg()
  );
  assert.equal(quote.ok, true);
  assert.ok(!quote.lines.some((l) => String(l.id).includes("prison-island")));
  const marine = quote.lines.find((l) => l.id === "ticket-marine-conservation-foreign");
  assert.equal(marine.amount.amount, 20);
  assert.equal(marine.amount.currency, "USD");
  assert.equal(quote.totals.usd, 20);
});

test("charges each selected attraction without duplicate lines", () => {
  const quote = Pricing.calculateQuote(
    {
      guests: 1,
      durationHours: 2,
      foreignGuests: 1,
      localGuests: 0,
      attractions: ["prison-island", "prison-island", "marine-conservation"],
    },
    cfg()
  );
  assert.equal(quote.ok, true);
  const prisonLines = quote.lines.filter((l) => l.attractionId === "prison-island");
  const marineLines = quote.lines.filter((l) => l.attractionId === "marine-conservation");
  assert.equal(prisonLines.length, 1);
  assert.equal(marineLines.length, 1);
  assert.equal(quote.totals.usd, 22);
});

test("applies Tanzanian local ticket rates and ID note", () => {
  const quote = Pricing.calculateQuote(
    {
      guests: 3,
      durationHours: 2,
      foreignGuests: 0,
      localGuests: 3,
      attractions: ["prison-island", "marine-conservation"],
    },
    cfg()
  );
  assert.equal(quote.ok, true);
  assert.equal(
    quote.lines.find((l) => l.id === "ticket-prison-island-local").amount.amount,
    9000
  );
  assert.equal(
    quote.lines.find((l) => l.id === "ticket-marine-conservation-local").amount.amount,
    15000
  );
  assert.ok(quote.notes.some((n) => /identification/i.test(n)));
  assert.equal(quote.totals.tsh, 60000 + 9000 + 15000);
});

test("meal packages use ceil serving rule for groups larger than 2", () => {
  assert.equal(Pricing.packageCount(2, 2), 1);
  assert.equal(Pricing.packageCount(3, 2), 2);
  assert.equal(Pricing.packageCount(5, 2), 3);

  const quote = Pricing.calculateQuote(
    {
      guests: 5,
      durationHours: 2,
      foreignGuests: 5,
      localGuests: 0,
      attractions: [],
      mealId: "seafood",
    },
    cfg()
  );
  assert.equal(quote.ok, true);
  const meal = quote.lines.find((l) => l.id === "meal-seafood");
  assert.equal(meal.quantity, 3);
  assert.equal(meal.amount.amount, 210000);
});

test("mixed nationality visitor counts must equal guests", () => {
  const quote = Pricing.calculateQuote(
    {
      guests: 4,
      durationHours: 2,
      foreignGuests: 2,
      localGuests: 1,
      attractions: ["prison-island"],
    },
    cfg()
  );
  assert.equal(quote.ok, false);
  assert.ok(quote.errors.some((e) => /equal total guests/i.test(e)));
});

test("does not invent exchange rate; grand total TSh only when configured", () => {
  const withoutRate = Pricing.calculateQuote(
    {
      guests: 1,
      durationHours: 2,
      foreignGuests: 1,
      localGuests: 0,
      attractions: ["prison-island"],
    },
    cfg({ exchange: { usdToTsh: null } })
  );
  assert.equal(withoutRate.totals.grandTotalTsh, null);
  assert.equal(withoutRate.totals.usd, 12);

  const withRate = Pricing.calculateQuote(
    {
      guests: 1,
      durationHours: 2,
      foreignGuests: 1,
      localGuests: 0,
      attractions: ["prison-island"],
    },
    cfg({ exchange: { usdToTsh: 2500 } })
  );
  assert.equal(withRate.totals.usdAsTsh, 30000);
  assert.equal(withRate.totals.grandTotalTsh, 60000 + 30000);
});

console.log("\nAll pricing tests passed.");
