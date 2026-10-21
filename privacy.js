(function () {
  "use strict";
  if (window.GNG_PRIVACY_CONTROLS_READY) return;
  window.GNG_PRIVACY_CONTROLS_READY = true;

  const storageKey = "gng_optional_google_maps_v1";

  function readPreference() {
    try { return window.localStorage.getItem(storageKey) === "accepted"; }
    catch (error) { return false; }
  }

  function savePreference(allowed) {
    try { window.localStorage.setItem(storageKey, allowed ? "accepted" : "declined"); }
    catch (error) { /* A preferência ainda vale nesta visita. */ }
  }

  function init() {
    const frame = document.querySelector(".map-card iframe[data-map-src]");
    if (!frame) return;
    const card = frame.closest(".map-card");
    let allowed = readPreference();

    const placeholder = document.createElement("div");
    placeholder.className = "map-privacy-placeholder";
    placeholder.innerHTML = '<strong>Mapa interativo opcional</strong>' +
      '<p>O Google Maps só será carregado se você permitir. Isso poderá compartilhar dados técnicos de acesso com o Google.</p>' +
      '<button type="button" class="map-consent-button">Carregar mapa</button>' +
      '<a href="privacidade.html#mapas">Como usamos seus dados</a>';
    card.insertBefore(placeholder, frame);

    function setMapAllowed(value, rememberChoice = true) {
      allowed = !!value;
      if (rememberChoice) savePreference(allowed);
      placeholder.hidden = allowed;
      frame.hidden = !allowed;
      if (allowed) {
        if (frame.getAttribute("src") !== frame.dataset.mapSrc) {
          frame.setAttribute("src", frame.dataset.mapSrc);
        }
      } else {
        if (frame.hasAttribute("src")) frame.setAttribute("src", "about:blank");
        frame.removeAttribute("src");
      }
      const state = document.getElementById("privacy-map-state");
      if (state) state.textContent = allowed ? "Permitido" : "Desativado";
    }

    placeholder.querySelector(".map-consent-button").addEventListener("click", function () {
      setMapAllowed(true);
    });

    const dialog = document.createElement("dialog");
    dialog.className = "gng-privacy-dialog";
    dialog.setAttribute("aria-labelledby", "privacy-dialog-title");
    dialog.innerHTML =
      '<h2 id="privacy-dialog-title">Preferências de privacidade</h2>' +
      '<p>Utilizamos armazenamento local para lembrar o tema escolhido. O painel restrito mantém a sessão de autenticação no navegador.</p>' +
      '<p>O mapa do Google é opcional e começa desativado. Ao ativá-lo, o navegador se conecta ao Google Maps, que pode usar cookies e processar dados técnicos.</p>' +
      '<p><strong>Google Maps: <span id="privacy-map-state"></span></strong></p>' +
      '<div class="gng-privacy-actions">' +
      '<button type="button" data-map-preference="off">Desativar mapa</button>' +
      '<button type="button" data-map-preference="on">Permitir mapa</button>' +
      '<button type="button" data-map-preference="close">Fechar</button>' +
      '</div>' +
      '<p class="gng-privacy-dialog-link"><a href="privacidade.html">Ler a Política de Privacidade</a></p>';
    document.body.appendChild(dialog);

    dialog.addEventListener("click", function (event) {
      const action = event.target.closest("[data-map-preference]");
      if (!action) return;
      const choice = action.dataset.mapPreference;
      if (choice === "on") setMapAllowed(true);
      if (choice === "off") setMapAllowed(false);
      dialog.close();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    document.querySelectorAll("[data-privacy-preferences]").forEach(function (button) {
      button.addEventListener("click", function () {
        document.getElementById("privacy-map-state").textContent = allowed ? "Permitido" : "Desativado";
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
      });
    });

    setMapAllowed(allowed, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
