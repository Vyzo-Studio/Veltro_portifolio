const {test,expect}=require("@playwright/test");
const base="http://127.0.0.1:8765/";
const widths=[320,375,390,430,768,1024,1366,1920];

async function useTheme(page,theme){
 await page.addInitScript(selected=>{
   try{window.localStorage.setItem("veltro-demo-theme",selected)}catch(e){}
 },theme);
}

for(const mode of ["light","dark"]){
 for(const width of widths){
  test("Premium grain "+mode+" layout "+width+"px",async({page})=>{
   await page.setViewportSize({width,height:850});
   await useTheme(page,mode);
   await page.goto(base,{waitUntil:"domcontentloaded"});
   await expect(page.locator(".hero")).toBeVisible();
   await expect.poll(()=>page.locator("html").getAttribute("data-theme")).toBe(mode);
   const state=await page.evaluate(()=>{
     const root=getComputedStyle(document.documentElement);
     const hero=document.querySelector(".hero");
     const before=getComputedStyle(hero,"::before"),after=getComputedStyle(hero,"::after");
     const overflow=document.documentElement.scrollWidth-innerWidth;
     return {
       overflow,navy:root.getPropertyValue("--navy").trim().toUpperCase(),
       grain:before.backgroundImage.includes("veltro-grain.svg")&&after.backgroundImage.includes("veltro-grain.svg"),
       backgrounds:before.backgroundImage.includes("linear-gradient")&&after.backgroundImage.includes("linear-gradient"),
       lightOpacity:before.opacity,darkOpacity:after.opacity,
       primary:getComputedStyle(document.querySelector(".btn-primary")).backgroundImage,
       heading:getComputedStyle(document.querySelector(".hero h1")).color,
       logo:document.querySelector(".brand img").getAttribute("src")
     };
   });
   expect(state.overflow,"No horizontal scrolling").toBeLessThanOrEqual(4);
   expect(state.grain).toBe(true);
   expect(state.backgrounds).toBe(true);
   expect(state.lightOpacity).toBe(mode==="light"?"1":"0");
   expect(state.darkOpacity).toBe(mode==="dark"?"1":"0");
   expect(state.primary).toContain("gradient");
   expect(state.logo).toContain("veltro-logo-");
   expect(state.heading).not.toBe("rgba(0, 0, 0, 0)");
   if(width===390||width===1366)
     await page.screenshot({path:"artifacts/veltro-"+mode+"-"+width+".png",fullPage:false});
  });
 }
}

test("Theme toggle persists and avoids forced animation for reduced motion",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await useTheme(page,"light");
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.locator("#gng-theme-toggle").click();
 await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
 expect(await page.locator("html").evaluate(el=>el.classList.contains("gng-theme-switching"))).toBe(false);
 await page.reload({waitUntil:"domcontentloaded"});
 await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
 expect(await page.locator("meta[name='theme-color']").getAttribute("content")).toBe("#0C1523");
 await page.locator("#gng-theme-toggle").click();
 await expect(page.locator("html")).toHaveAttribute("data-theme","light");
 expect(await page.locator("meta[name='theme-color']").getAttribute("content")).toBe("#FAF8F4");
});

for(const mode of ["light","dark"]){
 test("VELTRO admin "+mode+" premium palette and brand isolation",async({page})=>{
   await useTheme(page,mode);
   await page.goto(base+"admin.html",{waitUntil:"domcontentloaded"});
   await expect(page.locator("#admin-login")).toBeVisible();
   await expect(page.locator("#admin-dashboard")).toBeHidden();
   const state=await page.evaluate(()=>{
     const panel=document.querySelector(".login-brand-panel");
     const form=document.querySelector(".login-card");
     const bg=getComputedStyle(document.querySelector(".admin-login")).backgroundImage;
     return {
       watermark:getComputedStyle(panel,"::before").content,
       brandGradient:getComputedStyle(panel).backgroundImage,
       pageGradient:bg,
       formBg:getComputedStyle(form).backgroundColor,
       client:!!window.supabaseClient,
       overflow:document.documentElement.scrollWidth-innerWidth
     };
   });
   expect(state.watermark).toContain("VELTRO");
   expect(state.watermark).not.toContain("GNG");
   expect(state.brandGradient).toContain("gradient");
   expect(state.pageGradient).toContain("gradient");
   expect(state.formBg).not.toBe("rgba(0, 0, 0, 0)");
   expect(state.client).toBe(false);
   expect(state.overflow).toBeLessThanOrEqual(4);
 });
}

test("Contrast tokens meet WCAG AA on stable text surfaces",async()=>{
 function rgb(hex){return hex.replace("#","").match(/../g).map(x=>parseInt(x,16)/255)}
 function lum(hex){return rgb(hex).map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
 function ratio(a,b){const l=[lum(a),lum(b)].sort((x,y)=>y-x);return (l[0]+.05)/(l[1]+.05)}
 for(const [foreground,background] of [
   ["#172A43","#FAF8F4"],["#53657A","#FAF8F4"],
   ["#172A43","#FFFFFF"],["#F5F6FA","#0C1523"],
   ["#C0CCD9","#0C1523"],["#F5F6FA","#172A43"],
   ["#172A43","#EDF1F5"],["#FFFFFF","#172A43"]
 ])expect(ratio(foreground,background),foreground+" over "+background).toBeGreaterThanOrEqual(4.5);
});
