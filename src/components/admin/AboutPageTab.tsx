import { useRouter } from '@tanstack/react-router';
import { useRef, useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { saveAboutContent } from '@/lib/functions/about.functions';
import type { AboutContent } from '@/lib/shared/about.types';

type AboutTabProps = {
  about: AboutContent;
};

function filenameFromPath(path: string) {
  return path.split('/').at(-1) ?? path;
}

export function AboutPageTab({ about }: AboutTabProps) {
  const router = useRouter();
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(about.text);
  const [imageAlt, setImageAlt] = useState(about.imageAlt);
  const [removeMobile, setRemoveMobile] = useState(false);
  const [removeDesktop, setRemoveDesktop] = useState(false);
  const [hasMobileSelection, setHasMobileSelection] = useState(false);
  const [hasDesktopSelection, setHasDesktopSelection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasRemainingImage =
    hasMobileSelection ||
    hasDesktopSelection ||
    Boolean(about.mobileImagePath && !removeMobile) ||
    Boolean(about.desktopImagePath && !removeDesktop);

  function handleRemoveMobile(checked: boolean) {
    setRemoveMobile(checked);
    if (checked && mobileInputRef.current) {
      mobileInputRef.current.value = '';
      setHasMobileSelection(false);
    }
  }

  function handleRemoveDesktop(checked: boolean) {
    setRemoveDesktop(checked);
    if (checked && desktopInputRef.current) {
      desktopInputRef.current.value = '';
      setHasDesktopSelection(false);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set('text', text);
    formData.set('image_alt', imageAlt);
    formData.set('remove_mobile', String(removeMobile));
    formData.set('remove_desktop', String(removeDesktop));

    try {
      await saveAboutContent({ data: formData });
      await router.invalidate();
      toast.success('About page saved');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the about page.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TabsContent value='about' className='mx-auto mt-4 w-full max-w-300'>
      <Card className='rounded-sm'>
        <CardHeader>
          <CardTitle className='font-semibold text-xl'>About Page</CardTitle>
          <CardDescription>
            Update the page copy and its responsive photos. Blank lines create new paragraphs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <Alert variant='destructive' className='mb-6'>
              <AlertTitle>About page not saved</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <form className='gap-7 grid' encType='multipart/form-data' onSubmit={handleSubmit}>
            <div className='gap-3 grid'>
              <Label htmlFor='about-text'>About text</Label>
              <Textarea
                id='about-text'
                name='text'
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder='Write the About page copy…'
                className='bg-background min-h-80 md:text-base resize-y ph'
              />
              <p className='text-muted-foreground text-xs'>
                Press Enter twice to begin a new paragraph. Line breaks and paragraphs are
                preserved.
              </p>
            </div>

            <div className='gap-6 grid lg:grid-cols-2'>
              <div className='content-start gap-3 grid'>
                <Label htmlFor='about-mobile-image'>
                  {about.mobileImagePath ? 'Replace mobile about photo' : 'Mobile about photo'}
                </Label>
                {about.mobileImagePath ? (
                  <p className='text-muted-foreground text-sm'>
                    Current: {filenameFromPath(about.mobileImagePath)}
                  </p>
                ) : null}
                <Input
                  ref={mobileInputRef}
                  id='about-mobile-image'
                  name='mobile_image'
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  disabled={removeMobile}
                  onChange={(event) => {
                    const selected = Boolean(event.currentTarget.files?.length);
                    setHasMobileSelection(selected);
                    if (selected) {
                      setRemoveMobile(false);
                    }
                  }}
                  className='file:mr-3 p-0 file:px-3 border-0 file:rounded-md hover:file:bg-accent-c active:file:bg-accent-c/70 file:bg-accent-c/80 file:cursor-pointer'
                />
                <p className='text-muted-foreground text-xs'>
                  Used below the sm breakpoint. Upload a landscape crop.
                </p>
                {about.mobileImagePath ? (
                  <div className='flex items-center gap-2 mt-1'>
                    <input
                      id='remove-mobile-image'
                      type='checkbox'
                      aria-label='Remove mobile photo when saved'
                      checked={removeMobile}
                      onChange={(event) => handleRemoveMobile(event.target.checked)}
                      className='size-4 accent-destructive cursor-pointer'
                    />
                    <Label htmlFor='remove-mobile-image' className='font-normal cursor-pointer'>
                      Remove mobile photo when saved
                    </Label>
                  </div>
                ) : null}
              </div>

              <div className='content-start gap-3 grid'>
                <Label htmlFor='about-desktop-image'>
                  {about.desktopImagePath ? 'Replace desktop about photo' : 'Desktop about photo'}
                </Label>
                {about.desktopImagePath ? (
                  <p className='text-muted-foreground text-sm'>
                    Current: {filenameFromPath(about.desktopImagePath)}
                  </p>
                ) : null}
                <Input
                  ref={desktopInputRef}
                  id='about-desktop-image'
                  name='desktop_image'
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  disabled={removeDesktop}
                  onChange={(event) => {
                    const selected = Boolean(event.currentTarget.files?.length);
                    setHasDesktopSelection(selected);
                    if (selected) {
                      setRemoveDesktop(false);
                    }
                  }}
                  className='file:mr-3 p-0 file:px-3 border-0 file:rounded-md hover:file:bg-accent-c active:file:bg-accent-c/70 file:bg-accent-c/80 file:cursor-pointer'
                />
                <p className='text-muted-foreground text-xs'>
                  Used from the sm breakpoint upward and floated beside the text.
                </p>
                {about.desktopImagePath ? (
                  <div className='flex items-center gap-2 mt-1'>
                    <input
                      id='remove-desktop-image'
                      type='checkbox'
                      aria-label='Remove desktop photo when saved'
                      checked={removeDesktop}
                      onChange={(event) => handleRemoveDesktop(event.target.checked)}
                      className='size-4 accent-destructive cursor-pointer'
                    />
                    <Label htmlFor='remove-desktop-image' className='font-normal cursor-pointer'>
                      Remove desktop photo when saved
                    </Label>
                  </div>
                ) : null}
              </div>
            </div>

            <div className='gap-3 grid'>
              <Label htmlFor='about-image-alt'>Photo alt text</Label>
              <Input
                id='about-image-alt'
                name='image_alt'
                type='text'
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                required={hasRemainingImage}
                placeholder='Describe the photo for visitors using screen readers'
                className='bg-background md:text-base ph'
              />
              <p className='text-muted-foreground text-xs'>
                Shared by both photos and required whenever either photo is present.
              </p>
            </div>

            <Button
              type='submit'
              variant='brand'
              disabled={isSubmitting}
              className='justify-self-start rounded-lg'
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
