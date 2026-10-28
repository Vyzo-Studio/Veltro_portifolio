"use strict";
const fs=require("node:fs"),path=require("node:path");
const TITLE="VELTRO Barber Atelier | Demonstração VYZO Studio";
const DESCRIPTION="Projeto demonstrativo de site e painel de barbearia desenvolvido pela VYZO Studio. Marca, profissionais, preços e agendamentos fictícios.";
const SCHEMA={"@context":"https://schema.org","@type":"CreativeWork",
 name:"VELTRO Barber Atelier — demonstração",creator:{"@type":"Organization",name:"VYZO Studio"},
 description:DESCRIPTION,genre:"Demonstração de software e identidade visual"};
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function updateMeta(html,attr,key,value){
 const re=new RegExp('<meta(?=[\\s>])[^>]*\\b'+attr+'="'+key+'"[^>]*>','i');
 if(!re.test(html))return html;
 return html.replace(re,tag=>tag.replace(/content="[^"]*"/,'content="'+esc(value)+'"'));
}
function updateSeoMarkup(input){
 let html=input.replace(/<title>[^<]*<\/title>/i,"<title>"+esc(TITLE)+"</title>");
 html=updateMeta(html,"name","description",DESCRIPTION);
 for(const [attr,key,value] of [["property","og:site_name","VELTRO — VYZO Studio"],["property","og:title",TITLE],
 ["property","og:description",DESCRIPTION],["property","og:image","assets/veltro-logo-dark.svg"],
 ["name","twitter:title",TITLE],["name","twitter:description",DESCRIPTION]])html=updateMeta(html,attr,key,value);
 const json=JSON.stringify(SCHEMA).replace(/</g,"\\u003c");
 html=html.replace(/(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/i,"$1"+json+"$2");
 return html;
}
if(require.main===module){
 const target=path.join(__dirname,"..","index.html"),old=fs.readFileSync(target,"utf8");
 const next=updateSeoMarkup(old);
 if(next!==old){fs.writeFileSync(target,next);console.log("VELTRO: static fictitious SEO updated");}
 else console.log("VELTRO: metadata up to date");
}
module.exports={updateSeoMarkup};