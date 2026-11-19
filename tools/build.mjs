// CraftedSoft site builder: no dependencies.
//   node tools/build.mjs
// Reads assets/js/site-data.js and writes the shared parts (icons, header,
// footer, product cards, contact details) straight into every .html page
// between <!-- build:NAME --> and <!-- /build:NAME --> markers, so pages are
// complete static HTML (no pop-in when navigating). Run it after editing
// site-data.js or adding a product page.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { createHash } from 'node:crypto'

const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ctx = { window: {} }
vm.runInNewContext(readFileSync(join(SITE_DIR, 'assets/js/site-data.js'), 'utf8'), ctx)
const SITE = ctx.window.CS_SITE
const products = SITE.products || []
const C = SITE.contact || {}
const SITE_URL = (SITE.siteUrl || '').trim() ? SITE.siteUrl.trim().replace(/\/?$/, '/') : ''
const ANALYTICS = SITE.analytics || {}
const L = SITE.legal || {}
const THEME = SITE.theme || {}
const SCHEMES = (THEME.schemes || []).filter((x) => x && x.id && Array.isArray(x.colors) && x.colors.length >= 3)
const DEFAULT_SCHEME = (SCHEMES.find((x) => x.id === THEME.scheme) || SCHEMES[0] || { id: 'mono' }).id
const PICKER_ON = THEME.picker !== false && SCHEMES.length > 1
// Who a product is for, as a short label ("For shops", "For restaurants").
const forLabel = (p) => {
  if (p.for) return p.for
  const who = (p.audience || p.industry || p.category || '').replace(/^I run an? /i, '')
  return 'For ' + (p.audience && !/s$/i.test(who) ? who + 's' : who).toLowerCase()
}
const LEGAL_EMAIL = (L.grievanceEmail || C.email || '').trim()
// Legal pages, in footer order. Each lives at legal/<slug>/index.html.
const LEGAL = [
  { slug: 'privacy', title: 'Privacy Policy', icon: 'shield', blurb: 'What we collect, why we collect it, and your rights.' },
  { slug: 'terms', title: 'Terms of Service', icon: 'scale', blurb: 'The rules for using our website and working with us.' },
  { slug: 'licence', title: 'Licence & Pricing', icon: 'key', blurb: 'Yearly licences, free updates, maintenance and renewals.' },
  { slug: 'refunds', title: 'No-Refund Policy', icon: 'refresh', blurb: 'All payments are final. Try free before you buy.' },
  { slug: 'delivery', title: 'Delivery & Installation', icon: 'truck', blurb: 'How software, licence keys and custom work reach you.' }
]

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const icon = (id, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`

/* ---------- Icons (Lucide, ISC licence) ---------- */
const SPRITE = {
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  menu: '<line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="17" y2="17"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  wifioff: '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  headset: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
  grad: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
  pause: '<circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  files: '<path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>',
  percent: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  landmark: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M17 7v10"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>'
}
const sprite = () =>
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${Object.entries(SPRITE)
    .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`)
    .join('')}</defs></svg>`

/* ---------- Header (Delog Commerce layout, full width) ----------
   Brand · Products menu (list + preview) · links · colour scheme · theme · call to action · phone menu.
   Product pages list their own sections in the header instead of the site links, like Delog's product pages:
   <body data-page="product-chittill" data-nav="counter:The counter,features:Features,…">. */
/* Appearance: one header button (current mode icon + a dot in the current colour) opening a card with
   Mode (Light / Dark / Auto, Auto follows the device) and Colour (a mini page preview per scheme). The phone menu
   shows the same controls inline. main.js keeps every copy in sync (aria-pressed) and saves to this device. */
const swatchFill = (sc) => (sc.mono ? 'var(--text)' : `linear-gradient(135deg, ${sc.colors[0]}, ${sc.colors[1]} 55%, ${sc.colors[2]})`)
const MODES = [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['auto', 'Auto', 'monitor']]
const appearanceBody = () => {
  const modes = `<div class="appear__seg" role="group" aria-label="Mode">${MODES.map(([id, label, ic]) => `<button type="button" data-mode-pick="${id}" aria-pressed="${id === 'auto'}">${icon(ic)}<span>${label}</span></button>`).join('')}</div>`
  const colours = PICKER_ON
    ? `<div class="appear__label">Colour</div><div class="appear__grid" role="group" aria-label="Colour scheme">${SCHEMES.map((sc) => `<button type="button" class="appear__sw" data-scheme-pick="${esc(sc.id)}" style="--sw:${swatchFill(sc)}" aria-pressed="${sc.id === DEFAULT_SCHEME}"><span class="appear__pv" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="appear__name">${esc(sc.name)}</span><span class="appear__tick" aria-hidden="true">${icon('check')}</span></button>`).join('')}</div>`
    : ''
  return `<div class="appear__label">Mode</div>${modes}${colours}`
}
const appearance = (kind) => {
  if (kind === 'mnav') return `<div class="mnav__appear"><div class="mnav__appear-head"><b>Appearance</b><button type="button" data-appear-reset>Reset</button></div>${appearanceBody()}</div>`
  return `<div class="appdd">
          <button type="button" class="icon-btn appbtn" aria-expanded="false" aria-controls="apppop" aria-label="Appearance: mode and colour" title="Appearance">${icon('sun', 'i-sun')}${icon('moon', 'i-moon')}${PICKER_ON ? '<span class="appbtn__dot" aria-hidden="true"></span>' : ''}</button>
          <div class="apppop" id="apppop" role="dialog" aria-label="Appearance" hidden>
            <div class="apppop__head"><b>Appearance</b><small>Saved on this device</small></div>
            ${appearanceBody()}
            <div class="apppop__foot"><button type="button" data-appear-reset>${icon('refresh')}Reset to default</button></div>
          </div>
        </div>`
}
const pmenu = (R, here) => {
  const items = products.map((p, i) => `<a class="pmenu-item" href="${R}${p.url}" data-i="${i}" style="--pc:${esc(p.accent || 'var(--c2)')}"${p === here ? ' aria-current="page"' : ''}><img src="${R}${p.icon}" alt="" width="34" height="34"><span><b>${esc(p.name)}</b><small>${esc(forLabel(p).replace(/^For /, 'For '))}</small></span>${p === here ? '<span class="here" title="You are here">✓</span>' : ''}</a>`).join('')
  const panes = products.map((p, i) => {
    const pts = (p.highlights || []).slice(0, 3).map((h) => `<li>${esc(h.title)}</li>`).join('')
    return `<div class="pmenu-pane" data-i="${i}" style="--pc:${esc(p.accent || 'var(--c2)')}" hidden><img src="${R}${p.image}" alt="" loading="lazy" width="1440" height="900"><b>${esc(p.name)} · ${esc(p.tagline)}</b><ul>${pts}</ul>${p === here ? '<span class="pmenu-go here">You’re here</span>' : `<a class="pmenu-go" href="${R}${p.url}">Explore ${esc(p.name)} ${icon('arrow')}</a>`}</div>`
  }).join('')
  return `<div class="pmenu"${here ? ` data-here="${products.indexOf(here)}"` : ''}>
        <button type="button" class="pmenu-btn" aria-expanded="false" aria-controls="pmenu-panel"><span>Products</span>${icon('down')}</button>
        <div class="pmenu-panel" id="pmenu-panel" hidden>
          <div class="pmenu-list"><div class="pmenu-head">Products</div>${items}<div class="pmenu-sep"></div><a class="pmenu-extra" href="${R}products/"><i>${icon('grid')}</i>All products</a><a class="pmenu-extra" href="${R}contact/?interest=custom"><i>${icon('plus')}</i>Custom software</a></div>
          <div class="pmenu-preview">${panes}</div>
        </div>
      </div>`
}
const header = (R, page, src) => {
  const here = pageProduct(page)
  const cur = (key) => (page === key ? ' aria-current="page"' : '')
  const nav = ((src.match(/<body[^>]*\sdata-nav="([^"]*)"/) || [])[1] || '').split(',').map((x) => x.split(':')).filter((x) => x.length === 2)
  const links = here && nav.length
    ? nav.map(([id, label]) => `<a href="#${esc(id.trim())}">${esc(label.trim())}</a>`).join('')
    : `<a href="${R}services/"${cur('services')}>Services</a><a href="${R}about/"${cur('about')}>About</a><a href="${R}contact/"${cur('contact')}>Contact</a>`
  const cta = here
    ? `<a class="btn btn-primary btn-sm nav-cta" href="#get">Get ${esc(here.name)}</a>`
    : `<a class="btn btn-primary btn-sm nav-cta" href="${R}contact/?interest=demo">Book a demo</a>`
  return `<header class="nav" id="hdr">
    <div class="nav-in">
      ${brandLink(R)}
      <nav class="nav-links" aria-label="${here ? esc(here.name) + ' sections' : 'Main'}">${pmenu(R, here)}${here && nav.length ? '<span class="nav-sep" aria-hidden="true"></span>' : ''}${links}</nav>
      <div class="nav-act">
        ${appearance('header')}
        ${cta}
        <button type="button" class="nav-menu" aria-label="Open menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span></button>
      </div>
    </div>
    <div class="mnav" id="mnav">
      <div class="mnav__links"><a href="${R || './'}">Home</a><a href="${R}products/">Products</a><a href="${R}services/">Services</a><a href="${R}about/">About</a><a href="${R}contact/">Contact</a></div>
      <div class="mnav__prods">${products.map((p) => `<a href="${R}${p.url}"><img src="${R}${p.icon}" alt="" width="38" height="38"><span><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></span></a>`).join('')}</div>
      ${appearance('mnav')}
      <a class="btn btn-primary btn-lg" href="${R}contact/?interest=demo">Book a free demo ${icon('arrow')}</a>
    </div>
  </header>`
}

/* The CraftedSoft logo: S mark (tinted by the colour scheme) + wordmark (text colour), drawn by CSS masks
   from assets/img/logo-mark.svg and logo-word.svg so they follow the scheme and day/night mode. */
const brandLink = (R) => `<a class="brand" href="${R || './'}" aria-label="CraftedSoft home"><span class="logo-mark" aria-hidden="true"></span><span class="logo-word" aria-hidden="true"></span></a>`

/* ---------- Footer (Delog: brand left, links right, a quiet line under) ---------- */
const footer = (R) => {
  const reach = [
    C.email && `<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`,
    C.phone && `<a href="tel:${C.phone.replace(/\s/g, '')}">${esc(C.phone)}</a>`,
    C.whatsapp && `<a href="https://wa.me/${C.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>`,
    C.hours && `<span>${esc(C.hours)}</span>`
  ].filter(Boolean).join('')
  return `<footer class="footer">
    <div class="f-top">
      <div class="f-brand">
        ${brandLink(R)}
        <p>Billing, inventory and custom business software for India’s shops and restaurants. Works offline, your data stays yours.</p>
        <div class="f-reach">${reach}</div>
      </div>
      <div class="f-cols">
        <nav class="f-col" aria-label="Products"><h4>Products</h4>${products.slice(0, 5).map((p) => `<a href="${R}${p.url}">${esc(p.name)}</a>`).join('')}<a href="${R}products/">All products</a></nav>
        <nav class="f-col" aria-label="Company"><h4>Company</h4><a href="${R}services/">Services</a><a href="${R}about/">About us</a><a href="${R}contact/?interest=custom">Custom software</a><a href="${R}contact/">Contact</a></nav>
      </div>
    </div>
    <div class="f-bottom">
      <span>© ${new Date().getFullYear()} ${esc(L.businessName || 'CraftedSoft')} · Designed &amp; built in India</span>
      <nav class="f-legal" aria-label="Legal">${LEGAL.map((l) => `<a href="${R}legal/${l.slug}/">${l.title}</a>`).join('')}</nav>
      <button type="button" class="f-top-btn" data-to-top>Back to top ${icon('arrow')}</button>
    </div>
    <div class="f-word logo-word" aria-hidden="true"></div>
  </footer>
  ${waFab(R)}
  ${helpWidget(R)}`
}

