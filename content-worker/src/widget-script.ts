// Feedback + comments widget served at /widget.js on the content origin.
//
// A dependency-free client script injected at the end of every doc under the
// strict CSP nonce. It builds all UI with createElement and inserts EVERY piece
// of user-supplied text via textContent — never innerHTML — so a hostile comment
// or note can never become markup on this origin.
//
// Discoverability + Figma-style comments:
//   - A floating launcher (fixed, bottom-right) is always visible: "Comment"
//     enters pin mode; the pill shows the comment count and scrolls to the panel.
//   - Pin mode: click anywhere on the doc to drop a PIN. A composer popover opens
//     at that spot; the comment is anchored to that point (fractional x/y of the
//     document). Pins render on the page; clicking a pin opens its thread.
//   - Text selection still works: selecting text offers "Comment" and anchors the
//     comment to that text range (highlight + margin pin).
//
//   Feedback: POST /_feedback {doc,kind:"reaction"|"note",value,hp:""}
//             GET  /_feedback?doc=  -> {reactions:{...},notes:[...]}
//   Comments: GET  /_comments?doc=  -> {comments:[{id,parent_id,author_name,body,anchor,created_at}]}
//             POST /_comments {doc,parentId?,name?,body,anchor?,hp:""}
//
//   anchor (text)  = {type:"text",quote,prefix,suffix,start,end}  (char offsets in .doc)
//   anchor (point) = {type:"point",x,y,label}                     (fractions of the document)

