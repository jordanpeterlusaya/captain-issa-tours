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

  // Hero background video
  if (heroVideo) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pickSrc = () =>
      window.matchMedia("(max-width: 800px)").matches
        ? "assets/videos/hero-mobile.mp4"
        : "assets/videos/hero.mp4";

    const heroSection = heroVideo.closest(".hero");

    const tryPlay = () => {
      const playPromise = heroVideo.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            if (heroSection) heroSection.classList.add("is-playing");
          })
          .catch(() => {});
      }
    };

    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      heroVideo.muted = true;
      heroVideo.defaultMuted = true;
      heroVideo.playsInline = true;
      heroVideo.setAttribute("muted", "");
      heroVideo.setAttribute("playsinline", "");
      heroVideo.setAttribute("webkit-playsinline", "");
      heroVideo.src = pickSrc();
      heroVideo.load();
      tryPlay();
      heroVideo.addEventListener("playing", () => {
        if (heroSection) heroSection.classList.add("is-playing");
      });
      heroVideo.addEventListener("loadeddata", tryPlay, { once: true });
      heroVideo.addEventListener("canplay", tryPlay, { once: true });
      window.addEventListener("resize", () => {
        const next = pickSrc();
        if (!String(heroVideo.currentSrc || heroVideo.src).includes(next)) {
          heroVideo.src = next;
          heroVideo.load();
          tryPlay();
        }
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) tryPlay();
      });
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

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // ---- Dynamic pricing booking form ----
  if (!form || !Pricing || !PricingConfig) return;

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

  let latestQuote = null;

  function config() {
    return PricingConfig.getConfig();
  }

  function populateDurationAndMeals() {
    const c = config();
    const hours = (c.boat.durationOptionsHours || [2]).slice();
    const included = c.boat.includedHours || 2;
    durationSelect.innerHTML = hours
      .map((h) => {
        const label =
          h === included ? `${h} hours (standard)` : `${h} hours`;
        return `<option value="${h}">${label}</option>`;
      })
      .join("");
    durationSelect.value = String(included);

    guestsInput.max = String(c.boat.maxGuests || 7);

    const meals = (c.meals.options || []).filter((m) => m.enabled !== false);
    mealSelect.innerHTML =
      `<option value="">No meal package</option>` +
      meals
        .map((m) => {
          const price = Pricing.formatMoney(m.priceTsh, "TSH");
          return `<option value="${m.id}">${m.label} — ${price} / ${m.serves} guests</option>`;
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
    return Array.from(form.querySelectorAll('input[name="attraction"]:checked')).map(
      (el) => el.value
    );
  }

  function readSelection() {
    const split = visitorSplit();
    return {
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

  function renderQuote(quote) {
    latestQuote = quote;
    if (!quoteLinesEl || !quoteTotalsEl) return;

    if (!quote.ok) {
      quoteLinesEl.innerHTML = `<li class="quote-line quote-line--error">${(quote.errors || [])
        .map((e) => escapeHtml(e))
        .join("<br>")}</li>`;
      quoteTotalsEl.innerHTML = "";
      if (quoteWarningsEl) quoteWarningsEl.textContent = "";
      return;
    }

    quoteLinesEl.innerHTML = quote.lines
      .map((line) => {
        const amount =
          line.pending || !line.amount
            ? "Pending"
            : Pricing.formatMoney(line.amount.amount, line.amount.currency);
        return `<li class="quote-line quote-line--${line.category}${
          line.pending ? " quote-line--pending" : ""
        }">
          <div class="quote-line__main">
            <span class="quote-line__label">${escapeHtml(line.label)}</span>
            <span class="quote-line__amount">${escapeHtml(amount)}</span>
          </div>
          <div class="quote-line__detail">${escapeHtml(line.detail || "")}</div>
        </li>`;
      })
      .join("");

    const t = quote.totals;
    const parts = [
      `<div><span>Subtotal TSh</span><strong>${Pricing.formatMoney(t.tsh, "TSH")}</strong></div>`,
      `<div><span>Subtotal USD</span><strong>${Pricing.formatMoney(t.usd, "USD")}</strong></div>`,
    ];
    if (t.exchangeRateUsdToTsh != null) {
      parts.push(
        `<div><span>USD as TSh @ ${t.exchangeRateUsdToTsh}</span><strong>${Pricing.formatMoney(
          t.usdAsTsh,
          "TSH"
        )}</strong></div>`
      );
      parts.push(
        `<div class="quote-grand"><span>Grand total</span><strong>${Pricing.formatMoney(
          t.grandTotalTsh,
          "TSH"
        )}</strong></div>`
      );
    } else if (t.usd > 0) {
      parts.push(
        `<div class="quote-note"><span>Grand total in TSh</span><strong>Exchange rate not configured</strong></div>`
      );
    } else {
      parts.push(
        `<div class="quote-grand"><span>Grand total</span><strong>${Pricing.formatMoney(
          t.tsh,
          "TSH"
        )}</strong></div>`
      );
    }
    quoteTotalsEl.innerHTML = parts.join("");

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
    const quote = Pricing.calculateQuote(readSelection(), config());
    renderQuote(quote);
  }

  function markInvalid(el, invalid) {
    const field = el && el.closest ? el.closest(".field") : null;
    if (field) field.classList.toggle("is-invalid", invalid);
  }

  populateDurationAndMeals();
  recalculate();

  form.addEventListener("input", recalculate);
  form.addEventListener("change", recalculate);

  document.querySelectorAll("[data-prefill-attraction]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-prefill-attraction") || "";
      const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
      form.querySelectorAll('input[name="attraction"]').forEach((box) => {
        box.checked = ids.includes(box.value);
      });
      recalculate();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    recalculate();

    const date = String(form.elements.date.value || "").trim();
    const name = String(form.elements.name.value || "").trim();
    const phone = String(form.elements.phone.value || "").trim();
    const email = String(form.elements.email.value || "").trim();
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
          (latestQuote && latestQuote.errors && latestQuote.errors[0]) ||
          "Please fix the quote options before sending.";
      }
    }

    if (!ok) {
      if (statusEl && (!latestQuote || latestQuote.ok)) {
        statusEl.textContent = "Please fill in the required fields.";
      }
      return;
    }

    const selection = readSelection();
    const messageLines = [
      "Habari Captain Issa — I'd like to book a boat tour:",
      "",
      `Date: ${date}`,
      `Guests: ${selection.guests} (foreign ${selection.foreignGuests}, Tanzanian ${selection.localGuests})`,
      `Duration: ${selection.durationHours} hours`,
      `Attractions: ${
        selection.attractions.length ? selection.attractions.join(", ") : "None (boat only)"
      }`,
      `Meal: ${selection.mealId || "None"}`,
      "",
      "Quote:",
      Pricing.quoteToPlainText(latestQuote),
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
    ];
    if (email) messageLines.push(`Email: ${email}`);
    if (notes) messageLines.push(`Notes: ${notes}`);
    messageLines.push("", "Asante!");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      messageLines.join("\n")
    )}`;
    if (statusEl) statusEl.textContent = "Opening WhatsApp…";
    window.open(url, "_blank", "noopener,noreferrer");
  });
})();