/* Help chat (every page): answers from assets/js/support-data.js in the browser, no server. */
function helpWidget(R) {
  return `<div class="help" id="cs-help">
    <span class="help__peek" aria-hidden="true"><b>Have a question?</b> Ask me</span>
    <button type="button" class="help__launch" aria-expanded="false" aria-controls="cs-help-panel" aria-label="Open CS Assistant">${icon('message', 'i-open')}${icon('x', 'i-close')}</button>
    <section class="help__panel" id="cs-help-panel" role="dialog" aria-label="CS Assistant" hidden>
      <header class="help__head">
        <span class="logo-tile" aria-hidden="true"><span class="logo-mark"></span></span>
        <span><b>CS Assistant</b><small>Instant answers, any time</small></span>
        <button type="button" class="help__reset" title="Start over" aria-label="Start over">${icon('refresh')}</button>
        <button type="button" class="help__close" aria-label="Close CS Assistant">${icon('x')}</button>
      </header>
      <div class="help__log" role="log" aria-live="polite"></div>
      <div class="help__chips" aria-label="Suggested questions"></div>
      <form class="help__form" autocomplete="off">
        <label class="sr-only" for="cs-help-q">Type your question</label>
        <input class="help__input" id="cs-help-q" type="text" maxlength="200" placeholder="Ask about products, pricing, setup…">
        <button type="submit" class="help__send" aria-label="Send">${icon('send')}</button>
      </form>
      <p class="help__foot">Need a person? <a href="${R}contact/">Contact the team</a></p>
    </section>
  </div>
  <script src="${R}assets/js/support-data.js" defer></script>
  <script src="${R}assets/js/support.js" defer></script>`
}

