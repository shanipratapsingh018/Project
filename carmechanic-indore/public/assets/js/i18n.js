/* Translate display text without replacing controls, event listeners or canonical values. */
(function() {
  const dictionary = window.CMI_HI || {}, nodes = new WeakMap(), attributes = new WeakMap();
  const folded = new Map(Object.entries(dictionary).map(([key,value])=>[key.toLowerCase(),value]));
  let language = "en", queued = false;
  const normalize = s => s.replace(/\s+/g, " ").trim();
  function translate(source) {
    const key = normalize(source);
    if (Object.hasOwn(dictionary, key)) return source.match(/^\s*/)[0] + dictionary[key] + source.match(/\s*$/)[0];
    if (folded.has(key.toLowerCase())) return source.match(/^\s*/)[0] + folded.get(key.toLowerCase()) + source.match(/\s*$/)[0];
    let m;
    if (key === "/ Book") return "/ बुकिंग";
    if ((m = /^\/ (.+)$/.exec(key))) { const suffix=translate(m[1]); return suffix===m[1] ? source : "/ "+suffix; }
    if ((m = /^Step (\d+) of (\d+)$/.exec(key))) return `चरण ${m[1]} / ${m[2]}`;
    if ((m = /^Enter a whole number from 1 to (\d+)\.$/.exec(key))) return `1 से ${m[1]} तक की पूरी संख्या लिखें।`;
    if ((m = /^Please choose your (.+)\.$/.exec(key))) return "कृपया निर्माता, मॉडल, वर्ष, ईंधन और वाहन श्रेणी चुनें।";
    if ((m = /^We'll contact you on (.+) to confirm the slot and quotation\. Your booking is confirmed only after we call or message you\.$/.exec(key))) return `समय और कोटेशन की पुष्टि के लिए हम ${m[1]} पर संपर्क करेंगे। हमारी कॉल या संदेश के बाद ही बुकिंग पक्की होगी।`;
    if ((m = /^(.+) — the price above updates when you change this\.$/.exec(key))) return `${translate(m[1])} — इसे बदलने पर ऊपर की कीमत बदल जाएगी।`;
    if ((m = /^Select one or more\. Overlapping jobs are counted once\. Prices shown are for a (.+?)(?: \((.+)\))?; your estimate also reflects parts quality\.( Jobs that don't apply to electric cars are switched off\.)?$/.exec(key))) {
      const cap = (x) => x.split(" / ").map((w) => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)).join(" / ");
      return `एक या ज़्यादा चुनें। एक जैसे काम एक ही बार गिने जाते हैं। कीमतें ${translate(cap(m[1]))}${m[2] ? " (" + translate(cap(m[2])) + ")" : ""} के लिए हैं; अनुमान में पार्ट्स की गुणवत्ता भी शामिल है।${m[3] ? " इलेक्ट्रिक कारों पर लागू न होने वाले काम बंद हैं।" : ""}`;
    }
    if (key === "Select one or more. Overlapping jobs are counted once. Prices shown are for a hatchback; your estimate adjusts for your car.") return "एक या ज़्यादा चुनें। एक जैसे काम एक ही बार गिने जाते हैं। कीमतें हैचबैक के लिए हैं; अनुमान आपकी कार के अनुसार बदलेगा।";
    if ((m = /^(\d+) brands, current and older models\. Not listed\? Choose “My model isn't listed”\.$/.exec(key))) return `${m[1]} ब्रांड, नए और पुराने मॉडल। सूची में नहीं है? “मेरा मॉडल सूची में नहीं है” चुनें।`;
    if ((m = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2})$/.exec(key))) return `${{ Mon: "सोम", Tue: "मंगल", Wed: "बुध", Thu: "गुरु", Fri: "शुक्र", Sat: "शनि", Sun: "रवि" }[m[1]]} ${m[2]}`;
    if ((m = /^Your location is approximate \(about ([\d.]+) km\)\. Please check the address and drag the pin if needed\.$/.exec(key))) return `आपकी लोकेशन अनुमानित है (लगभग ${m[1]} किमी)। कृपया पता जाँचें और ज़रूरत हो तो पिन खींचें।`;
    if ((m = /^Step (\d) of 2$/i.exec(key))) return `चरण ${m[1]} / 2`;
    if ((m = /^Search all (\d+) services$/.exec(key))) return `सभी ${m[1]} सेवाएँ खोजें`;
    if ((m = /^from (₹[\d,]+)( \/ (.+))?$/.exec(key))) return `${m[1]} से${m[3] ? " / " + translate(m[3]) : ""}`;
    if ((m = /^Estimate · (\d+) jobs?$/.exec(key))) return `अनुमान · ${m[1]} काम`;
    if ((m = /^(\d+) jobs? selected$/.exec(key))) return `${m[1]} काम चुने गए`;
    if ((m = /^· (\d+) selected$/.exec(key))) return `· ${m[1]} चुने गए`;
    if ((m = /^Not for (.+) cars$/.exec(key))) return `${translate(m[1][0].toUpperCase() + m[1].slice(1))} कारों के लिए नहीं`;
    if ((m = /^Please add your (.+)\.$/.exec(key))) return "कृपया " + m[1].split(", ").map((x) => ({ car: "कार", "car brand": "कार ब्रांड", "car model": "कार मॉडल", fuel: "ईंधन", "car type": "कार का प्रकार" }[x] || x)).join(", ") + " जोड़ें।";
    if ((m = /^Request received, (.+)!$/.exec(key))) return `अनुरोध मिल गया, ${m[1]}!`;
    if ((m = /^Yes — (\d{6})$/.exec(key))) return `हाँ — ${m[1]}`;
    if ((m = /^Carried over from your estimate: (.+)$/.exec(key))) return `आपके अनुमान से: ${m[1]}`;
    if ((m = /^([\d. –-]+) hours$/.exec(key))) return `${m[1]} घंटे`;
    if ((m = /^([\d. –-]+) working days?$/.exec(key))) return `${m[1]} कार्य दिवस`;
    if ((m = /^(.+) — quantity \((.+)\)$/.exec(key))) return `${dictionary[m[1]] || m[1]} — संख्या (${translate(m[2])})`;
    if ((m = /^(.+) — how many \((.+)\)\?$/.exec(key))) return `${dictionary[m[1]] || m[1]} — कितने?`;
    if ((m = /^Book (.+)$/.exec(key))) return (dictionary[m[1]] || dictionary[m[1][0].toUpperCase()+m[1].slice(1)] || "यह सेवा") + " बुक करें";
    if ((m = /^Price your (.+)$/.exec(key))) return "अपनी सर्विस का खर्च जानें";
    if (/^What's included in /i.test(key)) return "इस सर्विस में क्या शामिल है";
    if ((m = /^Call (\+?[\d ]+)$/.exec(key))) return `${m[1]} पर कॉल करें`;
    if ((m = /^per (job|set|visit|panel|pair|tyre|side)$/.exec(key))) return `प्रति ${{job:"काम",set:"सेट",visit:"विज़िट",panel:"पैनल",pair:"जोड़ी",tyre:"टायर",side:"साइड"}[m[1]]}`;
    return source;
  }
  const observer = new MutationObserver(() => {
    if (queued || language !== "hi") return;
    queued = true; queueMicrotask(() => { queued = false; apply(language); });
  });
  function apply(lang) {
    observer.disconnect(); language = lang === "hi" ? "hi" : "en";
    document.documentElement.lang = language; document.head.lang = "en";
    const parents = new Map(), walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, svg, textarea, input, .lang-toggle, .brand")) continue;
      if (parent.closest(".review blockquote, .review cite, .est-total .k, [data-user-content]")) {
        parent.lang = /[\u0900-\u097f]/.test(node.data) ? "hi" : "en";
        continue;
      }
      const old = nodes.get(node);
      const source = old && node.data === old.last ? old.source : node.data;
      if (!normalize(source)) continue;
      // An option with an implicit value must keep its original submitted value.
      if (parent.tagName === "OPTION" && !parent.hasAttribute("value")) parent.value = parent.textContent;
      const value = language === "hi" ? translate(source) : source;
      if (node.data !== value) node.data = value;
      nodes.set(node, {source, last:value});
      const langs = parents.get(parent) || new Set();
      if (/[A-Za-z]/.test(value) || /[\u0900-\u097f]/.test(value)) langs.add(/[\u0900-\u097f]/.test(value) ? "hi" : "en");
      parents.set(parent, langs);
    }
    for (const [element, langs] of parents) element.lang = language === "en" ? "en" : langs.has("hi") ? "hi" : "en";
    for (const el of document.querySelectorAll("[placeholder], [aria-label], img[alt], [title], optgroup[label]")) {
      if (el.closest(".lang-toggle, .brand, svg")) continue;
      const record = attributes.get(el) || {};
      for (const attr of ["placeholder", "aria-label", "alt", "title", "label"]) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr), old = record[attr];
        const source = old && current === old.last ? old.source : current;
        const value = language === "hi" ? translate(source) : source;
        el.setAttribute(attr, value); record[attr] = {source,last:value};
        if (attr === "alt" && /[A-Za-z]/.test(value) && !/[\u0900-\u097f]/.test(value)) el.lang = "en";
      }
      attributes.set(el, record);
    }
    document.querySelectorAll(".brand").forEach(el => el.lang = "en");
    document.querySelectorAll(".lang-toggle").forEach(el => {
      el.textContent = language === "hi" ? "English" : "हिंदी";
      el.lang = language === "hi" ? "en" : "hi";
      el.setAttribute("aria-label", language === "hi" ? "Switch to English" : "हिंदी में देखें");
      el.setAttribute("aria-pressed", String(language === "hi"));
    });
    observer.observe(document.body, {childList:true,subtree:true,characterData:true});
  }
  window.CMI_I18N = {apply, translate, available:Object.keys(dictionary).length>0};
})();