export const WIDGET_JS = `(function(){
function start(){
var meta=document.querySelector('meta[name="ilo:doc"]');
var doc=meta&&meta.getAttribute("content");
if(!doc)return;
var docEl=document.querySelector(".doc")||document.body;
var SANS="Inter,ui-sans-serif,system-ui,-apple-system,sans-serif";
function mk(t,s,x){var e=document.createElement(t);if(s)e.style.cssText=s;if(x!=null)e.textContent=x;return e;}
function post(u,b){return fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});}
function hpf(){var h=mk("input","position:absolute;left:-9999px;width:1px;height:1px;opacity:0;");h.type="text";h.name="hp";h.tabIndex=-1;h.setAttribute("autocomplete","off");return h;}
// Scope the widget's own light, always-readable tokens locally so a dark doc
// can't leave dark text on a dark surface. --accent inherits so accents match.
var TOK="--surface:#ffffff;--ink:#1a1a17;--ink-soft:#56564f;--ink-faint:#8a8a80;--hairline:#e2ddd3;--accent-soft:#eef0fd;--canvas:#faf9f7;";
var IN="width:100%;padding:.55rem .7rem;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:8px;box-sizing:border-box;";
var BTN="padding:.5rem .9rem;font:inherit;font-size:.9rem;font-weight:560;color:#fff;background:var(--accent);border:none;border-radius:8px;cursor:pointer;";
var GHOST="padding:.35rem .6rem;font:inherit;font-size:.8rem;color:var(--ink-soft);background:transparent;border:1px solid var(--hairline);border-radius:8px;cursor:pointer;";
var allComments=[];
function fmt(ms){try{return new Date(ms).toLocaleDateString();}catch(e){return"";}}
function docW(){return Math.max(document.documentElement.scrollWidth,document.body.scrollWidth||0);}
function docH(){return Math.max(document.documentElement.scrollHeight,document.body.scrollHeight||0);}
function clamp01(n){return n<0?0:n>1?1:n;}

// ─── document-absolute layer for pins + popovers ───────────────────────────
var layer=mk("div","position:absolute;top:0;left:0;width:0;height:0;z-index:2147483000;pointer-events:none;");

// ─── text-anchor geometry (highlight + margin pin) ─────────────────────────
var markEls=[],anchorMap={},pendingAnchor=null,mainBody=null,mainChip=null,mainChipQuote=null;
function pointOffset(node,off){
if(!docEl)return -1;
var w=document.createTreeWalker(docEl,NodeFilter.SHOW_TEXT,null),t,total=0;
if(node.nodeType===3){while(t=w.nextNode()){if(t===node)return total+off;total+=t.nodeValue.length;}return -1;}
var stop=node.childNodes?node.childNodes[off]:null;
if(!stop){while(t=w.nextNode())total+=t.nodeValue.length;return total;}
while(t=w.nextNode()){var rel=t.compareDocumentPosition(stop);if(rel&Node.DOCUMENT_POSITION_FOLLOWING)total+=t.nodeValue.length;else break;}
return total;
}
function computeAnchor(){
if(!docEl)return null;
var sel=window.getSelection();
if(!sel||sel.rangeCount===0||sel.isCollapsed)return null;
var range=sel.getRangeAt(0);
if(!docEl.contains(range.startContainer)||!docEl.contains(range.endContainer))return null;
var start=pointOffset(range.startContainer,range.startOffset),end=pointOffset(range.endContainer,range.endOffset);
if(start<0||end<0||end<=start)return null;
var full=docEl.textContent||"";if(end>full.length)return null;
var quote=full.slice(start,end);if(!quote.trim()||quote.length>400)return null;
return {type:"text",quote:quote,prefix:full.slice(Math.max(0,start-48),start),suffix:full.slice(end,end+48),start:start,end:end};
}
function highlight(start,end){
if(!docEl)return[];
var nodes=[],w=document.createTreeWalker(docEl,NodeFilter.SHOW_TEXT,null),t;while(t=w.nextNode())nodes.push(t);
var total=0,marks=[];
for(var i=0;i<nodes.length;i++){var node=nodes[i],len=node.nodeValue.length,ns=total,ne=total+len;total=ne;
if(ne<=start||ns>=end)continue;var a=Math.max(start,ns)-ns,b=Math.min(end,ne)-ns;if(a>=b)continue;
var rg=document.createRange();rg.setStart(node,a);rg.setEnd(node,b);
var m=document.createElement("mark");m.style.cssText="background:var(--accent-soft);color:inherit;border-radius:2px;box-shadow:inset 0 -1px 0 var(--accent);cursor:pointer;";
try{rg.surroundContents(m);marks.push(m);}catch(e){}}
return marks;
}
function clearMarks(){for(var i=0;i<markEls.length;i++){var m=markEls[i],p=m.parentNode;if(!p)continue;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);if(p.normalize)p.normalize();}markEls=[];anchorMap={};}
function setActive(id,on){var e=anchorMap[id];if(!e)return;e.marks.forEach(function(m){m.style.background=on?"var(--accent)":"var(--accent-soft)";m.style.color=on?"#fff":"inherit";});if(e.pin)e.pin.style.transform=on?"scale(1.4)":"none";}
function focusComment(id){var e=anchorMap[id];if(!e||!e.box)return;var b=e.box;b.scrollIntoView({behavior:"smooth",block:"center"});b.style.transition="background 500ms ease";b.style.background="var(--accent-soft)";setTimeout(function(){b.style.background="transparent";},900);}
function positionMarginPin(id){var e=anchorMap[id];if(!e||!e.pin||!e.marks.length||!docEl)return;var mr=e.marks[0].getBoundingClientRect(),dr=docEl.getBoundingClientRect();var left=dr.left+window.scrollX-18;if(left<4)left=4;e.pin.style.top=(mr.top+window.scrollY+2)+"px";e.pin.style.left=left+"px";}
function anchorText(c,box){
var a=c.anchor;if(!a||a.type!=="text"||!box)return;
var marks=highlight(a.start,a.end);if(!marks.length)return;
anchorMap[c.id]={marks:marks,box:box,pin:null};
marks.forEach(function(m){markEls.push(m);m.addEventListener("click",function(){focusComment(c.id);});m.addEventListener("mouseenter",function(){setActive(c.id,true);});m.addEventListener("mouseleave",function(){setActive(c.id,false);});});
var pin=mk("button","position:absolute;width:12px;height:12px;padding:0;border-radius:50%;background:var(--accent);border:2px solid #fff;cursor:pointer;transition:transform 120ms ease;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,.25);");
pin.type="button";pin.title="View comment";pin.addEventListener("click",function(){focusComment(c.id);});
layer.appendChild(pin);anchorMap[c.id].pin=pin;
box.addEventListener("mouseenter",function(){setActive(c.id,true);});box.addEventListener("mouseleave",function(){setActive(c.id,false);});
positionMarginPin(c.id);
}

// ─── popover (composer / thread) ───────────────────────────────────────────
var popover=null;
// Hover-to-open state for pins. pinnedOpen=true means a click pinned the popover
// so it must NOT auto-close on mouseleave. hoverC tracks which comment's thread is
// currently shown so we don't rebuild (flicker) while the pointer jitters on it.
var hoverOpenT=null,hoverCloseT=null,hoverC=null,pinnedOpen=false;
function cancelHoverTimers(){if(hoverOpenT){clearTimeout(hoverOpenT);hoverOpenT=null;}if(hoverCloseT){clearTimeout(hoverCloseT);hoverCloseT=null;}}
function scheduleHoverClose(){cancelHoverTimers();if(pinnedOpen)return;hoverCloseT=setTimeout(function(){hoverCloseT=null;if(!pinnedOpen&&hoverC)closePop();},220);}
function closePop(){if(popover&&popover.parentNode)popover.parentNode.removeChild(popover);popover=null;pinnedOpen=false;hoverC=null;cancelHoverTimers();}
function popAtDoc(dl,dt){
closePop();
var pv=mk("div",TOK+"position:absolute;z-index:2147483001;width:300px;max-width:88vw;background:var(--canvas);border:1px solid var(--hairline);border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.2);padding:.85rem;font-family:"+SANS+";color:var(--ink);pointer-events:auto;");
var left=dl+16;if(left+300>docW())left=Math.max(8,dl-316);if(left<8)left=8;
pv.style.left=left+"px";pv.style.top=dt+"px";
// Entering the popover cancels a pending hover-close so the user can read/reply;
// leaving it re-arms the grace timer (a no-op unless a hover thread is active).
pv.addEventListener("mouseenter",cancelHoverTimers);pv.addEventListener("mouseleave",scheduleHoverClose);
layer.appendChild(pv);popover=pv;return pv;
}
function appendComment(parent,c,isReply){
var box=mk("div",isReply?"margin-left:.9rem;padding-left:.7rem;border-left:2px solid var(--hairline);margin-top:.55rem;":"margin-top:.1rem;");
var m=mk("div","display:flex;gap:.4rem;align-items:baseline;font-size:.75rem;color:var(--ink-faint);margin-bottom:.2rem;");
m.appendChild(mk("span","color:var(--ink-soft);font-weight:560;",c.author_name?String(c.author_name):"Anonymous"));
m.appendChild(mk("span",null,fmt(c.created_at)));box.appendChild(m);
box.appendChild(mk("div","white-space:pre-wrap;line-height:1.5;font-size:.9rem;",String(c.body==null?"":c.body)));
parent.appendChild(box);
}
function replyForm(parentId,onDone){
var f=mk("form","display:flex;flex-direction:column;gap:.4rem;margin-top:.65rem;");
var body=mk("textarea",IN+"min-height:2.4rem;resize:vertical;");body.placeholder="Reply";body.required=true;body.maxLength=4000;
var hp=hpf(),send=mk("button",BTN+"align-self:flex-start;font-size:.82rem;","Reply");
f.appendChild(body);f.appendChild(hp);f.appendChild(send);
f.addEventListener("submit",function(e){e.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;post("/_comments",{doc:doc,body:v,hp:hp.value,parentId:parentId}).then(function(){if(onDone)onDone();}).catch(function(){send.disabled=false;});});
return f;
}
// Document-absolute position to anchor a popover for a given anchor.
function anchorPos(a){
if(a&&(a.type==="point"||a.type==="region"))return{left:clamp01(a.x)*docW(),top:clamp01(a.y)*docH()};
return{left:Math.max(8,docW()/2-150),top:window.scrollY+90};
}
function labelOf(a){return a?(a.type==="text"?a.quote:a.label):"";}
function labelLine(a){var lbl=labelOf(a);if(!lbl)return null;return mk("div","font-size:.72rem;color:var(--ink-faint);margin-bottom:.4rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",(a.type==="text"?"On: “"+lbl+"”":a.type==="region"?"On a selected area":"On: "+lbl));}
function openThread(c){
var a=c.anchor,pp=anchorPos(a),pv=popAtDoc(pp.left,pp.top);
var ll=labelLine(a);if(ll)pv.appendChild(ll);
appendComment(pv,c,false);
allComments.filter(function(r){return r.parent_id===c.id;}).forEach(function(r){appendComment(pv,r,true);});
pv.appendChild(replyForm(c.id,function(){closePop();load();}));
}
// openThread()->popAtDoc()->closePop() resets pinnedOpen/hoverC, so the flags are
// set AFTER the build. Pinned = click (stays open); hover = auto-closes on leave.
function openThreadPinned(c){cancelHoverTimers();openThread(c);pinnedOpen=true;hoverC=c;}
function openThreadHover(c){cancelHoverTimers();openThread(c);pinnedOpen=false;hoverC=c;}
// Composer for a new anchored comment. anchor is the full anchor object; dl/dt
// override the popover position (used for text selection, where the anchor has
// no x/y). All three anchor kinds submit through here.
function openComposer(anchor,dl,dt){
if(dl==null){var pp=anchorPos(anchor);dl=pp.left;dt=pp.top;}
var pv=popAtDoc(dl,dt);
var ll=labelLine(anchor);if(ll)pv.appendChild(ll);
var name=mk("input",IN);name.type="text";name.placeholder="Name (optional)";name.maxLength=80;
var body=mk("textarea",IN+"min-height:3.5rem;resize:vertical;margin-top:.4rem;");body.placeholder="Add a comment";body.required=true;body.maxLength=4000;
var hp=hpf(),row=mk("div","display:flex;gap:.5rem;margin-top:.55rem;");
var send=mk("button",BTN,"Comment"),cancel=mk("button",GHOST,"Cancel");
row.appendChild(send);row.appendChild(cancel);
pv.appendChild(name);pv.appendChild(body);pv.appendChild(hp);pv.appendChild(row);
setTimeout(function(){body.focus();},30);
cancel.addEventListener("click",function(e){e.preventDefault();closePop();});
pv.addEventListener("submit",function(e){e.preventDefault();});
send.addEventListener("click",function(e){
e.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;
var p={doc:doc,body:v,hp:hp.value,anchor:anchor};var nm=name.value.trim();if(nm)p.name=nm;
post("/_comments",p).then(function(){closePop();load();}).catch(function(){send.disabled=false;});
});
}

// ─── point pins ────────────────────────────────────────────────────────────
function renderPins(){
[].slice.call(layer.querySelectorAll(".ilo-pin,.ilo-box")).forEach(function(p){if(p.parentNode)p.parentNode.removeChild(p);});
var tops=allComments.filter(function(c){return!c.parent_id&&c.anchor&&(c.anchor.type==="point"||c.anchor.type==="region");});
var W=docW(),H=docH(),n=0;
tops.forEach(function(c){
n++;var a=c.anchor,count=1+allComments.filter(function(r){return r.parent_id===c.id;}).length;
var px=clamp01(a.x)*W,py=clamp01(a.y)*H,box=null;
if(a.type==="region"){
box=mk("div","");box.className="ilo-box";
box.style.cssText="position:absolute;pointer-events:none;border:2px solid var(--accent,#3b5bdb);background:rgba(59,91,219,.08);border-radius:4px;transition:background 120ms ease;z-index:39;";
box.style.left=px+"px";box.style.top=py+"px";box.style.width=(clamp01(a.w)*W)+"px";box.style.height=(clamp01(a.h)*H)+"px";
layer.appendChild(box);
}
var pin=mk("button","","");pin.className="ilo-pin";pin.type="button";pin.title="View thread";
pin.style.cssText="position:absolute;pointer-events:auto;min-width:24px;height:24px;padding:0 6px;border-radius:12px 12px 12px 2px;background:var(--accent,#3b5bdb);color:#fff;border:2px solid #fff;font:600 12px "+SANS+";display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);transform:translate(-2px,-24px);z-index:41;";
pin.textContent=count>1?(n+" · "+count):String(n);
pin.style.left=px+"px";pin.style.top=py+"px";
(function(c,box){
// Click pins the thread open (or toggles it shut if this pin's thread is pinned).
pin.addEventListener("click",function(e){e.stopPropagation();cancelHoverTimers();if(popover&&hoverC===c&&pinnedOpen){closePop();}else{openThreadPinned(c);}});
// Hover: brighten a region box, then open the thread after a short delay. Skip in
// pin-placement mode, and don't rebuild if this pin's thread is already showing.
pin.addEventListener("mouseenter",function(){if(box)box.style.background="rgba(59,91,219,.22)";if(pinMode)return;cancelHoverTimers();if(popover&&hoverC===c)return;hoverOpenT=setTimeout(function(){hoverOpenT=null;if(pinMode)return;openThreadHover(c);},180);});
// Leaving the pin arms the grace timer; moving onto the popover cancels it.
pin.addEventListener("mouseleave",function(){if(box)box.style.background="rgba(59,91,219,.08)";scheduleHoverClose();});
})(c,box);
layer.appendChild(pin);
});
}

// ─── pin mode ──────────────────────────────────────────────────────────────
var pinMode=false,hint=null,dragStart=null,band=null;
function enterPin(){
if(pinMode)return;pinMode=true;document.documentElement.style.cursor="crosshair";document.body.style.userSelect="none";document.body.style.touchAction="none";
hint=mk("div",TOK+"position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:2147483003;background:#111;color:#fff;padding:.5rem .9rem;border-radius:999px;font:500 13px "+SANS+";box-shadow:0 4px 16px rgba(0,0,0,.3);pointer-events:none;white-space:nowrap;","Click a spot, or drag to select an area · Esc to cancel");
document.body.appendChild(hint);
document.addEventListener("pointerdown",onDown,true);
launchBtn.textContent="Cancel";launchBtn.style.background="#111";
}
function exitPin(){
if(!pinMode)return;pinMode=false;document.documentElement.style.cursor="";document.body.style.userSelect="";document.body.style.touchAction="";
if(hint&&hint.parentNode)hint.parentNode.removeChild(hint);hint=null;
document.removeEventListener("pointerdown",onDown,true);document.removeEventListener("pointermove",onMove,true);document.removeEventListener("pointerup",onUp,true);
if(band&&band.parentNode)band.parentNode.removeChild(band);band=null;dragStart=null;
launchBtn.textContent="Comment";launchBtn.style.background="var(--accent,#3b5bdb)";
}
function onDown(e){
if(layer.contains(e.target)||launcher.contains(e.target))return;
e.preventDefault();e.stopPropagation();
dragStart={x:e.clientX,y:e.clientY};
band=mk("div","position:absolute;z-index:2147483001;border:2px solid var(--accent,#3b5bdb);background:rgba(59,91,219,.12);border-radius:4px;pointer-events:none;");
band.style.left=(e.clientX+window.scrollX)+"px";band.style.top=(e.clientY+window.scrollY)+"px";band.style.width="0px";band.style.height="0px";
layer.appendChild(band);
document.addEventListener("pointermove",onMove,true);document.addEventListener("pointerup",onUp,true);
}
function onMove(e){
if(!dragStart||!band)return;e.preventDefault();
var x0=Math.min(dragStart.x,e.clientX),y0=Math.min(dragStart.y,e.clientY),x1=Math.max(dragStart.x,e.clientX),y1=Math.max(dragStart.y,e.clientY);
band.style.left=(x0+window.scrollX)+"px";band.style.top=(y0+window.scrollY)+"px";band.style.width=(x1-x0)+"px";band.style.height=(y1-y0)+"px";
}
function onUp(e){
document.removeEventListener("pointermove",onMove,true);document.removeEventListener("pointerup",onUp,true);
var s=dragStart;dragStart=null;if(band&&band.parentNode)band.parentNode.removeChild(band);band=null;if(!s)return;
var W=docW(),H=docH(),dx=Math.abs(e.clientX-s.x),dy=Math.abs(e.clientY-s.y);
var el=document.elementFromPoint(s.x,s.y);var label=el?(el.textContent||"").replace(/\\s+/g," ").trim().slice(0,80):"";
exitPin();
if(dx<6&&dy<6){openComposer({type:"point",x:clamp01((s.x+window.scrollX)/W),y:clamp01((s.y+window.scrollY)/H),label:label});}
else{openComposer({type:"region",x:clamp01((Math.min(s.x,e.clientX)+window.scrollX)/W),y:clamp01((Math.min(s.y,e.clientY)+window.scrollY)/H),w:clamp01(dx/W),h:clamp01(dy/H),label:label});}
}

// ─── floating launcher (always visible) ────────────────────────────────────
var launcher=mk("div",TOK+"position:fixed;right:18px;bottom:18px;z-index:2147483003;display:flex;gap:.45rem;align-items:center;font-family:"+SANS+";");
var openPanel=mk("button","","Comments");
openPanel.style.cssText="padding:.6rem .9rem;font:500 13px "+SANS+";color:#1a1a17;background:#fff;border:1px solid #e2ddd3;border-radius:999px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.14);";
openPanel.addEventListener("click",function(){root.scrollIntoView({behavior:"smooth",block:"start"});});
var launchBtn=mk("button","","Comment");
launchBtn.style.cssText="padding:.6rem 1.05rem;font:600 14px "+SANS+";color:#fff;background:var(--accent,#3b5bdb);border:none;border-radius:999px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.24);";
launchBtn.addEventListener("click",function(){if(pinMode)exitPin();else enterPin();});
launcher.appendChild(openPanel);launcher.appendChild(launchBtn);

// ─── bottom panel: reactions + notes + full comment list ───────────────────
var root=mk("section",TOK+"max-width:72ch;margin:4rem auto 7rem;padding:1.75rem 1.75rem 2rem;background:var(--canvas);border:1px solid var(--hairline);border-radius:14px;font-family:"+SANS+";color:var(--ink);");
var EMOJI=["👍","🤔","👀"],counts={};
var rrow=mk("div","display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;");
EMOJI.forEach(function(em){
var b=mk("button",GHOST+"display:inline-flex;align-items:center;gap:.35rem;font-size:1rem;");
b.appendChild(mk("span",null,em));var c=mk("span","color:var(--ink-faint);font-size:.85rem;","0");counts[em]=c;b.appendChild(c);
b.addEventListener("click",function(){if(b.disabled)return;b.disabled=true;b.style.opacity=".6";c.textContent=String((parseInt(c.textContent,10)||0)+1);post("/_feedback",{doc:doc,kind:"reaction",value:em,hp:""}).catch(function(){});});
rrow.appendChild(b);});
root.appendChild(rrow);
var noteBtn=mk("button",GHOST+"margin-top:.75rem;","Leave a note");
var noteForm=mk("form","display:none;flex-direction:column;gap:.5rem;margin-top:.75rem;max-width:34rem;");
var noteTa=mk("textarea",IN+"min-height:4.5rem;resize:vertical;");noteTa.placeholder="Note to the author";noteTa.maxLength=2000;
var noteHp=hpf(),noteSend=mk("button",BTN,"Send note");
noteForm.appendChild(noteTa);noteForm.appendChild(noteHp);noteForm.appendChild(noteSend);
noteBtn.addEventListener("click",function(){noteForm.style.display=noteForm.style.display==="none"?"flex":"none";});
noteForm.addEventListener("submit",function(ev){ev.preventDefault();var v=noteTa.value.trim();if(!v)return;noteSend.disabled=true;post("/_feedback",{doc:doc,kind:"note",value:v,hp:noteHp.value}).then(function(){noteTa.value="";noteForm.style.display="none";noteSend.disabled=false;noteBtn.textContent="Note sent — thank you";}).catch(function(){noteSend.disabled=false;});});
root.appendChild(noteBtn);root.appendChild(noteForm);
root.appendChild(mk("h3","font-family:"+SANS+";font-size:1.1rem;font-weight:620;margin:2.5rem 0 .35rem;","Comments"));
root.appendChild(mk("p","font-size:.8rem;color:var(--ink-faint);margin:0 0 1rem;","Tip: use the Comment button (bottom-right) to pin a comment anywhere on the page."));
var list=mk("div","display:flex;flex-direction:column;gap:1.1rem;");
root.appendChild(list);

// top-level comment form (kept for a general, unanchored comment + text selection)
function form(parentId,onDone){
var f=mk("form","display:flex;flex-direction:column;gap:.5rem;margin-top:.6rem;max-width:34rem;");
var name=mk("input",IN);name.type="text";name.placeholder="Name (optional)";name.maxLength=80;
var body=mk("textarea",IN+"min-height:3.5rem;resize:vertical;");body.placeholder="Write a reply";body.required=true;body.maxLength=4000;
var hp=hpf(),send=mk("button",BTN,"Reply");f.appendChild(name);f.appendChild(body);f.appendChild(hp);f.appendChild(send);
f.addEventListener("submit",function(ev){ev.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;var p={doc:doc,body:v,hp:hp.value,parentId:parentId},nm=name.value.trim();if(nm)p.name=nm;post("/_comments",p).then(function(){if(onDone)onDone();load();}).catch(function(){send.disabled=false;});});
return f;
}
function buildMainForm(){
var f=mk("form","display:flex;flex-direction:column;gap:.5rem;margin-top:1.25rem;max-width:34rem;");
var chip=mk("div","display:none;align-items:center;gap:.5rem;padding:.4rem .6rem;background:var(--accent-soft);border:1px solid var(--hairline);border-radius:8px;font-size:.8rem;color:var(--ink-soft);");
chip.appendChild(mk("span","color:var(--accent);font-weight:560;white-space:nowrap;","On selection:"));
var qlabel=mk("span","overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:22rem;");chip.appendChild(qlabel);
var clr=mk("button","margin-left:auto;padding:.05rem .35rem;font:inherit;font-size:.85rem;color:var(--ink-soft);background:transparent;border:none;cursor:pointer;","✕");clr.type="button";clr.addEventListener("click",function(){pendingAnchor=null;chip.style.display="none";});chip.appendChild(clr);
var name=mk("input",IN);name.type="text";name.placeholder="Name (optional)";name.maxLength=80;
var body=mk("textarea",IN+"min-height:3.5rem;resize:vertical;");body.placeholder="Add a comment";body.required=true;body.maxLength=4000;
var hp=hpf(),send=mk("button",BTN,"Post comment");
f.appendChild(chip);f.appendChild(name);f.appendChild(body);f.appendChild(hp);f.appendChild(send);
mainBody=body;mainChip=chip;mainChipQuote=qlabel;
f.addEventListener("submit",function(ev){ev.preventDefault();var v=body.value.trim();if(!v)return;send.disabled=true;var p={doc:doc,body:v,hp:hp.value},nm=name.value.trim();if(nm)p.name=nm;if(pendingAnchor)p.anchor=pendingAnchor;post("/_comments",p).then(function(){body.value="";pendingAnchor=null;chip.style.display="none";send.disabled=false;load();}).catch(function(){send.disabled=false;});});
return f;
}
function setAnchorTarget(a){pendingAnchor=a;if(mainChip){mainChipQuote.textContent='“'+a.quote+'”';mainChip.style.display="flex";}if(mainBody){mainBody.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(function(){mainBody.focus();},280);}}

function renderRow(c,isReply){
var box=mk("div",isReply?"margin-left:1.25rem;padding-left:1rem;border-left:2px solid var(--hairline);":"");
var m=mk("div","display:flex;gap:.5rem;align-items:baseline;font-size:.8rem;color:var(--ink-faint);margin-bottom:.25rem;");
m.appendChild(mk("span","color:var(--ink-soft);font-weight:560;",c.author_name?String(c.author_name):"Anonymous"));
m.appendChild(mk("span",null,fmt(c.created_at)));box.appendChild(m);
if(!isReply&&c.anchor){
if(c.anchor.type==="point"||c.anchor.type==="region"){
var p=mk("button","display:inline-flex;align-items:center;gap:.3rem;font-size:.75rem;color:var(--accent);background:transparent;border:none;padding:0;cursor:pointer;margin:0 0 .3rem;",c.anchor.type==="region"?"▭ area on the page":"📍 pinned on the page");
p.type="button";p.addEventListener("click",function(){openThread(c);});box.appendChild(p);
}else if(c.anchor.quote){
box.appendChild(mk("div","font-size:.8rem;color:var(--ink-soft);border-left:2px solid var(--accent);padding-left:.6rem;margin:0 0 .35rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",String(c.anchor.quote)));
}}
box.appendChild(mk("div","white-space:pre-wrap;line-height:1.55;",String(c.body==null?"":c.body)));
if(!isReply){var rbtn=mk("button",GHOST+"margin-top:.4rem;","Reply"),slot=mk("div");rbtn.addEventListener("click",function(){if(slot.firstChild){slot.textContent="";return;}slot.appendChild(form(c.id,function(){slot.textContent="";}));});box.appendChild(rbtn);box.appendChild(slot);}
return box;
}
function draw(items){
allComments=items;clearMarks();list.textContent="";
var boxById={},tops=items.filter(function(c){return!c.parent_id;});
openPanel.textContent=tops.length?(tops.length+(tops.length===1?" comment":" comments")):"Comments";
if(!tops.length)list.appendChild(mk("p","color:var(--ink-faint);font-size:.9rem;margin:0;","No comments yet."));
tops.forEach(function(c){var box=renderRow(c,false);list.appendChild(box);boxById[c.id]=box;items.filter(function(r){return r.parent_id===c.id;}).forEach(function(r){list.appendChild(renderRow(r,true));});});
requestAnimationFrame(function(){tops.forEach(function(c){if(c.anchor&&c.anchor.type==="text")anchorText(c,boxById[c.id]);});renderPins();for(var id in anchorMap)positionMarginPin(id);});
}
function load(){fetch("/_comments?doc="+encodeURIComponent(doc)).then(function(r){return r.json();}).then(function(d){draw((d&&d.comments)||[]);}).catch(function(){});}
root.appendChild(buildMainForm());

// ─── text-selection affordance (anchors to a text range) ───────────────────
var aff=mk("button","display:none;position:absolute;z-index:2147483002;padding:.34rem .65rem;font:600 .82rem "+SANS+";color:#fff;background:var(--accent,#3b5bdb);border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);white-space:nowrap;","💬 Comment");aff.type="button";
var lastAnchor=null;
function hideAff(){aff.style.display="none";}
function showAff(){var sel=window.getSelection();if(!sel||sel.rangeCount===0)return;var rects=sel.getRangeAt(0).getClientRects();if(!rects.length)return;var r=rects[rects.length-1];aff.style.top=(window.scrollY+r.bottom+8)+"px";aff.style.left=(window.scrollX+Math.max(r.right-40,r.left))+"px";aff.style.display="block";}
aff.addEventListener("mousedown",function(e){e.preventDefault();});
aff.addEventListener("click",function(){
var a=computeAnchor()||lastAnchor,dl,dt,sel=window.getSelection();
if(sel&&sel.rangeCount){var rr=sel.getRangeAt(0).getClientRects();if(rr.length){var last=rr[rr.length-1];dl=window.scrollX+last.left;dt=window.scrollY+last.bottom+8;}}
hideAff();if(sel)sel.removeAllRanges();
if(a)openComposer(a,dl,dt);
});
document.addEventListener("mouseup",function(e){if(aff.contains(e.target)||pinMode)return;setTimeout(function(){var a=computeAnchor();if(a){lastAnchor=a;showAff();}else hideAff();},1);});
document.addEventListener("selectionchange",function(){var s=window.getSelection();if(!s||s.isCollapsed)hideAff();});

// ─── global popover dismissal ──────────────────────────────────────────────
document.addEventListener("keydown",function(e){if(e.key==="Escape"){closePop();exitPin();}});
document.addEventListener("mousedown",function(e){if(popover&&!popover.contains(e.target)&&!(e.target&&(""+(e.target.className||"")).indexOf("ilo-pin")>=0))closePop();},true);

fetch("/_feedback?doc="+encodeURIComponent(doc)).then(function(r){return r.json();}).then(function(d){var rx=(d&&d.reactions)||{};EMOJI.forEach(function(em){if(counts[em])counts[em].textContent=String(rx[em]||0);});}).catch(function(){});
load();
document.body.appendChild(layer);
document.body.appendChild(aff);
document.body.appendChild(root);
document.body.appendChild(launcher);
window.addEventListener("resize",function(){renderPins();for(var id in anchorMap)positionMarginPin(id);});
window.addEventListener("load",function(){renderPins();for(var id in anchorMap)positionMarginPin(id);});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
else start();
})();
`;
