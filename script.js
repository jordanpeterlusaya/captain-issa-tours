(() => {
  const WHATSAPP_NUMBER = "255774726129";

  const header = document.querySelector(".site-header");
  const nav = document.getElementById("site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const form = document.getElementById("booking-form");
  const statusEl = document.getElementById("form-status");
  const dateInput = document.getElementById("date");
  const yearEl = document.getElementById("year");
  const footerWa = document.getElementById("footer-whatsapp");
  const heroVideo = document.querySelector("[data-hero-video]");

  const PricingConfig = window.CaptainIssaPricingConfig;
  const Pricing = window.CaptainIssaPricing;

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (footerWa) footerWa.href = `https://wa.me/${WHATSAPP_NUMBER}`;

  // Accordions / View more
  document.querySelectorAll("[data-accordion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-accordion");
      const panel = document.getElementById(`acc-${id}`);
      if (!panel) return;
      const open = panel.hasAttribute("hidden");
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "View less" : "View more";
    });
  });

  // Hero video
  if (heroVideo) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pickSrc = () =>
      window.matchMedia("(max-width: 800px)").matches
        ? "assets/videos/hero-mobile.mp4"
        : "assets/videos/hero.mp4";
    const heroSection = heroVideo.closest(".hero");
    const tryPlay = () => {
      const p = heroVideo.play();
      if (p && p.then) {
        p.then(() => heroSection && heroSection.classList.add("is-playing")).catch(() => {});
      }
    };
    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      heroVideo.muted = true;
      heroVideo.defaultMuted = true;
      heroVideo.playsInline = true;
      heroVideo.src = pickSrc();
      heroVideo.load();
      tryPlay();
      heroVideo.addEventListener("playing", () => heroSection && heroSection.classList.add("is-playing"));
      heroVideo.addEventListener("canplay", tryPlay, { once: true });
      ["touchstart", "click"].forEach((evt) => {
        document.addEventListener(evt, tryPlay, { once: true, passive: true });
      });
    }
  }

  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().slice(0, 10);
  }

  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 16);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if (!form || !Pricing || !PricingConfig) return;

  const tourSelect = form.elements.tourType;
  const guestsInput = form.elements.guests;
  const durationSelect = form.elements.durationHours;
  const nationalityMode = form.elements.nationalityMode;
  const foreignInput = form.elements.foreignGuests;
  const localInput = form.elements.localGuests;
  const mixedRow = document.getElementById("mixed-guests-row");
  const localIdNote = document.getElementById("local-id-note");
  const mealSelect = form.elements.mealId;
  const quoteLinesEl = document.getElementById("quote-lines");
  const quoteTotalsEl = document.getElementById("quote-totals");
  const quoteWarningsEl = document.getElementById("quote-warnings");
  const quoteGrandEl = document.getElementById("quote-grand");

  let latestQuote = null;

  function config() {
    return PricingConfig.getConfig();
  }

  function populateDurationAndMeals() {
    const c = config();
    const hours = c.boat.durationOptionsHours || [2];
    const included = c.boat.includedHours || 2;
    durationSelect.innerHTML = hours
      .map((h) => `<option value="${h}">${h === included ? `${h}h standard` : `${h}h`}</option>`)
      .join("");
    durationSelect.value = String(included);
    guestsInput.max = String(c.boat.maxGuests || 7);

    const meals = (c.meals.options || []).filter((m) => m.enabled !== false);
    mealSelect.innerHTML =
      `<option value="">No meal</option>` +
      meals
        .map((m) => {
          let priceLabel = "";
          if (m.priceUsd != null && Number.isFinite(Number(m.priceUsd))) {
            priceLabel = Pricing.formatMoney(m.priceUsd, "USD");
          } else if (c.exchange.usdToTsh) {
            priceLabel = Pricing.formatMoney(Number(m.priceTsh) / Number(c.exchange.usdToTsh), "USD");
          } else {
            priceLabel = Pricing.formatMoney(m.priceTsh, "TSH");
          }
          return `<option value="${m.id}">${m.label} · ${priceLabel}</option>`;
        })
        .join("");
  }

  function visitorSplit() {
    const guests = Number(guestsInput.value) || 0;
    const mode = nationalityMode.value;
    if (mode === "foreign") return { foreignGuests: guests, localGuests: 0 };
    if (mode === "local") return { foreignGuests: 0, localGuests: guests };
    return {
      foreignGuests: Number(foreignInput.value) || 0,
      localGuests: Number(localInput.value) || 0,
    };
  }

  function selectedAttractions() {
    return Array.from(form.querySelectorAll('input[name="attraction"]:checked')).map((el) => el.value);
  }

  function readSelection() {
    const split = visitorSplit();
    return {
      tourType: tourSelect ? tourSelect.value : "prison",
      guests: Number(guestsInput.value) || 0,
      durationHours: Number(durationSelect.value) || 2,
      foreignGuests: split.foreignGuests,
      localGuests: split.localGuests,
      attractions: selectedAttractions(),
      mealId: mealSelect.value || null,
    };
  }

  function syncNationalityUi() {
    const mixed = nationalityMode.value === "mixed";
    if (mixedRow) {
      mixedRow.hidden = !mixed;
      mixedRow.classList.toggle("is-hidden", !mixed);
    }
    const split = visitorSplit();
    const showId = split.localGuests > 0 && selectedAttractions().length > 0;
    if (localIdNote) {
      localIdNote.hidden = !showId;
      localIdNote.classList.toggle("is-hidden", !showId);
    }
  }

  function lineAmountLabel(line, c) {
    if (line.pending || !line.amount) return "Pending";
    if (line.amount.currency === "USD") return Pricing.formatMoney(line.amount.amount, "USD");
    const asUsd = Pricing.toDisplayUsd(line.amount, c.exchange?.usdToTsh);
    if (asUsd != null) return Pricing.formatMoney(asUsd, "USD");
    return Pricing.formatMoney(line.amount.amount, line.amount.currency);
  }

  function renderQuote(quote) {
    latestQuote = quote;
    const c = config();

    if (!quote.ok) {
      if (quoteGrandEl) quoteGrandEl.textContent = "—";
      if (quoteLinesEl) {
        quoteLinesEl.innerHTML = `<li class="quote-line quote-line--error">${(quote.errors || []).join("<br>")}</li>`;
      }
      if (quoteTotalsEl) quoteTotalsEl.innerHTML = "";
      if (quoteWarningsEl) quoteWarningsEl.textContent = "";
      return;
    }

    const grand = Pricing.displayGrandTotal(quote.totals, c);
    if (quoteGrandEl) {
      quoteGrandEl.textContent = grand.label + (grand.pending && quote.totals.tsh > 0 && !c.exchange.usdToTsh ? "*" : "");
    }

    if (quoteLinesEl) {
      quoteLinesEl.innerHTML = quote.lines
        .map((line) => {
          return `<li class="quote-line quote-line--${line.category}${line.pending ? " quote-line--pending" : ""}">
            <div class="quote-line__main">
              <span class="quote-line__label">${escapeHtml(line.label)}</span>
              <span class="quote-line__amount">${escapeHtml(lineAmountLabel(line, c))}</span>
            </div>
            <div class="quote-line__detail">${escapeHtml(line.detail || "")}</div>
          </li>`;
        })
        .join("");
    }

    if (quoteTotalsEl) {
      const bits = [
        `<div><span>USD tickets / USD lines</span><strong>${Pricing.formatMoney(quote.totals.usd, "USD")}</strong></div>`,
        `<div><span>TSh lines</span><strong>${Pricing.formatMoney(quote.totals.tsh, "TSH")}</strong></div>`,
      ];
      if (grand.secondary) {
        bits.push(`<div><span>Note</span><strong>${escapeHtml(grand.secondary)}</strong></div>`);
      }
      quoteTotalsEl.innerHTML = bits.join("");
    }

    const msgs = [...(quote.warnings || []), ...(quote.notes || [])];
    if (quoteWarningsEl) quoteWarningsEl.textContent = msgs.join(" · ");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function recalculate() {
    syncNationalityUi();
    renderQuote(Pricing.calculateQuote(readSelection(), config()));
  }

  function markInvalid(el, invalid) {
    const field = el && el.closest ? el.closest(".field") : null;
    if (field) field.classList.toggle("is-invalid", invalid);
  }

  populateDurationAndMeals();
  recalculate();

  form.addEventListener("input", recalculate);
  form.addEventListener("change", recalculate);

  document.querySelectorAll("[data-prefill-tour]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tour = btn.getAttribute("data-prefill-tour");
      if (tourSelect && tour) tourSelect.value = tour;
      recalculate();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    recalculate();

    const date = String(form.elements.date.value || "").trim();
    const name = String(form.elements.name.value || "").trim();
    const phone = String(form.elements.phone.value || "").trim();
    const notes = String(form.elements.notes.value || "").trim();

    let ok = true;
    markInvalid(form.elements.date, !date);
    markInvalid(form.elements.name, !name);
    markInvalid(form.elements.phone, !phone);
    if (!date || !name || !phone) ok = false;

    if (!latestQuote || !latestQuote.ok) {
      ok = false;
      if (statusEl) {
        statusEl.textContent =
          (latestQuote && latestQuote.errors && latestQuote.errors[0]) || "Fix quote options.";
      }
    }

    if (!ok) {
      if (statusEl && (!latestQuote || latestQuote.ok)) statusEl.textContent = "Fill required fields.";
      return;
    }

    const selection = readSelection();
    const messageLines = [
      "Habari Captain Salum Idy — booking request:",
      "",
      `Tour: ${selection.tourType}`,
      `Date: ${date}`,
      `Guests: ${selection.guests} (foreign ${selection.foreignGuests}, TZ ${selection.localGuests})`,
      `Hours: ${selection.durationHours}`,
      `Tickets: ${selection.attractions.join(", ") || "None"}`,
      `Meal: ${selection.mealId || "None (boat only)"}`,
      "",
      Pricing.quoteToPlainText(latestQuote),
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
    ];
    if (notes) messageLines.push(`Note: ${notes}`);
    messageLines.push("", "Asante!");

    if (statusEl) statusEl.textContent = "Opening WhatsApp…";
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageLines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer"
    );
  });
})();
