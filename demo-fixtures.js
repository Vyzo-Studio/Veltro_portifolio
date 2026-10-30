/* VELTRO — fictional, browser-local DEMONSTRATION data.
 * No credentials, no real customers, no production Supabase calls.
 * These records are NOT shared between browsers and are NOT confirmed appointments.
 */
(function(){
"use strict";
const KEY="veltro_demo_bookings_v1",LIMIT=35;
// Restored historical 13-service catalogue; shared by live demo table and booking form.
const services=[
  [
    "Barba",
    2500,
    20,
    "Acabamento de barba, contornos e alinhamento."
  ],
  [
    "Corte",
    3000,
    20,
    "Corte masculino clássico ou contemporâneo."
  ],
  [
    "Corte + Barba",
    5500,
    40,
    "Cabelo e barba na mesma sessão."
  ],
  [
    "Corte + Graxa",
    5000,
    40,
    "Corte com finalização usando graxa capilar."
  ],
  [
    "Corte + Hidratação",
    4500,
    20,
    "Corte com cuidado hidratante capilar."
  ],
  [
    "Corte + Sobrancelha",
    4000,
    20,
    "Corte e alinhamento de sobrancelhas."
  ],
  [
    "Corte + Barba + Sobrancelha",
    6500,
    40,
    "Conjunto de corte, barba e sobrancelhas."
  ],
  [
    "Corte + Barba + Sobrancelha + Limpeza de Pele",
    11000,
    80,
    "Experiência completa com cuidados de pele."
  ],
  [
    "Corte + Bigode",
    4000,
    20,
    "Corte e modelagem de bigode."
  ],
  [
    "Corte + Bigode + Sobrancelha",
    4500,
    20,
    "Corte, bigode e sobrancelhas."
  ],
  [
    "Corte + Sobrancelha + Limpeza de Pele",
    8500,
    40,
    "Corte, sobrancelhas e limpeza de pele."
  ],
  [
    "Graxa",
    2000,
    20,
    "Finalização capilar com graxa."
  ],
  [
    "Limpeza de Pele",
    5000,
    20,
    "Higienização e cuidados de pele."
  ]
].map((x,i)=>({id:"service-demo-"+(i+1),name:x[0],price_cents:x[1],duration_minutes:x[2],description:x[3],sort_order:i+1,active:true}));
const barbers=[
{id:"11111111-2222-4333-8444-111111111111",name:"Leo Avelar (personagem fictício)",active:true,sort_order:1},
{id:"11111111-2222-4333-8444-222222222222",name:"Noah Vilar (personagem fictício)",active:true,sort_order:2}
];
const images=[
{id:"photo-demo-1",kind:"portfolio",sort_order:1,active:true,url:"https://images.unsplash.com/photo-1747832910187-f27508ac4c60?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1747832910187-f27508ac4c60?auto=format&fit=crop&w=1100&q=78",caption:"Precisão em cada movimento",alt_text:"Atendimento de corte com barbeiro e cliente em luz quente, fotografia ilustrativa.",credit:"mehdi pezhvak",credit_url:"https://unsplash.com/photos/a-barber-is-cutting-hair-in-a-salon-NATMVNvlB_c",category:"ofício"},
{id:"photo-demo-2",kind:"portfolio",sort_order:2,active:true,url:"https://images.unsplash.com/photo-1514336937476-a5b961020a5c?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1514336937476-a5b961020a5c?auto=format&fit=crop&w=1100&q=78",caption:"Corte clássico",alt_text:"Barbeiro realizando corte de cabelo com atenção aos detalhes, fotografia ilustrativa.",credit:"Chris Knight",credit_url:"https://unsplash.com/photos/person-trimming-mans-hair-vI3m5UnZ0aQ",category:"técnica"},
{id:"photo-demo-3",kind:"portfolio",sort_order:3,active:true,url:"https://images.unsplash.com/photo-1599011176306-4a96f1516d4d?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1599011176306-4a96f1516d4d?auto=format&fit=crop&w=1100&q=78",caption:"Contorno de barba",alt_text:"Barbeiro aparando barba com tesoura, fotografia de atendimento ilustrativo.",credit:"Mr Shave",credit_url:"https://unsplash.com/photos/barber-trimming-beard-in-salon-4k60yfGy7fU",category:"barba"},
{id:"photo-demo-4",kind:"portfolio",sort_order:4,active:true,url:"https://images.unsplash.com/photo-1761931403671-d020a14928d9?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1761931403671-d020a14928d9?auto=format&fit=crop&w=1100&q=78",caption:"Tesoura e precisão",alt_text:"Profissional usando pente e tesoura para cortar cabelo, fotografia ilustrativa.",credit:"Josh Marty",credit_url:"https://unsplash.com/photos/barber-cutting-hair-with-scissors-and-comb-sdh4g0H-uXg",category:"técnica"},
{id:"photo-demo-5",kind:"portfolio",sort_order:5,active:true,url:"https://images.unsplash.com/photo-1768363646793-d58847947aec?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1768363646793-d58847947aec?auto=format&fit=crop&w=1100&q=78",caption:"Máquina em ação",alt_text:"Barbeiro trabalhando com máquina de cortar cabelo, fotografia ilustrativa.",credit:"Kristina Goncharova",credit_url:"https://unsplash.com/photos/barber-cutting-hair-with-clippers-in-a-salon-pO49qpbotvA",category:"corte"},
{id:"photo-demo-6",kind:"portfolio",sort_order:6,active:true,url:"https://images.unsplash.com/photo-1747830280502-f33d7305a714?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1747830280502-f33d7305a714?auto=format&fit=crop&w=1100&q=78",caption:"Detalhe de corte",alt_text:"Close de barbeiro trabalhando cabelo, fotografia documental ilustrativa.",credit:"mehdi pezhvak",credit_url:"https://unsplash.com/photos/a-barber-cuts-someones-hair-in-a-barbershop-dhHnyxdNS0k",category:"corte"},
{id:"photo-demo-7",kind:"portfolio",sort_order:7,active:true,url:"https://images.unsplash.com/photo-1770253980732-dfed1cfdfa43?auto=format&fit=crop&w=1100&q=78",image_url:"https://images.unsplash.com/photo-1770253980732-dfed1cfdfa43?auto=format&fit=crop&w=1100&q=78",caption:"Cuidado personalizado",alt_text:"Barbeiro com máquina de cortar cabelo em atendimento, fotografia ilustrativa.",credit:"Siednji Leon",credit_url:"https://unsplash.com/photos/barber-cutting-clients-hair-with-clippers-N9nFgunCLAc",category:"técnica"},
{id:"photo-demo-8",kind:"interior",sort_order:8,active:true,url:"https://images.unsplash.com/photo-1781455793310-8427c96454c7?auto=format&fit=crop&w=1200&q=75",image_url:"https://images.unsplash.com/photo-1781455793310-8427c96454c7?auto=format&fit=crop&w=1200&q=75",caption:"Espaço de referência • não é unidade real",alt_text:"Interior de barbearia com espelhos e cadeiras, ambientação ilustrativa.",credit:"Barney Goodman",credit_url:"https://unsplash.com/photos/an-empty-barbershop-interior-with-several-chairs-and-mirrors-AXurvQTtO3Y",category:"ambiente"},
{id:"photo-demo-9",kind:"exterior",sort_order:9,active:true,url:"https://images.unsplash.com/photo-1702865272115-5afdbae975af?auto=format&fit=crop&w=1200&q=75",image_url:"https://images.unsplash.com/photo-1702865272115-5afdbae975af?auto=format&fit=crop&w=1200&q=75",caption:"Arquitetura e atmosfera • referência",alt_text:"Ambiente de barbearia com cadeira e espelho, fotografia de referência sem vínculo com a VELTRO.",credit:"Redd Francisco",credit_url:"https://unsplash.com/photos/a-barber-shop-with-a-chair-and-a-mirror-BBGyxhtPpC0",category:"ambiente"},
{id:"photo-demo-10",kind:"interior",sort_order:10,active:true,url:"https://images.unsplash.com/photo-1775494165568-42c0fbb4c782?auto=format&fit=crop&w=1200&q=75",image_url:"https://images.unsplash.com/photo-1775494165568-42c0fbb4c782?auto=format&fit=crop&w=1200&q=75",caption:"Herança do ofício • referência editorial",alt_text:"Cadeira de barbeiro vintage iluminada por luz natural, ambiente ilustrativo.",credit:"Ten",credit_url:"https://unsplash.com/photos/vintage-barber-chair-bathed-in-sunlight-near-doorway-4y50IXfnaIo",category:"ambiente"}
];
const settings={
business_name:"VELTRO — Barber Atelier",phone_display:"+55 61 8515-4156",whatsapp_digits:"556185154156",
address:"Endereço fictício — sem atendimento presencial",maps_url:"",
open_time:"09:00",close_time:"19:30",open_weekdays:[1,2,3,4,5,6],slot_interval_minutes:30,
primary_color:"#172A43",secondary_color:"#0C1523",accent_color:"#C38B4E",
logo_url:"assets/veltro-logo-dark.svg",instagram_url:"",
site_texts:{
hero_title:"PRESENÇA",hero_subtitle:"COMEÇA NO CUIDADO.",
hero_lead:"Corte, barba e cuidados masculinos em uma experiência digital de precisão. Conceito fictício desenvolvido pela VYZO Studio.",
services_title:"Serviços do conceito",services_intro:"Valores fictícios — apenas demonstração, sem contratação.",
portfolio_title:"Direção criativa",portfolio_intro:"Fotografias licenciadas e ilustrativas, sem vínculo com estabelecimento real.",
space_title:"Um ambiente imaginado",space_intro:"Imagens de referência: a VELTRO não possui endereço ou unidade física.",
memberships_title:"Assinaturas de exemplo",memberships_intro:"Planos demonstrativos sem cobrança ou contratação.",
location_title:"Um conceito, não um endereço",final_cta_title:"IMAGINE ESSA EXPERIÊNCIA COM A IDENTIDADE DO SEU NEGÓCIO.",final_cta_text:"Design personalizado, agendamento digital e ferramentas de gestão em uma solução desenvolvida para a sua empresa."
}};
function read(){
 try{const value=JSON.parse(sessionStorage.getItem(KEY)||"[]");return Array.isArray(value)?value.filter(x=>x&&typeof x==="object").slice(-LIMIT):[]}
 catch(e){return []}
}
function write(items){try{sessionStorage.setItem(KEY,JSON.stringify(items.slice(-LIMIT)))}catch(e){}}
function todayISO(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function onlyTime(value){return String(value||"").slice(0,5)}
function locked(barberId,date,time,minutes,existing){
 const end=(t,delta)=>{const a=t.split(":").map(Number);return a[0]*60+a[1]+delta};
 const begin=end(onlyTime(time),0),finish=begin+minutes;
 return existing.some(x=>x.barber_id===barberId&&x.booking_date===date&&x.status!=="cancelled"
  &&end(x.booking_time,0)<finish&&end(x.booking_time,x.duration_minutes)>begin);
}
async function rpc(name,payload={}){
 switch(name){
 case "get_public_site_config":return {settings:{...settings},services:services.map(x=>({...x})),gallery:images.map(x=>({...x}))};
 case "get_public_barbers":return barbers.map(x=>({...x}));
 case "get_public_unavailable_slots_by_barber":
   return read().filter(x=>x.barber_id===payload.p_barber_id && x.status!=="cancelled" && x.booking_date>=payload.p_start_date&&x.booking_date<=payload.p_end_date)
      .map(x=>({booking_date:x.booking_date,booking_time:x.booking_time,slot_status:"demo_reserved"}));
 case "create_booking_request_by_barber_privacy_v1": {
   if(payload.p_privacy_acknowledged!==true)throw Error("É necessário ler a política de privacidade.");
   const service=services.find(x=>x.name===payload.p_service);
   if(!service||service.active===false||!barbers.some(x=>x.id===payload.p_barber_id&&x.active!==false))throw Error("Serviço ou profissional demonstrativo inválido.");
   const date=String(payload.p_booking_date||""),time=onlyTime(payload.p_booking_time);
   if(!/^\d{4}-\d\d-\d\d$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error("Selecione uma data e hora válidas.");
   const day=new Date(date+"T12:00:00Z").getUTCDay();
   if(day===0)throw Error("A demonstração não oferece horários aos domingos.");
   const parsed=new Date(date+"T12:00:00Z");
   if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)
     throw Error("Data demonstrativa inválida.");
   if(date<todayISO())throw Error("Não é possível simular agendamentos em datas passadas.");
   const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
   const open=minutes(settings.open_time),close=minutes(settings.close_time),start=minutes(time);
   if(start<open||start+service.duration_minutes>close||(start-open)%settings.slot_interval_minutes!==0)
     throw Error("O horário não respeita o funcionamento, intervalo e duração do serviço.");
   const records=read();if(locked(payload.p_barber_id,date,time,service.duration_minutes,records))throw Error("Horário já utilizado nesta sessão demonstrativa.");
   const rec={id:"demo-"+Date.now(),booking_date:date,booking_time:time,barber_id:payload.p_barber_id,service:service.name,
     duration_minutes:service.duration_minutes,status:"demo_only",created_at:new Date().toISOString()};
   records.push(rec);write(records);return rec.id;
 }
 default:throw Error("Esta operação só estará disponível após a configuração do Supabase exclusivo da demonstração.");
 }
}
window.VELTRO_DEMO={active:true,backend:"browser_session_only",settings,services,barbers,gallery:images,read,rpc};
})();