"use strict";
const fs = require("node:fs");
const path = require("node:path");

// Schema.org requires English weekday values; visible descriptions must remain pt-BR.
const DAYS = {1:"Monday",2:"Tuesday",3:"Wednesday",4:"Thursday",5:"Friday",6:"Saturday",7:"Sunday"};
const DAYS_PT = {1:"segunda-feira",2:"terça-feira",3:"quarta-feira",4:"quinta-feira",5:"sexta-feira",6:"sábado",7:"domingo"};
function businessDaysLabel(days) {
  if (!days.length) return "";
  if (days.join(",")==="1,2,3,4,5,6") return "De segunda a sábado";
  if (days.join(",")==="1,2,3,4,5,6,7") return "Todos os dias";
  return "Atendimento: " + days.map(day=>DAYS_PT[day]).join(", ");
}
const BASE = "https://vyzo-studio.github.io/Veltro_portifolio/";
function escapeAttr(value) {
  return String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;")
    .replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function safeText(value, fallback) {
  const cleaned=String(value == null ? "" : value).replace(/[\r\n\t]+/g," ").trim();
  return cleaned || fallback;
}
function escapeJsonForHtml(json) {
  return JSON.stringify(json,null,2).replace(/</g,"\\u003c").replace(/>/g,"\\u003e")
    .replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
}
function updateMeta(html, attribute, name, value) {
  const meta = new RegExp('<meta(?=[\\s>])[^>]*\\b'+attribute+'="'+name+'"[^>]*>','i');
  let count=0;
  const result=html.replace(meta,tag => {
    count++;
    if(!/\bcontent="[^"]*"/.test(tag))throw Error("Missing content in meta: "+name);
    return tag.replace(/\bcontent="[^"]*"/,'content="'+escapeAttr(value)+'"');
  });
  if(count!==1)throw Error("Missing canonical metadata: "+name);
  return result;
}
function updateSeoMarkup(html, settings) {
  if(!settings || typeof settings!=="object")throw Error("Missing verified business settings");
  const name=safeText(settings.business_name,"GNG Barbearia");
  const address=safeText(settings.address,"");
  const phone=String(settings.whatsapp_digits||settings.phone_display||"").replace(/[^0-9]/g,"");
  const phoneE164=phone?("+"+(phone.startsWith("55")?phone:"55"+phone)):"";
  const days=Array.isArray(settings.open_weekdays)
    ? [...new Set(settings.open_weekdays.map(Number))].filter(v=>DAYS[v]).sort()
    : [];
  const opens=/^\d{2}:\d{2}$/.test(settings.open_time||"")?settings.open_time:"";
  const closes=/^\d{2}:\d{2}$/.test(settings.close_time||"")?settings.close_time:"";
  const image=/^https:\/\//i.test(settings.logo_url||"")
    ? settings.logo_url : BASE+"assets/logo-gng.jpg";
  const title=name+" | Agendamento";
  const opening=days.length&&opens&&closes ? businessDaysLabel(days)+" · "+opens+"–"+closes : "";
  const description=[name+": cortes, barba e agendamento presencial.",opening,address].filter(Boolean).join(" ").slice(0,300);
  html=html.replace(/<title>[^<]*<\/title>/i,"<title>"+escapeAttr(title)+"</title>");
  html=updateMeta(html,"name","description",description);
  for(const [kind,key,value] of [
    ["property","og:site_name",name],
    ["property","og:title",title],
    ["property","og:description",description],
    ["property","og:image",image],
    ["property","og:image:alt","Logotipo de "+name],
    ["name","twitter:title",title],
    ["name","twitter:description",description]
  ])html=updateMeta(html,kind,key,value);
  let schema = {
    "@context":"https://schema.org",
    "@type":"Barbershop",
    name, url:BASE, image,
    sameAs:["https://www.instagram.com/gngbarbearia/"],
    ...(phoneE164?{telephone:phoneE164}:{}),
    ...(address?{address:{"@type":"PostalAddress",streetAddress:address,addressCountry:"BR"}}:{}),
    ...(days.length&&opens&&closes?{openingHoursSpecification:[{
      "@type":"OpeningHoursSpecification",
      dayOfWeek:days.map(day=>DAYS[day]),opens,closes
    }]}:{})
  };
  const ld=/(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/i;
  if(!ld.test(html))throw Error("Missing Barbershop JSON-LD block");
  html=html.replace(ld,"$1\n"+escapeJsonForHtml(schema)+"\n  $2");
  return html;
}
function credentials(config) {
  const url=config.match(/const SUPABASE_URL\s*=\s*"([^"]+)"/);
  const key=config.match(/const SUPABASE_PUBLIC_KEY\s*=\s*"([^"]+)"/);
  if(!url||!key)throw Error("Public Supabase URL and publishable key missing from configuration");
  return {url:url[1],key:key[1]};
}
async function loadSettings(configFile) {
  if(process.env.GNG_SEO_CONFIG_JSON)return JSON.parse(process.env.GNG_SEO_CONFIG_JSON);
  const {url,key}=credentials(fs.readFileSync(configFile,"utf8"));
  const timeout=AbortSignal.timeout(12000);
  const response=await fetch(url+"/rest/v1/rpc/get_public_site_config",{
    method:"POST",
    headers:{"apikey":key,"Content-Type":"application/json"},
    body:"{}",signal:timeout
  });
  if(!response.ok)throw Error("Public settings request failed: HTTP "+response.status);
  const result=await response.json();
  if(!result?.settings?.business_name)throw Error("No verified business settings received");
  return result.settings;
}
async function main() {
  const repo=path.resolve(__dirname,"..");
  const settings=await loadSettings(path.join(repo,"config.js"));
  const filepath=path.join(repo,"index.html");
  const old=fs.readFileSync(filepath,"utf8");
  const next=updateSeoMarkup(old,settings);
  if(old!==next) {
    fs.writeFileSync(filepath,next);
    console.log("SEO: metadata refreshed from public Supabase business settings.");
  } else console.log("SEO: crawler-visible metadata already synchronized.");
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={updateSeoMarkup,escapeAttr};
