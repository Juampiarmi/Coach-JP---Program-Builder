'use client';

import { useEffect, useState } from 'react';
import { Download, MonitorDown, Share, Smartphone, X } from 'lucide-react';
import { cx, NutritionMark } from '../hud/primitives';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Instalación PWA del Command Builder: prompt nativo (Chrome/Edge/Android) o guía táctica (iOS / resto). */
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [guide, setGuide] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    setPlatform(detectPlatform());
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    // El SW sólo se registra en el build estático (en dev rompería el hot reload con caché).
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else {
      setGuide(true);
    }
  };

  const steps: Record<Platform, { icon: typeof Share; text: string }[]> = {
    ios: [
      { icon: Smartphone, text: 'Abrí esta página en Safari (en Chrome iOS no aparece la opción).' },
      { icon: Share, text: 'Tocá Compartir (cuadrado con flecha hacia arriba).' },
      { icon: Download, text: 'Elegí «Agregar a inicio» y confirmá con «Agregar».' },
    ],
    android: [
      { icon: Smartphone, text: 'Abrí esta página en Chrome.' },
      { icon: Download, text: 'Menú ⋮ → «Instalar app» (o «Agregar a la pantalla principal»).' },
      { icon: Share, text: 'Confirmá «Instalar». El ícono aparece en tu cajón de apps.' },
    ],
    desktop: [
      { icon: MonitorDown, text: 'Chrome / Edge: ícono de instalar a la derecha de la barra de direcciones.' },
      { icon: Download, text: 'O menú ⋮ → «Transmitir, guardar y compartir» → «Instalar Coach JP Nutrition Builder».' },
      { icon: Share, text: 'Safari macOS: Archivo → «Agregar al Dock».' },
    ],
  };

  return (
    <>
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-md border border-fire/50 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-fire transition hover:border-fire-hot hover:bg-fire/10 hover:text-fire-hot"
      >
        <Download className="h-3.5 w-3.5" /> INSTALAR APP
      </button>
      {guide && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-carbon/80 p-4 backdrop-blur-sm" onClick={() => setGuide(false)}>
          <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <NutritionMark size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] tracking-[0.2em] text-cyan-hud">[ INSTALACIÓN PWA ]</div>
                <div className="text-base font-semibold text-ink">Coach JP Nutrition Builder</div>
              </div>
              <button onClick={() => setGuide(false)} className="p-1 text-mute hover:text-ink" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-line bg-carbon p-1">
              {(['ios', 'android', 'desktop'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cx('rounded-md py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]', platform === p ? 'bg-cyan-hud/[0.08] text-ink ring-1 ring-inset ring-cyan-hud' : 'text-mute')}
                >
                  {p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : 'Desktop'}
                </button>
              ))}
            </div>
            <ol className="mt-4 space-y-3">
              {steps[platform].map(({ icon: Icon, text }, i) => (
                <li key={text} className="flex gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-md border border-cyan-hud/30 bg-cyan-hud/10 font-mono text-xs font-bold text-cyan-hud">{i + 1}</span>
                  <span className="flex items-start gap-2 text-sm text-steel">
                    <Icon className="mt-0.5 h-4 w-4 flex-none text-mute" /> {text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
