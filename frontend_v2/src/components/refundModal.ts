import { refundApi } from "../api/payment";
import { el } from "../utils/dom";
import { openModal } from "./modal";

export interface RefundModalOptions {
  bookingId: number;
  voucher: boolean;
  onSuccess: () => void;
}

export function openRefundModal(options: RefundModalOptions): void {
  const { bookingId, voucher, onSuccess } = options;

  const bankName = el("input", {
    class: "input",
    attrs: {
      id: "refund-bank-name",
      type: "text",
      placeholder: "e.g. กสิกรไทย, กรุงเทพ, ไทยพาณิชย์",
    },
  }) as HTMLInputElement;

  const accountNumber = el("input", {
    class: "input",
    attrs: {
      id: "refund-account-number",
      type: "text",
      placeholder: "e.g. 1234567890",
    },
  }) as HTMLInputElement;

  const accountName = el("input", {
    class: "input",
    attrs: {
      id: "refund-account-name",
      type: "text",
      placeholder: "ชื่อบัญชีตามสมุดบัญชี",
    },
  }) as HTMLInputElement;

  const reason = el("textarea", {
    class: "textarea",
    attrs: {
      id: "refund-reason",
      placeholder: "Reason for the refund request",
    },
  }) as HTMLTextAreaElement;

  const status = el("p", { class: "label-mono", text: "" });

  const submit = async (): Promise<void> => {
    const bank = bankName.value.trim();
    const accNum = accountNumber.value.trim();
    const accName = accountName.value.trim();
    const reasonVal = reason.value.trim();

    if (!bank) {
      status.textContent = "Please enter bank name.";
      return;
    }
    if (!accNum || accNum.length < 5) {
      status.textContent = "Please enter a valid account number (min 5 digits).";
      return;
    }
    if (!accName) {
      status.textContent = "Please enter account holder name.";
      return;
    }

    submitBtn.setAttribute("disabled", "true");
    status.textContent = "Submitting…";
    try {
      if (voucher) {
        await refundApi.voucher(bookingId, {
          bank_name: bank,
          account_number: accNum,
          account_name: accName,
          reason: reasonVal || undefined,
        });
      } else {
        await refundApi.request({
          booking_id: bookingId,
          bank_name: bank,
          account_number: accNum,
          account_name: accName,
          reason: reasonVal || undefined,
        });
      }
      onSuccess();
      close();
    } catch (err) {
      status.textContent =
        err instanceof Error ? err.message : "Refund request failed.";
      submitBtn.removeAttribute("disabled");
    }
  };

  const submitBtn = el(
    "button",
    {
      class: "btn btn--primary",
      attrs: { type: "button" },
      on: { click: () => void submit() },
    },
    [voucher ? "Submit voucher refund" : "Submit refund request"]
  );

  const field = (label: string, forId: string, input: HTMLElement) =>
    el("div", { class: "field" }, [
      el("label", {
        class: "field__label",
        attrs: { for: forId },
        text: label,
      }),
      input,
    ]);

  const close = openModal({
    title: voucher ? "Voucher refund" : "Refund request",
    body: el("div", {}, [
      field("Bank name", "refund-bank-name", bankName),
      field("Account number", "refund-account-number", accountNumber),
      field("Account name", "refund-account-name", accountName),
      field("Reason", "refund-reason", reason),
      status,
      el("div", { class: "form-actions" }, [
        el(
          "button",
          {
            class: "btn btn--ghost",
            attrs: { type: "button" },
            on: { click: () => close() },
          },
          ["Cancel"]
        ),
        submitBtn,
      ]),
    ]),
  });
}

