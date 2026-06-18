import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateLeasePayload, Tenant, Unit } from "@/types/api.types";

const schema = z
  .object({
    unit_id: z.string().min(1, "Select a unit"),
    tenant_id: z.string().min(1, "Select a tenant"),
    start_date: z.string().min(1, "Start date required"),
    end_date: z.string().min(1, "End date required"),
    monthly_rent: z.coerce.number().min(0),
    deposit_paid: z.coerce.number().min(0),
    rent_due_day: z.coerce.number().int().min(1).max(28).optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "End date must be after start date",
    path: ["end_date"],
  });

type FormValues = z.input<typeof schema>;

export function LeaseForm({
  units,
  tenants,
  onSubmit,
  isSubmitting,
}: {
  units: Unit[];
  tenants: Tenant[];
  onSubmit: (values: CreateLeasePayload) => void;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rent_due_day: 5 },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => {
        const p = schema.parse(v);
        onSubmit({ ...p, notes: p.notes || undefined });
      })}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Unit</Label>
        {units.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Select a property above to see its vacant units.
          </p>
        ) : (
          <Select value={watch("unit_id")} onValueChange={(v) => {
            setValue("unit_id", v, { shouldValidate: true });
            const unit = units.find((u) => u.id === v);
            if (unit) setValue("monthly_rent", unit.monthly_rent);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a vacant unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.unit_number} · {u.unit_type} · ₹{u.monthly_rent.toLocaleString("en-IN")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.unit_id && <p className="text-xs text-destructive">{errors.unit_id.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Tenant</Label>
        {tenants.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            No tenants found. Add a tenant first.
          </p>
        ) : (
          <Select value={watch("tenant_id")} onValueChange={(v) => setValue("tenant_id", v, { shouldValidate: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name} · {t.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.tenant_id && (
          <p className="text-xs text-destructive">{errors.tenant_id.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
          {errors.start_date && (
            <p className="text-xs text-destructive">{errors.start_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
          {errors.end_date && (
            <p className="text-xs text-destructive">{errors.end_date.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monthly_rent">Monthly rent</Label>
          <Input id="monthly_rent" type="number" {...register("monthly_rent")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit_paid">Deposit</Label>
          <Input id="deposit_paid" type="number" {...register("deposit_paid")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rent_due_day">Due day</Label>
          <Input id="rent_due_day" type="number" min={1} max={28} {...register("rent_due_day")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...register("notes")} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Create lease
      </Button>
    </form>
  );
}