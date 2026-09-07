'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Download, Sparkles, Share2, Palette, User, ShieldCheck } from 'lucide-react';

interface BadgeProps {
  attendeeName: string;
  department: string;
  year: string;
  ticketId: string;
}

export const BadgeCanvas: React.FC<BadgeProps> = ({
  attendeeName,
  department,
  year,
  ticketId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [role, setRole] = useState('Student Developer');
  const [theme, setTheme] = useState<'google-blue' | 'cyber-dark' | 'amber-pulse' | 'emerald-ai'>('google-blue');
  const [avatarInitials, setAvatarInitials] = useState('');

  useEffect(() => {
    const parts = attendeeName.trim().split(' ');
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : attendeeName.substring(0, 2).toUpperCase();
    setAvatarInitials(initials || 'GD');
  }, [attendeeName]);

  useEffect(() => {
    drawBadge();
  }, [attendeeName, department, year, ticketId, role, theme, avatarInitials]);

  const drawBadge = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Badge Dimensions: 600 x 800 (High-Res 3:4 aspect ratio)
    const W = 600;
    const H = 800;
    canvas.width = W;
    canvas.height = H;

    // 1. Background Fill
    let bgGrad = ctx.createLinearGradient(0, 0, W, H);
    if (theme === 'google-blue') {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#0284c7');
    } else if (theme === 'cyber-dark') {
      bgGrad.addColorStop(0, '#09090b');
      bgGrad.addColorStop(0.5, '#18181b');
      bgGrad.addColorStop(1, '#27272a');
    } else if (theme === 'amber-pulse') {
      bgGrad.addColorStop(0, '#1c1917');
      bgGrad.addColorStop(0.5, '#451a03');
      bgGrad.addColorStop(1, '#d97706');
    } else {
      bgGrad.addColorStop(0, '#022c22');
      bgGrad.addColorStop(0.5, '#064e3b');
      bgGrad.addColorStop(1, '#059669');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Decorative Geometric Grids & Circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 30; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 30; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Concentric outer aura
    ctx.beginPath();
    ctx.arc(W / 2, 280, 160, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // 3. Header Text & GDG Branding
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GDG ON CAMPUS • SVEC 4.0', W / 2, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px Inter, sans-serif';
    ctx.fillText('DEVFEST 2026', W / 2, 100);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('BUILD • LEARN • LEAD', W / 2, 125);

    // 4. Center Avatar Circle
    const avatarY = 270;
    const avatarR = 75;

    // Avatar Gradient
    const avGrad = ctx.createLinearGradient(W / 2 - avatarR, avatarY - avatarR, W / 2 + avatarR, avatarY + avatarR);
    avGrad.addColorStop(0, '#3b82f6');
    avGrad.addColorStop(0.5, '#8b5cf6');
    avGrad.addColorStop(1, '#ec4899');

    ctx.beginPath();
    ctx.arc(W / 2, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = avGrad;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Avatar Initials
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(avatarInitials, W / 2, avatarY);
    ctx.textBaseline = 'alphabetic';

    // 5. Verified Badge Tag
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 80, 365, 160, 28, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('VERIFIED ATTENDEE', W / 2, 384);

    // 6. Attendee Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText(attendeeName, W / 2, 440);

    // Role Tag
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 18px Inter, sans-serif';
    ctx.fillText(role, W / 2, 475);

    // Department & Year
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '15px Inter, sans-serif';
    ctx.fillText(`${department} • ${year}`, W / 2, 510);

    // 7. Divider Box / Ticket Info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(50, 560, W - 100, 140, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PASS ID', 80, 600);
    ctx.fillText('CAMPUS VENUE', 80, 650);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(ticketId, 80, 624);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText('Sri Vasavi Engineering College, Tadepalligudem', 80, 674);

    // 8. Footer Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Share your attendance on LinkedIn / Twitter with #GDGSVEC #DevFest2026', W / 2, 755);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `GDG-DevFest-Badge-${attendeeName.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 max-w-5xl mx-auto p-4">
      {/* Canvas Preview */}
      <div className="relative group">
        <canvas
          ref={canvasRef}
          className="w-[320px] sm:w-[380px] h-auto rounded-3xl shadow-2xl shadow-blue-500/20 border border-slate-700/80"
        />
      </div>

      {/* Customization Controls */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 text-white shadow-xl">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Customize Your Social Badge
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Personalize your GDG SVEC DevFest badge and share your presence with the developer community!
          </p>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Choose Your Track / Identity
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Student Developer',
              'AI / ML Enthusiast',
              'Cloud Architect',
              'Web Explorer',
              'Mobile Artisan',
              'Community Lead',
            ].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`text-xs py-2 px-3 rounded-xl border text-left font-medium transition-all ${
                  role === r
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            Select Gradient Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'google-blue', label: 'Google Indigo', color: 'bg-blue-600' },
              { id: 'cyber-dark', label: 'Cyber Slate', color: 'bg-slate-700' },
              { id: 'amber-pulse', label: 'Amber Pulse', color: 'bg-amber-600' },
              { id: 'emerald-ai', label: 'Emerald AI', color: 'bg-emerald-600' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`flex items-center gap-2 text-xs py-2 px-3 rounded-xl border font-medium transition-all ${
                  theme === t.id
                    ? 'border-white text-white bg-slate-800'
                    : 'border-slate-800 text-slate-400 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full ${t.color}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-3">
          <button
            onClick={handleDownload}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <Download className="w-4 h-4" />
            Download High-Res Badge (.PNG)
          </button>
        </div>
      </div>
    </div>
  );
};
