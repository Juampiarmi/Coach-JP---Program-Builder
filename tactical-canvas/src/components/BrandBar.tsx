import { ShieldLogo } from './ShieldLogo'

export function BrandBar() {
  return (
    <div className="flex items-center gap-3">
      <ShieldLogo size={30} glow />
      <div className="leading-none">
        <p className="font-display text-[15px] font-bold tracking-wide whitespace-nowrap sm:text-[17px]">
          JP TACTICAL <span className="text-fire">CANVAS</span>
        </p>
        <p className="mt-1 hidden font-mono text-[9px] tracking-[0.2em] text-steel sm:block">COACH JP · GENERADOR DE PLACAS</p>
      </div>
    </div>
  )
}
