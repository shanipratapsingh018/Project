# Garagewala — Nice Car Mechanic

Live website: https://shanipratapsingh018.github.io/Project/
Services page: https://shanipratapsingh018.github.io/Project/services.html

Naya version kholne ke liye URL ke end mein `?v=garagewala-1.6` laga sakte ho.
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

Customer form bharta hai; website WhatsApp message taiyar karti hai. Customer ko
WhatsApp mein Send dabana hota hai. Uske baad garage slot aur final quote confirm karta hai.
Website mein abhi payment, database ya admin dashboard nahi hai.

## Reviews aur Google listing

Doosre garage ke reviews aur unki rating hata di gayi hai. Abhi website genuine Garagewala
customers se feedback maangti hai; Share Your Experience WhatsApp kholta hai.

Address: Front of Regional Park, Indore. Maps button landmark-address search hai, verified
Garagewala Google listing nahi. Apne Google account se https://business.google.com/create
par Garagewala ki apni listing create/claim aur verify karo. Kisi aur garage ka profile claim
ya rename mat karo. Exact entrance pin, postal code aur hours owner ko fill karne hain.
Verification ke baad Maps sharing aur Ask for reviews links website mein connect kiye ja sakte hain.
