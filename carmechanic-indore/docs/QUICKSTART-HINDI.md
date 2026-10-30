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

## Reviews

Tumhare diye hue dono reviews add hain. The Car Junction ka source naam preserved hai.
4.8 rating / 34 reviews screenshot ka snapshot hai; live update nahi hota.
