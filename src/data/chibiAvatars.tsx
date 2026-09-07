import React from 'react';

export interface ChibiAvatarInfo {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  description: string;
  bgGradient: string;
  accentColor: string;
  borderColor: string;
}

export const BOY_CHIBI_AVATARS: ChibiAvatarInfo[] = [
  {
    id: 'boy_cap',
    name: 'Bé Tuấn Mũ Xanh',
    gender: 'Nam',
    description: 'Cậu bé năng động đội mũ lưỡi trai xanh biển',
    bgGradient: 'from-sky-400 to-blue-500',
    accentColor: '#0284c7',
    borderColor: 'border-sky-300',
  },
  {
    id: 'boy_glasses',
    name: 'Bé Minh Tri Thức',
    gender: 'Nam',
    description: 'Cậu bé thông minh đeo kính tròn, mắt sáng long lanh',
    bgGradient: 'from-indigo-400 to-purple-500',
    accentColor: '#6366f1',
    borderColor: 'border-indigo-300',
  },
  {
    id: 'boy_smile',
    name: 'Bé Khoa Vui Vẻ',
    gender: 'Nam',
    description: 'Cậu bé cười tươi rạng rỡ, má lúm đồng tiền',
    bgGradient: 'from-amber-400 to-orange-500',
    accentColor: '#f59e0b',
    borderColor: 'border-amber-300',
  },
  {
    id: 'boy_star',
    name: 'Bé Nam Ngôi Sao',
    gender: 'Nam',
    description: 'Cậu bé cài băng đô ngôi sao vàng chăm ngoan',
    bgGradient: 'from-emerald-400 to-teal-500',
    accentColor: '#10b981',
    borderColor: 'border-emerald-300',
  },
  {
    id: 'boy_scholar',
    name: 'Bé Dũng Tiến Bước',
    gender: 'Nam',
    description: 'Cậu bé chỉn chu mang khăn quàng đỏ đội viên',
    bgGradient: 'from-cyan-400 to-blue-600',
    accentColor: '#06b6d4',
    borderColor: 'border-cyan-300',
  },
  {
    id: 'boy_cool',
    name: 'Bé Phong Nhanh Nhẹn',
    gender: 'Nam',
    description: 'Cậu bé tóc hạt dẻ bồng bềnh mắt cười đáng yêu',
    bgGradient: 'from-blue-400 to-indigo-500',
    accentColor: '#3b82f6',
    borderColor: 'border-blue-300',
  },
];

export const GIRL_CHIBI_AVATARS: ChibiAvatarInfo[] = [
  {
    id: 'girl_bow',
    name: 'Bé Mai Nơ Hồng',
    gender: 'Nữ',
    description: 'Cô bé thắt nơ hồng hai bên bím tóc, mắt to tròn',
    bgGradient: 'from-pink-400 to-rose-500',
    accentColor: '#ec4899',
    borderColor: 'border-pink-300',
  },
  {
    id: 'girl_flower',
    name: 'Bé Lan Cài Hoa',
    gender: 'Nữ',
    description: 'Cô bé cài hoa hướng dương vàng tươi trên tóc',
    bgGradient: 'from-amber-300 to-rose-400',
    accentColor: '#f43f5e',
    borderColor: 'border-rose-300',
  },
  {
    id: 'girl_ponytail',
    name: 'Bé Thảo Đuôi Ngựa',
    gender: 'Nữ',
    description: 'Cô bé cột tóc đuôi ngựa cao, kẹp tim xinh xắn',
    bgGradient: 'from-fuchsia-400 to-pink-500',
    accentColor: '#d946ef',
    borderColor: 'border-fuchsia-300',
  },
  {
    id: 'girl_bob',
    name: 'Bé Vy Dâu Tây',
    gender: 'Nữ',
    description: 'Cô bé tóc ngắn mái ngố cài kẹp trái dâu ngọt ngào',
    bgGradient: 'from-red-400 to-pink-500',
    accentColor: '#ef4444',
    borderColor: 'border-red-300',
  },
  {
    id: 'girl_glasses',
    name: 'Bé Linh Trí Tuệ',
    gender: 'Nữ',
    description: 'Cô bé đeo kính gọng hồng tròn, búi tóc củ tỏi cute',
    bgGradient: 'from-purple-400 to-pink-500',
    accentColor: '#a855f7',
    borderColor: 'border-purple-300',
  },
  {
    id: 'girl_ribbon',
    name: 'Bé An Bím Tóc',
    gender: 'Nữ',
    description: 'Cô bé tóc tết hai bím với ruy băng tím mộng mơ',
    bgGradient: 'from-violet-400 to-fuchsia-400',
    accentColor: '#8b5cf6',
    borderColor: 'border-violet-300',
  },
];

