const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {updateSeoMarkup}=require("../scripts/sync-seo.cjs");
const source=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
const settings={
  business_name:"Barbearia Exemplo & Filhos",
  address:"Rua Exemplo, 15 < Loja A",
  phone_display:"(61) 98765-4321",
  whatsapp_digits:"5561987654321",
  open_weekdays:[1,2,3,4,5,6],
  open_time:"08:30",close_time:"18:00",
  logo_url:"https://example.com/logo.webp"
};
const result=updateSeoMarkup(source,settings);
assert.match(result,/<title>Barbearia Exemplo &amp; Filhos \| Agendamento<\/title>/);
assert.match(result,/Rua Exemplo, 15 &lt; Loja A/);
assert.match(result,/content="https:\/\/example.com\/logo.webp"/);
const match=result.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(match);
const json=JSON.parse(match[1]);
assert.equal(json.name,settings.business_name);
assert.equal(json.telephone,"+5561987654321");
assert.deepEqual(json.openingHoursSpecification[0].dayOfWeek,
  ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]);
assert.equal(json.openingHoursSpecification[0].opens,"08:30");
assert.match(result,/De segunda a sábado · 08:30–18:00/);
assert.doesNotMatch(result,/Monday, Tuesday, Wednesday/);
assert.ok(!json.openingHoursSpecification[0].dayOfWeek.includes("Sunday"));
assert.equal(updateSeoMarkup(result,settings),result,"Idempotent synchronization");
assert.throws(()=>updateSeoMarkup(source,null),/Missing verified/);
console.log("PASS SEO: static metadata follows verified settings, escapes HTML and is idempotent");
