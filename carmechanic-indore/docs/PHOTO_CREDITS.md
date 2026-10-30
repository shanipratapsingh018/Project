# Website image sources

The homepage (`workshop-hero`) and About page (`workshop-cars`) use the same
AI-generated Indian garage scene selected by the owner. It depicts shelves of spare parts,
engine servicing and suspension work. It is an illustration, not a photograph of the actual
Garagewala premises or staff. At the owner’s request, visible image example captions are removed throughout the site in v1.8.0. Source information
remains in the image alt text, manifest and this document.

Responsive WebP assets are bundled locally at 800 and 1600 pixels wide:
`public/assets/img/photos/garagewala-workshop-{800,1600}.webp`.
The original generated PNG is preserved in the repository download archive and execution workspace.
No external image service is needed to display these images.

The remaining photo slots and optional Unsplash source credits are recorded in `tools/photos.json`.
They use existing bundled illustrative examples when stock files are absent. Their source remains recorded in the manifest. The optional `npm run photos`
command downloads stock slots only and skips the generated workshop image.

The Service Gallery uses owner-supplied illustrative pairs with source information retained in `gallery.js`. Add actual customer-job photographs
only with permission and label their source accurately.

## Homepage service carousel

Ten AI-generated service scenes are bundled at 800 and 1600 pixels wide under
`public/assets/img/workshop/`. The scene list, original generated file names and source status
are recorded in `tools/workshop-photos.json`. Two new scenes depict engine overhaul and AC
diagnostics; the other eight reuse the previously generated garage/service images. The files
are responsive WebP encodings; original PNGs in the execution workspace are unchanged.

These pictures do not document actual Garagewala jobs or staff. UI labels were removed at
the owner's request; source information and `kind: "illustrative"` records are retained.
