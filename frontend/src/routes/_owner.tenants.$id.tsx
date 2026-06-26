import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Key,
  Phone,
  EnvelopeSimple,
  User,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import { DocumentUploadBlock } from '@/components/shared/DocumentUploadBlock'
import { Skeleton } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TenantFormDialog } from '@/components/features/tenants/TenantFormDialog'
import {
  useTenant,
  useDeleteTenant,
  useUploadTenantDocument,
  useResetTenantPassword,
} from '@/hooks/owner/useTenants'
import { formatDate, idTypeLabel } from '@/lib/formatters'

export const Route = createFileRoute('/_owner/tenants/$id')({
  component: TenantDetailPage,
})

function TenantDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: tenant, isLoading } = useTenant(id)
  const deleteTenant = useDeleteTenant()
  const uploadDoc = useUploadTenantDocument(id)
  const resetPassword = useResetTenantPassword(id)
  const [editOpen, setEditOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-96" />
  if (!tenant) return <p className="text-owner-muted">Tenant not found.</p>

  return (
    <div className="space-y-8">
      <Link
        to="/tenants"
        className="inline-flex items-center gap-2 text-sm text-owner-muted hover:text-owner-accent"
      >
        <ArrowLeft weight="regular" size={16} /> Back to tenants
      </Link>

      <div className="glass-owner rounded-2xl p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-owner-accent/20 text-owner-accent font-display text-4xl font-semibold">
              {tenant.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold text-gradient-owner">
                {tenant.full_name}
              </h1>
              <p className="text-owner-muted mt-1">Member since {formatDate(tenant.created_at)}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <EnvelopeSimple weight="duotone" size={16} className="text-owner-accent" /> {tenant.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone weight="duotone" size={16} className="text-owner-accent" /> {tenant.phone}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <PencilSimple weight="regular" size={16} /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                resetPassword.mutate(undefined, {
                  onSuccess: (res) => setTempPassword(res.data.temporary_password),
                })
              }
              disabled={resetPassword.isPending}
            >
              <Key weight="regular" size={16} /> Reset password
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash weight="regular" size={16} /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {tenant.full_name} permanently if no lease history exists.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteTenant.mutate(id, {
                        onSuccess: () => navigate({ to: '/tenants' }),
                      })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mt-8 pt-8 border-t border-owner-border/50">
          <InfoBlock icon={User} label="Emergency contact" value={tenant.emergency_contact_name ?? '—'} />
          <InfoBlock icon={Phone} label="Emergency phone" value={tenant.emergency_contact_phone ?? '—'} />
          <InfoBlock
            label="ID type"
            value={tenant.id_type ? idTypeLabel[tenant.id_type] : '—'}
          />
          <InfoBlock label="ID number" value={tenant.id_number ?? '—'} />
        </div>

        {tenant.notes && (
          <div className="mt-6 p-4 rounded-xl bg-owner-bg/50 text-sm text-owner-muted">
            {tenant.notes}
          </div>
        )}
      </div>

      <DocumentUploadBlock
        label="Identity document"
        accept=".pdf,.jpg,.jpeg,.png"
        documentUrl={tenant.id_document_url}
        onUpload={(file) => uploadDoc.mutate(file)}
        isUploading={uploadDoc.isPending}
        onView={() => {
          if (tenant.id_document_url) window.open(tenant.id_document_url, '_blank')
        }}
      />

      <TenantFormDialog open={editOpen} onOpenChange={setEditOpen} tenant={tenant} />

      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Share this password securely with the tenant. They should change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-owner-bg p-4 text-center font-mono text-lg text-owner-accent">
            {tempPassword}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (tempPassword) navigator.clipboard.writeText(tempPassword)
            }}
          >
            Copy to clipboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon?: PhosphorIcon
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-owner-muted mb-1 flex items-center gap-1">
        {Icon && <Icon weight="duotone" size={12} />} {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
