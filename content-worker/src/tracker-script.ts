// Analytics tracker served at /tracker.js on the content origin (WIRE CONTRACT).
//
// A dependency-free client script (< 5 KB) embedded as a string module so it is
// served same-origin under the doc's strict CSP nonce. It never sets a cookie,
// never reads storage, and stays silent when the visitor has Do-Not-Track on.
// All beacons go to /_collect via navigator.sendBeacon (fire-and-forget, no CORS
// preflight, survives page unload). The doc id is read from <meta name="ilo:doc">.

export const TRACKER_JS = `(function(){
  "use strict";
  function start(){
    try{
      if(navigator.doNotTrack==="1"||window.doNotTrack==="1"||navigator.msDoNotTrack==="1")return;
      var m=document.querySelector('meta[name="ilo:doc"]');
      var doc=m&&m.getAttribute("content");
      if(!doc)return;
      function beacon(p){try{p.doc=doc;navigator.sendBeacon("/_collect",JSON.stringify(p));}catch(e){}}
      beacon({type:"pageview",ref:document.referrer||"",w:window.innerWidth||0,h:window.innerHeight||0,path:location.pathname});
      var marks=[25,50,75,100],sent={},maxPct=0;
      function pct(){
        var d=document.documentElement;
        var top=window.pageYOffset||d.scrollTop||0;
        var vh=window.innerHeight||d.clientHeight||0;
        var full=d.scrollHeight||0;
        if(full<=vh)return 100;
        return Math.min(100,Math.round(((top+vh)/full)*100));
      }
      function onScroll(){
        var p=pct();
        if(p>maxPct)maxPct=p;
        for(var i=0;i<marks.length;i++){
          var k=marks[i];
          if(maxPct>=k&&!sent[k]){sent[k]=1;beacon({type:"scroll",scrollPct:k});}
        }
      }
      window.addEventListener("scroll",onScroll,{passive:true});
      onScroll();
      var totalMs=0,lastStart=document.visibilityState==="visible"?Date.now():0;
      function accum(){if(lastStart){totalMs+=Date.now()-lastStart;lastStart=0;}}
      document.addEventListener("visibilitychange",function(){
        if(document.visibilityState==="visible"){if(!lastStart)lastStart=Date.now();}
        else accum();
      });
      var flushed=false;
      function flushTime(){
        if(flushed)return;flushed=true;accum();
        beacon({type:"time",timeS:Math.round(totalMs/1000)});
      }
      window.addEventListener("pagehide",flushTime);
      document.addEventListener("click",function(ev){
        var d=document.documentElement;
        var sw=d.scrollWidth||0,sh=d.scrollHeight||0;
        if(!sw||!sh)return;
        var sx=window.pageXOffset||d.scrollLeft||0;
        var sy=window.pageYOffset||d.scrollTop||0;
        var x=(ev.clientX+sx)/sw,y=(ev.clientY+sy)/sh;
        x=x<0?0:x>1?1:x;y=y<0?0:y>1?1:y;
        beacon({type:"click",x:x,y:y,w:window.innerWidth||0});
      },true);
    }catch(e){}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
`;
