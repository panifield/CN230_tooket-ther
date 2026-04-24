import type { Seat } from "../api/types";
import { el } from "../utils/dom";

export interface SeatGridOptions {
  seats: readonly Seat[];
  selected: ReadonlySet<number>;
  onToggle: (seatId: number) => void;
}

export function renderSeatGrid(options: SeatGridOptions): HTMLElement {
  const { seats, selected, onToggle } = options;

  // จัดกลุ่มที่นั่งตามแถว (Row)
  const byRow = new Map<string, Seat[]>();
  for (const seat of seats) {
    const list = byRow.get(seat.seat_row) ?? [];
    list.push(seat);
    byRow.set(seat.seat_row, list);
  }
  const sortedRows = [...byRow.keys()].sort();

  const rows = sortedRows.map((rowKey) => {
    // 💡 ตัดให้เหลือแค่ 5 ที่นั่งต่อแถว (ด้วยคำสั่ง .slice(0, 5))
    const rowSeats = (byRow.get(rowKey) ?? [])
      .slice()
      .sort((a, b) => a.seat_number - b.seat_number)
      .slice(0, 5); 

    return el("div", { class: "coastal-seat-row" }, [
      el("span", { class: "coastal-row-label", text: rowKey }),
      
      // Render ที่นั่งทั้ง 5 ตัว
      ...rowSeats.map((seat) => {
        const isSelected = selected.has(seat.seat_id);
        const isAvailable = seat.status === "available";

        // ประมวลผลคลาส CSS
        let seatClasses = "coastal-seat";
        if (isSelected) seatClasses += " is-selected";
        if (!isAvailable) seatClasses += " is-sold";

        return el(
          "button",
          {
            class: seatClasses,
            attrs: {
              type: "button",
              "data-status": seat.status,
              "aria-label": `Seat ${seat.seat_row}${seat.seat_number} — ${seat.status}`,
              "aria-pressed": isSelected ? "true" : "false",
              ...(!isAvailable ? { disabled: "true" } : {}),
            },
            on: {
              click: () => {
                if (isAvailable) onToggle(seat.seat_id);
              },
            },
          },
          [String(seat.seat_number)]
        );
      }),
      
      el("span", { class: "coastal-row-label", text: rowKey }) // ปิดท้ายแถวด้วยตัวอักษรอีกรอบให้สมดุล
    ]);
  });

  // Legend
  const legend = el("div", { class: "coastal-seat-legend" }, [
    el("span", { class: "legend-item" }, [
      el("span", { class: "legend-chip is-available" }),
      "Available",
    ]),
    el("span", { class: "legend-item" }, [
      el("span", { class: "legend-chip is-selected" }),
      "Selected",
    ]),
    el("span", { class: "legend-item" }, [
      el("span", { class: "legend-chip is-sold" }),
      "Sold",
    ]),
  ]);

  const gridContainer = el("div", { class: "coastal-grid-map" }, [...rows]);

  // ห่อหุ้มทุกอย่างด้วยการ์ดสวยๆ
  return el("div", { class: "coastal-seat-container" }, [
    gridContainer,
    legend
  ]);
}