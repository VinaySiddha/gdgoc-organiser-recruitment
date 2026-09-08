import { Attendee, BadgeOptions } from '../models/types.js';

export class BadgeService {
  public static generateSvgBadge(attendee: Attendee, options?: BadgeOptions): string {
    const role = options?.role || (attendee.checkedIn ? 'Verified Attendee' : 'Registered Attendee');
    const theme = options?.theme || 'google';

    let bgFill = '#0F172A'; // Deep slate
    let cardFill = '#1E293B';
    let accentBorder = '#4285F4';

    if (theme === 'dark') {
      bgFill = '#090D16';
      cardFill = '#131A2A';
      accentBorder = '#34A853';
    } else if (theme === 'gradient') {
      bgFill = '#181E36';
      cardFill = '#222B4C';
      accentBorder = '#EA4335';
    }

    const verificationBadge = attendee.checkedIn
      ? `<g transform="translate(380, 40)">
           <rect width="180" height="34" rx="17" fill="#137333" />
           <circle cx="20" cy="17" r="6" fill="#FFFFFF" />
           <text x="36" y="22" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="bold">VERIFIED CHECK-IN</text>
         </g>`
      : `<g transform="translate(390, 40)">
           <rect width="170" height="34" rx="17" fill="#B06000" />
           <circle cx="20" cy="17" r="6" fill="#FFFFFF" />
           <text x="36" y="22" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="bold">PASS CONFIRMED</text>
         </g>`;

    // Generate clean SVG badge suitable for social sharing and download
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="360" viewBox="0 0 600 360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="googleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4285F4" stop-opacity="0.8"/>
      <stop offset="33%" stop-color="#EA4335" stop-opacity="0.8"/>
      <stop offset="66%" stop-color="#FBBC04" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#34A853" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="cardShadow" x="-10" y="-10" width="620" height="380" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="360" rx="24" fill="${bgFill}"/>
  
  <!-- Outer Accent Border -->
  <rect x="12" y="12" width="576" height="336" rx="20" stroke="url(#googleGlow)" stroke-width="2"/>
  
  <!-- Header GDG Bar -->
  <g transform="translate(40, 40)">
    <!-- 4-color GDG bracket logos -->
    <path d="M0 12 L14 4 L14 20 Z" fill="#4285F4" />
    <path d="M22 4 L36 12 L22 20 Z" fill="#EA4335" />
    <text x="46" y="18" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="bold" letter-spacing="0.5">GDG on Campus SVEC</text>
  </g>

  <!-- Status Pill -->
  ${verificationBadge}

  <!-- Main Card Body -->
  <rect x="40" y="90" width="520" height="230" rx="16" fill="${cardFill}" stroke="#334155" stroke-width="1"/>

  <!-- Left Accent Ribbon -->
  <rect x="40" y="90" width="8" height="230" rx="4" fill="${accentBorder}"/>

  <!-- Attendee Details -->
  <text x="70" y="145" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="bold">${this.escapeXml(attendee.name)}</text>
  <text x="70" y="175" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500">${this.escapeXml(attendee.department)} • SVEC</text>

  <!-- Role Badge -->
  <rect x="70" y="195" width="160" height="28" rx="14" fill="#334155"/>
  <text x="85" y="214" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">${this.escapeXml(role)}</text>

  <!-- Metadata Table -->
  <text x="70" y="260" fill="#64748B" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" text-transform="uppercase">TICKET ID</text>
  <text x="70" y="282" fill="#E2E8F0" font-family="'Segoe UI', Roboto, monospace" font-size="16" font-weight="bold">${this.escapeXml(attendee.ticketId)}</text>

  <text x="210" y="260" fill="#64748B" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" text-transform="uppercase">ROLL NUMBER</text>
  <text x="210" y="282" fill="#E2E8F0" font-family="'Segoe UI', Roboto, monospace" font-size="16" font-weight="bold">${this.escapeXml(attendee.rollNumber)}</text>

  <!-- QR Visual Block -->
  <g transform="translate(420, 115)">
    <rect width="110" height="110" rx="8" fill="#FFFFFF" />
    <!-- Symbolic styled 2D QR Pattern Grid -->
    <rect x="10" y="10" width="28" height="28" fill="#0F172A"/>
    <rect x="15" y="15" width="18" height="18" fill="#FFFFFF"/>
    <rect x="19" y="19" width="10" height="10" fill="#0F172A"/>
    
    <rect x="72" y="10" width="28" height="28" fill="#0F172A"/>
    <rect x="77" y="15" width="18" height="18" fill="#FFFFFF"/>
    <rect x="81" y="19" width="10" height="10" fill="#0F172A"/>
    
    <rect x="10" y="72" width="28" height="28" fill="#0F172A"/>
    <rect x="15" y="77" width="18" height="18" fill="#FFFFFF"/>
    <rect x="19" y="81" width="10" height="10" fill="#0F172A"/>

    <!-- Data matrix dots -->
    <rect x="46" y="14" width="8" height="8" fill="#0F172A"/>
    <rect x="58" y="24" width="8" height="8" fill="#0F172A"/>
    <rect x="46" y="38" width="8" height="8" fill="#0F172A"/>
    <rect x="22" y="46" width="8" height="8" fill="#0F172A"/>
    <rect x="36" y="58" width="8" height="8" fill="#0F172A"/>
    <rect x="54" y="52" width="8" height="8" fill="#0F172A"/>
    <rect x="70" y="48" width="8" height="8" fill="#0F172A"/>
    <rect x="86" y="58" width="8" height="8" fill="#0F172A"/>
    <rect x="50" y="76" width="8" height="8" fill="#0F172A"/>
    <rect x="68" y="82" width="8" height="8" fill="#0F172A"/>
    <rect x="84" y="74" width="8" height="8" fill="#0F172A"/>
    <text x="55" y="130" text-anchor="middle" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600">SCAN TO VERIFY</text>
  </g>

  <!-- Footer Tagline -->
  <text x="40" y="342" fill="#64748B" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">GDG DevFest SVEC 2026 • Developer Student Clubs</text>
  <text x="560" y="342" text-anchor="end" fill="#64748B" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">#TogetherWeBuild</text>
</svg>`;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
