// Shared, factual SEO metadata. No invented reviews, coordinates or fixed-price offers.
const COPY = {
  'index.html': ['Car Repair Wala: Best Car Service Center & Repair in Indore', 'Car Repair Wala offers multi-brand car service and repairs at 17, AB Road, Choithram Mandi, Indore. View estimates and request a booking.', 'Home'],
  'services.html': ['Car Service & Repair Prices Indore | Car Repair Wala', 'Compare 69 car service and repair options in Indore. View indicative prices by vehicle category and request a quote from Car Repair Wala.', 'Services & Prices'],
  'car-service-indore.html': ['Car Service in Indore | Car Repair Wala', 'Book basic, standard or comprehensive car service at Car Repair Wala, Choithram Mandi, Indore. Compare estimates before approving work.', 'Car servicing'],
  'car-ac-repair-indore.html': ['Car AC Repair in Indore | Car Repair Wala', 'Car AC inspection, leak testing, gas top-up and cooling repairs at Car Repair Wala in Indore. View estimates and request a workshop inspection.', 'Car AC repair'],
  'brake-clutch-repair-indore.html': ['Brake & Clutch Repair Indore | Car Repair Wala', 'Brake pad, brake shoe and clutch repairs at Car Repair Wala in Indore. Compare indicative costs and approve the final quote after inspection.', 'Brake & clutch'],
  'engine-diagnostics-indore.html': ['Engine Diagnostics in Indore | Car Repair Wala', 'Check-engine light, OBD scanning and engine fault diagnosis at Car Repair Wala in Indore. Get the cause explained before approving repairs.', 'Engine diagnostics'],
  'car-battery-electrical-indore.html': ['Car Battery & Electrical Repair Indore | Car Repair Wala', 'Battery testing, replacement and car electrical fault diagnosis at Car Repair Wala, Indore. Contact the workshop for model-specific quotes.', 'Battery & electrical'],
  'suspension-steering-repair-indore.html': ['Suspension & Steering Repair Indore | Car Repair Wala', 'Suspension checks, shock absorbers, steering repairs and wheel alignment at Car Repair Wala in Indore. Final costs are confirmed after inspection.', 'Suspension & steering'],
  'denting-painting-indore.html': ['Car Denting & Painting Indore | Car Repair Wala', 'Explore panel dent removal, bumper work and car painting at Car Repair Wala in Indore. Check indicative estimates and request a damage inspection.', 'Denting & painting'],
  'car-detailing-indore.html': ['Car Detailing in Indore | Car Repair Wala', 'Car wash, interior cleaning, polishing and detailing enquiries at Car Repair Wala in Indore. Compare available services and request a quote.', 'Car detailing'],
  'accident-repair-indore.html': ['Accident Car Repair Indore | Car Repair Wala', 'Request an accident-damage inspection at Car Repair Wala in Indore. Body, paint and glass repairs are quoted after checking the vehicle.', 'Accident repair'],
  'estimate.html': ['Car Service Cost Calculator Indore | Car Repair Wala', 'Estimate car service and repair costs in Indore by vehicle, fuel, services and parts grade. Review the range before booking with Car Repair Wala.', 'Cost calculator'],
  'booking.html': ['Book Car Service in Indore | Car Repair Wala', 'Send a car service request to Car Repair Wala in Indore. Choose your vehicle, services, parts preference, pickup details and preferred time.', 'Booking'],
  'contact.html': ['Contact Car Repair Wala | Choithram Mandi, Indore', 'Call Car Repair Wala on +91 89659 57978 or visit 17, AB Road, Choithram Mandi, Indore 452012. Find the workshop link, hours and booking options.', 'Contact'],
  'about.html': ['About Car Repair Wala | Car Garage in Indore', 'Learn about Car Repair Wala, a multi-brand garage at Choithram Mandi, Indore, with service estimates, inspection-led quotes and customer approval.', 'About us'],
  'pickup-drop.html': ['Car Pickup & Drop Areas Indore | Car Repair Wala', 'Check your PIN for Car Repair Wala pickup and drop in Indore. Listed areas are subject to availability and booking confirmation.', 'Pickup & drop'],
  'gallery.html': ['Car Service Gallery Indore | Car Repair Wala', 'Explore the Car Repair Wala service gallery for car servicing, mechanical repairs, detailing and bodywork options in Indore.', 'Service Gallery'],
  'reviews.html': ['Customer Feedback Indore | Car Repair Wala', 'Share your Car Repair Wala service experience in Indore. Website feedback is published only with customer permission and garage approval.', 'Reviews'],
  '404.html': ['Page Not Found | Car Repair Wala', 'This page could not be found. Visit the Car Repair Wala home page for services, estimates and contact information.', 'Page not found']
};
const WEEK = {Mo:'Monday',Tu:'Tuesday',We:'Wednesday',Th:'Thursday',Fr:'Friday',Sa:'Saturday',Su:'Sunday'};
export function createSeo({file,title,description,business:B,siteUrl,services=[],ld=[],serviceCount}) {
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
    name:B.name,alternateName:[B.name+' '+B.city,'CarRepairWala'],url:home,telephone:B.phoneE164,
    description:`Multi-brand car servicing, maintenance, diagnostics and repairs in ${B.city} with inspection-led estimates and customer approval.`,
    address:{'@type':'PostalAddress',...(B.address?{streetAddress:[B.address.street,B.address.locality].filter(Boolean).join(', '),postalCode:B.address.pincode}:{}),addressLocality:B.city,addressRegion:B.state,addressCountry:B.country},
    areaServed:{'@type':'City',name:B.city},logo:{'@id':logo['@id']},image:{'@id':logo['@id']},
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
  if(B.googleBusinessProfileUrl){business.sameAs=[B.googleBusinessProfileUrl];business.hasMap=B.googleBusinessProfileUrl;}
  else if(B.googleMapsSearchUrl)business.hasMap=B.googleMapsSearchUrl;
  if(B.geo)business.geo={'@type':'GeoCoordinates',latitude:B.geo.lat,longitude:B.geo.lng};
  if(B.email)business.email=B.email;
  const website={'@context':'https://schema.org','@type':'WebSite','@id':websiteId,url:home,name:B.name,alternateName:B.name+' '+B.city,inLanguage:['en-IN','hi-IN'],publisher:{'@id':businessId}};
  const pageType=file==='contact.html'?'ContactPage':file==='about.html'?'AboutPage':['services.html','gallery.html','reviews.html'].includes(file)?'CollectionPage':'WebPage';
  const isService=services.some(p=>p.file===file);
  const page={'@context':'https://schema.org','@type':pageType,'@id':canonical+'#webpage',url:canonical,name:meta.title,description:meta.description,inLanguage:'en-IN',isPartOf:{'@id':websiteId},about:{'@id':businessId},publisher:{'@id':businessId},primaryImageOfPage:{'@id':logo['@id']},mainEntity:{'@id':isService?canonical+'#service':businessId}};
  const extras=ld.filter(item=>item['@type']!=='BreadcrumbList').map(item=>item['@type']==='Service'?{...item,'@id':canonical+'#service',url:canonical,provider:{'@id':businessId}}:item);
  const schemas=[business,website,logo,page,...extras];
  if(file!=='index.html'){
    const crumbs=[{name:'Home',item:home},...(isService?[{name:'Services',item:absolute('services.html')}]:[]),{name:meta.name,item:canonical}];
    const id=canonical+'#breadcrumb';page.breadcrumb={'@id':id};
    schemas.push({'@context':'https://schema.org','@type':'BreadcrumbList','@id':id,itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,...c}))});
  }
  return {...meta,canonical,indexable,robots,schemas,image:logo};
}
export const jsonLd = value => JSON.stringify(value).replace(/</g,'\\u003c');
