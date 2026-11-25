// Shared, factual SEO metadata. No invented reviews, coordinates or fixed-price offers.
const COPY = {
  'index.html': ['Car Service & Repair Garage in Indore | Car Repair Wala', 'Multi-brand car garage on AB Road, Choithram Mandi, Indore. Car service, AC, denting and repairs with free pickup and drop. Open daily 7 AM–11:30 PM.', 'Home'],
  'services.html': ['Car Service & Repair Prices Indore | Car Repair Wala', 'Compare 69 car service and repair options in Indore. View indicative prices by vehicle category and request a quote from Car Repair Wala.', 'Services & Prices'],
  'car-service-indore.html': ['Periodic Car Service in Indore, All Brands | Car Repair Wala', 'Basic, standard and comprehensive car service in Indore for Maruti, Hyundai, Tata, Mahindra and more. Hatchback basic service from ₹2,200. Free pickup.', 'Car servicing'],
  'car-ac-repair-indore.html': ['Car AC Service, Repair & Gas Filling Indore | Car Repair Wala', 'Car AC gas filling, AC service and cooling repairs in Indore. Leak test before gas refill, gas filling from ₹900 for hatchbacks. Free pickup and drop.', 'Car AC repair'],
  'brake-clutch-repair-indore.html': ['Car Brake & Clutch Plate Repair in Indore | Car Repair Wala', 'Car brake repair, brake pad change and clutch plate replacement in Indore. Front brake pads from ₹1,400 for hatchbacks. See the worn part first.', 'Brake & clutch'],
  'engine-diagnostics-indore.html': ['Engine Diagnostics in Indore | Car Repair Wala', 'Check-engine light, OBD scanning and engine fault diagnosis at Car Repair Wala in Indore. Get the cause explained before approving repairs.', 'Engine diagnostics'],
  'car-battery-electrical-indore.html': ['Car Battery Replacement in Indore | Car Repair Wala', 'Car battery replacement in Indore with a battery test first. New battery with fitting from ₹3,400 for hatchbacks, plus wiring and lighting repairs.', 'Battery & electrical'],
  'suspension-steering-repair-indore.html': ['Suspension & Steering Repair Indore | Car Repair Wala', 'Suspension checks, shock absorbers, steering repairs and wheel alignment at Car Repair Wala in Indore. Final costs are confirmed after inspection.', 'Suspension & steering'],
  'denting-painting-indore.html': ['Car Denting Painting & Scratch Removal Indore | Car Repair Wala', 'Car dent repair, scratch removal and colour-matched panel painting in Indore. Dent and paint from ₹2,000 per panel for hatchbacks. Approve the quote first.', 'Denting & painting'],
  'car-detailing-indore.html': ['Car Detailing & Interior Cleaning in Indore | Car Repair Wala', 'Car interior deep cleaning, rubbing and polishing in Indore. Seat and roof shampoo, odour treatment and machine polish. Pre-purchase car inspection too.', 'Car detailing'],
  'accident-repair-indore.html': ['Accident Car Repair Indore | Car Repair Wala', 'Request an accident-damage inspection at Car Repair Wala in Indore. Body, paint and glass repairs are quoted after checking the vehicle.', 'Accident repair'],
  'estimate.html': ['Car Service Cost Calculator Indore | Car Repair Wala', 'Estimate car service and repair costs in Indore by vehicle, fuel, services and parts grade. Review the range before booking with Car Repair Wala.', 'Cost calculator'],
  'booking.html': ['Book Car Service in Indore | Car Repair Wala', 'Send a car service request to Car Repair Wala in Indore. Choose your vehicle, services, parts preference, pickup details and preferred time.', 'Booking'],
  'contact.html': ['Contact Car Repair Wala | Choithram Mandi, Indore', 'Call Car Repair Wala on +91 89659 57978 or visit 17, AB Road, Choithram Mandi, Indore 452012. Find the workshop link, hours and booking options.', 'Contact'],
  'about.html': ['About Car Repair Wala | Car Garage in Indore', 'Learn about Car Repair Wala, a multi-brand garage at Choithram Mandi, Indore, with service estimates, inspection-led quotes and customer approval.', 'About us'],
  'pickup-drop.html': ['Car Pickup & Drop Areas Indore | Car Repair Wala', 'Check your PIN for Car Repair Wala pickup and drop in Indore. Listed areas are subject to availability and booking confirmation.', 'Pickup & drop'],
  'gallery.html': ['Car Service Gallery Indore | Car Repair Wala', 'Explore the Car Repair Wala service gallery for car servicing, mechanical repairs, detailing and bodywork options in Indore.', 'Service Gallery'],
  'reviews.html': ['Customer Feedback Indore | Car Repair Wala', 'Share your Car Repair Wala service experience in Indore. Website feedback is published only with customer permission and garage approval.', 'Reviews'],
  'car-wash-indore.html': ['Car Wash & Foam Wash in Indore | Car Repair Wala', 'Car foam wash in Indore from ₹300 for hatchbacks, with interior vacuum, deep cleaning and polishing add-ons. AB Road, Choithram Mandi. Open 7 AM–11:30 PM.', 'Car wash'],
  'car-service-vijay-nagar-indore.html': ['Car Service in Vijay Nagar, Indore | Car Repair Wala', 'Car service and repair for Vijay Nagar, Nipania and DDU Nagar with free pickup and drop to our AB Road workshop. See prices online, approve before work.', 'Car service in Vijay Nagar'],
  'maruti-car-service-indore.html': ['Maruti Suzuki Car Service in Indore | Car Repair Wala', 'Maruti Suzuki car service in Indore at an independent garage. Swift, Baleno, Dzire, Ertiga, Brezza and more. Basic service from ₹2,200. Free pickup.', 'Maruti car service'],
  'car-service-rajendra-nagar-indore.html': ['Car Service in Rajendra Nagar, Indore | Car Repair Wala', 'Car service and repair about 5 km from Rajendra Nagar at 17, AB Road, Choithram Mandi, Indore. Free pickup and drop for PIN 452012. Open till 11:30 PM.', 'Car service in Rajendra Nagar'],
  'hyundai-car-service-indore.html': ['Hyundai Car Service in Indore | Car Repair Wala', 'Hyundai car service in Indore at an independent garage. Creta, Venue, i20, Grand i10 Nios, Verna and Exter. Petrol, diesel and automatic. Free pickup.', 'Hyundai car service'],
  '404.html': ['Page Not Found | Car Repair Wala', 'This page could not be found. Visit the Car Repair Wala home page for services, estimates and contact information.', 'Page not found']
};
const WEEK = {Mo:'Monday',Tu:'Tuesday',We:'Wednesday',Th:'Thursday',Fr:'Friday',Sa:'Saturday',Su:'Sunday'};
export function createSeo({file,title,description,business:B,siteUrl,services=[],ld=[],serviceCount,updated=''}) {
  const copy = COPY[file];
  const meta = {title:copy?.[0] || title, description:copy?.[1] || description, name:copy?.[2] || title.split(/\s[|—]\s/)[0]};
  if(file==='services.html' && Number.isSafeInteger(serviceCount)) meta.description=meta.description.replace('69',String(serviceCount));
  const canonical = siteUrl ? siteUrl+'/'+(file==='index.html'?'':file) : '';
  const indexable = !!siteUrl && file!=='404.html';
  const robots = indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow';
  if (!siteUrl || file==='404.html') return {...meta,canonical:'',indexable,robots,schemas:[],image:null};
  const home=siteUrl+'/', absolute=path=>siteUrl+'/'+path;
  const businessId=home+'#business', websiteId=home+'#website';
  const logo={ '@context':'https://schema.org', '@type':'ImageObject', '@id':home+'#logo',url:absolute('assets/img/car-repair-wala-logo.png'),contentUrl:absolute('assets/img/car-repair-wala-logo.png'),width:1254,height:1254,caption:B.name+' logo'};
  const business={
    '@context':'https://schema.org','@type':'AutoRepair','@id':businessId,
    name:B.name,alternateName:[B.name+' '+B.city,'CarRepairWala',...(B.nameHi?[B.nameHi]:[])],url:home,telephone:B.phoneE164,priceRange:'₹₹',currenciesAccepted:'INR',
    description:`Multi-brand car servicing, maintenance, diagnostics and repairs in ${B.city} with inspection-led estimates and customer approval.`,
    address:{'@type':'PostalAddress',...(B.address?{streetAddress:[B.address.street,B.address.locality].filter(Boolean).join(', '),postalCode:B.address.pincode}:{}),addressLocality:B.city,addressRegion:B.state,addressCountry:B.country},
    areaServed:[{'@type':'City',name:B.city},...(B.areasServed||[]).map(name=>({'@type':'Place',name:name+', '+B.city}))],logo:{'@id':logo['@id']},image:[absolute('assets/img/photos/car-repair-wala-workshop-1600.webp'),{'@id':logo['@id']}],
    hasOfferCatalog:{'@type':'OfferCatalog',name:'Car servicing and repairs',itemListElement:services.map(p=>({'@type':'Offer',itemOffered:{'@type':'Service','@id':absolute(p.file)+'#service',name:p.h1,url:absolute(p.file),provider:{'@id':businessId}}}))}
  };
  if (B.hours) {
    business.openingHours=B.hours.map(h=>`${h.days} ${h.open}-${h.close}`);
    business.openingHoursSpecification=B.hours.map(h=>{
      const [from,to=from]=h.days.split('-'), keys=Object.keys(WEEK), start=keys.indexOf(from), end=keys.indexOf(to);
      if(start<0||end<start)throw new Error('Unsupported opening-hours day range: '+h.days);
      return {'@type':'OpeningHoursSpecification',dayOfWeek:keys.slice(start,end+1).map(day=>'https://schema.org/'+WEEK[day]),opens:h.open,closes:h.close};
    });
  }
  if(B.googleBusinessProfileUrl)business.hasMap=B.googleBusinessProfileUrl;
  else if(B.googleMapsSearchUrl)business.hasMap=B.googleMapsSearchUrl;
  const sameAs=[B.googleBusinessProfileUrl,B.instagramUrl].filter(Boolean);
  if(sameAs.length)business.sameAs=sameAs;
  if(B.geo)business.geo={'@type':'GeoCoordinates',latitude:B.geo.lat,longitude:B.geo.lng};
  if(B.email)business.email=B.email;
  const owner=B.ownerName?{'@context':'https://schema.org','@type':'Person','@id':home+'#owner',name:B.ownerName,jobTitle:'Owner',worksFor:{'@id':businessId}}:null;
  if(owner)business.employee={'@id':owner['@id']};
  const website={'@context':'https://schema.org','@type':'WebSite','@id':websiteId,url:home,name:B.name,alternateName:B.name+' '+B.city,inLanguage:['en-IN','hi-IN'],publisher:{'@id':businessId}};
  const pageType=file==='contact.html'?'ContactPage':file==='about.html'?'AboutPage':['services.html','gallery.html','reviews.html'].includes(file)?'CollectionPage':'WebPage';
  const isService=services.some(p=>p.file===file);
  const page={'@context':'https://schema.org','@type':pageType,'@id':canonical+'#webpage',url:canonical,name:meta.title,description:meta.description,inLanguage:'en-IN',isPartOf:{'@id':websiteId},about:{'@id':businessId},publisher:{'@id':businessId},primaryImageOfPage:{'@id':logo['@id']},mainEntity:{'@id':isService?canonical+'#service':businessId}};
  if(updated)page.dateModified=updated;
  if(owner)page.author={'@id':owner['@id']};
  const extras=ld.filter(item=>item['@type']!=='BreadcrumbList').map(item=>item['@type']==='Service'?{...item,'@id':canonical+'#service',url:canonical,provider:{'@id':businessId}}:item);
  const schemas=[business,website,logo,page,...(owner?[owner]:[]),...extras];
  if(file!=='index.html'){
    const crumbs=[{name:'Home',item:home},...(isService?[{name:'Services',item:absolute('services.html')}]:[]),{name:meta.name,item:canonical}];
    const id=canonical+'#breadcrumb';page.breadcrumb={'@id':id};
    schemas.push({'@context':'https://schema.org','@type':'BreadcrumbList','@id':id,itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,...c}))});
  }
  return {...meta,canonical,indexable,robots,schemas,image:logo};
}
export const jsonLd = value => JSON.stringify(value).replace(/</g,'\\u003c');
