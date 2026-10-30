/* VELTRO V4 — progressive enhancement only. No booking, payment or auth changes. */
(function(){
 "use strict";
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 const translations={
  "pt-BR":{all:"Todos",cut:"Cortes",beard:"Barba",craft:"Técnica",other:"Ofício",expand:"Ampliar fotografia",close:"Fechar fotografia",credit:"Foto ilustrativa",preview:"Explorar portfólio"},
  en:{all:"All",cut:"Haircuts",beard:"Beards",craft:"Technique",other:"Craft",expand:"Expand photograph",close:"Close photograph",credit:"Illustrative photo",preview:"Explore portfolio"},
  es:{all:"Todos",cut:"Cortes",beard:"Barba",craft:"Técnica",other:"Oficio",expand:"Ampliar fotografía",close:"Cerrar fotografía",credit:"Foto ilustrativa",preview:"Explorar portafolio"},
  ja:{all:"すべて",cut:"カット",beard:"ひげ",craft:"技術",other:"職人技",expand:"写真を拡大",close:"写真を閉じる",credit:"イメージ写真",preview:"写真を見る"},
  de:{all:"Alle",cut:"Haarschnitte",beard:"Bart",craft:"Technik",other:"Handwerk",expand:"Foto vergrößern",close:"Foto schließen",credit:"Beispielfoto",preview:"Portfolio ansehen"}
 };
 function locale(){return window.GNG_I18N?.getLocale?.()||"pt-BR"}
 function tr(k){return (translations[locale()]||translations["pt-BR"])[k]}
 const grid=document.querySelector("#portfolio .portfolio-grid");
 const photoList=()=>[...document.querySelectorAll("#portfolio .portfolio-photo")];
 let active="all",galleryObserver=null,lastTrigger=null;
 const galleryMap=()=>new Map((window.VELTRO_DEMO?.gallery||[]).filter(item=>item.kind==="portfolio").map(item=>[String(item.image_url||item.url||"").split("?")[0],item]));
 function records(){
   const map=galleryMap();
   return photoList().map((el,index)=>{
    const img=el.querySelector("img"),src=img?.getAttribute("src")||"";
    const item=map.get(src.split("?")[0])||{};
    const category=String(item.category||"ofício").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const tag=category==="corte"?"cut":category==="barba"?"beard":category==="tecnica"?"craft":"other";
    return {el,img,src,item,tag,index};
   });
 }
 function modal(){
  let dialog=document.getElementById("veltro-photo-dialog");
  if(dialog)return dialog;
  dialog=document.createElement("dialog");dialog.id="veltro-photo-dialog";dialog.className="veltro-photo-dialog";
  const close=document.createElement("button");close.type="button";close.className="veltro-photo-close";close.dataset.photoClose="";close.textContent="×";
  const picture=document.createElement("img");picture.alt="";picture.decoding="async";
  const title=document.createElement("strong");const caption=document.createElement("p");
  const footer=document.createElement("div");footer.className="veltro-photo-meta";const source=document.createElement("a");source.className="veltro-photo-source";source.target="_blank";source.rel="noopener noreferrer";source.textContent="Unsplash";footer.append(title,caption,source);
  dialog.append(close,picture,footer);
  close.addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{lastTrigger?.focus();picture.removeAttribute("src")});
  document.body.append(dialog);return dialog;
 }
 function expand(item,trigger){
  const dialog=modal(),img=dialog.querySelector("img");
  if(!item.img||!item.src)return;
  lastTrigger=trigger;
  img.src=item.src;img.alt=item.img.alt;
  dialog.querySelector(".veltro-photo-meta strong").textContent=item.item.caption||item.img.alt;
  dialog.querySelector(".veltro-photo-meta p").textContent=[tr("credit"),item.item.credit].filter(Boolean).join(" • ");
  const sourceLink=dialog.querySelector(".veltro-photo-source");const original=String(item.item.credit_url||"");
  const valid=/^https:\/\/unsplash\.com\/photos\/[a-zA-Z0-9_-]+(?:-[a-zA-Z0-9_-]+)*$/i.test(original);
  sourceLink.hidden=!valid;if(valid)sourceLink.href=original;else sourceLink.removeAttribute("href");
  const close=dialog.querySelector(".veltro-photo-close");close.setAttribute("aria-label",tr("close"));
  if(typeof dialog.showModal==="function")dialog.showModal();
 }
 function applyFilter(){
   records().forEach(record=>{record.el.hidden=active!=="all"&&record.tag!==active});
   document.querySelectorAll("[data-veltro-filter]").forEach(button=>{
    const selected=button.dataset.veltroFilter===active;button.setAttribute("aria-pressed",String(selected));
   });
 }
 function filters(){
  if(!grid)return;
  const existing=document.querySelector(".veltro-gallery-filters");
  if(existing){existing.remove()}
  const nav=document.createElement("div");nav.className="veltro-gallery-filters";nav.setAttribute("role","group");nav.setAttribute("aria-label",tr("preview"));
  for(const [key,label] of [["all","all"],["cut","cut"],["beard","beard"],["craft","craft"],["other","other"]]){
   const button=document.createElement("button");button.type="button";button.dataset.veltroFilter=key;
   button.textContent=tr(label);button.addEventListener("click",()=>{active=key;applyFilter()});nav.append(button);
  }
  grid.parentElement.insertBefore(nav,grid);
  const available=new Set(records().map(r=>r.tag));
  nav.querySelectorAll("button").forEach(b=>{
   b.hidden=b.dataset.veltroFilter!=="all"&&!available.has(b.dataset.veltroFilter);
  });
  if(active!=="all"&&!available.has(active))active="all";
  applyFilter();
 }
 function enhanceGallery(){
   if(!grid)return;
   records().forEach(item=>{
    if(!item.img||item.el.querySelector(".veltro-photo-expand"))return;
    const button=document.createElement("button");
    button.type="button";button.className="veltro-photo-expand";
    button.setAttribute("aria-label",tr("expand")+": "+(item.item.caption||item.img.alt));
    button.title=tr("expand");button.addEventListener("click",()=>expand(item,button));
    item.el.append(button);
    item.el.dataset.category=item.tag;
   });
   filters();scanReveals();
 }
 function watchHeader(){
  const header=document.querySelector(".site-header");if(!header)return;
  const sync=()=>header.classList.toggle("veltro-header-scrolled",window.scrollY>18);
  window.addEventListener("scroll",sync,{passive:true});sync();
  if(!("IntersectionObserver" in window))return;
  const links=[...document.querySelectorAll(".main-nav a[href^='#']")];
  const bySection=new Map(links.map(a=>[a.getAttribute("href").slice(1),a]));
  const sections=[...bySection.keys()].map(id=>document.getElementById(id)).filter(Boolean);
  const observer=new IntersectionObserver(entries=>{
   const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
   if(!visible)return;
   for(const a of links){const selected=a===bySection.get(visible.target.id);a.classList.toggle("veltro-nav-active",selected);if(selected)a.setAttribute("aria-current","location");else a.removeAttribute("aria-current")}
  },{rootMargin:"-18% 0px -58% 0px",threshold:0});
  sections.forEach(s=>observer.observe(s));
 }
 function scanReveals(){
  if(reduced.matches||!("IntersectionObserver" in window))return;
  if(!galleryObserver){
   galleryObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("veltro-revealed");galleryObserver.unobserve(entry.target)}});
   },{threshold:.09,rootMargin:"0px 0px -20px 0px"});
  }
  document.querySelectorAll(".section-head, .benefits > div, .plan-card, .portfolio-photo, .space-card, .veltro-identity, .veltro-tech-showcase, .veltro-faq, .final-cta-inner").forEach(el=>{
   if(el.classList.contains("veltro-reveal"))return;
   el.classList.add("veltro-reveal");galleryObserver.observe(el);
  });
 }

 // Progressive category navigation: preserve original table rows and booking event handlers.
 const serviceWords={
  "pt-BR":["Todos","Cortes","Barba","Combinações","Cuidados","Filtrar serviços","Serviço","Profissional","Data","Horário"],
  en:["All","Haircuts","Beard","Combos","Care","Filter services","Service","Barber","Date","Time"],
  es:["Todos","Cortes","Barba","Combinaciones","Cuidados","Filtrar servicios","Servicio","Profesional","Fecha","Hora"],
  ja:["すべて","カット","ひげ","セット","ケア","サービスを絞り込む","サービス","担当者","日付","時間"],
  de:["Alle","Haarschnitte","Bart","Kombinationen","Pflege","Leistungen filtern","Leistung","Barber","Datum","Uhrzeit"]
 };
 const categoryKeys=["all","cuts","beard","combos","care"];
 let selectedCategory="all",serviceFilterBar=null;
 function serviceWordsForLocale(){return serviceWords[locale()]||serviceWords["pt-BR"]}
 function groupFor(name){
   const value=String(name||"").toLowerCase();
   if(value.includes("+"))return "combos";
   if(value==="corte")return "cuts";
   if(value==="barba")return "beard";
   return "care";
 }
 function serviceRows(){return [...document.querySelectorAll("#servicos .price-table tbody tr")].filter(row=>row.querySelector(".table-action a"))}
 function serviceCategoryMap(){
   const configured=window.VELTRO_DEMO?.services||[];
   const names=configured.map(x=>x.name);
   return serviceRows().map((row,i)=>{
     const serviceName=row.querySelector("[data-dynamic-service-link]")?.getAttribute("data-dynamic-service-link")||
       row.querySelector("[data-service-link]")?.getAttribute("data-service-link")||names[i]||
       row.querySelector("td")?.textContent?.trim()||"";
     return {row,group:groupFor(serviceName)};
   });
 }
 function applyServiceFilter(){
   const rows=serviceCategoryMap();
   const mobileToggle=document.getElementById("mobile-services-toggle");
   if(selectedCategory==="all"){
     for(const {row} of rows){row.hidden=false;}
   }else{
     for(const {row,group} of rows){row.hidden=group!==selectedCategory;}
   }
   // The old mobile "show more" control conflicts with accessible category tabs.
   if(mobileToggle){mobileToggle.hidden=true;mobileToggle.style.display="none";}
   serviceFilterBar?.querySelectorAll("button").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.serviceCategory===selectedCategory)));
   const hint=document.querySelector("#servicos .veltro-service-status");if(hint){const count=rows.filter(x=>!x.row.hidden).length;hint.textContent=String(count)+" / "+String(rows.length); }
 }
 function initServiceFilters(){
   const section=document.getElementById("servicos"),target=section?.querySelector(".price-table-shell");
   if(!target||!serviceRows().length)return;
   if(!serviceFilterBar){
     serviceFilterBar=document.createElement("div");
     serviceFilterBar.className="veltro-service-filters";
     serviceFilterBar.setAttribute("role","group");
     target.parentElement.insertBefore(serviceFilterBar,target);
     const count=document.createElement("span");count.className="veltro-service-status";count.setAttribute("role","status");count.setAttribute("aria-live","polite");serviceFilterBar.appendChild(count);
   }
   serviceFilterBar.setAttribute("aria-label",serviceWordsForLocale()[5]);
   const words=serviceWordsForLocale();
   const countElement=serviceFilterBar.querySelector(".veltro-service-status");
   serviceFilterBar.replaceChildren(...categoryKeys.map((key,i)=>{
      const button=document.createElement("button");
      button.type="button";button.dataset.serviceCategory=key;button.textContent=words[i];
      button.addEventListener("click",()=>{selectedCategory=key;applyServiceFilter();});
      return button;
   }));
   if(countElement)serviceFilterBar.appendChild(countElement);
   applyServiceFilter();
 }
 let bookingObserver=null;
 function initBookingProgress(){
   const booking=document.getElementById("agendamento"),steps=booking?.querySelector(".booking-main");
   if(!steps)return;
   let progress=booking.querySelector(".veltro-booking-progress");
   if(!progress){
     progress=document.createElement("div");
     progress.className="veltro-booking-progress";
     progress.setAttribute("role","group");
     progress.setAttribute("aria-label","Etapas do agendamento");
     const layout=booking.querySelector(".booking-layout");
     layout?.parentElement.insertBefore(progress,layout);
   }
   const labels=serviceWordsForLocale().slice(6);
   progress.replaceChildren(...labels.map((label,i)=>{
     const span=document.createElement("span");span.textContent=(i+1)+". "+label;
     span.dataset.bookingProgress=String(i+1);return span;
   }));
   function sync(){
     const hasService=Boolean(document.getElementById("booking-service")?.value);
     const hasBarber=Boolean(document.getElementById("booking-barber")?.value);
     const hasDate=Boolean(booking.querySelector("#booking-days [aria-pressed='true']"));
     const hasTime=Boolean(booking.querySelector("#booking-times [aria-pressed='true']"));
     const done=[hasService,hasBarber,hasDate,hasTime];
     const current=Math.min(3,Math.max(0,done.findIndex(v=>!v)===-1?3:done.findIndex(v=>!v)));
     progress.querySelectorAll("span").forEach((el,i)=>{
       el.classList.toggle("is-complete",i<current);
       el.classList.toggle("is-active",i===current);
     });
   }
   booking.addEventListener("change",sync,{capture:true});
   booking.addEventListener("click",()=>requestAnimationFrame(sync),{capture:true});
   if(!bookingObserver){
     bookingObserver=new MutationObserver(sync);
     bookingObserver.observe(steps,{attributes:true,childList:true,subtree:true,attributeFilter:["aria-pressed"]});
   }
   sync();
 }

 function init(){watchHeader();enhanceGallery();initServiceFilters();initBookingProgress();scanReveals();window.addEventListener("resize",applyServiceFilter,{passive:true});}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
 window.addEventListener("gng:site-data-ready",()=>{enhanceGallery();initServiceFilters();initBookingProgress();});
 window.addEventListener("gng:locale-changed",()=>{enhanceGallery();initServiceFilters();initBookingProgress();});
})();
