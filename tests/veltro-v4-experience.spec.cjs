const {test,expect}=require("@playwright/test");
const base="http://127.0.0.1:8765/";
test("VELTRO restored historical catalog matches pricing and booking",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 const expected=[
  ["Barba",2500,20],["Corte",3000,20],["Corte + Barba",5500,40],["Corte + Graxa",5000,40],
  ["Corte + Hidratação",4500,20],["Corte + Sobrancelha",4000,20],
  ["Corte + Barba + Sobrancelha",6500,40],
  ["Corte + Barba + Sobrancelha + Limpeza de Pele",11000,80],
  ["Corte + Bigode",4000,20],["Corte + Bigode + Sobrancelha",4500,20],
  ["Corte + Sobrancelha + Limpeza de Pele",8500,40],
  ["Graxa",2000,20],["Limpeza de Pele",5000,20]
 ];
 await expect.poll(()=>page.locator("#servicos tbody tr").count()).toBe(13);
 const runtime=await page.evaluate(()=>window.VELTRO_DEMO.services.map(x=>[x.name,x.price_cents,x.duration_minutes]));
 expect(runtime).toEqual(expected);
 const rendered=await page.locator("#servicos tbody tr").allTextContents();
 expect(rendered).toHaveLength(13);
 for(let i=0;i<expected.length;i++){
  const [name,price,minutes]=expected[i];
  const text=rendered[i];
  expect(text).toContain(name);
  expect(text).toContain((price/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}));
  expect(text).toContain(minutes===80?"1h20":minutes.toString());
 }
 const options=await page.locator("#booking-service option").allTextContents();
 for(const [name] of expected)expect(options.some(x=>x.startsWith(name+" —"))).toBe(true);
 expect(options.some(x=>x.includes("Fade Studio"))).toBe(false);
});
test("VELTRO curated gallery filters, expands, dismisses and retains source metadata",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await expect.poll(()=>page.locator("#portfolio .portfolio-photo").count()).toBe(7);
 const src=await page.evaluate(()=>window.VELTRO_DEMO.gallery);
 expect(src).toHaveLength(10);
 expect(new Set(src.map(x=>new URL(x.image_url).pathname)).size).toBe(10);
 expect(src.every(x=>x.credit_url.startsWith("https://unsplash.com/photos/"))).toBe(true);
 const cookie=page.locator("#gng-consent-banner");
 if(await cookie.isVisible())await cookie.locator("[data-consent-action='reject']").click();
 const filter=page.locator("[data-veltro-filter='beard']");
 await expect(filter).toBeVisible();
 await filter.click();
 await expect(filter).toHaveAttribute("aria-pressed","true");
 await expect.poll(()=>page.locator("#portfolio .portfolio-photo:visible").count()).toBe(1);
 const expand=page.locator("#portfolio .portfolio-photo:visible .veltro-photo-expand").first();
 await expand.click();
 const dialog=page.locator("#veltro-photo-dialog");
 await expect(dialog).toBeVisible();
 await expect(dialog.locator("img")).toHaveAttribute("alt",/barbeiro/i);
 await expect(dialog.locator(".veltro-photo-meta")).toContainText("Mr Shave");
 await expect(dialog.locator(".veltro-photo-source")).toHaveAttribute("href",/unsplash\.com\/photos\/barber-trimming-beard/);
 await page.keyboard.press("Escape");
 await expect(dialog).toBeHidden();
 await page.locator("[data-veltro-filter='all']").click();
 await expect.poll(()=>page.locator("#portfolio .portfolio-photo:visible").count()).toBe(7);
});
test("VELTRO editorial sections are transparent and FAQ is functional",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 for(const id of ["conceito","tecnologia","perguntas"]){
  await expect(page.locator("#"+id)).toBeVisible();
 }
 await expect(page.locator("#tecnologia")).toContainText("Supabase independente");
 await expect(page.locator("#perguntas")).toContainText("marca fictícia");
 const detail=page.locator("#perguntas details").first();
 await detail.locator("summary").click();
 await expect(detail).toHaveAttribute("open","");
 await expect(detail.locator("p")).toBeVisible();
 await expect(page.locator(".veltro-marquee-track span")).toHaveCount(2);
});
test("VELTRO motion reveal is one-way and reduced-motion disables marquee",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 const h=page.locator("#tecnologia .section-head").first();
 await h.scrollIntoViewIfNeeded();
 await expect.poll(()=>h.evaluate(el=>el.classList.contains("veltro-revealed"))).toBe(true);
 await page.evaluate(()=>scrollTo(0,0));
 await expect(h).toHaveClass(/veltro-revealed/);
 await page.emulateMedia({reducedMotion:"reduce"});
 const animation=await page.locator(".veltro-marquee-track").evaluate(el=>getComputedStyle(el).animationName);
 expect(animation).toBe("none");
});

test("VELTRO V4 editorial text and filters follow five supported languages",async({page})=>{
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await expect.poll(()=>page.locator("[data-veltro-filter]").count()).toBeGreaterThan(0);
 const language=page.locator("select[data-gng-locale]").first();
 for(const [locale,heading,filter] of [
  ["en","PRECISION IN THE CUT.","All"],
  ["es","PRECISIÓN EN EL CORTE.","Todos"],
  ["ja","カットに宿る技術。","すべて"],
  ["de","PRÄZISION BEIM SCHNITT.","Alle"],
  ["pt-BR","TÉCNICA NO CORTE.","Todos"]
 ]){
  await language.selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang",locale);
  await expect(page.locator("#veltro-identity-title")).toContainText(heading);
  await expect(page.locator("[data-veltro-filter='all']")).toContainText(filter);
 }
});
