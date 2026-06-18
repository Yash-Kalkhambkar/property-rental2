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
import type { CreatePaymentPayload, Lease, PaymentMethod } from "@/types/api.types";

const METHODS: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"];

const schema = z.object({
  lease_id: z.string().min(1, "Select a lease"),
  amount_due: z.coerce.number().min(1, "Amount due is required"),
  amount_paid: z.coerce.number().min(0),
  due_date: z.string().min(1, "Due date required"),
  paid_date: z.string().optional(),
  payment_method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]).optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

export function PaymentForm({
  leases,
  onSubmit,
  isSubmitting,
}: {
  leases: Lease[];
  onSubmit: (values: CreatePaymentPayload) => void;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // When a lease is selected, auto-fill amount_due from monthly_rent
  const handleLeaseChange = (leaseId: string) => {
    setValue("lease_id", leaseId, { shouldValidate: true });
    const lease = leases.find((l) => l.id === leaseId);
    if (lease) {
      setValue("amount_due", lease.monthly_rent);
    }
  };

  const selectedLeaseId = watch("lease_id");

  return (
    <form
      onSubmit={handleSubmit((v) => {
        const p = schema.parse(v);
        onSubmit({
          ...p,
          paid_date: p.paid_date || undefined,
          reference_number: p.reference_number || undefined,
          notes: p.notes || undefined,
        });
      })}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Lease</Label>
        {leases.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            No active leases found. Create a lease first.
          </p>
        ) : (
          <Select value={selectedLeaseId} onValueChange={handleLeaseChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a lease" />
            </SelectTrigger>
            <SelectContent>
              {leases.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.tenant.full_name} · {l.unit.unit_number} · {l.unit.property_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.lease_id && (
          <p className="text-xs text-destructive">{errors.lease_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount_due">Amount due (₹)</Label>
          <Input id="amount_due" type="number" min={1} {...register("amount_due")} />
          {errors.amount_due && (
            <p className="text-xs text-destructive">{errors.amount_due.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount_paid">Amount paid (₹)</Label>
          <Input id="amount_paid" type="number" min={0} {...register("amount_paid")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" type="date" {...register("due_date")} />
          {errors.due_date && (
            <p className="text-xs text-destructive">{errors.due_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paid_date">Paid date</Label>
          <Input id="paid_date" type="date" {...register("paid_date")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment method</Label>
          <Select
            value={watch("payment_method") ?? ""}
            onValueChange={(v) => setValue("payment_method", v as PaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference_number">Reference no.</Label>
          <Input id="reference_number" {...register("reference_number")} placeholder="UPI / cheque no." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...register("notes")} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || leases.length === 0}>
        {isSubmitting ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}
