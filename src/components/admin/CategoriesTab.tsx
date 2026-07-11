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
import type { ArtworkCategoryRecord } from '@/lib/shared/categories.types';
import { dateFormatter } from '@/lib/shared/utils';

import { AddCategoryModal } from './AddCategoryModal';
import { CategoryDeleteModal } from './CategoryDeleteModal';
import { CategoryEditModal } from './CategoryEditModal';

type CategoriesTabProps = {
  allCategories: ArtworkCategoryRecord[];
};

function formatDate(dateFormatter: Intl.DateTimeFormat, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
}

export function CategoriesTab({ allCategories }: CategoriesTabProps) {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ArtworkCategoryRecord | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<ArtworkCategoryRecord | null>(null);

  const AddCategoryBtn = () => {
    return (
      <Button
        variant='brand'
        size='sm'
        className='rounded-xl'
        onClick={() => setIsAddCategoryOpen(true)}
      >
        Add New Category
      </Button>
    );
  };

  return (
    <TabsContent value='categories' className='mx-auto mt-4 w-full max-w-300'>
      {allCategories.length === 0 ? (
        <Card className='p-8 rounded-sm w-full h-40'>
          <CardContent className='flex justify-start items-center gap-20 w-full h-full'>
            <div className='flex flex-col gap-6'>
              <h2 className='font-bold text-xl'>No Catagories</h2>
              <h3 className='font-semibold text-base'>Add categories for organizing artworks.</h3>
            </div>
            <AddCategoryBtn />
          </CardContent>
        </Card>
      ) : (
        <Card className='gap-5 pt-5 pb-0 border-b-0 rounded-sm min-w-0 overflow-hidden'>
          <CardHeader className='flex justify-start items-center gap-12'>
            <div className='flex flex-col gap-2'>
              <CardTitle className='pb-1 font-semibold text-xl'>Artwork Categories</CardTitle>
              <CardDescription>Categories for different types of artwork.</CardDescription>
            </div>
            <AddCategoryBtn />
          </CardHeader>

          <CardContent className='p-0'>
            <Table className='w-full min-w-200'>
              <TableHeader>
                <TableRow className='h-14 whitespace-normal'>
                  <TableHead className='min-w-46'>Category Name</TableHead>
                  <TableHead className='min-w-0 max-w-100'>Description</TableHead>
                  <TableHead className='w-16 text-center whitespace-normal'>Sort Order</TableHead>
                  <TableHead className='w-20 text-center'>Status</TableHead>
                  <TableHead className='w-39 text-center whitespace-normal'>
                    Created / Updated
                  </TableHead>
                  <TableHead className='w-28 text-center'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className='font-semibold whitespace-normal'>
                      {category.label}
                    </TableCell>
                    <TableCell className='pr-0 whitespace-normal'>
                      <div className='pr-3 max-h-23 overflow-y-scroll'>
                        {category.description ? (
                          category.description
                        ) : (
                          <span className='text-muted-foreground text-sm'>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-center'>{category.sortOrder}</TableCell>
                    <TableCell className='text-center'>
                      <Badge variant={category.status === 'active' ? 'positive' : 'outline'}>
                        {category.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-xs whitespace-normal'>
                      <p className='block pb-4'>
                        Created:
                        <span className='block tracking-wide'>
                          {formatDate(dateFormatter, category.createdAt)}
                        </span>
                      </p>
                      <p className=''>
                        Updated:
                        <span className='block tracking-wide'>
                          {formatDate(dateFormatter, category.updatedAt)}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-col justify-center items-center gap-3'>
                        <Button
                          variant='positive'
                          size='xs'
                          className='w-17'
                          onClick={() => setEditCategory(category)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant='destructive'
                          size='xs'
                          className='w-17'
                          onClick={() => setDeleteCategory(category)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddCategoryModal open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen} />

      {editCategory ? (
        <CategoryEditModal
          key={editCategory.id}
          record={editCategory}
          onClose={() => setEditCategory(null)}
        />
      ) : null}

      {deleteCategory ? (
        <CategoryDeleteModal
          key={deleteCategory.id}
          record={deleteCategory}
          onClose={() => setDeleteCategory(null)}
        />
      ) : null}
    </TabsContent>
  );
}
