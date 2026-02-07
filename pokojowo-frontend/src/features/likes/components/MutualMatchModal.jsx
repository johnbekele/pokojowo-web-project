import { Link } from 'react-router-dom';
import { Heart, MessageSquare, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';
import useLikesStore from '@/stores/likesStore';

export default function MutualMatchModal() {
  const { showMutualMatchModal, mutualMatchUser, closeMutualMatchModal } = useLikesStore();

  if (!showMutualMatchModal || !mutualMatchUser) return null;

  const user = mutualMatchUser.user || mutualMatchUser;
  const userId = mutualMatchUser.matched_user_id || user?.id;

  return (
    <Dialog open={showMutualMatchModal} onOpenChange={closeMutualMatchModal}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {/* Celebration background */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-purple-500/10" />

        {/* Close button */}
        <button
          onClick={closeMutualMatchModal}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="relative flex flex-col items-center py-8 px-4">
          {/* Hearts animation */}
          <div className="relative mb-6">
            <div className="absolute -inset-8 animate-ping opacity-20">
              <Heart className="h-full w-full text-pink-500 fill-pink-500" />
            </div>
            <div className="relative bg-gradient-to-br from-pink-500 to-rose-500 rounded-full p-4">
              <Heart className="h-12 w-12 text-white fill-white" />
            </div>
          </div>

          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              It's a Match!
            </DialogTitle>
            <DialogDescription className="text-base">
              You and {user?.firstname || 'this user'} both liked each other!
            </DialogDescription>
          </DialogHeader>

          {/* User avatar */}
          {user && (
            <div className="mt-6 flex flex-col items-center">
              <UserAvatar
                user={user}
                size="xl"
                className="h-24 w-24 ring-4 ring-pink-500/30"
              />
              <p className="mt-3 text-lg font-semibold">
                {user.firstname} {user.lastname}
              </p>
              {user.location && (
                <p className="text-sm text-muted-foreground">{user.location}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeMutualMatchModal}
            >
              Keep Browsing
            </Button>
            <Link to={userId ? `/chat/with/${userId}` : '/chat'} className="flex-1">
              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                onClick={closeMutualMatchModal}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
