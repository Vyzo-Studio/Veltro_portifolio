const { test, expect } = require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const base='https://vyzo-studio.github.io/gng_barbearia/';
test.use({bypassCSP:true});
for (const target of ['index.html','admin.html']) {
  for (const width of [390,1366]) {
    for (const theme of ['light','dark']) {
    test('a11y '+target+' at '+width+'px ('+theme+')',async({page})=>{
      await page.setViewportSize({width,height:850});
      await page.goto(base+target,{waitUntil:'domcontentloaded'});
      await page.locator('body').waitFor();
      if(theme==='dark'){
        await page.locator('#gng-theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
        // Theme.js explicitly animates color/background for 420 ms.
        // Audit the final stable colors rather than a transient blend.
        await expect(page.locator('html')).not.toHaveClass(/gng-theme-switching/);
      }
      const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      const issues=result.violations.map(issue=>({
        id:issue.id,impact:issue.impact,description:issue.description,
        nodes:issue.nodes.slice(0,3).map(n=>({
          target:n.target,
          failureSummary:n.failureSummary,
          contrast:n.any?.filter(v=>v.id==='color-contrast').map(v=>({data:v.data,message:v.message}))
        }))
      }));
      if(issues.length) {
        const details = await page.evaluate((selectors)=>{
          return selectors.flatMap(selector=>{
            try{
              return [...document.querySelectorAll(selector)].slice(0,3).map(el=>{
                const st=getComputedStyle(el), parent=getComputedStyle(el.parentElement||el);
                return {selector,tag:el.tagName,text:el.textContent?.trim().slice(0,35),
                  color:st.color,background:st.backgroundColor,opacity:st.opacity,
                  backgroundImage:st.backgroundImage,parentBackground:parent.backgroundColor,
                  parentColor:parent.color,parentOpacity:parent.opacity,
                  ancestors:(()=>{const xs=[];let p=el.parentElement;for(let i=0;i<6&&p;i++,p=p.parentElement){
                    const style=getComputedStyle(p);
                    xs.push({tag:p.tagName,cls:typeof p.className==='string'?p.className.slice(0,70):'',
                      bg:style.backgroundColor,fg:style.color,opacity:style.opacity});
                  }return xs})()};
              });
            }catch(e){return [{selector,error:String(e)}];}
          });
        },issues.flatMap(i=>i.nodes).flat());
        console.log('A11Y_COMPUTED '+target+' '+width+' '+theme+' '+JSON.stringify(details));
      }
      console.log('A11Y '+target+' '+width+' '+theme+' '+JSON.stringify(issues));
      expect(issues,'WCAG serious problems: '+target+' '+width).toEqual([]);
    });
    }
  }
}
