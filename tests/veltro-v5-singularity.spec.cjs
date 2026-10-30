const {test,expect}=require("@playwright/test");
const base="http://127.0.0.1:8765/";
const widths=[320,360,375,390,430,768,1024,1366,1440,1920];
async function setTheme(page,theme){
 await page.addInitScript(value=>{try{localStorage.setItem("veltro-demo-theme",value)}catch(e){}},theme);
}
test("V5 independent repo, documentary hero, CTA and section hierarchy",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href","https://vyzo-studio.github.io/Veltro_portifolio/");
 await expect(page.locator(".hero .photo-main img")).toHaveAttribute("src",/photo-1582771498000-8ad44e6c84db/);
 expect(await page.locator(".hero .photo-secondary").count()).toBe(0);
 const order=await page.locator("main section[id]").evaluateAll(items=>items.map(x=>x.id));
 expect(order.indexOf("servicos")).toBeLessThan(order.indexOf("portfolio"));
 expect(order.indexOf("portfolio")).toBeLessThan(order.indexOf("agendamento"));
 await expect(page.locator(".final-cta h2")).toContainText("IMAGINE ESSA EXPERIÊNCIA");
 const sales=page.locator(".final-cta .veltro-sales-link");
 await expect(sales).toHaveAttribute("href",/(?:wa\.me\/556185154156|web\.whatsapp\.com\/send\?phone=556185154156)/);
 await expect(page.locator(".final-cta a[href='#agendamento']")).toBeVisible();
 await expect(page.locator(".veltro-demo-ribbon")).toContainText("PROJETO DEMONSTRATIVO");
});
test("V5 category tabs keep the original 13 services and select booking",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await expect.poll(()=>page.locator("#servicos .price-table tbody tr").count()).toBe(13);
 const tabs=page.locator(".veltro-service-filters button");
 await expect(tabs).toHaveCount(5);
 const cookie=page.locator("#gng-consent-banner");
 if(await cookie.isVisible())await cookie.locator("[data-consent-action=reject]").click();
 await page.locator("[data-service-category='combos']").click();
 await expect(page.locator("[data-service-category='combos']")).toHaveAttribute("aria-pressed","true");
 const shown=await page.locator("#servicos tbody tr:visible").allTextContents();
 expect(shown.length).toBe(9);
 expect(shown.every(s=>s.includes("+"))).toBe(true);
 await page.locator("[data-service-category='beard']").click();
 await expect.poll(()=>page.locator("#servicos tbody tr:visible").count()).toBe(1);
 await page.locator("[data-service-category='all']").click();
 await expect.poll(()=>page.locator("#servicos tbody tr:visible").count()).toBe(13);
 await page.locator("#servicos tbody tr").filter({hasText:"Corte + Barba + Sobrancelha + Limpeza de Pele"}).locator("a").click();
 await expect(page.locator("#booking-service")).toHaveValue("Corte + Barba + Sobrancelha + Limpeza de Pele");
 await expect(page.locator(".veltro-booking-progress span")).toHaveCount(4);
});
test("V5 service tabs localize to all five existing languages",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await expect.poll(()=>page.locator(".veltro-service-filters button").count()).toBe(5);
 const select=page.locator("select[data-gng-locale]").first();
 for(const [language,word] of [["en","Combos"],["es","Combinaciones"],["ja","セット"],["de","Kombinationen"],["pt-BR","Combinações"]]){
   await select.selectOption(language);
   await expect(page.locator("html")).toHaveAttribute("lang",language);
   await expect(page.locator("[data-service-category='combos']")).toHaveText(word);
 }
});
for(const theme of ["light","dark"]){
 for(const width of widths){
  test("V5 "+theme+" responsive hero services/gallery/booking "+width+"px",async({page})=>{
   await page.setViewportSize({width,height:850});
   await setTheme(page,theme);
   await page.goto(base,{waitUntil:"domcontentloaded"});
   await expect(page.locator("html")).toHaveAttribute("data-theme",theme);
   await expect(page.locator(".hero h1")).toBeVisible();
   await expect.poll(()=>page.locator("#servicos .veltro-service-filters button").count()).toBe(5);
   const data=await page.evaluate(()=>{
    const hero=document.querySelector(".hero .photo-main"),img=hero?.querySelector("img");
    const sales=document.querySelector(".veltro-sales-link");
    return {scroll:document.documentElement.scrollWidth-window.innerWidth,
      width:hero?.getBoundingClientRect().width,button:sales?.getAttribute("href"),
      visibleHero:img?.getBoundingClientRect().width>0,buttons:document.querySelectorAll(".veltro-service-filters button").length}
   });
   expect(data.scroll,"horizontal overflow "+theme+" "+width).toBeLessThanOrEqual(4);
   expect(data.width).toBeGreaterThan(250);
   expect(data.visibleHero).toBe(true);
   expect(data.button).toMatch(/(?:wa\.me\/556185154156|web\.whatsapp\.com\/send\?phone=556185154156)/);
   expect(data.buttons).toBe(5);
   if(width===390||width===1366)await page.screenshot({path:"artifacts/veltro-v5-"+theme+"-"+width+".png",fullPage:false});
  });
 }
}
test("V5 admin safety and premium theme unaffected",async({page})=>{
 await page.goto(base+"admin.html",{waitUntil:"domcontentloaded"});
 await expect(page.locator("#admin-login")).toBeVisible();
 await expect(page.locator("#admin-dashboard")).toBeHidden();
 expect(await page.evaluate(()=>window.VELTRO_BACKEND?.ready)).toBe(false);
 const styles=await page.locator(".login-brand-panel").evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(styles).toContain("gradient");
});
