'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  FileSpreadsheet,
  FileUp,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  ListPlus,
  FileText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useBulkCreateSessions } from '@/lib/hooks/use-sessions';
import type { CreateSessionDto } from '@/lib/schemas';
import type { BulkCreateResult } from '@/lib/api/services/sessions';
import type { BulkSessionEntry, WizardStep } from './types';
import { parseCSV, rowsToBulkSessions, createEmptyBulkSession, validateBulkSessions } from './utils';

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// Step indicator component
function StepIndicator({ 
  steps, 
  currentStep 
}: { 
  steps: { key: WizardStep; label: string }[];
  currentStep: WizardStep;
}) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-4 border-b bg-muted/30">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = index < currentIndex;
        
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isCompleted && "bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  isActive && "text-primary",
                  !isActive && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-3",
                  index < currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Session entry card component
function SessionEntryCard({
  session,
  index,
  onUpdate,
  onRemove,
}: {
  session: BulkSessionEntry;
  index: number;
  onUpdate: (id: string, field: keyof BulkSessionEntry, value: unknown) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="p-4 border-l-4 border-l-primary/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">#{index + 1}</Badge>
          <span className="font-medium text-sm truncate max-w-[200px]">
            {session.name || 'Untitled Session'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(session.id)}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Name *</Label>
            <Input
              value={session.name}
              onChange={(e) => onUpdate(session.id, 'name', e.target.value)}
              placeholder="Session name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Location</Label>
            <Input
              value={session.location}
              onChange={(e) => onUpdate(session.id, 'location', e.target.value)}
              placeholder="Room or venue"
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Description</Label>
          <Textarea
            value={session.description}
            onChange={(e) => onUpdate(session.id, 'description', e.target.value)}
            placeholder="Brief description (optional)"
            className="min-h-[50px] resize-none"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Start Time *</Label>
            <Input
              type="datetime-local"
              value={session.startTime}
              onChange={(e) => onUpdate(session.id, 'startTime', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">End Time *</Label>
            <Input
              type="datetime-local"
              value={session.endTime}
              onChange={(e) => onUpdate(session.id, 'endTime', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Capacity</Label>
            <Input
              type="number"
              value={session.capacity ?? ''}
              onChange={(e) => onUpdate(
                session.id,
                'capacity',
                e.target.value ? parseInt(e.target.value) : undefined
              )}
              placeholder="∞"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <Switch
            checked={session.isOpen}
            onCheckedChange={(checked) => onUpdate(session.id, 'isOpen', checked)}
          />
          <Label className="text-xs text-muted-foreground">Open for check-in</Label>
        </div>
      </div>
    </Card>
  );
}

// Main wizard component
export function BulkCreateWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('method');
  const [method, setMethod] = useState<'manual' | 'import' | null>(null);
  const [sessions, setSessions] = useState<BulkSessionEntry[]>([]);
  const [direction, setDirection] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkCreateResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const bulkCreateMutation = useBulkCreateSessions({
    onSuccess: (result) => {
      setBulkResult(result);
      if (result.success > 0 && result.failed === 0) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    },
  });

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'method', label: 'Choose Method' },
    { key: 'entries', label: 'Add Sessions' },
    { key: 'review', label: 'Review & Create' },
  ];

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep('method');
    setMethod(null);
    setSessions([]);
    setDirection(0);
    setFileError(null);
    setBulkResult(null);
    setValidationErrors([]);
  };

  const goToStep = (step: WizardStep) => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    const nextIndex = steps.findIndex(s => s.key === step);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep === 'method' && method) {
      goToStep('entries');
      if (method === 'manual' && sessions.length === 0) {
        setSessions([createEmptyBulkSession(0)]);
      }
    } else if (currentStep === 'entries') {
      const { valid, errors } = validateBulkSessions(sessions);
      if (!valid) {
        setValidationErrors(errors);
        return;
      }
      setValidationErrors([]);
      goToStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'entries') {
      goToStep('method');
    } else if (currentStep === 'review') {
      goToStep('entries');
    }
  };

  const addSession = () => {
    setSessions([...sessions, createEmptyBulkSession(sessions.length)]);
  };

  const updateSession = (id: string, field: keyof BulkSessionEntry, value: unknown) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  // File handling
  const handleFileRead = useCallback((file: File) => {
    setFileError(null);
    
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setFileError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (fileExtension === '.csv') {
          const rows = parseCSV(content);
          if (rows.length < 2) {
            setFileError('The file appears to be empty or has no data rows.');
            return;
          }
          const importedSessions = rowsToBulkSessions(rows, true);
          setSessions(prev => [...prev, ...importedSessions]);
          goToStep('entries');
        } else {
          setFileError('Excel file support requires additional setup. Please use CSV format for now.');
        }
      } catch (err) {
        setFileError('Failed to parse the file. Please ensure it\'s a valid CSV file.');
        console.error('File parse error:', err);
      }
    };

    reader.onerror = () => {
      setFileError('Failed to read the file. Please try again.');
    };

    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileRead(files[0]);
    }
  }, [handleFileRead]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
    e.target.value = '';
  }, [handleFileRead]);

  const handleSubmit = () => {
    if (sessions.length === 0) return;
    
    const sessionsData: CreateSessionDto[] = sessions.map((s) => ({
      name: s.name.trim(),
      description: s.description.trim() || undefined,
      startTime: new Date(s.startTime).toISOString(),
      endTime: new Date(s.endTime).toISOString(),
      location: s.location.trim() || undefined,
      isOpen: s.isOpen,
      capacity: s.capacity,
    }));

    bulkCreateMutation.mutate({ sessions: sessionsData });
  };

  const canProceed = () => {
    if (currentStep === 'method') return method !== null;
    if (currentStep === 'entries') return sessions.length > 0;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl">Bulk Create Sessions</DialogTitle>
          <DialogDescription>
            Add multiple sessions at once using a simple 3-step wizard.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {bulkResult && (
          <Alert
            variant={bulkResult.failed > 0 ? 'destructive' : 'default'}
            className="mx-6 mt-4 shrink-0"
          >
            <div className="flex items-center gap-2">
              {bulkResult.failed === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <div>
                <p className="font-medium">
                  {bulkResult.success} session(s) created successfully
                  {bulkResult.failed > 0 && `, ${bulkResult.failed} failed`}
                </p>
                {bulkResult.errors.length > 0 && (
                  <ul className="text-sm mt-1">
                    {bulkResult.errors.map((err: { index: number; name: string; error: string }, i: number) => (
                      <li key={i}>
                        Session &quot;{err.name || `#${err.index + 1}`}&quot;: {err.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Alert>
        )}

        {fileError && (
          <Alert variant="destructive" className="mx-6 mt-4 shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mx-6 mt-4 shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Choose Method */}
            {currentStep === 'method' && (
              <motion.div
                key="method"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.2 }}
                className="h-full flex flex-col p-6"
              >
                <h3 className="text-lg font-semibold mb-2">How would you like to add sessions?</h3>
                <p className="text-muted-foreground mb-6">
                  Choose a method to get started. You can always add more sessions later.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 flex-1">
                  <button
                    onClick={() => setMethod('manual')}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all text-left",
                      method === 'manual'
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-muted hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-4",
                      method === 'manual' ? "bg-primary/20" : "bg-muted"
                    )}>
                      <ListPlus className={cn(
                        "h-8 w-8",
                        method === 'manual' ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">Manual Entry</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Add sessions one by one using a form. Best for a few sessions.
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setMethod('import')}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all text-left",
                      method === 'import'
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-muted hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-4",
                      method === 'import' ? "bg-primary/20" : "bg-muted"
                    )}>
                      <FileText className={cn(
                        "h-8 w-8",
                        method === 'import' ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">Import from File</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Upload a CSV file with your sessions. Best for many sessions.
                    </p>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Add Entries */}
            {currentStep === 'entries' && (
              <motion.div
                key="entries"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {method === 'import' && sessions.length === 0 ? (
                  // File upload zone
                  <div className="flex-1 p-6">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-colors",
                        isDragging 
                          ? "border-primary bg-primary/5" 
                          : "border-muted-foreground/25 hover:border-primary/50"
                      )}
                    >
                      <FileUp className={cn(
                        "h-16 w-16 mb-4 transition-colors",
                        isDragging ? "text-primary" : "text-muted-foreground"
                      )} />
                      <p className="text-xl font-semibold mb-2">
                        {isDragging ? "Drop your file here" : "Drag & drop your file here"}
                      </p>
                      <p className="text-muted-foreground mb-6">
                        or click the button below to browse
                      </p>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="bulk-file-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => document.getElementById('bulk-file-input')?.click()}
                      >
                        <FileSpreadsheet className="h-5 w-5 mr-2" />
                        Select File
                      </Button>
                      <div className="mt-8 p-4 bg-muted rounded-lg text-left max-w-md">
                        <p className="text-sm font-medium mb-2">Expected CSV columns:</p>
                        <code className="text-xs text-muted-foreground block">
                          name, description, startTime, endTime, location, capacity, isOpen
                        </code>
                        <p className="text-xs text-muted-foreground mt-3">
                          <strong>Example:</strong> &quot;Workshop A&quot;, &quot;Introduction to React&quot;, &quot;2025-01-15 09:00&quot;, &quot;2025-01-15 12:00&quot;, &quot;Room 101&quot;, &quot;50&quot;, &quot;true&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Session entries list
                  <div className="flex-1 flex flex-col min-h-0 p-6 pt-4">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div>
                        <h3 className="font-semibold">Sessions to Create</h3>
                        <p className="text-sm text-muted-foreground">
                          {sessions.length} session{sessions.length !== 1 ? 's' : ''} added
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSession}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Session
                      </Button>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      <div className="space-y-4 pr-4 pb-4">
                        {sessions.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Upload className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">No sessions added yet</p>
                            <p className="text-sm mt-1">Click &quot;Add Session&quot; to start</p>
                          </div>
                        ) : (
                          sessions.map((session, index) => (
                            <SessionEntryCard
                              key={session.id}
                              session={session}
                              index={index}
                              onUpdate={updateSession}
                              onRemove={removeSession}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Review */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.2 }}
                className="h-full flex flex-col p-6"
              >
                <h3 className="text-lg font-semibold mb-2">Review Your Sessions</h3>
                <p className="text-muted-foreground mb-4">
                  Please review the sessions below before creating them.
                </p>
                
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                    {sessions.map((session, index) => (
                      <Card key={session.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="font-mono text-xs">#{index + 1}</Badge>
                              <h4 className="font-semibold">{session.name || 'Untitled'}</h4>
                              {session.isOpen && (
                                <Badge variant="default" className="text-xs">Open</Badge>
                              )}
                            </div>
                            {session.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {session.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span>📅 {format(new Date(session.startTime), 'MMM d, yyyy HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}</span>
                              {session.location && <span>📍 {session.location}</span>}
                              {session.capacity && <span>👥 {session.capacity} max</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              goToStep('entries');
                            }}
                            className="text-muted-foreground"
                          >
                            Edit
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="mt-4 p-4 bg-muted/50 rounded-lg shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Total Sessions</p>
                      <p className="text-sm text-muted-foreground">Ready to create</p>
                    </div>
                    <div className="text-3xl font-bold text-primary">{sessions.length}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row justify-between bg-muted/30">
          <div>
            {currentStep !== 'method' && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={bulkCreateMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={bulkCreateMutation.isPending}
            >
              Cancel
            </Button>
            {currentStep === 'review' ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={sessions.length === 0 || bulkCreateMutation.isPending}
                className="gap-2"
              >
                {bulkCreateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Create {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
