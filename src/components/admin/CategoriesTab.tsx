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

type CategoriesTabProps = {
  categories: ArtworkCategoryRecord[];
  dateFormatter: Intl.DateTimeFormat;
};

function formatDate(dateFormatter: Intl.DateTimeFormat, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
}

export function CategoriesTab({ categories, dateFormatter }: CategoriesTabProps) {
  const router = useRouter();
  const [categoryPending, setCategoryPending] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  // const activeCategoryCount = categories.filter((category) => category.status === 'active').length;

  return (
    <TabsContent value='categories' className='mt-4 max-w-300 w-full mx-auto'>
      <div className='grid gap-6'>
        <Card className='min-w-0 overflow-hidden rounded-sm pt-4 pb-0 border-b-0'>
          <CardHeader>
            <CardTitle className='text-xl'>Artwork Categories</CardTitle>
            <CardDescription>
              Categories for different types of artwork as well as grouping images in storage.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            {categories.length === 0 ? (
              <div className='flex min-h-60 items-center justify-center p-6 text-sm text-muted-foreground'>
                No categories found.
              </div>
            ) : (
              <Table className='min-w-230 w-full'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='min-w-46 max-w-52'>Category Name / Slug</TableHead>
                    <TableHead className='min-w-0 max-w-100'>Description</TableHead>
                    <TableHead className='w-22'>Sort Order</TableHead>
                    <TableHead className='w-20'>Status</TableHead>
                    <TableHead className='min-w-30 xl:max-[1400px]:w-45'>Created</TableHead>
                    <TableHead className='min-w-30 xl:max-[1400px]:w-45'>Updated</TableHead>
                    <TableHead className='w-30'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className='whitespace-normal'>
                        <div className='space-y-2'>
                          <p className='font-medium leading-tight'>{category.label}</p>
                          <p className='text-xs text-muted-foreground font-mono'>{category.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        {category.description ? (
                          category.description
                        ) : (
                          <span className='text-sm text-muted-foreground'>-</span>
                        )}
                      </TableCell>
                      <TableCell>{category.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant={category.status === 'active' ? 'secondary' : 'outline'}>
                          {category.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='font-mono text-xs whitespace-normal'>
                        {formatDate(dateFormatter, category.createdAt)}
                      </TableCell>
                      <TableCell className='font-mono text-xs whitespace-normal'>
                        {formatDate(dateFormatter, category.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col justify-center items-center gap-3'>
                          <button className='admin-edit-button'>Edit</button>
                          <button className='admin-delete-button'>Delete</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className='h-fit max-w-140 rounded-sm'>
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
                  setCategorySuccess(`Created ${created.label} (${created.slug}).`);
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
                  Category Name<span className='text-red-500 -ml-1'>*</span>
                </Label>
                <Input
                  id='category-label'
                  required
                  name='label'
                  maxLength={80}
                  placeholder='Name used to identify the category'
                  className='ph'
                />
              </div>

              <div className='space-y-2 '>
                <Label htmlFor='category-slug'>
                  Slug<span className='text-red-500 -ml-1'>*</span>
                </Label>
                <Input
                  id='category-slug'
                  required
                  name='slug'
                  placeholder='words-separated-by-dashes'
                  className='ph'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='category-description'>
                  Description<span className='text-red-500 -ml-1'>*</span>
                </Label>
                <Textarea
                  id='category-description'
                  required
                  name='description'
                  placeholder='Description of the category to be used on the category page.'
                  rows={6}
                  className='ph border-border-secondary min-h-20'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='category-sort-order'>
                  Sort order<span className='text-red-500 -ml-1'>*</span>
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
                className='w-full bg-brand-500 hover:bg-brand-400 dark:bg-brand-700 dark:hover:bg-brand-600 active:bg-brand-600 dark:active:bg-brand-700'
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
