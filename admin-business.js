(function () {
  if (window.GNG_ADMIN_BUSINESS_INSTALLED) return;
  window.GNG_ADMIN_BUSINESS_INSTALLED = true;

  let businessData = null;
  let reportData = null;
  let originalRefreshAvailability = null;

  const WEEKDAYS = [
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
    { value: 6, label: "Sáb" }
  ];

  const TEXT_FIELDS = [
    ["hero_title", "Título principal"],
    ["hero_subtitle", "Subtítulo principal"],
    ["hero_lead", "Descrição do topo"],
    ["services_title", "Título de serviços"],
    ["services_intro", "Texto de serviços"],
    ["portfolio_title", "Título do portfólio"],
    ["portfolio_intro", "Texto do portfólio"],
    ["space_title", "Título do espaço"],
    ["space_intro", "Texto do espaço"],
    ["memberships_title", "Título das assinaturas"],
    ["memberships_intro", "Texto das assinaturas"],
    ["location_title", "Título da localização"],
    ["final_cta_title", "Título da chamada final"],
    ["final_cta_text", "Texto da chamada final"]
  ];

  function waitForAdmin() {
    if (
      typeof rpc !== "function" ||
      typeof switchAdminSection !== "function" ||
      typeof supabaseClient === "undefined"
    ) {
      window.setTimeout(waitForAdmin, 120);
      return;
    }

    install();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function parseMoneyToCents(value) {
    const normalized = String(value || "")
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");

    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.round(number * 100);
  }

  function formatMoneyInput(cents) {
    return (Number(cents || 0) / 100)
      .toFixed(2)
      .replace(".", ",");
  }

  function injectStyles() {
    if (document.getElementById("gng-admin-business-styles")) return;

    const style = document.createElement("style");
    style.id = "gng-admin-business-styles";
    style.textContent = `
      .business-panel-stack{display:grid;gap:18px}
      .business-card{padding:22px;border:1px solid rgba(34,51,79,.13);border-radius:18px;background:#fff;box-shadow:0 12px 32px rgba(13,23,40,.06)}
      .business-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}
      .business-card-head span,.business-kicker{color:#6d7e99;font-size:.72rem;font-weight:800;letter-spacing:.1em}
      .business-card-head h3{margin:3px 0 0;color:#0d1728;font-family:"Bebas Neue",sans-serif;font-size:2rem;font-weight:400}
      .business-card-head p{max-width:500px;margin:0;color:#6b778a;font-size:.88rem}
      .business-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .business-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .business-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
      .business-message{margin-top:12px;padding:11px 13px;border-radius:10px;background:#edf1f5;color:#22334f;font-size:.82rem;font-weight:700}
      .business-message.is-error{background:#fff0f0;color:#9f2734}
      .business-message.is-success{background:#edf8f2;color:#1f6f54}
      .business-tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:18px;padding-bottom:2px;scrollbar-width:none}
      .business-tabs::-webkit-scrollbar{display:none}
      .business-tab{min-height:42px;padding:0 14px;border:1px solid rgba(34,51,79,.14);border-radius:999px;background:#fff;color:#53627a;font-size:.74rem;font-weight:800;white-space:nowrap}
      .business-tab.is-active{border-color:#22334f;background:#22334f;color:#fff}
      .business-subpanel[hidden]{display:none!important}
      .business-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .business-form-grid .wide{grid-column:1/-1}
      .business-weekdays{display:flex;flex-wrap:wrap;gap:8px}
      .business-weekday{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(34,51,79,.14);border-radius:10px;background:#f8f9fb;font-size:.76rem;font-weight:700}
      .business-logo-preview{width:96px;height:96px;object-fit:contain;border:1px solid rgba(34,51,79,.14);border-radius:14px;background:#edf1f5;padding:8px}
      .business-logo-row{display:flex;align-items:center;gap:14px}
      .business-list{display:grid;gap:10px}
      .business-item{padding:14px;border:1px solid rgba(34,51,79,.13);border-radius:14px;background:#f9fafb}
      .business-item-grid{display:grid;grid-template-columns:1.2fr 1.4fr .65fr .65fr .45fr;gap:9px;align-items:end}
      .business-item-grid.barber{grid-template-columns:1.2fr 1.6fr .5fr .5fr}
      .business-item label{display:grid;gap:5px;color:#526078;font-size:.68rem;font-weight:800}
      .business-item input,.business-item textarea,.business-item select,.business-card input,.business-card textarea,.business-card select{width:100%;min-height:44px;padding:9px 11px;border:1px solid #cbd3de;border-radius:10px;background:#fff;color:#17243a}
      .business-item textarea,.business-card textarea{min-height:82px;resize:vertical}
      .business-inline-check{display:flex!important;align-items:center;gap:8px;min-height:44px}
      .business-inline-check input{width:auto;min-height:0}
      .business-item-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
      .business-small-button{min-height:38px;padding:0 12px;border:1px solid rgba(34,51,79,.15);border-radius:9px;background:#fff;color:#22334f;font-size:.7rem;font-weight:800}
      .business-small-button.primary{border-color:#22334f;background:#22334f;color:#fff}
      .business-small-button.danger{border-color:#e6c4c8;color:#a72c39}
      .business-gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .business-gallery-card{overflow:hidden;border:1px solid rgba(34,51,79,.13);border-radius:14px;background:#fff}
      .business-gallery-card img{width:100%;height:170px;object-fit:cover;background:#edf1f5}
      .business-gallery-body{padding:12px}
      .business-gallery-body strong{display:block;color:#17243a}
      .business-gallery-body small{display:block;margin-top:3px;color:#718097}
      .report-filter{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}
      .report-quick{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .report-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .report-card{padding:16px;border:1px solid rgba(34,51,79,.13);border-radius:14px;background:#fff}
      .report-card span{display:block;color:#6d7e99;font-size:.66rem;font-weight:800;letter-spacing:.07em}
      .report-card strong{display:block;margin-top:4px;color:#0d1728;font-family:"Bebas Neue",sans-serif;font-size:2rem;font-weight:400}
      .report-table-shell{overflow:auto;border:1px solid rgba(34,51,79,.13);border-radius:14px;background:#fff}
      .report-table{width:100%;min-width:860px;border-collapse:collapse}
      .report-table th,.report-table td{padding:11px 12px;border-bottom:1px solid rgba(34,51,79,.08);text-align:left;font-size:.76rem}
      .report-table th{background:#eef2f6;color:#40506a;font-size:.66rem;letter-spacing:.06em}
      .report-negative{color:#b13342;font-weight:800}
      .report-positive{color:#1f6f54;font-weight:800}
      .manual-optional-hint{margin:-2px 0 8px;color:#768399;font-size:.7rem}
      @media(max-width:900px){
        .business-grid-2,.business-grid-3,.business-form-grid,.report-summary{grid-template-columns:1fr}
        .business-form-grid .wide{grid-column:auto}
        .business-item-grid,.business-item-grid.barber{grid-template-columns:1fr 1fr}
        .business-gallery-grid{grid-template-columns:1fr 1fr}
        .report-filter{grid-template-columns:1fr 1fr}
        .report-filter .business-small-button{grid-column:1/-1}
      }
      @media(max-width:620px){
        .business-card{padding:14px;border-radius:14px}
        .business-card-head{flex-direction:column}
        .business-item-grid,.business-item-grid.barber,.business-gallery-grid,.report-filter{grid-template-columns:1fr}
        .business-logo-row{align-items:flex-start;flex-direction:column}
      }
    `;

    document.head.appendChild(style);
  }

  function setBusinessMessage(element, message, type) {
    if (!element) return;

    if (!message) {
      element.hidden = true;
      element.textContent = "";
      element.classList.remove("is-error", "is-success");
      return;
    }

    element.hidden = false;
    element.textContent = message;
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-success", type === "success");
  }

  function addNavigation() {
    const nav = document.querySelector(".admin-section-nav");
    if (!nav) return;

    if (!nav.querySelector('[data-admin-section="relatorios"]')) {
      const reports = document.createElement("button");
      reports.className = "admin-section-nav-button";
      reports.type = "button";
      reports.dataset.adminSection = "relatorios";
      reports.textContent = "RELATÓRIOS";
      reports.addEventListener("click", function () {
        switchAdminSection("relatorios");
        loadFinancialReport();
      });
      nav.appendChild(reports);
    }

    if (!nav.querySelector('[data-admin-section="personalizacao"]')) {
      const settings = document.createElement("button");
      settings.className = "admin-section-nav-button";
      settings.type = "button";
      settings.dataset.adminSection = "personalizacao";
      settings.textContent = "PERSONALIZAÇÃO";
      settings.addEventListener("click", function () {
        switchAdminSection("personalizacao");
        loadBusinessData();
      });
      nav.appendChild(settings);
    }
  }

  function buildReportsPanel() {
    if (document.getElementById("admin-section-relatorios")) return;

    const cashPanel = document.getElementById("admin-section-caixa");
    if (!cashPanel) return;

    const panel = document.createElement("section");
    panel.className = "admin-panel-section";
    panel.id = "admin-section-relatorios";
    panel.dataset.adminPanel = "relatorios";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="admin-section-head">
        <div>
          <span>FINANCEIRO</span>
          <h2>RELATÓRIOS</h2>
        </div>
        <p>Consulte recebimentos reais, estornos, formas de pagamento e movimentações por período.</p>
      </div>

      <div class="business-panel-stack">
        <section class="business-card">
          <div class="business-card-head">
            <div>
              <span>PERÍODO</span>
              <h3>FILTRAR MOVIMENTAÇÃO</h3>
            </div>
            <p>Os valores recebidos usam a data real da transação, não a data do atendimento.</p>
          </div>

          <div class="report-filter">
            <label class="admin-field">
              <span>Data inicial</span>
              <input id="report-start-date" type="date">
            </label>
            <label class="admin-field">
              <span>Data final</span>
              <input id="report-end-date" type="date">
            </label>
            <button class="business-small-button primary" id="report-load-button" type="button">ATUALIZAR</button>
          </div>

          <div class="report-quick">
            <button class="business-small-button" type="button" data-report-range="today">HOJE</button>
            <button class="business-small-button" type="button" data-report-range="month">ESTE MÊS</button>
            <button class="business-small-button" type="button" data-report-range="year">ESTE ANO</button>
            <button class="business-small-button" id="report-export-button" type="button">EXPORTAR CSV</button>
          </div>

          <div class="business-message" id="report-message" hidden></div>
        </section>

        <section class="report-summary" id="report-summary"></section>

        <section class="business-card">
          <div class="business-card-head">
            <div>
              <span>TRANSAÇÕES</span>
              <h3>HISTÓRICO FINANCEIRO</h3>
            </div>
          </div>
          <div class="report-table-shell">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Data do pagamento</th>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Profissional</th>
                  <th>Atendimento</th>
                  <th>Forma</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody id="report-transactions-body"></tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    cashPanel.insertAdjacentElement("afterend", panel);

    const today = getTodayKey();
    const start = panel.querySelector("#report-start-date");
    const end = panel.querySelector("#report-end-date");
    start.value = today;
    end.value = today;

    panel.querySelector("#report-load-button").addEventListener("click", loadFinancialReport);
    panel.querySelector("#report-export-button").addEventListener("click", exportFinancialCsv);

    panel.querySelectorAll("[data-report-range]").forEach(function (button) {
      button.addEventListener("click", function () {
        setReportRange(button.dataset.reportRange);
        loadFinancialReport();
      });
    });
  }

  function buildPersonalizationPanel() {
    if (document.getElementById("admin-section-personalizacao")) return;

    const reportsPanel = document.getElementById("admin-section-relatorios");
    if (!reportsPanel) return;

    const panel = document.createElement("section");
    panel.className = "admin-panel-section";
    panel.id = "admin-section-personalizacao";
    panel.dataset.adminPanel = "personalizacao";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="admin-section-head">
        <div>
          <span>SITE E OPERAÇÃO</span>
          <h2>PERSONALIZAÇÃO</h2>
        </div>
        <p>Gerencie identidade, textos, serviços, profissionais, horários, contatos e imagens sem editar código.</p>
      </div>

      <div class="business-tabs">
        <button class="business-tab is-active" type="button" data-business-tab="identity">IDENTIDADE E SITE</button>
        <button class="business-tab" type="button" data-business-tab="services">SERVIÇOS</button>
        <button class="business-tab" type="button" data-business-tab="barbers">PROFISSIONAIS</button>
        <button class="business-tab" type="button" data-business-tab="gallery">GALERIA</button>
      </div>

      <div class="business-subpanel" data-business-panel="identity">
        <form class="business-panel-stack" id="business-settings-form">
          <section class="business-card">
            <div class="business-card-head">
              <div>
                <span>IDENTIDADE</span>
                <h3>LOGOTIPO E CORES</h3>
              </div>
              <p>As alterações são aplicadas ao site público após salvar.</p>
            </div>

            <div class="business-logo-row">
              <img class="business-logo-preview" id="business-logo-preview" src="assets/logo-gng.jpg" alt="Prévia do logotipo">
              <div class="admin-field" style="flex:1">
                <label for="business-logo-file">Novo logotipo</label>
                <input id="business-logo-file" type="file" accept="image/png,image/jpeg,image/webp">
                <small>PNG, JPG ou WEBP de até 5 MB.</small>
              </div>
            </div>

            <input id="business-logo-url" type="hidden">

            <div class="business-grid-3" style="margin-top:14px">
              <label class="admin-field">
                <span>Azul principal</span>
                <input id="business-primary-color" type="color">
              </label>
              <label class="admin-field">
                <span>Azul escuro</span>
                <input id="business-secondary-color" type="color">
              </label>
              <label class="admin-field">
                <span>Cor de destaque</span>
                <input id="business-accent-color" type="color">
              </label>
            </div>
          </section>

          <section class="business-card">
            <div class="business-card-head">
              <div>
                <span>CONTATO E LOCALIZAÇÃO</span>
                <h3>DADOS DA BARBEARIA</h3>
              </div>
            </div>

            <div class="business-form-grid">
              <label class="admin-field">
                <span>Telefone exibido</span>
                <input id="business-phone" type="text" maxlength="30">
              </label>
              <label class="admin-field">
                <span>WhatsApp com DDI</span>
                <input id="business-whatsapp" type="text" inputmode="numeric" maxlength="18">
              </label>
              <label class="admin-field wide">
                <span>Endereço</span>
                <input id="business-address" type="text" maxlength="240">
              </label>
              <label class="admin-field wide">
                <span>Link do Google Maps</span>
                <input id="business-maps-url" type="url" maxlength="500">
              </label>
            </div>
          </section>

          <section class="business-card">
            <div class="business-card-head">
              <div>
                <span>AGENDA</span>
                <h3>HORÁRIOS DE FUNCIONAMENTO</h3>
              </div>
              <p>Esses dados passam a controlar os horários oferecidos no site.</p>
            </div>

            <div class="business-grid-3">
              <label class="admin-field">
                <span>Primeiro horário</span>
                <input id="business-open-time" type="time">
              </label>
              <label class="admin-field">
                <span>Último horário</span>
                <input id="business-close-time" type="time">
              </label>
              <label class="admin-field">
                <span>Intervalo</span>
                <select id="business-slot-interval">
                  <option value="10">10 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </label>
            </div>

            <div style="margin-top:12px">
              <span class="business-kicker">DIAS DE FUNCIONAMENTO</span>
              <div class="business-weekdays" id="business-weekdays"></div>
            </div>
          </section>

          <section class="business-card">
            <div class="business-card-head">
              <div>
                <span>CONTEÚDO</span>
                <h3>TEXTOS DO SITE</h3>
              </div>
              <p>Somente texto é aceito; nenhum código executável é inserido no site.</p>
            </div>
            <div class="business-form-grid" id="business-text-fields"></div>
          </section>

          <section class="business-card">
            <div class="business-actions">
              <button class="admin-primary-button" id="business-settings-save" type="submit">SALVAR ALTERAÇÕES</button>
            </div>
            <div class="business-message" id="business-settings-message" hidden></div>
          </section>
        </form>
      </div>

      <div class="business-subpanel" data-business-panel="services" hidden>
        <section class="business-card">
          <div class="business-card-head">
            <div>
              <span>CATÁLOGO</span>
              <h3>SERVIÇOS E VALORES</h3>
            </div>
            <button class="business-small-button primary" id="business-new-service" type="button">NOVO SERVIÇO</button>
          </div>
          <div class="business-list" id="business-services-list"></div>
          <div class="business-message" id="business-services-message" hidden></div>
        </section>
      </div>

      <div class="business-subpanel" data-business-panel="barbers" hidden>
        <section class="business-card">
          <div class="business-card-head">
            <div>
              <span>EQUIPE</span>
              <h3>PROFISSIONAIS</h3>
            </div>
            <button class="business-small-button primary" id="business-new-barber" type="button">NOVO PROFISSIONAL</button>
          </div>
          <div class="business-list" id="business-barbers-list"></div>
          <div class="business-message" id="business-barbers-message" hidden></div>
        </section>
      </div>

      <div class="business-subpanel" data-business-panel="gallery" hidden>
        <div class="business-panel-stack">
          <section class="business-card">
            <div class="business-card-head">
              <div>
                <span>NOVA IMAGEM</span>
                <h3>ADICIONAR À GALERIA</h3>
              </div>
              <p>As fotos ficam armazenadas no Supabase e podem aparecer no portfólio, interior ou fachada.</p>
            </div>
            <form id="business-gallery-form">
              <div class="business-form-grid">
                <label class="admin-field">
                  <span>Categoria</span>
                  <select id="business-gallery-kind" required>
                    <option value="portfolio">Portfólio</option>
                    <option value="interior">Interior</option>
                    <option value="exterior">Fachada</option>
                  </select>
                </label>
                <label class="admin-field">
                  <span>Ordem</span>
                  <input id="business-gallery-order" type="number" value="0" min="0" max="999">
                </label>
                <label class="admin-field wide">
                  <span>Imagem</span>
                  <input id="business-gallery-file" type="file" accept="image/png,image/jpeg,image/webp" required>
                </label>
                <label class="admin-field">
                  <span>Legenda</span>
                  <input id="business-gallery-caption" type="text" maxlength="160">
                </label>
                <label class="admin-field">
                  <span>Texto alternativo</span>
                  <input id="business-gallery-alt" type="text" maxlength="180">
                </label>
              </div>
              <div class="business-actions">
                <button class="admin-primary-button" type="submit">ENVIAR IMAGEM</button>
              </div>
            </form>
            <div class="business-message" id="business-gallery-message" hidden></div>
          </section>

          <section class="business-card">
            <div class="business-card-head">
              <div>
                <span>ARQUIVOS</span>
                <h3>IMAGENS CADASTRADAS</h3>
              </div>
            </div>
            <div class="business-gallery-grid" id="business-gallery-list"></div>
          </section>
        </div>
      </div>
    `;

    reportsPanel.insertAdjacentElement("afterend", panel);

    panel.querySelectorAll("[data-business-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        switchBusinessTab(button.dataset.businessTab);
      });
    });

    buildWeekdayInputs();
    buildTextFields();
    setupPersonalizationEvents();
  }

  function buildWeekdayInputs() {
    const target = document.getElementById("business-weekdays");
    if (!target) return;

    target.innerHTML = WEEKDAYS.map(function (day) {
      return `
        <label class="business-weekday">
          <input type="checkbox" value="${day.value}">
          <span>${day.label}</span>
        </label>
      `;
    }).join("");
  }

  function buildTextFields() {
    const target = document.getElementById("business-text-fields");
    if (!target) return;

    target.innerHTML = TEXT_FIELDS.map(function (item) {
      const key = item[0];
      const label = item[1];
      const longField = /lead|intro|text/.test(key);

      return `
        <label class="admin-field ${longField ? "wide" : ""}">
          <span>${escapeHtml(label)}</span>
          ${longField
            ? '<textarea data-site-text="' + escapeHtml(key) + '" maxlength="500"></textarea>'
            : '<input data-site-text="' + escapeHtml(key) + '" type="text" maxlength="180">'}
        </label>
      `;
    }).join("");
  }

  function switchBusinessTab(name) {
    document.querySelectorAll("[data-business-tab]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.businessTab === name);
    });

    document.querySelectorAll("[data-business-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.businessPanel !== name;
    });
  }

  function enhanceManualBookingForm() {
    const name = document.getElementById("manual-customer-name");
    const phone = document.getElementById("manual-customer-phone");
    const date = document.getElementById("manual-booking-date");
    const time = document.getElementById("manual-booking-time");

    if (name) {
      name.required = false;
      const label = document.querySelector('label[for="manual-customer-name"]');
      if (label) label.textContent = "Nome do cliente (opcional)";
    }

    if (phone) {
      phone.required = false;
      const label = document.querySelector('label[for="manual-customer-phone"]');
      if (label) label.textContent = "Telefone (opcional)";
    }

    const form = document.getElementById("manual-booking-form");
    if (form && !document.getElementById("manual-booking-state")) {
      const row = document.createElement("div");
      row.className = "management-row";
      row.innerHTML = `
        <div class="admin-field">
          <label for="manual-booking-state">Situação</label>
          <select id="manual-booking-state">
            <option value="scheduled">Agendado / em aberto</option>
            <option value="completed">Atendimento já concluído</option>
          </select>
        </div>
        <div class="admin-field">
          <label for="manual-payment-method">Forma de pagamento</label>
          <select id="manual-payment-method">
            <option value="">Não recebido</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="debit">Débito</option>
            <option value="credit">Crédito</option>
          </select>
        </div>
      `;

      const message = document.getElementById("manual-booking-message");
      if (message) form.insertBefore(row, message);

      const hint = document.createElement("p");
      hint.className = "manual-optional-hint";
      hint.textContent =
        "Nome e telefone podem ficar em branco. Para atendimentos antigos, selecione a data original e marque como concluído quando necessário.";
      const submit = document.getElementById("manual-booking-submit");
      if (submit) form.insertBefore(hint, submit);
    }

    if (date) {
      date.removeAttribute("min");

      const today = new Date();
      const max = new Date(today.getTime());
      max.setDate(max.getDate() + 365);

      const year = max.getFullYear();
      const month = String(max.getMonth() + 1).padStart(2, "0");
      const day = String(max.getDate()).padStart(2, "0");
      date.max = year + "-" + month + "-" + day;
    }

    const stateSelect = document.getElementById("manual-booking-state");
    const paymentSelect = document.getElementById("manual-payment-method");

    if (stateSelect && paymentSelect) {
      stateSelect.addEventListener("change", function () {
        if (stateSelect.value === "completed" && !paymentSelect.value) {
          paymentSelect.focus();
        }
      });
    }

    if (time) time.required = true;
  }

  function configureAvailabilityFromSettings(settings) {
    if (!settings) return;

    const start = String(settings.open_time || "09:00").slice(0, 5);
    const end = String(settings.close_time || "19:30").slice(0, 5);
    const interval = Number(settings.slot_interval_minutes || 30);

    function minutes(value) {
      const parts = value.split(":").map(Number);
      return parts[0] * 60 + parts[1];
    }

    function pad(value) {
      return String(value).padStart(2, "0");
    }

    const startMinutes = minutes(start);
    const endMinutes = minutes(end);

    [document.getElementById("manual-booking-time"), document.getElementById("block-slot-time")]
      .forEach(function (select) {
        if (!select) return;

        const current = select.value;
        select.innerHTML = '<option value="">Selecione</option>';

        for (let value = startMinutes; value <= endMinutes; value += interval) {
          const option = document.createElement("option");
          option.value = pad(Math.floor(value / 60)) + ":" + pad(value % 60);
          option.textContent = option.value;
          select.appendChild(option);
        }

        if (current && Array.from(select.options).some(function (option) {
          return option.value === current;
        })) {
          select.value = current;
        }
      });

    if (typeof refreshTimeSelectAvailability === "function") {
      if (!originalRefreshAvailability) {
        originalRefreshAvailability = refreshTimeSelectAvailability;
      }

      refreshTimeSelectAvailability = async function (select, dateKey) {
        await originalRefreshAvailability(select, dateKey);

        if (!dateKey || !select || !businessData || !businessData.settings) return;

        const openDays = Array.isArray(businessData.settings.open_weekdays)
          ? businessData.settings.open_weekdays.map(Number)
          : [1,2,3,4,5,6,7];

        const parts = dateKey.split("-").map(Number);
        const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
        const jsDay = date.getUTCDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;

        if (!openDays.includes(isoDay)) {
          Array.from(select.options).forEach(function (option) {
            if (!option.value) {
              option.textContent = "Barbearia fechada nesta data";
              option.disabled = false;
            } else {
              option.disabled = true;
              option.textContent = option.value + " — fechado";
            }
          });
          select.value = "";
        }
      };
    }
  }

  function populateSettingsForm() {
    if (!businessData || !businessData.settings) return;

    const settings = businessData.settings;
    const setValue = function (id, value) {
      const element = document.getElementById(id);
      if (element) element.value = value == null ? "" : value;
    };

    setValue("business-logo-url", settings.logo_url);
    setValue("business-primary-color", settings.primary_color || "#22334f");
    setValue("business-secondary-color", settings.secondary_color || "#0d1728");
    setValue("business-accent-color", settings.accent_color || "#d97717");
    setValue("business-phone", settings.phone_display);
    setValue("business-whatsapp", settings.whatsapp_digits);
    setValue("business-address", settings.address);
    setValue("business-maps-url", settings.maps_url);
    setValue("business-open-time", String(settings.open_time || "09:00").slice(0, 5));
    setValue("business-close-time", String(settings.close_time || "19:30").slice(0, 5));
    setValue("business-slot-interval", settings.slot_interval_minutes || 30);

    const preview = document.getElementById("business-logo-preview");
    if (preview) preview.src = settings.logo_url || "assets/logo-gng.jpg";

    const openDays = Array.isArray(settings.open_weekdays)
      ? settings.open_weekdays.map(Number)
      : [1,2,3,4,5,6,7];

    document.querySelectorAll("#business-weekdays input[type='checkbox']").forEach(function (checkbox) {
      checkbox.checked = openDays.includes(Number(checkbox.value));
    });

    const texts = settings.site_texts || {};
    document.querySelectorAll("[data-site-text]").forEach(function (field) {
      field.value = texts[field.dataset.siteText] || "";
    });

    configureAvailabilityFromSettings(settings);
  }

  function syncManualServices() {
    const select = document.getElementById("manual-service");
    if (!select || !businessData || !Array.isArray(businessData.services)) return;

    const current = select.value;
    const active = businessData.services
      .filter(function (service) { return service.active; })
      .sort(function (a, b) {
        return Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
          String(a.name).localeCompare(String(b.name), "pt-BR");
      });

    select.innerHTML =
      '<option value="">Selecione</option>' +
      active.map(function (service) {
        return '<option value="' + escapeHtml(service.name) + '" data-price-cents="' + Number(service.price_cents) + '">' +
          escapeHtml(service.name) + " — " + escapeHtml(formatMoney(service.price_cents)) +
          "</option>";
      }).join("");

    if (current && active.some(function (service) { return service.name === current; })) {
      select.value = current;
    }
  }

  function renderServices() {
    const target = document.getElementById("business-services-list");
    if (!target || !businessData) return;

    const services = Array.isArray(businessData.services)
      ? businessData.services.slice().sort(function (a, b) {
          return Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
            String(a.name).localeCompare(String(b.name), "pt-BR");
        })
      : [];

    target.innerHTML = services.map(function (service) {
      return serviceEditorHtml(service);
    }).join("");

    if (!services.length) {
      target.innerHTML = '<div class="admin-empty compact"><strong>NENHUM SERVIÇO</strong></div>';
    }
  }

  function serviceEditorHtml(service) {
    return `
      <article class="business-item" data-service-id="${escapeHtml(service.id || "")}">
        <div class="business-item-grid">
          <label>Nome
            <input data-service-field="name" type="text" maxlength="100" value="${escapeHtml(service.name || "")}">
          </label>
          <label>Descrição
            <input data-service-field="description" type="text" maxlength="220" value="${escapeHtml(service.description || "")}">
          </label>
          <label>Duração
            <input data-service-field="duration" type="number" min="5" max="240" value="${Number(service.duration_minutes || 20)}">
          </label>
          <label>Valor (R$)
            <input data-service-field="price" type="text" inputmode="decimal" value="${escapeHtml(formatMoneyInput(service.price_cents || 0))}">
          </label>
          <label>Ordem
            <input data-service-field="order" type="number" min="0" max="999" value="${Number(service.sort_order || 0)}">
          </label>
        </div>
        <div class="business-item-actions">
          <label class="business-inline-check">
            <input data-service-field="active" type="checkbox" ${service.active === false ? "" : "checked"}>
            <span>Ativo</span>
          </label>
          <button class="business-small-button primary" type="button" data-save-service>SALVAR</button>
        </div>
      </article>
    `;
  }

  function renderBarbers() {
    const target = document.getElementById("business-barbers-list");
    if (!target || !businessData) return;

    const barbers = Array.isArray(businessData.barbers)
      ? businessData.barbers.slice().sort(function (a, b) {
          return Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
            String(a.name).localeCompare(String(b.name), "pt-BR");
        })
      : [];

    target.innerHTML = barbers.map(function (barber) {
      return barberEditorHtml(barber);
    }).join("");
  }

  function barberEditorHtml(barber) {
    return `
      <article class="business-item" data-barber-id="${escapeHtml(barber.id || "")}">
        <div class="business-item-grid barber">
          <label>Nome
            <input data-barber-field="name" type="text" maxlength="100" value="${escapeHtml(barber.name || "")}">
          </label>
          <label>Informações
            <input data-barber-field="note" type="text" maxlength="220" value="${escapeHtml(barber.profile_note || "")}">
          </label>
          <label>Ordem
            <input data-barber-field="order" type="number" min="0" max="999" value="${Number(barber.sort_order || 0)}">
          </label>
          <label class="business-inline-check">
            <input data-barber-field="active" type="checkbox" ${barber.active === false ? "" : "checked"}>
            <span>Ativo</span>
          </label>
        </div>
        <div class="business-item-actions">
          <button class="business-small-button primary" type="button" data-save-barber>SALVAR</button>
        </div>
      </article>
    `;
  }

  function renderGallery() {
    const target = document.getElementById("business-gallery-list");
    if (!target || !businessData) return;

    const items = Array.isArray(businessData.gallery) ? businessData.gallery : [];

    if (!items.length) {
      target.innerHTML = '<div class="admin-empty compact"><strong>NENHUMA IMAGEM CADASTRADA</strong></div>';
      return;
    }

    target.innerHTML = items.map(function (item) {
      const kind = item.kind === "interior"
        ? "Interior"
        : item.kind === "exterior"
          ? "Fachada"
          : "Portfólio";

      return `
        <article class="business-gallery-card" data-gallery-id="${escapeHtml(item.id)}">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.alt_text || item.caption || kind)}">
          <div class="business-gallery-body">
            <strong>${escapeHtml(item.caption || kind)}</strong>
            <small>${escapeHtml(kind)} • ordem ${Number(item.sort_order || 0)} • ${item.active === false ? "oculta" : "ativa"}</small>
            <div class="business-item-actions">
              <button class="business-small-button" type="button" data-toggle-gallery>${item.active === false ? "ATIVAR" : "OCULTAR"}</button>
              <button class="business-small-button danger" type="button" data-delete-gallery>REMOVER</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadBusinessData() {
    if (!state || !state.user) return;

    try {
      const data = await rpc("admin_get_business_config", {});
      businessData = data || {
        settings: {},
        services: [],
        gallery: [],
        barbers: []
      };

      populateSettingsForm();
      syncManualServices();
      renderServices();
      renderBarbers();
      renderGallery();

      if (typeof refreshManagementAvailability === "function") {
        await refreshManagementAvailability();
      }
    } catch (error) {
      console.error("Erro ao carregar configuração administrativa:", error);
      setBusinessMessage(
        document.getElementById("business-settings-message"),
        error.message,
        "error"
      );
    }
  }

  async function uploadImage(file, folder) {
    if (!file) throw new Error("Selecione uma imagem.");

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      throw new Error("Use uma imagem JPG, PNG ou WEBP.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path =
      folder + "/" +
      Date.now() + "-" +
      Math.random().toString(36).slice(2, 10) +
      "." + extension;

    const result = await supabaseClient.storage
      .from("gng-media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (result.error) throw result.error;

    const publicUrl = supabaseClient.storage
      .from("gng-media")
      .getPublicUrl(path);

    return {
      path,
      url: publicUrl.data.publicUrl
    };
  }

  function collectSiteTexts() {
    const result = {};
    document.querySelectorAll("[data-site-text]").forEach(function (field) {
      result[field.dataset.siteText] = field.value.trim();
    });
    return result;
  }

  async function saveSettings(event) {
    event.preventDefault();

    const message = document.getElementById("business-settings-message");
    setBusinessMessage(message, "");

    const weekdays = Array.from(
      document.querySelectorAll("#business-weekdays input:checked")
    ).map(function (checkbox) {
      return Number(checkbox.value);
    });

    try {
      await rpc("admin_update_business_settings", {
        p_logo_url: document.getElementById("business-logo-url").value.trim(),
        p_primary_color: document.getElementById("business-primary-color").value,
        p_secondary_color: document.getElementById("business-secondary-color").value,
        p_accent_color: document.getElementById("business-accent-color").value,
        p_phone_display: document.getElementById("business-phone").value.trim(),
        p_whatsapp_digits: normalizeDigits(document.getElementById("business-whatsapp").value),
        p_address: document.getElementById("business-address").value.trim(),
        p_maps_url: document.getElementById("business-maps-url").value.trim(),
        p_open_time: document.getElementById("business-open-time").value,
        p_close_time: document.getElementById("business-close-time").value,
        p_slot_interval_minutes: Number(document.getElementById("business-slot-interval").value),
        p_open_weekdays: weekdays,
        p_site_texts: collectSiteTexts()
      });

      setBusinessMessage(message, "Configurações salvas. O site público usará os novos dados.", "success");
      await loadBusinessData();
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const message = document.getElementById("business-settings-message");

    try {
      setBusinessMessage(message, "Enviando logotipo...");
      const uploaded = await uploadImage(file, "logo");
      document.getElementById("business-logo-url").value = uploaded.url;
      document.getElementById("business-logo-preview").src = uploaded.url;
      setBusinessMessage(message, "Logotipo enviado. Clique em SALVAR ALTERAÇÕES para publicar.", "success");
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    } finally {
      event.target.value = "";
    }
  }

  async function saveService(card) {
    const message = document.getElementById("business-services-message");
    const price = parseMoneyToCents(card.querySelector('[data-service-field="price"]').value);

    if (price === null) {
      setBusinessMessage(message, "Informe um valor válido.", "error");
      return;
    }

    try {
      await rpc("admin_upsert_service", {
        p_id: card.dataset.serviceId || null,
        p_name: card.querySelector('[data-service-field="name"]').value.trim(),
        p_description: card.querySelector('[data-service-field="description"]').value.trim(),
        p_duration_minutes: Number(card.querySelector('[data-service-field="duration"]').value),
        p_price_cents: price,
        p_active: card.querySelector('[data-service-field="active"]').checked,
        p_sort_order: Number(card.querySelector('[data-service-field="order"]').value || 0)
      });

      setBusinessMessage(message, "Serviço salvo com sucesso.", "success");
      await loadBusinessData();
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  async function saveBarber(card) {
    const message = document.getElementById("business-barbers-message");

    try {
      await rpc("admin_upsert_barber", {
        p_id: card.dataset.barberId || null,
        p_name: card.querySelector('[data-barber-field="name"]').value.trim(),
        p_profile_note: card.querySelector('[data-barber-field="note"]').value.trim(),
        p_active: card.querySelector('[data-barber-field="active"]').checked,
        p_sort_order: Number(card.querySelector('[data-barber-field="order"]').value || 0)
      });

      setBusinessMessage(message, "Profissional salvo com sucesso.", "success");
      await loadBusinessData();

      if (typeof window.GNG_BARBERS_ENHANCEMENT_INSTALLED !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  async function submitGallery(event) {
    event.preventDefault();

    const message = document.getElementById("business-gallery-message");
    const fileInput = document.getElementById("business-gallery-file");
    const file = fileInput.files && fileInput.files[0];

    try {
      setBusinessMessage(message, "Enviando imagem...");
      const uploaded = await uploadImage(file, "gallery");

      await rpc("admin_upsert_gallery_image", {
        p_id: null,
        p_kind: document.getElementById("business-gallery-kind").value,
        p_image_url: uploaded.url,
        p_storage_path: uploaded.path,
        p_caption: document.getElementById("business-gallery-caption").value.trim(),
        p_alt_text: document.getElementById("business-gallery-alt").value.trim(),
        p_sort_order: Number(document.getElementById("business-gallery-order").value || 0),
        p_active: true
      });

      event.target.reset();
      document.getElementById("business-gallery-order").value = "0";
      setBusinessMessage(message, "Imagem adicionada com sucesso.", "success");
      await loadBusinessData();
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  async function toggleGallery(card) {
    if (!businessData) return;
    const item = businessData.gallery.find(function (entry) {
      return entry.id === card.dataset.galleryId;
    });
    if (!item) return;

    const message = document.getElementById("business-gallery-message");

    try {
      await rpc("admin_upsert_gallery_image", {
        p_id: item.id,
        p_kind: item.kind,
        p_image_url: item.image_url,
        p_storage_path: item.storage_path || null,
        p_caption: item.caption || null,
        p_alt_text: item.alt_text || null,
        p_sort_order: Number(item.sort_order || 0),
        p_active: item.active === false
      });

      setBusinessMessage(message, item.active === false ? "Imagem ativada." : "Imagem ocultada.", "success");
      await loadBusinessData();
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  async function deleteGallery(card) {
    if (!businessData) return;
    const item = businessData.gallery.find(function (entry) {
      return entry.id === card.dataset.galleryId;
    });
    if (!item) return;

    const confirmed = await askConfirmation({
      title: "Remover imagem",
      text: "A imagem será removida da galeria do site.",
      actionLabel: "REMOVER",
      danger: true
    });

    if (!confirmed) return;

    const message = document.getElementById("business-gallery-message");

    try {
      await rpc("admin_delete_gallery_image", { p_id: item.id });

      if (item.storage_path) {
        const removeResult = await supabaseClient.storage
          .from("gng-media")
          .remove([item.storage_path]);

        if (removeResult.error) {
          console.warn("Imagem removida do cadastro, mas o arquivo não pôde ser excluído:", removeResult.error);
        }
      }

      setBusinessMessage(message, "Imagem removida.", "success");
      await loadBusinessData();
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  function setupPersonalizationEvents() {
    const form = document.getElementById("business-settings-form");
    if (form) form.addEventListener("submit", saveSettings);

    const logoInput = document.getElementById("business-logo-file");
    if (logoInput) logoInput.addEventListener("change", handleLogoUpload);

    const servicesList = document.getElementById("business-services-list");
    if (servicesList) {
      servicesList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-save-service]");
        if (!button) return;
        const card = button.closest("[data-service-id]");
        if (card) saveService(card);
      });
    }

    const newService = document.getElementById("business-new-service");
    if (newService) {
      newService.addEventListener("click", function () {
        const list = document.getElementById("business-services-list");
        if (!list) return;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = serviceEditorHtml({
          id: "",
          name: "",
          description: "",
          duration_minutes: 20,
          price_cents: 0,
          active: true,
          sort_order: businessData && businessData.services ? businessData.services.length + 1 : 1
        });
        list.prepend(wrapper.firstElementChild);
      });
    }

    const barbersList = document.getElementById("business-barbers-list");
    if (barbersList) {
      barbersList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-save-barber]");
        if (!button) return;
        const card = button.closest("[data-barber-id]");
        if (card) saveBarber(card);
      });
    }

    const newBarber = document.getElementById("business-new-barber");
    if (newBarber) {
      newBarber.addEventListener("click", function () {
        const list = document.getElementById("business-barbers-list");
        if (!list) return;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = barberEditorHtml({
          id: "",
          name: "",
          profile_note: "",
          active: true,
          sort_order: businessData && businessData.barbers ? businessData.barbers.length + 1 : 1
        });
        list.prepend(wrapper.firstElementChild);
      });
    }

    const galleryForm = document.getElementById("business-gallery-form");
    if (galleryForm) galleryForm.addEventListener("submit", submitGallery);

    const galleryList = document.getElementById("business-gallery-list");
    if (galleryList) {
      galleryList.addEventListener("click", function (event) {
        const card = event.target.closest("[data-gallery-id]");
        if (!card) return;
        if (event.target.closest("[data-toggle-gallery]")) toggleGallery(card);
        if (event.target.closest("[data-delete-gallery]")) deleteGallery(card);
      });
    }
  }

  function setReportRange(range) {
    const start = document.getElementById("report-start-date");
    const end = document.getElementById("report-end-date");
    if (!start || !end) return;

    const todayKey = getTodayKey();
    const today = new Date(todayKey + "T12:00:00");

    if (range === "today") {
      start.value = todayKey;
      end.value = todayKey;
      return;
    }

    if (range === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      start.value =
        first.getFullYear() + "-" +
        String(first.getMonth() + 1).padStart(2, "0") + "-01";
      end.value = todayKey;
      return;
    }

    if (range === "year") {
      start.value = today.getFullYear() + "-01-01";
      end.value = todayKey;
    }
  }

  function paymentLabel(method) {
    const labels = {
      cash: "Dinheiro",
      pix: "Pix",
      debit: "Débito",
      credit: "Crédito"
    };
    return labels[method] || method || "—";
  }

  function renderFinancialReport() {
    const summary = document.getElementById("report-summary");
    const body = document.getElementById("report-transactions-body");
    if (!summary || !body || !reportData) return;

    const methods = reportData.payment_totals || {};

    summary.innerHTML = `
      <article class="report-card"><span>RESULTADO LÍQUIDO</span><strong>${escapeHtml(formatMoney(reportData.net_total_cents || 0))}</strong></article>
      <article class="report-card"><span>PAGAMENTOS</span><strong>${Number(reportData.payment_count || 0)}</strong></article>
      <article class="report-card"><span>ESTORNOS</span><strong>${escapeHtml(formatMoney(reportData.refund_total_cents || 0))}</strong></article>
      <article class="report-card"><span>PIX</span><strong>${escapeHtml(formatMoney(methods.pix || 0))}</strong></article>
      <article class="report-card"><span>DINHEIRO</span><strong>${escapeHtml(formatMoney(methods.cash || 0))}</strong></article>
      <article class="report-card"><span>DÉBITO</span><strong>${escapeHtml(formatMoney(methods.debit || 0))}</strong></article>
      <article class="report-card"><span>CRÉDITO</span><strong>${escapeHtml(formatMoney(methods.credit || 0))}</strong></article>
      <article class="report-card"><span>QTD. ESTORNOS</span><strong>${Number(reportData.refund_count || 0)}</strong></article>
    `;

    const transactions = Array.isArray(reportData.transactions) ? reportData.transactions : [];

    body.innerHTML = transactions.map(function (item) {
      const occurred = item.occurred_at ? new Date(item.occurred_at).toLocaleString("pt-BR") : "—";
      const amount = Number(item.amount_cents || 0);
      return `
        <tr>
          <td>${escapeHtml(occurred)}</td>
          <td>${item.transaction_type === "refund" ? "Estorno" : "Pagamento"}</td>
          <td>${escapeHtml(item.customer_name || "Cliente não informado")}</td>
          <td>${escapeHtml(item.service || "—")}</td>
          <td>${escapeHtml(item.barber_name || "—")}</td>
          <td>${escapeHtml(String(item.appointment_date || ""))} ${escapeHtml(String(item.appointment_time || "").slice(0,5))}</td>
          <td>${escapeHtml(paymentLabel(item.payment_method))}</td>
          <td class="${amount < 0 ? "report-negative" : "report-positive"}">${escapeHtml(formatMoney(amount))}</td>
        </tr>
      `;
    }).join("");

    if (!transactions.length) {
      body.innerHTML = '<tr><td colspan="8">Nenhuma movimentação no período.</td></tr>';
    }
  }

  async function loadFinancialReport() {
    if (!state || !state.user) return;

    const start = document.getElementById("report-start-date");
    const end = document.getElementById("report-end-date");
    const message = document.getElementById("report-message");

    if (!start || !end) return;

    setBusinessMessage(message, "Carregando relatório...");

    try {
      reportData = await rpc("admin_financial_report", {
        p_start_date: start.value,
        p_end_date: end.value
      });

      renderFinancialReport();
      setBusinessMessage(message, "");
    } catch (error) {
      setBusinessMessage(message, error.message, "error");
    }
  }

  function exportFinancialCsv() {
    if (!reportData || !Array.isArray(reportData.transactions)) {
      const message = document.getElementById("report-message");
      setBusinessMessage(message, "Carregue um relatório antes de exportar.", "error");
      return;
    }

    const lines = [
      ["Data do pagamento","Tipo","Cliente","Serviço","Profissional","Data do atendimento","Horário","Forma de pagamento","Valor"]
    ];

    reportData.transactions.forEach(function (item) {
      lines.push([
        item.occurred_at ? new Date(item.occurred_at).toLocaleString("pt-BR") : "",
        item.transaction_type === "refund" ? "Estorno" : "Pagamento",
        item.customer_name || "Cliente não informado",
        item.service || "",
        item.barber_name || "",
        item.appointment_date || "",
        String(item.appointment_time || "").slice(0,5),
        paymentLabel(item.payment_method),
        (Number(item.amount_cents || 0) / 100).toFixed(2).replace(".", ",")
      ]);
    });

    // Neutralize Excel/LibreOffice formula prefixes in client-controlled text only.
    // Payment amounts retain their signed numeric representation.
    const csv = lines.map(function (row) {
      return row.map(function (value, columnIndex) {
        let cell = String(value == null ? "" : value);
        if ([2, 3, 4].includes(columnIndex) && /^[\\s\\u0000-\\u001f]*[=+@-]/.test(cell)) {
          cell = "'" + cell;
        }
        return '"' + cell.replace(/"/g, '""') + '"';
      }).join(";");
    }).join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gng-relatorio-" + (reportData.start_date || "inicio") + "-a-" + (reportData.end_date || "fim") + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function installAuthReload() {
    if (!supabaseClient || !supabaseClient.auth) return;

    supabaseClient.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        window.setTimeout(function () {
          loadBusinessData();
        }, 100);
      }
    });
  }

  async function install() {
    injectStyles();
    addNavigation();
    buildReportsPanel();
    buildPersonalizationPanel();
    enhanceManualBookingForm();
    installAuthReload();

    window.setTimeout(function () {
      if (state && state.user) {
        loadBusinessData();
      }
    }, 250);
  }

  waitForAdmin();
})();