export const ALL_CHIBI_AVATARS = [...BOY_CHIBI_AVATARS, ...GIRL_CHIBI_AVATARS];
export const CHIBI_AVATARS = ALL_CHIBI_AVATARS;

/**
 * Returns a deterministic cute Chibi avatar based on gender and seed (e.g. student id or code)
 */
export function getChibiAvatarInfo(gender: 'Nam' | 'Nữ' | string = 'Nam', avatarId?: string, seed?: string): ChibiAvatarInfo {
  const safeGender: 'Nam' | 'Nữ' = gender === 'Nữ' ? 'Nữ' : 'Nam';
  const pool = safeGender === 'Nữ' ? GIRL_CHIBI_AVATARS : BOY_CHIBI_AVATARS;
  if (avatarId) {
    const found = pool.find((a) => a.id === avatarId) || ALL_CHIBI_AVATARS.find((a) => a.id === avatarId);
    if (found) return found;
  }

  if (!seed) return pool[0];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const index = hash % pool.length;
  return pool[index];
}

interface ChibiAvatarProps {
  gender?: 'Nam' | 'Nữ';
  avatarId?: string;
  seed?: string;
  size?: number; // pixel size e.g. 32, 40, 48, 64, 80
  className?: string;
  showGenderBadge?: boolean;
}

