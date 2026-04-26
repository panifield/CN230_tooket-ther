import { el, mount, clear } from "../utils/dom";
import { router } from "../router-instance"; 
import { refundApi } from "../api/refund"; 

export function renderRefundView(props: { bookingId: number, isVoucher?: boolean }): HTMLElement {
  const { bookingId, isVoucher = false } = props;
  
  const container = el("div", { 
    class: "bg-tickets-page",
    attrs: { 
      style: "background: #FFFFFF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 64px 24px;" 
    }
  });

  const state = {
    bankName: "",
    accountNumber: "",
    accountName: "",
    reason: "",
    isLoading: false,
    error: "",
    success: false
  };

  const render = () => {
    clear(container);

    // ── Success State ──
    if (state.success) {
      const successCard = el("div", { 
        class: "card",
        attrs: { style: "text-align: center; max-width: 440px; padding: 48px 32px; background: #FFFFFF; border: 1px solid var(--color-border); box-shadow: var(--shadow-card);" } 
      }, [
        el("div", { 
          attrs: { style: "width: 64px; height: 64px; background: var(--gradient-coastal); border-radius: var(--radius-control); margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center; color: var(--color-midnight); font-size: 24px; font-weight: bold;" } 
        }, [ document.createTextNode("✓") ]),
        el("h1", { 
          class: "concert-title", 
          attrs: { style: "margin-bottom: 16px;" }, 
          text: "Request Submitted" 
        }),
        el("p", { 
          attrs: { style: "color: var(--color-text-muted); margin-bottom: 32px; font-size: 16px; line-height: 1.5;" }, 
          text: "Your refund request has been submitted successfully. Our team will review and process the transfer shortly." 
        }),
        el("button", { 
          class: "btn btn--primary btn--block", 
          attrs: { style: "padding: 16px;" },
          on: { click: () => router.navigate("/my-tickets") },
          text: "RETURN TO MY TICKETS"
        })
      ]);
      mount(container, successCard);
      return;
    }

    const createInput = (type: string, placeholder: string, value: string, onChange: (val: string) => void) => {
      const input = el(type === "textarea" ? "textarea" : "input", {
        attrs: { 
          type: type === "textarea" ? undefined : type,
          placeholder,
          style: "width: 100%; padding: 14px 16px; background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-control); font-size: 16px; color: var(--color-midnight); box-sizing: border-box; transition: border-color 0.2s;",
          ...(type === "textarea" ? { rows: "3" } : {})
        },
        on: {
          input: (e: Event) => onChange((e.target as HTMLInputElement).value),
          focus: (e: Event) => (e.target as HTMLElement).style.borderColor = "var(--color-primary-blue)",
          blur: (e: Event) => (e.target as HTMLElement).style.borderColor = "var(--color-border)",
        }
      });
      (input as HTMLInputElement).value = value;
      return input;
    };

    const createLabel = (text: string) => {
      return el("label", { 
        class: "label-mono", 
        attrs: { style: "display: block; opacity: 0.6; margin-bottom: 8px;" },
        text
      });
    };

    const fieldGroup = (label: string, inputElement: HTMLElement) => {
      return el("div", { attrs: { style: "margin-bottom: 24px;" } }, [
        createLabel(label),
        inputElement
      ]);
    };

    const form = el("form", {
      attrs: { style: "width: 100%;" },
      on: {
        submit: async (e) => {
          e.preventDefault();
          state.isLoading = true;
          state.error = "";
          render();

          try {
            const basePayload = {
              bank_name: state.bankName,
              account_number: state.accountNumber,
              account_name: state.accountName,
              ...(state.reason.trim() !== "" ? { reason: state.reason } : {}) 
            };

            if (isVoucher) {
              await refundApi.requestVoucherRefund(bookingId, basePayload);
            } else {
              await refundApi.requestRefund({ booking_id: bookingId, ...basePayload });
            }
            
            state.success = true;
          } catch (err) {
            state.error = err instanceof Error ? err.message : "Failed to process refund request.";
          } finally {
            state.isLoading = false;
            render();
          }
        }
      }
    }, [
      fieldGroup("BANK NAME", createInput("text", "e.g. Kasikorn Bank", state.bankName, (v) => state.bankName = v)),
      fieldGroup("ACCOUNT NUMBER", createInput("text", "e.g. 123-4-56789-0", state.accountNumber, (v) => state.accountNumber = v)),
      fieldGroup("ACCOUNT NAME", createInput("text", "e.g. John Doe", state.accountName, (v) => state.accountName = v)),
      fieldGroup("REASON (OPTIONAL)", createInput("textarea", "Tell us why you are requesting a refund...", state.reason, (v) => state.reason = v)),

      state.error ? el("div", { 
        attrs: { style: "margin-bottom: 24px; padding: 12px 16px; background: #FFF4C7; border: 1px solid rgba(0,0,0,0.08); color: var(--color-midnight); border-radius: var(--radius-control); font-size: 14px;" },
        text: state.error 
      }) : "",

      el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 12px; margin-top: 32px;" } }, [
        el("button", {
          class: "btn btn--primary btn--block",
          attrs: { 
            type: "submit", 
            disabled: state.isLoading ? "true" : undefined,
            style: `padding: 16px; cursor: ${state.isLoading ? 'not-allowed' : 'pointer'}; opacity: ${state.isLoading ? '0.7' : '1'};`
          },
          text: state.isLoading ? "PROCESSING..." : "SUBMIT REFUND REQUEST"
        }),
        
        el("button", {
          class: "btn btn--block", 
          attrs: {
            type: "button",
            style: "padding: 16px; background: #AAD6FA; color: #010120; border: none; font-weight: 500;"
          },
          on: { click: () => router.navigate("/my-tickets") },
          text: "CANCEL & GO BACK"
        })
      ])
    ]);

    const card = el("div", { 
      class: "card", 
      attrs: { style: "width: 100%; max-width: 520px; background: #FFFFFF; border: 1px solid var(--color-border); box-shadow: var(--shadow-card); padding: 48px 40px; box-sizing: border-box;" } 
    }, [
      el("div", { attrs: { style: "margin-bottom: 40px;" } }, [
        el("p", { 
          class: "label-mono", 
          attrs: { style: "color: #6f5e4e; margin-bottom: 12px;" },
          text: `REFUND / BKG-${bookingId}`
        }),
        el("h1", { 
          class: "concert-title", 
          attrs: { style: "margin: 0;" }, 
          text: isVoucher ? "Redeem Voucher" : "Request Refund" 
        }),
      ]),
      form
    ]);

    mount(container, card);
  };

  render();
  return container;
}