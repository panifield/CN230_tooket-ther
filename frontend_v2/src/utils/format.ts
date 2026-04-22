const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatBaht(amount: number): string {
  return baht.format(amount);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTime.format(d);
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    on_sale: "On Sale",
    upcoming: "Upcoming",
    closed: "Closed",
    cancelled: "Cancelled",
    draft: "Draft",
    pending: "Pending Payment",
    paid: "Paid",
    expired: "Expired",
    refunded: "Refunded",
    zone_closed_action_required: "Zone Closed — Action Required",
    waiting: "Waiting",
    admitted: "Admitted",
    completed: "Completed",
  };
  return map[status] ?? status;
}

export function statusPillClass(status: string): string {
  if (["paid", "on_sale", "admitted", "completed"].includes(status))
    return "pill pill--ok";
  if (["pending", "waiting", "upcoming"].includes(status))
    return "pill pill--warn";
  if (["expired", "cancelled", "closed", "refunded"].includes(status))
    return "pill pill--err";
  return "pill pill--muted";
}
