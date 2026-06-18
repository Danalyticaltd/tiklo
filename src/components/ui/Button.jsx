const variants = {
  primary: 'bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white shadow-lg shadow-primary/20',
  secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'text-muted hover:text-gray-900',
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
