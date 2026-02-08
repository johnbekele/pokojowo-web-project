import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SwipeCard from './SwipeCard';
import useLikesStore from '@/stores/likesStore';
import { cn } from '@/lib/utils';

export default function SwipeStack({ matches = [], onCardClick, onEmpty }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState([]);
  const { likeUser } = useLikesStore();

  const currentMatches = matches.slice(currentIndex);
  const visibleCards = currentMatches.slice(0, 3);

  const handleSwipeLeft = useCallback((userId) => {
    setSwipedCards(prev => [...prev, { userId, direction: 'left' }]);
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleSwipeRight = useCallback(async (userId) => {
    // Like the user
    await likeUser(userId);
    setSwipedCards(prev => [...prev, { userId, direction: 'right' }]);
    setCurrentIndex(prev => prev + 1);
  }, [likeUser]);

  const handleUndo = useCallback(() => {
    if (swipedCards.length > 0) {
      setSwipedCards(prev => prev.slice(0, -1));
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  }, [swipedCards]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setSwipedCards([]);
  }, []);

  // All cards swiped
  if (currentMatches.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-2">You've seen everyone!</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          You've gone through all potential flatmates. Check back later for new matches!
        </p>
        <div className="flex gap-3">
          {swipedCards.length > 0 && (
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
          )}
          <Button onClick={onEmpty} className="gap-2">
            <Users className="h-4 w-4" />
            View All Matches
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{currentIndex + 1}</span>
          <span> of </span>
          <span className="font-semibold text-foreground">{matches.length}</span>
          <span> potential flatmates</span>
        </div>
        {swipedCards.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Undo
          </Button>
        )}
      </div>

      {/* Card stack */}
      <div className="relative h-[520px] flex items-center justify-center">
        <AnimatePresence>
          {visibleCards.map((match, index) => {
            const isTop = index === 0;
            const scale = 1 - index * 0.05;
            const y = index * 8;

            return (
              <SwipeCard
                key={match.user_id}
                match={match}
                isTop={isTop}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onCardClick={onCardClick}
                style={{
                  scale,
                  y,
                  zIndex: visibleCards.length - index,
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Swipe hints */}
      <div className="flex justify-center gap-8 mt-24 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-red-400 flex items-center justify-center">
            <span className="text-red-400">←</span>
          </div>
          <span>Skip</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Like</span>
          <div className="w-8 h-8 rounded-full border-2 border-green-400 flex items-center justify-center">
            <span className="text-green-400">→</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex justify-center gap-6 mt-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {swipedCards.filter(c => c.direction === 'right').length}
          </div>
          <div className="text-xs text-muted-foreground">Liked</div>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {swipedCards.filter(c => c.direction === 'left').length}
          </div>
          <div className="text-xs text-muted-foreground">Skipped</div>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {matches.length - currentIndex}
          </div>
          <div className="text-xs text-muted-foreground">Remaining</div>
        </div>
      </div>
    </div>
  );
}