/* Floating WhatsApp button (every page). Without a number in contact.whatsapp it explains that the number is
   coming soon (main.js), pointing people to the contact form instead. */
function waFab(R) {
  const num = (C.whatsapp || '').replace(/\D/g, '')
  const href = num ? `https://wa.me/${num}` : `${R}contact/`
  return `<a class="wa-fab" href="${href}"${num ? ` target="_blank" rel="noopener" data-wa="${num}"` : ' data-wa-pending'} aria-label="Chat with us on WhatsApp" data-track="WhatsApp">
    <span class="wa-fab__bubble" aria-hidden="true"><b>Questions?</b> Chat with us</span>
    <span class="wa-fab__btn">${icon('whatsapp')}</span>
  </a>`
}

/* Runs first in <head>: theme and colour scheme before the page is drawn (no flash), JS flag, page transitions. */
const boot = () => {
  const ids = JSON.stringify(SCHEMES.map((x) => x.id))
  return `<script>(function(){var d=document.documentElement;d.classList.add('js');var s='${DEFAULT_SCHEME}';try{var k=localStorage.getItem('cs-scheme');if(${PICKER_ON ? `${ids}.indexOf(k)>=0` : 'false'})s=k}catch(e){}d.dataset.scheme=s;try{var t=localStorage.getItem('cs-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t}catch(e){d.dataset.theme='light'}if(location.protocol!=='file:'){var v=document.createElement('style');v.textContent='@view-transition{navigation:auto}@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}';document.head.appendChild(v)}})()</script>`
}

