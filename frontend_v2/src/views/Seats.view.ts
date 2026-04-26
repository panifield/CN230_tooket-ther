import { bookingApi } from "../api/booking";
import { router } from "../router";
import { el, mount, clear } from "../utils/dom";
import { formatBaht } from "../utils/format";
import { events } from "../state/events";

export function renderSeatsView(params: {
  concertId: number;
  zoneId: number;
  rebookBookingId?: number;
}): HTMLElement {
  const state = {
    seats: [] as any[],
    selectedSeats: new Set<number>(),
    zoneInfo: null as any,
    isLoading: true,
    requiredSeatCount: null as number | null,
  };

  const gridHost = el("div", { attrs: { style: "width: 100%; position: relative;" } });
  const summaryHost = el("div", { class: "order-summary-card" });

  const container = el("div", { class: "coastal-page" }, [
    el("div", { class: "booking-layout" }, [
      
      // ── Left: Seat Map ──
      el("section", { attrs: { style: "min-width: 0;" } }, [
        el("div", { class: "selection-header", attrs: { style: "align-items: flex-end; margin-bottom: 40px;" } }, [
          el("div", {}, [
            el("button", { 
              class: "btn btn--ghost btn--sm", 
              attrs: { style: "margin-bottom: 16px;" },
              on: { click: () => router.navigate(`/zones?concertId=${params.concertId}`) },
              text: "← BACK TO ZONES" 
            }),
            el("span", { class: "label-mono", attrs: { id: "zone-name-display" }, text: "STEP 03 / SEAT SELECTION" }),
            el("h1", { class: "concert-title", attrs: { style: "margin-top: 8px;" }, text: "Choose your spot" }),
          ]),
          el("div", { attrs: { style: "text-align: right;" } }, [
             el("div", { class: "label-mono", attrs: { style: "margin-bottom: 4px;" }, text: "PRICE PER SEAT" }),
             el("div", { id: "zone-price-display", attrs: { style: "font-size: 28px; font-weight: 500; color: var(--color-midnight);" }, text: "..." })
          ])
        ]),

        el("div", { class: "coastal-seat-container", attrs: { style: "width: 100%; padding: 32px 0; overflow: hidden;" } }, [
          // เวที (Stage)
          el("div", { attrs: { style: "width: calc(100% - 64px); max-width: 800px; height: 16px; background: rgba(1,1,32,0.05); border-radius: 8px; margin: 0 auto 64px auto; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center;" } }, [
              el("div", { attrs: { style: "position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--color-sky-tint), transparent); opacity: 0.5; filter: blur(4px);" } }),
              el("span", { class: "label-mono", attrs: { style: "font-size: 9px; position: relative; z-index: 1;" }, text: "STAGE / SCREEN" })
          ]), 
          gridHost,
          renderLegend()
        ])
      ]),

      // ── Right: Summary Sidebar ──
      el("aside", { class: "summary-column" }, [summaryHost])
    ])
  ]);

  const updateUI = () => {
    renderGrid();
    renderSummary();
    
    const priceDisplay = container.querySelector("#zone-price-display");
    const nameDisplay = container.querySelector("#zone-name-display");
    if (state.zoneInfo) {
      if (priceDisplay) priceDisplay.textContent = formatBaht(state.zoneInfo.price);
      if (nameDisplay) nameDisplay.textContent = `ZONE: ${state.zoneInfo.zone_name}`;
    }
  };

  const renderGrid = () => {
    clear(gridHost);

    if (state.requiredSeatCount !== null) {
      mount(gridHost, el("div", {
        class: "banner banner--warn",
        attrs: { style: "padding: 12px 16px; margin-bottom: 16px;" },
        text: `UPGRADE MODE: Please select exactly ${state.requiredSeatCount} seats.`,
      }));
    }

    if (state.isLoading) {
      mount(gridHost, el("div", { class: "empty-cart" }, [
        el("p", { class: "label-mono", text: "SYNCING SEAT MAP..." })
      ]));
      return;
    }

    if (!state.zoneInfo || state.seats.length === 0) {
      mount(gridHost, el("div", { class: "empty-cart" }, [
        el("p", { class: "label-mono", text: "NO SEATS FOUND IN THIS ZONE." })
      ]));
      return;
    }

    const rowLabels = Array.from(new Set(state.seats.map(s => s.seat_row || s.row || "A"))).sort();

    const scrollWrapper = el("div", { attrs: { style: "width: 100%; overflow-x: auto; padding-bottom: 24px;" } });
    const mapContainer = el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 12px; min-width: max-content; margin: 0 auto; padding: 0 32px;" } });

    // 💡 ดึงค่า Cols (จำนวนที่นั่งสูงสุดต่อแถว) จาก Database มาใช้เป็นตัวจำกัด Grid
    const maxCols = state.zoneInfo.cols || 10; 

    rowLabels.forEach(rowLabel => {
      const rowSeats = state.seats.filter(s => (s.seat_row || s.row || "A") === rowLabel);
      
      rowSeats.sort((a, b) => {
        const numA = parseInt(String(a.seat_label || a.seat_number || a.column || "").match(/\d+/)?.[0] || "0", 10);
        const numB = parseInt(String(b.seat_label || b.seat_number || b.column || "").match(/\d+/)?.[0] || "0", 10);
        return numA - numB;
      });

      const rowEl = el("div", { attrs: { style: "display: flex; align-items: flex-start; gap: 12px; flex-wrap: nowrap;" } }, [
        el("span", { class: "label-mono", attrs: { style: "width: 32px; text-align: right; color: var(--color-midnight); opacity: 0.4; font-weight: bold; flex-shrink: 0; line-height: 44px;" }, text: String(rowLabel) })
      ]);

      // 🛠️ FIX: ใช้ CSS Grid ช่วยบังคับจำนวนที่นั่งต่อแถวให้ไม่เกิน cols จาก Database
      const seatsGrid = el("div", { 
        attrs: { style: `display: grid; grid-template-columns: repeat(${maxCols}, 44px); gap: 12px; justify-content: start;` } 
      });

      rowSeats.forEach(seat => {
        const isSold = seat.status ? seat.status !== 'available' : !seat.is_available;
        const isSelected = state.selectedSeats.has(seat.seat_id);
        
        const rawSeatNum = String(seat.seat_label || seat.seat_number || seat.column || "");
        const displayNum = rawSeatNum.replace(/^[A-Za-z_-]+/, '').trim() || rawSeatNum;

        let style = "width: 44px; height: 44px; min-width: 44px; min-height: 44px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--color-white); border: 1px solid var(--color-border); color: var(--color-midnight); border-radius: 4px; font-family: var(--font-mono); font-size: 13px; font-weight: 500; cursor: pointer; padding: 0; box-sizing: border-box; transition: all 0.2s ease;"; 
        
        if (isSold) {
          style = "width: 44px; height: 44px; min-width: 44px; min-height: 44px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--color-midnight); border: 1px solid var(--color-midnight); color: var(--color-white); border-radius: 4px; font-family: var(--font-mono); font-size: 13px; font-weight: 500; cursor: not-allowed; opacity: 0.6; padding: 0; box-sizing: border-box; position: relative;";
        } else if (isSelected) {
          style = "width: 44px; height: 44px; min-width: 44px; min-height: 44px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--color-primary-blue); border: 1px solid var(--color-primary-blue); color: var(--color-midnight); box-shadow: 0 4px 12px rgba(170, 214, 250, 0.4); transform: scale(1.1); font-weight: bold; border-radius: 4px; font-family: var(--font-mono); font-size: 13px; cursor: pointer; padding: 0; box-sizing: border-box; z-index: 10; transition: all 0.2s ease;";
        }

        const seatBtn = el("button", {
          attrs: { style, ...(isSold ? { disabled: "true", title: "Occupied" } : { title: `Row ${rowLabel} Seat ${displayNum}` }) },
          text: isSold ? "" : displayNum,
          on: {
            click: () => {
              if (isSold) return;
              if (state.selectedSeats.has(seat.seat_id)) {
                state.selectedSeats.delete(seat.seat_id);
              } else {
                if (
                  state.requiredSeatCount !== null &&
                  state.selectedSeats.size >= state.requiredSeatCount
                ) {
                  events.emit("log", {
                    level: "warn",
                    message: `Upgrade requires exactly ${state.requiredSeatCount} seats — deselect one to swap.`,
                  });
                  return;
                }
                state.selectedSeats.add(seat.seat_id);
              }
              updateUI();
            },
            mouseenter: (e) => {
               if (!isSold && !isSelected) {
                  (e.target as HTMLElement).style.borderColor = "var(--color-primary-blue)";
                  (e.target as HTMLElement).style.boxShadow = "0 0 0 3px var(--color-sky-tint)";
                  (e.target as HTMLElement).style.transform = "translateY(-2px)";
               }
            },
            mouseleave: (e) => {
               if (!isSold && !isSelected) {
                  (e.target as HTMLElement).style.borderColor = "var(--color-border)";
                  (e.target as HTMLElement).style.boxShadow = "none";
                  (e.target as HTMLElement).style.transform = "none";
               }
            }
          }
        });

        if (isSold) {
          seatBtn.append(el("div", { attrs: { style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 50%;" } }));
        }

        seatsGrid.append(seatBtn);
      });

      rowEl.append(seatsGrid);
      rowEl.append(el("span", { class: "label-mono", attrs: { style: "width: 32px; text-align: left; color: var(--color-midnight); opacity: 0.4; font-weight: bold; flex-shrink: 0; line-height: 44px;" }, text: String(rowLabel) }));
      
      mapContainer.append(rowEl);
    });

    scrollWrapper.append(mapContainer);
    gridHost.append(scrollWrapper);
  };

  const renderSummary = () => {
    clear(summaryHost);
    const count = state.selectedSeats.size;
    const price = state.zoneInfo?.price || 0;
    const total = count * price;

    const selectedSeatObjects = state.seats.filter(s => state.selectedSeats.has(s.seat_id));

    mount(summaryHost, 
      el("span", { class: "summary-label", text: "SELECTION SUMMARY" }),
      
      el("div", { class: "summary-items" }, [
        count > 0 
          ? el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 16px;" } }, 
              selectedSeatObjects.map(s => {
                const rawSeatNum = String(s.seat_label || s.seat_number || s.column || "");
                const displayNum = rawSeatNum.replace(/^[A-Za-z_-]+/, '').trim() || rawSeatNum;
                
                return el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;" } }, [
                  el("div", {}, [
                    el("div", { attrs: { style: "font-weight: 500; font-size: 15px; color: var(--color-midnight);" }, text: `Seat ${s.seat_row || s.row}${displayNum}` }),
                    el("div", { class: "label-mono", attrs: { style: "font-size: 10px; margin-top: 4px;" }, text: state.zoneInfo?.zone_name || "Zone" })
                  ]),
                  el("div", { attrs: { style: "font-weight: 500; color: var(--color-midnight);" }, text: formatBaht(price) })
                ]);
              })
            )
          : el("div", { class: "empty-cart", attrs: { style: "padding: 40px 0; border: 2px dashed var(--color-border); border-radius: 8px; margin-bottom: 16px;" } }, [
              el("p", { class: "label-mono", text: "No seats selected" })
            ])
      ]),

      el("div", { class: "summary-divider" }),
      ...(state.requiredSeatCount !== null
        ? [el("div", { class: "summary-row" }, [
            el("span", { class: "label-mono", text: "Selected" }),
            el("span", { attrs: { style: "font-weight: 500;" }, text: `${count} / ${state.requiredSeatCount}` }),
          ])]
        : []),
      el("div", { class: "summary-row total" }, [
        el("span", { text: "Total" }),
        el("span", { class: "summary-total-price", text: formatBaht(total) })
      ]),
      el("button", {
        class: "btn btn--primary btn--block",
        attrs: {
          style: "margin-top: 24px; padding: 16px;",
          ...(proceedDisabled() ? { disabled: "true" } : {}),
        },
        text: "CONFIRM SEATS →",
        on: { click: handleBooking }
      })
    );
  };

  const proceedDisabled = (): boolean => {
    const count = state.selectedSeats.size;
    if (state.requiredSeatCount !== null) return count !== state.requiredSeatCount;
    return count === 0;
  };

  const handleBooking = async () => {
    const seatIds = Array.from(state.selectedSeats);
    try {
      if (params.rebookBookingId) {
        const r = await bookingApi.rebook(params.rebookBookingId, seatIds);
        events.emit("log", {
          level: "info",
          message: `Upgrade reserved. Pay difference of ${formatBaht(Number(r.difference_amount))} to confirm.`,
        });
        router.navigate(`/payment?bookingId=${r.booking_id}`);
      } else {
        const r = await bookingApi.book({
          concert_id: params.concertId,
          seat_ids: seatIds,
        });
        events.emit("log", { level: "info", message: "Seats secured. Redirecting to checkout..." });
        router.navigate(`/payment?bookingId=${r.booking_id}`);
      }
    } catch (err) {
      events.emit("log", { level: "error", message: String(err) });
    }
  };

  const loadData = async () => {
    state.isLoading = true;
    updateUI();
    try {
      const [zones, seats, rebookBookings] = await Promise.all([
        bookingApi.listZones(params.concertId),
        bookingApi.listSeats(params.concertId, params.zoneId),
        params.rebookBookingId ? bookingApi.myBookings() : Promise.resolve(null),
      ]);
      state.zoneInfo = zones.find(z => z.zone_id === params.zoneId);
      state.seats = seats || [];
      if (params.rebookBookingId && rebookBookings) {
        const b = rebookBookings.find(x => x.booking_id === params.rebookBookingId);
        if (b && b.total_tickets) state.requiredSeatCount = b.total_tickets;
        else events.emit("log", { level: "warn", message: "Could not resolve original ticket count for upgrade." });
      }
      state.isLoading = false;
      updateUI();
    } catch (err) {
      state.isLoading = false;
      events.emit("log", { level: "error", message: "Failed to connect to seat map server." });
      updateUI();
    }
  };

  loadData();
  return container;
}

function renderLegend() {
  return el("div", { class: "coastal-seat-legend", attrs: { style: "margin-top: 40px; display: flex; justify-content: center; gap: 32px;" } }, [
    legendItem("background: var(--color-white); border: 1px solid var(--color-border);", "Available"),
    legendItem("background: var(--color-primary-blue); border: 1px solid var(--color-primary-blue);", "Selected"),
    legendItem("background: var(--color-midnight); border: 1px solid var(--color-midnight);", "Occupied")
  ]);
}

function legendItem(style: string, label: string) {
  return el("div", { class: "legend-item", attrs: { style: "display: flex; align-items: center; gap: 8px;" } }, [
    el("div", { class: "legend-chip", attrs: { style: style + " width: 16px; height: 16px; border-radius: 4px;" } }),
    el("span", { class: "label-mono", attrs: { style: "color: var(--color-midnight);" }, text: label })
  ]);
}