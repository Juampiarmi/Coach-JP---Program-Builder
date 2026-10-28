'use client';

import { fmt0 } from '@/lib/bioenergetics';
import { optionTotals, prepMinutes } from '@/lib/menuOptions';
import type { FoodItem } from '@/lib/types';
import { cx } from '../hud/primitives';

const badge = 'tnum whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-[0.04em]';

/** Cabecera de una opción: tiempo de preparación estimado y kcal / macros a la vista. */
export function OptionBadges({ items, className }: { items: FoodItem[]; className?: string }) {
  const t = optionTotals(items);
  return (
    <span className={cx('flex flex-wrap items-center gap-1.5', className)}>
      <span className={cx(badge, 'border-gold/40 text-gold')} title="Tiempo de preparación estimado">
        [ ⏱ {prepMinutes(items)} min ]
      </span>
      <span className={cx(badge, 'border-line2 text-steel')}>
        [ {fmt0(t.kcal)} kcal · P: {fmt0(t.p)}g | C: {fmt0(t.c)}g | G: {fmt0(t.f)}g ]
      </span>
    </span>
  );
}