/* ---------- <head>: search, link previews, structured data, analytics ---------- */
const pagePath = (file) => {
  const rel = relative(SITE_DIR, file).split(sep).join('/')
  return rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel
}
const analyticsTag = () => {
  const id = (ANALYTICS.id || '').trim()
  if (!id) return ''
  switch ((ANALYTICS.provider || '').toLowerCase()) {
    case 'cloudflare':
      return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(id)}"}'></script>`
    case 'plausible':
      return `<script defer data-domain="${esc(id)}" src="https://plausible.io/js/script.js"></script>
  <script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>`
    case 'ga4':
      return `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(id)}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(id)}');</script>`
    default:
      return ''
  }
}
const headTags = (R, file, src, page) => {
  const title = ((src.match(/<title>([^<]*)<\/title>/) || [])[1] || 'CraftedSoft').trim()
  const desc = ((src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').trim()
  const path = pagePath(file)
  const abs = SITE_URL ? SITE_URL + path : ''
  const og = (src.match(/<html[^>]*\sdata-og="([^"]*)"/) || [])[1] || 'assets/img/og/craftedsoft.png'
  const ogUrl = SITE_URL ? SITE_URL + og : R + og
  const ld = []
  const org = {
    '@type': 'Organization',
    name: L.businessName || 'CraftedSoft',
    ...(SITE_URL && { url: SITE_URL, logo: SITE_URL + 'assets/img/apple-touch-icon.png' }),
    ...(C.email && { email: C.email }),
    ...(C.phone && { telephone: C.phone }),
    areaServed: 'IN'
  }
  if (page === 'home') ld.push(org, { '@type': 'WebSite', name: 'CraftedSoft', ...(SITE_URL && { url: SITE_URL }) })
  const pp = pageProduct(page)
  if (pp) {
    ld.push({
      '@type': 'SoftwareApplication',
      name: pp.name,
      description: pp.summary,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows 10, Windows 11',
      ...(pp.download?.version && { softwareVersion: pp.download.version.replace(/^v/, '') }),
      ...(SITE_URL && { url: abs, image: SITE_URL + (pp.image || '').replace(/-sm\.webp$/, '.webp') }),
      publisher: { '@type': 'Organization', name: L.businessName || 'CraftedSoft' }
    })
  }
  return [
    abs && `<link rel="canonical" href="${abs}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="CraftedSoft" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    desc && `<meta property="og:description" content="${esc(desc)}" />`,
    abs && `<meta property="og:url" content="${abs}" />`,
    `<meta property="og:image" content="${ogUrl}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="apple-touch-icon" href="${R}assets/img/apple-touch-icon.png" />`,
    `<link rel="manifest" href="${R}site.webmanifest" />`,
    ld.length && `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld })}</script>`,
    analyticsTag()
  ].filter(Boolean).join('\n  ')
}

/* ---------- Legal pages: business details woven into the text ---------- */
const legalValues = () => {
  const name = esc(L.businessName || 'CraftedSoft')
  const email = esc(LEGAL_EMAIL)
  return {
    'v-business': name,
    'v-business-full': [name, L.businessType && esc(L.businessType), L.address && `with its registered office at ${esc(L.address)}`].filter(Boolean).join(', '),
    'v-jurisdiction': L.jurisdiction ? `the courts at ${esc(L.jurisdiction)}` : 'the competent courts in India',
    'v-updated': esc(L.updated || ''),
    'v-email': email ? `<a href="mailto:${email}">${email}</a>` : 'the contact details on our Contact page',
    'v-site': SITE_URL ? `<a href="${SITE_URL}">${esc(SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : 'our website'
  }
}
const legalContact = () => {
  const rows = [
    ['Business', esc(L.businessName || 'CraftedSoft') + (L.businessType ? `, ${esc(L.businessType)}` : '')],
    L.address && ['Address', esc(L.address)],
    L.gstin && ['GSTIN', esc(L.gstin)],
    LEGAL_EMAIL && ['Email', `<a href="mailto:${esc(LEGAL_EMAIL)}">${esc(LEGAL_EMAIL)}</a>`],
    C.phone && ['Phone', esc(C.phone)],
    ['Grievance Officer', (L.grievanceOfficer ? esc(L.grievanceOfficer) + ', ' : '') + 'reachable at the email above. We acknowledge complaints within 48 hours and aim to resolve them within 30 days.']
  ].filter(Boolean)
  return `<dl class="legal-contact">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`
}
const legalIndex = (R) =>
  LEGAL.map((l) => `<a class="legal-card reveal" href="${R}legal/${l.slug}/"><span class="ico">${icon(l.icon)}</span><span><b>${l.title}</b><span>${l.blurb}</span></span>${icon('arrow')}</a>`).join('\n          ')
const legalMore = (R, page) =>
  `<p class="legal-more__label">Other policies</p><div class="legal-more__links">${LEGAL.filter((l) => page !== `legal-${l.slug}`)
    .map((l) => `<a href="${R}legal/${l.slug}/">${icon(l.icon)}${l.title}</a>`)
    .join('')}</div>`

/* ---------- Contact ---------- */
const contactList = () => {
  const row = (ic, label, value, href) =>
    href
      ? `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><span class="ico">${icon(ic)}</span><span><small>${label}</small>${esc(value)}</span></a>`
      : `<div><span class="ico">${icon(ic)}</span><span><small>${label}</small>${esc(value)}</span></div>`
  return [
    C.whatsapp && row('message', 'WhatsApp', 'Chat with us', `https://wa.me/${C.whatsapp}`),
    C.phone && row('phone', 'Phone', C.phone, `tel:${C.phone.replace(/\s/g, '')}`),
    C.email && row('mail', 'Email', C.email, `mailto:${C.email}`),
    C.hours && row('clock', 'Hours', C.hours),
    C.location && row('pin', 'Based in', C.location)
  ].filter(Boolean).join('\n            ')
}
const productOptions = () => ['<option value="">Not sure yet</option>', ...products.map((p) => `<option>${esc(p.name)}</option>`)].join('')

/* Contact page (v3): big tappable tiles, small meta lines, product pills */
const contactTiles = () => {
  const tile = (ic, label, value, href) =>
    `<a class="ctile" href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><span class="ctile__ico">${icon(ic)}</span><span class="ctile__txt"><small>${label}</small><b>${esc(value)}</b></span>${icon('arrow')}</a>`
  return [
    C.whatsapp && tile('message', 'WhatsApp', 'Chat with us', `https://wa.me/${C.whatsapp}`),
    C.phone && tile('phone', 'Call us', C.phone, `tel:${C.phone.replace(/\s/g, '')}`),
    C.email && tile('mail', 'Email', C.email, `mailto:${C.email}`),
    tile('store', 'Visit', 'We come to your shop', '#contact-form')
  ].filter(Boolean).join('\n            ')
}
const contactMeta = () =>
  [C.hours && `<span>${icon('clock')}${esc(C.hours)}</span>`, C.location && `<span>${icon('pin')}${esc(C.location)}</span>`].filter(Boolean).join('')
const productPills = (R) =>
  [
    `<label class="pill-radio"><input type="radio" name="product" value="" checked><span>Not sure yet</span></label>`,
    ...products.map((p) => `<label class="pill-radio"><input type="radio" name="product" value="${esc(p.name)}"><span><img src="${R}${p.icon}" alt="" width="20" height="20">${esc(p.name)}</span></label>`)
  ].join('')

/* ---------- Download buttons (from product.download in site-data.js) ---------- */
// A '#' or empty url is a placeholder: the button stays visible but main.js shows "coming soon" on click.
const dlAttrs = (d) => {
  const url = (d.url || '').trim()
  if (!url || url === '#') return 'href="#" data-download-pending'
  return `href="${esc(url)}"${/^https?:/.test(url) && !/\.(exe|msi|zip)$/i.test(url) ? ' target="_blank" rel="noopener"' : ''}`
}
const dlMeta = (d) => [d.version, d.platform, d.size].filter(Boolean).map(esc).join(' · ')
const download = {
  // Large two-line button for the product hero
  hero: (p) => p.download ? `<a class="btn btn-primary btn-dl" ${dlAttrs(p.download)}><span class="dl-ico">${icon('download')}</span><span><b>${esc(p.download.label || 'Download')}</b><small>${dlMeta(p.download)}</small></span></a>` : '',
  // Regular button with an icon
  button: (p, label, cls = 'btn btn-ghost btn-lg') => p.download ? `<a class="${cls}" ${dlAttrs(p.download)}>${icon('download')}${esc(label || p.download.label || 'Download')}</a>` : ''
}
const pageProduct = (page) => products.find((p) => page === `product-${p.slug}`)

/* ---------- Products page (v4): searchable catalogue that scales to any number of products ---------- */
const big = (R, rel) => {
  const large = rel.replace(/-sm\.webp$/, '.webp')
  return R + (large !== rel && existsSync(join(SITE_DIR, large)) ? large : rel)
}
const industryOf = (p) => p.industry || p.category || 'Other'
// Chips for the filter bar: All plus one per industry, each with its product count.
// One door per product (Delog): who it's for, the name, one line, actions, and the app peeking out at the bottom.
const doors = (R) =>
  [
    ...products.map((p) => {
      const soon = p.status === 'soon'
      const shot = p.imageDark
        ? `<img class="door-shot on-light" src="${R}${p.image}" alt="${esc(p.name)} screenshot" loading="lazy" width="1440" height="900"><img class="door-shot on-dark" src="${R}${p.imageDark}" alt="${esc(p.name)} screenshot" loading="lazy" width="1440" height="900">`
        : `<img class="door-shot" src="${R}${p.image}" alt="${esc(p.name)} screenshot" loading="lazy" width="1440" height="900">`
      const second = soon
        ? `<a class="btn btn-sm door-dl" href="${R}contact/?interest=demo&amp;product=${encodeURIComponent(p.name)}">Notify me</a>`
        : p.download ? `<a class="btn btn-sm door-dl" ${dlAttrs(p.download)}>${icon('download')}Download</a>` : ''
      const meta = [p.trial, p.platform].filter(Boolean).map(esc).join(' · ')
      return `<article class="door" data-industry="${esc(industryOf(p))}">
          <a class="door-link" href="${R}${p.url}" aria-label="Explore ${esc(p.name)}"></a>
          <div class="door-for"><img src="${R}${p.icon}" alt="" width="44" height="44">${esc(forLabel(p))}${soon ? '<em>Coming soon</em>' : p.isNew ? '<em>New</em>' : ''}</div>
          <h2>${esc(p.name)}</h2>
          <p>${esc(p.summary)}</p>
          <div class="door-actions"><a class="btn btn-white btn-sm" href="${R}${p.url}">${soon ? 'Preview' : 'Explore ' + esc(p.name)} ${icon('arrow')}</a>${second}</div>
          ${meta ? `<p class="door-meta">${meta}</p>` : ''}
          ${shot}
        </article>`
    }),
    `<article class="door door-build" data-industry="*">
          <a class="door-link" href="${R}contact/?interest=custom" aria-label="Start a custom project"></a>
          <span class="ico">${icon('sparkles')}</span>
          <h2>Need something else?</h2>
          <p>Tell us how your business works. We design and build software around it, on the same proven core as our products.</p>
          <div class="door-actions"><a class="btn btn-primary btn-sm" href="${R}contact/?interest=custom">Start a custom project ${icon('arrow')}</a></div>
        </article>`
  ].join('\n        ')
// Industry chips above the doors (only once there are products for more than one industry).
const doorChips = () => {
  const counts = new Map()
  for (const p of products) counts.set(industryOf(p), (counts.get(industryOf(p)) || 0) + 1)
  if (counts.size < 2) return ''
  const chip = (label, value, n, on) => `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on}" data-industry="${esc(value)}">${esc(label)}<span>${n}</span></button>`
  return [chip('All', '*', products.length, true), ...[...counts].map(([k, n]) => chip(k, k, n, false))].join('')
}

/* ---------- Write pages ---------- */
const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f)
    if (statSync(full).isDirectory()) return ['assets', 'tools', 'node_modules', '.git'].includes(f) ? [] : htmlFiles(full)
    return f.endsWith('.html') ? [full] : []
  })

