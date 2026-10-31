# Car Repair Wala — Your Car. Our Care. · v2.2.1

Live website: https://shanipratapsingh018.github.io/Project/
Services page: https://shanipratapsingh018.github.io/Project/services.html

Naya version kholne ke liye URL ke end mein `?v=2.2.1` laga sakte ho.
GitHub Pages static website hai; live update `gh-pages` branch par push hone ke baad automatically deploy hota hai.

# Website kaise chalayein

1. Source ZIP extract karein.
2. Node.js 18 ya newer install hona chahiye.
3. Project folder mein terminal kholkar `npm start` chalayein.
4. Terminal mein jo address aaye, use browser mein kholein.

`npm install` ki zaroorat nahi hai. Website ke fonts aur images ZIP mein hain.

## Hosting par upload

- Hosting-ready ZIP ko `public_html` mein extract karein. `index.html` aur `assets/`
  seedhe `public_html` ke andar hon, kisi extra folder ke andar nahi.
- Source version mein `public/assets/js/config.js` ka `business.siteUrl` apne asli
  HTTPS domain par set karke `npm run build` chalayein. Phir updated `public/` upload karein.
- SSL/HTTPS enable karein. Apna phone number, workshop address, opening hours aur terms verify karein.
- Domain set hone tak search-engine indexing band hai, taaki example.com ke galat URLs publish na hon.

## Booking kaise aayegi

Main Book Service form submit hone par request Supabase mein save hoti hai aur Admin → Bookings mein dikhti hai.
Garage date, slot aur quotation confirm karta hai. WhatsApp buttons aur service-page quick forms mein Send dabana ab bhi zaroori hai.
Owner login footer se khulta hai: customers, job cards, invoices aur manual payments manage kar sakte hain. Online payment collection abhi enabled nahi hai.

## Reviews aur Google listing

Doosre garage ke reviews aur unki rating hata di gayi hai. Abhi website genuine Car Repair Wala
customers se feedback maangti hai; Share Your Experience WhatsApp kholta hai.

Address: Shop No. 1, Sobhag Bagh, Pipliya Rau, Opp. Regional Park Road, Pawan Putra Nagar, Indore, Madhya Pradesh 452012.
Google location link: https://share.google/WnVvAG5hBsKbOV8j9. Apni existing listing ki verification Google account mein check karein.
Address, PIN aur Google location website par updated hain. Direct Ask for reviews link alag se add hota hai.
Invoices ke liye Admin → Settings → Use workshop address par click karein, billing details check karke confirmation box tick karein aur Save settings dabayein.

## v1.7.0 updates

- Homepage aur About par selected AI garage image lag gayi hai; mobile par bhi dikhti hai.
- Hours: roz subah 7:00 se raat 11:30 (IST).
- Reviews page par form hai: naam, 1–5 stars, car/service aur feedback. Prepare ke baad WhatsApp mein Send dabana zaroori hai.
- Publish permission optional hai; private feedback website par publish na karein. Approved, permitted reviews `reviews.js` mein add hote hain.
- Owner ka Google share link alag "Car Repair Wala on Google" button mein connected hai. Direct Ask for reviews URL milne par `googleReviewUrl` mein add karein.

## v1.8.0

Before & After ka naam Service Gallery hai. Header aur har gallery card mein Call Now hai.
Homepage calculator ke neeche 10 service photos ka slider hai: Next/Previous, keyboard aur
mobile swipe supported hain. Image example labels owner ke kehne par hata diye hain;
source information data files mein sahi rakhi gayi hai.

## v1.9.0

Homepage se alag workshop photo hata di hai. Ab introduction aur calculator ke neeche
ek hi full-width slider hai, total 20 service/repair photos ke saath. Next/Previous aur
mobile swipe pehle jaise hain. Home button ka orange rang har page par same hai.

## Admin vehicle selection

Customers → Open customer → Add vehicle mein brand/model search ya dropdown use karein.
Bookings → Add enquiry mein bhi wahi fields hain. Year aur fuel select karein; vehicle
list mein na mile to Other brand / Other model se naam type karke save kar sakte hain.
