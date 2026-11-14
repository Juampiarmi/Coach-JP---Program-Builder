import type { CitationStatus } from '../../lib/paperVerify'
import { citeFromMatch } from '../../lib/paperVerify'

interface Props {
  status: CitationStatus | null
  onRecheck?: () => void
  /** Reemplaza la cita por los datos reales del paper */
  onFix?: (citeMain: string) => void
}

const link = (doi?: string, pmid?: string) => (doi ? `https://doi.org/${doi}` : pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null)

/** Resultado del verificador de papers para la cita de la placa (sólo en pantalla, nunca en el PNG). */
export function PaperBadge({ status, onRecheck, onFix }: Props) {
  if (!status) return null
  const base = 'rounded border px-2 py-1.5 font-mono text-[9px] leading-relaxed tracking-wider'
  if (status.state === 'pending') {
    return (
      <p className={`${base} border-line text-steel`} data-paper-status="pending">
        ◌ VERIFICANDO EN CROSSREF / PUBMED…
      </p>
    )
  }
  if (status.state === 'error') {
    return (
      <div className={`${base} flex items-center justify-between gap-2 border-line text-steel`} data-paper-status="error">
        <span>⚠ NO SE PUDO VERIFICAR (SIN CONEXIÓN CON CROSSREF / PUBMED)</span>
        {onRecheck && (
          <button type="button" onClick={onRecheck} className="shrink-0 text-cyan hover:underline">
            REINTENTAR
          </button>
        )}
      </div>
    )
  }
  if (status.state === 'verified') {
    const href = link(status.match.doi, status.match.pmid)
    return (
      <div className={`${base} border-cyan/50 bg-cyan/10 text-cyan`} data-paper-status="verified">
        <p className="font-bold">✓ PAPER VERIFICADO</p>
        <p className="text-steel normal-case">
          {status.match.title} · {status.match.source === 'crossref' ? 'Crossref' : 'PubMed'}
          {href && (
            <>
              {' · '}
              <a href={href} target="_blank" rel="noreferrer" className="text-cyan hover:underline">
                abrir
              </a>
            </>
          )}
        </p>
      </div>
    )
  }
  const fixTo = status.state === 'mismatch' ? citeFromMatch(status.match) : null
  return (
    <div className={`${base} border-fire/60 bg-fire/10 text-fire`} data-paper-status={status.state}>
      <p className="font-bold">⚠ CITA SIN VERIFICAR</p>
      <p className="text-steel normal-case">
        {status.state === 'notfound'
          ? 'Crossref y PubMed no tienen un paper con ese primer autor, año y revista. Revisá los datos o elegí uno de tu biblioteca.'
          : `Apareció «${status.match.title}», pero ${status.issues.join(' y ')}.`}
      </p>
      {fixTo && onFix && (
        <button type="button" onClick={() => onFix(fixTo)} className="mt-1 text-cyan hover:underline">
          ⚡ CORREGIR A {fixTo}
        </button>
      )}
    </div>
  )
}
