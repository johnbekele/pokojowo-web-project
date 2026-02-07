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

  // Single user - show name and score
  if (users.length === 1) {
    const user = users[0];
    return (
      <div className={cn('flex items-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg', className)}>
        <UserAvatar user={user} />
        <span className="text-xs text-blue-700 dark:text-blue-300 flex-1">
          {t('interestedUsers.singleMatch', {
            name: user.firstname || 'Someone',
            score: Math.round(user.compatibilityScore)
          })}
        </span>
      </div>
    );
  }

  // Multiple users - show avatars and count
  return (
    <div className={cn('flex items-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg', className)}>
      {/* Stacked Avatars */}
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <UserAvatar
            key={user.userId || index}
            user={user}
            className="ring-2 ring-white dark:ring-gray-900"
            style={{ zIndex: 3 - index }}
          />
        ))}
        {remainingCount > 0 && (
          <div
            className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-medium text-blue-700 dark:text-blue-300 ring-2 ring-white dark:ring-gray-900"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Message */}
      <span className="text-xs text-blue-700 dark:text-blue-300 flex-1">
        {t('interestedUsers.multipleMatches', { count: users.length })}
      </span>

      {/* Online indicator for any online user */}
      {users.some(u => u.isOnline) && (
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Online" />
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
        'w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-medium text-white',
        className
      )}
      style={style}
    >
      {initial}
    </div>
  );
}
