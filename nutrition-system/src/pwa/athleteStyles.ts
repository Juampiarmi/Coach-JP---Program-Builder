// Hoja de estilos de la PWA del atleta (se embebe inline en el index.html exportado).
// Design System Coach JP Nutrition: base #0B0F17, superficies #131B2A, bordes blancos 8 %,
// CTA naranja #F97316, datos/evidencia cian #38BDF8, títulos #FFF, lectura #94A3B8, micro #64748B.
const styles = `
:root{--bg:#0B0F17;--bg2:#0E1420;--panel:#131B2A;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.12);--cyan:#38BDF8;--cyan-soft:rgba(56,189,248,.1);--cyan-edge:rgba(56,189,248,.2);--fire:#F97316;--fire-hot:#FF5E1E;--fire-soft:rgba(249,115,22,.1);--danger:#EF4444;--title:#FFFFFF;--text:#94A3B8;--micro:#64748B;--safe-top:env(safe-area-inset-top,0px);--safe-bot:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{background:var(--bg);color:var(--text);font-family:Inter,"Geist Sans",system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased}
body{min-height:100vh;padding:calc(var(--safe-top) + 14px) 16px calc(var(--safe-bot) + 96px);background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(180deg,var(--bg),var(--bg2));background-size:28px 28px,28px 28px,auto;background-attachment:fixed}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.mono,.kcal,.prog,.bar .l span,.meal .time,.item .g,.opt .g,.ring .v b{font-family:"JetBrains Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
.tag{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan)}
.muted{color:var(--micro)}
.top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.top svg{flex:none}
.brand{font-weight:700;letter-spacing:.04em;font-size:15px;color:var(--title)}
.brand b{color:var(--fire);font-weight:700}
.handle{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--micro)}
.phase{margin-left:auto;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--fire);background:var(--fire-soft);border:1px solid rgba(249,115,22,.35);padding:5px 8px;border-radius:6px;font-weight:700;text-align:center;line-height:1.25}
h1{font-weight:700;font-size:27px;line-height:1.08;letter-spacing:-.02em;margin:6px 0 6px;color:var(--title)}
.note{font-size:13.5px;color:var(--text);margin-bottom:16px}
.switch{display:grid;grid-template-columns:1fr 1fr;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:4px;margin:14px 0 16px;position:relative}
.switch button{position:relative;z-index:1;padding:12px 6px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;font-weight:700;color:var(--micro);transition:color .25s}
.switch button.on{color:var(--title)}
.switch .knob{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:9px;background:rgba(56,189,248,.08);border:1px solid var(--cyan);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.switch.off .knob{transform:translateX(100%)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden}
.card:before{content:"";position:absolute;inset:0;border-radius:14px;pointer-events:none;background:linear-gradient(90deg,var(--cyan) 0 12px,transparent 12px) top left/100% 1px no-repeat,linear-gradient(var(--cyan) 0 12px,transparent 12px) top left/1px 100% no-repeat;opacity:.55}
.hero{display:flex;align-items:center;gap:14px}
.hero>div:last-child{min-width:0}
.ring{width:92px;height:92px;flex:none;position:relative}
.ring svg{transform:rotate(-90deg);width:92px;height:92px}
.ring .v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring .v b{font-size:19px;line-height:1;color:var(--title)}
.ring .v span{font-family:"JetBrains Mono",monospace;font-size:8.5px;letter-spacing:.14em;color:var(--micro);margin-top:3px}
.kcal{font-weight:700;font-size:clamp(32px,10.5vw,44px);line-height:.95;letter-spacing:-.03em;white-space:nowrap;color:var(--title)}
.kcal small{font-size:11px;letter-spacing:.18em;color:var(--micro);font-weight:500;margin-left:4px}
.prog{font-size:10.5px;color:var(--text);letter-spacing:.04em}
.bars{display:grid;gap:11px;margin-top:16px}
.bar .l{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;color:var(--text)}
.bar .l b{color:var(--title)}
.bar .t{height:4px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden}
.bar .t i{display:block;height:100%;border-radius:3px;background:var(--cyan);transition:width .5s cubic-bezier(.2,.8,.2,1)}
.bar.f .t i{background:var(--fire)}
.sec{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:22px 2px 10px}
.meal{padding:0}
.meal .hd{display:flex;align-items:center;gap:12px;padding:14px 14px 10px}
.meal .time{font-size:12px;color:var(--cyan);background:var(--cyan-soft);border:1px solid var(--cyan-edge);padding:4px 7px;border-radius:6px}
.meal .nm{font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.15;color:var(--title)}
.meal .mm{font-size:12px;color:var(--text);margin-top:3px}
.chk{margin-left:auto;width:34px;height:34px;flex:none;border-radius:9px;border:1px solid var(--line2);display:grid;place-items:center;transition:all .2s}
.chk svg{opacity:0;transform:scale(.6);transition:all .2s}
.chk svg path{stroke:var(--cyan)}
.done .chk{background:rgba(56,189,248,.08);border-color:var(--cyan)}
.done .chk svg{opacity:1;transform:none}
.done .items{opacity:.5}
.items{border-top:1px solid var(--line);transition:opacity .2s}
.item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 14px;border-bottom:1px solid var(--line)}
.item:last-child{border-bottom:0}
.item .g{font-weight:700;font-size:13px;min-width:64px;color:var(--title)}
.item .g em{display:block;font-style:normal;font-weight:400;font-size:10px;color:var(--micro);margin-top:1px}
.item .fd{flex:1;font-size:14.5px;line-height:1.25;color:var(--title)}
.item .fd s{text-decoration:none;display:block;font-size:11px;color:var(--fire);margin-top:2px}
.item .sw{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.1em;color:var(--cyan);border:1px solid var(--cyan-edge);background:var(--cyan-soft);padding:4px 7px;border-radius:6px}
.leu{display:flex;align-items:center;gap:8px;padding:9px 14px;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.04em;border-top:1px solid var(--line);font-variant-numeric:tabular-nums}
.leu .dot{width:6px;height:6px;border-radius:50%;flex:none}
.leu.ok{color:var(--cyan);background:rgba(56,189,248,.05)}.leu.ok .dot{background:var(--cyan)}
.leu.low{color:var(--fire);background:var(--fire-soft)}.leu.low .dot{background:var(--fire);animation:pulse 1.4s infinite}
.leu.na{color:var(--micro)}.leu.na .dot{background:var(--micro)}
@keyframes pulse{50%{opacity:.3}}
.sup{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;padding:12px 0;border-bottom:1px solid var(--line)}
.sup:last-child{border-bottom:0}
.sup .chk{margin-left:0;width:28px;height:28px;margin-top:2px}
.sup.done .chk{background:rgba(56,189,248,.08);border-color:var(--cyan)}
.sup b{display:block;font-size:14.5px;color:var(--title)}
.sup .ds,.sup .tm{font-size:13px;color:var(--text)}
.sup .ds em,.sup .tm em{font-style:normal;font-family:"JetBrains Mono",monospace;color:var(--micro);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;margin-right:6px}
.sup a{font-family:"JetBrains Mono",monospace;font-size:9.5px;color:var(--micro);letter-spacing:.04em;text-decoration:none;display:block;margin-top:4px}
.alert{border-color:rgba(249,115,22,.35)}
.alert:before{background:linear-gradient(90deg,var(--fire) 0 12px,transparent 12px) top left/100% 1px no-repeat,linear-gradient(var(--fire) 0 12px,transparent 12px) top left/1px 100% no-repeat}
.alert .tag{color:var(--fire)}
.cites{margin-top:26px;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.06em;color:var(--micro);line-height:1.9}
.cites a{color:var(--micro);text-decoration:none}
.foot{display:flex;align-items:center;gap:10px;margin-top:22px;padding-top:16px;border-top:1px solid var(--line)}
.dock{position:fixed;left:0;right:0;bottom:0;padding:10px 16px calc(var(--safe-bot) + 10px);background:linear-gradient(0deg,rgba(11,15,23,.98) 60%,rgba(11,15,23,0));display:flex;gap:8px;z-index:5}
.btn{flex:1;padding:14px;border-radius:12px;font-family:"JetBrains Mono",monospace;font-weight:700;font-size:11px;letter-spacing:.12em;text-transform:uppercase;transition:background .2s,box-shadow .2s,border-color .2s}
.btn.fire{background:var(--fire);border:1px solid var(--fire);color:#fff}
.btn.fire:active,.btn.fire:hover{background:var(--fire-hot);box-shadow:0 0 18px -6px rgba(255,94,30,.8)}
.btn.ghost{border:1px solid var(--line2);color:var(--text);background:var(--panel)}
.sheet-bg{position:fixed;inset:0;background:rgba(11,15,23,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:10;opacity:0;pointer-events:none;transition:opacity .25s}
.sheet-bg.open{opacity:1;pointer-events:auto}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:11;background:var(--panel);border-top:1px solid var(--line2);border-radius:18px 18px 0 0;padding:18px 16px calc(var(--safe-bot) + 18px);max-height:78vh;overflow:auto;transform:translateY(105%);visibility:hidden;transition:transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s linear .3s}
.sheet.open{transform:none;visibility:visible;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.sheet .grab{width:42px;height:4px;border-radius:2px;background:var(--line2);margin:0 auto 14px}
.sheet h3{font-size:17px;font-weight:700;color:var(--title);margin:6px 0 4px}
.opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 12px;border:1px solid var(--line);border-radius:11px;margin-top:8px;background:var(--bg)}
.opt.cur{border-color:var(--cyan);background:rgba(56,189,248,.08)}
.opt .g{font-weight:700;min-width:64px;color:var(--title)}
.opt .fd{flex:1;color:var(--title)}
.opt .fd span{display:block;font-size:11.5px;color:var(--text);margin-top:2px}
.steps{list-style:none;margin-top:12px;display:grid;gap:10px}
.steps li{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:var(--text)}
.steps li b{color:var(--title);font-weight:600}
.steps .n{flex:none;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;font-family:"JetBrains Mono",monospace;font-size:12px;font-weight:700;color:var(--cyan);background:var(--cyan-soft);border:1px solid var(--cyan-edge)}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:12px;padding:4px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
.tabs button{padding:8px;border-radius:7px;font-family:"JetBrains Mono",monospace;font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--micro)}
.tabs button.on{color:var(--title);background:rgba(56,189,248,.08);box-shadow:inset 0 0 0 1px var(--cyan)}
.toast{position:fixed;left:50%;bottom:calc(var(--safe-bot) + 84px);transform:translate(-50%,20px);background:var(--panel);border:1px solid var(--line2);color:var(--title);padding:10px 14px;border-radius:10px;font-size:12px;opacity:0;transition:all .25s;z-index:20;pointer-events:none;max-width:90vw;text-align:center}
.toast.show{opacity:1;transform:translate(-50%,0)}
.badge{display:inline-block;margin-top:3px;font-family:"JetBrains Mono",monospace;font-size:8.5px;font-weight:700;letter-spacing:.14em;color:var(--cyan);background:var(--cyan-soft);border:1px solid var(--cyan-edge);border-radius:4px;padding:2px 5px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hv{font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;font-size:11px;color:var(--title);white-space:nowrap}
.gauge{position:relative;margin:10px auto 0;max-width:320px}
.gauge svg{display:block;width:100%;height:auto}
.gv{position:absolute;left:0;right:0;bottom:2px;text-align:center}
.glabel{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.2em;color:var(--micro)}
.gnum{font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;font-weight:700;font-size:clamp(38px,12vw,52px);line-height:1;letter-spacing:-.03em;color:var(--title)}
.gnum.over{color:var(--fire)}
.gsub{font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;font-size:11px;color:var(--text);margin-top:2px}
.minis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.mini{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 6px 7px;text-align:center}
.mini svg{display:block;width:100%;max-width:84px;height:auto;margin:0 auto}
.mini b{display:block;font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;font-size:14px;color:var(--title);margin-top:-6px}
.mini b i{font-style:normal;font-size:10px;color:var(--micro);font-weight:500}
.mini span{display:block;font-family:"JetBrains Mono",monospace;font-size:8.5px;letter-spacing:.16em;color:var(--micro);margin-top:2px}
.actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 12px}
.actions button{padding:10px 4px;border:1px solid var(--cyan-edge);background:var(--cyan-soft);color:var(--cyan);border-radius:10px;font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:700;letter-spacing:.06em}
.actions button:active{border-color:var(--cyan)}
.cups{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-top:12px}
.cup{height:34px;border:1px solid var(--line2);border-radius:4px 4px 8px 8px;position:relative;overflow:hidden;background:var(--bg)}
.cup i{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(180deg,#7DD3FC,#38BDF8);transition:height .3s}
.cup.on{border-color:rgba(56,189,248,.6)}
.cup.on i{height:82%}
.wbtns{display:flex;gap:6px;margin-top:10px}
.wbtns button{flex:1;padding:9px 6px;border-radius:9px;border:1px solid var(--cyan-edge);background:var(--cyan-soft);color:var(--cyan);font-family:"JetBrains Mono",monospace;font-size:10.5px;font-weight:700;letter-spacing:.06em}
.wbtns button.ghost{border-color:var(--line2);background:transparent;color:var(--text)}
.wbtns button.cta{border-color:var(--fire);background:var(--fire);color:#fff}
.ok-line{margin-top:8px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;color:var(--cyan)}
.dial{display:flex;align-items:center;gap:12px;margin-top:8px}
.dial svg{flex:none;width:52%;max-width:200px;height:auto}
.dial .dl{font-family:"JetBrains Mono",monospace;font-size:9px;fill:#64748B}
.dinfo{min-width:0;display:flex;flex-direction:column;gap:3px}
.dinfo small{font-family:"JetBrains Mono",monospace;font-size:8.5px;letter-spacing:.18em;color:var(--micro)}
.dinfo b{font-size:15px;color:var(--title);line-height:1.2}
.dinfo span{font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;font-size:11px;color:var(--text)}
.dinfo em{font-style:normal;margin-top:6px;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.06em;color:var(--micro)}
.dinfo em.hot{color:var(--fire)}
.legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.06em;color:var(--micro)}
.legend i{display:inline-block;width:10px;height:6px;border-radius:3px;margin-right:5px;vertical-align:middle}
.lg-s{background:var(--fire)}.lg-w{background:rgba(56,189,248,.3)}.lg-m{border:1.5px solid var(--cyan);border-radius:50%!important;width:7px!important;height:7px!important}.lg-p{border:1.5px solid var(--fire);border-radius:50%!important;width:7px!important;height:7px!important}
.shop-cat{margin:14px 0 4px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cyan)}
.shop-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 0;border-bottom:1px solid var(--line)}
.shop-item .chk{margin-left:0;width:24px;height:24px}
.shop-item.done .chk{background:rgba(56,189,248,.08);border-color:var(--cyan)}
.shop-item.done .chk svg{opacity:1;transform:none}
.shop-item.done .sn{color:var(--micro);text-decoration:line-through}
.shop-item .sn{flex:1;font-size:14px;color:var(--title)}
.shop-item .sq{font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;font-size:12px;color:var(--title);text-align:right}
.shop-item .sq em{display:block;font-style:normal;font-size:10px;color:var(--micro)}
.rule{border:1px solid var(--line);border-radius:10px;margin-top:8px;background:var(--bg)}
.rule summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:11px 12px;font-weight:600;font-size:14px;color:var(--title)}
.rule summary::-webkit-details-marker{display:none}
.rule .n{flex:none;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--fire);background:var(--fire-soft);border:1px solid rgba(249,115,22,.35)}
.rule p{padding:0 12px 12px 44px;font-size:13.5px;color:var(--text)}
.ph{display:block;width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid var(--line);margin-top:10px}
.lbl{display:block;margin-top:12px;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--micro)}
.inp{width:100%;margin-top:5px;padding:10px 12px;border-radius:10px;border:1px solid var(--line2);background:var(--bg);color:var(--title);font:inherit;font-size:14px}
`;

export default styles;
