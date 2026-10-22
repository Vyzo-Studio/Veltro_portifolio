const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const config=fs.readFileSync(path.join(__dirname,"../config.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../admin.js"),"utf8");
function extract(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,"Missing source markers: "+start);
  return source.slice(a,b);
}
const validatorCode=extract(config,"function normalizeAdminEmail(","function loadScriptOnce(");
const context={String};
vm.createContext(context);vm.runInContext(validatorCode,context);
for(const [mail,expected] of [
  ["ADMIN@EXAMPLE.COM",true],["  admin@example.com  ",true],
  ["usuario+gng@barbearia.com.br",true],["a@b",false],
  ["sem-arroba",false],["duas palavras@email.com",false],
  ["x@y..",false],["",false]
])assert.equal(context.isConfiguredAdminEmail(mail),expected,mail);
assert.equal(context.normalizeAdminEmail("  A@B.COM "), "a@b.com");

const check=extract(admin,"async function validateAdminUser(","async function establishSession(");
let rpcCalls=0;
let access=true;
const serverContext={
  window:{GNG_isConfiguredAdminEmail:context.isConfiguredAdminEmail},
  rpc:async name=>{assert.equal(name,"is_gng_admin");rpcCalls++;return access;},
  console:{error(){}}
};
vm.createContext(serverContext);vm.runInContext(check,serverContext);
(async()=>{
  assert.equal(await serverContext.validateAdminUser({email:"admin@example.com"}),true);
  access=false;
  assert.equal(await serverContext.validateAdminUser({email:"outsider@example.com"}),false,
    "Syntactically valid external user must not receive server authorization");
  assert.equal(await serverContext.validateAdminUser({email:"invalid"}),false);
  assert.equal(await serverContext.validateAdminUser(null),false);
  assert.equal(rpcCalls,2,"Malformed emails cannot query the administrative RPC");

  const loginCode=extract(admin,"async function handleLogin(","async function handleLogout()");
  let authorized=true;
  let authCalls=0;
  let lastMessage="";
  const loginContext={
    window:{GNG_isConfiguredAdminEmail:context.isConfiguredAdminEmail},
    supabaseClient:{auth:{signInWithPassword:async({email,password})=>{
      authCalls++;
      if(password==="wrong") return {error:new Error("Invalid login credentials"),data:null};
      return {data:{session:{user:{email},access_token:"mock"}},error:null};
    }}},
    adminEmailInput:{value:"admin@example.com"},
    adminPasswordInput:{value:"good"},
    adminLoginButton:{textContent:"ENTRAR"},
    loginMessage:{},
    setMessage:(target,message)=>{lastMessage=message},
    setButtonLoading:()=>{},
    establishSession:async()=>authorized,
    console:{error(){}}
  };
  vm.createContext(loginContext);vm.runInContext(loginCode,loginContext);
  await loginContext.handleLogin({preventDefault(){}});
  assert.equal(authCalls,1);
  assert.equal(loginContext.adminPasswordInput.value,"");
  loginContext.adminPasswordInput.value="wrong";
  await loginContext.handleLogin({preventDefault(){}});
  assert.match(lastMessage,/senha incorretos/);
  authorized=false;
  loginContext.adminPasswordInput.value="good";
  await loginContext.handleLogin({preventDefault(){}});
  assert.equal(authCalls,3);
  loginContext.adminEmailInput.value="not-valid";
  await loginContext.handleLogin({preventDefault(){}});
  assert.equal(authCalls,3,"No request for invalid email format");
  console.log("PASS auth: valid email syntax, password errors, server-side admin rejection and successful mocked login");
})().catch(err=>{console.error(err);process.exitCode=1});
