export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <select
        className={`bg-white border ${error ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
