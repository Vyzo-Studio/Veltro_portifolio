const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const base='https://vyzo-studio.github.io/Veltro_portifolio/';
test('real Chromium performance measurements, public site and login',async({page})=>{
  const records=[];
  for(const target of ['index.html','admin.html']){
    await page.setViewportSize({width:390,height:844});
    await page.addInitScript(()=>{
      window.GNG_LCP=0;
      try{new PerformanceObserver(list=>{
        for(const item of list.getEntries())window.GNG_LCP=item.startTime;
      }).observe({type:'largest-contentful-paint',buffered:true})}catch(e){}
    });
    const navigationStart=Date.now();
    const response=await page.goto(base+target,{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1200);
    const timing=await page.evaluate(()=>{
      const nav=performance.getEntriesByType('navigation')[0];
      const resources=performance.getEntriesByType('resource');
      const paints=performance.getEntriesByType('paint');
      const value=name=>paints.find(p=>p.name===name)?.startTime||null;
      return {
        response_ms:Math.round(nav?.responseStart||0),
        dom_content_loaded_ms:Math.round(nav?.domContentLoadedEventEnd||0),
        load_ms:Math.round(nav?.loadEventEnd||0),
        first_contentful_paint_ms:value('first-contentful-paint'),
        largest_contentful_paint_ms:Math.round(window.GNG_LCP||0)||null,
        resource_count:resources.length,
        resource_transfer_bytes:resources.reduce((sum,item)=>sum+(item.transferSize||0),0),
        images:resources.filter(x=>/\.(png|jpg|jpeg|webp)(\?|$)/i.test(x.name))
          .map(x=>({url:x.name.split('/').pop(),transfer_bytes:x.transferSize||0,duration_ms:Math.round(x.duration)}))
      };
    });
    const row={target,http_status:response?.status(),wall_clock_ms:Date.now()-navigationStart,...timing};
    records.push(row);
    console.log('PERFORMANCE_METRICS '+JSON.stringify(row));
    expect(response?.status()).toBe(200);
    expect(row.first_contentful_paint_ms).not.toBeNull();
  }
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync('artifacts/chromium-performance.json',JSON.stringify({
    note:'Single synthetic browser runs, mobile 390px, network as delivered by GitHub runner. Not Core Web Vitals field RUM.',
    collected_at:new Date().toISOString(),records
  },null,2));
});
