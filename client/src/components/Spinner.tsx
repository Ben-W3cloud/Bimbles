import { motion } from 'framer-motion'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export function Spinner({ size = 'md', color = 'var(--gum-500)', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const borderSizes = {
    sm: 'border-2',
    md: 'border-4',
    lg: 'border-4'
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} ${borderSizes[size]} rounded-full ${className}`}
      style={{
        borderColor: `${color}20`,
        borderTopColor: color,
        borderRightColor: color,
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  )
}

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Spinner size={size} />
      {message && (
        <p className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>
      )}
    </div>
  )
}