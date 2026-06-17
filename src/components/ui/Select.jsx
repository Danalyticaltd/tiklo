export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <select
        className={`bg-bg border ${error ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary transition ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
