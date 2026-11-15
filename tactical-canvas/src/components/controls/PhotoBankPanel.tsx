import { useRef, useState } from 'react'
import { PHOTO_DISCIPLINES, PHOTO_KINDS, type BankPhoto, type PhotoBank, type PhotoDiscipline, type PhotoKind } from '../../lib/photoBank'

export interface PhotoBankApi {
  bank: PhotoBank
  addFiles: (files: File[], tags: { disciplines: PhotoDiscipline[]; kind: PhotoKind }) => Promise<number>
  update: (id: string, patch: Partial<Pick<BankPhoto, 'disciplines' | 'kind'>>) => void
  remove: (id: string) => void
}

interface Props {
  api: PhotoBankApi
  /** Foto de fondo de la placa activa (para marcar la que está en uso) */
  currentId: string | null
  onUse: (id: string) => void
}

const chip = (on: boolean) =>
  `rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider transition ${on ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-line text-steel hover:text-white'}`

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/**
 * BANCO DE FOTOS REALES: galería local de atletas, sala y técnica etiquetada por disciplina. El
 * generador y el Plan Semanal eligen una foto acorde al tema; acá se suben, se etiquetan y se usan a mano.
 */
export function PhotoBankPanel({ api, currentId, onUse }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [disciplines, setDisciplines] = useState<PhotoDiscipline[]>(['fuerza'])
  const [kind, setKind] = useState<PhotoKind>('atleta')
  const [filter, setFilter] = useState<PhotoDiscipline | 'all'>('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const photos = api.bank.photos.filter((p) => filter === 'all' || p.disciplines.includes(filter))
  const count = (d: PhotoDiscipline) => api.bank.photos.filter((p) => p.disciplines.includes(d)).length

  const upload = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    try {
      const n = await api.addFiles(files, { disciplines, kind })
      setNote(n ? `✓ ${n} ${n === 1 ? 'foto agregada' : 'fotos agregadas'} al banco.` : 'Ningún archivo era una imagen.')
    } catch {
      setNote('No se pudo leer la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2.5" data-testid="photo-bank">
      <div className="space-y-1.5 rounded border border-line p-2">
        <p className="font-mono text-[9px] tracking-[0.12em] text-steel uppercase">Etiquetas de las fotos que subas</p>
        <div className="flex flex-wrap gap-1">
          {PHOTO_DISCIPLINES.map((d) => (
            <button key={d.id} type="button" aria-pressed={disciplines.includes(d.id)} onClick={() => setDisciplines((l) => (l.includes(d.id) && l.length === 1 ? l : toggle(l, d.id)))} className={chip(disciplines.includes(d.id))}>
              {d.label}
            </button>
          ))}
          <span className="mx-1 w-px bg-line" />
          {PHOTO_KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={chip(kind === k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-label="Subir fotos al banco"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            void upload(files)
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-md border border-dashed border-cyan/40 bg-cyan/5 px-2.5 py-2 font-mono text-[10px] tracking-[0.1em] text-cyan hover:bg-cyan/10 disabled:opacity-60"
        >
          {busy ? 'PROCESANDO…' : '+ SUBIR FOTOS REALES'}
        </button>
      </div>

      {api.bank.photos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setFilter('all')} className={chip(filter === 'all')}>
            TODAS · {api.bank.photos.length}
          </button>
          {PHOTO_DISCIPLINES.map((d) => (
            <button key={d.id} type="button" onClick={() => setFilter(d.id)} className={chip(filter === d.id)}>
              {d.label} · {count(d.id)}
            </button>
          ))}
        </div>
      )}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => {
            const inUse = p.id === currentId
            return (
              <li key={p.id} className={`overflow-hidden rounded border ${inUse ? 'border-cyan' : 'border-line'}`} data-photo={p.id}>
                <button type="button" onClick={() => onUse(p.id)} title="Usar de fondo en esta placa" className="relative block aspect-square w-full">
                  <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                  {inUse && <span className="absolute top-1 left-1 rounded bg-cyan px-1 font-mono text-[7px] font-bold text-carbon">EN USO</span>}
                </button>
                <div className="space-y-1 p-1">
                  <p className="truncate font-mono text-[8px] tracking-wider text-steel">
                    {p.disciplines.map((d) => PHOTO_DISCIPLINES.find((x) => x.id === d)?.label).join(' · ')} · {PHOTO_KINDS.find((k) => k.id === p.kind)?.label}
                  </p>
                  {editing === p.id ? (
                    <div className="flex flex-wrap gap-0.5">
                      {PHOTO_DISCIPLINES.map((d) => (
                        <button key={d.id} type="button" onClick={() => p.disciplines.length > 1 || !p.disciplines.includes(d.id) ? api.update(p.id, { disciplines: toggle(p.disciplines, d.id) }) : undefined} className={chip(p.disciplines.includes(d.id))}>
                          {d.label}
                        </button>
                      ))}
                      {PHOTO_KINDS.map((k) => (
                        <button key={k.id} type="button" onClick={() => api.update(p.id, { kind: k.id })} className={chip(p.kind === k.id)}>
                          {k.label}
                        </button>
                      ))}
                      <button type="button" onClick={() => setEditing(null)} className="font-mono text-[8px] text-cyan">
                        LISTO
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between font-mono text-[8px]">
                      <button type="button" onClick={() => setEditing(p.id)} className="text-steel hover:text-white">
                        ETIQUETAS
                      </button>
                      <button type="button" onClick={() => confirm('¿Quitar esta foto del banco?') && api.remove(p.id)} className="text-steel hover:text-fire" aria-label="Quitar foto del banco">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="font-mono text-[9px] leading-relaxed text-steel/70">
          {api.bank.photos.length ? 'Ninguna foto con esa etiqueta.' : 'Subí fotos reales (atletas, sala, técnica) y etiquetalas: el generador y el Plan Semanal van a usar una acorde al tema en vez del fondo genérico.'}
        </p>
      )}
      {note && <p className="font-mono text-[9px] text-cyan">{note}</p>}
      <p className="font-mono text-[9px] leading-relaxed text-steel/60">Viven en este navegador y viajan en el respaldo .json de la Biblioteca de proyectos.</p>
    </div>
  )
}
