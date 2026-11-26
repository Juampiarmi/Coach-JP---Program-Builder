'use client';

import { NC, NC_CREASE, NC_FORK, NC_HAND, ncLogoSrc } from '@/lib/brand';
import { COACH_JP_LOGO } from '@/lib/coachJpLogo';

/** Isotipo NutrirCe: mano (palma arriba) sosteniendo un tenedor, en verde esmeralda y naranja. */
export function NutrirCeMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="flex-none">
      <path d={NC_FORK} fill={NC.orange} />
      <path d={NC_HAND} fill={NC.green} />
      <path d={NC_CREASE} stroke="#0B0F17" strokeWidth={2.2} strokeLinecap="round" opacity={0.5} fill="none" />
    </svg>
  );
}

/** Logo de NutrirCe: el oficial (PNG sin fondo, isotipo + «NUTRIR Ce.») o el que subió el coach. `size` = alto en px. */
export function NutrirCeLogo({ size = 40, logo }: { size?: number; text?: number; logo?: string }) {
  return <img src={ncLogoSrc({ logo })} alt="NutrirCe" style={{ height: size, width: 'auto', maxWidth: size * 2.4 }} className="block object-contain" data-nc-logo={logo ? 'custom' : 'official'} />;
}

/** Escudo oficial de Coach JP (PNG sin fondo). `size` = alto en px (el mismo que el logo de NutrirCe en el 50/50). */
export function CoachJpLogo({ size = 40 }: { size?: number }) {
  return <img src={COACH_JP_LOGO} alt="Coach JP" style={{ height: size, width: 'auto' }} className="block flex-none" data-cj-logo />;
}
