# Photo credits

All photos below are stock photos from Unsplash, checked on 29 Oct 2026 as **"Free to use under the Unsplash License"** (https://unsplash.com/license).
The licence allows free commercial use without asking permission; credit isn't required, but the site credits each photographer anyway.
None of them are Unsplash+ (paid) photos.

These are **not** photos of the CarMechanic Indore workshop or customer cars. Every caption on the site says "Stock photo".
Before & After pictures are still drawn illustrations: no free stock source has genuine before/after pairs of the same car.

| Photo ID | Used on | Photographer | Unsplash page |
|---|---|---|---|
| `workshop-hero` | Homepage hero | [Mehmet Talha Onuk](https://unsplash.com/@mtonuk) | https://unsplash.com/photos/mechanics-working-in-automotive-repair-workshop-8t6tk7LYLrE |
| `workshop-cars` | About page | [Winston Chen](https://unsplash.com/@winstonchen) | https://unsplash.com/photos/cars-being-repaired-in-a-workshop-VdXnpwrp1qc |
| `oil-service` | Car servicing | [Dextar Studio](https://unsplash.com/@dextarstudio) | https://unsplash.com/photos/mechanic-pouring-oil-into-car-engine-gW34cv-Ojjs |
| `ac-vent` | Car AC repair | [Philip Blank](https://unsplash.com/@philip_blank) | https://unsplash.com/photos/black-and-silver-car-air-vent--hrsdEdyWUQ |
| `brake-system` | Brake & clutch | [Erik Mclean](https://unsplash.com/@introspectivedsgn) | https://unsplash.com/photos/close-up-of-a-cars-performance-brake-system-EpT-ZetoKm8 |
| `engine-inspection` | Engine diagnostics | [Dextar Studio](https://unsplash.com/@dextarstudio) | https://unsplash.com/photos/mechanic-inspecting-a-car-engine-with-hood-open-erWc6mrOq_I |
| `engine-check` | Battery & electrical | [Kate Ibragimova](https://unsplash.com/@kateibragimova) | https://unsplash.com/photos/mechanic-inspecting-car-engine-bEGTsOCnHro |
| `under-car` | Suspension & steering | [Tahamie Farooqui](https://unsplash.com/@tami171091) | https://unsplash.com/photos/a-man-working-on-a-car-under-a-vehicle-K5624F8cipE |
| `panel-sanding` | Denting & painting | [Zoshua Colah](https://unsplash.com/@zoshuacolah) | https://unsplash.com/photos/person-sanding-car-in-workshop-zyLW2erHdRg |
| `polishing` | Car detailing | [Luay Barani](https://unsplash.com/@luaybarani) | https://unsplash.com/photos/person-polishing-a-blue-cars-hood-with-an-orbital-buffer-iXpjQNP__EQ |
| `dashboard-cleaning` | Car detailing | [Luay Barani](https://unsplash.com/@luaybarani) | https://unsplash.com/photos/detailer-cleaning-the-dashboard-of-a-classic-car-5SmPnmCjwcU |
| `foam-wash` | Car detailing | [Andre Tan](https://unsplash.com/@andredantan19) | https://unsplash.com/photos/sports-car-washing-in-garage-pRppMPh4Zho |
| `accident-damage` | Accident repair | [Clark Van Der Beken](https://unsplash.com/@snapsbyclark) | https://unsplash.com/photos/damaged-silver-car-with-crushed-hood-CSkriQWeTVs |

## Getting the files

This build couldn't download images (image sites are blocked in the environment it was made in), so the photo files aren't in the zip yet.
On your own computer, run:

```bash
npm run photos      # downloads 13 photos × 2 sizes into public/assets/img/photos/
```

Until you do, each page loads the photo straight from Unsplash's image servers (allowed by Unsplash). If that fails too,
the homepage hero shows the illustration and other photos are hidden, so pages never show a broken image.

## Swapping in your own photos

Save your photo as `public/assets/img/photos/<id>-800.jpg` and `<id>-1600.jpg` (same ID as above), then set `"own": true` for
that entry in `tools/photos.json` and run `npm run build`. The "Stock photo" caption is then removed for that picture.
