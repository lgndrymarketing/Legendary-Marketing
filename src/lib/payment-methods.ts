/**
 * How clients actually pay the agency. Single source for every payment
 * method dropdown (record/edit payment, roster quick-record, client
 * billing notify).
 *
 * "Payment link" carries processor fees — the record-payment forms surface
 * a fees input for it, and each fee is auto-booked as its own one-time
 * expense (category "fees") on the P&L. Partner splits are NOT reduced by
 * expenses — they run on the full collected amount, by request.
 */

export const PAYMENT_METHODS = [
  "Payment link",
  "Zelle",
  "Apple Pay",
  "Cash App",
];

/** The method whose processor fees we capture at record time. */
export const FEE_METHOD = "Payment link";
