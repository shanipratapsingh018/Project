# Website image sources

The homepage (`workshop-hero`) and About page (`workshop-cars`) use the same
AI-generated Indian garage scene selected by the owner. It depicts shelves of spare parts,
engine servicing and suspension work. It is an illustration, not a photograph of the actual
Garagewala premises or staff. Both placements have a visible AI illustration caption.

Responsive WebP assets are bundled locally at 800 and 1600 pixels wide:
`public/assets/img/photos/garagewala-workshop-{800,1600}.webp`.
The original generated PNG is preserved in the repository download archive and execution workspace.
No external image service is needed to display these images.

The remaining photo slots and optional Unsplash source credits are recorded in `tools/photos.json`.
They use existing bundled illustrative examples when stock files are absent. Those captions
identify the images as examples rather than customer vehicles. The optional `npm run photos`
command downloads stock slots only and skips the generated workshop image.

The before/after gallery uses labelled illustrative pairs. Add actual customer-job photographs
only with permission and label their source accurately.
