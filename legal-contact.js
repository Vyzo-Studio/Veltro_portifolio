(function () {
  "use strict";
  let current = null;
  function normalize(number) {
    const digits = String(number || "").replace(/[^0-9]/g, "");
    const value = digits.startsWith("55") ? digits : "55" + digits;
    return /^55[1-9][0-9]{9,10}$/.test(value) ? value : null;
  }
  function render() {
    document.querySelectorAll("[data-gng-contact-link]").forEach(function (link) {
      link.href = current ? "https://wa.me/" + current.number : "index.html#localizacao";
      if ((window.GNG_I18N?.getLocale?.() || "pt-BR") === "pt-BR") {
        link.textContent = current ? "WhatsApp oficial (" + current.label + ")" : "Contatos oficiais da GNG";
      }
    });
  }
  async function initialize() {
    render();
    const config = window.GNG_CONFIG;
    if (!config || !config.supabaseUrl || !config.publicKey) return;
    try {
      const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/get_public_site_config", {
        method: "POST",
        headers: { apikey: config.publicKey, "Content-Type": "application/json" },
        body: "{}"
      });
      if (!response.ok) throw new Error("Unavailable");
      const settings = (await response.json()).settings || {};
      const phone = normalize(settings.whatsapp_digits || settings.phone_display);
      if (!phone) throw new Error("Missing official contact");
      current = { number: phone, label: String(settings.phone_display || phone).slice(0,32) };
      render();
    } catch (error) {
      current = null;
      render();
    }
  }
  window.GNG_LEGAL_CONTACT = { render };
  window.addEventListener("gng:legal-rendered",render);
  window.addEventListener("gng:locale-changed",function () { queueMicrotask(render); });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",initialize,{once:true});
  } else initialize();
})();