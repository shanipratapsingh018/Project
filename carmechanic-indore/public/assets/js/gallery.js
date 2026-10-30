/* =====================================================================
   BEFORE & AFTER GALLERY — editable data file
   ---------------------------------------------------------------------
   Images in assets/img/gallery/samples/ come from the owner's file
   garage_before_after_20_high_resolution_1.zip (supplied 29 Oct 2026),
   split into separate before / after images. They are SAMPLE images, not
   jobs done at this garage, so they use kind: "illustrative" and every card
   says "Illustrative example — not an actual customer vehicle."
   (Pair 09 "wheel alignment" was left out: it showed the same worn/new
   tyre idea as tyre replacement, which doesn't depict an alignment.)

   kind: "illustrative" → sample image, always labelled as above
         "real"         → genuine photos of a job done at THIS garage
                          (same car, before and after, with owner's consent)

   To add a real job:
     1. Save photos as public/assets/img/gallery/real/<job-id>-before.jpg
        and <job-id>-after.jpg (square-ish works best; ~800px, under 200 KB).
     2. Copy an entry below, set kind: "real", update src/alt/width/height, and
        fill vehicle / duration / price ONLY with accurate information.
     3. Set the matching sample entry's `show` to false if you like.
   Real entries are listed before sample ones automatically.
   serviceId = a rate-card ID (rate-card.js); OT-07 = general labour (price on request).
   ===================================================================== */
