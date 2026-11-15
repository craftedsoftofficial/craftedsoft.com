/* =====================================================================
   CraftedSoft: site data. EDIT THIS FILE to change contact details or
   add a product. Everything else (menus, product grids, footer)
   updates by itself.
   ===================================================================== */
window.CS_SITE = {
  /* The website's public address, with a trailing slash, e.g. 'https://craftedsoft.in/' or
     'https://<user>.github.io/<repo>/'. Needed for Google (sitemap.xml, canonical links) and for link
     previews on WhatsApp/LinkedIn. Leave '' until the site is live; the build tells you what's missing. */
  siteUrl: '',

  /* Visitor analytics. Leave provider '' for none (default).
       'cloudflare' → id = the Web Analytics token   (free, no cookies; recommended)
       'plausible'  → id = your site domain           (paid, no cookies)
       'ga4'        → id = 'G-XXXXXXXXXX'              (free, uses cookies)
     Clicks on Book a demo, Download and WhatsApp are reported as events where the provider supports it. */
  analytics: { provider: '', id: '' },

  /* Colour scheme. The site's layout is fixed; its colours come from a scheme.
     scheme:  the default for every visitor ('violet' = the CraftedSoft brand colours, same as the logo).
     schemes: the choices in the colour button in the header (visitors' picks are remembered on their device).
              Each has three colours (a gradient, start to end); 'mono: true' means black & white instead of colour.
     picker:  false hides the colour button, so everyone sees the default scheme. */
  theme: {
    scheme: 'violet',
    picker: true,
    schemes: [
      { id: 'violet', name: 'Violet', colors: ['#4b3cc4', '#5b49d6', '#8b7cff'] },
      { id: 'mono', name: 'Mono', colors: ['#18181b', '#52525b', '#a1a1aa'], mono: true },
      { id: 'aurora', name: 'Aurora', colors: ['#6d5dfc', '#c056f5', '#ff6fa8'] },
      { id: 'ocean', name: 'Ocean', colors: ['#0ea5e9', '#6366f1', '#a855f7'] },
      { id: 'forest', name: 'Forest', colors: ['#10b981', '#14b8a6', '#0ea5e9'] },
      { id: 'sunset', name: 'Sunset', colors: ['#f59e0b', '#f43f5e', '#ec4899'] }
    ]
  },

  /* Contact details. Leave a value empty ('') to hide it.
     whatsapp: country code + number, digits only, e.g. '919876543210'.
     When whatsapp is set, the floating WhatsApp button and the contact form open WhatsApp;
     until then the button explains that the number is coming soon. */
  contact: {
    email: 'craftedsoftofficial@gmail.com',
    phone: '+91 90809 74663',
    whatsapp: '919080974663',
    location: 'India',
    hours: 'Mon–Sat, 9:30 am – 7:00 pm'
  },

  /* Business details used in the Privacy Policy, Terms and other legal pages (legal/).
     Fill these in, then run the build. Empty values are left out of the pages gracefully. */
  legal: {
    businessName: 'CraftedSoft',     // registered/trade name as on your invoices
    businessType: '',                // e.g. 'a partnership firm' or 'a private limited company'
    address: '',                     // registered address
    gstin: '',                       // GSTIN, if registered
    jurisdiction: '',                // city for courts, e.g. 'Coimbatore, Tamil Nadu'
    grievanceOfficer: '',            // name of the person who handles privacy/grievance requests
    grievanceEmail: '',              // defaults to contact.email when empty
    updated: '14 November 2026'      // "last updated" date shown on every legal page
  },

  /* Products, in display order. The first `featured: true` product gets the
     large card on the home page. To add a product:
       1. copy the folder products/chittill/ to products/<slug>/ and edit its index.html,
       2. put its images in assets/img/<slug>/,
       3. add an entry below. */
  products: [
    {
      slug: 'chittill',
      name: 'ChitTill',
      tagline: 'Billing made for clothing stores',
      summary:
        'Fast, offline billing and stock for apparel and men’s wear shops: sizes and colours, GST, offers, loyalty, barcode labels and day close.',
      category: 'Billing & POS',
      // Products page: the industry chip it is filed under, its card colour, the trial line and extra search words.
      industry: 'Retail',
      audience: 'I run a shop', // label on the Products page switcher
      accent: '#5b49d6',
      trial: '7-day free trial',
      keywords: 'shop store clothing apparel garments mens wear textile footwear barcode labels gst pos',
      status: 'available', // 'available' | 'soon'
      platform: 'Windows desktop',
      featured: true,
      icon: 'assets/img/chittill/chittill-icon.webp',
      image: 'assets/img/chittill/dashboard-sm.webp',
      imageDark: 'assets/img/chittill/dark-dashboard-sm.webp',
      tags: ['Works offline', 'GST-ready', 'Barcode & labels'],
      // Shown on the Products page spotlight. Icons: zap, grid, landmark, percent, users, db, printer, ...
      highlights: [
        { icon: 'zap', title: 'Keyboard-first counter', text: 'Scan, pick size and colour, and bill in seconds.' },
        { icon: 'grid', title: 'Stock by size & colour', text: 'Live stock for every variant, right at billing.' },
        { icon: 'landmark', title: 'GST done right', text: 'CGST/SGST or IGST, HSN codes and auditor-ready reports.' }
      ],
      facts: [
        ['monitor', 'Windows 10 & 11'],
        ['wifioff', 'Works offline'],
        ['calendar', '7-day free trial']
      ],
      // Download button (product page, plans, Products page). Remove this block to hide all download buttons.
      download: {
        // Direct link to the installer on GitHub Releases (starts the download).
        // For a new version: upload the new setup file to a new release, then update url, version and size here.
        //   (Or use '#' to show a "download coming soon" message instead.)
        url: 'https://github.com/craftedsoftofficial/chittill-releases/releases/download/v0.1.0/ChitTill-Setup-0.1.0.exe',
        label: 'Download for Windows',
        version: 'v0.1.0',
        platform: 'Windows 10 & 11 · 64-bit',
        size: '124 MB'
      },
      url: 'products/chittill/'
    },
    {
      slug: 'platera',
      name: 'Platera',
      tagline: 'Billing made for restaurants',
      summary:
        'Offline billing for restaurants, cafés, bakeries and bars: tables and KOTs, a kitchen screen, waiters ordering on their phones, table QR ordering and restaurant GST.',
      category: 'Billing & POS',
      industry: 'Restaurants & cafés',
      audience: 'I run a restaurant',
      accent: '#f26b1d',
      trial: '14-day free trial',
      keywords: 'restaurant cafe bakery bar hotel food kot kitchen display tables waiter captain qr menu gst pos',
      isNew: true, // shows a "New" badge on its card
      status: 'available',
      platform: 'Windows desktop',
      icon: 'assets/img/platera/platera-icon.webp',
      image: 'assets/img/platera/tables-sm.webp',
      imageDark: 'assets/img/platera/dark-tables-sm.webp',
      tags: ['Tables & KOTs', 'Kitchen screen', 'QR ordering'],
      highlights: [
        { icon: 'grid', title: 'Tables & KOTs', text: 'Every table’s status, KOTs per kitchen station, move, merge and split.' },
        { icon: 'monitor', title: 'Kitchen screen', text: 'Colour-coded tickets on any TV or tablet over your Wi-Fi.' },
        { icon: 'users', title: 'Captain app & table QR', text: 'Waiters order on their phones; guests scan, see the menu and order.' }
      ],
      facts: [
        ['monitor', 'Windows 10 & 11'],
        ['wifioff', 'Works offline'],
        ['calendar', '14-day free trial']
      ],
      // DUMMY for now: put Platera's GitHub release link here (e.g. …/releases/latest/download/Platera-Setup.exe).
      download: {
        url: '#',
        label: 'Download for Windows',
        version: 'v0.1.0',
        platform: 'Windows 10 & 11 · 64-bit',
        size: ''
      },
      url: 'products/platera/'
    }
    /* To add another product, copy one of the entries above, give it its own slug, images and page. */
  ]
}
