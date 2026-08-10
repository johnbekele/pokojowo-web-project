import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function FloatingHeaderNav({ navLinks, isActiveLink }) {
  return (
    <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex">
      <div className="flex items-center gap-1 rounded-full border border-border/50 bg-surface-paper/70 p-1 backdrop-blur">
        {navLinks.map((link) => {
          const isActive = isActiveLink(link.to);
          const Icon = link.icon;
          return (
            <Link key={link.to} to={link.to} className="relative">
              <Motion.div
                className={cn(
                  'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300',
                  isActive
                    ? 'text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <Motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-foreground shadow-[0_4px_14px_hsl(var(--surface-onyx)/0.22)]"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10 tracking-tight">{link.label}</span>
              </Motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
