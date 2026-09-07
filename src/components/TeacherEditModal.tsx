import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  BookOpen,
  GraduationCap,
  Save,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Teacher } from '../types';
import { storage } from '../services/storage';

interface TeacherEditModalProps {
  isOpen: boolean;
  teacher: Teacher | null;
  classNameContext?: string; // Optional class name if editing from a class card
  onClose: () => void;
  onSaved?: (updatedTeacher: Teacher) => void;
}

// Preset pedagogical cute teacher avatars (properly sized at 48px - never oversized)
const TEACHER_AVATAR_PRESETS = [
  { id: 'teacher_female_aodai', label: 'Cô giáo Áo dài', emoji: '👩‍🏫', color: 'from-pink-500 to-rose-400' },
  { id: 'teacher_male_shirt', label: 'Thầy giáo Sơ mi', emoji: '👨‍🏫', color: 'from-blue-500 to-sky-400' },
  { id: 'teacher_female_glasses', label: 'Cô giáo Kính cận', emoji: '👩‍🎓', color: 'from-purple-500 to-indigo-400' },
  { id: 'teacher_male_smile', label: 'Thầy giáo Trẻ', emoji: '🧑‍🏫', color: 'from-emerald-500 to-teal-400' },
];

export const TeacherEditModal: React.FC<TeacherEditModalProps> = ({
  isOpen,
  teacher,
  classNameContext,
  onClose,
  onSaved,
}) => {
  const db = storage.getDb();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('teacher_female_aodai');
  const [subjectsStr, setSubjectsStr] = useState('');
  const [role, setRole] = useState<'homeroom' | 'subject' | 'admin'>('homeroom');
  const [assignedClassesStr, setAssignedClassesStr] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.fullName || '');
      setPhone(teacher.phone || '');
      setEmail(teacher.email || '');
      setRole((teacher.role as any) || 'homeroom');
      setSubjectsStr(teacher.subjects?.join(', ') || '');
      // Find classes assigned
      const classNames = db.classes
        .filter((c) => c.homeroomTeacherId === teacher.id || c.subjectTeacherIds?.includes(teacher.id))
        .map((c) => c.name);
      setAssignedClassesStr(teacher.assignedClassIds?.join(', ') || classNames.join(', '));
    } else if (classNameContext) {
      // Find class and its teacher
      const cls = db.classes.find((c) => c.name === classNameContext);
      if (cls) {
        setFullName(cls.customTeacherName || 'Cô Nguyễn Thị Mai');
        setPhone(cls.customTeacherPhone || '0905 123 456');
        setAssignedClassesStr(cls.name);
      }
    }
  }, [teacher, classNameContext, db.classes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên giáo viên.');
      return;
    }

    const subjectsArr = subjectsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let updatedDb = { ...db };

    if (teacher) {
      const updatedTeachers = db.teachers.map((t) => {
        if (t.id === teacher.id) {
          return {
            ...t,
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            role: role as any,
            subjects: subjectsArr.length > 0 ? subjectsArr : t.subjects,
          };
        }
        return t;
      });

      // Also update matching classes customTeacherName if homeroom
      const updatedClasses = db.classes.map((cls) => {
        if (cls.homeroomTeacherId === teacher.id) {
          return {
            ...cls,
            customTeacherName: fullName.trim(),
            customTeacherPhone: phone.trim(),
          };
        }
        return cls;
      });

      // Update current user if this is the active user
      let updatedCurrentUser = db.currentUser;
      if (db.currentUser?.id === teacher.id) {
        updatedCurrentUser = {
          ...db.currentUser,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role: role as any,
        };
      }

      updatedDb = {
        ...updatedDb,
        teachers: updatedTeachers,
        classes: updatedClasses,
        currentUser: updatedCurrentUser,
      };

      if (onSaved) {
        onSaved({
          ...teacher,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role: role as any,
          subjects: subjectsArr,
        });
      }
    } else if (classNameContext) {
      // Direct class teacher name update
      const updatedClasses = db.classes.map((cls) => {
        if (cls.name === classNameContext) {
          return {
            ...cls,
            customTeacherName: fullName.trim(),
            customTeacherPhone: phone.trim(),
          };
        }
        return cls;
      });
      updatedDb = {
        ...updatedDb,
        classes: updatedClasses,
      };
    }

    storage.save(updatedDb, true, {
      category: 'Hệ thống',
      action: 'Cập nhật thông tin giáo viên',
      details: `Đã thay đổi thông tin giáo viên: ${fullName} (SĐT: ${phone}).`,
    });

    setSuccessMessage('Đã lưu thông tin giáo viên thành công!');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      {/* Modal Container with strict height and clean layout */}
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header - Fixed at Top */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-lg">
              👩‍🏫
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                Thay đổi thông tin Giáo viên
              </h3>
              <p className="text-[11px] text-sky-100 mt-0.5">
                {classNameContext ? `Lớp ${classNameContext} – Tiểu học Nam Phước 2` : 'Thông tin hồ sơ giáo viên'}
              </p>
            </div>
          </div>

          {/* Close button (Nút thoát trên header) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-sky-100 hover:text-white transition"
            title="Thoát / Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Teacher Avatar Selector - Compact, Never Oversized (Max 48px) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hình ảnh đại diện Giáo viên (Biểu tượng chuẩn):
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
              {TEACHER_AVATAR_PRESETS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`flex-1 p-2 rounded-xl flex flex-col items-center justify-center text-center transition cursor-pointer ${
                    selectedAvatar === av.id
                      ? 'bg-white shadow-md border-2 border-sky-500 scale-105'
                      : 'hover:bg-white/80 border border-transparent opacity-80'
                  }`}
                  title={av.label}
                >
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-tr ${av.color} flex items-center justify-center text-xl shadow-xs`}
                  >
                    <span>{av.emoji}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1 truncate w-full">
                    {av.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Hình ảnh được tinh gọn chuẩn tỉ lệ để luôn hiển thị đầy đủ các nút bấm.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span>Họ và tên Giáo viên:</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Cô Nguyễn Thị Mai"
              className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              required
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Số điện thoại:</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0905 xxx xxx"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email liên hệ:</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="giaovien@tieuhoc.edu.vn"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Role & Subjects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vai trò phụ trách:</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-hidden"
              >
                <option value="homeroom">Giáo viên Chủ nhiệm</option>
                <option value="subject">Giáo viên Bộ môn</option>
                <option value="admin">Ban Giám Hiệu / Quản trị</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Môn dạy:</span>
              </label>
              <input
                type="text"
                value={subjectsStr}
                onChange={(e) => setSubjectsStr(e.target.value)}
                placeholder="Toán, Tiếng Việt, Anh văn..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Assigned Classes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Lớp được phân công phụ trách:</span>
            </label>
            <input
              type="text"
              value={assignedClassesStr}
              onChange={(e) => setAssignedClassesStr(e.target.value)}
              placeholder="Ví dụ: 4A, 4B hoặc 3A, 4A, 5A"
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * GVCN phụ trách 1 lớp; GV chuyên môn phụ trách nhiều lớp khác nhau.
            </p>
          </div>
        </form>

        {/* Modal Footer - Fixed at Bottom with Permanent Escape and Change Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition cursor-pointer shadow-2xs"
            title="Thoát không lưu"
          >
            ✕ Thoát
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Lưu thay đổi thông tin giáo viên"
          >
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
