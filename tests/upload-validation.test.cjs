"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const source=fs.readFileSync(path.resolve(__dirname,"../admin-business.js"),"utf8");
const start=source.indexOf("  async function uploadImage(file, folder) {");
const end=source.indexOf("\n  function collectSiteTexts()",start);
assert.ok(start>=0&&end>start,"Expected actual uploadImage function in admin-business.js");
const functionSource=source.slice(start,end);
const uploaded=[];
const mockSupabase={
  storage:{from(bucket){
    assert.equal(bucket,"gng-media");
    return {
      async upload(filename,blob,opts){
        uploaded.push({filename,blob,opts});
        return {error:null};
      },
      getPublicUrl(filename){return {data:{publicUrl:"https://example.invalid/"+filename}};}
    };
  }}
};
const actualUpload=new Function("supabaseClient","file","folder",
  functionSource+"\nreturn uploadImage(file,folder);");
function file(bytes,type,name="photo.jpg"){
  const blob=new Blob([bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)],{type});Object.defineProperty(blob,"name",{value:name});return blob;
}
(async()=>{
  const jpg=file([0xff,0xd8,0xff,0xe0,0,0,0,0],"image/jpeg","filename.svg");
  const png=file([137,80,78,71,13,10,26,10,0,0,0,0],"image/png","photo.pdf");
  const webp=file([82,73,70,70,0,0,0,0,87,69,66,80],"image/webp","photo.png");
  const tests=[[jpg,"jpg"],[png,"png"],[webp,"webp"]];
  for(const [blob,ext] of tests){
    await actualUpload(mockSupabase,blob,"gallery");
    const last=uploaded[uploaded.length-1];
    assert.ok(last.filename.endsWith("."+ext),
      "Safe extension must derive from magic bytes and MIME, not user-supplied filename");
    assert.equal(last.opts.contentType,blob.type);
    assert.equal(last.opts.upsert,false);
  }
  assert.equal(uploaded.length,3);
  const before=uploaded.length;
  await assert.rejects(actualUpload(mockSupabase,
    file([60,115,118,103,32,111,110,108,111,97,100],"image/png","suspicious.png"),
    "gallery"),/não corresponde/);
  await assert.rejects(actualUpload(mockSupabase,
    file([137,80,78,71,13,10,26,10,0,0,0,0],"image/svg+xml","logo.svg"),
    "logo"),/Use uma imagem/);
  await assert.rejects(actualUpload(mockSupabase,
    file([137,80,78,71,13,10,26,10,0,0,0,0],"image/jpeg","wrong.jpg"),
    "logo"),/não corresponde/);
  const huge=file(new Uint8Array(5*1024*1024+1),"image/png","huge.png");
  await assert.rejects(actualUpload(mockSupabase,huge,"gallery"),/no máximo 5 MB/);
  assert.equal(uploaded.length,before,"Rejected uploads must not reach storage");
  console.log("PASS media upload: MIME/signature consistency, safe extensions, size limit and rejected malicious formats");
})().catch(err=>{console.error(err);process.exitCode=1});