/* ---------- Stylesheet: assets/css/src/*.css (in name order) + colour schemes → assets/css/style.css ---------- */
// Logo SVGs → CSS custom properties (data URIs work as masks from file:// too, unlike url() to a file).
const svgUri = (p) => 'url("data:image/svg+xml,' + readFileSync(join(SITE_DIR, p), 'utf8').trim().replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ') + '")'
const logoCss = () => `:root { --logo-mark: ${svgUri('assets/img/logo-mark.svg')}; --logo-word: ${svgUri('assets/img/logo-word.svg')}; }`
const hexRgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const schemeCss = () =>
  SCHEMES.map((sc) => {
    const sel = [`:root[data-scheme='${sc.id}']`, sc.id === DEFAULT_SCHEME ? ':root:not([data-scheme])' : ''].filter(Boolean).join(', ')
    const base = `${sel} { --c1: ${sc.colors[0]}; --c2: ${sc.colors[1]}; --c3: ${sc.colors[2]}; }`
    if (!sc.mono) return base
    // Black & white: solid black/white buttons, grey highlights, neutral glows, charcoal panels.
    const dark = sel.split(', ').map((x) => x.replace(':root', ":root[data-theme='dark']")).join(', ')
    return [
      base,
      `${sel} { --grad: linear-gradient(135deg, #3f3f46, #09090b); --primary: var(--text); --on-primary: var(--bg); --primary-shadow: 0 10px 26px -14px rgb(0 0 0 / 0.45); --hl: linear-gradient(100deg, var(--text) 0%, color-mix(in oklab, var(--text) 40%, var(--bg)) 100%); --kicker: var(--muted); --tick: var(--text); --soft: rgb(0 0 0 / 0.05); --ring: rgb(0 0 0 / 0.28); --aurora-1: #a1a1aa; --aurora-2: #d4d4d8; --aurora-3: #71717a; --aurora-o: 0.18; --panel-grad: linear-gradient(150deg, #1f1f23, #09090b 70%); --on-panel: #ffffff; }`,
      `${dark} { --grad: linear-gradient(135deg, #52525b, #18181b); --primary-shadow: 0 10px 30px -14px rgb(255 255 255 / 0.22); --soft: rgb(255 255 255 / 0.06); --ring: rgb(255 255 255 / 0.3); --aurora-1: #3f3f46; --aurora-2: #52525b; --aurora-3: #27272a; --aurora-o: 0.35; --panel-grad: linear-gradient(150deg, #1c1c20, #0c0c0e 70%); }`
    ].join('\n')
  }).join('\n')
{
  const dir = join(SITE_DIR, 'assets/css/src')
  if (existsSync(dir)) {
    const parts = readdirSync(dir).filter((x) => x.endsWith('.css')).sort()
    const css = '/* Generated by tools/build.mjs from assets/css/src/*.css: edit those files, then run the build. */\n' +
      parts.map((x) => `/* ===== ${x} ===== */\n` + readFileSync(join(dir, x), 'utf8').replace('/* @schemes */', schemeCss()).replace('/* @logo */', logoCss())).join('\n')
    const out = join(SITE_DIR, 'assets/css/style.css')
    if (!existsSync(out) || readFileSync(out, 'utf8') !== css) writeFileSync(out, css)
  }
}
// Cache-busting: each CSS/JS link gets ?v=<hash of that file>, so browsers always load the latest
// version after a rebuild instead of mixing new pages with an old cached stylesheet or script.
const ASSETS = ['assets/css/style.css', 'assets/js/main.js', 'assets/js/site-data.js', 'assets/js/support-data.js', 'assets/js/support.js']
const version = Object.fromEntries(
  ASSETS.map((a) => [a, createHash('sha1').update(readFileSync(join(SITE_DIR, a))).digest('hex').slice(0, 8)])
)
const stamp = (html) =>
  ASSETS.reduce((h, a) => h.replace(new RegExp(`(${a.replace(/[./]/g, (c) => '\\' + c)})(\\?v=[\\w]+)?"`, 'g'), `$1?v=${version[a]}"`), html)

