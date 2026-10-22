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
      }
      const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      const issues=result.violations.map(issue=>({
        id:issue.id,impact:issue.impact,description:issue.description,
        nodes:issue.nodes.slice(0,3).map(n=>n.target)
      }));
      console.log('A11Y '+target+' '+width+' '+theme+' '+JSON.stringify(issues));
      expect(issues,'WCAG serious problems: '+target+' '+width).toEqual([]);
    });
    }
  }
}
