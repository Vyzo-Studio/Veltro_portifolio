const {test,expect}=require('@playwright/test');
const path=require('node:path');
const base='https://vyzo-studio.github.io/gng_barbearia/';
const sizes=[320,375,390,430,768,1366,1920];
const business={settings:{
  business_name:'GNG Barbearia',primary_color:'#22334f',secondary_color:'#142238',
  accent_color:'#d68a45',phone_display:'(61) 99407-5539',whatsapp_digits:'5561994075539',
  address:'QNM 21 Conjunto D Lote 48, Ceilândia - DF',
  open_time:'09:00',close_time:'19:30',open_weekdays:[1,2,3,4,5,6],
  slot_interval_minutes:30,site_texts:{}
},services:[{id:'00000000-0000-4000-8000-000000000001',name:'Corte',description:'',
duration_minutes:20,price_cents:3000,sort_order:0}],gallery:[]};
async function mockPublicData(page){
  await page.route('**/rest/v1/rpc/**',async route=>{
    const url=route.request().url();
    let data=[];
    if(url.includes('get_public_site_config')) data=business;
    else if(url.includes('get_public_barbers')) data=[
      {id:'00000000-0000-4000-8000-000000000002',name:'Barbeiro QA',active:true}
    ];
    else if(!url.includes('get_public_unavailable_slots_by_barber')) {
      return route.fulfill({status:403,contentType:'application/json',
        body:JSON.stringify({message:'Write operations not permitted during browser QA'})});
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
}
test('public site: seven widths, links, no horizontal overflow',async({page})=>{
  await mockPublicData(page);
  for(const width of sizes) {
    await page.setViewportSize({width:width,height:850});
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('a[href="https://www.instagram.com/gngbarbearia/"]').first()).toBeAttached();
    const report=await page.evaluate(()=>{
      const width=window.innerWidth;
      const overflow=document.documentElement.scrollWidth-width;
      const out=[...document.body.querySelectorAll('*')].map(el=>{
        const r=el.getBoundingClientRect();
        return {tag:el.tagName,className:typeof el.className==='string'?el.className.slice(0,70):'',
          id:el.id||'',left:Math.round(r.left),right:Math.round(r.right),w:Math.round(r.width)};
      }).filter(x=>x.w>0 && x.right>width+3 && x.left<width).sort((a,b)=>b.right-a.right).slice(0,10);
      return {overflow,out};
    });
    await page.screenshot({path:path.join('artifacts','public-'+width+'.png'),fullPage:false});
    if(report.overflow>3)console.log('OVERFLOW_DETAIL '+width+'px '+JSON.stringify(report.out));
    expect(report.overflow,'Public horizontal overflow at '+width+'px').toBeLessThanOrEqual(3);
  }
});
test('public site: maps consent and booking form',async({page})=>{
  await mockPublicData(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const frame=page.locator('.map-card iframe[data-map-src]');
  await expect(frame).toHaveCount(1);
  expect((await frame.getAttribute('src'))||'').not.toContain('google.com/maps');
  await expect(page.locator('#booking-submit')).toBeDisabled();
  await expect(page.locator('#booking-validation-hint')).toBeVisible();
  await page.locator('.map-consent-button').click();
  await expect(frame).toHaveAttribute('src',/google\.com\/maps/);
  await page.screenshot({path:'artifacts/privacy-390.png',fullPage:false});
});
test('public site: theme switching works',async({page})=>{
  await mockPublicData(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const toggle=page.locator('.gng-theme-toggle');
  await expect(toggle).toBeVisible();
  const before=await page.locator('html').getAttribute('data-theme');
  await toggle.click();
  const after=await page.locator('html').getAttribute('data-theme');
  expect(after).not.toBe(before);
});
test('admin page: login gate at mobile and desktop widths',async({page})=>{
  await mockPublicData(page);
  for(const width of [390,1366]) {
    await page.setViewportSize({width,height:860});
    await page.goto(base+'admin.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#admin-login')).toBeVisible();
    await expect(page.locator('#admin-dashboard')).toBeHidden();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow,'Admin overflow at '+width+'px').toBeLessThanOrEqual(3);
    await page.screenshot({path:path.join('artifacts','admin-login-'+width+'.png'),fullPage:false});
  }
});
