/* =====================================================================
   PICKUP & DROP SERVICE AREA — editable by the owner
   ---------------------------------------------------------------------
   coveredPins   → pickup & drop available (free, subject to booking confirmation)
   pendingPins   → real Indore PINs we have NOT verified yet; treated as
                   "not in confirmed list" until moved into coveredPins
   localities    → names customers may type instead of a PIN (post-office
                   names from India Post data), each mapped to its PIN

   Source of PIN data (checked Oct 2026): India Post post-office directory as
   republished by buddyloan.com/indore-pincode, pin.codes.in and
   worldpostalcodes.org. Re-check on https://www.indiapost.gov.in before launch.

   NOT covered on purpose: Indore district PINs outside the city (453xxx —
   Mhow 453441, Sanwer 453551, Depalpur 453001, Hatod 453111 …).
   Add a PIN to coveredPins only when the garage confirms it serves it.
   ===================================================================== */
(function (root) {
  const AREAS = {
    city: "Indore",
    freePickupInCoveredArea: true, // set false if pickup carries a charge

    coveredPins: [
      "452001", // GPO, Tukoganj, Manorama Ganj, Radio Colony, High Court
      "452002", // City 2, Cloth Market
      "452003", // Pardesipura, Vallabh Nagar
      "452005", // Bijasan Road
      "452006", // Army Head Quarter area
      "452007", // Siyaganj, Ram Bagh, Collectorate, Courts
      "452009", // Sudama Nagar, Lokmanya Nagar
      "452010", // Vijay Nagar, Nipania, DDU Nagar, Sanwer Link Road
      "452011", // Nanda Nagar, RSS Nagar
      "452012", // Rajendra Nagar
      "452013", // CAT (Raja Ramanna Centre) area
      "452014", // Khatiwala Tank
      "452015", // Kumar Khadi, Industrial Estate
      "452016", // Khajrana, Bicholi Mardana, Kanadia Road, Jhalaria and nearby villages
      "452018", // Tilak Nagar
      "452020"  // Kasturbagram, Palda, Tillor, Datoda, Kelod Kartal and nearby villages
    ],

    // Listed by one directory only — confirm with India Post / the owner first.
    pendingPins: ["452004", "452008"],

    localities: [
      ["Indore GPO", "452001"], ["Tukoganj", "452001"], ["Manorama Ganj", "452001"], ["Radio Colony", "452001"], ["Takshashila", "452001"], ["CGO Complex", "452001"], ["High Court", "452001"],
      ["Cloth Market", "452002"],
      ["Pardesipura", "452003"], ["Vallabh Nagar", "452003"],
      ["Bijasan Road", "452005"], ["Army Head Quarter", "452006"],
      ["Siyaganj", "452007"], ["Ram Bagh", "452007"], ["Collectorate", "452007"], ["Gurunanak Chowk", "452007"], ["Indore Nagar", "452007"],
      ["Sudama Nagar", "452009"], ["Lokmanya Nagar", "452009"],
      ["Vijay Nagar", "452010"], ["Nipania", "452010"], ["Nipaniya", "452010"], ["DDU Nagar", "452010"], ["Sanwer Link Road", "452010"],
      ["Nanda Nagar", "452011"], ["RSS Nagar", "452011"],
      ["Rajendra Nagar", "452012"], ["CAT", "452013"], ["Khatiwala Tank", "452014"],
      ["Kumar Khadi", "452015"], ["Industrial Estate", "452015"],
      ["Khajrana", "452016"], ["Bicholi Mardana", "452016"], ["Kanadia", "452016"], ["Kanadia Road", "452016"], ["Jhalaria", "452016"], ["Baolia Khurd", "452016"], ["Buranakhedi", "452016"], ["Dudhia", "452016"], ["Sanawadia", "452016"], ["Khudel", "452016"], ["Semlia Chau", "452016"], ["Sivani", "452016"],
      ["Tilak Nagar", "452018"],
      ["Kasturbagram", "452020"], ["Palda", "452020"], ["Tillor Khurd", "452020"], ["Tillor Bujurg", "452020"], ["Datoda", "452020"], ["Kelod Kartal", "452020"], ["Joshi Guradia", "452020"], ["Kampel", "452020"], ["Machala", "452020"], ["Pedmi", "452020"], ["Pipalda", "452020"], ["Piwdai", "452020"],
      ["Mhow", "453441"], ["Sanwer", "453551"], ["Depalpur", "453001"], ["Hatod", "453111"]
    ],

    messages: {
      covered: "Great news! Pickup and drop are available in your area, subject to booking confirmation.",
      notListed: "Your location is not in our confirmed service list yet. Contact us to check availability.",
      incomplete: "Please enter all 6 digits of your PIN code.",
      invalid: "That doesn't look like a valid PIN code. Indian PIN codes have 6 digits and don't start with 0.",
      unknownLocality: "We couldn't find that locality. Please enter your 6-digit PIN code instead.",
      empty: "Enter your 6-digit PIN code or locality name."
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = AREAS;
  else root.CMI_AREAS = AREAS;
})(typeof window !== "undefined" ? window : this);
