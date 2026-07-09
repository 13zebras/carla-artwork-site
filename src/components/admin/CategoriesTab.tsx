import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
import { dateFormatter } from '@/lib/utils';

import { AddCategoryModal } from './AddCategoryModal';

type CategoriesTabProps = {
  categories: ArtworkCategoryRecord[];
};

function formatDate(dateFormatter: Intl.DateTimeFormat, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
}

export function CategoriesTab({ categories }: CategoriesTabProps) {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  return (
    <TabsContent value='categories' className='mx-auto mt-4 w-full max-w-300'>
      <div className='gap-6 grid'>
        <Card className='pt-4 pb-0 border-b-0 rounded-sm min-w-0 overflow-hidden'>
          <CardHeader className='flex justify-between items-center'>
            <div>
              <CardTitle className='text-xl'>Artwork Categories</CardTitle>
              <CardDescription>
                Categories for different types of artwork as well as grouping images in storage.
              </CardDescription>
            </div>
            <Button variant='brand' onClick={() => setIsAddCategoryOpen(true)}>
              Add New Category
            </Button>
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
                          <button className=''>Edit</button>
                          <button className=''>Delete</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddCategoryModal open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen} />
    </TabsContent>
  );
}
