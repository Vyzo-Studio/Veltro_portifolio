/* VELTRO — fictional, browser-local DEMONSTRATION data.
 * No credentials, no real customers, no production Supabase calls.
 * These records are NOT shared between browsers and are NOT confirmed appointments.
 */
(function(){
"use strict";
const KEY="veltro_demo_bookings_v1",LIMIT=35;
const services=[
["Corte Essencial",3900,35,"Corte clássico com acabamento de precisão."],
["Fade Studio",4500,45,"Degradê personalizado com finalização."],
["Barba Ritual",3500,30,"Modelagem, toalha quente e acabamento."],
["Corte + Barba",7000,70,"Experiência completa de cabelo e barba."],
["Corte Tesoura",4700,45,"Técnica na tesoura e styling."],
["Navalhado",4700,45,"Precisão com acabamento navalhado."],
["Acabamento",1900,20,"Contornos e manutenção do visual."],
["Sobrancelha",1700,15,"Desenho e alinhamento."],
["Hidratação",3000,25,"Tratamento capilar demonstrativo."],
["Camuflagem",5000,45,"Uniformização visual de fios."],
["Pigmentação",3800,35,"Acabamento de cor demonstrativo."],
["Combo Premium",8900,90,"Corte, barba e cuidado especial."],
["Kids Style",3500,30,"Corte infantil com atenção individual."]
].map((x,i)=>({id:"service-demo-"+(i+1),name:x[0],price_cents:x[1],duration_minutes:x[2],description:x[3],sort_order:i+1,active:true}));
const barbers=[
{id:"11111111-2222-4333-8444-111111111111",name:"Leo Avelar (personagem fictício)",active:true,sort_order:1},
{id:"11111111-2222-4333-8444-222222222222",name:"Noah Vilar (personagem fictício)",active:true,sort_order:2}
];
const images=[
{id:"photo-demo-1",kind:"portfolio",sort_order:1,active:true,url:"https://images.unsplash.com/photo-1747832910187-f27508ac4c60?auto=format&fit=crop&w=1000&q=75",image_url:"https://images.unsplash.com/photo-1747832910187-f27508ac4c60?auto=format&fit=crop&w=1000&q=75",caption:"Precisão no corte • imagem ilustrativa",alt_text:"Fotografia ilustrativa de barbeiro em atendimento. Crédito: mehdi pezhvak / Unsplash."},
{id:"photo-demo-2",kind:"portfolio",sort_order:2,active:true,url:"https://images.unsplash.com/photo-1721697956161-f1584fad9d37?auto=format&fit=crop&w=1000&q=75",image_url:"https://images.unsplash.com/photo-1721697956161-f1584fad9d37?auto=format&fit=crop&w=1000&q=75",caption:"Técnica em destaque • imagem ilustrativa",alt_text:"Fotografia ilustrativa de atendimento em barbearia. Crédito: TinPics_ / Unsplash."},
{id:"photo-demo-3",kind:"interior",sort_order:3,active:true,url:"https://images.unsplash.com/photo-1781455793310-8427c96454c7?auto=format&fit=crop&w=1200&q=75",image_url:"https://images.unsplash.com/photo-1781455793310-8427c96454c7?auto=format&fit=crop&w=1200&q=75",caption:"Ambiente conceitual • não é uma loja real",alt_text:"Fotografia ilustrativa de interior de barbearia. Crédito: Barney Goodman / Unsplash."},
{id:"photo-demo-4",kind:"exterior",sort_order:4,active:true,url:"https://images.unsplash.com/photo-1702865272115-5afdbae975af?auto=format&fit=crop&w=1200&q=75",image_url:"https://images.unsplash.com/photo-1702865272115-5afdbae975af?auto=format&fit=crop&w=1200&q=75",caption:"Referência visual • espaço fictício",alt_text:"Fotografia de referência de ambiente de barbearia. Crédito: Redd Francisco / Unsplash."}
];
const settings={
business_name:"VELTRO — Barber Atelier",phone_display:"+55 61 8515-4156",whatsapp_digits:"556185154156",
address:"Endereço fictício — sem atendimento presencial",maps_url:"",
open_time:"09:00",close_time:"19:30",open_weekdays:[1,2,3,4,5,6],slot_interval_minutes:30,
primary_color:"#172A43",secondary_color:"#0C1523",accent_color:"#C38B4E",
logo_url:"assets/veltro-logo-dark.svg",instagram_url:"",
site_texts:{
hero_title:"PRECISÃO",hero_subtitle:"EM CADA DETALHE.",
hero_lead:"Uma experiência fictícia de grooming para apresentar o poder de um site e sistema de gestão criados pela VYZO Studio.",
services_title:"Serviços do conceito",services_intro:"Valores fictícios — apenas demonstração, sem contratação.",
portfolio_title:"Direção criativa",portfolio_intro:"Fotografias licenciadas e ilustrativas, sem vínculo com estabelecimento real.",
space_title:"Um ambiente imaginado",space_intro:"Imagens de referência: a VELTRO não possui endereço ou unidade física.",
memberships_title:"Assinaturas de exemplo",memberships_intro:"Planos demonstrativos sem cobrança ou contratação.",
location_title:"Um conceito, não um endereço",final_cta_title:"Transforme a presença da sua marca.",final_cta_text:"Esta experiência foi desenvolvida pela VYZO Studio. Solicite um projeto para o seu negócio."
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