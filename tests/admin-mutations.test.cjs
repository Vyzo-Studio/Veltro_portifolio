const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../admin.js'), 'utf8');
const start = source.indexOf('const bookingMutationsInProgress = new Map();');
const end = source.indexOf('function showLogin() {', start);
assert.ok(start >= 0 && end > start);
const code = source.slice(start, end);

async function run() {
  let resolveCall;
  let callCount = 0;
  const ctx = {
    Map, Set, String, Error,
    supabaseClient: {
      rpc() {
        callCount++;
        return new Promise(resolve => { resolveCall = resolve; });
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);

  const same = {p_booking_id: 'booking-1'};
  const first = ctx.rpc('admin_complete_booking', same);
  const repeated = ctx.rpc('admin_complete_booking', same);
  await assert.rejects(ctx.rpc('admin_refund_booking', same), /operação em andamento/);
  assert.equal(callCount, 1, 'A single booking must produce a single remote mutation');
  resolveCall({data: {id: 'booking-1'}, error: null});
  await Promise.all([first, repeated]);

  const another = ctx.rpc('admin_complete_booking', same);
  assert.equal(callCount, 2, 'Subsequent action may run after previous completion');
  resolveCall({data: true, error: null});
  await another;
  console.log('PASS: mesmas mutações compartilham a requisição; mutações conflitantes são bloqueadas');
}

run().catch(error => {console.error(error);process.exitCode=1;});
