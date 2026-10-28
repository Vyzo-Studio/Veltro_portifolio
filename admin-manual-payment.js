(function () {
  "use strict";
  if (window.GNG_MANUAL_PAYMENT_UI_INSTALLED) return;
  window.GNG_MANUAL_PAYMENT_UI_INSTALLED = true;

  const methods = ["cash", "pix", "debit", "credit"];
  const labels = {cash:"Dinheiro",pix:"Pix",debit:"Débito",credit:"Crédito"};
  const draftKey = "veltro_demo_manual_payment_operation_v1";
  let root = null;
  let secondEdited = false;

  function byId(id) { return document.getElementById(id); }
  function real(n) {
    return (Number(n || 0) / 100).toLocaleString("pt-BR", {
      style: "currency", currency: "BRL"
    });
  }
  function cents(value) {
    const cleaned = String(value == null ? "" : value).trim()
      .replace(/R\$/gi,"").replace(/\s/g,"");
    if (!cleaned) return null;
    const compact = cleaned.replace(/\.(?=\d{3}(?:\D|$))/g, "");
    const formatted = compact.replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(formatted)) return NaN;
    const parts = formatted.split(".");
    const number = Number(parts[0]) * 100 + Number((parts[1] || "").padEnd(2,"0"));
    return Number.isSafeInteger(number) && number <= 999999999 ? number : NaN;
  }
  function formatInput(c) {
    return (c / 100).toFixed(2).replace(".",",");
  }
  function serviceCents() {
    const service = byId("manual-service");
    const selected = service && service.selectedOptions && service.selectedOptions[0];
    const price = selected && selected.dataset.priceCents;
    return price && /^\d+$/.test(price) ? Number(price) : 0;
  }
  function selectedMethod(selectId) { return (byId(selectId)?.value || ""); }
  function setVisible(elementId,visible) { const el=byId(elementId); if(el)el.hidden=!visible; }
  function checkbox(id) { return Boolean(byId(id)?.checked); }
  function isPaid() { return checkbox("manual-split-enabled") || Boolean(selectedMethod("manual-payment-method")); }
  function isHistoric() {
    const paymentDate=byId("manual-payment-date")?.value || "";
    const now=new Date();
    const today=new Intl.DateTimeFormat("en-CA", {timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
    return paymentDate && paymentDate < today;
  }

  function paint() {
    if (!root) return;
    const due=serviceCents();
    const split=checkbox("manual-split-enabled");
    const paid=isPaid();
    setVisible("manual-payment-single-field", !split);
    setVisible("manual-split-details", split);
    setVisible("manual-payment-date-field", paid);
    setVisible("manual-payment-confirm-field", paid);
    setVisible("manual-payment-historic-field", paid && isHistoric());
    byId("manual-payment-date").required=paid;
    if (!split) {
      byId("manual-split-method-1").value="";
      byId("manual-split-method-2").value="";
      byId("manual-split-amount-1").value="";
      byId("manual-split-amount-2").value="";
      secondEdited=false;
    }
    if(split){
      const first=cents(byId("manual-split-amount-1").value);
      if (due>0 && first!==null && !Number.isNaN(first) && !secondEdited) {
        byId("manual-split-amount-2").value=formatInput(Math.max(0,due-first));
      }
    }
    let payments={};
    let total=0;
    let validAmounts=true;
    if(split){
      for(const i of [1,2]) {
        const value=cents(byId("manual-split-amount-"+i).value);
        const method=selectedMethod("manual-split-method-"+i);
        if(value===null || Number.isNaN(value) || value<=0 || !method || payments[method]) {
          validAmounts=false;
        } else {
          payments[method]=value; total+=value;
        }
      }
    } else if(paid) {
      payments[selectedMethod("manual-payment-method")]=due;
      total=due;
    }
    const cash=payments.cash||0;
    const cashVisible=paid && cash>0;
    setVisible("manual-payment-cash-field",cashVisible);
    if(!cashVisible) byId("manual-cash-tendered").value="";
    const tendered=cashVisible ? cents(byId("manual-cash-tendered").value) : null;
    const change=cashVisible && tendered!==null && !Number.isNaN(tendered) ? tendered-cash : null;
    byId("manual-change-value").textContent=change===null
      ? "Informe o valor entregue"
      : change<0 ? "Faltam "+real(-change) : real(change);
    const diff=due-total;
    byId("manual-payment-service-total").textContent=due ? real(due) : "Selecione um serviço";
    byId("manual-payment-allocated").textContent=real(total);
    byId("manual-payment-remainder").textContent=diff>0 ? "Faltam "+real(diff)
      : diff<0 ? "Excede "+real(-diff) : "Valor completo";
    byId("manual-payment-remainder").classList.toggle("is-error",diff<0);
    byId("manual-payment-remainder").classList.toggle("is-ok",diff===0 && due>0);
    byId("manual-payment-help").textContent = !paid
      ? "Sem pagamento registrado. O atendimento ficará como não recebido."
      : split
        ? (validAmounts && due>0 && diff===0 ? "Valores distribuídos corretamente. Confirme o recebimento presencial antes de salvar."
          : "Selecione duas formas diferentes e distribua exatamente o valor do serviço.")
        : "Pagamento único: o valor total será atribuído à forma escolhida.";
    return {due,paid,split,payments,total,validAmounts,cash,tendered,change,diff};
  }

  function collect() {
    const model=paint();
    if(!model) return {error:"O módulo de pagamentos não foi carregado."};
    if(!model.due) return {error:"Aguarde o carregamento do preço do serviço."};
    if(model.paid && (!model.validAmounts || model.diff!==0 || model.total!==model.due)) {
      return {error:"Distribua o valor total entre uma ou duas formas diferentes de pagamento."};
    }
    if(model.paid && !byId("manual-payment-date").value) {
      return {error:"Informe a data real em que o pagamento foi recebido."};
    }
    if(model.paid && isHistoric() && !checkbox("manual-historic-confirm")) {
      return {error:"Confirme o lançamento retroativo e a data original do recebimento."};
    }
    if(model.paid && !checkbox("manual-payment-received-confirm")) {
      return {error:"Confirme que o pagamento já foi efetivamente recebido na barbearia."};
    }
    if(model.cash>0 && (model.tendered===null || Number.isNaN(model.tendered) || model.tendered<model.cash)) {
      return {error:"Informe o valor em dinheiro entregue pelo cliente, suficiente para cobrir essa parcela."};
    }
    const options={cash:0,pix:0,debit:0,credit:0};
    Object.keys(model.payments).forEach(function(method){options[method]=model.payments[method]});
    return {
      payments: model.paid ? options : null,
      cashReceivedCents: model.cash>0 ? model.tendered : null,
      paymentDate: model.paid ? byId("manual-payment-date").value : null,
      historicalAdjustment: model.paid && isHistoric(),
      paid: model.paid,
      summary: !model.paid ? "Sem pagamento" :
        Object.keys(options).filter(k=>options[k]>0).map(k=>labels[k]+" "+real(options[k])).join(" + ")+
        (model.cash>0 ? " • Troco "+real(model.change||0) : "")
    };
  }

  function requestId(fingerprint) {
    try {
      const raw=window.sessionStorage.getItem(draftKey);
      if(raw) {
        const previous=JSON.parse(raw);
        if(previous.fingerprint===fingerprint && /^[0-9a-f-]{36}$/i.test(previous.id)) return previous.id;
      }
    }catch(error){}
    if(!window.crypto || !window.crypto.randomUUID) throw new Error("Seu navegador não oferece identificação segura de operações. Atualize-o antes de continuar.");
    const id=window.crypto.randomUUID();
    try {window.sessionStorage.setItem(draftKey,JSON.stringify({fingerprint,id}));}catch(error){}
    return id;
  }
  function reset() {
    try{window.sessionStorage.removeItem(draftKey)}catch(error){}
    byId("manual-split-enabled").checked=false;
    byId("manual-split-method-1").value="";
    byId("manual-split-method-2").value="";
    byId("manual-split-amount-1").value="";
    byId("manual-split-amount-2").value="";
    byId("manual-payment-date").value="";
    byId("manual-payment-received-confirm").checked=false;
    byId("manual-historic-confirm").checked=false;
    byId("manual-cash-tendered").value="";
    secondEdited=false;
    paint();
  }

  function setup() {
    if (byId("manual-financial-panel")) return true;
    const paymentField=byId("manual-payment-method")?.closest(".admin-field");
    if(!paymentField) return false;
    paymentField.id="manual-payment-single-field";
    const parent=paymentField.parentElement;
    const section=document.createElement("section");
    section.id="manual-financial-panel";
    section.className="manual-financial-panel";
    section.setAttribute("aria-label","Registro de pagamento presencial");
    const options=methods.map(method=>'<option value="'+method+'">'+labels[method]+'</option>').join("");
    section.innerHTML=
      '<header class="manual-financial-title"><span>FINANCEIRO PRESENCIAL</span><strong>Registro de pagamento</strong><p>O pagamento ocorre na barbearia. Este painel apenas registra o recebimento confirmado.</p></header>'+
      '<div class="manual-financial-metrics"><span>VALOR DO SERVIÇO</span><strong id="manual-payment-service-total">Selecione um serviço</strong></div>'+
      '<label class="manual-split-toggle"><input type="checkbox" id="manual-split-enabled"><span>Dividir pagamento em duas formas</span></label>'+
      '<div class="manual-split-details" id="manual-split-details" hidden>'+
       '<div class="manual-financial-grid">'+
        '<label class="admin-field"><span>Pagamento 1 — Forma</span><select id="manual-split-method-1"><option value="">Selecione</option>'+options+'</select></label>'+
        '<label class="admin-field"><span>Pagamento 1 — Valor (R$)</span><input id="manual-split-amount-1" inputmode="decimal" autocomplete="off" placeholder="0,00"></label>'+
        '<label class="admin-field"><span>Pagamento 2 — Forma</span><select id="manual-split-method-2"><option value="">Selecione</option>'+options+'</select></label>'+
        '<label class="admin-field"><span>Pagamento 2 — Valor (R$)</span><input id="manual-split-amount-2" inputmode="decimal" autocomplete="off" placeholder="0,00"></label>'+
       '</div><button type="button" class="manual-fill-remainder" id="manual-fill-remainder">Preencher o restante no pagamento 2</button>'+
      '</div>'+
      '<div class="manual-financial-breakdown" aria-live="polite"><div><span>Total distribuído</span><strong id="manual-payment-allocated">R$ 0,00</strong></div><div><span>Diferença</span><strong id="manual-payment-remainder">Valor completo</strong></div></div>'+
      '<div class="admin-field" id="manual-payment-cash-field" hidden><label for="manual-cash-tendered">Dinheiro entregue pelo cliente (R$)</label><input id="manual-cash-tendered" inputmode="decimal" placeholder="0,00" autocomplete="off"><small>Troco a devolver: <strong id="manual-change-value">Informe o valor entregue</strong></small></div>'+
      '<div class="admin-field" id="manual-payment-date-field" hidden><label for="manual-payment-date">Data real do recebimento</label><input type="date" id="manual-payment-date"><small>O dia do pagamento pode ser diferente do dia do atendimento.</small></div>'+
      '<label class="manual-split-toggle" id="manual-payment-historic-field" hidden><input type="checkbox" id="manual-historic-confirm"><span>Confirmo que este recebimento ocorreu em data anterior e deve ser registrado retroativamente.</span></label>'+
      '<label class="manual-split-toggle" id="manual-payment-confirm-field" hidden><input type="checkbox" id="manual-payment-received-confirm"><span>Confirmo que o pagamento já foi recebido ou verificado presencialmente.</span></label>'+
      '<p class="manual-financial-help" id="manual-payment-help" aria-live="polite">Sem pagamento registrado.</p>';
    parent.insertAdjacentElement("afterend",section);
    root=section;
    byId("manual-split-amount-1").addEventListener("input",function(){secondEdited=false;paint()});
    byId("manual-split-amount-2").addEventListener("input",function(){secondEdited=true;paint()});
    byId("manual-fill-remainder").addEventListener("click",function(){
      const due=serviceCents(), first=cents(byId("manual-split-amount-1").value);
      if(!due || first===null || Number.isNaN(first))return;
      byId("manual-split-amount-2").value=formatInput(Math.max(0,due-first));
      secondEdited=true;
      paint();
    });
    byId("manual-split-enabled").addEventListener("change",function(){
      if(this.checked) byId("manual-payment-method").value="";
      else {
        byId("manual-split-method-1").value="";
        byId("manual-split-method-2").value="";
      }
      secondEdited=false;
      paint();
    });
    [
      "manual-payment-method","manual-split-method-1","manual-split-method-2",
      "manual-payment-date","manual-cash-tendered","manual-historic-confirm",
      "manual-payment-received-confirm","manual-service"
    ].forEach(function(id){byId(id)?.addEventListener("change",paint);byId(id)?.addEventListener("input",paint)});
    const service=byId("manual-service");
    if(service && window.MutationObserver){
      new MutationObserver(paint).observe(service,{childList:true,subtree:true,attributes:true,attributeFilter:["data-price-cents"]});
    }
    paint();
    return true;
  }
  let attempts=0;
  function init() {
    if(setup()) return;
    if(++attempts<90) window.setTimeout(init,120);
  }
  window.GNG_MANUAL_PAYMENTS={collect,reset,requestId,paint};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
