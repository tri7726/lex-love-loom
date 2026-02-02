import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  Brain,
  Mic,
  Layers,
  Menu,
  Trophy,
  MessageSquare,
  BookMarked,
  HelpCircle,
  LogOut,
  User,
  Gamepad2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StreakBadge from './StreakBadge';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/vocabulary', icon: BookOpen, label: 'Vocabulary' },
  { path: '/flashcards', icon: Layers, label: 'Flashcards' },
  { path: '/quiz', icon: Brain, label: 'Quiz' },
  { path: '/pronunciation', icon: Mic, label: 'Speaking' },
  { path: '/reading', icon: BookOpen, label: 'Reading' },
];

const moreMenuItems = [
  { path: '/flashcard-games', icon: Gamepad2, label: 'Flashcard Games' },
  { path: '/video-learning', icon: BookOpen, label: 'Video Learning' },
  { path: '/speaking-practice', icon: MessageSquare, label: 'AI Speaking' },
  { path: '/saved-vocabulary', icon: BookMarked, label: 'Saved Vocabulary' },
  { path: '/achievements', icon: Trophy, label: 'Achievements' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/guide', icon: HelpCircle, label: 'User Guide' },
];

interface NavigationProps {
  streak?: number;
  xp?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  streak = 7,
  xp = 1250,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getUserInitial = () => {
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            <span className="font-display text-xl font-bold text-gradient-sakura">
              日本語マスター
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'relative gap-2 font-medium transition-all',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Button>
                </Link>
              );
            })}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                  <Menu className="h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreMenuItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* User section */}
          <div className="flex items-center gap-4">
            {streak > 0 && <StreakBadge streak={streak} />}

            <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-gold/10 text-gold font-semibold">
              <span className="text-sm">{xp.toLocaleString()} XP</span>
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 border-2 border-sakura/30 cursor-pointer hover:border-sakura transition-colors">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t px-2 py-2">
          <div className="flex justify-around">
            {navItems.slice(0, 5).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex-col h-auto py-2 px-3 gap-1',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navigation;
