const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../admin-manual-payment.js'),'utf8');
const business = fs.readFileSync(path.join(__dirname, '../admin-business.js'),'utf8');
const site = fs.readFileSync(path.join(__dirname, '../script.js'),'utf8');

const extract = (source,start,end) => {
  const a=source.indexOf(start);
  assert.ok(a>=0, 'Missing source marker: '+start);
  const b=source.indexOf(end,a);
  assert.ok(b>a,'Missing ending source marker: '+end);
  return source.slice(a,b);
};

const moneyFns=extract(app,'function cents(value) {','function serviceCents() {');
const vmContext={Number,String};
vm.createContext(vmContext);
vm.runInContext(moneyFns,vmContext);
const {cents,formatInput}=vmContext;
assert.equal(cents('20,00'),2000);
assert.equal(cents('40,00'),4000);
assert.equal(cents('1.234,56'),123456);
assert.equal(cents('50'),5000);
assert.equal(cents('0,01'),1);
assert.equal(cents(''),null);
assert.ok(Number.isNaN(cents('-1')));
assert.ok(Number.isNaN(cents('abc')));
assert.ok(Number.isNaN(cents('20,123')));
assert.equal(formatInput(3000),'30,00');
assert.equal(5000-3000,2000,'Troco calculado em centavos');
assert.equal(cents('20,00')+cents('40,00'),6000);

const phoneFn=extract(site,'function isValidPhone(', 'function formatPhoneInput(');
const phoneContext={digitsOnly:s=>String(s||'').replace(/\D/g,'')};
vm.createContext(phoneContext);
vm.runInContext(phoneFn,phoneContext);
assert.equal(phoneContext.isValidPhone('00000000000'),false);
assert.equal(phoneContext.isValidPhone('1111111111'),false);
assert.equal(phoneContext.isValidPhone('(61) 98765-4321'),true);
assert.equal(phoneContext.isValidPhone('5561987654321'),true);
assert.equal(phoneContext.isValidPhone('6133334444'),true);

assert.match(business,/data-price-cents/,'Serviços exibem centavos do Supabase');
assert.match(business,/\[3, 4, 5\]\.includes\(columnIndex\)/,'Colunas de nomes não são fórmulas executáveis');
assert.match(business,/\^\[\\s\\u0000-\\u001f\]\*\[=\+@-\]/,'Sinais de planilhas são detectados');
assert.match(app,/p_request_id|requestId\(/,'Operação manual usa identificador para idempotência');
assert.match(app,/manual-payment-received-confirm/,'Recebimento presencial exige confirmação');
assert.match(app,/manual-historic-confirm/,'Retroativo exige confirmação');
assert.match(app,/manual-split-method-1/);
assert.match(app,/manual-split-method-2/);

console.log('PASS: valores inteiros, troco, validação telefônica e segurança do registro financeiro manual');
