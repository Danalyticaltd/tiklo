const styles = {
  draft:      'bg-slate-700 text-slate-300',
  published:  'bg-green-500/20 text-green-400',
  cancelled:  'bg-red-500/20 text-red-400',
  paid:       'bg-green-500/20 text-green-400',
  pending:    'bg-amber-500/20 text-amber-400',
  refunded:   'bg-red-500/20 text-red-400',
}

export default function Badge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  )
}
