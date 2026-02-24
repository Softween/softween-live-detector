interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-5 w-5 border-2',
};

export default function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      className={`inline-block animate-spin rounded-full border-violet-500/30 border-t-violet-500 ${sizeClasses[size]} ${className}`}
    />
  );
}
