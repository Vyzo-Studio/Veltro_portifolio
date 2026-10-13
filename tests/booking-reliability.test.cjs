const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const extract = (begin, end) => source.slice(source.indexOf(begin), source.indexOf(end, source.indexOf(begin)));
const loadSource = extract('async function loadBookedSlots() {', 'function updateServiceSummary() {');
const submitSource = extract('function showBookingFeedback(', 'async function setupBooking() {');

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function harness(rpc) {
  const ctx = {
    console: {error() {}, warn() {}},
    Map, Set, Array, String, Error,
    bookingService: {value: 'Corte'},
    selectedBarberId: 'A',
    selectedDate: null,
    selectedTime: null,
    availabilityState: 'idle',
    availabilityRequestId: 0,
    blockedSlots: new Map(),
    BOOKING_DAYS_COUNT: 7,
    supabaseRpc: rpc,
    getTodayDate: () => new Date(Date.UTC(2026, 9, 12)),
    addDays: (d, n) => new Date(d.getTime() + n * 864e5),
    dateToKey: d => d.toISOString().slice(0, 10),
    normalizeDatabaseTime: t => String(t).slice(0, 5),
    clearBlockedSlots: null,
    showSelectionRequiredState: null,
    updateSubmitState() {},
    syncMobileBookingFlow() {},
    updateTimeSummary() {},
    isSlotBlocked: null
  };
  ctx.clearBlockedSlots = () => {ctx.blockedSlots = new Map();};
  ctx.showSelectionRequiredState = message => {ctx.message = message;};
  ctx.isSlotBlocked = (date,time) => ctx.blockedSlots.has(date) && ctx.blockedSlots.get(date).has(time);
  vm.createContext(ctx);
  vm.runInContext(loadSource, ctx);
  return ctx;
}

async function run() {
  const rejectHarness = harness(async () => { throw new Error('network down'); });
  assert.equal(await rejectHarness.loadBookedSlots(), false);
  assert.equal(rejectHarness.availabilityState, 'error');
  assert.equal(rejectHarness.blockedSlots.size, 0);
  assert.match(rejectHarness.message, /Não foi possível verificar/);

  const invalidHarness = harness(async () => ({unexpected:true}));
  assert.equal(await invalidHarness.loadBookedSlots(), false);
  assert.equal(invalidHarness.availabilityState, 'error');

  const A = deferred(), B = deferred();
  const staleHarness = harness((_, opts) => opts.p_barber_id === 'A' ? A.promise : B.promise);
  const oldRequest = staleHarness.loadBookedSlots();
  staleHarness.selectedBarberId = 'B';
  const newRequest = staleHarness.loadBookedSlots();
  B.resolve([{booking_date:'2026-10-12',booking_time:'10:00:00'}]);
  assert.equal(await newRequest, true);
  assert.equal(staleHarness.availabilityState, 'ready');
  assert.equal(staleHarness.blockedSlots.get('2026-10-12').has('10:00'), true);
  A.resolve([{booking_date:'2026-10-12',booking_time:'11:00:00'}]);
  assert.equal(await oldRequest, false);
  assert.equal(staleHarness.blockedSlots.get('2026-10-12').has('10:00'), true);
  assert.equal(staleHarness.blockedSlots.get('2026-10-12').has('11:00'), false);

  let writes = 0;
  const submitHarness = {
    console: {warn() {}, error() {}},
    bookingCustomerName: {value:'Cliente Teste'},
    bookingCustomerPhone: {value:'61999999999'},
    bookingService: {value:'Corte'},
    bookingSubmit: {textContent: 'Confirmar', parentElement:{}},
    bookingRequestInProgress: false,
    availabilityState: 'ready',
    selectedBarberId: 'A', selectedDate:new Date(Date.UTC(2026, 9, 12)), selectedTime:'10:00',
    isValidName: () => true, isValidPhone: () => true,
    dateToKey: d => d.toISOString().slice(0, 10), isSlotBlocked: () => false,
    buildWhatsappMessage: () => 'mensagem', buildWhatsappUrlFromMessage: () => 'https://wa.me/5511999999999',
    prepareWhatsappWindow: () => ({closed:false,close() {this.closed=true;}}),
    sendWhatsappToWindow: () => {throw new Error('popup error');},
    digitsOnly: v => v,
    supabaseRpc: async () => {writes++;},
    loadBookedSlots: async () => true,
    renderDays() {}, updateTimeSummary() {}, updateSubmitState() {},
    advanceMobileBookingFlow() {}, syncMobileBookingFlow() {},
    showBookingFeedback: null,
    alert() {}
  };
  submitHarness.showBookingFeedback = (message,type,url) => {submitHarness.feedback = {message,type,url};};
  vm.createContext(submitHarness);
  const submitFn = extract('async function submitBooking() {', 'async function setupBooking() {');
  vm.runInContext(submitFn, submitHarness);
  await submitHarness.submitBooking();
  assert.equal(writes, 1);
  assert.equal(submitHarness.feedback.type, 'success');
  assert.equal(submitHarness.feedback.url, 'https://wa.me/5511999999999');
  assert.equal(submitHarness.selectedTime, null);

  console.log('PASS: disponibilidade falha em modo seguro, resposta inválida, corrida A/B e sucesso do registro com falha do WhatsApp');
}

run().catch(err => {console.error(err);process.exitCode=1;});
