import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { createAdminCategory } from '@/lib/categories.functions';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
import { dateFormatter, slugify } from '@/lib/utils';

type CategoriesTabProps = {
  categories: ArtworkCategoryRecord[];
};

function formatDate(dateFormatter: Intl.DateTimeFormat, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
}

export function CategoriesTab({ categories }: CategoriesTabProps) {
  const router = useRouter();
  const [categoryPending, setCategoryPending] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [categoryLabel, setCategoryLabel] = useState('');

  return (
    <TabsContent value='categories' className='mx-auto mt-4 w-full max-w-300'>
      <div className='gap-6 grid'>
        <Card className='pt-4 pb-0 border-b-0 rounded-sm min-w-0 overflow-hidden'>
          <CardHeader>
            <CardTitle className='text-xl'>Artwork Categories</CardTitle>
            <CardDescription>
              Categories for different types of artwork as well as grouping images in storage.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            {categories.length === 0 ? (
              <div className='flex justify-center items-center p-6 min-h-60 text-muted-foreground text-sm'>
                No categories found.
              </div>
            ) : (
              <Table className='w-full min-w-230'>
                <TableHeader>
                  <TableRow className='h-14 whitespace-normal'>
                    <TableHead className='min-w-46 max-w-52'>Category Name / ID</TableHead>
                    <TableHead className='min-w-0 max-w-100'>Description</TableHead>
                    <TableHead className='w-12 whitespace-normal'>Sort Order</TableHead>
                    <TableHead className='w-18'>Status</TableHead>
                    <TableHead className='xl:max-[1400px]:w-45 min-w-30'>Created</TableHead>
                    <TableHead className='xl:max-[1400px]:w-45 min-w-30'>Updated</TableHead>
                    <TableHead className='w-30'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className='whitespace-normal'>
                        <div className='space-y-2'>
                          <p className='font-medium leading-tight'>{category.label}</p>
                          <p className='font-mono text-muted-foreground text-xs'>{category.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        {category.description ? (
                          category.description
                        ) : (
                          <span className='text-muted-foreground text-sm'>-</span>
                        )}
                      </TableCell>
                      <TableCell>{category.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant={category.status === 'active' ? 'secondary' : 'outline'}>
                          {category.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='font-mono text-xs whitespace-normal'>
                        <p className='block pb-4'>
                          Created:
                          <span className='ml-2'>
                            {formatDate(dateFormatter, category.createdAt)}
                          </span>
                        </p>
                        <p className=''>
                          Updated:
                          <span className='font-mono'>
                            {formatDate(dateFormatter, category.updatedAt)}
                          </span>
                        </p>
                      </TableCell>
                      <TableCell className='font-mono text-xs whitespace-normal'>
                        {formatDate(dateFormatter, category.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col justify-center items-center gap-3'>
                          <button className='admin-button admin-edit-button'>Edit</button>
                          <button className='admin-button admin-delete-button'>Delete</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className='rounded-sm max-w-140 h-fit'>
          <CardHeader>
            <CardTitle>Add category</CardTitle>
            <CardDescription>
              Register a new category in the database and refresh the dashboard instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            {categoryError ? (
              <Alert variant='destructive'>
                <AlertTitle>Category creation failed</AlertTitle>
                <AlertDescription>{categoryError}</AlertDescription>
              </Alert>
            ) : null}

            {categorySuccess ? (
              <Alert>
                <AlertTitle>Category created</AlertTitle>
                <AlertDescription>{categorySuccess}</AlertDescription>
              </Alert>
            ) : null}

            <form
              className='space-y-4'
              onSubmit={async (event) => {
                event.preventDefault();
                setCategoryPending(true);
                setCategoryError(null);
                setCategorySuccess(null);

                const form = event.currentTarget;

                try {
                  const created = await createAdminCategory({ data: new FormData(form) });
                  form.reset();
                  setCategoryLabel('');
                  setCategorySuccess(`Created ${created.label} (${created.id}).`);
                  await router.invalidate();
                } catch (error) {
                  setCategoryError(
                    error instanceof Error && error.message.trim().length > 0
                      ? error.message
                      : typeof error === 'string' && error.trim().length > 0
                        ? error
                        : 'Unable to create category',
                  );
                } finally {
                  setCategoryPending(false);
                }
              }}
            >
              <div className='space-y-2'>
                <Label htmlFor='category-label'>
                  Category Name<span className='-ml-1 text-red-500'>*</span>
                </Label>
                <Input
                  id='category-label'
                  required
                  name='label'
                  maxLength={80}
                  placeholder='Name used to identify the category'
                  className='ph'
                  value={categoryLabel}
                  onChange={(event) => setCategoryLabel(event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='category-id'>Category ID - auto-generated - read-only</Label>
                <Input
                  id='category-id'
                  readOnly
                  value={slugify(categoryLabel)}
                  placeholder='auto-generated-from-name'
                  className='text-dim-fg ph'
                />
                {/* <p className='text-muted-foreground text-xs'>
                  Auto-generated from the category name. Used as the unique identifier in URLs and
                  storage paths.
                </p> */}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='category-description'>
                  Description<span className='-ml-1 text-red-500'>*</span>
                </Label>
                <Textarea
                  id='category-description'
                  required
                  name='description'
                  placeholder='Description of the category to be used on the category page.'
                  rows={6}
                  className='border-border-2nd min-h-20 ph'
                />
              </div>

              <div className='space-y-2 max-w-20'>
                <Label htmlFor='category-sort-order'>
                  Sort order<span className='-ml-1 text-red-500'>*</span>
                </Label>
                <Input
                  id='category-sort-order'
                  required
                  name='sort_order'
                  inputMode='numeric'
                  placeholder='70'
                  type='number'
                  className='ph'
                />
              </div>

              <Button
                className='bg-brand-500 hover:bg-brand-400 active:bg-brand-600 dark:active:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600 w-40'
                disabled={categoryPending}
                type='submit'
              >
                {categoryPending ? 'Creating...' : 'Create category'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
