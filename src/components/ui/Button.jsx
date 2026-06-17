const variants = {
  primary: 'bg-primary hover:bg-purple-700 text-white',
  secondary: 'bg-surface hover:bg-slate-700 text-slate-100 border border-slate-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'text-muted hover:text-slate-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
