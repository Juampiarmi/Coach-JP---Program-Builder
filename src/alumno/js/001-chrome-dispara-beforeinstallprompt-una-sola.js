/* Chrome dispara beforeinstallprompt una sola vez y muy temprano: se captura desde el primer byte para que el boton de instalar lo encuentre aunque el modulo PWA monte despues */
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); window.__jpPwaEvt = e; });
