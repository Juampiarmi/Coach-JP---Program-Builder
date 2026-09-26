// Hoja de estilos de la PWA del atleta (se embebe inline en el index.html exportado).
const styles = `
:root{--bg:#0B0E14;--panel:#121820;--panel2:#0F141B;--line:#1F2937;--line2:#263342;--cyan:#00E5FF;--fire:#FF6B00;--gold:#FFD600;--ink:#F9FAFB;--steel:#8A99AD;--ok:#19E38A;--safe-top:env(safe-area-inset-top,0px);--safe-bot:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{background:var(--bg);color:var(--ink);font-family:Inter,"Plus Jakarta Sans",system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased}
body{min-height:100vh;padding:calc(var(--safe-top) + 14px) 16px calc(var(--safe-bot) + 96px);background-image:radial-gradient(120% 60% at 50% -10%,rgba(0,229,255,.08),transparent 60%),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:auto,28px 28px,28px 28px}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.disp{font-family:"Chakra Petch",Inter,sans-serif}
.tag{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan)}
.muted{color:var(--steel)}
.top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.top svg{flex:none;filter:drop-shadow(0 0 12px rgba(255,214,0,.35))}
.brand{font-family:"Chakra Petch",sans-serif;font-weight:700;letter-spacing:.04em;font-size:14px;color:#E5E7EB}
.brand b{color:var(--gold)}
.handle{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--steel)}
.phase{margin-left:auto;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#0B0B0B;background:var(--gold);padding:5px 8px;border-radius:4px;font-weight:700;box-shadow:0 0 18px -4px rgba(255,214,0,.6);text-align:center;line-height:1.2}
h1{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:28px;line-height:1.05;letter-spacing:.01em;text-transform:uppercase;margin:6px 0 4px}
.note{font-size:13px;color:var(--steel);margin-bottom:16px}
.switch{display:grid;grid-template-columns:1fr 1fr;background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:4px;margin:14px 0 16px;position:relative}
.switch button{position:relative;z-index:1;padding:12px 6px;font-family:"JetBrains Mono",monospace;font-size:11.5px;letter-spacing:.14em;font-weight:700;color:var(--steel);transition:color .25s}
.switch button.on{color:#0B0E14}
.switch .knob{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:9px;background:var(--cyan);box-shadow:0 0 22px -4px rgba(0,229,255,.8);transition:transform .3s cubic-bezier(.2,.8,.2,1),background .3s}
.switch.off .knob{transform:translateX(100%);background:var(--gold);box-shadow:0 0 22px -4px rgba(255,214,0,.7)}
.card{background:linear-gradient(180deg,rgba(18,24,32,.96),rgba(15,20,27,.96));border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden}
.card:before{content:"";position:absolute;inset:0;border-radius:14px;pointer-events:none;background:linear-gradient(90deg,var(--cyan) 0 14px,transparent 14px) top left/100% 1px no-repeat,linear-gradient(var(--cyan) 0 14px,transparent 14px) top left/1px 100% no-repeat;opacity:.7}
.hero{display:flex;align-items:center;gap:14px}.hero>div:last-child{min-width:0}
.ring{width:96px;height:96px;flex:none;position:relative}
.ring svg{transform:rotate(-90deg);width:96px;height:96px}
.ring .v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring .v b{font-family:"Chakra Petch",sans-serif;font-size:22px;line-height:1}
.ring .v span{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.14em;color:var(--steel);margin-top:3px}
.kcal{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:clamp(34px,11vw,48px);line-height:.9;white-space:nowrap;letter-spacing:-.01em}
.kcal small{font-size:11px;letter-spacing:.2em;color:var(--steel);font-family:"JetBrains Mono",monospace;font-weight:500;margin-left:4px}
.on-c{color:var(--cyan)}.off-c{color:var(--gold)}
.bars{display:grid;gap:10px;margin-top:14px}
.bar .l{display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;margin-bottom:5px}
.bar .t{height:6px;border-radius:3px;background:#1A222D;overflow:hidden}
.bar .t i{display:block;height:100%;border-radius:3px;transition:width .5s cubic-bezier(.2,.8,.2,1)}
.p i{background:var(--cyan)}.c i{background:var(--gold)}.f i{background:var(--fire)}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.stat{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px 8px;text-align:center}
.stat b{display:block;font-family:"Chakra Petch",sans-serif;font-size:19px;line-height:1.1}
.stat span{font-family:"JetBrains Mono",monospace;font-size:8.5px;letter-spacing:.14em;color:var(--steel)}
.sec{display:flex;align-items:center;justify-content:space-between;margin:22px 2px 10px}
.meal{padding:0}
.meal .hd{display:flex;align-items:center;gap:12px;padding:14px 14px 10px}
.meal .time{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--cyan);background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.25);padding:4px 7px;border-radius:6px}
.meal .nm{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:17px;text-transform:uppercase;letter-spacing:.02em;line-height:1.1}
.meal .mm{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--steel);margin-top:2px}
.chk{margin-left:auto;width:34px;height:34px;flex:none;border-radius:9px;border:1.5px solid var(--line2);display:grid;place-items:center;transition:all .2s}
.chk svg{opacity:0;transform:scale(.6);transition:all .2s}
.done .chk{background:var(--cyan);border-color:var(--cyan);box-shadow:0 0 16px -3px rgba(0,229,255,.8)}
.done .chk svg{opacity:1;transform:none}
.done .items{opacity:.55}
.items{border-top:1px dashed var(--line2);transition:opacity .2s}
.item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 14px;border-bottom:1px solid rgba(31,41,55,.6)}
.item:last-child{border-bottom:0}
.item .g{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:13px;min-width:62px;color:var(--ink)}
.item .g em{display:block;font-style:normal;font-weight:400;font-size:9.5px;color:var(--steel)}
.item .fd{flex:1;font-size:14px;line-height:1.25}
.item .fd s{text-decoration:none;display:block;font-size:10.5px;color:var(--gold);font-family:"JetBrains Mono",monospace;letter-spacing:.04em}
.item .sw{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.14em;color:var(--cyan);border:1px solid rgba(0,229,255,.3);padding:3px 6px;border-radius:5px}
.leu{display:flex;align-items:center;gap:8px;padding:9px 14px;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.1em;border-top:1px solid var(--line)}
.leu .dot{width:7px;height:7px;border-radius:50%}
.leu.ok{color:var(--cyan)}.leu.ok .dot{background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
.leu.low{color:var(--fire);background:rgba(255,107,0,.06)}.leu.low .dot{background:var(--fire);box-shadow:0 0 10px var(--fire);animation:pulse 1.2s infinite}
.leu.na{color:var(--steel)}.leu.na .dot{background:var(--steel)}
@keyframes pulse{50%{opacity:.3}}
.sup{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 0;border-bottom:1px solid var(--line)}
.sup:last-child{border-bottom:0}
.sup .chk{margin-left:0;width:28px;height:28px}
.sup.done .chk{background:var(--gold);border-color:var(--gold);box-shadow:0 0 14px -3px rgba(255,214,0,.8)}
.sup b{display:block;font-size:14px}
.sup .ds{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--cyan)}
.sup .tm{font-size:12px;color:var(--steel)}
.sup a{font-family:"JetBrains Mono",monospace;font-size:9.5px;color:var(--steel);letter-spacing:.06em;text-decoration:none;display:block;margin-top:2px}
.alert{border-color:rgba(255,214,0,.4)}
.alert:before{background:linear-gradient(90deg,var(--gold) 0 14px,transparent 14px) top left/100% 1px no-repeat,linear-gradient(var(--gold) 0 14px,transparent 14px) top left/1px 100% no-repeat}
.alert .tag{color:var(--gold)}
.cites{margin-top:26px;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.08em;color:var(--steel);line-height:1.9}
.cites a{color:var(--steel);text-decoration:none}
.foot{display:flex;align-items:center;gap:10px;margin-top:22px;padding-top:16px;border-top:1px solid var(--line)}
.dock{position:fixed;left:0;right:0;bottom:0;padding:10px 16px calc(var(--safe-bot) + 10px);background:linear-gradient(0deg,rgba(11,14,20,.98) 60%,rgba(11,14,20,0));display:flex;gap:8px;z-index:5}
.btn{flex:1;padding:14px;border-radius:12px;font-family:"JetBrains Mono",monospace;font-weight:700;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase}
.btn.fire{background:var(--fire);color:#0B0E14;box-shadow:0 0 24px -6px rgba(255,107,0,.8)}
.btn.ghost{border:1px solid var(--line2);color:var(--steel)}
.sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:10;opacity:0;pointer-events:none;transition:opacity .25s}
.sheet-bg.open{opacity:1;pointer-events:auto}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:11;background:var(--panel);border-top:1px solid var(--line2);border-radius:18px 18px 0 0;padding:18px 16px calc(var(--safe-bot) + 18px);max-height:78vh;overflow:auto;transform:translateY(105%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.sheet.open{transform:none}
.sheet .grab{width:42px;height:4px;border-radius:2px;background:var(--line2);margin:0 auto 14px}
.opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 12px;border:1px solid var(--line);border-radius:11px;margin-top:8px;background:var(--panel2)}
.opt.cur{border-color:var(--cyan);box-shadow:inset 0 0 0 1px var(--cyan)}
.opt .g{font-family:"JetBrains Mono",monospace;font-weight:700;min-width:64px;color:var(--cyan)}
.opt .fd{flex:1}
.opt .fd span{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--steel)}
.toast{position:fixed;left:50%;bottom:calc(var(--safe-bot) + 84px);transform:translate(-50%,20px);background:var(--panel);border:1px solid var(--cyan);color:var(--ink);padding:10px 14px;border-radius:10px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;opacity:0;transition:all .25s;z-index:20;pointer-events:none;max-width:90vw;text-align:center}
.toast.show{opacity:1;transform:translate(-50%,0)}
.prog{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--steel);letter-spacing:.1em}
`;

export default styles;
