const {test,expect}=require('@playwright/test');
const base='https://vyzo-studio.github.io/gng_barbearia/';
const languages=[
 ["pt-BR","Enviar solicitação","Política de Privacidade","Termos de Serviço"],
 ["en","Send request","Privacy Policy","Terms of Service"],
 ["es","Enviar solicitud","Política de Privacidad","Términos de Servicio"],
 ["ja","予約リクエストを送信","プライバシーポリシー","利用規約"],
 ["de","Anfrage senden","Datenschutzerklärung","Nutzungsbedingungen"]
];
const widths=[320,375,390,430,768,1024,1366,1920];
test('first visit, reject optional content, reopen settings, withdrawal and persistence',async({page})=>{
  const externalRequests=[];
  page.on('request',r=>{if(r.url().includes('google.com/maps'))externalRequests.push(r.url())});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#gng-consent-banner')).toBeVisible();
  const frame=page.locator('.map-card iframe[data-map-src]');
  await expect(frame).toHaveCount(1);
  expect((await frame.getAttribute('src'))||'').not.toContain('google.com/maps');
  expect(externalRequests).toHaveLength(0);
  await page.locator('#gng-consent-banner [data-consent-action="reject"]').click();
  await expect(page.locator('#gng-consent-banner')).toBeHidden();
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#gng-consent-banner')).toBeHidden();
  expect((await page.locator('.map-card iframe').getAttribute('src'))||'').not.toContain('google.com/maps');
  await page.locator('[data-privacy-preferences]').first().click();
  await expect(page.locator('.gng-consent-dialog')).toBeVisible();
  await page.locator('#gng-consent-maps').check();
  await page.locator('.gng-consent-dialog [data-consent-action="save"]').click();
  await expect(page.locator('.map-card iframe')).toHaveAttribute('src',/google.com\/maps/);
  await page.locator('[data-privacy-preferences]').first().click();
  await page.locator('.gng-consent-dialog [data-consent-action="reject"]').click();
  expect((await page.locator('.map-card iframe').getAttribute('src'))||'').not.toContain('google.com/maps');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('gng_barbearia_consent_v2')).external)).toBe(false);
});
test('first-visit accept all enables optional map and persists',async({page})=>{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#gng-consent-banner')).toBeVisible();
  await page.locator('#gng-consent-banner [data-consent-action="accept"]').click();
  await expect(page.locator('#gng-consent-banner')).toBeHidden();
  await expect(page.locator('.map-card iframe')).toHaveAttribute('src',/google\.com\/maps/);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('gng_barbearia_consent_v2')));
  expect(stored).toMatchObject({version:2,external:true});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#gng-consent-banner')).toBeHidden();
  await expect(page.locator('.map-card iframe')).toHaveAttribute('src',/google\.com\/maps/);
});
test('customer autofill opt-in, same-browser return and forgetting without server writes',async({page})=>{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const name=page.locator('#booking-customer-name'),phone=page.locator('#booking-customer-phone');
  await expect(name).toHaveCount(1);await expect(phone).toHaveCount(1);
  const remember=page.locator('#gng-remember-customer');
  await expect(remember).not.toBeChecked();
  expect(await page.evaluate(()=>localStorage.getItem('gng_barbearia_customer_contact_v1'))).toBeNull();
  await name.fill('Cliente de teste');
  await phone.fill('61987654321');
  await remember.check();
  // Simulates the local hook, NOT a completed production booking.
  await page.evaluate(()=>window.GNG_CUSTOMER_MEMORY.saveAfterSuccess('Cliente de teste','61987654321'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gng_barbearia_customer_contact_v1')));
  expect(saved).toMatchObject({name:'Cliente de teste',phone:'61987654321'});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(name).toHaveValue('Cliente de teste');
  await expect(phone).toHaveValue(/98765/);
  await page.locator('#gng-forget-customer').click();
  expect(await page.evaluate(()=>localStorage.getItem('gng_barbearia_customer_contact_v1'))).toBeNull();
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(name).toHaveValue('');
});
test('five languages, privacy/terms and eight viewport widths without horizontal overflow',async({page})=>{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#gng-consent-banner [data-consent-action="reject"]').click();
  const select=page.locator('select[data-gng-locale]');
  for(const [locale,submit,privacy,terms] of languages){
    await select.selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('#booking-submit')).toHaveText(submit);
    await expect(page.locator('.gng-global-controls a[href="privacidade.html"]')).toHaveText(privacy);
    await expect(page.locator('.gng-global-controls a[href="termos.html"]')).toHaveText(terms);
    for(const width of widths){
      await page.setViewportSize({width,height:850});
      const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      expect(over,'overflow '+locale+' / '+width).toBeLessThanOrEqual(3);
      await expect(select).toBeAttached();
    }
    await page.goto(base+'termos.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('h1')).toHaveText(terms);
    await page.goto(base+'privacidade.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('h1')).toHaveText(privacy);
    await page.goto(base,{waitUntil:'domcontentloaded'});
  }
  await select.selectOption('ja');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('lang','ja');
});
test('language changes preserve entered customer contact without auto-booking',async({page})=>{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#gng-consent-banner [data-consent-action="reject"]').click();
  await page.locator('#booking-customer-name').fill('Test User');
  await page.locator('#booking-customer-phone').fill('61987654321');
  await page.locator('[data-gng-locale]').selectOption('de');
  await expect(page.locator('#booking-customer-name')).toHaveValue('Test User');
  await expect(page.locator('#booking-customer-phone')).toHaveValue(/98765/);
  expect(await page.evaluate(()=>localStorage.getItem('gng_barbearia_customer_contact_v1'))).toBeNull();
});