(function (root) {
  const GALLERY = {
    title: "Before & After — Real Car Transformations",
    subtitle: "See how professional servicing and repairs can bring your car back to its best.",
    source: "Owner-supplied sample images (garage_before_after_20_high_resolution_1.zip, 29 Oct 2026)",
    groups: [
      { id: "body", label: "Bodywork & lights" },
      { id: "service", label: "Servicing & filters" },
      { id: "mech", label: "Mechanical repairs" }
    ],
    items: [
      { id: "dent-repair", show: true, featured: true, kind: "illustrative", group: "body", serviceId: "BD-01",
        category: "Dent repair & bodywork", title: "Door dent pulled and refinished",
        description: "A dented door panel is pulled back into shape, filled where needed, primed and colour-matched.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/dent-repair-before.jpg", alt: "Before: grey car door with a large dent below the handle", width: 277, height: 320 },
        after: { src: "assets/img/gallery/samples/dent-repair-after.jpg", alt: "After: the same door panel smooth and refinished", width: 293, height: 320 } },
      { id: "bumper-scratch-repair", show: true, featured: false, kind: "illustrative", group: "body", serviceId: "BD-02",
        category: "Bumper scratch repair", title: "Scratched bumper repainted",
        description: "Deep scratches on the front bumper are sanded, filled, primed and painted to match.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/bumper-scratch-repair-before.jpg", alt: "Before: white front bumper covered in black scratches", width: 282, height: 319 },
        after: { src: "assets/img/gallery/samples/bumper-scratch-repair-after.jpg", alt: "After: white front bumper repainted with no scratches", width: 302, height: 319 } },
      { id: "headlight-restoration", show: true, featured: true, kind: "illustrative", group: "body", serviceId: "CD-04",
        category: "Headlight restoration", title: "Yellowed headlight made clear",
        description: "Oxidised headlight lenses are wet-sanded, polished and sealed to restore clarity and night-time visibility.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/headlight-restoration-before.jpg", alt: "Before: yellowed, hazy headlight lens", width: 300, height: 282 },
        after: { src: "assets/img/gallery/samples/headlight-restoration-after.jpg", alt: "After: clear, polished headlight lens", width: 300, height: 282 } },
      { id: "taillight-repair", show: true, featured: false, kind: "illustrative", group: "body", serviceId: "EL-04",
        category: "Taillight repair", title: "Cracked taillight replaced",
        description: "A broken taillight unit is replaced and the bulbs and wiring are checked.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/taillight-repair-before.jpg", alt: "Before: red taillight with a shattered lens", width: 289, height: 319 },
        after: { src: "assets/img/gallery/samples/taillight-repair-after.jpg", alt: "After: new taillight unit fitted", width: 269, height: 319 } },
      { id: "alloy-wheel-repair", show: true, featured: false, kind: "illustrative", group: "body", serviceId: "OT-07",
        category: "Alloy wheel repair", title: "Kerb-damaged alloy refinished",
        description: "Scuffs and kerb rash on the alloy rim are repaired and refinished.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/alloy-wheel-repair-before.jpg", alt: "Before: alloy wheel with scuffed, damaged rim", width: 287, height: 319 },
        after: { src: "assets/img/gallery/samples/alloy-wheel-repair-after.jpg", alt: "After: alloy wheel with a clean, refinished rim", width: 291, height: 319 } },
      { id: "engine-cleaning-service", show: true, featured: true, kind: "illustrative", group: "service", serviceId: "GS-03",
        category: "Engine bay cleaning & service", title: "Greasy engine bay cleaned",
        description: "The engine bay is degreased safely, and hoses, belts and battery terminals are checked during the service.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/engine-cleaning-service-before.jpg", alt: "Before: engine bay covered in dirt and grease", width: 288, height: 320 },
        after: { src: "assets/img/gallery/samples/engine-cleaning-service-after.jpg", alt: "After: clean engine bay after cleaning and service", width: 296, height: 320 } },
      { id: "engine-oil-change", show: true, featured: false, kind: "illustrative", group: "service", serviceId: "GS-04",
        category: "Engine oil change", title: "Old oil drained, fresh oil filled",
        description: "Dark, used engine oil is drained and replaced with fresh oil of the grade in your manual, with a new oil filter.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/engine-oil-change-before.jpg", alt: "Before: dark, dirty engine oil draining from a car", width: 278, height: 291 },
        after: { src: "assets/img/gallery/samples/engine-oil-change-after.jpg", alt: "After: clean golden engine oil being filled", width: 288, height: 291 } },
      { id: "air-filter-replacement", show: true, featured: false, kind: "illustrative", group: "service", serviceId: "GS-05",
        category: "Air filter replacement", title: "Clogged air filter replaced",
        description: "A dust-clogged engine air filter is replaced so the engine breathes freely.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/air-filter-replacement-before.jpg", alt: "Before: engine air filter clogged with dust and dirt", width: 301, height: 293 },
        after: { src: "assets/img/gallery/samples/air-filter-replacement-after.jpg", alt: "After: new white engine air filter fitted", width: 299, height: 293 } },
      { id: "cabin-filter-replacement", show: true, featured: false, kind: "illustrative", group: "service", serviceId: "GS-06",
        category: "Cabin filter replacement", title: "Dirty cabin filter replaced",
        description: "A cabin filter full of dust and leaves is replaced for cleaner air from the vents.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/cabin-filter-replacement-before.jpg", alt: "Before: cabin filter full of dust and dry leaves", width: 285, height: 293 },
        after: { src: "assets/img/gallery/samples/cabin-filter-replacement-after.jpg", alt: "After: new clean cabin filter", width: 273, height: 293 } },
      { id: "ac-cleaning-service", show: true, featured: true, kind: "illustrative", group: "service", serviceId: "AC-03",
        category: "AC cleaning & service", title: "Dusty AC vents cleaned",
        description: "Vents and filters are cleaned and the AC gas pressure is checked so the cabin cools properly.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/ac-cleaning-service-before.jpg", alt: "Before: dusty, dirty dashboard AC vent", width: 283, height: 292 },
        after: { src: "assets/img/gallery/samples/ac-cleaning-service-after.jpg", alt: "After: clean dashboard AC vent", width: 302, height: 292 } },
      { id: "coolant-service", show: true, featured: false, kind: "illustrative", group: "service", serviceId: "GS-09",
        category: "Coolant service", title: "Old coolant flushed and refilled",
        description: "Discoloured coolant is drained and the system is refilled with fresh coolant.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/coolant-service-before.jpg", alt: "Before: coolant reservoir with brown, dirty coolant", width: 283, height: 348 },
        after: { src: "assets/img/gallery/samples/coolant-service-after.jpg", alt: "After: coolant reservoir refilled with fresh pink coolant", width: 300, height: 348 } },
      { id: "wiper-blade-replacement", show: true, featured: false, kind: "illustrative", group: "service", serviceId: "OT-07",
        category: "Wiper blade replacement", title: "Worn wiper blades replaced",
        description: "Worn wiper blades that leave streaks are replaced with new ones.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/wiper-blade-replacement-before.jpg", alt: "Before: worn wiper blade on a dirty windscreen", width: 284, height: 236 },
        after: { src: "assets/img/gallery/samples/wiper-blade-replacement-after.jpg", alt: "After: new wiper blade on a clean windscreen", width: 290, height: 236 } },
      { id: "brake-service", show: true, featured: true, kind: "illustrative", group: "mech", serviceId: "BR-02",
        category: "Brake service", title: "Rusty brake disc and pads renewed",
        description: "Worn pads are replaced and the disc is cleaned or replaced, then the brakes are tested.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/brake-service-before.jpg", alt: "Before: rusty, worn brake disc and caliper", width: 277, height: 322 },
        after: { src: "assets/img/gallery/samples/brake-service-after.jpg", alt: "After: clean new brake disc and caliper", width: 290, height: 322 } },
      { id: "tyre-replacement", show: true, featured: false, kind: "illustrative", group: "mech", serviceId: "TB-02",
        category: "Tyre replacement", title: "Worn tyre replaced",
        description: "A tyre worn past its tread limit is replaced with a new one, then balanced.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/tyre-replacement-before.jpg", alt: "Before: worn tyre with shallow tread", width: 301, height: 321 },
        after: { src: "assets/img/gallery/samples/tyre-replacement-after.jpg", alt: "After: new tyre with deep tread", width: 298, height: 321 } },
      { id: "battery-replacement", show: true, featured: false, kind: "illustrative", group: "mech", serviceId: "TB-05",
        category: "Battery replacement", title: "Corroded battery replaced",
        description: "An old battery with corroded terminals is replaced and the charging system is tested.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/battery-replacement-before.jpg", alt: "Before: old car battery with corroded, dirty terminals", width: 283, height: 322 },
        after: { src: "assets/img/gallery/samples/battery-replacement-after.jpg", alt: "After: new car battery fitted", width: 295, height: 322 } },
      { id: "fuel-injector-cleaning", show: true, featured: false, kind: "illustrative", group: "mech", serviceId: "EN-03",
        category: "Fuel injector cleaning", title: "Clogged injector cleaned",
        description: "A clogged injector that drips fuel is cleaned so it sprays a fine, even mist.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/fuel-injector-cleaning-before.jpg", alt: "Before: fuel injector dripping fuel unevenly", width: 282, height: 292 },
        after: { src: "assets/img/gallery/samples/fuel-injector-cleaning-after.jpg", alt: "After: fuel injector spraying a fine, even mist", width: 293, height: 292 } },
      { id: "suspension-repair", show: true, featured: false, kind: "illustrative", group: "mech", serviceId: "SU-02",
        category: "Suspension repair", title: "Worn shock absorber replaced",
        description: "A worn, rusty shock absorber and spring are replaced, followed by a wheel alignment check.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/suspension-repair-before.jpg", alt: "Before: rusty, dirty shock absorber and coil spring", width: 280, height: 349 },
        after: { src: "assets/img/gallery/samples/suspension-repair-after.jpg", alt: "After: new shock absorber and spring fitted", width: 284, height: 349 } },
      { id: "clutch-replacement", show: true, featured: false, kind: "illustrative", group: "mech", serviceId: "CL-02",
        category: "Clutch replacement", title: "Worn clutch set replaced",
        description: "A worn clutch plate and pressure plate are replaced with a new clutch set.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/clutch-replacement-before.jpg", alt: "Before: worn, rusty clutch plate", width: 301, height: 349 },
        after: { src: "assets/img/gallery/samples/clutch-replacement-after.jpg", alt: "After: new clutch pressure plate", width: 297, height: 349 } },
      { id: "exhaust-repair", show: true, featured: false, kind: "illustrative", group: "mech", serviceId: "OT-07",
        category: "Exhaust repair", title: "Rusted exhaust section replaced",
        description: "A rusted, holed exhaust section is replaced to stop leaks and noise.",
        vehicle: null, duration: null, price: null,
        before: { src: "assets/img/gallery/samples/exhaust-repair-before.jpg", alt: "Before: rusted exhaust pipe with a hole", width: 287, height: 349 },
        after: { src: "assets/img/gallery/samples/exhaust-repair-after.jpg", alt: "After: new stainless exhaust section", width: 269, height: 349 } }
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = GALLERY;
  else root.CMI_GALLERY = GALLERY;
})(typeof window !== "undefined" ? window : this);
