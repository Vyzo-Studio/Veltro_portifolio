// Fail closed: credentials must belong to a new independent VELTRO project.
const approvedDemoBackend = window.VELTRO_BACKEND?.ready === true ? window.VELTRO_BACKEND : null;
const SUPABASE_URL = approvedDemoBackend?.url || "";
const SUPABASE_PUBLIC_KEY = approvedDemoBackend?.publishableKey || "";

function showStartupError(message) {
  console.error(message);

  const target =
    document.getElementById(
      "login-message"
    );

  if (!target) {
    return;
  }

  target.hidden = false;
  target.textContent = message;
  target.classList.remove("is-success", "is-info");
  target.classList.add("is-error");
}

function storageWorks(storage) {
  if (!storage) return false;

  const testKey = "__veltro_demo_storage_test__";

  try {
    storage.setItem(testKey, "1");
    const valid = storage.getItem(testKey) === "1";
    storage.removeItem(testKey);
    return valid;
  } catch (error) {
    return false;
  }
}

function createMemoryStorage() {
  const values = {};

  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : null;
    },

    setItem(key, value) {
      values[key] = String(value);
    },

    removeItem(key) {
      delete values[key];
    }
  };
}

function resolveAuthStorage() {
  // Eliminar a sessão persistente da versão anterior deste painel.
  try {
    window.localStorage.removeItem("sb-veltro-unconfigured-auth-token");
  } catch (error) {
  }

  // Preferir sessão por aba para reduzir persistência de credenciais administrativas.
  try {
    if (storageWorks(window.sessionStorage)) {
      return {
        storage: window.sessionStorage,
        mode: "sessionStorage"
      };
    }
  } catch (error) {
  }

  // Sem armazenamento temporário, usar somente memória (não persistente).

  return {
    storage: createMemoryStorage(),
    mode: "memory"
  };
}

function normalizeAdminEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isConfiguredAdminEmail(email) {
  // Authorization is verified server-side by the is_gng_admin() RPC.
  // Never embed the authorized account identity in the public JavaScript bundle.
  const normalized = normalizeAdminEmail(email);
  return normalized.length <= 254 &&
    /^[^\s@]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(normalized);
}

function loadScriptOnce({ src, dataAttribute, errorMessage }) {
  return new Promise(function (resolve, reject) {
    const selector = "script[" + dataAttribute + '="true"]';
    const existing = document.querySelector(selector);

    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute(dataAttribute, "true");

    script.addEventListener("load", resolve);
    script.addEventListener("error", function () {
      console.error(errorMessage);
      reject(new Error(errorMessage));
    });

    document.body.appendChild(script);
  });
}

async function loadAdminModules() {
  try {
    await loadScriptOnce({
      src: "admin-barbers.js?v=1.5",
      dataAttribute: "data-gng-admin-barbers",
      errorMessage: "Não foi possível carregar o módulo de barbeiros."
    });

    await loadScriptOnce({
      src: "admin-notifications.js?v=3.2",
      dataAttribute: "data-gng-admin-notifications",
      errorMessage: "Não foi possível carregar o sistema de notificações."
    });

    await loadScriptOnce({
      src: "admin-business.js?v=1.6",
      dataAttribute: "data-gng-admin-business",
      errorMessage: "Não foi possível carregar os módulos de relatórios e personalização."
    });

    await loadScriptOnce({
      src: "admin-manual-payment.js?v=1.0",
      dataAttribute: "data-gng-admin-manual-payment",
      errorMessage: "Não foi possível carregar o registro financeiro de agendamentos manuais."
    });
  } catch (error) {
    console.error(error);
  }
}

function scheduleAdminModules() {
  if (
    !document.getElementById("admin-login") &&
    !document.getElementById("admin-dashboard")
  ) {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      loadAdminModules,
      { once: true }
    );
    return;
  }

  loadAdminModules();
}

window.GNG_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  publicKey: SUPABASE_PUBLIC_KEY,
  businessTimezone: "America/Sao_Paulo",
  businessName: "VELTRO Barber Atelier",
  demonstration: true,
  whatsapp: "556185154156"
};

window.GNG_isConfiguredAdminEmail = isConfiguredAdminEmail;

if (!SUPABASE_URL || SUPABASE_URL === "COLE_AQUI_A_PROJECT_URL") {
  window.supabaseClient = null;
  showStartupError("A conexão com o Supabase não está configurada.");
} else if (!SUPABASE_PUBLIC_KEY) {
  window.supabaseClient = null;
  showStartupError("A chave pública do Supabase não está configurada.");
} else if (typeof window.supabase === "undefined") {
  // Legal pages use only the publishable public settings, not Supabase Auth.
  window.supabaseClient = null;
  if (document.getElementById("admin-login") || document.getElementById("admin-dashboard")) {
    showStartupError("Não foi possível carregar o sistema administrativo. Recarregue a página.");
  }
} else {
  const authStorage = resolveAuthStorage();
  window.GNG_AUTH_STORAGE_MODE = authStorage.mode;

  try {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLIC_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: authStorage.storage
        }
      }
    );

    scheduleAdminModules();
  } catch (error) {
    console.error("Erro ao iniciar Supabase:", error);
    window.supabaseClient = null;
    showStartupError("Não foi possível iniciar a conexão do painel. Recarregue a página.");
  }
}
