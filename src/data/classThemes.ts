export interface CuteClassTheme {
  id: string;
  name: string;
  category: 'animal' | 'flower';
  emoji: string;
  label: string;
  colorName: string;
  bgGradient: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  accentBadge: string;
}

export const CUTE_CLASS_THEMES: CuteClassTheme[] = [
  // Animals (Con vật dễ thương)
  {
    id: 'rabbit',
    name: 'Thỏ Trắng Thông Thái',
    category: 'animal',
    emoji: '🐰',
    label: 'Chú Thỏ Trắng',
    colorName: 'rose',
    bgGradient: 'from-pink-500 to-rose-400',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-200 hover:border-pink-400',
    textColor: 'text-pink-700',
    accentBadge: 'bg-pink-100 text-pink-700 border-pink-200',
  },
  {
    id: 'cat',
    name: 'Mèo Con Chăm Chỉ',
    category: 'animal',
    emoji: '🐱',
    label: 'Mèo Con Chăm Ngoan',
    colorName: 'amber',
    bgGradient: 'from-amber-400 to-orange-400',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-400',
    textColor: 'text-amber-800',
    accentBadge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'puppy',
    name: 'Cún Con Vui Vẻ',
    category: 'animal',
    emoji: '🐶',
    label: 'Cún Cưng Nhanh Nhẹn',
    colorName: 'sky',
    bgGradient: 'from-sky-400 to-blue-500',
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200 hover:border-sky-400',
    textColor: 'text-sky-700',
    accentBadge: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  {
    id: 'squirrel',
    name: 'Sóc Nâu Nhanh Nhẹn',
    category: 'animal',
    emoji: '🐿️',
    label: 'Sóc Nâu Tinh Anh',
    colorName: 'orange',
    bgGradient: 'from-amber-500 to-amber-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200 hover:border-orange-400',
    textColor: 'text-orange-800',
    accentBadge: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'panda',
    name: 'Gấu Trúc Đáng Yêu',
    category: 'animal',
    emoji: '🐼',
    label: 'Gấu Trúc Thân Thiện',
    colorName: 'emerald',
    bgGradient: 'from-emerald-400 to-teal-500',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    textColor: 'text-emerald-800',
    accentBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'bee',
    name: 'Ong Vàng Cần Mẫn',
    category: 'animal',
    emoji: '🐝',
    label: 'Ong Nhí Chăm Học',
    colorName: 'yellow',
    bgGradient: 'from-yellow-400 to-amber-500',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-300 hover:border-yellow-400',
    textColor: 'text-yellow-800',
    accentBadge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    id: 'butterfly',
    name: 'Bướm Xinh Rực Rỡ',
    category: 'animal',
    emoji: '🦋',
    label: 'Bướm Xinh Năng Động',
    colorName: 'purple',
    bgGradient: 'from-purple-400 to-violet-500',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200 hover:border-purple-400',
    textColor: 'text-purple-800',
    accentBadge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'bird',
    name: 'Sơn Ca Hót Vang',
    category: 'animal',
    emoji: '🐦',
    label: 'Chim Sơn Ca',
    colorName: 'cyan',
    bgGradient: 'from-cyan-400 to-blue-400',
    bgLight: 'bg-cyan-50',
    borderColor: 'border-cyan-200 hover:border-cyan-400',
    textColor: 'text-cyan-800',
    accentBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },

  // Flowers (Hình hoa tươi vui)
  {
    id: 'sunflower',
    name: 'Hoa Hướng Dương',
    category: 'flower',
    emoji: '🌻',
    label: 'Hướng Dương Rạng Rỡ',
    colorName: 'amber',
    bgGradient: 'from-amber-400 to-yellow-500',
    bgLight: 'bg-amber-50/70',
    borderColor: 'border-amber-200 hover:border-amber-400',
    textColor: 'text-amber-800',
    accentBadge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'lotus',
    name: 'Hoa Sen Hồng',
    category: 'flower',
    emoji: '🪷',
    label: 'Sen Hồng Thanh Cao',
    colorName: 'rose',
    bgGradient: 'from-rose-400 to-pink-500',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200 hover:border-rose-400',
    textColor: 'text-rose-800',
    accentBadge: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    id: 'tulip',
    name: 'Hoa Tulip Tươi Tắn',
    category: 'flower',
    emoji: '🌷',
    label: 'Tulip Sắc Màu',
    colorName: 'red',
    bgGradient: 'from-red-400 to-rose-500',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200 hover:border-red-400',
    textColor: 'text-red-800',
    accentBadge: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    id: 'daisy',
    name: 'Hoa Cúc Họa Mi',
    category: 'flower',
    emoji: '🌼',
    label: 'Cúc Nhỏ Trong Sáng',
    colorName: 'teal',
    bgGradient: 'from-teal-400 to-emerald-500',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200 hover:border-teal-400',
    textColor: 'text-teal-800',
    accentBadge: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  {
    id: 'cherry',
    name: 'Hoa Anh Đào',
    category: 'flower',
    emoji: '🌸',
    label: 'Hoa Anh Đào Dịu Dàng',
    colorName: 'pink',
    bgGradient: 'from-pink-400 to-fuchsia-400',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-200 hover:border-pink-400',
    textColor: 'text-pink-800',
    accentBadge: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  {
    id: 'clover',
    name: 'Cỏ Bốn Lá May Mắn',
    category: 'flower',
    emoji: '🍀',
    label: 'Cỏ May Mắn',
    colorName: 'green',
    bgGradient: 'from-green-400 to-emerald-500',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200 hover:border-green-400',
    textColor: 'text-green-800',
    accentBadge: 'bg-green-100 text-green-800 border-green-200',
  },
];

export function getThemeByClass(className: string, avatarId?: string): CuteClassTheme {
  if (avatarId) {
    const found = CUTE_CLASS_THEMES.find((t) => t.id === avatarId);
    if (found) return found;
  }

  // Smart deterministic matching based on class name
  const upper = (className || '').toUpperCase();
  if (upper.includes('1A')) return CUTE_CLASS_THEMES[0]; // 🐰 Thỏ Trắng
  if (upper.includes('1B')) return CUTE_CLASS_THEMES[1]; // 🐱 Mèo Con
  if (upper.includes('2A')) return CUTE_CLASS_THEMES[2]; // 🐶 Cún Con
  if (upper.includes('2B')) return CUTE_CLASS_THEMES[3]; // 🐿️ Sóc Nâu
  if (upper.includes('3A')) return CUTE_CLASS_THEMES[8]; // 🌻 Hướng Dương
  if (upper.includes('3B')) return CUTE_CLASS_THEMES[5]; // 🐝 Ong Vàng
  if (upper.includes('4A')) return CUTE_CLASS_THEMES[4]; // 🐼 Gấu Trúc
  if (upper.includes('4B')) return CUTE_CLASS_THEMES[9]; // 🪷 Hoa Sen
  if (upper.includes('5A')) return CUTE_CLASS_THEMES[7]; // 🐦 Sơn Ca
  if (upper.includes('5B')) return CUTE_CLASS_THEMES[6]; // 🦋 Bướm Xinh

  // Fallback hash
  let sum = 0;
  for (let i = 0; i < upper.length; i++) sum += upper.charCodeAt(i);
  return CUTE_CLASS_THEMES[sum % CUTE_CLASS_THEMES.length];
}
