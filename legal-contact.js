(function(){"use strict";
const number="556185154156";
const url="https://wa.me/"+number+"?text="+encodeURIComponent("Olá, VYZO Studio! Conheci a demonstração VELTRO e quero saber mais sobre um site para meu negócio.");
function render(){
 document.querySelectorAll("[data-gng-contact-link]").forEach(function(link){
   link.href=url;
   link.target="_blank";
   link.rel="noopener noreferrer";
   if(!link.dataset.keepText)link.textContent="Contato comercial VYZO Studio (+55 61 8515-4156)";
 });
}
window.GNG_LEGAL_CONTACT={render};
window.addEventListener("gng:legal-rendered",render);
window.addEventListener("gng:locale-changed",render);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();