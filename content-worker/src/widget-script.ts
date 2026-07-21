// Feedback + comments widget served at /widget.js on the content origin.
//
// A dependency-free client script injected at the end of every doc under the
// strict CSP nonce. It builds all UI with createElement and inserts EVERY piece
// of user-supplied text via textContent — never innerHTML — so a hostile comment
// or note can never become markup on this origin. Styling uses the reader shell's
// inline zen tokens (var(--ink), var(--accent), var(--accent-soft), ...) so it
// tracks light/dark automatically. Reads the doc id from <meta name="ilo:doc">.
//
//   Feedback: POST /_feedback {doc,kind:"reaction"|"note",value,hp:""}
//             GET  /_feedback?doc=  -> {reactions:{...},notes:[...]}
//   Comments: GET  /_comments?doc=  -> {comments:[{id,parent_id,author_name,body,anchor,created_at}]}
//             POST /_comments {doc,parentId?,name?,body,anchor?,hp:""}
//
// Anchored comments (ANCHOR CONTRACT): a top-level comment may carry an anchor
//   {quote,prefix,suffix,start,end} where start/end are character offsets into the
//   ".doc" container's concatenated textContent. Docs are immutable, so offsets
//   are stable resolvers. Range<->offset mapping:
//     offset  : walk .doc text nodes in order (TreeWalker SHOW_TEXT); the offset of
//               a Range boundary is (sum of lengths of all text nodes before it) +
//               its offset within the boundary text node. Element boundaries are
//               resolved via compareDocumentPosition against childNodes[off].
//     range   : to highlight [start,end), re-walk text nodes accumulating lengths;
//               for every text node overlapping the interval, wrap the overlapping
//               substring in a <mark> (Range.surroundContents within one text node).
//   quote/prefix/suffix come straight from docEl.textContent slices, so they line
//   up exactly with the offsets. If an anchor fails to resolve, the comment still
//   shows in the list with no highlight (graceful degradation).

