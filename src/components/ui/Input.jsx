import { forwardRef } from 'react'

const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <input
        ref={ref}
        className={`bg-bg border ${error ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
})

export default Input
