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
async function mockPublicData(page, publicConfig=business){
  await page.route('**/rest/v1/rpc/**',async route=>{
    const url=route.request().url();
    let data=[];
    if(url.includes('get_public_site_config')) data=publicConfig;
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
      const containers=[...document.querySelectorAll('body,main,section,div,article,figure')].map(el=>{
        const css=getComputedStyle(el);
        const r=el.getBoundingClientRect();
        return {tag:el.tagName,className:typeof el.className==='string'?el.className.slice(0,70):'',
          id:el.id||'',scroll:el.scrollWidth,client:el.clientWidth,
          left:Math.round(r.left),right:Math.round(r.right),overflowX:css.overflowX};
      }).filter(x=>x.scroll>x.client+10 && x.overflowX==='visible')
        .sort((a,b)=>(b.scroll-b.client)-(a.scroll-a.client)).slice(0,14);
      return {overflow,out,containers};
    });
    await page.screenshot({path:path.join('artifacts','public-'+width+'.png'),fullPage:false});
    if(report.overflow>3)console.log('OVERFLOW_DETAIL '+width+'px '+JSON.stringify({out:report.out,containers:report.containers}));
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
  // Dismiss the first-visit consent banner before testing the separate theme control.
  const privacyBanner=page.locator('#gng-consent-banner');
  if(await privacyBanner.isVisible()) {
    await privacyBanner.locator('[data-consent-action="reject"]').click();
  }
  const toggle=page.locator('.gng-theme-toggle');
  await expect(toggle).toBeVisible();
  const before=await page.locator('html').getAttribute('data-theme');
  await toggle.click();
  const after=await page.locator('html').getAttribute('data-theme');
  expect(after).not.toBe(before);
});
test('empty data from admin removes stale public services, portfolio and space photos',async({page})=>{
  await mockPublicData(page,{...business,services:[],gallery:[]});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#servicos tbody .gng-empty-message'))
    .toHaveText('Nenhum serviço disponível no momento.');
  await expect(page.locator('#portfolio .portfolio-empty'))
    .toHaveText('Nenhuma foto de cortes disponível no momento.');
  await expect(page.locator('#espaco .space-empty'))
    .toHaveText('Nenhuma foto do espaço disponível no momento.');
  await expect(page.locator('#servicos tbody tr')).toHaveCount(1);
  await expect(page.locator('#portfolio .portfolio-photo')).toHaveCount(0);
  await expect(page.locator('#espaco .space-card')).toHaveCount(0);
  await expect(page.locator('#booking-service option')).toHaveCount(1);
  await expect(page.locator('#booking-submit')).toBeDisabled();
  for (const [language,messages] of [
    ['en',['No services available at the moment.','No haircut photos available at the moment.','No photos of the barbershop space available at the moment.']],
    ['es',['No hay servicios disponibles por el momento.','No hay fotos de cortes disponibles por el momento.','No hay fotos del local disponibles por el momento.']],
    ['ja',['現在ご利用可能なサービスはありません。','現在カット写真はありません。','現在店舗の写真はありません。']],
    ['de',['Zurzeit sind keine Leistungen verfügbar.','Zurzeit sind keine Haarschnittfotos verfügbar.','Zurzeit sind keine Fotos des Salons verfügbar.']]
  ]) {
    await page.locator('[data-gng-locale]').selectOption(language);
    await expect(page.locator('#servicos .gng-empty-message')).toHaveText(messages[0]);
    await expect(page.locator('#portfolio .portfolio-empty')).toHaveText(messages[1]);
    await expect(page.locator('#espaco .space-empty')).toHaveText(messages[2]);
  }
});
test('dark theme changes only the header logo, keeping other logos untouched',async({page})=>{
  await mockPublicData(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const banner=page.locator('#gng-consent-banner');
  if(await banner.isVisible())await banner.locator('[data-consent-action="reject"]').click();
  const light=page.locator('header .brand .gng-header-logo-light');
  const dark=page.locator('header .brand .gng-header-logo-dark');
  await expect(light).toBeVisible();
  await expect(dark).toBeHidden();
  const otherBefore=await page.locator('.hero-brand-card img,.footer-logo').evaluateAll(
    elements=>elements.map(img=>img.getAttribute('src'))
  );
  expect(otherBefore.length).toBeGreaterThan(0);
  const toggle=page.locator('.gng-theme-toggle');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(light).toBeHidden();
  await expect(dark).toBeVisible();
  await expect.poll(async()=>dark.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(dark).toHaveAttribute('src','assets/gng-logo-header-dark.svg');
  expect(await page.locator('.hero-brand-card img,.footer-logo').evaluateAll(
    elements=>elements.map(img=>img.getAttribute('src'))
  )).toEqual(otherBefore);
  await page.screenshot({path:'artifacts/dark-header-logo.png',fullPage:false});
  await toggle.click();
  await expect(light).toBeVisible();
  await expect(dark).toBeHidden();
});
test('dark theme: white membership copy, gold bullets and legible photo captions only',async({page})=>{
  await mockPublicData(page,{...business,gallery:[
    {kind:'exterior',image_url:'assets/logo-gng.jpg',caption:'Fachada GNG',alt_text:'Fachada'},
    {kind:'interior',image_url:'assets/logo-gng.jpg',caption:'Interior GNG',alt_text:'Interior'}
  ]});
  for(const width of [390,1366]) {
    await page.setViewportSize({width,height:860});
    await page.goto(base,{waitUntil:'domcontentloaded'});
    const banner=page.locator('#gng-consent-banner');
    if(await banner.isVisible())await banner.locator('[data-consent-action="reject"]').click();
    const readStyles=async()=>page.evaluate(()=>{
      const selectors=[
        '.plan-card:not(.plan-featured) .plan-kicker',
        '.plan-card:not(.plan-featured) h3',
        '.plan-card:not(.plan-featured) .price span',
        '.plan-card:not(.plan-featured) .price strong',
        '.plan-card:not(.plan-featured) .price small',
        '.plan-card:not(.plan-featured) li',
        '.plan-featured .plan-kicker',
        '.plan-featured h3',
        '.plan-featured .price span',
        '.plan-featured .price strong',
        '.plan-featured .price small',
        '.plan-featured li',
        '#espaco .space-card figcaption span',
        '#espaco .space-card figcaption strong'
      ];
      return {
        colors: selectors.map(selector=>{
          const el=document.querySelector(selector);
          return {selector,present:!!el,color:el?getComputedStyle(el).color:null};
        }),
        bullets:[...document.querySelectorAll('.plan-card li')].map(el=>
          getComputedStyle(el,'::before').backgroundColor),
        buttonColors:[...document.querySelectorAll('.plan-card .btn')].map(el=>({
          foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor
        }))
      };
    });
    await expect(page.locator('#espaco .space-card')).toHaveCount(2);
    // Initial computed CSS can still be blending during page theme initialization.
    await expect(page.locator('html')).not.toHaveClass(/gng-theme-switching/);
    await page.waitForTimeout(520);
    const light=await readStyles();
    const toggle=page.locator('.gng-theme-toggle');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('html')).not.toHaveClass(/gng-theme-switching/);
    const dark=await readStyles();
    for(const entry of dark.colors) {
      expect(entry.present,'Missing '+entry.selector).toBe(true);
      expect(entry.color,'Dark text '+entry.selector).toBe('rgb(255, 255, 255)');
    }
    for(const bullet of dark.bullets)
      expect(bullet,'Gold bullet in dark mode').toBe('rgb(223, 166, 74)');
    expect(dark.buttonColors).toHaveLength(2);
    expect(dark.buttonColors[1].foreground).not.toBe(dark.buttonColors[1].background);
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/gng-theme-switching/);
    await page.waitForTimeout(520);
    const restored=await readStyles();
    expect(restored.colors).toEqual(light.colors);
    expect(restored.bullets).toEqual(light.bullets);
  }
});
test('admin logos: same transparent brand mark in login and header, no square frames',async({page})=>{
  await mockPublicData(page);
  for(const width of [390,1366]) {
    await page.setViewportSize({width,height:860});
    await page.goto(base+'admin.html',{waitUntil:'domcontentloaded'});
    const login=page.locator('.login-logo-box img');
    const header=page.locator('.admin-header-brand img');
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute('src','assets/gng-logo-header-dark.svg');
    await expect(header).toHaveAttribute('src','assets/gng-logo-header-dark.svg');
    for(const image of [login,header]){
      expect(await image.evaluate(img=>img.complete && img.naturalWidth>0),
        'Transparent GNG image must load').toBe(true);
    }
    const loginBox=await page.locator('.login-logo-box').evaluate(el=>{
      const s=getComputedStyle(el);
      return {background:s.backgroundColor,shadow:s.boxShadow,border:s.borderTopWidth};
    });
    expect(loginBox.shadow).toBe('none');
    expect(loginBox.border).toBe('0px');
    const imgStyles=await login.evaluate(el=>{
      const s=getComputedStyle(el);
      return {background:s.backgroundColor,shadow:s.boxShadow,radius:s.borderTopLeftRadius};
    });
    expect(imgStyles.background).toBe('rgba(0, 0, 0, 0)');
    expect(imgStyles.shadow).toBe('none');
    expect(imgStyles.radius).toBe('0px');
    const loggedOut=page.locator('#admin-login');
    await expect(loggedOut).toBeVisible();
    // Inspect only header presentation. This does not authenticate or call admin RPCs.
    await page.evaluate(()=>{
      document.querySelector('#admin-login').hidden=true;
      document.querySelector('#admin-dashboard').hidden=false;
    });
    await expect(header).toBeVisible();
    const headStyles=await header.evaluate(el=>{
      const s=getComputedStyle(el);
      return {background:s.backgroundColor,shadow:s.boxShadow,radius:s.borderTopLeftRadius};
    });
    expect(headStyles.background).toBe('rgba(0, 0, 0, 0)');
    expect(headStyles.shadow).toBe('none');
    expect(headStyles.radius).toBe('0px');
    await page.screenshot({path:'artifacts/admin-transparent-logos-'+width+'.png',fullPage:false});
  }
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
