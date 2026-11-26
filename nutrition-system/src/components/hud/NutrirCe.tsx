'use client';

import { NC, NC_CREASE, NC_FORK, NC_HAND } from '@/lib/brand';

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

/** Sello NutrirCe completo (isotipo + «Nutrir» verde «Ce» naranja) o el logo oficial que subió el coach. */
export function NutrirCeLogo({ size = 32, text = 17, logo }: { size?: number; text?: number; logo?: string }) {
  if (logo) return <img src={logo} alt="NutrirCe" style={{ height: size, width: 'auto', maxWidth: size * 4 }} className="block object-contain" data-nc-logo="custom" />;
  return (
    <span className="flex items-center gap-2" data-nc-logo="default">
      <NutrirCeMark size={size} />
      <span className="font-bold leading-none tracking-[0.02em]" style={{ fontSize: text }}>
        <span style={{ color: NC.green }}>Nutrir</span>
        <span style={{ color: NC.orange }}>Ce</span>
      </span>
    </span>
  );
}
