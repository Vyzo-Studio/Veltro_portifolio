"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const files=["index.html","admin.html","config.js","script.js","site-data.js","legal-contact.js","privacidade.html","termos.html","legal-i18n.js","admin-business.js","admin-notifications.js","i18n.js"];
for(const name of files){
 const text=fs.readFileSync(path.join(root,name),"utf8");
 for(const [regex,label] of [
 [/ueqfokfnjsjgocotvdae/i,"original database ID"],[/99407-5539|5561994075539/,"original telephone"],
 [/gngbarbearia/i,"original social username"],[/GNG Barbearia|GNG BARBEARIA/,"original company name"],
 [/gng-corte-|logo-gng\.jpg|gng-logo-header-dark/i,"original photographs and logo"],
 [/St\. M QNM|Ceilândia/i,"original physical location"]
 ])assert(!regex.test(text),name+": "+label+" still present");
}
const page=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert.match(page,/PROJETO DEMONSTRATIVO/);
assert.match(page,/VELTRO Barber Atelier/);
assert.match(page,/demo-fixtures\.js/);
assert.match(page,/Quero um site como este/i);
assert.doesNotMatch(page,/<iframe[\s\S]*?google\.com\/maps/);
assert.doesNotMatch(page,/"@type"\s*:\s*"Barbershop"/);
assert.match(page,/"@type"\s*:\s*"CreativeWork"/);
assert.match(page,/noindex,nofollow/);
const admin=fs.readFileSync(path.join(root,"admin.html"),"utf8");
assert.match(admin,/VELTRO BARBER ATELIER/);
assert.doesNotMatch(admin,/ueqfokfnjsjgocotvdae/);
const backend=fs.readFileSync(path.join(root,"demo-backend-config.js"),"utf8");
assert.match(backend,/ready:\s*false/);
const script=fs.readFileSync(path.join(root,"script.js"),"utf8");
assert.match(script,/window\.VELTRO_DEMO\.rpc/);
const store=new Map();
const win={};
const context={window:win,sessionStorage:{
 getItem:key=>store.has(key)?store.get(key):null,
 setItem:(k,v)=>store.set(k,String(v))
},Date,Intl,JSON,Error,Array,Boolean,String,Number,Math};
vm.runInNewContext(fs.readFileSync(path.join(root,"demo-fixtures.js"),"utf8"),context);
const demo=win.VELTRO_DEMO;
assert.equal(demo.active,true);
assert.equal(demo.services.length,13);
assert.equal(demo.barbers.length,2);
assert(demo.services.every(x=>x.price_cents>0&&x.duration_minutes>0));
(async()=>{
const list=await demo.rpc("get_public_site_config");
assert.equal(list.settings.business_name,"VELTRO — Barber Atelier");
const barber=demo.barbers[0].id;
const testDate="2026-10-29"; // Thursday, calendar-independent regression.
const params={p_privacy_acknowledged:true,p_barber_id:barber,p_service:"Corte Essencial",
 p_booking_date:testDate,p_booking_time:"10:00",p_customer_name:"Pessoa Fictícia",p_customer_phone:"61999999999"};
await demo.rpc("create_booking_request_by_barber_privacy_v1",params);
assert.equal(demo.read().length,1);
assert(!store.get("veltro_demo_bookings_v1").includes("Pessoa Fictícia"),"no personally identifying content in simulated booking record");
await assert.rejects(()=>demo.rpc("create_booking_request_by_barber_privacy_v1",params),/Horário/);
await assert.rejects(()=>demo.rpc("create_booking_request_by_barber_privacy_v1",{...params,p_booking_date:"2026-11-01"}),/domingos/);
await assert.rejects(()=>demo.rpc("admin_cash_summary"),/Supabase exclusivo/);
console.log("PASS — VELTRO identity, no production Supabase, local demo bookings, fictional records, Sunday rejection and safe admin boundary");
})().catch(e=>{console.error(e);process.exitCode=1});