import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed'

const variants = {
  primary: 'bg-gradient-to-r from-primary to-orange-400 hover:opacity-90 text-white shadow-lg shadow-primary/20',
  secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
  ghost: 'text-muted hover:text-gray-900',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3',
}

const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', className = '', disabled, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
})

export default Button
