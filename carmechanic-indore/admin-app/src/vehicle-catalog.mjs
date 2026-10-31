// Curated vehicle names for administrative selection, not a fitment or pricing
// database. Includes Indian-market, discontinued and imported vehicles. Every
// picker also supports manual entries; this list does not claim global coverage.
const entries = [
  [
    "maruti",
    "Maruti Suzuki",
    "Maruti|Maruti Suzuki India|MSIL",
    "800|1000|A-Star|Alto|Alto 800|Alto K10|Baleno|Baleno Altura|Brezza|Celerio|Celerio X|Ciaz|Dzire|Eeco|Ertiga|Esteem|Estilo|Fronx|Grand Vitara|Gypsy|Ignis|Invicto|Jimny|Kizashi|Omni|Ritz|S-Cross|S-Presso|Swift|Swift Dzire|SX4|Versa|Vitara Brezza|Wagon R|Wagon R Stingray|XL6|Zen|Zen Estilo",
  ],
  [
    "hyundai",
    "Hyundai",
    "Hyundai Motor",
    "Accent|Alcazar|Aura|Creta|Creta Electric|Elantra|Elite i20|Eon|Exter|Getz|Grand i10|Grand i10 Nios|i10|i20|i20 Active|i20 N Line|Ioniq 5|Ioniq 6|Kona Electric|Santa Fe|Santro|Santro Xing|Sonata|Sonata Embera|Terracan|Tucson|Venue|Venue N Line|Verna|Xcent",
  ],
  [
    "tata",
    "Tata",
    "Tata Motors",
    "Altroz|Aria|Bolt|Curvv|Curvv EV|Estate|Harrier|Harrier EV|Hexa|Indica|Indica Vista|Indigo|Indigo CS|Indigo eCS|Indigo Marina|Manza|Nano|Nexon|Nexon EV|Punch|Punch EV|Safari|Safari Dicor|Safari Storme|Sierra|Spacio|Sumo|Sumo Gold|Sumo Grande|Telcoline|Tiago|Tiago EV|Tigor|Tigor EV|Venture|Winger|Xenon|Xenon XT|Yodha|Zest",
  ],
  [
    "mahindra",
    "Mahindra",
    "Mahindra and Mahindra|M&M",
    "Alturas G4|Armada|BE 6|Bolero|Bolero Camper|Bolero Maxx Pik-Up|Bolero Neo|Bolero Neo Plus|Bolero Pik-Up|CJ3B|CJ500D|CL340|CL500|Commander|e2o|e2o Plus|eVerito|Genio|Imperio|Logan|Major|Marazzo|Marshal|Maxximo|NuvoSport|Quanto|Reva|Scorpio|Scorpio Classic|Scorpio-N|Thar|Thar Roxx|TUV300|TUV300 Plus|Verito|Verito Vibe|XEV 9e|XUV 3XO|XUV300|XUV400 EV|XUV500|XUV700|Xylo",
  ],
  [
    "honda",
    "Honda",
    "Honda Cars",
    "Accord|Amaze|BR-V|Brio|City|City e:HEV|Civic|CR-V|Elevate|HR-V|Insight|Jazz|Mobilio|Odyssey|Pilot|Prelude|S2000|WR-V",
  ],
  [
    "toyota",
    "Toyota",
    "Toyota Kirloskar",
    "Alphard|Camry|Corolla|Corolla Altis|Etios|Etios Cross|Etios Liva|FJ Cruiser|Fortuner|Glanza|Hilux|Innova|Innova Crysta|Innova Hycross|Land Cruiser|Land Cruiser 300|Land Cruiser Prado|Prius|Qualis|RAV4|Rumion|Sienna|Supra|Tundra|Urban Cruiser|Urban Cruiser Hyryder|Urban Cruiser Taisor|Vellfire|Yaris",
  ],
  [
    "kia",
    "Kia",
    "Kia Motors",
    "Carens|Carens Clavis|Carnival|EV6|EV9|Seltos|Sonet|Sorento|Sportage|Stinger|Syros",
  ],
  [
    "ford",
    "Ford",
    "Ford India",
    "Aspire|Bronco|Classic|EcoSport|Endeavour|Escort|Everest|Expedition|Explorer|Fiesta|Fiesta Classic|Figo|Figo Aspire|Focus|Freestyle|Fusion|Ikon|Mondeo|Mustang|Mustang Mach-E|Ranger|Territory|Transit",
  ],
  [
    "chevrolet",
    "Chevrolet",
    "Chevy|General Motors",
    "Aveo|Aveo U-VA|Beat|Camaro|Captiva|Corvette|Cruze|Enjoy|Forester|Optra|Optra Magnum|Sail|Sail U-VA|Silverado|Spark|SRV|Suburban|Tahoe|Tavera|Trailblazer|Traverse",
  ],
  [
    "skoda",
    "Skoda",
    "Škoda",
    "Enyaq|Enyaq Coupe|Fabia|Karoq|Kodiaq|Kushaq|Kylaq|Laura|Octavia|Octavia RS|Rapid|Slavia|Superb|Yeti",
  ],
  [
    "volkswagen",
    "Volkswagen",
    "VW",
    "Ameo|Beetle|Cross Polo|Golf|ID.3|ID.4|ID. Buzz|Jetta|Passat|Phaeton|Polo|Polo GTI|Taigun|Tayron|Tiguan|Tiguan Allspace|Touareg|Vento|Virtus",
  ],
  [
    "renault",
    "Renault",
    "Renault India",
    "Arkana|Austral|Captur|Duster|Fluence|Kiger|Koleos|Kwid|Lodgy|Logan|Megane|Pulse|Scala|Triber|Zoe",
  ],
  [
    "nissan",
    "Nissan",
    "Nissan Motor",
    "350Z|370Z|Evalia|GT-R|Juke|Kicks|Leaf|Magnite|Micra|Micra Active|Navara|Patrol|Qashqai|Sunny|Teana|Terrano|X-Trail|Z",
  ],
  ["datsun", "Datsun", "", "240Z|510|GO|GO Plus|redi-GO"],
  [
    "mg",
    "MG",
    "Morris Garages|MG Motor|JSW MG",
    "Astor|Comet EV|Cyberster|Gloster|Hector|Hector Plus|M9|MG3|MG4|MG5|MG6|MG7|Windsor EV|ZS EV",
  ],
  [
    "jeep",
    "Jeep",
    "",
    "Avenger|Cherokee|Compass|Gladiator|Grand Cherokee|Grand Cherokee L|Meridian|Patriot|Renegade|Wrangler",
  ],
  [
    "fiat",
    "Fiat",
    "Fiat India",
    "500|500L|500X|Adventure|Avventura|Grande Punto|Linea|Palio|Palio Stile|Petra|Punto|Punto Evo|Siena|Uno|Urban Cross",
  ],
  [
    "abarth",
    "Abarth",
    "Fiat Abarth",
    "124 Spider|500|595|695|Grande Punto|Punto Evo",
  ],
  [
    "bmw",
    "BMW",
    "Bayerische Motoren Werke",
    "1 Series|2 Series|2 Series Gran Coupe|3 Series|3 Series Gran Turismo|4 Series|5 Series|5 Series Gran Turismo|6 Series|6 Series Gran Turismo|7 Series|8 Series|i3|i4|i5|i7|i8|iX|iX1|iX3|M2|M3|M4|M5|M6|M8|X1|X2|X3|X3 M|X4|X4 M|X5|X5 M|X6|X6 M|X7|XM|Z3|Z4",
  ],
  [
    "mercedes",
    "Mercedes-Benz",
    "Mercedes|Benz|Mercedes Benz|Maybach",
    "A-Class|A-Class Limousine|AMG GT|B-Class|C-Class|CL|CLA|CLK|CLS|E-Class|EQA|EQB|EQC|EQE|EQE SUV|EQS|EQS SUV|G-Class|GL|GLA|GLB|GLC|GLC Coupe|GLE|GLE Coupe|GLS|Maybach GLS|Maybach S-Class|ML-Class|R-Class|S-Class|SL|SLC|SLK|V-Class|Viano|Vito",
  ],
  [
    "audi",
    "Audi",
    "",
    "A1|A2|A3|A4|A5|A6|A7|A8|e-tron|e-tron GT|Q2|Q3|Q3 Sportback|Q4 e-tron|Q5|Q6 e-tron|Q7|Q8|Q8 e-tron|R8|RS3|RS4|RS5|RS6|RS7|RS Q8|S3|S4|S5|TT",
  ],
  [
    "volvo",
    "Volvo",
    "Volvo Cars",
    "C40 Recharge|EX30|EX40|EX90|S40|S60|S80|S90|V40|V40 Cross Country|V60|V90 Cross Country|XC40|XC40 Recharge|XC60|XC90",
  ],
  [
    "landrover",
    "Land Rover",
    "LandRover|Range Rover|JLR",
    "Defender|Discovery|Discovery Sport|Freelander|Freelander 2|Range Rover|Range Rover Evoque|Range Rover Sport|Range Rover Velar",
  ],
  [
    "jaguar",
    "Jaguar",
    "JLR",
    "E-Pace|F-Pace|F-Type|I-Pace|S-Type|XE|XF|XJ|XK|X-Type",
  ],
  ["lexus", "Lexus", "", "ES|GS|GX|IS|LC|LM|LS|LX|NX|RC|RX|RZ|UX"],
  [
    "porsche",
    "Porsche",
    "",
    "718 Boxster|718 Cayman|911|Boxster|Carrera GT|Cayenne|Cayenne Coupe|Cayman|Macan|Panamera|Taycan",
  ],
  [
    "mini",
    "MINI",
    "Mini Cooper",
    "3 Door|5 Door|Aceman|Clubman|Convertible|Cooper|Cooper S|Cooper SE|Countryman|Paceman",
  ],
  [
    "citroen",
    "Citroen",
    "Citroën",
    "Aircross|Basalt|Berlingo|C3|C3 Aircross|C4|C5 Aircross|eC3|SpaceTourer",
  ],
  [
    "peugeot",
    "Peugeot",
    "",
    "205|206|207|208|306|307|308|309|405|407|408|508|2008|3008|5008|Partner",
  ],
  [
    "isuzu",
    "Isuzu",
    "",
    "D-Max|D-Max S-Cab|D-Max V-Cross|Hi-Lander|MU-7|mu-X|Trooper",
  ],
  [
    "mitsubishi",
    "Mitsubishi",
    "",
    "ASX|Cedia|Cedia Sports|Challenger|Eclipse Cross|Lancer|Lancer Evolution|Mirage|Montero|Outlander|Pajero|Pajero Sport|Space Wagon|Triton",
  ],
  [
    "force",
    "Force Motors",
    "Force|Bajaj Tempo",
    "Force One|Gurkha|Gurkha 5 Door|Trax|Trax Cruiser|Trax Toofan|Traveller|Urbania",
  ],
  [
    "byd",
    "BYD",
    "Build Your Dreams",
    "Atto 3|Dolphin|e6|eMAX 7|Han|Seal|Sealion 7|Song Plus|Tang",
  ],
  ["tesla", "Tesla", "", "Cybertruck|Model 3|Model S|Model X|Model Y|Roadster"],
  ["vinfast", "VinFast", "Vin Fast", "VF 6|VF 7|VF 8|VF 9|VF e34"],
  [
    "hindustan",
    "Hindustan Motors",
    "HM|Hindustan",
    "1800 ISZ|Ambassador|Ambassador Avigo|Contessa|Lancer|Pajero",
  ],
  ["premier", "Premier", "Premier Automobiles", "118 NE|137D|Padmini|Rio"],
  [
    "opel",
    "Opel",
    "",
    "Astra|Corsa|Corsa Sail|Corsa Swing|Insignia|Vectra|Zafira",
  ],
  ["daewoo", "Daewoo", "", "Cielo|Leganza|Matiz|Nexia|Nubira"],
  ["standard", "Standard", "Standard Motors", "10|2000|Gazelle|Herald|Pennant"],
  [
    "ssangyong",
    "SsangYong",
    "KGM|KG Mobility",
    "Actyon|Korando|Kyron|Musso|Rexton|Rexton W|Tivoli",
  ],
  ["icml", "ICML", "International Cars and Motors", "Extreme|Rhino"],
  ["san", "San Motors", "San", "Storm"],
  ["ashokleyland", "Ashok Leyland", "", "Bada Dost|Dost|MiTR|Partner|Stile"],
  ["bajaj", "Bajaj", "", "Qute"],
  [
    "ferrari",
    "Ferrari",
    "",
    "296|360|458 Italia|488 GTB|812 Superfast|California|F8 Tributo|GTC4Lusso|Portofino|Purosangue|Roma|SF90 Stradale",
  ],
  [
    "lamborghini",
    "Lamborghini",
    "Lambo",
    "Aventador|Countach|Diablo|Gallardo|Huracan|Murcielago|Revuelto|Urus",
  ],
  [
    "maserati",
    "Maserati",
    "",
    "Ghibli|GranCabrio|GranTurismo|Grecale|Levante|MC20|Quattroporte",
  ],
  [
    "bentley",
    "Bentley",
    "",
    "Arnage|Azure|Bentayga|Brooklands|Continental GT|Continental GTC|Flying Spur|Mulsanne",
  ],
  [
    "rollsroyce",
    "Rolls-Royce",
    "Rolls Royce",
    "Corniche|Cullinan|Dawn|Ghost|Phantom|Silver Shadow|Silver Spirit|Spectre|Wraith",
  ],
  [
    "astonmartin",
    "Aston Martin",
    "",
    "DB7|DB9|DB11|DB12|DBS|DBX|Rapide|Vanquish|Vantage|Virage",
  ],
  [
    "mclaren",
    "McLaren",
    "",
    "540C|570S|600LT|650S|675LT|720S|750S|765LT|Artura|GT|GTS",
  ],
  ["bugatti", "Bugatti", "", "Chiron|Divo|Tourbillon|Veyron"],
  ["lotus", "Lotus", "", "Eletre|Elise|Emeya|Emira|Evora|Exige"],
  [
    "subaru",
    "Subaru",
    "",
    "BRZ|Forester|Impreza|Legacy|Outback|WRX|XV Crosstrek",
  ],
  [
    "suzuki",
    "Suzuki (imports)",
    "Suzuki|Suzuki Japan",
    "Alto|Baleno|Cappuccino|Celerio|Escudo|Grand Vitara|Ignis|Jimny|Kizashi|Solio|Spacia|Swift|SX4|Vitara|Wagon R|XBEE",
  ],
  ["daihatsu", "Daihatsu", "", "Charade|Copen|Mira|Rocky|Terios|Xenia"],
  [
    "mazda",
    "Mazda",
    "",
    "2|3|6|CX-3|CX-5|CX-7|CX-8|CX-9|CX-30|CX-50|CX-60|CX-90|MX-5|RX-7|RX-8",
  ],
  ["infiniti", "Infiniti", "", "Q30|Q50|Q60|Q70|QX30|QX50|QX60|QX70|QX80"],
  [
    "chrysler",
    "Chrysler",
    "",
    "300|300C|Grand Voyager|Pacifica|PT Cruiser|Voyager",
  ],
  [
    "dodge",
    "Dodge",
    "",
    "Avenger|Caliber|Challenger|Charger|Durango|Journey|Nitro|Ram 1500|Viper",
  ],
  ["cadillac", "Cadillac", "", "ATS|CT4|CT5|CTS|Escalade|SRX|XT4|XT5|XT6"],
  ["genesis", "Genesis", "", "G70|G80|G90|GV60|GV70|GV80"],
  ["smart", "Smart", "", "#1|#3|Forfour|Fortwo"],
  ["saab", "Saab", "", "900|9000|9-3|9-5|9-7X"],
  ["seat", "SEAT", "", "Alhambra|Ateca|Ibiza|Leon"],
  ["hummer", "Hummer", "", "EV Pickup|EV SUV|H1|H2|H3"],
  ["gmc", "GMC", "", "Acadia|Hummer EV|Sierra|Terrain|Yukon"],
  ["ineos", "Ineos", "", "Grenadier|Quartermaster"],
  ["rivian", "Rivian", "", "R1S|R1T"],
];

