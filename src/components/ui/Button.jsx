import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed'

const variants = {
  primary:   'bg-primary hover:bg-[#574BFF] text-white shadow-sm shadow-primary/20',
  secondary: 'bg-white hover:bg-surface text-navy border border-[#E3E8EE]',
  ghost:     'text-muted hover:text-navy',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
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
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
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
