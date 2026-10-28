(function(){
"use strict";
if(window.GNG_CONSENT)return;
const KEY="veltro_demo_consent_v1",OLD="veltro_no_legacy_consent",VERSION=2,MAX_AGE=180*86400000;
const i18n={
"pt-BR":["Sua privacidade é importante para nós","Usamos armazenamento necessário para o site. Com sua permissão, podemos carregar o conteúdo ilustrativo. Não temos rastreadores próprios de publicidade ou estatísticas.","Aceitar todos","Rejeitar opcionais","Personalizar","Configurações dos cookies","Necessários","Guarda sua escolha de privacidade e preferências essenciais. Sempre ativo.","Conteúdo externo — conteúdo ilustrativo","Permite carregar o mapa interativo. O Google poderá processar dados técnicos e usar cookies próprios.","Salvar preferências","Fechar","Política de Privacidade","Termos de Serviço","Mapa interativo opcional","O conteúdo ilustrativo só será carregado após sua autorização. O Google poderá receber dados técnicos da visita.","Carregar mapa","Como usamos seus dados","Ativado"],
en:["Your privacy matters to us","We use necessary browser storage to operate this website. With your permission we can load conteúdo ilustrativo. We do not install our own advertising or analytics trackers.","Accept all","Reject optional","Customize","Cookie settings","Necessary","Stores your privacy choice and essential preferences. Always enabled.","External content — conteúdo ilustrativo","Allows the interactive map to load. Google may process technical data and set its own cookies.","Save preferences","Close","Privacy Policy","Terms of Service","Optional interactive map","conteúdo ilustrativo loads only with your permission. Google may receive technical data about your visit.","Load map","How we use your data","Enabled"],
es:["Tu privacidad es importante para nosotros","Usamos almacenamiento necesario para el sitio. Con tu permiso, podemos cargar conteúdo ilustrativo. No instalamos rastreadores propios de publicidad ni estadísticas.","Aceptar todo","Rechazar opcionales","Personalizar","Configuración de cookies","Necesarias","Guarda tus opciones de privacidad y preferencias esenciales. Siempre activado.","Contenido externo — conteúdo ilustrativo","Permite cargar el mapa interactivo. Google puede procesar datos técnicos y utilizar sus propias cookies.","Guardar preferencias","Cerrar","Política de Privacidad","Términos de Servicio","Mapa interactivo opcional","conteúdo ilustrativo se cargará solo con tu permiso. Google podrá recibir datos técnicos de la visita.","Cargar mapa","Cómo usamos tus datos","Activado"],
ja:["お客様のプライバシーを大切にしています","サイトに必要なブラウザー保存機能を使用します。許可された場合のみ外部コンテンツを読み込みます。独自の広告・解析トラッカーは使用していません。","すべて許可","任意項目を拒否","設定する","Cookieの設定","必須","プライバシーの選択と必要な設定を保存します。常に有効です。","外部コンテンツ — 外部コンテンツ","地図の表示を許可します。Googleが技術的なデータを処理し、Cookieを使用する場合があります。","設定を保存","閉じる","プライバシーポリシー","利用規約","任意のインタラクティブ地図","外部コンテンツは許可後にのみ読み込まれます。閲覧に関する技術情報がGoogleに送信される場合があります。","地図を表示","データの取り扱い","有効"],
de:["Ihre Privatsphäre ist uns wichtig","Wir verwenden notwendigen Browserspeicher für die Website. Mit Ihrer Erlaubnis können wir conteúdo ilustrativo laden. Eigene Werbe- oder Analysetracker setzen wir nicht ein.","Alle akzeptieren","Optionale ablehnen","Anpassen","Cookie-Einstellungen","Notwendig","Speichert Ihre Datenschutzauswahl und notwendige Einstellungen. Immer aktiv.","Externe Inhalte — conteúdo ilustrativo","Erlaubt das Laden der interaktiven Karte. Google kann technische Daten verarbeiten und eigene Cookies setzen.","Einstellungen speichern","Schließen","Datenschutzerklärung","Nutzungsbedingungen","Optionale interaktive Karte","conteúdo ilustrativo wird erst nach Ihrer Zustimmung geladen. Technische Besuchsdaten können an Google übertragen werden.","Karte laden","Wie wir Daten verwenden","Aktiviert"]
};
const keys=["heading","lead","accept","reject","customize","settings","essential","essentialDesc","external","externalDesc","save","close","policy","terms","placeTitle","placeBody","load","more","on"];
const tr=k=>(i18n[window.GNG_I18N?.getLocale?.()]||i18n["pt-BR"])[keys.indexOf(k)]||k;
let value={external:false,createdAt:0},decided=false,frame=null,placeholder=null,dialog=null,banner=null,returnFocus=null;
function store(){try{localStorage.setItem(KEY,JSON.stringify({version:VERSION,...value}));}catch(e){}}
function read(){try{
const v=JSON.parse(localStorage.getItem(KEY)||"null");
if(v?.version===VERSION&&typeof v.external==="boolean"&&Number.isFinite(v.createdAt)&&v.createdAt<=Date.now()&&Date.now()-v.createdAt<MAX_AGE){value={external:v.external,createdAt:v.createdAt};decided=true;return}
const legacy=localStorage.getItem(OLD);
if(legacy==="accepted"||legacy==="declined"){value={external:legacy==="accepted",createdAt:Date.now()};decided=true;store();localStorage.removeItem(OLD)}
}catch(e){}}
function syncMap(allowed){
allowed=Boolean(allowed);
value.external=allowed;
window.GNG_MAP_ALLOWED = allowed;
if(frame){
placeholder.hidden=!!allowed;frame.hidden=!allowed;
if(allowed&&frame.dataset.mapSrc&&frame.getAttribute("src")!==frame.dataset.mapSrc)frame.setAttribute("src",frame.dataset.mapSrc);
if(!allowed&&frame.hasAttribute("src")){frame.setAttribute("src","about:blank");frame.removeAttribute("src")}
}
if(dialog)dialog.querySelector("#gng-consent-maps").checked=!!allowed;
}
function set(allowed){value={external:!!allowed,createdAt:Date.now()};decided=true;store();syncMap(allowed);
if(banner)banner.hidden=true;if(dialog?.open)dialog.close();
window.dispatchEvent(new CustomEvent("gng:consent-change",{detail:{external:value.external}}))}
function btn(action,kind){const b=document.createElement("button");b.type="button";b.dataset.consentAction=action;b.className=kind;return b}
function bannerUI(){
banner=document.createElement("section");banner.id="gng-consent-banner";banner.className="gng-consent-banner";banner.setAttribute("role","region");banner.setAttribute("aria-labelledby","gng-consent-title");
const title=document.createElement("h2");title.id="gng-consent-title";const body=document.createElement("p");
const actions=document.createElement("div");actions.className="gng-consent-actions";
actions.append(btn("accept","gng-consent-primary"),btn("reject","gng-consent-outline"),btn("customize","gng-consent-text"));
banner.append(title,body,actions);document.body.appendChild(banner);
banner.addEventListener("click",e=>{const a=e.target.closest("[data-consent-action]")?.dataset.consentAction;if(a==="accept")set(true);if(a==="reject")set(false);if(a==="customize")openSettings()});
}
function settingsUI(){
dialog=document.createElement("dialog");dialog.className="gng-privacy-dialog gng-consent-dialog";dialog.setAttribute("aria-labelledby","privacy-dialog-title");
dialog.innerHTML='<h2 id="privacy-dialog-title"></h2>'+
'<div class="gng-consent-category"><strong data-consent-text="essential"></strong><span class="gng-consent-always" data-consent-text="on"></span><p data-consent-text="essentialDesc"></p></div>'+
'<label class="gng-consent-category gng-consent-switch"><span><strong data-consent-text="external"></strong><small data-consent-text="externalDesc"></small></span><input type="checkbox" id="gng-consent-maps" aria-describedby="gng-consent-map-desc"></label>'+
'<p id="gng-consent-map-desc" class="gng-consent-description"></p>'+
'<div class="gng-consent-actions"><button type="button" data-consent-action="save" class="gng-consent-primary"></button><button type="button" data-consent-action="accept" class="gng-consent-outline"></button><button type="button" data-consent-action="reject" class="gng-consent-outline"></button><button type="button" data-consent-action="close" class="gng-consent-text"></button></div>'+
'<p class="gng-privacy-dialog-link"><a href="privacidade.html" data-consent-text="policy"></a> · <a href="termos.html" data-consent-text="terms"></a></p>';
dialog.addEventListener("click",e=>{const a=e.target.closest("[data-consent-action]")?.dataset.consentAction;
if(a==="save")set(dialog.querySelector("#gng-consent-maps").checked);
if(a==="accept")set(true);if(a==="reject")set(false);if(a==="close")dialog.close()});
dialog.addEventListener("close",()=>{if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null});
document.body.appendChild(dialog)}
function openSettings(){if(!dialog)return;returnFocus=document.activeElement;dialog.querySelector("#gng-consent-maps").checked=value.external;
if(typeof dialog.showModal==="function"&&!dialog.open)dialog.showModal();else dialog.setAttribute("open","")}
function attachMap(){frame=document.querySelector(".map-card iframe[data-map-src]");if(!frame)return;
placeholder=document.createElement("div");placeholder.className="map-privacy-placeholder";
placeholder.innerHTML='<strong></strong><p></p><button type="button" class="map-consent-button"></button><a href="privacidade.html#mapas"></a>';
frame.closest(".map-card").insertBefore(placeholder,frame);placeholder.querySelector("button").addEventListener("click",()=>set(true))}
function render(){
if(banner){banner.querySelector("h2").textContent=tr("heading");banner.querySelector("p").textContent=tr("lead");banner.querySelectorAll("[data-consent-action]").forEach(el=>el.textContent=tr(el.dataset.consentAction))}
if(dialog){dialog.querySelector("#privacy-dialog-title").textContent=tr("settings");dialog.querySelector("#gng-consent-map-desc").textContent=tr("externalDesc");
dialog.querySelectorAll("[data-consent-text]").forEach(el=>el.textContent=tr(el.dataset.consentText));dialog.querySelectorAll("[data-consent-action]").forEach(el=>el.textContent=tr(el.dataset.consentAction))}
if(placeholder){placeholder.querySelector("strong").textContent=tr("placeTitle");placeholder.querySelector("p").textContent=tr("placeBody");placeholder.querySelector("button").textContent=tr("load");placeholder.querySelector("a").textContent=tr("more")}
}
function init(){read();attachMap();settingsUI();bannerUI();render();syncMap(value.external);banner.hidden=decided;
document.querySelectorAll("[data-privacy-preferences]").forEach(b=>b.addEventListener("click",openSettings));window.addEventListener("gng:locale-changed",render)}
window.GNG_CONSENT={get:()=>({...value,decided}),set,open:openSettings,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();