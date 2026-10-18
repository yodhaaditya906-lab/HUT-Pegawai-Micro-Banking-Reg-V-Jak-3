import sharp from 'sharp';

async function makeMaskedSuit() {
  const width = 420;
  const height = 460;

  const suitMaskSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="suitCut">
          <rect width="${width}" height="${height}" fill="black" />
          <path d="
            M 172,36
            C 188,48 232,48 248,36
            C 275,54 315,80 355,115
            C 380,140 398,175 404,220
            C 408,260 410,340 412,460
            L 8,460
            C 10,340 12,260 16,220
            C 22,175 40,140 65,115
            C 105,80 145,54 172,36
            Z
          " fill="white" />
        </mask>
      </defs>
      <rect width="${width}" height="${height}" fill="white" mask="url(#suitCut)" />
    </svg>`
  );

  await sharp('public/assets/suit_crop_test.jpg')
    .composite([{ input: suitMaskSvg, blend: 'dest-in' }])
    .png()
    .toFile('public/assets/f1_racing_suit_overlay.png');

  console.log('PERFECT: public/assets/f1_racing_suit_overlay.png');
}

makeMaskedSuit();
