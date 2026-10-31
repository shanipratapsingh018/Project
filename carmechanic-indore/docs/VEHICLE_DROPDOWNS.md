# Admin vehicle dropdowns · v2.1.0

Vehicle entry is available in **Customers → Open customer → Add vehicle / Edit**
and **Bookings → Add enquiry / Edit enquiry**.

The built-in catalogue contains **70 brands and 847 model names**, including
Indian-market vehicles, discontinued cars and imports. It is a curated list for
administrative selection, not an exhaustive global catalogue, live availability
feed, VIN decoder, specification/variant database or parts-fitment guide.

## Using the fields

1. Search a make or model, such as `Maruti Swift`, `Toyota Innova` or `VW Polo`,
   then select a result. Alternatively, choose **Brand**, then **Car model**.
2. Choose the actual year and fuel. The catalogue makes no year/fuel assumptions.
3. Enter the registration if known. Lowercase letters are converted to uppercase.
4. Add variant/trim, transmission, engine or inspection details in the notes as needed.
5. Save the vehicle or enquiry. Private data is still protected by owner access rules.

Search shows up to 40 matches; use more specific words to narrow the results.
Selecting a different brand clears the model selection so it cannot silently
retain the previous brand's model.

**Other brand / Other model** accepts any name missing from the catalogue.
**Brand not known yet** is available when only the model is known. Year can stay
unknown. The dropdown covers 1950 through next year using Indian Standard Time;
**Other year** permits another integer year within the existing database range
of 1950–2100. For older classics, keep year unknown and record it in notes.
Fuel choices map to the existing petrol, diesel, CNG, electric, hybrid and other
database values; use notes to describe unusual fuels or conversions.

## Saved records

Existing makes/models absent from the catalogue appear as **(saved)** choices.
They stay unchanged during a notes-only edit, including supported saved years
outside the normal dropdown range. No catalogue IDs, search text or UI helper
fields are written into vehicle or booking records.

Job-card and invoice vehicle dropdowns continue to use that customer's saved
vehicles and now include year, fuel and registration in their labels. Catalogue
changes do not rewrite old vehicle records or issued invoice snapshots.

## Maintenance

Edit `admin-app/src/vehicle-catalog.mjs` to extend the catalogue. Model and brand
names must fit the existing 80- and 60-character database limits respectively.
Keep brand IDs unique and model names unique within each brand. The catalogue
does not change public-site pricing or approved service rates.

The UI is in `vehicle-picker.mjs` and is shared by both admin entry flows.
Build with `npm --prefix admin-app run build`, and run
`npm --prefix admin-app test` and `python3 tests/admin_test.py`.
No new database migration, paid vehicle-data API or runtime CDN is required.
