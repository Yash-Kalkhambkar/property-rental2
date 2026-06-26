import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTenant, useUpdateTenant } from '@/hooks/owner/useTenants'
import type { Tenant } from '@/types/owner'

const baseFields = {
  full_name: z.string().min(2),
  email: z.email(),
  phone: z.string().min(1),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  id_type: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']).optional(),
  id_number: z.string().optional(),
  notes: z.string().optional(),
}

const createSchema = z.object({ ...baseFields, password: z.string().min(8) })
const updateSchema = z.object(baseFields)

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant?: Tenant
}) {
  const create = useCreateTenant()
  const update = useUpdateTenant(tenant?.id ?? '')
  const isEdit = !!tenant

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const updateForm = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    values: tenant
      ? {
          full_name: tenant.full_name,
          email: tenant.email,
          phone: tenant.phone,
          emergency_contact_name: tenant.emergency_contact_name ?? undefined,
          emergency_contact_phone: tenant.emergency_contact_phone ?? undefined,
          id_type: tenant.id_type ?? undefined,
          id_number: tenant.id_number ?? undefined,
          notes: tenant.notes ?? undefined,
        }
      : undefined,
  })

  const onCreate = (values: CreateForm) => {
    create.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  const onUpdate = (values: UpdateForm) => {
    update.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tenant' : 'Add tenant'}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <form onSubmit={updateForm.handleSubmit(onUpdate)} className="space-y-4">
            <TenantFields register={updateForm.register} errors={updateForm.formState.errors} />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <TenantFields register={createForm.register} errors={createForm.formState.errors} />
            <div className="space-y-2">
              <Label>Initial password</Label>
              <Input type="password" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-danger">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Add tenant</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

type BaseFormFields = Omit<CreateForm, 'password'>

function TenantFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<BaseFormFields>>['register']
  errors: ReturnType<typeof useForm<BaseFormFields>>['formState']['errors']
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label>Full name</Label>
          <Input {...register('full_name')} />
          {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label>Phone</Label>
          <Input {...register('phone')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" {...register('email')} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea {...register('notes')} />
      </div>
    </>
  )
}
