// src/utils/router-logic.ts
// นี่คือ "เครื่องยนต์" เพียวๆ ที่ไม่มีการ Import หน้าเว็บใดๆ

export type RouteHandler = () => void;

export class MyRouter {
  private routes: Map<string, RouteHandler> = new Map();
  private fallback: RouteHandler = () => {};

  // จดทะเบียนเส้นทาง
  register(config: { path: string; handler: RouteHandler }): void {
    this.routes.set(config.path, config.handler);
  }

  // ตั้งค่ากรณีหาหน้าไม่เจอ
  setFallback(handler: RouteHandler): void {
    this.fallback = handler;
  }

  // สั่งเปลี่ยนหน้า
  navigate(path: string): void {
    window.location.hash = path;
  }

  // ดึงค่า ID จาก URL (เช่น /payment?bookingId=1)
  paramInt(name: string): number | null {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const val = params.get(name);
    return val ? parseInt(val, 10) : null;
  }

  // เริ่มทำงาน
  start(): void {
    const handleRoute = () => {
      const path = window.location.hash.slice(1).split("?")[0] || "/";
      const handler = this.routes.get(path) || this.fallback;
      handler();
    };

    window.addEventListener("hashchange", handleRoute);
    handleRoute(); // รันครั้งแรกตอนโหลดหน้า
  }
}