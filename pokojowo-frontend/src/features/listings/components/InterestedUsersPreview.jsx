import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * InterestedUsersPreview - Shows compatible roommates interested in a listing
 *
 * Displays up to 3 user avatars with a compatibility message.
 * Shows "Jan (85% match) is also interested" or "3 compatible roommates are also interested"
 */
export default function InterestedUsersPreview({ users = [], className }) {
  const { t } = useTranslation('listings');

  if (!users || users.length === 0) {
    return null;
  }

  const displayUsers = users.slice(0, 3);
  const remainingCount = Math.max(0, users.length - 3);

  if (users.length === 1) {
    const user = users[0];
    return (
      <div className={cn('flex items-center gap-2 py-2 px-3 rounded-full bg-olive/10 border border-olive/30 text-olive', className)}>
        <UserAvatar user={user} />
        <span className="text-[11px] font-medium tracking-tight flex-1">
          {t('interestedUsers.singleMatch', {
            name: user.firstname || 'Someone',
            score: Math.round(user.compatibilityScore),
          })}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 py-2 px-3 rounded-full bg-olive/10 border border-olive/30 text-olive', className)}>
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <UserAvatar
            key={user.userId || index}
            user={user}
            className="ring-2 ring-card"
            style={{ zIndex: 3 - index }}
          />
        ))}
        {remainingCount > 0 && (
          <div
            className="w-6 h-6 rounded-full bg-olive/20 flex items-center justify-center text-[10px] font-medium text-olive ring-2 ring-card"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      <span className="text-[11px] font-medium tracking-tight flex-1">
        {t('interestedUsers.multipleMatches', { count: users.length })}
      </span>

      {users.some((u) => u.isOnline) && (
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" title="Online" />
      )}
    </div>
  );
}

/**
 * User Avatar component
 */
function UserAvatar({ user, className, style }) {
  const initial = user.firstname ? user.firstname[0].toUpperCase() : '?';

  if (user.photoUrl) {
    return (
      <img
        src={user.photoUrl}
        alt={user.firstname || 'User'}
        className={cn('w-6 h-6 rounded-full object-cover', className)}
        style={style}
      />
    );
  }

  return (
    <div
      className={cn(
        'w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-[10px] font-medium text-background',
        className
      )}
      style={style}
    >
      {initial}
    </div>
  );
}
