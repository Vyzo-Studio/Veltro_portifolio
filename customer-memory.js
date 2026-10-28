(function(){
"use strict";
if(window.GNG_CUSTOMER_MEMORY)return;
const KEY="veltro_demo_customer_contact_v1",TTL=90*86400000;
let checkbox=null,forget=null,nameInput=null,phoneInput=null;
const t={
"pt-BR":["Lembrar meus dados neste dispositivo","Na próxima visita, seu nome e telefone poderão ser preenchidos neste navegador. Outras pessoas usando este perfil poderão vê-los.","Esquecer meus dados deste dispositivo","Dados apagados deste navegador.","Política de Privacidade"],
en:["Remember my details on this device","Your name and phone may be filled in next time on this browser. Others using this browser profile may see them.","Forget my details on this device","Data deleted from this browser.","Privacy Policy"],
es:["Recordar mis datos en este dispositivo","Tu nombre y teléfono podrán completarse la próxima vez en este navegador. Otras personas que usen este perfil podrán verlos.","Olvidar mis datos de este dispositivo","Datos eliminados de este navegador.","Política de Privacidad"],
ja:["この端末に連絡先を保存する","次回このブラウザーでお名前と電話番号を自動入力できます。同じブラウザープロフィールを使う人にも表示されます。","この端末の保存データを削除","このブラウザーから削除しました。","プライバシーポリシー"],
de:["Meine Angaben auf diesem Gerät merken","Name und Telefonnummer können beim nächsten Besuch im Browser vorausgefüllt werden. Andere Nutzer dieses Browserprofils können sie sehen.","Meine Daten auf diesem Gerät löschen","Daten aus diesem Browser gelöscht.","Datenschutzerklärung"]
};
const tr=i=>(t[window.GNG_I18N?.getLocale?.()]||t["pt-BR"])[i];
const digits=v=>String(v||"").replace(/[^0-9]/g,"");
function valid(name,phone){const p=digits(phone);return name.trim().length>=2&&name.trim().length<=80&&/^(\d{10,11}|55\d{10,11})$/.test(p)}
function read(){
try{
 const raw=JSON.parse(localStorage.getItem(KEY)||"null");
 if(raw?.version===1&&typeof raw.name==="string"&&typeof raw.phone==="string"&&
 Number.isFinite(raw.savedAt)&&raw.savedAt<=Date.now()&&Date.now()-raw.savedAt<TTL&&valid(raw.name,raw.phone))return raw;
 localStorage.removeItem(KEY);
}catch(e){}return null
}
function erase(clearInputs){
try{localStorage.removeItem(KEY)}catch(e){}
if(checkbox)checkbox.checked=false;
if(forget)forget.hidden=true;
if(clearInputs){if(nameInput)nameInput.value="";if(phoneInput)phoneInput.value="";
[nameInput,phoneInput].forEach(el=>el?.dispatchEvent(new Event("input",{bubbles:true})))}
}
function render(){
const root=document.getElementById("gng-remember-controls");if(!root)return;
root.querySelector("[data-memory-text='label']").textContent=tr(0);
root.querySelector("[data-memory-text='hint']").textContent=tr(1);
root.querySelector("[data-memory-text='forget']").textContent=tr(2);
root.querySelector("[data-memory-text='privacy']").textContent=tr(4);
}
function insert(){
if(document.getElementById("gng-remember-controls"))return;
nameInput=document.getElementById("booking-customer-name");phoneInput=document.getElementById("booking-customer-phone");
if(!nameInput||!phoneInput)return;
const step=nameInput.closest(".booking-step")||nameInput.closest(".booking-customer-grid")?.parentElement;
if(!step)return;
const wrapper=document.createElement("div");wrapper.id="gng-remember-controls";wrapper.className="gng-remember-controls";
wrapper.innerHTML='<label class="gng-remember-check"><input type="checkbox" id="gng-remember-customer"><span data-memory-text="label"></span></label>'+
'<p data-memory-text="hint"></p><a href="privacidade.html#dados-locais" target="_blank" rel="noopener noreferrer" data-memory-text="privacy"></a>'+
'<button type="button" id="gng-forget-customer" hidden data-memory-text="forget"></button>';
step.appendChild(wrapper);
checkbox=wrapper.querySelector("#gng-remember-customer");
forget=wrapper.querySelector("#gng-forget-customer");
const saved=read();
if(saved){
 nameInput.value=saved.name;
 phoneInput.value=saved.phone;
 checkbox.checked=true;
 forget.hidden=false;
 [nameInput,phoneInput].forEach(el=>el.dispatchEvent(new Event("input",{bubbles:true})));
}
checkbox.addEventListener("change",()=>{if(!checkbox.checked)erase(false)});
forget.addEventListener("click",()=>erase(true));
render();
}
function saveAfterSuccess(name,phone){
if(!checkbox?.checked||!valid(name,phone))return;
const payload={version:1,name:String(name).trim().slice(0,80),phone:digits(phone).slice(0,13),savedAt:Date.now()};
try{
 localStorage.setItem(KEY,JSON.stringify(payload));
 if(forget)forget.hidden=false;
}catch(e){}
}
window.GNG_CUSTOMER_MEMORY={read,erase,insert,saveAfterSuccess,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",insert,{once:true});else insert();
window.addEventListener("gng:locale-changed",render);
window.addEventListener("gng:booking-created",e=>{
 const d=e.detail||{};saveAfterSuccess(d.name,d.phone)
});
})();