let changed = 0
const indexable = []
for (const file of htmlFiles(SITE_DIR)) {
  const depth = relative(SITE_DIR, file).split(sep).length - 1
  const R = '../'.repeat(depth)
  let src = readFileSync(file, 'utf8')
  src = src.replace(/(<html[^>]*\sdata-root=")[^"]*"/, `$1${R}"`)
  const page = (src.match(/<body[^>]*data-page="([^"]*)"/) || [])[1] || ''
  const parts = {
    boot: boot(),
    sprite: sprite(),
    header: header(R, page, src),
    footer: footer(R),
    doors: doors(R),
    'door-chips': doorChips(),
    'product-pills': productPills(R),
    'contact-tiles': contactTiles(),
    'contact-meta': contactMeta(),
    head: headTags(R, file, src, page),
    'legal-contact': legalContact(),
    'legal-index': legalIndex(R),
    'legal-more': legalMore(R, page),
    // 404.html is served at any missing address, so its relative links need a fixed base.
    base: SITE_URL ? `<base href="${SITE_URL}" />` : '',
    ...legalValues()
  }
  // Product pages: download buttons for the product this page belongs to (data-page="product-<slug>").
  const pp = pageProduct(page)
  if (pp) {
    parts['download-hero'] = download.hero(pp)
    parts['download-trial'] = pp.download
      ? download.button(pp, 'Download free trial')
      : `<a class="btn btn--outline" href="${R}contact/?interest=demo&amp;product=${encodeURIComponent(pp.name)}">Start free trial</a>`
    parts['download-cta'] = download.button(pp, pp.download?.label, 'btn btn--ghost btn--lg')
  }
  // 'v-…' regions are values inside a sentence (legal pages), so no line breaks around them.
  const out = stamp(src.replace(/(<!-- build:([\w-]+) -->)[\s\S]*?(<!-- \/build:\2 -->)/g, (m, open, name, close) =>
    name in parts ? (name.startsWith('v-') ? `${open}${parts[name]}${close}` : `${open}\n${parts[name]}\n${close}`) : m
  ))
  if (out !== src) { writeFileSync(file, out); changed++ }
  console.log(`${out !== src ? 'updated' : 'unchanged'}  ${relative(SITE_DIR, file)}`)
  if (!/name="robots" content="noindex"/.test(out) && !file.endsWith('404.html')) indexable.push(pagePath(file))
}

/* ---------- Search engine files ---------- */
const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(SITE_DIR, 'robots.txt'),
  `User-agent: *\nAllow: /\n${SITE_URL ? `\nSitemap: ${SITE_URL}sitemap.xml\n` : ''}`
)
if (SITE_URL) {
  const pri = (p) => (p === '' ? '1.0' : p.startsWith('products/') ? '0.9' : p.startsWith('legal/') ? '0.3' : '0.7')
  writeFileSync(
    join(SITE_DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
      .sort()
      .map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod><priority>${pri(p)}</priority></url>`)
      .join('\n')}\n</urlset>\n`
  )
}
writeFileSync(
  join(SITE_DIR, 'site.webmanifest'),
  JSON.stringify({ name: 'CraftedSoft', short_name: 'CraftedSoft', icons: [{ src: 'assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: 'assets/img/logo.svg', sizes: 'any', type: 'image/svg+xml' }], theme_color: '#0a0a0c', background_color: '#ffffff', display: 'browser' }, null, 2) + '\n'
)

console.log(`Done: ${changed} page(s) updated from site-data.js (${products.length} product(s)).`)
console.log(`Search: robots.txt written${SITE_URL ? `, sitemap.xml with ${indexable.length} pages` : ''}.`)
if (!SITE_URL) console.log('  ! Set siteUrl in site-data.js to add sitemap.xml, canonical links and full link previews.')
if (!(ANALYTICS.provider && ANALYTICS.id)) console.log('  ! Analytics is off: set analytics.provider and analytics.id in site-data.js to turn it on.')
if (!C.whatsapp) console.log('  ! The WhatsApp button shows "coming soon" until contact.whatsapp is set.')
