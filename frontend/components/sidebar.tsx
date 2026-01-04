'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { sidebarVariants, navItemVariants, TIMING, EASING } from '@/lib/animations';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardCheck,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Award,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: Calendar,
  },
  {
    title: 'Participants',
    href: '/participants',
    icon: Users,
    children: [
      {
        title: 'All Participants',
        href: '/participants',
        icon: Users,
      },
      {
        title: 'Ambassadors',
        href: '/participants/ambassador',
        icon: Award,
      },
      {
        title: 'Travel Grants',
        href: '/participants/travel-grants',
        icon: Plane,
      },
    ],
  },
  {
    title: 'Check-ins',
    href: '/checkins',
    icon: UserCheck,
  },
  {
    title: 'Registrations',
    href: '/registrations',
    icon: ClipboardCheck,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ '/participants': true });
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMenu = (href: string) => {
    setOpenMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const isPathActive = (href: string, children?: NavItem[]) => {
    if (children) {
      return children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'));
    }
    return pathname === href;
  };

  const NavItemComponent = ({ item, isChild = false }: { item: NavItem; isChild?: boolean }) => {
    const isActive = pathname === item.href;
    const hasChildren = item.children && item.children.length > 0;
    const isMenuOpen = openMenus[item.href];
    const isParentActive = hasChildren && isPathActive(item.href, item.children);
    const Icon = item.icon;

    // If has children and not collapsed, render collapsible
    if (hasChildren && !isCollapsed) {
      return (
        <Collapsible open={isMenuOpen} onOpenChange={() => toggleMenu(item.href)}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                'text-muted-foreground transition-all duration-200 ease-in-out',
                'hover:bg-[#F0F2FD] hover:text-[#2D3282]',
                'active:bg-[#D0D6F2] active:scale-[0.98]',
                isParentActive && 'bg-[#E0E4F7] text-[#2D3282] font-semibold'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isParentActive && 'text-[#2D3282]')} />
              <span className="flex-1 text-sm font-medium">{item.title}</span>
              <ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  isMenuOpen && 'rotate-180'
                )} 
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-1">
            <div className="flex flex-col gap-1 border-l border-border pl-2">
              {item.children!.map((child) => (
                <NavItemComponent key={child.href} item={child} isChild />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const content = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5',
          'text-muted-foreground transition-all duration-200 ease-in-out',
          'hover:bg-[#F0F2FD] hover:text-[#2D3282]',
          'active:bg-[#D0D6F2] active:scale-[0.98]',
          isActive && 'bg-[#E0E4F7] text-[#2D3282] font-semibold',
          isCollapsed && 'justify-center px-2',
          isChild && 'py-2 text-sm rounded-lg'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-[#2D3282]', isChild && 'h-4 w-4')} />
        {!isCollapsed && (
          <>
            <span className={cn('flex-1 text-sm font-medium', isChild && 'text-xs')}>{item.title}</span>
            {item.badge && (
              <Badge variant={item.badgeVariant || 'secondary'} className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <Badge variant={item.badgeVariant || 'secondary'}>{item.badge}</Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'relative flex h-screen flex-col border-r bg-background transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center border-b px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">IASTAM</span>
                <span className="text-xs text-muted-foreground">Check-in Admin</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calendar className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItemComponent key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="border-t px-3 py-4">
          <nav className="flex flex-col gap-1">
            {bottomNavItems.map((item) => (
              <NavItemComponent key={item.href} item={item} />
            ))}
          </nav>
        </div>

        {/* Toggle Button */}
        <div className="absolute -right-3 top-20 z-50">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border-2 bg-background shadow-md"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
