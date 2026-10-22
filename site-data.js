(function () {
  if (window.GNG_SITE_DATA_INSTALLED) return;
  window.GNG_SITE_DATA_INSTALLED = true;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(cents) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(cents || 0) / 100);
  }

  function formatDuration(minutes) {
    const value = Number(minutes || 0);
    if (value < 60) return value + " min";
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest
      ? hours + "h" + String(rest).padStart(2, "0") + " min"
      : hours + "h";
  }

  function normalizeDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function injectStyles() {
    if (document.getElementById("gng-site-data-styles")) return;
    const style = document.createElement("style");
    style.id = "gng-site-data-styles";
    style.textContent = `
      .service-name-wrap{display:grid;gap:2px}
      .service-name-wrap strong{color:var(--navy-deep);font-size:1rem}
      .service-description{color:var(--muted);font-size:.76rem;font-weight:500;line-height:1.35}
      .gng-empty-message{grid-column:1/-1;max-width:100%;margin:10px 0;
        padding:20px 22px;border:1px dashed var(--line);border-radius:12px;
        color:var(--text);background:var(--white);line-height:1.5;text-align:center}
      html[data-theme="dark"] .gng-empty-message{background:#203651;color:#f4f8ff;border-color:#6983a1}
      .price-table .gng-empty-message{display:table-cell;text-align:left}

      @media(max-width:680px){
        .service-name-wrap strong{font-size:.84rem}
        .service-description{font-size:.62rem}
      }
    `;
    document.head.appendChild(style);
  }

  let configuredPalette = null;

  function syncBrandPalette() {
    if (!configuredPalette) return;
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark";
    const brandColors = {
      "--navy": configuredPalette.primary_color,
      "--navy-light": configuredPalette.primary_color,
      "--navy-deep": configuredPalette.secondary_color,
      "--navy-dark": configuredPalette.secondary_color
    };

    Object.keys(brandColors).forEach(function (property) {
      const value = brandColors[property];
      if (dark || !value) {
        root.style.removeProperty(property);
      } else {
        root.style.setProperty(property, value);
      }
    });

    if (configuredPalette.accent_color) {
      root.style.setProperty("--orange", configuredPalette.accent_color);
    } else {
      root.style.removeProperty("--orange");
    }
  }

  function applyTheme(settings) {
    configuredPalette = settings || {};
    syncBrandPalette();
  }

  window.addEventListener("gng:theme-change", syncBrandPalette);

  function applyLogo(settings) {
    if (!settings.logo_url) return;
    document.querySelectorAll('img[src*="logo-gng"]').forEach(function (image) {
      image.src = settings.logo_url;
    });
  }

  function setText(selector, value) {
    if (!value) return;
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function applyTexts(settings) {
    const texts = settings.site_texts || {};
    const heroHeading = document.querySelector(".hero h1");
    if (heroHeading) {
      heroHeading.textContent = texts.hero_title || "PRESENÇA";
      const subtitle = document.createElement("span");
      subtitle.textContent = texts.hero_subtitle || "COMEÇA NO CUIDADO.";
      heroHeading.appendChild(subtitle);
    }
    setText(".hero-lead", texts.hero_lead);
    setText("#servicos .section-head h2", texts.services_title);
    setText("#servicos .section-head > p", texts.services_intro);
    setText("#portfolio .section-head h2", texts.portfolio_title);
    setText("#portfolio .section-head > p", texts.portfolio_intro);
    setText("#espaco .section-head h2", texts.space_title);
    setText("#espaco .section-head > p", texts.space_intro);
    setText("#assinaturas .section-head h2", texts.memberships_title);
    setText("#assinaturas .section-head > p", texts.memberships_intro);
    setText("#localizacao .location-copy h2", texts.location_title);
    setText(".final-cta h2", texts.final_cta_title);
    setText(".final-cta p:last-child", texts.final_cta_text);
  }

  function weekdayLabel(days) {
    const list = Array.isArray(days) ? days.map(Number).sort() : [1,2,3,4,5,6,7];
    const locale = window.GNG_I18N?.getLocale?.() || "pt-BR";
    const range = {
      "pt-BR":"Segunda a sábado", en:"Monday to Saturday",
      es:"De lunes a sábado", ja:"月曜〜土曜", de:"Montag bis Samstag"
    };
    const all = {
      "pt-BR":"Todos os dias", en:"Every day",
      es:"Todos los días", ja:"毎日", de:"Jeden Tag"
    };
    if(list.length===7)return all[locale]||all["pt-BR"];
    if(list.length===6&&list.join(",")==="1,2,3,4,5,6")return range[locale]||range["pt-BR"];
    const names={1:"Seg",2:"Ter",3:"Qua",4:"Qui",5:"Sex",6:"Sáb",7:"Dom"};
    return list.map(day=>{
      const value = new Date(Date.UTC(2026,9,19+day-1));
      return new Intl.DateTimeFormat(locale,{weekday:"short",timeZone:"UTC"}).format(value)
        || names[day] || "";
    }).join(", ");
  }

  function applyContactAndSchedule(settings) {
    const phoneDisplay = settings.phone_display || "(61) 99407-5539";
    const whatsapp = normalizeDigits(settings.whatsapp_digits || "5561994075539");

    document.querySelectorAll(".important-number").forEach(function (element) {
      element.textContent = phoneDisplay;
    });

    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      const phone = normalizeDigits(phoneDisplay);
      link.href = "tel:+" + (phone.startsWith("55") ? phone : "55" + phone);
    });

    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach(function (link) {
      try {
        const url = new URL(link.href, window.location.href);
        const message = url.searchParams.get("text") || "";
        link.href = "https://wa.me/" + whatsapp + (message ? "?text=" + encodeURIComponent(message) : "");
      } catch (error) {
      }
    });

    const locale = window.GNG_I18N?.getLocale?.() || "pt-BR";
    const connectors = {"pt-BR":"às",en:"to",es:"a",ja:"〜",de:"bis"};
    const timeWord = connectors[locale] || "às";
    const scheduleLabel = weekdayLabel(settings.open_weekdays) + " • " +
      (settings.open_time || "09:00") + " " + timeWord + " " + (settings.close_time || "19:30");

    const quickInfo = document.querySelector(".quick-info > div:last-child");

    if (quickInfo) {
      const strong = quickInfo.querySelector("strong");
      if (strong) strong.textContent = scheduleLabel;
    }

    const bookingHeading = document.querySelector("#agendamento .section-head > p");
    if (bookingHeading) {
      const prefix={
        "pt-BR":"Escolha o serviço, o barbeiro, o dia e um horário disponível entre ",
        en:"Choose a service, barber, date and an available time between ",
        es:"Elige servicio, barbero, día y un horario disponible entre ",
        ja:"サービス・担当者・日付・空き時間を選択：",
        de:"Wähle Leistung, Barber, Tag und eine freie Uhrzeit zwischen "
      };
      bookingHeading.textContent=(prefix[locale]||prefix["pt-BR"]) +
        (settings.open_time||"09:00") + (locale==="ja"?"〜":" "+(locale==="en"?"and":locale==="de"?"und":locale==="es"?"y":"e")+" ") +
        (settings.close_time||"19:30") + ".";
    }

    if (settings.address) setText(".address", settings.address);

    const mapsUrl = settings.maps_url || "https://maps.app.goo.gl/TWPYmZSicCJ618xw6";
    document.querySelectorAll(".location-actions a[target='_blank'], .map-open-link, .footer-links a[target='_blank']").forEach(function (link) {
      if (/maps|google/i.test(link.href) || link.classList.contains("map-open-link")) {
        link.href = mapsUrl;
      }
    });

    // The iframe URL stays inert until the visitor explicitly enables Google Maps.
    const iframe = document.querySelector(".map-card iframe[data-map-src]");
    if (iframe && settings.address) {
      iframe.dataset.mapSrc = "https://www.google.com/maps?q=" +
        encodeURIComponent(settings.address) + "&output=embed";
      if (window.GNG_MAP_ALLOWED === true) {
        iframe.setAttribute("src", iframe.dataset.mapSrc);
      }
    }

    window.GNG_RUNTIME_CONFIG = Object.assign({}, window.GNG_RUNTIME_CONFIG || {}, settings, {
      whatsapp_digits: whatsapp
    });

    window.dispatchEvent(new Event("resize"));
  }

  function buildServiceRow(service) {
    return `
      <tr>
        <td data-label="Serviço">
          <div class="service-name-wrap">
            <strong>${escapeHtml(service.name)}</strong>
            <small class="service-description">${escapeHtml(service.description || "")}</small>
          </div>
        </td>
        <td data-label="Duração">${escapeHtml(formatDuration(service.duration_minutes))}</td>
        <td data-label="Valor"><strong>${escapeHtml(formatMoney(service.price_cents))}</strong></td>
        <td class="table-action">
          <a href="#agendamento" data-dynamic-service-link="${escapeHtml(service.name)}">Agendar</a>
        </td>
      </tr>
    `;
  }

  function setupDynamicServiceToggle(rows) {
    const shell = document.querySelector("#servicos .price-table-shell");
    if (!shell) return;

    const old = document.getElementById("mobile-services-toggle");
    if (old) old.remove();
    if (rows.length <= 5) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "mobile-services-toggle";
    button.className = "btn btn-secondary full";
    let expanded = false;

    function update() {
      const mobile = window.matchMedia("(max-width: 680px)").matches;
      rows.forEach(function (row, index) {
        row.hidden = mobile && !expanded && index >= 5;
      });
      button.hidden = !mobile;
      button.textContent = expanded ? "Mostrar menos" : "Ver todos os serviços (" + rows.length + ")";
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
    }

    button.addEventListener("click", function () {
      expanded = !expanded;
      update();
    });

    shell.insertAdjacentElement("afterend", button);
    window.addEventListener("resize", update);
    update();
  }

  function applyServices(services) {
    if (!Array.isArray(services)) return;

    const tbody = document.querySelector("#servicos .price-table tbody");
    if (tbody) {
      tbody.innerHTML = services.length
        ? services.map(buildServiceRow).join("")
        : '<tr><td colspan="4" class="gng-empty-message" role="status">Nenhum serviço disponível no momento.</td></tr>';
      const rows = services.length ? Array.from(tbody.querySelectorAll("tr")) : [];
      setupDynamicServiceToggle(rows);

      tbody.addEventListener("click", function (event) {
        const link = event.target.closest("[data-dynamic-service-link]");
        if (!link) return;
        event.preventDefault();

        const select = document.getElementById("booking-service");
        if (select) {
          select.value = link.dataset.dynamicServiceLink;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const target = document.getElementById("agendamento");
        if (target) {
          target.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start"
          });
        }
      });
    }

    const select = document.getElementById("booking-service");
    if (select) {
      const current = select.value;
      select.innerHTML =
        '<option value="">Selecione um serviço</option>' +
        services.map(function (service) {
          return '<option value="' + escapeHtml(service.name) + '" data-price="' +
            escapeHtml(formatMoney(service.price_cents)) + '">' +
            escapeHtml(service.name) + " — " + escapeHtml(formatMoney(service.price_cents)) +
            "</option>";
        }).join("");

      if (current && services.some(function (service) { return service.name === current; })) {
        select.value = current;
      } else if (current && !services.some(function (service) { return service.name === current; })) {
        select.value = "";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  function applyPortfolio(gallery) {
    const items = gallery.filter(function (item) { return item.kind === "portfolio"; });
    const grid = document.querySelector("#portfolio .portfolio-grid");
    if (!grid) return;

    const note = grid.querySelector(".portfolio-note");
    const noteHtml = note ? note.outerHTML : "";

    grid.innerHTML = (items.length ? items.map(function (item, index) {
      return `
        <figure class="portfolio-photo ${index === 0 ? "portfolio-large" : ""}">
          <img src="${escapeHtml(item.image_url)}"
               alt="${escapeHtml(item.alt_text || item.caption || "Trabalho GNG Barbearia")}"
               loading="lazy" decoding="async">
          <figcaption>
            <span>${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(item.caption || "Trabalho GNG")}</strong>
          </figcaption>
        </figure>
      `;
    }).join("") : '<p class="gng-empty-message portfolio-empty" role="status">Nenhuma foto de cortes disponível no momento.</p>') + noteHtml;
  }

  function applySpaceGallery(gallery) {
    const grid = document.querySelector("#espaco .space-grid");
    if (!grid) return;

    const items = gallery.filter(function (item) {
      return item.kind === "interior" || item.kind === "exterior";
    });

    grid.innerHTML = items.length ? items.map(function (item) {
      const label = item.kind === "interior" ? "INTERIOR" : "FACHADA";
      return `
        <figure class="space-card">
          <img src="${escapeHtml(item.image_url)}"
               alt="${escapeHtml(item.alt_text || item.caption || label + " da GNG Barbearia")}"
               loading="lazy" decoding="async">
          <figcaption>
            <span>${label}</span>
            <strong>${escapeHtml(item.caption || (item.kind === "interior" ? "Espaço interno da GNG" : "Fachada da GNG"))}</strong>
          </figcaption>
        </figure>
      `;
    }).join("") : '<p class="gng-empty-message space-empty" role="status">Nenhuma foto do espaço disponível no momento.</p>';
  }

  async function initialize() {
    injectStyles();

    if (typeof supabaseRpc !== "function") {
      console.error("GNG: RPC pública indisponível para carregar configuração.");
      return;
    }

    try {
      const data = await supabaseRpc("get_public_site_config", {});
      if (!data || typeof data !== "object") return;

      const settings = data.settings || {};
      window.GNG_RUNTIME_CONFIG = Object.assign({}, window.GNG_RUNTIME_CONFIG || {}, settings);

      applyTheme(settings);
      applyLogo(settings);
      applyTexts(settings);
      applyContactAndSchedule(settings);
      // Absence of a payload is a temporary API error, but an empty array
      // is an intentional admin configuration and must clear legacy cards.
      if (Array.isArray(data.services)) applyServices(data.services);
      if (Array.isArray(data.gallery)) {
        applyPortfolio(data.gallery);
        applySpaceGallery(data.gallery);
      }

      window.dispatchEvent(new CustomEvent("gng:site-data-ready", { detail: data }));
    } catch (error) {
      console.error("GNG: não foi possível carregar a configuração dinâmica.", error);
    }
  }

  window.addEventListener("gng:locale-changed", function () {
    if(window.GNG_RUNTIME_CONFIG)applyContactAndSchedule(window.GNG_RUNTIME_CONFIG);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();