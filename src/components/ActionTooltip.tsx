import type { ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ActionTooltip({ label, children }: { label: string; children: ReactElement }) {
  return <TooltipProvider delayDuration={250}><Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip></TooltipProvider>;
}