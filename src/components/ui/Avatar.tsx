import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const sizePx = { sm: 32, md: 40, lg: 56, xl: 80 };

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeStyles[size];
  const px = sizePx[size];

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden shrink-0', sizeClass, className)}>
        <Image src={src} alt={name ?? 'Avatar'} fill className="object-cover" sizes={`${px}px`} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-sky-100 text-sky-700 font-semibold flex items-center justify-center shrink-0',
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
