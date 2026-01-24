'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Timer, 
  AlertTriangle, 
  Server, 
  Settings2, 
  Save, 
  RotateCcw,
  Zap,
  Activity,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnimatedInput } from '@/components/ui/animated-input';
import { useApplicationSettings, useUpdateTimingConfig, useUpdateSessionTiming } from '@/lib/hooks/use-settings';
import { useSessions } from '@/lib/hooks/use-sessions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface TimingFormData {
  autoOpenMinutesBefore: number;
  lateThresholdMinutes: number;
  autoEndGraceMinutes: number;
  autoEndEnabled: boolean;
}

interface SessionTimingOverride {
  sessionId: string;
  autoOpenMinutesBefore?: number;
  lateThresholdMinutes?: number;
  autoEndGraceMinutes?: number;
}

// ============================================================================
// UI Components
// ============================================================================

function SectionHeader({ 
  icon: Icon, 
  title, 
  description,
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground/90">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ConfigWidget({
  title,
  icon: Icon,
  colorClass,
  children,
  className
}: {
  title: string;
  icon: React.ElementType;
  colorClass: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:border-primary/20",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("rounded-lg p-2.5 transition-colors duration-300", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-normal bg-background/50 backdrop-blur-sm">
            Config
          </Badge>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-medium text-foreground/90">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Global Timing Section
// ============================================================================

function GlobalTimingSection() {
  const { data: settings, isLoading, error } = useApplicationSettings();
  const updateTimingMutation = useUpdateTimingConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TimingFormData>({
    autoOpenMinutesBefore: 10,
    lateThresholdMinutes: 10,
    autoEndGraceMinutes: 0,
    autoEndEnabled: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.timing) {
      setFormData({
        autoOpenMinutesBefore: settings.timing.autoOpenMinutesBefore,
        lateThresholdMinutes: settings.timing.lateThresholdMinutes,
        autoEndGraceMinutes: settings.timing.autoEndGraceMinutes,
        autoEndEnabled: settings.timing.autoEndEnabled,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (settings?.timing) {
      const original = settings.timing;
      setHasChanges(
        formData.autoOpenMinutesBefore !== original.autoOpenMinutesBefore ||
        formData.lateThresholdMinutes !== original.lateThresholdMinutes ||
        formData.autoEndGraceMinutes !== original.autoEndGraceMinutes ||
        formData.autoEndEnabled !== original.autoEndEnabled
      );
    }
  }, [formData, settings]);

  const handleReset = () => {
    if (settings?.timing) {
      setFormData({
        autoOpenMinutesBefore: settings.timing.autoOpenMinutesBefore,
        lateThresholdMinutes: settings.timing.lateThresholdMinutes,
        autoEndGraceMinutes: settings.timing.autoEndGraceMinutes,
        autoEndEnabled: settings.timing.autoEndEnabled,
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateTimingMutation.mutateAsync(formData);
      toast.success('Configuration saved successfully');
      setIsEditing(false);
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive/80 mb-2" />
        <h3 className="font-semibold text-destructive">Failed to load configuration</h3>
        <p className="text-sm text-destructive/80 mt-1">Please refresh the page to try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader 
        icon={Zap}
        title="Global Timing"
        description="System-wide defaults for all session check-ins"
        action={
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-9 px-4 text-xs font-medium border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                Edit Defaults
              </Button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={updateTimingMutation.isPending}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || updateTimingMutation.isPending}
                  className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 shadow-sm transition-all"
                >
                  {updateTimingMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-r-transparent" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        {/* Auto-Open Widget */}
        <ConfigWidget
          title="Auto-Open Time"
          icon={Timer}
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        >
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground min-h-[2.5em]">
              Automatically open check-ins this many minutes before the scheduled start time.
            </p>
            {isEditing ? (
              <AnimatedInput
                type="number"
                min={0}
                max={1440}
                value={formData.autoOpenMinutesBefore}
                onChange={(e) => setFormData({ ...formData, autoOpenMinutesBefore: parseInt(e.target.value) || 0 })}
                suffix="min"
                className="bg-background/50"
              />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">{formData.autoOpenMinutesBefore}</span>
                <span className="text-sm font-medium text-muted-foreground">minutes</span>
              </div>
            )}
          </div>
        </ConfigWidget>

        {/* Late Threshold Widget */}
        <ConfigWidget
          title="Late Threshold"
          icon={AlertTriangle}
          colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        >
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground min-h-[2.5em]">
              Mark participants as "Late" if they check in after this duration from the start.
            </p>
            {isEditing ? (
              <AnimatedInput
                type="number"
                min={0}
                max={1440}
                value={formData.lateThresholdMinutes}
                onChange={(e) => setFormData({ ...formData, lateThresholdMinutes: parseInt(e.target.value) || 0 })}
                suffix="min"
                className="bg-background/50"
              />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">{formData.lateThresholdMinutes}</span>
                <span className="text-sm font-medium text-muted-foreground">minutes</span>
              </div>
            )}
          </div>
        </ConfigWidget>

        {/* Grace Period Widget */}
        <ConfigWidget
          title="Grace Period"
          icon={Clock}
          colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        >
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground min-h-[2.5em]">
              Keep check-in open for this duration after the session officially ends.
            </p>
            {isEditing ? (
              <AnimatedInput
                type="number"
                min={0}
                max={1440}
                value={formData.autoEndGraceMinutes}
                onChange={(e) => setFormData({ ...formData, autoEndGraceMinutes: parseInt(e.target.value) || 0 })}
                suffix="min"
                className="bg-background/50"
              />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">{formData.autoEndGraceMinutes}</span>
                <span className="text-sm font-medium text-muted-foreground">minutes</span>
              </div>
            )}
          </div>
        </ConfigWidget>

        {/* Auto-End Widget */}
        <ConfigWidget
          title="Auto-End Session"
          icon={Server}
          colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        >
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground min-h-[2.5em]">
              Automatically close the check-in process when the grace period expires.
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className={cn(
                "text-sm font-medium transition-colors",
                formData.autoEndEnabled ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
              )}>
                {formData.autoEndEnabled ? 'System Enabled' : 'System Disabled'}
              </span>
              <Switch
                checked={formData.autoEndEnabled}
                onCheckedChange={(c) => setFormData({ ...formData, autoEndEnabled: c })}
                disabled={!isEditing}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </div>
        </ConfigWidget>
      </div>
    </div>
  );
}

// ============================================================================
// Session Overrides Section
// ============================================================================

function SessionOverridesSection() {
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const updateSessionTimingMutation = useUpdateSessionTiming();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionTiming, setSessionTiming] = useState<SessionTimingOverride>({
    sessionId: '',
    autoOpenMinutesBefore: undefined,
    lateThresholdMinutes: undefined,
    autoEndGraceMinutes: undefined,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const sessionList = sessions ?? [];
  const selectedSession = sessionList.find(s => s._id === selectedSessionId);

  useEffect(() => {
    if (selectedSession) {
      setSessionTiming({
        sessionId: selectedSession._id,
        autoOpenMinutesBefore: selectedSession.autoOpenMinutesBefore ?? undefined,
        lateThresholdMinutes: selectedSession.lateThresholdMinutes ?? undefined,
        autoEndGraceMinutes: selectedSession.autoEndGraceMinutes ?? undefined,
      });
      setHasChanges(false);
    }
  }, [selectedSession]);

  const handleSave = async () => {
    if (!selectedSessionId) return;
    
    try {
      await updateSessionTimingMutation.mutateAsync({
        sessionId: selectedSessionId,
        timing: {
          autoOpenMinutesBefore: sessionTiming.autoOpenMinutesBefore,
          lateThresholdMinutes: sessionTiming.lateThresholdMinutes,
          autoEndGraceMinutes: sessionTiming.autoEndGraceMinutes,
        }
      });
      toast.success('Session overrides updated');
      setHasChanges(false);
    } catch {
      toast.error('Failed to update overrides');
    }
  };

  const handleReset = async () => {
    if (!selectedSessionId) return;
    
    try {
      await updateSessionTimingMutation.mutateAsync({
        sessionId: selectedSessionId,
        timing: {
          autoOpenMinutesBefore: undefined,
          lateThresholdMinutes: undefined,
          autoEndGraceMinutes: undefined,
        }
      });
      setSessionTiming({
        sessionId: selectedSessionId,
        autoOpenMinutesBefore: undefined,
        lateThresholdMinutes: undefined,
        autoEndGraceMinutes: undefined,
      });
      setHasChanges(false);
      toast.success('Reset to global defaults');
    } catch {
      toast.error('Failed to reset');
    }
  };

  const hasCustomTiming = (session: { autoOpenMinutesBefore?: number | null; lateThresholdMinutes?: number | null; autoEndGraceMinutes?: number | null }) => {
    return session.autoOpenMinutesBefore != null || 
           session.lateThresholdMinutes != null || 
           session.autoEndGraceMinutes != null;
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        icon={Settings2}
        title="Session Overrides"
        description="Configure specific timing logic for individual sessions"
      />

      <div className="rounded-2xl border bg-card/50 p-6 backdrop-blur-sm">
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Session</Label>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
              disabled={sessionsLoading}
            >
              <SelectTrigger className="h-11 w-full border-border/60 bg-background/50 focus:ring-primary/20 transition-all hover:bg-background/80 hover:border-border">
                <SelectValue placeholder="Select a session..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {sessionList.map((session) => (
                  <SelectItem key={session._id} value={session._id} className="py-3 cursor-pointer">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="truncate font-medium">{session.name}</span>
                      {hasCustomTiming(session) && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSession ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <Separator className="bg-border/60" />
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Auto-Open Override</Label>
                  <AnimatedInput
                    type="number"
                    min={0}
                    max={1440}
                    value={sessionTiming.autoOpenMinutesBefore ?? ''}
                    onChange={(e) => {
                      setSessionTiming({ 
                        ...sessionTiming, 
                        autoOpenMinutesBefore: e.target.value ? parseInt(e.target.value) : undefined 
                      });
                      setHasChanges(true);
                    }}
                    placeholder="Global default"
                    suffix="min"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Late Threshold Override</Label>
                  <AnimatedInput
                    type="number"
                    min={0}
                    max={1440}
                    value={sessionTiming.lateThresholdMinutes ?? ''}
                    onChange={(e) => {
                      setSessionTiming({ 
                        ...sessionTiming, 
                        lateThresholdMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                      });
                      setHasChanges(true);
                    }}
                    placeholder="Global default"
                    suffix="min"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Grace Period Override</Label>
                  <AnimatedInput
                    type="number"
                    min={0}
                    max={1440}
                    value={sessionTiming.autoEndGraceMinutes ?? ''}
                    onChange={(e) => {
                      setSessionTiming({ 
                        ...sessionTiming, 
                        autoEndGraceMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                      });
                      setHasChanges(true);
                    }}
                    placeholder="Global default"
                    suffix="min"
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Overrides apply only to this specific session</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    disabled={updateSessionTimingMutation.isPending}
                    className="h-8 text-xs hover:text-destructive hover:bg-destructive/10"
                  >
                    Reset Defaults
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updateSessionTimingMutation.isPending}
                    size="sm"
                    className="h-8 text-xs bg-primary/90 hover:bg-primary shadow-sm"
                  >
                    {updateSessionTimingMutation.isPending ? 'Saving...' : 'Save Overrides'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/5">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Calendar className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h3 className="text-sm font-medium text-foreground">No Session Selected</h3>
              <p className="text-xs text-muted-foreground max-w-[250px] mt-1">
                Choose a session from the dropdown above to configure detailed timing overrides.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Application Info Section
// ============================================================================

function ApplicationInfoSection() {
  const { data: settings, isLoading } = useApplicationSettings();

  if (isLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader 
        icon={Activity}
        title="System Status"
        description="Current application environment information"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 transition-all hover:bg-accent/5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Version</p>
              <p className="text-lg font-mono font-semibold text-foreground">{settings?.version ?? '—'}</p>
            </div>
            <Server className="h-5 w-5 text-muted-foreground/30" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 transition-all hover:bg-accent/5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Environment</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  settings?.environment === 'production' ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <p className="font-semibold text-foreground capitalize">{settings?.environment ?? '—'}</p>
              </div>
            </div>
            <Globe className="h-5 w-5 text-muted-foreground/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Settings Page
// ============================================================================

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 px-4 pb-20 animate-in fade-in duration-500">
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage system-wide defaults and session configurations.
        </p>
      </div>

      <Separator className="bg-border/60" />

      <section>
        <GlobalTimingSection />
      </section>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <section>
          <SessionOverridesSection />
        </section>
        <section className="lg:sticky lg:top-6">
          <ApplicationInfoSection />
        </section>
      </div>
    </div>
  );
}
