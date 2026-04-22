import type { Seat } from "../api/types";
import { el } from "../utils/dom";

export interface SeatGridOptions {
  seats: readonly Seat[];
  selected: ReadonlySet<number>;
  onToggle: (seatId: number) => void;
}

export function renderSeatGrid(options: SeatGridOptions): HTMLElement {
  const { seats, selected, onToggle } = options;

  const byRow = new Map<string, Seat[]>();
  for (const seat of seats) {
    const list = byRow.get(seat.seat_row) ?? [];
    list.push(seat);
    byRow.set(seat.seat_row, list);
  }
  const sortedRows = [...byRow.keys()].sort();

  const rows = sortedRows.map((rowKey) => {
    const rowSeats = (byRow.get(rowKey) ?? []).slice().sort(
      (a, b) => a.seat_number - b.seat_number
    );
    return el("div", { class: "seat-row" }, [
      el("span", { class: "seat-row__label", text: rowKey }),
      ...rowSeats.map((seat) =>
        el(
          "button",
          {
            class: "seat",
            attrs: {
              type: "button",
              "data-status": seat.status,
              "aria-label": `Seat ${seat.seat_row}${seat.seat_number} — ${seat.status}`,
              "aria-pressed": selected.has(seat.seat_id) ? "true" : "false",
              ...(seat.status !== "available" ? { disabled: "true" } : {}),
            },
            on: {
              click: () => {
                if (seat.status === "available") onToggle(seat.seat_id);
              },
            },
          },
          [String(seat.seat_number)]
        )
      ),
    ]);
  });

  const legend = el("div", { class: "seat-legend" }, [
    el("span", {}, [
      el("span", {
        class: "seat-legend__chip",
        attrs: { style: "background:#fff" },
      }),
      "Available",
    ]),
    el("span", {}, [
      el("span", {
        class: "seat-legend__chip",
        attrs: { style: "background:#010120; border-color:#010120" },
      }),
      "Selected",
    ]),
    el("span", {}, [
      el("span", {
        class: "seat-legend__chip",
        attrs: { style: "background:rgba(1,1,32,0.18)" },
      }),
      "Locked / Sold",
    ]),
  ]);

  return el("div", { class: "seat-grid" }, [...rows, legend]);
}
