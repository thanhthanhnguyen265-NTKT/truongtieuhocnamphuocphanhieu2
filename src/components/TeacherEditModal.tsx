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
  Trash2,
} from 'lucide-react';
import { Teacher } from '../types';
import { storage } from '../services/storage';
import { isRootOwnerTeacher } from './TeachersView';

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
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.fullName || '');
      setPhone(teacher.phone || '');
      setEmail(teacher.email || '');
      setRole((teacher.role as any) || 'homeroom');
      setSubjectsStr(teacher.subjects?.join(', ') || '');
      
      // Find all classes assigned to this teacher
      const linkedClasses = db.classes.filter(
        (c) =>
          c.homeroomTeacherId === teacher.id ||
          (c.customTeacherName && c.customTeacherName.toLowerCase().trim() === teacher.fullName?.toLowerCase().trim()) ||
          teacher.assignedClassIds?.includes(c.id)
      );
      const initialClassIds = Array.from(
        new Set([...(teacher.assignedClassIds || []), ...linkedClasses.map((c) => c.id)])
      );
      setSelectedClassIds(initialClassIds);
    } else if (classNameContext) {
      // Find class and its teacher
      const cls = db.classes.find((c) => c.name === classNameContext);
      if (cls) {
        setFullName(cls.customTeacherName || 'Cô Nguyễn Thị Mai');
        setPhone(cls.customTeacherPhone || '0905 123 456');
        setSelectedClassIds([cls.id]);
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
      const updatedTeacher: Teacher = {
        ...teacher,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role: role as any,
        subjects: subjectsArr.length > 0 ? subjectsArr : teacher.subjects,
        assignedClassIds: selectedClassIds,
      };

      const updatedTeachers = db.teachers.map((t) => {
        if (t.id === teacher.id) {
          return updatedTeacher;
        }
        return t;
      });

      // Synchronize classes: unassign removed classes and update assigned ones
      const updatedClasses = db.classes.map((cls) => {
        const wasHomeroom =
          cls.homeroomTeacherId === teacher.id ||
          (cls.customTeacherName &&
            cls.customTeacherName.toLowerCase().trim() === teacher.fullName?.toLowerCase().trim());
        const wasSubjectTeacher = cls.subjectTeacherIds?.includes(teacher.id);
        const wasAssigned = (teacher.assignedClassIds || []).includes(cls.id) || wasHomeroom;

        const isNowAssigned = selectedClassIds.includes(cls.id);

        if (!isNowAssigned && (wasHomeroom || wasSubjectTeacher || wasAssigned)) {
          return {
            ...cls,
            homeroomTeacherId: wasHomeroom ? 'T001' : cls.homeroomTeacherId,
            customTeacherName: wasHomeroom ? 'Chưa phân công' : cls.customTeacherName,
            customTeacherPhone: wasHomeroom ? '' : cls.customTeacherPhone,
            subjectTeacherIds: (cls.subjectTeacherIds || []).filter((id) => id !== teacher.id),
          };
        }

        if (isNowAssigned) {
          if (role === 'homeroom') {
            return {
              ...cls,
              homeroomTeacherId: teacher.id,
              customTeacherName: fullName.trim(),
              customTeacherPhone: phone.trim(),
            };
          } else {
            const currentSubIds = cls.subjectTeacherIds || [];
            const newSubIds = currentSubIds.includes(teacher.id)
              ? currentSubIds
              : [...currentSubIds, teacher.id];
            return {
              ...cls,
              homeroomTeacherId: wasHomeroom ? 'T001' : cls.homeroomTeacherId,
              customTeacherName: wasHomeroom ? 'Chưa phân công' : cls.customTeacherName,
              subjectTeacherIds: newSubIds,
            };
          }
        }

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
          assignedClassIds: selectedClassIds,
        };
      }

      // Clean up subject classes for removed classes
      const removedClassIds = (teacher.assignedClassIds || []).filter(
        (id) => !selectedClassIds.includes(id)
      );
      const updatedSubjectClasses = (db.subjectClasses || []).filter((sc) => {
        if (
          sc.teacherId === teacher.id ||
          (sc.teacherName && sc.teacherName.toLowerCase().trim() === teacher.fullName?.toLowerCase().trim())
        ) {
          const linksToRemoved = (sc.linkedClassIds || []).some((cid) => removedClassIds.includes(cid));
          return !linksToRemoved;
        }
        return true;
      });

      updatedDb = {
        ...updatedDb,
        teachers: updatedTeachers,
        classes: updatedClasses,
        subjectClasses: updatedSubjectClasses,
        currentUser: updatedCurrentUser,
      };

      if (onSaved) {
        onSaved(updatedTeacher);
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

  const handleDeleteTeacher = () => {
    if (!teacher || isRootOwnerTeacher(teacher)) {
      alert('Không thể xóa tài khoản Quản trị viên / Chủ sở hữu chính của trường (Thanh Nguyễn).');
      return;
    }

    const currentDb = storage.getDb();
    const updatedTeachers = currentDb.teachers.filter((t) => t.id !== teacher.id);
    const updatedClasses = currentDb.classes.map((cls) => {
      let changed = false;
      let newHomeroomId = cls.homeroomTeacherId;
      let newTeacherName = cls.customTeacherName;
      let newSubjectTeacherIds = cls.subjectTeacherIds;

      if (cls.homeroomTeacherId === teacher.id) {
        newHomeroomId = 'T001';
        newTeacherName = 'Chưa phân công';
        changed = true;
      }
      if (cls.subjectTeacherIds?.includes(teacher.id)) {
        newSubjectTeacherIds = cls.subjectTeacherIds.filter((id) => id !== teacher.id);
        changed = true;
      }
      if (changed) {
        return {
          ...cls,
          homeroomTeacherId: newHomeroomId,
          customTeacherName: newTeacherName,
          subjectTeacherIds: newSubjectTeacherIds,
        };
      }
      return cls;
    });

    const updatedSubjectClasses = (currentDb.subjectClasses || []).filter(
      (sc) => sc.teacherId !== teacher.id && sc.teacherName !== teacher.fullName
    );

    let updatedCurrentUser = currentDb.currentUser;
    if (currentDb.currentUser?.id === teacher.id) {
      updatedCurrentUser = updatedTeachers.find((x) => x.isOwner) || updatedTeachers[0] || currentDb.currentUser;
    }

    const updatedDb = {
      ...currentDb,
      teachers: updatedTeachers,
      classes: updatedClasses,
      subjectClasses: updatedSubjectClasses,
      currentUser: updatedCurrentUser,
    };

    storage.save(updatedDb, true, {
      category: 'Hệ thống',
      action: 'Xóa giáo viên',
      details: `Đã xóa giáo viên ${teacher.fullName} khỏi hệ thống.`,
      status: 'SUCCESS',
    });

    setSuccessMessage('Đã xóa giáo viên khỏi hệ thống!');
    setTimeout(() => {
      setSuccessMessage('');
      setShowDeleteConfirm(false);
      onClose();
    }, 800);
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Lớp được phân công phụ trách ({selectedClassIds.length} lớp):</span>
              </label>
              {selectedClassIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedClassIds([])}
                  className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Bỏ chọn tất cả lớp
                </button>
              )}
            </div>

            {/* Visual class chips with direct delete button */}
            {selectedClassIds.length > 0 ? (
              <div className="mb-2 p-2 bg-sky-50 border border-sky-200 rounded-xl">
                <div className="text-[11px] font-bold text-sky-800 mb-1">
                  Các lớp đang phụ trách (Bấm ✕ để xóa lớp khỏi giáo viên này):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedClassIds.map((cid) => {
                    const cls = db.classes.find((c) => c.id === cid);
                    const cName = cls?.name || cid;
                    return (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-sky-900 rounded-lg text-xs font-bold border border-sky-300 shadow-2xs"
                      >
                        <span>Lớp {cName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassIds((prev) => prev.filter((id) => id !== cid));
                          }}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full p-0.5 transition cursor-pointer"
                          title={`Xóa Lớp ${cName} khỏi giáo viên`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                Chưa phân công lớp nào. Hãy chọn lớp bên dưới:
              </div>
            )}

            {/* Quick check/uncheck available classes */}
            <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
              {db.classes
                .filter((c) => c.schoolYearId === db.currentSchoolYearId)
                .map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedClassIds((prev) => prev.filter((id) => id !== cls.id));
                          } else {
                            setSelectedClassIds((prev) => [...prev, cls.id]);
                          }
                        }}
                        className="rounded text-sky-600 cursor-pointer"
                      />
                      <span>Lớp {cls.name}</span>
                    </label>
                  );
                })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * GVCN phụ trách 1 lớp; GV chuyên môn phụ trách nhiều lớp khác nhau. Bấm dấu ✕ trên thẻ để xóa lớp khỏi giáo viên.
            </p>
          </div>
        </form>

        {/* Modal Footer - Fixed at Bottom with Permanent Escape and Change Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20">
          <div>
            {teacher && !isRootOwnerTeacher(teacher) && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Xóa giáo viên này khỏi hệ thống"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa giáo viên</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
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

        {/* Delete confirmation dialog inside TeacherEditModal */}
        {showDeleteConfirm && teacher && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa giáo viên?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa giáo viên{' '}
                  <strong className="text-slate-800">{teacher.fullName}</strong> khỏi hệ thống? Dữ liệu lớp chủ nhiệm và môn giảng dạy sẽ được giải phóng an toàn.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTeacher}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Đồng ý xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
