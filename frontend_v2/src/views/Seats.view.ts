// ในไฟล์ src/views/Seats.view.ts
import { el } from "../utils/dom";

// ต้องมีคำว่า export นำหน้าฟังก์ชันเสมอจ้ะ
export function renderSeatsView(p0: { concertId: any; zoneId: any; }): HTMLElement {
  return el("div", { text: "Seats Selection View" });
}