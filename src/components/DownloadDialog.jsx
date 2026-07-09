import { AlertTriangle, FileSpreadsheet, FileText } from 'lucide-react'

// Dialogo de aviso (tom amarelo) que deixa o usuario escolher o formato do
// arquivo antes de baixar — CSV (planilha) ou PDF (relatorio formatado).
export default function DownloadDialog({ title, description, onDownloadCsv, onDownloadPdf, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm space-y-5 p-6"
        style={{ background: 'var(--c-surface)', borderRadius: '20px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center gap-3">
          <div style={{ background: 'rgba(234,179,8,0.12)', borderRadius: '10px', padding: '8px', flexShrink: 0 }}>
            <AlertTriangle size={22} style={{ color: 'var(--accent-yellow)' }} />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button className="btn w-full flex items-center justify-center gap-1.5" onClick={onDownloadCsv}>
            <FileSpreadsheet size={14} />
            Baixar CSV
          </button>
          <button className="btn w-full flex items-center justify-center gap-1.5" onClick={onDownloadPdf}>
            <FileText size={14} />
            Baixar PDF
          </button>
        </div>

        <button className="btn w-full" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
