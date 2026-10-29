/**
 * Admin-configurable pricing settings for Captain Issa Tours.
 * Edit defaults here or override via admin page / localStorage.
 * Do not invent missing rates in UI or calculator code.
 */
(function (global, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(global);
  } else {
    global.CaptainIssaPricingConfig = factory(global);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (global) {
  "use strict";

  const DEFAULT_CONFIG = Object.freeze({
    version: 1,

    /** Primary currency for customer-facing totals. */
    displayCurrency: "USD",

    boat: Object.freeze({
      maxGuests: 7,
      includedHours: 2,
      extraHourRateTsh: null,
      extraHourRateUsd: null,
      durationOptionsHours: Object.freeze([2, 3, 4, 5, 6]),
    }),

    /** Boat packages without food. Meals are always extra. */
    tours: Object.freeze({
      prison: Object.freeze({
        id: "prison",
        label: "Prison Island",
        hours: 2,
        priceTsh: 50000,
        priceUsd: 20,
        includesMeal: false,
      }),
      nakupenda: Object.freeze({
        id: "nakupenda",
        label: "Nakupenda Beach",
        hours: 2,
        priceTsh: 50000,
        priceUsd: 20,
        includesMeal: false,
      }),
      combo: Object.freeze({
        id: "combo",
        label: "Prison Island + Nakupenda",
        hours: 2,
        priceTsh: 100000,
        /** Same 50,000 TSh = $20 pairing as the single-island tours. */
        priceUsd: 40,
        includesMeal: false,
      }),
    }),

    tickets: Object.freeze({
      prisonIsland: Object.freeze({
        id: "prison-island",
        label: "Prison Island / tortoise conservation",
        foreignUsd: 12,
        localTsh: 3000,
        requiresLocalId: true,
      }),
      marineConservation: Object.freeze({
        id: "marine-conservation",
        label: "Marine Conservation Area",
        foreignUsd: 10,
        localTsh: 5000,
        requiresLocalId: true,
      }),
    }),

    meals: Object.freeze({
      defaultServes: 2,
      options: Object.freeze([
        Object.freeze({
          id: "seafood",
          label: "Seafood package",
          description: "Fish, prawns, squid, chips and drinks",
          priceTsh: 70000,
          priceUsd: null,
          serves: 2,
          enabled: true,
        }),
        Object.freeze({
          id: "chicken-rice",
          label: "Chicken and rice package",
          description: "Chicken and rice for the table",
          priceTsh: 70000,
          priceUsd: null,
          serves: 2,
          enabled: true,
        }),
      ]),
    }),

    /**
     * usdToTsh: admin-configured. Used to show TSh lines as USD (and reverse).
     * Never invent a permanent hardcoded rate in calculator UI.
     */
    exchange: Object.freeze({
      usdToTsh: null,
      label: "Admin-configured USD to TSh rate",
    }),

    copy: Object.freeze({
      boatIncludedNote: "Included — round-trip boat for up to 7 guests (standard 2 hours)",
      extraHourUnsetNote: "Extra-hour rate not configured by admin yet",
      localIdNote: "Tanzanian visitors must present valid identification where applicable",
    }),
  });

  const STORAGE_KEY = "captainIssaPricingConfig.v2";

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function deepMerge(base, override) {
    if (!isPlainObject(override)) return base;
    const out = { ...base };
    Object.keys(override).forEach((key) => {
      const next = override[key];
      const prev = base[key];
      if (isPlainObject(prev) && isPlainObject(next)) {
        out[key] = deepMerge(prev, next);
      } else if (Array.isArray(next)) {
        out[key] = next.slice();
      } else {
        out[key] = next;
      }
    });
    return out;
  }

  function getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  function loadOverrides() {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveOverrides(partial) {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage is not available");
    }
    const merged = deepMerge(loadOverrides() || {}, partial || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function clearOverrides() {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }

  function getConfig(runtimeOverride) {
    let config = getDefaultConfig();
    const stored = loadOverrides();
    if (stored) config = deepMerge(config, stored);
    if (runtimeOverride) config = deepMerge(config, runtimeOverride);
    if (global && global.__PRICING_CONFIG_OVERRIDE__) {
      config = deepMerge(config, global.__PRICING_CONFIG_OVERRIDE__);
    }
    return config;
  }

  return {
    STORAGE_KEY,
    getDefaultConfig,
    getConfig,
    loadOverrides,
    saveOverrides,
    clearOverrides,
    deepMerge,
  };
});
