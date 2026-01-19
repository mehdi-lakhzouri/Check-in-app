'use client';

import { motion } from 'framer-motion';
import { cardVariants } from '@/lib/animations';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Calendar,
  Shield,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Session, CheckIn } from '@/lib/schemas';

// Extended session type for properties that may exist on session objects
interface ExtendedSession extends Omit<Session, 'capacityEnforced' | 'requiresRegistration' | 'day'> {
  day?: number;
  requiresRegistration?: boolean;
  capacityEnforced?: boolean;
}

interface SessionOverviewProps {
  sessions: Session[];
  checkIns: CheckIn[];
}

interface SessionCapacityInfo {
  session: Session;
  checkInsCount: number;
  percentFull: number;
  remaining: number;
  isNearCapacity: boolean;
  isAtCapacity: boolean;
  lateCheckIns: number;
  onTimeCheckIns: number;
}

// Using itemVariants from centralized library
const itemVariants = cardVariants;

export function SessionOverview({ sessions, checkIns }: SessionOverviewProps) {
  // Group check-ins by session
  const checkInsBySession = checkIns.reduce((acc, checkIn) => {
    // Skip check-ins without a valid sessionId
    if (!checkIn.sessionId) {
      return acc;
    }
    const sessionId = typeof checkIn.sessionId === 'string' 
      ? checkIn.sessionId 
      : checkIn.sessionId?._id;
    if (!sessionId || !acc[sessionId]) {
      if (sessionId) acc[sessionId] = [];
      else return acc;
    }
    acc[sessionId].push(checkIn);
    return acc;
  }, {} as Record<string, CheckIn[]>);

  // Calculate capacity info for each session
  const sessionsWithCapacity: SessionCapacityInfo[] = sessions
    .filter(s => s.isOpen) // Only show open sessions
    .map(session => {
      const sessionCheckIns = checkInsBySession[session._id] || [];
      const capacity = session.capacity || 0;
      const checkInsCount = session.checkInsCount ?? sessionCheckIns.length;
      const remaining = capacity > 0 ? Math.max(0, capacity - checkInsCount) : -1;
      const percentFull = capacity > 0 ? Math.min(100, (checkInsCount / capacity) * 100) : 0;
      const isNearCapacity = capacity > 0 && percentFull >= 80;
      const isAtCapacity = capacity > 0 && checkInsCount >= capacity;
      
      const lateCheckIns = sessionCheckIns.filter(c => c.isLate).length;
      const onTimeCheckIns = sessionCheckIns.filter(c => !c.isLate).length;

      return {
        session,
        checkInsCount,
        percentFull,
        remaining,
        isNearCapacity,
        isAtCapacity,
        lateCheckIns,
        onTimeCheckIns,
      };
    })
    .sort((a, b) => b.percentFull - a.percentFull); // Sort by capacity usage

  // Calculate overall stats
  const totalOpenSessions = sessions.filter(s => s.isOpen).length;
  const sessionsNearCapacity = sessionsWithCapacity.filter(s => s.isNearCapacity && !s.isAtCapacity).length;
  const sessionsAtCapacity = sessionsWithCapacity.filter(s => s.isAtCapacity).length;
  const totalTodayCheckIns = checkIns.length;
  const lateCheckInsTotal = checkIns.filter(c => c.isLate).length;
  const onTimeRate = totalTodayCheckIns > 0 
    ? Math.round(((totalTodayCheckIns - lateCheckInsTotal) / totalTodayCheckIns) * 100) 
    : 100;

  // Group sessions by day
  const sessionsByDay = sessions.reduce((acc, session) => {
    const day = (session as ExtendedSession).day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(session);
    return acc;
  }, {} as Record<number, Session[]>);

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {/* Quick Stats Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Open Sessions</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totalOpenSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">On-Time Rate</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{onTimeRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "bg-gradient-to-br border",
          sessionsNearCapacity > 0 
            ? "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800" 
            : "from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-5 w-5",
                sessionsNearCapacity > 0 
                  ? "text-amber-600 dark:text-amber-400" 
                  : "text-slate-500 dark:text-slate-400"
              )} />
              <div>
                <p className="text-xs text-muted-foreground">Near Capacity</p>
                <p className={cn(
                  "text-2xl font-bold",
                  sessionsNearCapacity > 0 
                    ? "text-amber-700 dark:text-amber-300" 
                    : "text-slate-600 dark:text-slate-300"
                )}>{sessionsNearCapacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "bg-gradient-to-br border",
          sessionsAtCapacity > 0 
            ? "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800" 
            : "from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className={cn(
                "h-5 w-5",
                sessionsAtCapacity > 0 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-slate-500 dark:text-slate-400"
              )} />
              <div>
                <p className="text-xs text-muted-foreground">At Capacity</p>
                <p className={cn(
                  "text-2xl font-bold",
                  sessionsAtCapacity > 0 
                    ? "text-red-700 dark:text-red-300" 
                    : "text-slate-600 dark:text-slate-300"
                )}>{sessionsAtCapacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Live Session Status
          </CardTitle>
          <CardDescription>
            Real-time capacity and check-in status for open sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsWithCapacity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No open sessions at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionsWithCapacity.slice(0, 6).map((item) => (
                <div 
                  key={item.session._id} 
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    item.isAtCapacity 
                      ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800" 
                      : item.isNearCapacity 
                        ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
                        : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{item.session.name}</h4>
                        {(item.session as ExtendedSession).requiresRegistration && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Invite Only
                          </Badge>
                        )}
                        {(item.session as ExtendedSession).capacityEnforced === false && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Soft Cap
                          </Badge>
                        )}
                      </div>
                      {item.session.location && (
                        <p className="text-sm text-muted-foreground">{item.session.location}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">
                          {item.checkInsCount}
                          {item.session.capacity && item.session.capacity > 0 && (
                            <span className="font-normal text-muted-foreground">/{item.session.capacity}</span>
                          )}
                        </span>
                      </div>
                      {item.remaining >= 0 && (
                        <p className={cn(
                          "text-xs",
                          item.isAtCapacity 
                            ? "text-red-600 dark:text-red-400 font-medium" 
                            : item.isNearCapacity 
                              ? "text-amber-600 dark:text-amber-400" 
                              : "text-muted-foreground"
                        )}>
                          {item.isAtCapacity ? 'FULL' : `${item.remaining} spots left`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {item.session.capacity && item.session.capacity > 0 && (
                    <div className="space-y-1">
                      <Progress 
                        value={item.percentFull} 
                        className={cn(
                          "h-2",
                          item.isAtCapacity 
                            ? "[&>div]:bg-red-500" 
                            : item.isNearCapacity 
                              ? "[&>div]:bg-amber-500" 
                              : "[&>div]:bg-green-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{Math.round(item.percentFull)}% full</span>
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {item.onTimeCheckIns} on-time
                          </span>
                          {item.lateCheckIns > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              {item.lateCheckIns} late
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {sessionsWithCapacity.length > 6 && (
                <p className="text-center text-sm text-muted-foreground">
                  +{sessionsWithCapacity.length - 6} more open sessions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions by Day Summary */}
      {Object.keys(sessionsByDay).length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sessions by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              {Object.entries(sessionsByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, daySessions]) => {
                const openCount = daySessions.filter(s => s.isOpen).length;
                const totalCheckIns = daySessions.reduce((sum, s) => sum + (s.checkInsCount || 0), 0);
                
                return (
                  <div 
                    key={day} 
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Day {day}</Badge>
                      <span className="text-sm text-muted-foreground">{daySessions.length} sessions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Open</p>
                        <p className="font-medium text-green-600 dark:text-green-400">{openCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Check-ins</p>
                        <p className="font-medium">{totalCheckIns}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
