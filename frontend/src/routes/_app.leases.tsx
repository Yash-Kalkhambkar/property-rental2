import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { LeaseForm } from "@/components/features/leases/LeaseForm";
import { useLeases, useCreateLease } from "@/hooks/useLeases";
import { useProperties, usePropertyUnits } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import type { LeaseStatus } from "@/types/api.types";

export const Route = createFileRoute("/_app/leases")({
  head: () => ({ meta: [{ title: "Leases — RentEase" }] }),
  component: LeasesPage,
});

const STATUS_FILTERS: (LeaseStatus | "ALL")[] = ["ALL", "ACTIVE", "EXPIRED", "TERMINATED"];

function NewLeaseDialog() {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const { data: properties, isError: propertiesError } = useProperties();
  const { data: units } = usePropertyUnits(propertyId, { status: "VACANT" });
  const { data: tenants, isError: tenantsError } = useTenants();
  const create = useCreateLease();

  const propertyItems = properties?.items ?? [];
  const tenantItems = tenants?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPropertyId(""); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> New lease
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create lease</DialogTitle>
        </DialogHeader>

        {(propertiesError || tenantsError) && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not load data. Check your connection and try again.
          </p>
        )}

        <div className="space-y-2">
          <Label>Property</Label>
          {propertyItems.length === 0 && !propertiesError ? (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              No properties found. Add a property first.
            </p>
          ) : (
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {propertyItems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <LeaseForm
          units={units ?? []}
          tenants={tenantItems}
          isSubmitting={create.isPending}
          onSubmit={(v) => create.mutate(v, { onSuccess: () => { setOpen(false); setPropertyId(""); } })}
        />
      </DialogContent>
    </Dialog>
  );
}

function LeasesPage() {
  const [status, setStatus] = useState<LeaseStatus | "ALL">("ALL");
  const { data, isLoading } = useLeases(status === "ALL" ? undefined : { status });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leases"
        description="Active and past rental agreements"
        action={<NewLeaseDialog />}
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No leases yet"
          description="Create a lease to link a tenant to a vacant unit."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <Link to="/leases/$id" params={{ id: l.id }} className="hover:underline">
                        {l.tenant.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {l.unit.unit_number} · {l.unit.property_name}
                    </TableCell>
                    <TableCell>{formatCurrency(l.monthly_rent)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}