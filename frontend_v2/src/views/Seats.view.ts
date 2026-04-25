import { bookingApi } from "../api/booking";
import type { Seat, Zone } from "../api/types";
import { openPaymentModal } from "../components/paymentModal";
import { events } from "../state/events";
import { router } from "../router-instance";
import { clear, el, mount } from "../utils/dom";
import { formatBaht } from "../utils/format";

export function renderSeatsView(params: { concertId: number; zoneId: number }): HTMLElement {
  const { concertId, zoneId } = params;

  const state = {
    seats: [] as Seat[],
    zone: null as Zone | null,
    selected: new Set<number>(),
    submitting: false,
  };

  const headerHost = el("div", { attrs: { style: "margin-bottom: 32px;" } });
  const seatsHost = el("div", { attrs: { style: "background: var(--color-white); padding: 32px; border: 1px solid var(--color-border); border-radius: var(--radius-container);" } });
  const summaryHost = el("div", { class: "card", attrs: { style: "padding: 24px;" } });

  const renderHeader = (): void => {
    clear(headerHost);
    mount(
      headerHost,
      el("div", { class: "selection-header", attrs: { style: "align-items: flex-end;" } }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "SELECT SEATS" }),
          el("h1", {
            class: "coastal-title",
            attrs: { style: "margin: 8px 0 8px 0;" },
            text: state.zone?.zone_name ?? `Zone #${zoneId}`,
          }),
          state.zone
            ? el("div", { attrs: { style: "color: var(--color-text-muted); font-size: 14px;" }, text: `Price per seat: ${formatBaht(state.zone.price)}` })
            : el("span", {}),
        ]),
        el("button", {
          class: "btn btn--ghost btn--sm",
          on: { click: () => router.navigate(`/zones?concertId=${concertId}`) },
          text: "← BACK TO ZONES",
        }),
      ]),
    );
  };

  const renderSeats = (): void => {
    if (state.seats.length === 0) {
      mount(
        seatsHost,
        el("div", { class: "empty-cart", text: "NO SEATS FOUND FOR THIS ZONE." }),
      );
      return;
    }

    const rows = new Map<string, Seat[]>();
    for (const seat of state.seats) {
      const key = seat.seat_row ?? "";
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push(seat);
    }
    const sortedRowKeys = Array.from(rows.keys()).sort();

    const stageBanner = el(
      "div",
      { attrs: { style: "text-align: center; padding: 12px 0; margin-bottom: 32px; background: var(--color-cream); border-radius: var(--radius-container);" } },
      [
        el("span", {
          class: "label-mono",
          attrs: { style: "color: var(--color-text-muted);" },
          text: "STAGE / SCREEN",
        }),
      ],
    );

    const rowEls = sortedRowKeys.map((row) => {
      const rowSeats = rows
        .get(row)!
        .slice()
        .sort((a, b) => String(a.seat_number).localeCompare(String(b.seat_number), undefined, { numeric: true }));

      const seatButtons = rowSeats.map((seat) => {
        const isSelected = state.selected.has(seat.seat_id);
        const isAvailable = seat.status === "available";
        const bg = !isAvailable
          ? "var(--color-border)"
          : isSelected
            ? "var(--color-primary-blue)"
            : "var(--color-white)";
        const color = isSelected ? "var(--color-white)" : "var(--color-midnight)";
        const cursor = isAvailable ? "pointer" : "not-allowed";

        return el(
          "button",
          {
            attrs: {
              style: `min-width: 42px; height: 36px; padding: 0 6px; border: 1px solid var(--color-border); border-radius: 6px; background: ${bg}; color: ${color}; cursor: ${cursor}; font-size: 11px; font-weight: 500;`,
              title: `${seat.seat_row ?? ""}${seat.seat_number} — ${seat.status}`,
              disabled: !isAvailable,
            },
            on: {
              click: () => {
                if (!isAvailable) return;
                if (state.selected.has(seat.seat_id)) {
                  state.selected.delete(seat.seat_id);
                } else {
                  state.selected.add(seat.seat_id);
                }
                renderSeats();
                renderSummary();
              },
            },
          },
          [String(seat.seat_number)],
        );
      });

      return el(
        "div",
        { attrs: { style: "display: flex; align-items: center; gap: 12px; margin-bottom: 10px;" } },
        [
          el("span", {
            class: "label-mono",
            attrs: { style: "width: 24px; text-align: center; color: var(--color-text-muted);" },
            text: row || "—",
          }),
          el(
            "div",
            { attrs: { style: "display: flex; gap: 6px; flex-wrap: wrap;" } },
            seatButtons,
          ),
          el("span", {
            class: "label-mono",
            attrs: { style: "width: 24px; text-align: center; color: var(--color-text-muted);" },
            text: row || "—",
          }),
        ],
      );
    });

    const legend = el(
      "div",
      { attrs: { style: "display: flex; gap: 16px; margin-top: 24px; font-size: 12px; color: var(--color-text-muted); justify-content: center;" } },
      [
        legendDot("var(--color-white)", "Available"),
        legendDot("var(--color-primary-blue)", "Selected"),
        legendDot("var(--color-border)", "Locked / Sold"),
      ],
    );

    mount(seatsHost, stageBanner, ...rowEls, legend);
  };

  const renderSummary = (): void => {
    clear(summaryHost);
    const price = state.zone?.price ?? 0;
    const count = state.selected.size;
    const subtotal = price * count;

    const selectedList = state.seats.filter((s) => state.selected.has(s.seat_id));

    mount(
      summaryHost,
      el("span", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue);" }, text: "ORDER SUMMARY" }),
      el("h3", { attrs: { style: "margin: 8px 0 20px 0;" }, text: state.zone?.zone_name ?? "" }),
      count === 0
        ? el("p", { attrs: { style: "color: var(--color-text-muted); font-size: 14px;" }, text: "No seats selected yet." })
        : el(
            "ul",
            { attrs: { style: "list-style: none; padding: 0; margin: 0 0 16px 0; display: flex; flex-direction: column; gap: 8px;" } },
            selectedList.map((s) =>
              el("li", { attrs: { style: "display: flex; justify-content: space-between; font-size: 14px;" } }, [
                el("span", { text: `Seat ${s.seat_row}${s.seat_number}` }),
                el("span", { text: formatBaht(price) }),
              ]),
            ),
          ),
      el("div", { attrs: { style: "display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--color-border); font-weight: 500; margin-bottom: 16px;" } }, [
        el("span", { text: `Total (${count})` }),
        el("span", { text: formatBaht(subtotal) }),
      ]),
      el(
        "button",
        {
          class: "btn btn--primary",
          attrs: {
            style: "width: 100%;",
            disabled: count === 0 || state.submitting,
          },
          on: { click: () => void submit() },
        },
        [state.submitting ? "BOOKING…" : "PROCEED TO PAYMENT →"],
      ),
    );
  };

  const submit = async (): Promise<void> => {
    if (state.selected.size === 0 || state.submitting) return;
    state.submitting = true;
    renderSummary();
    try {
      const resp = await bookingApi.book({
        concert_id: concertId,
        seat_ids: Array.from(state.selected),
      });
      events.emit("log", { level: "info", message: `Booked #${resp.booking_id} (${resp.seat_count} seats)` });
      await openPaymentModal({
        bookingId: resp.booking_id,
        amount: resp.total_amount,
        onPaid: () => router.navigate("/my-tickets"),
        onClose: () => router.navigate("/dashboard"),
        onExpired: () => router.navigate("/dashboard"),
      });
      state.submitting = false;
      renderSummary();
    } catch (err) {
      events.emit("log", { level: "error", message: `[book] ${String(err)}` });
      state.submitting = false;
      renderSummary();
    }
  };

  const load = async (): Promise<void> => {
    if (!Number.isFinite(concertId) || !Number.isFinite(zoneId)) {
      events.emit("log", { level: "error", message: `[seats] invalid params concertId=${concertId} zoneId=${zoneId}` });
      router.navigate("/dashboard");
      return;
    }

    renderHeader();
    clear(seatsHost);
    mount(seatsHost, el("div", { class: "empty-cart", text: "LOADING SEATS…" }));
    renderSummary();

    try {
      const [seats, zones] = await Promise.all([
        bookingApi.listSeats(concertId, zoneId),
        bookingApi.listZones(concertId).catch(() => [] as Zone[]),
      ]);
      state.seats = Array.isArray(seats) ? seats : [];
      state.zone = zones.find((z) => z.zone_id === zoneId) ?? null;
      renderHeader();
      renderSeats();
      renderSummary();
    } catch (err) {
      events.emit("log", { level: "error", message: `[seats] ${String(err)}` });
      clear(seatsHost);
      mount(
        seatsHost,
        el("div", { class: "empty-cart" }, [
          el("div", { text: "COULD NOT LOAD SEATS." }),
          el("button", {
            class: "btn btn--ghost btn--sm",
            attrs: { style: "margin-top: 12px;" },
            on: { click: () => void load() },
            text: "RETRY",
          }),
        ]),
      );
    }
  };

  void load();

  return el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 1200px; margin: 0 auto; position: relative; z-index: 1;" } }, [
      headerHost,
      el("div", { attrs: { style: "display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: start;" } }, [
        seatsHost,
        el("div", { attrs: { style: "position: sticky; top: 96px;" } }, [summaryHost]),
      ]),
    ]),
  ]);
}

function legendDot(color: string, label: string): HTMLElement {
  return el("span", { attrs: { style: "display: inline-flex; align-items: center; gap: 6px;" } }, [
    el("span", { attrs: { style: `width: 12px; height: 12px; border: 1px solid var(--color-border); border-radius: 3px; background: ${color};` } }),
    el("span", { text: label }),
  ]);
}