export const WIDGET_JS = `(function(){
function start(){
var meta=document.querySelector('meta[name="ilo:doc"]');
var doc=meta&&meta.getAttribute("content");
if(!doc)return;
var docEl=document.querySelector(".doc");
var SANS="Inter,ui-sans-serif,system-ui,-apple-system,sans-serif";
function mk(t,s,x){var e=document.createElement(t);if(s)e.style.cssText=s;if(x!=null)e.textContent=x;return e;}
function post(u,b){return fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});}
function hpf(){var h=mk("input","position:absolute;left:-9999px;width:1px;height:1px;opacity:0;");h.type="text";h.name="hp";h.tabIndex=-1;h.setAttribute("autocomplete","off");return h;}
var IN="width:100%;padding:.55rem .7rem;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:8px;box-sizing:border-box;";
var BTN="padding:.5rem .9rem;font:inherit;font-size:.9rem;font-weight:560;color:#fff;background:var(--accent);border:none;border-radius:8px;cursor:pointer;align-self:flex-start;";
var GHOST="padding:.35rem .6rem;font:inherit;font-size:.8rem;color:var(--ink-soft);background:transparent;border:1px solid var(--hairline);border-radius:8px;cursor:pointer;";

// ─── anchor state + geometry ───────────────────────────────────────────────
var markEls=[];        // every live <mark> we injected (for teardown)
var anchorMap={};      // comment id -> {marks:[],pin:el,box:el}
var pendingAnchor=null; // anchor bound to the next top-level comment submit
var mainBody=null,mainChip=null,mainChipQuote=null;

// Global text offset of a (node, offset) boundary within docEl. Text-node
// boundaries: sum preceding text-node lengths + local offset. Element
// boundaries: count text nodes ordered before childNodes[off].
function pointOffset(node,off){
if(!docEl)return -1;
var w=document.createTreeWalker(docEl,NodeFilter.SHOW_TEXT,null),t,total=0;
if(node.nodeType===3){
while(t=w.nextNode()){if(t===node)return total+off;total+=t.nodeValue.length;}
return -1;
}
var stop=node.childNodes?node.childNodes[off]:null;
if(!stop){while(t=w.nextNode())total+=t.nodeValue.length;return total;}
while(t=w.nextNode()){
var rel=t.compareDocumentPosition(stop);
if(rel&Node.DOCUMENT_POSITION_FOLLOWING)total+=t.nodeValue.length;else break;
}
return total;
}

// Build an anchor from the current selection, or null if not anchorable.
function computeAnchor(){
if(!docEl)return null;
var sel=window.getSelection();
if(!sel||sel.rangeCount===0||sel.isCollapsed)return null;
var range=sel.getRangeAt(0);
if(!docEl.contains(range.startContainer)||!docEl.contains(range.endContainer))return null;
var start=pointOffset(range.startContainer,range.startOffset);
var end=pointOffset(range.endContainer,range.endOffset);
if(start<0||end<0||end<=start)return null;
var full=docEl.textContent||"";
if(end>full.length)return null;
var quote=full.slice(start,end);
if(!quote.trim()||quote.length>400)return null;
var prefix=full.slice(Math.max(0,start-48),start);
var suffix=full.slice(end,end+48);
return {quote:quote,prefix:prefix,suffix:suffix,start:start,end:end};
}

// Wrap [start,end) in <mark>s, one per overlapping text node. Returns the marks
// (empty if the interval resolves to nothing — caller degrades to no highlight).
function highlight(start,end){
if(!docEl)return[];
var nodes=[],w=document.createTreeWalker(docEl,NodeFilter.SHOW_TEXT,null),t;
while(t=w.nextNode())nodes.push(t);
var total=0,marks=[];
for(var i=0;i<nodes.length;i++){
var node=nodes[i],len=node.nodeValue.length,ns=total,ne=total+len;total=ne;
if(ne<=start||ns>=end)continue;
var a=Math.max(start,ns)-ns,b=Math.min(end,ne)-ns;
if(a>=b)continue;
var rg=document.createRange();rg.setStart(node,a);rg.setEnd(node,b);
var m=document.createElement("mark");
m.style.cssText="background:var(--accent-soft);color:inherit;border-radius:2px;box-shadow:inset 0 -1px 0 var(--accent);cursor:pointer;transition:background 120ms ease;";
try{rg.surroundContents(m);marks.push(m);}catch(e){}
}
return marks;
}

// Unwrap every mark and drop pins; text content is restored unchanged so the
// next render can recompute stable offsets.
function clearMarks(){
for(var i=0;i<markEls.length;i++){var m=markEls[i],p=m.parentNode;if(!p)continue;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);if(p.normalize)p.normalize();}
markEls=[];anchorMap={};if(pinLayer)pinLayer.textContent="";
}

function setActive(id,on){
var e=anchorMap[id];if(!e)return;
e.marks.forEach(function(m){m.style.background=on?"var(--accent)":"var(--accent-soft)";m.style.color=on?"#fff":"inherit";});
if(e.pin)e.pin.style.transform=on?"scale(1.4)":"none";
}
function focusComment(id){
var e=anchorMap[id];if(!e||!e.box)return;
var b=e.box;
b.scrollIntoView({behavior:"smooth",block:"center"});
b.style.transition="background 500ms ease";b.style.background="var(--accent-soft)";
setTimeout(function(){b.style.background="transparent";},900);
}

var pinLayer=mk("div","position:absolute;top:0;left:0;width:0;height:0;z-index:40;pointer-events:none;");
function positionPin(id){
var e=anchorMap[id];if(!e||!e.pin||!e.marks.length||!docEl)return;
var mr=e.marks[0].getBoundingClientRect(),dr=docEl.getBoundingClientRect();
var left=dr.left+window.scrollX-18;if(left<4)left=4;
e.pin.style.top=(mr.top+window.scrollY+2)+"px";
e.pin.style.left=left+"px";
}
function layoutPins(){for(var id in anchorMap)positionPin(id);}

// Resolve one top-level comment's anchor into a highlight + margin pin.
function anchorComment(c,box){
var a=c.anchor;if(!a||!box)return;
var marks=highlight(a.start,a.end);
if(!marks.length)return; // graceful: comment stays in list, no highlight
anchorMap[c.id]={marks:marks,box:box,pin:null};
marks.forEach(function(m){
markEls.push(m);
m.addEventListener("click",function(){focusComment(c.id);});
m.addEventListener("mouseenter",function(){setActive(c.id,true);});
m.addEventListener("mouseleave",function(){setActive(c.id,false);});
});
var pin=mk("button","position:absolute;width:12px;height:12px;padding:0;border-radius:50%;background:var(--accent);border:2px solid var(--canvas);cursor:pointer;transition:transform 120ms ease;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,.25);");
pin.type="button";pin.title="View comment";
pin.addEventListener("click",function(){focusComment(c.id);});
pin.addEventListener("mouseenter",function(){setActive(c.id,true);});
pin.addEventListener("mouseleave",function(){setActive(c.id,false);});
pinLayer.appendChild(pin);
anchorMap[c.id].pin=pin;
box.addEventListener("mouseenter",function(){setActive(c.id,true);});
box.addEventListener("mouseleave",function(){setActive(c.id,false);});
positionPin(c.id);
}

// ─── reaction bar ──────────────────────────────────────────────────────────
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

// Reply form (parentId always set): a reply inherits its parent's anchor, so it
// never sends one of its own.
function form(parentId,onDone){
var f=mk("form","display:flex;flex-direction:column;gap:.5rem;margin-top:.6rem;max-width:34rem;");
var name=mk("input",IN);name.type="text";name.placeholder="Name (optional)";name.maxLength=80;
var body=mk("textarea",IN+"min-height:3.5rem;resize:vertical;");body.placeholder="Write a reply";body.required=true;body.maxLength=4000;
var hp=hpf(),send=mk("button",BTN,"Reply");
f.appendChild(name);f.appendChild(body);f.appendChild(hp);f.appendChild(send);
f.addEventListener("submit",function(ev){
ev.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;
var p={doc:doc,body:v,hp:hp.value,parentId:parentId},nm=name.value.trim();if(nm)p.name=nm;
post("/_comments",p).then(function(){if(onDone)onDone();load();}).catch(function(){send.disabled=false;});
});
return f;
}

// Top-level comment form, with an optional selection chip bound to pendingAnchor.
function buildMainForm(){
var f=mk("form","display:flex;flex-direction:column;gap:.5rem;margin-top:1.25rem;max-width:34rem;");
var chip=mk("div","display:none;align-items:center;gap:.5rem;padding:.4rem .6rem;background:var(--accent-soft);border:1px solid var(--hairline);border-radius:8px;font-size:.8rem;color:var(--ink-soft);");
chip.appendChild(mk("span","color:var(--accent);font-weight:560;white-space:nowrap;","On selection:"));
var qlabel=mk("span","overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:22rem;");
chip.appendChild(qlabel);
var clear=mk("button","margin-left:auto;padding:.05rem .35rem;font:inherit;font-size:.85rem;color:var(--ink-soft);background:transparent;border:none;cursor:pointer;","✕");
clear.type="button";clear.title="Remove selection";
clear.addEventListener("click",function(){pendingAnchor=null;chip.style.display="none";});
chip.appendChild(clear);
var name=mk("input",IN);name.type="text";name.placeholder="Name (optional)";name.maxLength=80;
var body=mk("textarea",IN+"min-height:3.5rem;resize:vertical;");body.placeholder="Add a comment";body.required=true;body.maxLength=4000;
var hp=hpf(),send=mk("button",BTN,"Post comment");
f.appendChild(chip);f.appendChild(name);f.appendChild(body);f.appendChild(hp);f.appendChild(send);
mainBody=body;mainChip=chip;mainChipQuote=qlabel;
f.addEventListener("submit",function(ev){
ev.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;
var p={doc:doc,body:v,hp:hp.value},nm=name.value.trim();if(nm)p.name=nm;
if(pendingAnchor)p.anchor=pendingAnchor;
post("/_comments",p).then(function(){body.value="";pendingAnchor=null;chip.style.display="none";send.disabled=false;load();}).catch(function(){send.disabled=false;});
});
return f;
}
function setAnchorTarget(a){
pendingAnchor=a;
if(mainChip){mainChipQuote.textContent='“'+a.quote+'”';mainChip.style.display="flex";}
if(mainBody){mainBody.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(function(){mainBody.focus();},280);}
}

function render(c,isReply){
var box=mk("div",isReply?"margin-left:1.25rem;padding-left:1rem;border-left:2px solid var(--hairline);":"");
var m=mk("div","display:flex;gap:.5rem;align-items:baseline;font-size:.8rem;color:var(--ink-faint);margin-bottom:.25rem;");
m.appendChild(mk("span","color:var(--ink-soft);font-weight:560;",c.author_name?String(c.author_name):"Anonymous"));
m.appendChild(mk("span",null,fmt(c.created_at)));
box.appendChild(m);
if(!isReply&&c.anchor&&c.anchor.quote){
var q=mk("div","font-size:.8rem;color:var(--ink-soft);border-left:2px solid var(--accent);padding-left:.6rem;margin:0 0 .35rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",String(c.anchor.quote));
box.appendChild(q);
}
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
clearMarks();list.textContent="";
var boxById={};
var tops=items.filter(function(c){return!c.parent_id;});
if(!tops.length)list.appendChild(mk("p","color:var(--ink-faint);font-size:.9rem;margin:0;","No comments yet."));
tops.forEach(function(c){
var box=render(c,false);list.appendChild(box);boxById[c.id]=box;
items.filter(function(r){return r.parent_id===c.id;}).forEach(function(r){list.appendChild(render(r,true));});
});
requestAnimationFrame(function(){
tops.forEach(function(c){if(c.anchor)anchorComment(c,boxById[c.id]);});
layoutPins();
});
}
function load(){
fetch("/_comments?doc="+encodeURIComponent(doc)).then(function(r){return r.json();}).then(function(d){draw((d&&d.comments)||[]);}).catch(function(){});
}
root.appendChild(buildMainForm());

// ─── floating selection affordance ─────────────────────────────────────────
var aff=mk("button","display:none;position:absolute;z-index:50;padding:.3rem .6rem;font:inherit;font-size:.8rem;font-weight:560;color:#fff;background:var(--accent);border:none;border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:"+SANS+";","Comment");
aff.type="button";
var lastAnchor=null;
function hideAff(){aff.style.display="none";}
function showAff(){
var sel=window.getSelection();if(!sel||sel.rangeCount===0)return;
var rects=sel.getRangeAt(0).getClientRects();if(!rects.length)return;
var r=rects[rects.length-1];
aff.style.top=(window.scrollY+r.bottom+6)+"px";
aff.style.left=(window.scrollX+Math.max(r.right-30,r.left))+"px";
aff.style.display="block";
}
aff.addEventListener("mousedown",function(e){e.preventDefault();}); // keep the selection alive
aff.addEventListener("click",function(){
var a=computeAnchor()||lastAnchor;
if(a)setAnchorTarget(a);
hideAff();var s=window.getSelection();if(s)s.removeAllRanges();
});
document.addEventListener("mouseup",function(e){
if(aff.contains(e.target))return;
setTimeout(function(){var a=computeAnchor();if(a){lastAnchor=a;showAff();}else hideAff();},1);
});
document.addEventListener("selectionchange",function(){var s=window.getSelection();if(!s||s.isCollapsed)hideAff();});

fetch("/_feedback?doc="+encodeURIComponent(doc)).then(function(r){return r.json();}).then(function(d){
var rx=(d&&d.reactions)||{};
EMOJI.forEach(function(em){if(counts[em])counts[em].textContent=String(rx[em]||0);});
}).catch(function(){});
load();
document.body.appendChild(pinLayer);
document.body.appendChild(aff);
document.body.appendChild(root);
window.addEventListener("resize",layoutPins);
window.addEventListener("load",layoutPins);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
else start();
})();
`;
