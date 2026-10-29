/**
 * Pure tour pricing calculator — no DOM, no invented rates.
 * Pass an admin config from pricing-config.js.
 */
(function (global, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    global.CaptainSalumPricing = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
  }

  function money(amount, currency) {
    return { amount: Number(amount) || 0, currency };
  }

  /** Prefer explicit USD; else TSh. qty multiplies the chosen unit. */
  function pricedAmount(usdUnit, tshUnit, qty) {
    const q = Math.max(0, toInt(qty, 1));
    if (usdUnit != null && usdUnit !== "" && Number.isFinite(Number(usdUnit))) {
      const unit = Number(usdUnit);
      return { unit: money(unit, "USD"), amount: money(unit * q, "USD") };
    }
    if (tshUnit != null && tshUnit !== "" && Number.isFinite(Number(tshUnit))) {
      const unit = Number(tshUnit);
      return { unit: money(unit, "TSH"), amount: money(unit * q, "TSH") };
    }
    return { unit: null, amount: null, pending: true };
  }

  function formatMoney(amount, currency) {
    const n = Number(amount) || 0;
    if (currency === "USD") {
      return `$${n.toLocaleString("en-US", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `TSh ${Math.round(n).toLocaleString("en-US")}`;
  }

  /** Convert a money object to USD for display when rate is configured. */
  function toDisplayUsd(amountObj, usdToTsh) {
    if (!amountObj) return null;
    if (amountObj.currency === "USD") return amountObj.amount;
    const rate = Number(usdToTsh);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return amountObj.amount / rate;
  }

  function displayGrandTotal(totals, config) {
    const preferUsd = (config && config.displayCurrency) === "USD";
    const rate = totals.exchangeRateUsdToTsh;

    if (preferUsd) {
      if (rate != null) {
        const usdFromTsh = totals.tsh / rate;
        const totalUsd = totals.usd + usdFromTsh;
        return {
          label: formatMoney(totalUsd, "USD"),
          pending: totals.hasPending,
          secondary:
            totals.tsh > 0
              ? `incl. ${formatMoney(totals.tsh, "TSH")} converted @ ${rate}`
              : null,
        };
      }
      if (totals.tsh > 0 && totals.usd >= 0) {
        return {
          label:
            totals.usd > 0
              ? `${formatMoney(totals.usd, "USD")} + ${formatMoney(totals.tsh, "TSH")}`
              : formatMoney(totals.tsh, "TSH"),
          pending: true,
          secondary: "Set USD rate or USD prices in admin for a single $ total",
        };
      }
      return {
        label: formatMoney(totals.usd, "USD"),
        pending: totals.hasPending,
        secondary: null,
      };
    }

    if (totals.grandTotalTsh != null) {
      return {
        label: formatMoney(totals.grandTotalTsh, "TSH"),
        pending: totals.hasPending,
        secondary: formatMoney(totals.usd, "USD"),
      };
    }
    return {
      label:
        totals.usd > 0
          ? `${formatMoney(totals.tsh, "TSH")} + ${formatMoney(totals.usd, "USD")}`
          : formatMoney(totals.tsh, "TSH"),
      pending: totals.hasPending,
      secondary: null,
    };
  }

  function ticketDefs(config) {
    const t = config.tickets || {};
    return [t.prisonIsland, t.marineConservation].filter(Boolean);
  }

  function mealOption(config, mealId) {
    const options = (config.meals && config.meals.options) || [];
    return options.find((m) => m.id === mealId && m.enabled !== false) || null;
  }

  function packageCount(guests, serves) {
    const per = Math.max(1, toInt(serves, 2));
    const g = Math.max(0, toInt(guests, 0));
    if (g === 0) return 0;
    return Math.ceil(g / per);
  }

  function tourDef(config, tourId) {
    const tours = (config && config.tours) || {};
    return tours[tourId] || null;
  }

  /**
   * @param {object} input
   * @param {string} input.tourType - prison | nakupenda | combo
   * @param {number} input.guests
   * @param {number} input.durationHours
   * @param {number} [input.foreignGuests]
   * @param {number} [input.localGuests]
   * @param {string[]} [input.attractions] - ticket ids selected
   * @param {string|null} [input.mealId]
   * @param {object} config
   */
  function calculateQuote(input, config) {
    const boat = config.boat || {};
    const maxGuests = toInt(boat.maxGuests, 7);
    const tour = tourDef(config, input && input.tourType);
    const includedHours = toInt(tour && tour.hours, boat.includedHours || 2);
    const guests = toInt(input && input.guests, 0);
    const durationHours = toInt(input && input.durationHours, includedHours);

    const errors = [];
    const warnings = [];
    const lines = [];
    const notes = [];

    if (!tour) errors.push("Select a tour: Prison Island, Nakupenda, or both.");
    if (guests < 1) errors.push("Select at least 1 guest.");
    if (guests > maxGuests) {
      errors.push(`Boat capacity is limited to ${maxGuests} guests.`);
    }
    if (durationHours < includedHours) {
      errors.push(`Duration must be at least ${includedHours} hours.`);
    }

    let foreignGuests = toInt(input && input.foreignGuests, 0);
    let localGuests = toInt(input && input.localGuests, 0);
    if (
      (input.foreignGuests == null || input.foreignGuests === "") &&
      (input.localGuests == null || input.localGuests === "")
    ) {
      // Default: treat all guests as foreign unless nationality split is provided.
      foreignGuests = guests;
      localGuests = 0;
    }
    if (foreignGuests < 0 || localGuests < 0) {
      errors.push("Visitor counts cannot be negative.");
    }
    if (foreignGuests + localGuests !== guests && guests > 0) {
      errors.push("Foreign + Tanzanian visitors must equal total guests.");
    }

    const attractions = Array.isArray(input && input.attractions)
      ? Array.from(new Set(input.attractions.filter(Boolean)))
      : [];

    const defs = ticketDefs(config);
    const defById = Object.fromEntries(defs.map((d) => [d.id, d]));
    attractions.forEach((id) => {
      if (!defById[id]) errors.push(`Unknown attraction: ${id}`);
    });

    if (localGuests > 0 && attractions.some((id) => defById[id] && defById[id].requiresLocalId)) {
      notes.push(config.copy?.localIdNote || "Tanzanian visitors must present valid identification.");
    }

    if (errors.length) {
      return {
        ok: false,
        errors,
        warnings,
        notes,
        lines: [],
        totals: emptyTotals(),
      };
    }

    const boatPriced = pricedAmount(tour.priceUsd, tour.priceTsh, 1);
    lines.push({
      id: "boat-fare",
      category: "included",
      label: `${tour.label} boat (no food)`,
      detail: `Up to ${maxGuests} guests · ${includedHours} hours · photos & swim`,
      quantity: 1,
      ...boatPriced,
    });

    const extraHours = Math.max(0, durationHours - includedHours);
    if (extraHours > 0) {
      const rateUsd = boat.extraHourRateUsd;
      const rateTsh = boat.extraHourRateTsh;
      const hasRate =
        (rateUsd != null && rateUsd !== "" && Number.isFinite(Number(rateUsd))) ||
        (rateTsh != null && rateTsh !== "" && Number.isFinite(Number(rateTsh)));
      if (!hasRate) {
        warnings.push(config.copy?.extraHourUnsetNote || "Extra-hour rate not configured by admin yet");
        lines.push({
          id: "boat-extra-hours",
          category: "optional",
          label: "Additional hours",
          detail: `${extraHours} hour(s) beyond ${includedHours}h — rate not configured`,
          quantity: extraHours,
          unit: null,
          amount: null,
          pending: true,
        });
      } else {
        const priced = pricedAmount(rateUsd, rateTsh, extraHours);
        lines.push({
          id: "boat-extra-hours",
          category: "optional",
          label: "Additional hours",
          detail: `${extraHours} × ${
            priced.unit ? formatMoney(priced.unit.amount, priced.unit.currency) : "—"
          }`,
          quantity: extraHours,
          ...priced,
        });
      }
    }

    // --- Entrance tickets (optional extras, only selected attractions) ---
    attractions.forEach((id) => {
      const def = defById[id];
      if (!def) return;

      if (foreignGuests > 0) {
        const unitUsd = Number(def.foreignUsd) || 0;
        lines.push({
          id: `ticket-${id}-foreign`,
          category: "optional",
          label: `${def.label} — foreign visitors`,
          detail: `${foreignGuests} × ${formatMoney(unitUsd, "USD")}`,
          quantity: foreignGuests,
          unit: money(unitUsd, "USD"),
          amount: money(foreignGuests * unitUsd, "USD"),
          attractionId: id,
        });
      }

      if (localGuests > 0) {
        if (def.localTsh == null || def.localTsh === "" || !Number.isFinite(Number(def.localTsh))) {
          warnings.push(`Local ticket rate for ${def.label} is not configured by admin.`);
          lines.push({
            id: `ticket-${id}-local`,
            category: "optional",
            label: `${def.label} — Tanzanian visitors`,
            detail: `${localGuests} visitor(s) — local rate not configured`,
            quantity: localGuests,
            unit: null,
            amount: null,
            pending: true,
            attractionId: id,
          });
        } else {
          const unitTsh = Number(def.localTsh);
          lines.push({
            id: `ticket-${id}-local`,
            category: "optional",
            label: `${def.label} — Tanzanian visitors`,
            detail: `${localGuests} × ${formatMoney(unitTsh, "TSH")}`,
            quantity: localGuests,
            unit: money(unitTsh, "TSH"),
            amount: money(localGuests * unitTsh, "TSH"),
            attractionId: id,
          });
        }
      }
    });

    // --- Meals (optional) ---
    const mealId = input && input.mealId ? String(input.mealId) : "";
    if (mealId) {
      const meal = mealOption(config, mealId);
      if (!meal) {
        errors.push("Selected meal option is not available.");
      } else {
        const serves = toInt(meal.serves, config.meals?.defaultServes || 2);
        const packs = packageCount(guests, serves);
        const priced = pricedAmount(meal.priceUsd, meal.priceTsh, packs);
        lines.push({
          id: `meal-${meal.id}`,
          category: "optional",
          label: meal.label,
          detail: `${packs} package(s) × serves ${serves} · ${meal.description || ""}`.trim(),
          quantity: packs,
          ...priced,
        });
      }
    }

    if (errors.length) {
      return {
        ok: false,
        errors,
        warnings,
        notes,
        lines: [],
        totals: emptyTotals(),
      };
    }

    const totals = summarize(lines, config.exchange?.usdToTsh ?? null);

    return {
      ok: true,
      errors: [],
      warnings,
      notes,
      lines,
      totals,
      meta: {
        guests,
        foreignGuests,
        localGuests,
        durationHours,
        includedHours,
        extraHours,
        maxGuests,
        tourType: tour.id,
        attractions: attractions.slice(),
        mealId: mealId || null,
      },
    };
  }

  function emptyTotals() {
    return {
      tsh: 0,
      usd: 0,
      usdAsTsh: null,
      grandTotalTsh: null,
      hasPending: false,
      exchangeRateUsdToTsh: null,
    };
  }

  function summarize(lines, usdToTsh) {
    let tsh = 0;
    let usd = 0;
    let hasPending = false;

    lines.forEach((line) => {
      if (line.pending || !line.amount) {
        hasPending = true;
        return;
      }
      if (line.amount.currency === "TSH") tsh += line.amount.amount;
      if (line.amount.currency === "USD") usd += line.amount.amount;
    });

    const rate =
      usdToTsh == null || usdToTsh === "" || !Number.isFinite(Number(usdToTsh))
        ? null
        : Number(usdToTsh);

    const usdAsTsh = rate == null ? null : usd * rate;
    const grandTotalTsh = rate == null ? null : tsh + usdAsTsh;

    return {
      tsh,
      usd,
      usdAsTsh,
      grandTotalTsh,
      hasPending,
      exchangeRateUsdToTsh: rate,
    };
  }

  function quoteToPlainText(quote) {
    if (!quote || !quote.ok) {
      return (quote && quote.errors ? quote.errors : ["Unable to calculate quote."]).join("\n");
    }
    const rows = quote.lines.map((line) => {
      const amount =
        line.pending || !line.amount
          ? "Pending (admin rate)"
          : formatMoney(line.amount.amount, line.amount.currency);
      return `- ${line.label}: ${amount}${line.detail ? ` (${line.detail})` : ""}`;
    });
    rows.push("");
    rows.push(`Subtotal TSh: ${formatMoney(quote.totals.tsh, "TSH")}`);
    rows.push(`Subtotal USD: ${formatMoney(quote.totals.usd, "USD")}`);
    if (quote.totals.exchangeRateUsdToTsh != null) {
      rows.push(
        `USD in TSh @ ${quote.totals.exchangeRateUsdToTsh}: ${formatMoney(
          quote.totals.usdAsTsh,
          "TSH"
        )}`
      );
      rows.push(`Grand total: ${formatMoney(quote.totals.grandTotalTsh, "TSH")}`);
    } else {
      rows.push("Grand total in TSh: exchange rate not configured by admin");
    }
    if (quote.warnings.length) {
      rows.push("");
      rows.push("Notes:");
      quote.warnings.forEach((w) => rows.push(`- ${w}`));
    }
    quote.notes.forEach((n) => rows.push(`- ${n}`));
    return rows.join("\n");
  }

  return {
    calculateQuote,
    formatMoney,
    packageCount,
    ticketDefs,
    tourDef,
    mealOption,
    quoteToPlainText,
    pricedAmount,
    toDisplayUsd,
    displayGrandTotal,
  };
});
