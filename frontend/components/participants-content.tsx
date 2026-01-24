'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  QrCode,
  FileUp,
  X,
  Eye,
  Users,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  Check,
  ChevronsUpDown,
  ChevronRight,
  ChevronLeft,
  Minus,
  UserPlus,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tableRowVariants } from '@/lib/animations';
import { useDropzone } from 'react-dropzone';
import QRCodeGenerator from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { createParticipantColumns } from '@/components/participants/participant-columns';
import { ParticipantProfileModal } from '@/components/participants/participant-profile-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ButtonLoading } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ORGANIZATIONS } from '@/lib/organizations';
import {
  useParticipants,
  useParticipantDetails,
  useGenerateQRCode,
  useCreateParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
  useBulkUploadParticipants,
  downloadParticipantQRCodes,
  downloadParticipantTemplate,
} from '@/lib/hooks';
import type { Participant, CreateParticipantDto } from '@/lib/schemas';

// Types for multi-step form
interface ParticipantFormData extends CreateParticipantDto {
  qrCode?: string;
  qrCodeDataUrl?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface QRCodeCache {
  qrCode: string;
  qrCodeDataUrl: string;
}

// Sorting types
type SortField = 'name' | 'email' | 'organization' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type GroupByOption = 'none' | 'status' | 'organization';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

// Animation variants imported from @/lib/animations

// Reusable table row component
interface ParticipantTableRowProps {
  participant: Participant;
  index: number;
  tableQRCodes: Record<string, string>;
  generateQRCode: (participant: Participant) => void;
  handleViewDetails: (participant: Participant) => void;
  openEditDialog: (participant: Participant) => void;
  handleDelete: (id: string) => void;
  deleteMutation: { isPending: boolean };
  hideOrganization?: boolean;
  hideStatus?: boolean;
}

function ParticipantTableRow({
  participant,
  index,
  tableQRCodes,
  generateQRCode,
  handleViewDetails,
  openEditDialog,
  handleDelete,
  deleteMutation,
  hideOrganization = false,
  hideStatus = false,
}: ParticipantTableRowProps) {
  return (
    <motion.tr
      variants={tableRowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay: index * 0.02, duration: 0.15 }}
      className={`border-b border-border/50 transition-colors hover:bg-lavender-light/40 data-[state=selected]:bg-lavender/50 group ${index % 2 === 1 ? 'bg-[var(--table-row-alt)]' : 'bg-[var(--table-row)]'}`}
    >
      <TableCell className="px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => generateQRCode(participant)}
                className="block rounded-md border border-transparent hover:border-primary/30 hover:shadow-sm transition-all p-0.5"
              >
                {tableQRCodes[participant.qrCode] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={tableQRCodes[participant.qrCode]}
                    alt={`QR: ${participant.qrCode}`}
                    className="w-10 h-10 rounded"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              {participant.qrCode}
              <br />
              <span className="text-muted-foreground">Click to enlarge</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="font-medium px-4 py-3">
        <span className="truncate max-w-[200px] block">{participant.name}</span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-muted-foreground truncate max-w-[250px] block">{participant.email}</span>
      </TableCell>
      {!hideOrganization && (
        <TableCell className="px-4 py-3">
          {participant.organization ? (
            <Badge variant="outline" className="font-normal bg-lavender-light/50 text-indigo-700 border-indigo/20">
              {participant.organization}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
      {!hideStatus && (
        <TableCell className="px-4 py-3">
          <Badge
            variant={
              participant.status === 'ambassador'
                ? 'default'
                : participant.status === 'travel_grant'
                ? 'secondary'
                : 'outline'
            }
            className={cn(
              "capitalize",
              participant.status === 'ambassador' && "bg-indigo text-white",
              participant.status === 'travel_grant' && "bg-cerulean/10 text-cerulean border-cerulean/30",
              participant.status === 'regular' && "bg-muted text-muted-foreground border-border"
            )}
          >
            {participant.status === 'travel_grant' ? 'Travel Grant' : participant.status}
          </Badge>
        </TableCell>
      )}
      <TableCell className="text-right px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(participant.status === 'ambassador' || participant.status === 'travel_grant') && (
              <DropdownMenuItem onClick={() => handleViewDetails(participant)}>
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => generateQRCode(participant)}>
              <QrCode className="h-4 w-4 mr-2" aria-hidden="true" />
              View QR Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(participant)}>
              <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(participant._id)}
              disabled={deleteMutation.isPending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </motion.tr>
  );
}

export function ParticipantsContent() {
  // UI State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [skipDetailCleanup, setSkipDetailCleanup] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgComboOpen, setOrgComboOpen] = useState(false);
  
  // Sorting, grouping and pagination state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  
  // Multi-step form state
  const [isMultiAddOpen, setIsMultiAddOpen] = useState(false);
  const [multiAddStep, setMultiAddStep] = useState<'count' | 'forms'>('count');
  const [participantCount, setParticipantCount] = useState(1);
  const [participantForms, setParticipantForms] = useState<ParticipantFormData[]>([]);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [isGeneratingQRCodes, setIsGeneratingQRCodes] = useState(false);
  const [orgComboOpenMulti, setOrgComboOpenMulti] = useState<number | null>(null);
  const [tableQRCodes, setTableQRCodes] = useState<Record<string, string>>({});
  
  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [formData, setFormData] = useState<CreateParticipantDto>({
    name: '',
    email: '',
    organization: '',
    status: 'regular',
  });
  const [bulkData, setBulkData] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // TanStack Query hooks
  const {
    data: participants = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useParticipants();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: preGeneratedQR, refetch: refetchQR } = useGenerateQRCode({
    enabled: isDialogOpen && !editingParticipant,
  });

  const { data: participantDetails, isLoading: isDetailsLoading } = useParticipantDetails(
    selectedParticipantId || '',
    { enabled: !!selectedParticipantId }
  );

  const createMutation = useCreateParticipant({
    onSuccess: () => {
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useUpdateParticipant({
    onSuccess: () => {
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useDeleteParticipant({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setParticipantToDelete(null);
    },
  });

  const bulkUploadMutation = useBulkUploadParticipants({
    onSuccess: (result) => {
      if (result.errors === 0) {
        setTimeout(() => {
          setIsBulkUploadOpen(false);
          setBulkData('');
          setUploadedFile(null);
        }, 2000);
      }
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Get unique organizations from participants
  const uniqueOrganizations = useMemo(() => {
    const orgs = new Set<string>();
    participants.forEach(p => {
      if (p.organization) orgs.add(p.organization);
    });
    return Array.from(orgs).sort();
  }, [participants]);

  // Sorting function
  const sortParticipants = useCallback((data: Participant[], config: SortConfig) => {
    return [...data].sort((a, b) => {
      let aValue: string | undefined;
      let bValue: string | undefined;
      
      switch (config.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'organization':
          aValue = (a.organization || '').toLowerCase();
          bValue = (b.organization || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

  // Memoized filtered, sorted, and grouped participants
  const processedParticipants = useMemo(() => {
    let filtered = participants;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          p.organization?.toLowerCase().includes(query) ||
          p.qrCode.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Apply organization filter
    if (organizationFilter !== 'all') {
      filtered = filtered.filter((p) => p.organization === organizationFilter);
    }

    // Apply sorting
    const sorted = sortParticipants(filtered, sortConfig);

    return sorted;
  }, [participants, searchQuery, statusFilter, organizationFilter, sortConfig, sortParticipants]);

  // Group participants if grouping is enabled
  const groupedParticipants = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups: Record<string, Participant[]> = {};
    
    processedParticipants.forEach(participant => {
      let key: string;
      if (groupBy === 'status') {
        key = participant.status === 'travel_grant' ? 'Travel Grant' : 
              participant.status.charAt(0).toUpperCase() + participant.status.slice(1);
      } else {
        key = participant.organization || 'No Organization';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(participant);
    });

    // Sort group keys
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'No Organization') return 1;
      if (b === 'No Organization') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({ key, participants: groups[key] }));
  }, [processedParticipants, groupBy]);

  // Pagination
  const totalItems = processedParticipants.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedParticipants = useMemo(() => {
    if (groupBy !== 'none') return processedParticipants; // No pagination when grouped
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedParticipants.slice(startIndex, startIndex + itemsPerPage);
  }, [processedParticipants, currentPage, itemsPerPage, groupBy]);

  // Reset to page 1 when filters change
  const filtersKey = `${searchQuery}-${statusFilter}-${organizationFilter}-${sortConfig.field}-${sortConfig.direction}-${itemsPerPage}`;
  const prevFiltersKeyRef = React.useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      setCurrentPage(1);
    }
  }, [filtersKey]);

  // Handle sort
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort indicator render function
  const renderSortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // For backward compatibility
  const filteredParticipants = processedParticipants;

  const referrals = participantDetails?.referredParticipants || [];

  // Participant table columns
  const columns = useMemo(() => createParticipantColumns({
    participant: null as never, // This is just to satisfy type, not used
    tableQRCodes,
    onViewQR: generateQRCode,
    onViewDetails: handleViewDetails,
    onEdit: openEditDialog,
    onDelete: handleDelete,
    isDeleting: deleteMutation.isPending,
  }), [tableQRCodes, deleteMutation.isPending]);

  // Selection helpers for bulk operations
  const allOnPageSelected = useMemo(() => {
    return paginatedParticipants.length > 0 && paginatedParticipants.every(p => selectedIds.has(p._id));
  }, [paginatedParticipants, selectedIds]);

  const someOnPageSelected = useMemo(() => {
    return paginatedParticipants.some(p => selectedIds.has(p._id)) && !allOnPageSelected;
  }, [paginatedParticipants, selectedIds, allOnPageSelected]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      paginatedParticipants.forEach(p => newSelected.add(p._id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedParticipants.forEach(p => newSelected.delete(p._id));
      setSelectedIds(newSelected);
    }
  }, [paginatedParticipants, selectedIds]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);

    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        // Continue deleting other items even if one fails
      }
    }

    setIsBulkDeleting(false);
    setIsBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
  };

  // Reset selection when page/filters change
  const selectionResetKey = `${currentPage}-${itemsPerPage}-${searchQuery}-${statusFilter}-${organizationFilter}`;
  const prevSelectionResetKeyRef = React.useRef(selectionResetKey);
  useEffect(() => {
    if (prevSelectionResetKeyRef.current !== selectionResetKey) {
      prevSelectionResetKeyRef.current = selectionResetKey;
      setSelectedIds(new Set());
    }
  }, [selectionResetKey]);

  // Generate QR codes for table display
  useEffect(() => {
    const generateTableQRCodes = async () => {
      const newQRCodes: Record<string, string> = {};
      for (const participant of participants) {
        if (!tableQRCodes[participant.qrCode]) {
          try {
            const dataUrl = await QRCodeGenerator.toDataURL(participant.qrCode, {
              width: 40,
              margin: 1,
              color: { dark: '#000000', light: '#FFFFFF' },
            });
            newQRCodes[participant.qrCode] = dataUrl;
          } catch {
            console.error('Failed to generate QR code for:', participant.qrCode);
          }
        }
      }
      if (Object.keys(newQRCodes).length > 0) {
        setTableQRCodes((prev) => ({ ...prev, ...newQRCodes }));
      }
    };
    if (participants.length > 0) {
      generateTableQRCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  // Multi-step form: Generate QR codes for each participant form
  async function generateQRCodesForForms() {
    setIsGeneratingQRCodes(true);
    const forms: ParticipantFormData[] = [];
    
    for (let i = 0; i < participantCount; i++) {
      let qrCode = '';
      let qrCodeDataUrl = '';
      
      try {
        // Fetch a new QR code from the API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/participants/generate-qr`);
        if (response.ok) {
          const data = await response.json();
          qrCode = data.qrCode || '';
          qrCodeDataUrl = data.qrCodeDataUrl || '';
        }
      } catch (error) {
        console.error('Failed to fetch QR code from API:', error);
      }
      
      // If no QR code from API, generate locally
      if (!qrCode) {
        qrCode = `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      }
      
      // Always generate QR code image locally for reliability
      try {
        qrCodeDataUrl = await QRCodeGenerator.toDataURL(qrCode, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
      } catch (qrError) {
        console.error('Failed to generate QR code image:', qrError);
      }
      
      forms.push({
        name: '',
        email: '',
        organization: '',
        status: 'regular',
        qrCode: qrCode,
        qrCodeDataUrl: qrCodeDataUrl,
      });
    }
    
    setParticipantForms(forms);
    setCurrentFormIndex(0);
    setMultiAddStep('forms');
    setIsGeneratingQRCodes(false);
  }

  function updateParticipantForm(index: number, field: keyof ParticipantFormData, value: string) {
    setParticipantForms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleMultiAddSubmit() {
    // Submit all participant forms
    for (const form of participantForms) {
      if (form.name && form.email) {
        await createMutation.mutateAsync({
          name: form.name,
          email: form.email,
          organization: form.organization,
          status: form.status,
          qrCode: form.qrCode,
        });
      }
    }
    resetMultiAddForm();
  }

  function resetMultiAddForm() {
    setIsMultiAddOpen(false);
    setMultiAddStep('count');
    setParticipantCount(1);
    setParticipantForms([]);
    setCurrentFormIndex(0);
  }

  const isCurrentFormValid = participantForms[currentFormIndex]?.name && participantForms[currentFormIndex]?.email;
  const allFormsValid = participantForms.every((form) => form.name && form.email);
  const filledFormsCount = participantForms.filter((form) => form.name && form.email).length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingParticipant) {
      updateMutation.mutate({ id: editingParticipant._id, data: formData });
    } else {
      const dataToSubmit = {
        ...formData,
        qrCode: preGeneratedQR?.qrCode,
      };
      createMutation.mutate(dataToSubmit);
    }
  }

  function handleDelete(id: string) {
    setParticipantToDelete(id);
    setDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (participantToDelete) {
      deleteMutation.mutate(participantToDelete);
    }
  }

  function openEditDialog(participant: Participant) {
    setEditingParticipant(participant);
    setFormData({
      name: participant.name,
      email: participant.email,
      organization: participant.organization,
      status: participant.status,
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setEditingParticipant(null);
    setFormData({
      name: '',
      email: '',
      organization: '',
      status: 'regular',
    });
  }

  function handleViewDetails(participant: Participant) {
    setSelectedParticipantId(participant._id);
    setSelectedParticipant(participant);
    setSkipDetailCleanup(false);
    setIsDetailDialogOpen(true);
  }

  function handleDetailDialogChange(open: boolean) {
    if (open) {
      setIsDetailDialogOpen(true);
      return;
    }

    setIsDetailDialogOpen(false);
    if (skipDetailCleanup) {
      return;
    }

    setSelectedParticipantId(null);
    setSelectedParticipant(null);
  }

  function openReferralsModal() {
    if (!referrals.length) return;
    setSkipDetailCleanup(true);
    setIsReferralDialogOpen(true);
    setIsDetailDialogOpen(false);
  }

  function handleReferralDialogChange(open: boolean) {
    if (open) {
      setIsReferralDialogOpen(true);
      return;
    }

    setIsReferralDialogOpen(false);
    setSkipDetailCleanup(false);
    if (selectedParticipantId) {
      setIsDetailDialogOpen(true);
    }
  }

  function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    const lines = bulkData.trim().split('\n');
    if (lines.length < 2) {
      alert('Please provide at least one participant (header + data)');
      return;
    }

    const participantsList = lines.slice(1).map((line) => {
      const [name, email, organization] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      return { name, email, organization };
    });

    bulkUploadMutation.mutate(participantsList);
  }

  function handleDownloadQRCodes() {
    downloadParticipantQRCodes();
  }

  function handleDownloadTemplate() {
    downloadParticipantTemplate();
  }

  // Drag and drop handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    const text = await file.text();
    setBulkData(text);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  const detailIsAmbassador = participantDetails?.scores?.type === 'ambassador';
  const detailIsTravelGrant = participantDetails?.scores?.type === 'travel_grant';
  const detailSessions = participantDetails
    ? (participantDetails.registrations || []).map((reg) => {
        const session = reg.sessionId as { _id?: string; name?: string } | string | undefined;
        return {
          id: (typeof session === 'object' && session?._id) || reg._id,
          name: (typeof session === 'object' && session?.name) || 'Session',
          status: reg.status,
          registeredAt: reg.createdAt || (reg as { registeredAt?: string }).registeredAt,
        };
      })
    : [];
  const detailCheckIns = participantDetails?.checkIns || [];

  // Generate QR code for participant
  async function generateQRCode(participant: Participant) {
    try {
      const qrDataUrl = await QRCodeGenerator.toDataURL(participant.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(qrDataUrl);
      setSelectedParticipant(participant);
      setIsQRDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  function downloadQRCode() {
    if (!qrCodeDataUrl || !selectedParticipant) return;
    
    const link = document.createElement('a');
    link.download = `${selectedParticipant.name.replace(/\s+/g, '_')}_${selectedParticipant.qrCode}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between p-6 -mx-6 -mt-6 mb-2 bg-gradient-to-r from-indigo-50 to-lavender-light border-b border-border/50">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-indigo-900">
              <div className="p-2.5 rounded-xl bg-primary shadow-primary">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              Participants
            </h2>
            <p className="text-muted-foreground">Loading participants...</p>
          </div>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </motion.div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        onRetry={() => refetch()}
        title="Failed to load participants"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-6 -mx-6 -mt-6 mb-2 bg-gradient-to-r from-indigo-50 to-lavender-light border-b border-border/50">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-indigo-900">
            <div className="p-2.5 rounded-xl bg-primary shadow-primary">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <span>Participants</span>
          </h2>
          <p className="text-muted-foreground">
            Manage conference participants
            {filteredParticipants.length !== participants.length && (
              <Badge variant="secondary" className="ml-2 bg-lavender text-indigo font-medium">
                {filteredParticipants.length} of {participants.length} shown
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Template
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadQRCodes}>
            <QrCode className="mr-2 h-4 w-4" />
            QR Codes
          </Button>
          <Dialog open={isBulkUploadOpen} onOpenChange={(open) => {
            setIsBulkUploadOpen(open);
            if (!open) {
              setBulkData('');
              bulkUploadMutation.reset();
              setUploadedFile(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <form onSubmit={handleBulkUpload}>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Participants</DialogTitle>
                  <DialogDescription>
                    Drag and drop a CSV file or paste CSV data. Format: name,email,organization
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Drag and Drop Zone */}
                  <div
                    {...getRootProps()}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                      isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                      uploadedFile && 'border-green-500 bg-green-50'
                    )}
                  >
                    <input {...getInputProps()} />
                    <FileUp className={cn(
                      'mx-auto h-12 w-12 mb-4',
                      isDragActive ? 'text-primary' : 'text-muted-foreground',
                      uploadedFile && 'text-green-500'
                    )} />
                    {uploadedFile ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-700">
                          File uploaded: {uploadedFile.name}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            setBulkData('');
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : isDragActive ? (
                      <p className="text-sm text-primary font-medium">Drop the CSV file here...</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Drag & drop a CSV file here</p>
                        <p className="text-xs text-muted-foreground">or click to browse</p>
                      </div>
                    )}
                  </div>

                  {/* CSV Data Textarea */}
                  <div className="grid gap-2">
                    <Label htmlFor="csvData">CSV Data (or paste here)</Label>
                    <textarea
                      id="csvData"
                      className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      placeholder="name,email,organization&#10;John Doe,john@example.com,ESPRIT&#10;Jane Smith,jane@example.com,ENIT"
                    />
                  </div>
                  
                  {bulkUploadMutation.data && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'rounded-md border p-4',
                        bulkUploadMutation.data.errors === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                      )}
                    >
                      <h4 className="font-semibold mb-2">Upload Results</h4>
                      <p className="text-sm text-green-600">
                        ✓ {bulkUploadMutation.data.created} participants created
                      </p>
                      {bulkUploadMutation.data.updated > 0 && (
                        <p className="text-sm text-blue-600">
                          ↻ {bulkUploadMutation.data.updated} participants updated
                        </p>
                      )}
                      {bulkUploadMutation.data.errors > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-600 cursor-pointer">
                            ✗ {bulkUploadMutation.data.errors} errors (click to view)
                          </summary>
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {bulkUploadMutation.data.details
                              .filter((d) => d.status === 'error')
                              .map((error, idx) => (
                                <p key={idx} className="text-xs text-red-600">
                                  {error.email}: {error.message}
                                </p>
                              ))}
                          </div>
                        </details>
                      )}
                    </motion.div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsBulkUploadOpen(false);
                      setBulkData('');
                      bulkUploadMutation.reset();
                      setUploadedFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <ButtonLoading
                    type="submit"
                    disabled={!bulkData.trim()}
                    loading={bulkUploadMutation.isPending}
                  >
                    Upload
                  </ButtonLoading>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            {editingParticipant && (
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Edit Participant</DialogTitle>
                    <DialogDescription>
                      Update the participant details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="organization">Organization</Label>
                      <Popover open={orgComboOpen} onOpenChange={setOrgComboOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={orgComboOpen}
                            className="w-full justify-between"
                          >
                            {formData.organization
                              ? ORGANIZATIONS.find((org) => org.label === formData.organization)?.label
                              : "Select organization..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search organization..." />
                            <CommandList>
                              <CommandEmpty>No organization found.</CommandEmpty>
                              <CommandGroup>
                                {ORGANIZATIONS.map((org) => (
                                  <CommandItem
                                    key={org.value}
                                    value={org.label}
                                    onSelect={(currentValue) => {
                                      setFormData({ ...formData, organization: currentValue });
                                      setOrgComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.organization === org.label ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {org.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: 'regular' | 'ambassador' | 'travel_grant') =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="ambassador">Ambassador</SelectItem>
                          <SelectItem value="travel_grant">Travel Grant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <ButtonLoading type="submit" loading={isMutating}>
                      Update
                    </ButtonLoading>
                  </DialogFooter>
                </form>
              </DialogContent>
            )}
          </Dialog>

          {/* Multi-Step Add Participants Dialog */}
          <Dialog open={isMultiAddOpen} onOpenChange={(open) => {
            if (!open) resetMultiAddForm();
            setIsMultiAddOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo hover:bg-indigo-700 shadow-primary hover:shadow-primary-lg transition-all">
                <UserPlus className="h-4 w-4" />
                Add Participants
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <AnimatePresence mode="wait">
                {multiAddStep === 'count' ? (
                  <motion.div
                    key="count-step"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Add New Participants
                      </DialogTitle>
                      <DialogDescription>
                        Choose how many participants you want to add. Each will get a unique QR code.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-8">
                      <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
                            disabled={participantCount <= 1}
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                          <div className="flex flex-col items-center">
                            <span className="text-6xl font-bold text-primary">{participantCount}</span>
                            <span className="text-sm text-muted-foreground">
                              participant{participantCount > 1 ? 's' : ''}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => setParticipantCount(Math.min(20, participantCount + 1))}
                            disabled={participantCount >= 20}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          {[1, 3, 5, 10].map((num) => (
                            <Button
                              key={num}
                              type="button"
                              variant={participantCount === num ? "default" : "outline"}
                              size="sm"
                              onClick={() => setParticipantCount(num)}
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Maximum 20 participants at once
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsMultiAddOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={generateQRCodesForForms} disabled={isGeneratingQRCodes}>
                        {isGeneratingQRCodes ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating QR Codes...
                          </>
                        ) : (
                          <>
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </motion.div>
                ) : (
                  <motion.div
                    key="forms-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col"
                  >
                    <DialogHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                          <UserPlus className="h-5 w-5 text-primary" />
                          Participant {currentFormIndex + 1} of {participantForms.length}
                        </DialogTitle>
                        <Badge variant="outline">
                          {filledFormsCount}/{participantForms.length} completed
                        </Badge>
                      </div>
                      <DialogDescription>
                        Fill in the details for each participant
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Progress bar */}
                    <div className="pb-4">
                      <Progress value={(filledFormsCount / participantForms.length) * 100} className="h-2" />
                    </div>

                    {/* Form navigation pills */}
                    <div className="flex flex-wrap gap-1.5 pb-4">
                      {participantForms.map((form, idx) => (
                        <TooltipProvider key={idx}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant={currentFormIndex === idx ? "default" : form.name && form.email ? "secondary" : "outline"}
                                size="sm"
                                className={cn(
                                  "w-9 h-9 p-0",
                                  form.name && form.email && currentFormIndex !== idx && "bg-green-100 text-green-700 hover:bg-green-200"
                                )}
                                onClick={() => setCurrentFormIndex(idx)}
                              >
                                {form.name && form.email ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  idx + 1
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {form.name || `Participant ${idx + 1}`}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>

                    <ScrollArea className="flex-1 max-h-[45vh] pr-4 -mr-4">
                      <div className="space-y-4">
                        {/* QR Code Preview */}
                        {participantForms[currentFormIndex] && (
                          <div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-xl bg-muted/30">
                            <div className="shrink-0">
                              {participantForms[currentFormIndex].qrCodeDataUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={participantForms[currentFormIndex].qrCodeDataUrl}
                                  alt="QR Code"
                                  className="w-24 h-24 rounded-lg border-2 border-background shadow-sm"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                                  <QrCode className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground">Assigned QR Code</p>
                              <code className="text-sm font-mono font-semibold">
                                {participantForms[currentFormIndex].qrCode}
                              </code>
                              <p className="text-xs text-muted-foreground mt-1">
                                This QR code is pre-generated and will be linked to this participant
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid gap-2">
                          <Label htmlFor={`name-${currentFormIndex}`}>Name *</Label>
                          <Input
                            id={`name-${currentFormIndex}`}
                            value={participantForms[currentFormIndex]?.name || ''}
                            onChange={(e) => updateParticipantForm(currentFormIndex, 'name', e.target.value)}
                            placeholder="John Doe"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`email-${currentFormIndex}`}>Email *</Label>
                          <Input
                            id={`email-${currentFormIndex}`}
                            type="email"
                            value={participantForms[currentFormIndex]?.email || ''}
                            onChange={(e) => updateParticipantForm(currentFormIndex, 'email', e.target.value)}
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`organization-${currentFormIndex}`}>Organization</Label>
                          <Popover 
                            open={orgComboOpenMulti === currentFormIndex} 
                            onOpenChange={(open) => setOrgComboOpenMulti(open ? currentFormIndex : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {participantForms[currentFormIndex]?.organization || "Select organization..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search organization..." />
                                <CommandList>
                                  <CommandEmpty>No organization found.</CommandEmpty>
                                  <CommandGroup>
                                    {ORGANIZATIONS.map((org) => (
                                      <CommandItem
                                        key={org.value}
                                        value={org.label}
                                        onSelect={(value) => {
                                          updateParticipantForm(currentFormIndex, 'organization', value);
                                          setOrgComboOpenMulti(null);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            participantForms[currentFormIndex]?.organization === org.label ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {org.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`status-${currentFormIndex}`}>Status</Label>
                          <Select
                            value={participantForms[currentFormIndex]?.status || 'regular'}
                            onValueChange={(value: 'regular' | 'ambassador' | 'travel_grant') =>
                              updateParticipantForm(currentFormIndex, 'status', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="ambassador">Ambassador</SelectItem>
                              <SelectItem value="travel_grant">Travel Grant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </ScrollArea>

                    <Separator className="my-4" />

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMultiAddStep('count');
                          setParticipantForms([]);
                        }}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Start Over
                      </Button>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentFormIndex === 0}
                          onClick={() => setCurrentFormIndex(currentFormIndex - 1)}
                        >
                          <ChevronLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        {currentFormIndex < participantForms.length - 1 ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setCurrentFormIndex(currentFormIndex + 1)}
                            disabled={!isCurrentFormValid}
                          >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : (
                          <ButtonLoading
                            onClick={handleMultiAddSubmit}
                            disabled={!allFormsValid}
                            loading={createMutation.isPending}
                            size="sm"
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Create All ({filledFormsCount})
                          </ButtonLoading>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters - Always Visible */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            {/* Search and Filters Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                  aria-label="Search participants"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="travel_grant">Travel Grant</SelectItem>
                </SelectContent>
              </Select>

              {/* Organization Filter */}
              <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizations</SelectItem>
                  {uniqueOrganizations.map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Group By */}
              <Select value={groupBy} onValueChange={(v: GroupByOption) => setGroupBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="status">Group by status</SelectItem>
                  <SelectItem value="organization">Group by organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters */}
            {(statusFilter !== 'all' || organizationFilter !== 'all' || searchQuery || groupBy !== 'none') && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => {
                  setStatusFilter('all');
                  setOrganizationFilter('all');
                  setSearchQuery('');
                  setGroupBy('none');
                }} className="gap-1">
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-indigo" aria-hidden="true" />
                All Participants
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {filteredParticipants.length === participants.length
                  ? `A list of all ${participants.length} conference participants`
                  : `Showing ${filteredParticipants.length} of ${participants.length} participants`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>per page</span>
                <span className="text-muted-foreground/70">
                  ({filteredParticipants.length} total)
                </span>
              </div>
              <Badge variant="secondary" className="text-sm bg-indigo-100 text-indigo border-indigo/20">
                {participants.length} total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={paginatedParticipants}
            columns={columns}
            getRowId={(row) => row._id}
            selectable={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkDeleteEnabled={true}
            onBulkDelete={async (ids) => {
              setIsBulkDeleting(true);
              for (const id of ids) {
                try {
                  await deleteMutation.mutateAsync(id);
                } catch {
                  // Continue deleting other items even if one fails
                }
              }
              setIsBulkDeleting(false);
              setSelectedIds(new Set());
            }}
            deleteConfirmMessage={(count) => (
              <>
                <p>
                  This action cannot be undone. This will permanently delete{' '}
                  <strong className="text-foreground">{count}</strong>{' '}
                  participant{count !== 1 ? 's' : ''} and all associated data including 
                  check-ins, session registrations, and referral records.
                </p>
              </>
            )}
            isLoading={false}
            emptyMessage={
              searchQuery || statusFilter !== 'all' || organizationFilter !== 'all'
                ? 'No participants match your filters'
                : 'No participants yet'
            }
            emptyDescription={
              searchQuery || statusFilter !== 'all' || organizationFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first participant to get started'
            }
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredParticipants.length}
            onPageChange={setCurrentPage}
            stickyHeader={true}
            maxHeight="600px"
            ariaLabel="Participants table"
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this participant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code View Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              {selectedParticipant && `QR Code for ${selectedParticipant.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeDataUrl && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="border-2 border-muted rounded-lg p-4 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </motion.div>
            )}
            {selectedParticipant && (
              <div className="text-center space-y-1">
                <p className="font-semibold">{selectedParticipant.name}</p>
                <p className="text-sm text-muted-foreground">{selectedParticipant.email}</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {selectedParticipant.qrCode}
                </code>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={downloadQRCode} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ParticipantProfileModal
        open={isDetailDialogOpen}
        onOpenChange={handleDetailDialogChange}
        participant={selectedParticipant}
        details={participantDetails || null}
        isLoading={isDetailsLoading}
      />

      {/* Ambassador Referrals Dialog */}
      <Dialog open={isReferralDialogOpen} onOpenChange={handleReferralDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Referral Network</DialogTitle>
            <DialogDescription>
              {selectedParticipant
                ? `Participants referred by ${selectedParticipant.name}`
                : 'Referred participants overview'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {referrals.length ? (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral._id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-muted bg-muted/10 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{referral.name}</p>
                      <p className="text-xs text-muted-foreground">{referral.email}</p>
                      {referral.organization && (
                        <p className="text-xs text-muted-foreground">{referral.organization}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {referral.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-muted px-6 py-10 text-center text-sm text-muted-foreground">
                This ambassador has not referred any participants yet.
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="outline" onClick={() => handleReferralDialogChange(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
