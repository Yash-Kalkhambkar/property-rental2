import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { useCreateProperty, useUpdateProperty } from '@/hooks/owner/useProperties'
import { propertiesApi } from '@/api/owner/properties.api'
import type { Property } from '@/types/owner'
import { cn } from '@/lib/utils'

// ── Schemas ───────────────────────────────────────────────────────────────────

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address_line: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  property_type: z.enum(['RESIDENTIAL', 'COMMERCIAL']),
  total_units: z.number().min(1, 'At least 1 unit').max(100, 'Max 100 units'),
})

const unitSchema = z.object({
  unit_number: z.string().min(1, 'Unit number is required'),
  unit_type: z.enum(['1BHK', '2BHK', '3BHK', 'STUDIO', 'SHOP', 'OFFICE']),
  floor: z.number().optional(),
  area_sqft: z.number().min(1, 'Enter area').optional(),
  monthly_rent: z.number().min(1, 'Enter rent'),
  deposit_amount: z.number().min(0, 'Enter deposit'),
})

type PropertyFormValues = z.infer<typeof propertySchema>
type UnitFormValues = z.infer<typeof unitSchema>

const UNIT_TYPES = ['1BHK', '2BHK', '3BHK', 'STUDIO', 'SHOP', 'OFFICE'] as const

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 20 : 6, opacity: i <= current ? 1 : 0.3 }}
          transition={{ duration: 0.25 }}
          className={cn('h-1.5 rounded-full', i <= current ? 'bg-owner-accent' : 'bg-owner-border')}
        />
      ))}
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, error, children, className }: {
  label: string; error?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function PropertyFormDialog({
  open,
  onOpenChange,
  property,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  property?: Property
}) {
  const isEdit = !!property

  // For edit mode we stay on step 0 (just property form)
  const [step, setStep] = useState(0)           // 0 = property, 1..N = unit forms
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null)
  const [totalUnits, setTotalUnits] = useState(1)
  const [unitsSubmitted, setUnitsSubmitted] = useState(0)
  const [submittingUnit, setSubmittingUnit] = useState(false)

  const create = useCreateProperty()
  const update = useUpdateProperty(property?.id ?? '')

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(0)
        setCreatedPropertyId(null)
        setTotalUnits(1)
        setUnitsSubmitted(0)
        propertyForm.reset()
        unitForm.reset()
      }, 200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Property form ──────────────────────────────────────────────────────────
  const propertyForm = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    values: property
      ? {
          name: property.name,
          address_line: property.address_line,
          city: property.city,
          state: property.state,
          pincode: property.pincode,
          property_type: property.property_type,
          total_units: property.total_units,
        }
      : undefined,
    defaultValues: { property_type: 'RESIDENTIAL', total_units: 1 },
  })

  const onPropertySubmit = (values: PropertyFormValues) => {
    if (isEdit) {
      update.mutate(values, { onSuccess: () => onOpenChange(false) })
      return
    }
    create.mutate(values, {
      onSuccess: (res) => {
        const newId = res.data.id
        setCreatedPropertyId(newId)
        setTotalUnits(values.total_units)
        setStep(1)
        unitForm.reset(defaultUnitValues(1))
      },
    })
  }

  // ── Unit form ──────────────────────────────────────────────────────────────
  const currentUnitIndex = step - 1  // 0-based unit index

  function defaultUnitValues(unitNum: number): UnitFormValues {
    return {
      unit_number: String(unitNum),
      unit_type: '2BHK',
      monthly_rent: 0,
      deposit_amount: 0,
    }
  }

  const unitForm = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaultUnitValues(1),
  })

  const onUnitSubmit = async (values: UnitFormValues) => {
    if (!createdPropertyId) return
    setSubmittingUnit(true)
    try {
      await propertiesApi.createUnit(createdPropertyId, {
        ...values,
        floor: values.floor || undefined,
        area_sqft: values.area_sqft || undefined,
      })
      const newCount = unitsSubmitted + 1
      setUnitsSubmitted(newCount)

      if (newCount >= totalUnits) {
        // All units done — invalidate and close
        onOpenChange(false)
      } else {
        // Move to next unit
        setStep(step + 1)
        unitForm.reset(defaultUnitValues(newCount + 1))
      }
    } catch {
      // error handled by propertiesApi (axios interceptor / toast)
    } finally {
      setSubmittingUnit(false)
    }
  }

  const skipUnit = () => {
    const newCount = unitsSubmitted + 1
    setUnitsSubmitted(newCount)
    if (newCount >= totalUnits) {
      onOpenChange(false)
    } else {
      setStep(step + 1)
      unitForm.reset(defaultUnitValues(newCount + 1))
    }
  }

  // Total steps = 1 (property) + totalUnits
  const totalSteps = step >= 1 ? 1 + totalUnits : 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>
              {isEdit
                ? 'Edit property'
                : step === 0
                  ? 'Add property'
                  : `Unit ${currentUnitIndex + 1} of ${totalUnits} — details`}
            </DialogTitle>
            {!isEdit && step >= 1 && (
              <StepDots total={totalSteps} current={step} />
            )}
          </div>
          {step >= 1 && (
            <p className="text-sm text-owner-muted mt-1">
              Fill in details for unit {currentUnitIndex + 1}. You can skip if you want to add them later from the property page.
            </p>
          )}
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.form
              key="property-form"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={propertyForm.handleSubmit(onPropertySubmit)}
              className="space-y-4 mt-2"
            >
              <Field label="Property name" error={propertyForm.formState.errors.name?.message}>
                <Input {...propertyForm.register('name')} placeholder="e.g. Sunrise Apartments" />
              </Field>
              <Field label="Address" error={propertyForm.formState.errors.address_line?.message}>
                <Input {...propertyForm.register('address_line')} placeholder="Street address" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" error={propertyForm.formState.errors.city?.message}>
                  <Input {...propertyForm.register('city')} />
                </Field>
                <Field label="State" error={propertyForm.formState.errors.state?.message}>
                  <Input {...propertyForm.register('state')} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pincode" error={propertyForm.formState.errors.pincode?.message}>
                  <Input {...propertyForm.register('pincode')} />
                </Field>
                <Field label="Total units" error={propertyForm.formState.errors.total_units?.message}>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    {...propertyForm.register('total_units', { valueAsNumber: true })}
                  />
                </Field>
              </div>
              <Field label="Property type" error={propertyForm.formState.errors.property_type?.message}>
                <select
                  {...propertyForm.register('property_type')}
                  className="flex h-11 w-full rounded-xl px-4 text-sm bg-owner-bg/60 border border-owner-border text-owner-text focus:outline-none focus:ring-2 focus:ring-owner-accent/50"
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </Field>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {isEdit ? 'Save changes' : 'Next — add units'}
                </Button>
              </DialogFooter>
            </motion.form>
          ) : (
            <motion.form
              key={`unit-form-${step}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={unitForm.handleSubmit(onUnitSubmit)}
              className="space-y-4 mt-2"
            >
              {/* Progress bar */}
              <div className="h-1 w-full rounded-full bg-owner-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-owner-accent to-owner-accent/70"
                  initial={{ width: `${((currentUnitIndex) / totalUnits) * 100}%` }}
                  animate={{ width: `${((currentUnitIndex + 1) / totalUnits) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Unit number" error={unitForm.formState.errors.unit_number?.message}>
                  <Input
                    {...unitForm.register('unit_number')}
                    placeholder={`e.g. ${currentUnitIndex + 1}A`}
                  />
                </Field>
                <Field label="Type / BHK" error={unitForm.formState.errors.unit_type?.message}>
                  <select
                    {...unitForm.register('unit_type')}
                    className="flex h-11 w-full rounded-xl px-4 text-sm bg-owner-bg/60 border border-owner-border text-owner-text focus:outline-none focus:ring-2 focus:ring-owner-accent/50"
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Floor" error={unitForm.formState.errors.floor?.message}>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    {...unitForm.register('floor', { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Area (sq ft)" error={unitForm.formState.errors.area_sqft?.message}>
                  <Input
                    type="number"
                    placeholder="e.g. 850"
                    {...unitForm.register('area_sqft', { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Monthly rent (₹)" error={unitForm.formState.errors.monthly_rent?.message}>
                  <Input
                    type="number"
                    placeholder="e.g. 18000"
                    {...unitForm.register('monthly_rent', { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Deposit (₹)" error={unitForm.formState.errors.deposit_amount?.message}>
                  <Input
                    type="number"
                    placeholder="e.g. 36000"
                    {...unitForm.register('deposit_amount', { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={skipUnit}
                  disabled={submittingUnit}
                  className="text-owner-muted hover:text-owner-text"
                >
                  Skip
                </Button>
                <Button type="submit" disabled={submittingUnit}>
                  {submittingUnit
                    ? 'Saving…'
                    : currentUnitIndex + 1 < totalUnits
                      ? `Save & next unit`
                      : 'Save & finish'}
                </Button>
              </DialogFooter>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