export const VEHICLE_CATALOG = Object.freeze(
  entries
    .map(([id, name, aliases, models]) =>
      Object.freeze({
        id,
        name,
        aliases: Object.freeze(aliases.split("|").filter(Boolean)),
        models: Object.freeze(
          models
            .split("|")
            .sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
        ),
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "en")),
);
export const CATALOG_COUNTS = Object.freeze({
  brands: VEHICLE_CATALOG.length,
  models: VEHICLE_CATALOG.reduce((n, b) => n + b.models.length, 0),
});
const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function findBrand(value) {
  const term = normalize(value);
  const matches = VEHICLE_CATALOG.filter((b) =>
    [b.name, ...b.aliases].some((name) => normalize(name) === term),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export function searchVehicles(value, limit = 40) {
  const words = String(value)
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
  if (!words.length) return [];
  const hits = [];
  for (const brand of VEHICLE_CATALOG)
    for (const model of brand.models) {
      const text = normalize([brand.name, ...brand.aliases, model].join(" "));
      if (words.every((word) => text.includes(word))) {
        hits.push({ brandId: brand.id, brand: brand.name, model });
        if (hits.length >= limit) return hits;
      }
    }
  return hits;
}
export function vehicleYears(now = new Date()) {
  const year = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  return Array.from({ length: year + 2 - 1950 }, (_, i) => year + 1 - i);
}
export const FUEL_OPTIONS = Object.freeze([
  ["petrol", "Petrol"],
  ["diesel", "Diesel"],
  ["cng", "CNG / Petrol + CNG"],
  ["electric", "Electric"],
  ["hybrid", "Hybrid / Plug-in hybrid"],
  ["other", "Other / Not known yet"],
]);
