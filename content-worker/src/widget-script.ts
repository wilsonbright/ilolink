// Feedback + comments widget served at /widget.js on the content origin.
//
// A dependency-free client script (< 6 KB) injected at the end of every doc under
// the strict CSP nonce. It builds all UI with createElement and inserts EVERY
// piece of user-supplied text via textContent — never innerHTML — so a hostile
// comment or note can never become markup on this origin. Styling uses the
// reader shell's inline zen tokens (var(--ink), var(--accent), ...) so it tracks
// light/dark automatically. Reads the doc id from <meta name="ilo:doc">.
//
//   Feedback: POST /_feedback {doc,kind:"reaction"|"note",value,hp:""}
//             GET  /_feedback?doc=  -> {reactions:{...},notes:[...]}
//   Comments: GET  /_comments?doc=  -> {comments:[{id,parent_id,author_name,body,created_at}]}
//             POST /_comments {doc,parentId?,name?,body,hp:""}

export const WIDGET_JS = `(function(){
function start(){
var meta=document.querySelector('meta[name="ilo:doc"]');
var doc=meta&&meta.getAttribute("content");
if(!doc)return;
var SANS="Inter,ui-sans-serif,system-ui,-apple-system,sans-serif";
function mk(t,s,x){var e=document.createElement(t);if(s)e.style.cssText=s;if(x!=null)e.textContent=x;return e;}
function post(u,b){return fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});}
function hpf(){var h=mk("input","position:absolute;left:-9999px;width:1px;height:1px;opacity:0;");h.type="text";h.name="hp";h.tabIndex=-1;h.setAttribute("autocomplete","off");return h;}
var IN="width:100%;padding:.55rem .7rem;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:8px;box-sizing:border-box;";
var BTN="padding:.5rem .9rem;font:inherit;font-size:.9rem;font-weight:560;color:#fff;background:var(--accent);border:none;border-radius:8px;cursor:pointer;align-self:flex-start;";
var GHOST="padding:.35rem .6rem;font:inherit;font-size:.8rem;color:var(--ink-soft);background:transparent;border:1px solid var(--hairline);border-radius:8px;cursor:pointer;";
var root=mk("section","max-width:68ch;margin:4rem auto 6rem;padding:2rem 1.5rem 0;border-top:1px solid var(--hairline);font-family:"+SANS+";color:var(--ink);");
var EMOJI=["👍","🤔","👀"],counts={};
var rrow=mk("div","display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;");
EMOJI.forEach(function(em){
var b=mk("button",GHOST+"display:inline-flex;align-items:center;gap:.35rem;font-size:1rem;");
b.appendChild(mk("span",null,em));
var c=mk("span","color:var(--ink-faint);font-size:.85rem;","0");
counts[em]=c;b.appendChild(c);
b.addEventListener("click",function(){
if(b.disabled)return;b.disabled=true;b.style.opacity=".6";
c.textContent=String((parseInt(c.textContent,10)||0)+1);
post("/_feedback",{doc:doc,kind:"reaction",value:em,hp:""}).catch(function(){});
});
rrow.appendChild(b);
});
root.appendChild(rrow);
var noteBtn=mk("button",GHOST+"margin-top:.75rem;","Leave a note");
var noteForm=mk("form","display:none;flex-direction:column;gap:.5rem;margin-top:.75rem;max-width:34rem;");
var noteTa=mk("textarea",IN+"min-height:4.5rem;resize:vertical;");noteTa.placeholder="Note to the author";noteTa.maxLength=2000;
var noteHp=hpf(),noteSend=mk("button",BTN,"Send note");
noteForm.appendChild(noteTa);noteForm.appendChild(noteHp);noteForm.appendChild(noteSend);
noteBtn.addEventListener("click",function(){noteForm.style.display=noteForm.style.display==="none"?"flex":"none";});
noteForm.addEventListener("submit",function(ev){
ev.preventDefault();var v=noteTa.value.trim();if(!v)return;noteSend.disabled=true;
post("/_feedback",{doc:doc,kind:"note",value:v,hp:noteHp.value}).then(function(){
noteTa.value="";noteForm.style.display="none";noteSend.disabled=false;noteBtn.textContent="Note sent — thank you";
}).catch(function(){noteSend.disabled=false;});
});
root.appendChild(noteBtn);root.appendChild(noteForm);
root.appendChild(mk("h3","font-family:"+SANS+";font-size:1.1rem;font-weight:620;margin:2.5rem 0 1rem;","Comments"));
var list=mk("div","display:flex;flex-direction:column;gap:1.1rem;");
root.appendChild(list);
function fmt(ms){try{return new Date(ms).toLocaleDateString();}catch(e){return"";}}
function form(parentId,onDone){
var f=mk("form","display:flex;flex-direction:column;gap:.5rem;margin-top:"+(parentId?".6rem":"1.25rem")+";max-width:34rem;");
var name=mk("input",IN);name.type="text";name.placeholder="Name (optional)";name.maxLength=80;
var body=mk("textarea",IN+"min-height:3.5rem;resize:vertical;");body.placeholder=parentId?"Write a reply":"Add a comment";body.required=true;body.maxLength=4000;
var hp=hpf(),send=mk("button",BTN,parentId?"Reply":"Post comment");
f.appendChild(name);f.appendChild(body);f.appendChild(hp);f.appendChild(send);
f.addEventListener("submit",function(ev){
ev.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;
var p={doc:doc,body:v,hp:hp.value},nm=name.value.trim();if(nm)p.name=nm;if(parentId)p.parentId=parentId;
post("/_comments",p).then(function(){if(onDone)onDone();load();}).catch(function(){send.disabled=false;});
});
return f;
}
function render(c,isReply){
var box=mk("div",isReply?"margin-left:1.25rem;padding-left:1rem;border-left:2px solid var(--hairline);":"");
var m=mk("div","display:flex;gap:.5rem;align-items:baseline;font-size:.8rem;color:var(--ink-faint);margin-bottom:.25rem;");
m.appendChild(mk("span","color:var(--ink-soft);font-weight:560;",c.author_name?String(c.author_name):"Anonymous"));
m.appendChild(mk("span",null,fmt(c.created_at)));
box.appendChild(m);
box.appendChild(mk("div","white-space:pre-wrap;line-height:1.55;",String(c.body==null?"":c.body)));
if(!isReply){
var rbtn=mk("button",GHOST+"margin-top:.4rem;","Reply"),slot=mk("div");
rbtn.addEventListener("click",function(){
if(slot.firstChild){slot.textContent="";return;}
slot.appendChild(form(c.id,function(){slot.textContent="";}));
});
box.appendChild(rbtn);box.appendChild(slot);
}
return box;
}
function draw(items){
list.textContent="";
var tops=items.filter(function(c){return!c.parent_id;});
if(!tops.length)list.appendChild(mk("p","color:var(--ink-faint);font-size:.9rem;margin:0;","No comments yet."));
tops.forEach(function(c){
list.appendChild(render(c,false));
items.filter(function(r){return r.parent_id===c.id;}).forEach(function(r){list.appendChild(render(r,true));});
});
}
function load(){
fetch("/_comments?doc="+encodeURIComponent(doc)).then(function(r){return r.json();}).then(function(d){draw((d&&d.comments)||[]);}).catch(function(){});
}
root.appendChild(form(null,null));
fetch("/_feedback?doc="+encodeURIComponent(doc)).then(function(r){return r.json();}).then(function(d){
var rx=(d&&d.reactions)||{};
EMOJI.forEach(function(em){if(counts[em])counts[em].textContent=String(rx[em]||0);});
}).catch(function(){});
load();
document.body.appendChild(root);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
else start();
})();
`;
