// ในไฟล์ src/views/Zones.view.ts
import { el } from "../utils/dom";

// ต้องมีคำว่า export นำหน้าฟังก์ชันเสมอจ้ะ
export function renderZonesView(p0: { concertId: any; }): HTMLElement {
  return el("div", { text: "Zone Selection View" });
}