export const ChibiAvatar: React.FC<ChibiAvatarProps> = ({
  gender = 'Nam',
  avatarId,
  seed = '',
  size = 36,
  className = '',
  showGenderBadge = false,
}) => {
  const avatar = getChibiAvatarInfo(gender, avatarId, seed);
  const isBoy = avatar.gender === 'Nam';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${className}`}
      style={{ width: size, height: size }}
      title={`${avatar.name} (${avatar.gender})`}
    >
      {/* Outer SVG illustration */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full rounded-full shadow-xs transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id={`bg_${avatar.id}_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isBoy ? '#E0F2FE' : '#FCE7F3'} />
            <stop offset="100%" stopColor={isBoy ? '#BAE6FD' : '#FBCFE8'} />
          </linearGradient>
          <radialGradient id={`blush_${avatar.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isBoy ? '#FDA4AF' : '#FB7185'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isBoy ? '#FDA4AF' : '#FB7185'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill={`url(#bg_${avatar.id}_${size})`} />
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={isBoy ? '#38BDF8' : '#F472B6'}
          strokeWidth="2.5"
        />

        {/* --- Specific Chibi Character Rendering --- */}
        {isBoy ? (
          /* BOY CHARACTERS */
          <g id="boy_chibi">
            {/* Clothes / Collar */}
            <path
              d="M30 85 Q50 78 70 85 L74 98 Q50 102 26 98 Z"
              fill={avatar.id === 'boy_cap' ? '#0284C7' : avatar.id === 'boy_glasses' ? '#4F46E5' : '#059669'}
            />
            {/* Shirt white collar */}
            <polygon points="50,78 40,73 43,84 50,88 57,84 60,73" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
            {/* Red scarf (Khăn quàng đỏ) for elementary students */}
            <polygon points="46,84 54,84 56,96 50,94 44,96" fill="#DC2626" />

            {/* Neck */}
            <rect x="44" y="66" width="12" height="10" rx="3" fill="#FFDFC4" />

            {/* Ears */}
            <ellipse cx="27" cy="52" rx="5" ry="7" fill="#FFDFC4" />
            <ellipse cx="73" cy="52" rx="5" ry="7" fill="#FFDFC4" />

            {/* Face base */}
            <circle cx="50" cy="51" r="23" fill="#FFE8D6" />

            {/* Rosy Blush Cheeks */}
            <circle cx="36" cy="56" r="5" fill={`url(#blush_${avatar.id})`} />
            <circle cx="64" cy="56" r="5" fill={`url(#blush_${avatar.id})`} />

            {/* Boy Hair & Headwear */}
            {avatar.id === 'boy_cap' ? (
              /* Cap */
              <g>
                <path d="M26 48 Q28 26 50 25 Q72 26 74 48 Q50 44 26 48 Z" fill="#0284C7" />
                <path d="M28 42 Q50 36 72 42 L80 44 Q50 40 26 45 Z" fill="#0369A1" />
                {/* Cap visor */}
                <ellipse cx="64" cy="42" rx="16" ry="4" fill="#0284C7" stroke="#075985" strokeWidth="1" />
                {/* Tiny hair strands under cap */}
                <path d="M30 46 Q35 52 40 46" stroke="#332211" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M42 46 Q47 53 52 46" stroke="#332211" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </g>
            ) : avatar.id === 'boy_star' ? (
              /* Hair with Star Headband */
              <g>
                <path d="M26 48 Q28 24 50 22 Q72 24 74 48 Q64 34 50 34 Q36 34 26 48 Z" fill="#452718" />
                {/* Front bangs */}
                <path d="M30 38 Q38 46 44 38 Q50 46 56 38 Q62 45 70 38" fill="#452718" />
                {/* Star Band */}
                <rect x="27" y="32" width="46" height="4" rx="2" fill="#10B981" />
                <polygon points="50,28 52,33 57,33 53,36 55,41 50,38 45,41 47,36 43,33 48,33" fill="#FBBF24" />
              </g>
            ) : (
              /* Neat Boy Hair */
              <g>
                <path d="M26 48 Q27 22 50 20 Q73 22 74 48 Q64 32 50 32 Q35 32 26 48 Z" fill="#241400" />
                {/* Tuft of hair */}
                <path d="M30 38 C34 46, 38 48, 42 38 C46 47, 52 47, 56 38 C60 46, 66 45, 70 37" fill="#241400" />
              </g>
            )}

            {/* Eyes */}
            <ellipse cx="38" cy="51" rx="3.5" ry="4.5" fill="#1E293B" />
            <ellipse cx="62" cy="51" rx="3.5" ry="4.5" fill="#1E293B" />
            {/* Eye reflections (twinkle) */}
            <circle cx="39" cy="49.5" r="1.5" fill="#FFFFFF" />
            <circle cx="37" cy="52.5" r="0.8" fill="#FFFFFF" />
            <circle cx="63" cy="49.5" r="1.5" fill="#FFFFFF" />
            <circle cx="61" cy="52.5" r="0.8" fill="#FFFFFF" />

            {/* Glasses if boy_glasses */}
            {avatar.id === 'boy_glasses' && (
              <g>
                <circle cx="38" cy="51" r="7" fill="none" stroke="#3730A3" strokeWidth="2" />
                <circle cx="62" cy="51" r="7" fill="none" stroke="#3730A3" strokeWidth="2" />
                <line x1="45" y1="51" x2="55" y2="51" stroke="#3730A3" strokeWidth="2" />
              </g>
            )}

            {/* Smile / Mouth */}
            <path
              d={avatar.id === 'boy_smile' ? 'M44 59 Q50 66 56 59 Z' : 'M45 60 Q50 64 55 60'}
              stroke="#B91C1C"
              strokeWidth="2"
              fill={avatar.id === 'boy_smile' ? '#EF4444' : 'none'}
              strokeLinecap="round"
            />
          </g>
        ) : (
          /* GIRL CHARACTERS */
          <g id="girl_chibi">
            {/* Girl Back Hair (Twin tails or long hair) */}
            <path d="M22 45 C16 62, 20 78, 25 86 C27 80, 28 66, 29 55" fill="#3D1C06" />
            <path d="M78 45 C84 62, 80 78, 75 86 C73 80, 72 66, 71 55" fill="#3D1C06" />

            {/* Clothes / Dress */}
            <path
              d="M30 84 Q50 77 70 84 L75 98 Q50 102 25 98 Z"
              fill={avatar.id === 'girl_bow' ? '#EC4899' : avatar.id === 'girl_flower' ? '#F43F5E' : '#8B5CF6'}
            />
            {/* White round collar */}
            <path d="M42 77 Q50 83 58 77 L60 83 Q50 89 40 83 Z" fill="#FFFFFF" stroke="#FBCFE8" strokeWidth="1" />
            {/* Red scarf or cute ribbon */}
            <polygon points="46,83 54,83 55,95 50,93 45,95" fill="#E11D48" />

            {/* Neck */}
            <rect x="44" y="66" width="12" height="10" rx="3" fill="#FFE4E6" />

            {/* Ears */}
            <ellipse cx="27" cy="53" rx="4.5" ry="6.5" fill="#FFE4E6" />
            <ellipse cx="73" cy="53" rx="4.5" ry="6.5" fill="#FFE4E6" />

            {/* Face base */}
            <circle cx="50" cy="52" r="22.5" fill="#FFF1F2" />

            {/* Rosy Pink Cheeks */}
            <circle cx="36" cy="57" r="5.5" fill={`url(#blush_${avatar.id})`} />
            <circle cx="64" cy="57" r="5.5" fill={`url(#blush_${avatar.id})`} />

            {/* Girl Hair front & bangs */}
            <path d="M26 48 Q28 22 50 20 Q72 22 74 48 Q64 34 50 34 Q36 34 26 48 Z" fill="#3D1C06" />
            {/* Cute curved bangs */}
            <path d="M30 38 Q38 48 44 39 Q50 48 56 39 Q62 47 70 38 Q50 33 30 38 Z" fill="#3D1C06" />

            {/* Cute Accessories */}
            {avatar.id === 'girl_bow' ? (
              /* Pink Bows on both sides */
              <g>
                {/* Left bow */}
                <polygon points="21,43 27,40 27,46" fill="#F43F5E" />
                <polygon points="21,43 15,40 15,46" fill="#F43F5E" />
                <circle cx="21" cy="43" r="2.5" fill="#FFE4E6" />
                {/* Right bow */}
                <polygon points="79,43 73,40 73,46" fill="#F43F5E" />
                <polygon points="79,43 85,40 85,46" fill="#F43F5E" />
                <circle cx="79" cy="43" r="2.5" fill="#FFE4E6" />
              </g>
            ) : avatar.id === 'girl_flower' ? (
              /* Sunflower or Daisy */
              <g transform="translate(62, 30)">
                <circle cx="0" cy="0" r="5" fill="#F59E0B" />
                <circle cx="-5" cy="0" r="3" fill="#FDE047" />
                <circle cx="5" cy="0" r="3" fill="#FDE047" />
                <circle cx="0" cy="-5" r="3" fill="#FDE047" />
                <circle cx="0" cy="5" r="3" fill="#FDE047" />
                <circle cx="0" cy="0" r="2.5" fill="#92400E" />
              </g>
            ) : avatar.id === 'girl_bob' ? (
              /* Strawberry clip */
              <g transform="translate(32, 33)">
                <polygon points="0,0 -4,-5 4,-5" fill="#EF4444" />
                <circle cx="0" cy="-6" r="2" fill="#10B981" />
              </g>
            ) : null}

            {/* Sparkly Big Anime Eyes */}
            <ellipse cx="38" cy="52" rx="4" ry="5.5" fill="#2E1065" />
            <ellipse cx="62" cy="52" rx="4" ry="5.5" fill="#2E1065" />
            {/* Eyelashes */}
            <path d="M33 48 Q37 45 42 47" stroke="#2E1065" strokeWidth="1.5" fill="none" />
            <path d="M58 47 Q63 45 67 48" stroke="#2E1065" strokeWidth="1.5" fill="none" />
            {/* Sparkle glints */}
            <circle cx="39.5" cy="50" r="2" fill="#FFFFFF" />
            <circle cx="37" cy="54" r="1" fill="#FFFFFF" />
            <circle cx="63.5" cy="50" r="2" fill="#FFFFFF" />
            <circle cx="61" cy="54" r="1" fill="#FFFFFF" />

            {/* Glasses if girl_glasses */}
            {avatar.id === 'girl_glasses' && (
              <g>
                <circle cx="38" cy="52" r="7.5" fill="none" stroke="#DB2777" strokeWidth="2" />
                <circle cx="62" cy="52" r="7.5" fill="none" stroke="#DB2777" strokeWidth="2" />
                <line x1="45.5" y1="52" x2="54.5" y2="52" stroke="#DB2777" strokeWidth="2" />
              </g>
            )}

            {/* Sweet Smile */}
            <path
              d="M45 61 Q50 66 55 61"
              stroke="#E11D48"
              strokeWidth="2"
              fill="#FDA4AF"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/* Optional tiny gender badge */}
      {showGenderBadge && (
        <span
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-xs border ${
            isBoy
              ? 'bg-blue-500 text-white border-white'
              : 'bg-pink-500 text-white border-white'
          }`}
          title={avatar.gender}
        >
          {isBoy ? '♂' : '♀'}
        </span>
      )}
    </div>
  );
};
