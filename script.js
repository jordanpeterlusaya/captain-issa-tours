(() => {
  const WHATSAPP_NUMBER = "255700000000"; // Replace with Captain Issa's real WhatsApp

  const header = document.querySelector(".site-header");
  const nav = document.getElementById("site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const form = document.getElementById("booking-form");
  const statusEl = document.getElementById("form-status");
  const tourSelect = document.getElementById("tour");
  const dateInput = document.getElementById("date");
  const yearEl = document.getElementById("year");
  const footerWa = document.getElementById("footer-whatsapp");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (footerWa) footerWa.href = `https://wa.me/${WHATSAPP_NUMBER}`;

  // Min date = tomorrow
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().slice(0, 10);
  }

  // Header scroll state
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile nav
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

  // Preselect tour from CTA buttons
  document.querySelectorAll("[data-tour]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-tour");
      if (tourSelect && value) tourSelect.value = value;
    });
  });

  // Reveal on scroll
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

  const tourLabels = {
    "prison-island": "Prison Island",
    "nakupenda-beach": "Nakupenda Beach",
    combo: "Prison Island + Nakupenda",
  };

  const markInvalid = (el, invalid) => {
    const field = el.closest(".field");
    if (field) field.classList.toggle("is-invalid", invalid);
  };

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = new FormData(form);
      const tour = String(data.get("tour") || "").trim();
      const date = String(data.get("date") || "").trim();
      const guests = String(data.get("guests") || "").trim();
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const email = String(data.get("email") || "").trim();
      const notes = String(data.get("notes") || "").trim();

      const fields = {
        tour: form.elements.tour,
        date: form.elements.date,
        guests: form.elements.guests,
        name: form.elements.name,
        phone: form.elements.phone,
      };

      let ok = true;
      Object.entries({
        tour,
        date,
        guests,
        name,
        phone,
      }).forEach(([key, value]) => {
        const empty = !value;
        markInvalid(fields[key], empty);
        if (empty) ok = false;
      });

      if (!ok) {
        if (statusEl) statusEl.textContent = "Please fill in the required fields.";
        return;
      }

      const lines = [
        "Habari Captain Issa — I'd like to book a safari:",
        "",
        `Tour: ${tourLabels[tour] || tour}`,
        `Date: ${date}`,
        `Guests: ${guests}`,
        `Name: ${name}`,
        `Phone: ${phone}`,
      ];
      if (email) lines.push(`Email: ${email}`);
      if (notes) lines.push(`Notes: ${notes}`);
      lines.push("", "Asante!");

      const message = encodeURIComponent(lines.join("\n"));
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

      if (statusEl) statusEl.textContent = "Opening WhatsApp…";
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }
})();
