(function () {
  "use strict";
  let current = null;
  function normalize(number) {
    const digits = String(number || "").replace(/[^0-9]/g, "");
    const value = digits.startsWith("55") ? digits : "55" + digits;
    return /^55[1-9][0-9]{9,10}$/.test(value) ? value : null;
  }
  const contactLabels = {
    "pt-BR": { ready: "WhatsApp oficial", fallback: "Contatos oficiais da GNG" },
    en: { ready: "Official WhatsApp", fallback: "GNG official contact channels" },
    es: { ready: "WhatsApp oficial", fallback: "Canales oficiales de contacto de GNG" },
    ja: { ready: "公式WhatsApp", fallback: "GNGの公式連絡先" },
    de: { ready: "Offizielles WhatsApp", fallback: "Offizielle Kontaktwege von GNG" }
  };
  function render() {
    const locale = window.GNG_I18N?.getLocale?.() || "pt-BR";
    const labels = contactLabels[locale] || contactLabels["pt-BR"];
    document.querySelectorAll("[data-gng-contact-link]").forEach(function (link) {
      link.href = current ? "https://wa.me/" + current.number : "index.html#localizacao";
      link.textContent = current ? labels.ready + " (" + current.label + ")" : labels.fallback;
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
      const displayed = String(settings.phone_display || "").slice(0,32);
      current = { number: phone, label: normalize(displayed) === phone ? displayed : phone };
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