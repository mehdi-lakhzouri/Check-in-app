'use client';

import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/lib/animations';
import type { ReportCardConfig } from './types';

// Icon mapping
import {
  Users,
  BarChart3,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Users,
  BarChart3,
  Activity,
  FileSpreadsheet,
};

interface ReportCardProps {
  config: ReportCardConfig;
  onGenerate: () => void;
  onDownload?: () => void;
  isLoading?: boolean;
  isDownloading?: boolean;
  disabled?: boolean;
}

export function ReportCard({
  config,
  onGenerate,
  onDownload,
  isLoading = false,
  isDownloading = false,
  disabled = false,
}: ReportCardProps) {
  const Icon = iconMap[config.icon] || Users;

  return (
    <motion.div variants={cardVariants} whileHover={{ y: -2 }}>
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                'p-3 rounded-xl shrink-0',
                config.iconBgColor
              )}
            >
              <Icon className={cn('h-6 w-6', config.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1">{config.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {config.description}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={disabled || isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>

                {config.supportsExcel && onDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onDownload}
                    disabled={disabled || isDownloading}
                    className="gap-2"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
