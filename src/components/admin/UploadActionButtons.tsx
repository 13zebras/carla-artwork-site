import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type UploadActionButtonsProps = {
  onImageUpload: () => void;
  onBulkImageUpload: () => void;
};

export function UploadActionButtons({
  onImageUpload,
  onBulkImageUpload,
}: UploadActionButtonsProps) {
  return (
    <div className='flex gap-4'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='positive' size='sm' className='rounded-xl w-28 cursor-pointer' />
          }
          onClick={onImageUpload}
        >
          Add Image
        </TooltipTrigger>
        <TooltipContent side='top'>Upload a single image</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='information' size='sm' className='rounded-xl w-28 cursor-pointer' />
          }
          onClick={onBulkImageUpload}
        >
          Bulk Images
        </TooltipTrigger>
        <TooltipContent side='top'>Upload several images at once</TooltipContent>
      </Tooltip>
    </div>
  );
}
