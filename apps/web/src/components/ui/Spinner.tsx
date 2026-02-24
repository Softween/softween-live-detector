interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
};

export default function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Yükleniyor"
      className={`inline-block animate-spin rounded-full border-current border-r-transparent ${sizeClasses[size]} ${className}`}
    />
  );
}
