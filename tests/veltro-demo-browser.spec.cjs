const {test,expect}=require("@playwright/test");
const base="http://127.0.0.1:8765/";
test("VELTRO public site: independent fictional identity and safe demo flow",async({page})=>{
 const seen=[];
 page.on("request",req=>seen.push(req.url()));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await expect(page.getByText("PROJETO DEMONSTRATIVO").first()).toBeVisible();
 expect(await page.title()).toContain("VELTRO");
 await expect(page.locator(".brand img").first()).toHaveAttribute("src","assets/veltro-logo-dark.svg");
 await expect(page.locator(".hero")).toBeVisible();
 await expect.poll(async()=>page.locator("#booking-service option").count()).toBeGreaterThan(6);
 await expect.poll(async()=>page.locator("#booking-barber option").count()).toBeGreaterThan(1);
 expect(seen.filter(x=>x.includes(".supabase.co"))).toEqual([]);
 const config=await page.evaluate(()=>({active:window.VELTRO_DEMO?.active,ready:window.VELTRO_BACKEND?.ready}));
 expect(config).toEqual({active:true,ready:false});
 expect(await page.locator("iframe").count()).toBe(0);
 const preview=await page.evaluate(async()=>{
   const b=window.VELTRO_DEMO;
   return await b.rpc("create_booking_request_by_barber_privacy_v1",{
    p_privacy_acknowledged:true,p_barber_id:b.barbers[0].id,p_service:b.services[0].name,
    p_booking_date:"2026-10-29",p_booking_time:"12:30",p_customer_name:"Nome de exemplo",
    p_customer_phone:"61999999999"
   });
 });
 expect(preview).toMatch(/^demo-/);
 const stored=await page.evaluate(()=>sessionStorage.getItem("veltro_demo_bookings_v1"));
 expect(stored).not.toContain("Nome de exemplo");
 await expect(page.locator(".veltro-demo-ribbon a")).toHaveAttribute("href",/(?:wa\.me\/556185154156|web\.whatsapp\.com\/send\?phone=556185154156)/);
});
test("VELTRO admin login remains protected and disconnected until independent Auth",async({page})=>{
 const endpoints=[];
 page.on("request",req=>{if(req.url().includes(".supabase.co"))endpoints.push(req.url())});
 await page.goto(base+"admin.html",{waitUntil:"domcontentloaded"});
 await expect(page.locator("#admin-login")).toBeVisible();
 await expect(page.locator("#admin-dashboard")).toBeHidden();
 await expect(page.locator(".login-brand-panel img")).toHaveAttribute("src","assets/veltro-logo-light.svg");
 const authorized=await page.evaluate(()=>({client:!!window.supabaseClient,ready:window.VELTRO_BACKEND?.ready}));
 expect(authorized).toEqual({client:false,ready:false});
 expect(endpoints).toEqual([]);
});
for(const width of [320,390,768,1366]){
 test("VELTRO responsive at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(base,{waitUntil:"domcontentloaded"});
  const report=await page.evaluate(()=>{
    const diff=document.documentElement.scrollWidth-window.innerWidth;
    const elements=[...document.body.querySelectorAll("*")].map(el=>{
      const box=el.getBoundingClientRect();
      return {tag:el.tagName,cls:typeof el.className==="string"?el.className.slice(0,65):"",
        right:Math.round(box.right),left:Math.round(box.left),width:Math.round(box.width)};
    }).filter(el=>el.right>window.innerWidth+4 && el.left<window.innerWidth && el.width>0)
      .sort((a,b)=>b.right-a.right).slice(0,18);
    const overflowAncestors=[...document.querySelectorAll("body,header,main,section,article,div,figure,footer,nav")].map(el=>{
      const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
      return {tag:el.tagName,id:el.id,cls:(typeof el.className==="string"?el.className:"").slice(0,60), 
        right:Math.round(r.right),left:Math.round(r.left),w:Math.round(r.width),scroll:el.scrollWidth,client:el.clientWidth,
        overflow:cs.overflowX};
    }).filter(x=>x.scroll>x.client+7&&x.overflow==="visible").sort((a,b)=>(b.scroll-b.client)-(a.scroll-a.client)).slice(0,22);
    return {diff,elements,overflowAncestors};
  });
  if(report.diff>4)console.log("DEMO_OVERFLOW "+width+"px "+JSON.stringify({elements:report.elements,ancestors:report.overflowAncestors}));
  expect(report.diff,"No horizontal scrolling at "+width+"px").toBeLessThanOrEqual(4);
  await expect(page.locator(".veltro-demo-ribbon")).toBeVisible();
 });
}
test("VELTRO legal pages identify fictional operation, not an old client",async({page})=>{
 for(const path of ["privacidade.html","termos.html"]){
  await page.goto(base+path,{waitUntil:"domcontentloaded"});
  await expect(page.locator("article h1")).toContainText(/VELTRO|Privacidade|Termos/);
  const text=await page.locator("article").innerText();
  expect(text).toMatch(/fictíci|demonstrativ/i);
  expect(text).not.toMatch(/GNG Barbearia|99407/);
 }
});