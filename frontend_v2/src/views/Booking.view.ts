import { el, mount, clear } from "../utils/dom";
import { formatBaht, formatDateTime } from "../utils/format";
import { router } from "../router";
import { bookingApi } from "../api/booking";

// กำหนด Type ให้ชัดเจน
interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'selected' | 'occupied';
  price: number;
  zone: string;
}

export function renderBookingView(concertId: number): HTMLElement {
  // --- 1. State Management ---
  const state = {
    selectedSeats: [] as Seat[],
    seats: [] as Seat[],
    queuePosition: 124,
    isLocal: true,
    concertTitle: "Coastal Tech Summit 2026",
    venue: "Main Auditorium",
    dateTime: "2026-05-12T09:00:00"
  };

  // --- 2. Static Hosts ---
  const seatsHost = el("div", { class: "seats-grid-container" });
  const summaryHost = el("div", { class: "order-summary-card" });
  const queueHost = el("div", { class: "queue-badge-wrapper" });

  // --- 3. Logic Functions ---
  const initSeats = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    state.seats = rows.flatMap((row, rowIndex) => 
      Array.from({ length: 12 }, (_, i) => {
        const zone = rowIndex < 2 ? 'VIP' : rowIndex < 5 ? 'PREMIUM' : 'STANDARD';
        const price = zone === 'VIP' ? 500 : zone === 'PREMIUM' ? 300 : 150;
        return {
          id: `${row}${i + 1}`,
          row,
          number: i + 1,
          status: Math.random() < 0.2 ? 'occupied' : 'available',
          price,
          zone,
        };
      })
    );
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'occupied') return;
    const isSelected = state.selectedSeats.find(s => s.id === seat.id);
    if (isSelected) {
      state.selectedSeats = state.selectedSeats.filter(s => s.id !== seat.id);
    } else {
      state.selectedSeats.push(seat);
    }
    renderSeats();
    renderSummary();
  };

  // --- 4. Render Functions ---
  const renderQueue = () => {
    mount(queueHost, el("div", { class: "p-4 bg-sky-tint/10 border border-sky-tint/20 rounded-sharp flex items-center gap-4" }, [
      el("div", { class: "w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-blue shadow-sm" }, [
        el("span", { class: "font-bold text-sm", text: `#${state.queuePosition}` })
      ]),
      el("div", {}, [
        el("div", { class: "mono-label text-[10px] text-brand-blue mb-0.5", text: "QUEUE STATUS" }),
        el("div", { class: "text-[10px] text-midnight/60", text: state.isLocal ? 'LOCAL PRIORITY ACTIVE' : 'STANDARD QUEUE' })
      ])
    ]));
  };

  const renderSeats = () => {
    clear(seatsHost);
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    rows.forEach(row => {
      mount(seatsHost, el("div", { class: "flex gap-3 items-center mb-2" }, [
        el("span", { class: "w-6 mono-label text-midnight/30 text-center", text: row }),
        el("div", { class: "flex gap-2" }, 
          state.seats.filter(s => s.row === row).map(seat => {
            const isSelected = state.selectedSeats.find(s => s.id === seat.id);
            return el("button", {
              class: `w-8 h-8 rounded-sharp transition-all relative ${
                seat.status === 'occupied' ? 'bg-midnight/5 cursor-not-allowed' : 
                isSelected ? 'bg-brand-blue text-midnight shadow-lg scale-110' : 
                'bg-white border border-black/10 hover:border-brand-blue'
              }`,
              on: { click: () => toggleSeat(seat) }
            }, [
              el("span", { class: "text-[10px] font-medium", text: String(seat.number) })
            ]);
          })
        ),
        el("span", { class: "w-6 mono-label text-midnight/30 text-center", text: row })
      ]));
    });
  }; 

  const renderSummary = () => {
    clear(summaryHost);
    const subtotal = state.selectedSeats.reduce((sum, s) => sum + s.price, 0);
    const fee = state.selectedSeats.length > 0 ? 15 : 0;
    const total = subtotal + fee;

    const content: HTMLElement[] = [
      el("h3", { class: "mono-label text-brand-blue mb-6", text: "ORDER SUMMARY" }),
      
      state.selectedSeats.length === 0 
        ? el("div", { class: "py-12 text-center border-2 border-dashed border-black/5 rounded-card" }, [
            el("p", { class: "text-sm text-midnight/40", text: "No seats selected yet" })
          ])
        : el("div", { class: "space-y-4 mb-8" }, state.selectedSeats.map(seat => 
            el("div", { class: "flex justify-between items-center pb-4 border-b border-black/5" }, [
              el("div", {}, [
                el("div", { class: "font-medium", text: `Seat ${seat.id}` }),
                el("div", { class: "text-[10px] mono-label text-midnight/40", text: seat.zone })
              ]),
              el("div", { class: "font-medium", text: `$${seat.price}` })
            ])
          ))
    ];

    if (state.selectedSeats.length > 0) {
      content.push(
        el("div", { class: "space-y-2 my-8" }, [
          el("div", { class: "flex justify-between text-sm" }, [el("span", { text: "Subtotal" }), el("span", { text: `$${subtotal}` })]),
          el("div", { class: "flex justify-between text-sm" }, [el("span", { text: "Service Fee" }), el("span", { text: `$${fee}` })]),
          el("div", { class: "flex justify-between text-xl font-medium pt-4 border-t border-black/10" }, [
            el("span", { text: "Total" }),
            el("span", { text: `$${total}` })
          ])
        ]),

        el("button", {
          class: "w-full btn-primary",
          on: { click: () => router.navigate('/payment') },
          text: "PROCEED TO PAYMENT →"
        })
      );
    }

    mount(summaryHost, ...content);
  };

  // --- 5. Final Assembly ---
  initSeats();
  renderQueue();
  renderSeats();
  renderSummary();

  return el("div", { class: "bg-white min-h-screen pt-24 pb-20" }, [
    el("div", { class: "max-w-7xl mx-auto px-6" }, [
      el("button", { 
        class: "inline-flex items-center gap-2 mono-label text-midnight/60 hover:text-brand-blue mb-8",
        on: { click: () => router.navigate('/') },
        text: "← BACK TO EVENTS" 
      }),
      
      el("div", { class: "grid grid-cols-1 lg:grid-cols-3 gap-12" }, [
        // Left Side
        el("div", { class: "lg:col-span-2" }, [
          el("div", { class: "mb-12 flex justify-between items-end" }, [
            el("div", {}, [
              el("span", { class: "mono-label text-brand-blue mb-2 block", text: "SELECT SEATS / ZONE A" }),
              el("h1", { class: "text-4xl font-medium mb-4 tracking-tighter", text: state.concertTitle }),
              el("div", { class: "flex gap-6 text-sm text-midnight/60" }, [
                el("span", { text: `📍 ${state.venue}` }),
                el("span", { text: `🗓️ ${formatDateTime(state.dateTime)}` })
              ])
            ]),
            queueHost
          ]),
          
          // Stage
          el("div", { class: "w-full h-4 bg-midnight/5 rounded-full mb-20 flex items-center justify-center" }, [
            el("span", { class: "mono-label text-[10px] text-midnight/40", text: "STAGE / SCREEN" })
          ]),

          seatsHost
        ]),

        // Right Side (Sidebar)
        el("div", { class: "lg:col-span-1" }, [
          el("div", { class: "sticky top-32" }, [
            summaryHost
          ])
        ])
      ])
    ])
  ]);
}