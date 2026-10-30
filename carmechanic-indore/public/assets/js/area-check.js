/* Pickup-area checker — pure function, no DOM (unit-tested in tests/area.test.js).
   checkArea(areas, input) → { status, pin, locality, message, pending }
   status: "covered" | "not-listed" | "incomplete" | "invalid" | "unknown-locality" | "empty" */
(function (root) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

  function checkArea(A, raw) {
    const q = String(raw == null ? "" : raw).trim();
    const M = A.messages;
    if (!q) return { status: "empty", message: M.empty };

    const compact = q.replace(/[\s-]/g, "");
    const hasDigit = /\d/.test(compact);

    if (hasDigit) {
      if (!/^\d+$/.test(compact)) return { status: "invalid", message: M.invalid };
      if (compact.length < 6) return { status: "incomplete", message: M.incomplete, digits: compact.length };
      if (compact.length > 6 || compact[0] === "0") return { status: "invalid", message: M.invalid };
      return fromPin(A, compact, null);
    }

    if (norm(q).length < 3) return { status: "unknown-locality", message: M.unknownLocality };
    const nq = norm(q);
    const exact = A.localities.find(([n]) => norm(n) === nq);
    const partial = exact || A.localities.find(([n]) => norm(n).startsWith(nq) || nq.startsWith(norm(n)) || (nq.length >= 4 && norm(n).includes(nq)));
    if (!partial) return { status: "unknown-locality", message: M.unknownLocality };
    return fromPin(A, partial[1], partial[0]);
  }

  function fromPin(A, pin, locality) {
    if (A.coveredPins.includes(pin)) return { status: "covered", pin, locality, message: A.messages.covered, free: !!A.freePickupInCoveredArea };
    return { status: "not-listed", pin, locality, message: A.messages.notListed, pending: (A.pendingPins || []).includes(pin) };
  }

  /** Maps a check result to the estimator's pickup state. */
  function pickupState(r) {
    if (!r) return "unknown";
    if (r.status === "covered") return r.free ? "free" : "confirm";
    if (r.status === "not-listed") return "outside";
    return "unknown";
  }

  const API = { checkArea, pickupState };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CMI_AREA = API;
})(typeof window !== "undefined" ? window : this);
