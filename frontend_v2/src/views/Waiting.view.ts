import { bookingApi } from "../api/booking";
import { router } from "../router";
import { clear, el, mount } from "../utils/dom";

export function renderWaitingView(params: { concertId: number }): HTMLElement {
  // สร้าง CSS Animation สำหรับตัวหมุนโหลด (Spin)
  if (!document.getElementById("spin-keyframes")) {
    const style = document.createElement("style");
    style.id = "spin-keyframes";
    style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  const statusHost = el("div", { attrs: { style: "margin-top: 24px;" } });

  const container = el("div", { class: "coastal-page", attrs: { style: "display: flex; align-items: center; justify-content: center; min-height: 70vh;" } }, [
    el("div", { class: "card card--white", attrs: { style: "text-align: center; max-width: 480px; width: 100%; padding: 64px 32px;" } }, [
      
      // Loading Spinner
      el("div", { attrs: { style: "width: 48px; height: 48px; border: 3px solid var(--color-border); border-top-color: var(--color-midnight); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 24px auto;" } }),
      
      el("span", { class: "label-mono", attrs: { style: "color: var(--color-midnight); margin-bottom: 8px; display: block;" }, text: "TICKETING QUEUE" }),
      el("h1", { class: "coastal-title", attrs: { style: "margin: 0 0 16px 0; font-size: 32px;" }, text: "Waiting for confirmation..." }),
      el("p", { attrs: { style: "color: var(--color-text-muted); font-size: 15px; line-height: 1.5;" }, text: "Your position in line is being processed. Please do not close or refresh this window." }),
      
      statusHost
    ])
  ]);

  let intervalId: ReturnType<typeof setInterval>;

  const checkStatus = async () => {
    try {
      const status = await bookingApi.queueStatus(params.concertId);
      
      clear(statusHost);
      mount(statusHost, el("div", { attrs: { style: "display: inline-flex; flex-direction: column; align-items: center; background: var(--color-white); padding: 16px 24px; border: 1px solid var(--color-border); border-radius: var(--radius-container);" } }, [
        el("span", { class: "label-mono", attrs: { style: "font-size: 9px; margin-bottom: 4px;" }, text: "CURRENT POSITION" }),
        el("span", { attrs: { style: "font-size: 24px; font-weight: 500; color: var(--color-midnight); letter-spacing: -0.5px;" }, text: `${status.position_in_queue || "—"} / ${status.total_waiting}` })
      ]));

      if (status.status === "admitted") {
        clearInterval(intervalId);
        // เมื่อถึงคิว ให้พาไปหน้าเลือกโซน!
        router.navigate(`/zones?concertId=${params.concertId}`);
      } else if (status.status === "expired" || status.status === "completed") {
        clearInterval(intervalId);
        router.navigate("/dashboard");
      }
    } catch (err) {
      console.error("Queue poll error:", err);
    }
  };

  // เรียกเช็คครั้งแรก แล้วตั้งเวลาเช็คซ้ำทุกๆ 3 วินาที
  void checkStatus();
  intervalId = setInterval(() => void checkStatus(), 3000);

  // หยุดการ Poll ถ้าย้ายไปหน้าอื่น (ป้องกัน Memory Leak)
  const originalNavigate = router.navigate;
  router.navigate = (path: string) => {
    clearInterval(intervalId);
    originalNavigate(path);
  };

  return container;
}