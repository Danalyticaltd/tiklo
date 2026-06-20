const styles = {
  draft:            'bg-gray-100 text-gray-600',
  published:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-600',
  paid:             'bg-green-100 text-green-700',
  pending:          'bg-amber-100 text-amber-700',
  refunded:         'bg-red-100 text-red-600',
}

const labels = {
  pending: 'Pending approval',
}

export default function Badge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
