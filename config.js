/**
 * config.js — single source of truth for ALL brand strings.
 * Rename the business here (and in public/assets/js/site-config.js) and
 * the whole site + docs pick it up. No other file hardcodes the brand name.
 */
module.exports = {
  brand: {
    name: 'SkyWings Travel & Tours',
    tagline: 'Fly Further, Travel Smarter',
    phone: '+92 300 0000000',          // PLACEHOLDER — replace with agency number
    whatsapp: '923000000000',           // PLACEHOLDER — digits only, for wa.me links
    email: 'info@skywings.example',     // PLACEHOLDER
    address: 'Main Boulevard, Gulberg, Lahore, Pakistan', // PLACEHOLDER
    hours: 'Mon–Sat, 9:00 AM – 8:00 PM (PKT)',
  },
  bookingRefPrefix: 'SW',
  currency: 'PKR',
};
