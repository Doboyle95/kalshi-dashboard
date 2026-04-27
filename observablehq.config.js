export default {
  title: "US Prediction Markets",
  base: "/kalshi-dashboard/",
  root: "src",
  theme: ["air", "near-midnight"],
  style: "styles.css",
  head: [
    '<link rel="preconnect" href="https://rsms.me/">',
    '<link rel="stylesheet" href="https://rsms.me/inter/inter.css">',
    // Apply saved theme before first paint to avoid FOUC
    `<script>(function(){try{var t=localStorage.getItem("kalshi-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>`,
    // Inject the light/dark/system toggle after load
    `<script>document.addEventListener("DOMContentLoaded",function(){
      var KEY="kalshi-theme";
      var cur=localStorage.getItem(KEY)||"system";
      var wrap=document.createElement("div");
      wrap.className="theme-toggle";
      wrap.setAttribute("role","group");
      wrap.setAttribute("aria-label","Theme");
      var opts=[["light","☀","Light"],["dark","☾","Dark"],["system","⚙","System"]];
      opts.forEach(function(o){
        var b=document.createElement("button");
        b.type="button";
        b.textContent=o[1];
        b.title=o[2];
        b.setAttribute("aria-label",o[2]);
        b.dataset.theme=o[0];
        b.addEventListener("click",function(){apply(o[0],true);});
        wrap.appendChild(b);
      });
      document.body.appendChild(wrap);
      function apply(v,persist){
        cur=v;
        if(persist){try{localStorage.setItem(KEY,v);}catch(e){}}
        if(v==="system")document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme",v);
        Array.prototype.forEach.call(wrap.children,function(b){
          b.setAttribute("aria-pressed",b.dataset.theme===v?"true":"false");
        });
      }
      apply(cur,false);
    });</script>`
  ].join("\n"),
  pages: [
    {name: "Overview", path: "/"},
    {name: "Kalshi Volume", path: "/volume"},
    {name: "Trade Size Mix", path: "/trade-size"},
    {name: "Fee Revenue", path: "/fees"},
    {name: "Categories", path: "/categories"},
    {name: "Ask Data", path: "/chat"},
    {name: "Parlay P&L", path: "/parlay"},
    {name: "Calibration", path: "/calibration"},
    {name: "Platform Comparison", path: "/competitors"},
    {name: "Polymarket US", path: "/polymarket"},
    {name: "ForecastEx", path: "/forecastex"},
    {name: "Crypto.com/Nadex", path: "/nadex"},
  ],
  footer: "Data: Kalshi trade records via Daniel O'Boyle. Updated nightly.",
};
