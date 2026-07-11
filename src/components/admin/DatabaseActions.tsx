import { Info, OctagonX, SquarePen, SquareMenu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ArtworkRecord } from '@/lib/shared/artworks.types';

type DatabaseActionsProps = {
  record: ArtworkRecord;
  onInfo: (record: ArtworkRecord) => void;
  onEdit: (record: ArtworkRecord) => void;
  onDelete: (record: ArtworkRecord) => void;
};
export function DatabaseActions({ record, onInfo, onEdit, onDelete }: DatabaseActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            className='hover:scale-[1.1] focus-visible:scale-[1.1] active:scale-[1] transition duration-100'
          />
        }
      >
        <SquareMenu className='size-7' />
      </DropdownMenuTrigger>
      <DropdownMenuContent className='border-popover-border'>
        <DropdownMenuItem
          className='inline-flex items-center w-full font-medium text-foreground text-base'
          onClick={() => onInfo(record)}
        >
          <Info className='size-4.5 text-sky-600 dark:text-sky-400' />
          Info
        </DropdownMenuItem>
        <DropdownMenuItem
          className='inline-flex items-center w-full font-medium text-foreground text-base'
          onClick={() => onEdit(record)}
        >
          <SquarePen className='size-4.5 text-green-500' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className='inline-flex items-center w-full font-medium text-foreground text-base'
          onClick={() => onDelete(record)}
        >
          <OctagonX className='size-4.5 text-red-500' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
