import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

/**
 * User avatar with fallback initials
 */
export default function UserAvatar({ user, className, size = 'default' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const name = user?.firstname && user?.lastname
    ? `${user.firstname} ${user.lastname}`
    : user?.username || 'User';

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ''}`}>
      <AvatarImage
        src={user?.photo?.url}
        alt={name}
      />
      <AvatarFallback className="bg-primary/10 text-primary">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
