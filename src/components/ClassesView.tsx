import React, { useState } from 'react';
import {
  Layers,
  Users,
  Plus,
  CheckCircle2,
  Award,
  Sparkles,
  Edit2,
  Trash2,
  GraduationCap,
  Heart,
  DoorOpen,
  Phone,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { storage } from '../services/storage';
import { ClassRoom } from '../types';
import { CUTE_CLASS_THEMES, getThemeByClass } from '../data/classThemes';
import { TeacherEditModal } from './TeacherEditModal';

interface ClassesViewProps {
  onNavigate: (tab: any, params?: any) => void;
  onOpenImportModal: (classId?: string) => void;
  onOpenOwnerModal: (action: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  onNavigate,
  onOpenImportModal,
  onOpenOwnerModal,
}) => {
  const db = storage.getDb();
  const [selectedGradeId, setSelectedGradeId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'animal' | 'flower'>('all');

  // Add Class Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeId, setNewGradeId] = useState('G4');
  const [newTeacherName, setNewTeacherName] = useState('Cô Nguyễn Thị Mai');
  const [newTeacherPhone, setNewTeacherPhone] = useState('0905 123 456');
  const [newRoom, setNewRoom] = useState('P.403');
  const [newAvatarThemeId, setNewAvatarThemeId] = useState('panda');

  // Edit Class Modal state
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editAvatarThemeId, setEditAvatarThemeId] = useState('panda');
  const [editNotes, setEditNotes] = useState('');

  // Delete Confirm Modal
  const [deletingClass, setDeletingClass] = useState<ClassRoom | null>(null);

  // Dedicated Teacher Edit Modal state
  const [editingTeacherClass, setEditingTeacherClass] = useState<ClassRoom | null>(null);

  const isAllowedToEdit = db.currentUser?.isOwner || db.currentUser?.permissions?.edit || db.isOwnerUnlocked;

  const currentYearClasses = db.classes.filter((c) => {
    if (c.schoolYearId !== db.currentSchoolYearId) return false;
    if (selectedGradeId !== 'all' && c.gradeId !== selectedGradeId) return false;
    if (selectedCategory !== 'all') {
      const theme = getThemeByClass(c.name, c.avatarThemeId);
      if (theme.category !== selectedCategory) return false;
    }
    return true;
  });

  const handleOpenEdit = (cls: ClassRoom) => {
    if (!isAllowedToEdit) {
      storage.logAccessOrModificationAttempt(`Sửa thông tin lớp ${cls.name}`, `Người dùng yêu cầu đổi tên lớp, phòng học hoặc thông tin GVCN lớp ${cls.name}`);
      onOpenOwnerModal(`Sửa thông tin lớp ${cls.name}`);
      return;
    }
    const currentTheme = getThemeByClass(cls.name, cls.avatarThemeId);
    const matchedTeacher = db.teachers.find((t) => t.id === cls.homeroomTeacherId);
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditRoomNumber(cls.roomNumber || '');
    setEditTeacherName(cls.customTeacherName || matchedTeacher?.fullName || '');
    setEditTeacherPhone(cls.customTeacherPhone || matchedTeacher?.phone || '');
    setEditAvatarThemeId(cls.avatarThemeId || currentTheme.id);
    setEditNotes(cls.notes || '');
  };

  const handleOpenTeacherEdit = (cls: ClassRoom) => {
    if (!isAllowedToEdit) {
      storage.logAccessOrModificationAttempt(`Sửa thông tin GVCN lớp ${cls.name}`);
      onOpenOwnerModal(`Sửa thông tin GVCN lớp ${cls.name}`);
      return;
    }
    setEditingTeacherClass(cls);
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    if (!isAllowedToEdit) {
      storage.logAccessOrModificationAttempt(`Lưu thay đổi lớp ${editingClass.name}`);
      onOpenOwnerModal(`Lưu thay đổi lớp ${editingClass.name}`);
      return;
    }

    const updatedClasses = db.classes.map((cls) => {
      if (cls.id === editingClass.id) {
        return {
          ...cls,
          name: editClassName.trim(),
          roomNumber: editRoomNumber.trim(),
          customTeacherName: editTeacherName.trim(),
          customTeacherPhone: editTeacherPhone.trim(),
          avatarThemeId: editAvatarThemeId,
          notes: editNotes.trim(),
        };
      }
      return cls;
    });

    const updatedDb = {
      ...db,
      classes: updatedClasses,
    };

    storage.save(updatedDb, true, {
      category: 'Hệ thống',
      action: 'Cập nhật thông tin lớp học',
      details: `Đã đổi thông tin lớp ${editClassName}: Phòng ${editRoomNumber}, GVCN: ${editTeacherName}`,
      status: 'SUCCESS',
    });

    setEditingClass(null);
  };

  const handleOpenDelete = (cls: ClassRoom) => {
    if (!isAllowedToEdit) {
      storage.logAccessOrModificationAttempt(`Xóa lớp học ${cls.name}`, `Nỗ lực xóa lớp ${cls.name} chứa học sinh.`);
      onOpenOwnerModal(`Xóa lớp ${cls.name}`);
      return;
    }
    setDeletingClass(cls);
  };

  const handleConfirmDeleteClass = () => {
    if (!deletingClass) return;
    const studentsInClass = db.students.filter(
      (s) => s.currentClassId === deletingClass.id && s.currentSchoolYearId === db.currentSchoolYearId
    );

    const updatedClasses = db.classes.filter((c) => c.id !== deletingClass.id);
    const updatedDb = {
      ...db,
      classes: updatedClasses,
    };

    storage.save(updatedDb, true, {
      category: 'Hệ thống',
      action: 'Xóa lớp học',
      details: `Đã xóa lớp ${deletingClass.name} (${studentsInClass.length} học sinh liên quan).`,
      status: 'SUCCESS',
    });

    setDeletingClass(null);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      storage.logAccessOrModificationAttempt('Thêm lớp học mới');
      onOpenOwnerModal('Thêm lớp học mới');
      return;
    }
    if (!newClassName.trim()) return;

    const newClass: ClassRoom = {
      id: `C_${newClassName.trim()}_${Date.now().toString(36)}`,
      name: newClassName.trim(),
      gradeId: newGradeId,
      schoolYearId: db.currentSchoolYearId,
      homeroomTeacherId: 'T002',
      customTeacherName: newTeacherName.trim(),
      customTeacherPhone: newTeacherPhone.trim(),
      avatarThemeId: newAvatarThemeId,
      subjectTeacherIds: ['T004'],
      roomNumber: newRoom.trim(),
      notes: `Lớp ${newClassName} - Hình ${CUTE_CLASS_THEMES.find((t) => t.id === newAvatarThemeId)?.name}`,
    };

    const updated = {
      ...db,
      classes: [...db.classes, newClass],
    };

    storage.save(updated, true, {
      category: 'Hệ thống',
      action: 'Thêm lớp học mới',
      details: `Đã tạo lớp ${newClassName} thuộc ${db.grades.find((g) => g.id === newGradeId)?.name}, biểu tượng: ${CUTE_CLASS_THEMES.find((t) => t.id === newAvatarThemeId)?.name}.`,
      status: 'SUCCESS',
    });

    setShowAddModal(false);
    setNewClassName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Cute School Aesthetic */}
      <div className="bg-gradient-to-r from-sky-50 via-rose-50 to-amber-50 p-6 rounded-3xl border border-sky-100/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1.5">
            <span className="text-base">🌸</span>
            <span>Hệ thống các Lớp Hoa & Con Vật Dễ Thương</span>
            <span className="text-base">🐰</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            Danh Sách Các Lớp Học
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Mỗi lớp gắn liền với một con vật hoặc loài hoa ngộ nghĩnh tượng trưng cho tinh thần chăm ngoan, đoàn kết. Giáo viên có thể tự đổi tên lớp, cập nhật phòng học và họ tên của mình bất cứ lúc nào.
          </p>
        </div>

        {/* Filter Controls & Add Class Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme Type Filter */}
          <div className="bg-white px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition ${
                selectedCategory === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedCategory('animal')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                selectedCategory === 'animal'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🐾</span> Con vật
            </button>
            <button
              onClick={() => setSelectedCategory('flower')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                selectedCategory === 'flower'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌻</span> Hình hoa
            </button>
          </div>

          {/* Grade filter */}
          <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 flex items-center gap-2 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Khối:</span>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">Toàn trường (Khối 1 - 5)</option>
              {db.grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add class button */}
          <button
            onClick={() => {
              if (!isAllowedToEdit) {
                storage.logAccessOrModificationAttempt('Thêm lớp học mới');
                onOpenOwnerModal('Thêm lớp học mới');
              } else {
                setShowAddModal(true);
              }
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm lớp mới</span>
          </button>
        </div>
      </div>

      {/* Grid of Cute Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {currentYearClasses.map((cls) => {
          const theme = getThemeByClass(cls.name, cls.avatarThemeId);
          const grade = db.grades.find((g) => g.id === cls.gradeId);
          const matchedTeacher = db.teachers.find((t) => t.id === cls.homeroomTeacherId);
          const teacherName = cls.customTeacherName || matchedTeacher?.fullName || 'Chưa phân công';
          const teacherPhone = cls.customTeacherPhone || matchedTeacher?.phone || '0905 xxx xxx';

          const students = db.students.filter(
            (s) => s.currentClassId === cls.id && s.currentSchoolYearId === db.currentSchoolYearId
          );
          const maleCount = students.filter((s) => s.gender === 'Nam').length;
          const femaleCount = students.filter((s) => s.gender === 'Nữ').length;

          // Points
          const classTx = db.transactions.filter(
            (t) => t.classId === cls.id && t.schoolYearId === db.currentSchoolYearId
          );
          const totalPoints = classTx.reduce(
            (sum, t) => sum + (t.type === 'positive' ? t.points : -Math.abs(t.points)),
            0
          );

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-3xl border ${theme.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden relative group`}
            >
              {/* Cute top gradient ribbon with theme badge */}
              <div className={`p-5 bg-gradient-to-r ${theme.bgLight} border-b border-slate-100/80`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Cute Animal/Flower Icon Circle */}
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${theme.bgGradient} text-white font-black text-2xl flex items-center justify-center shadow-md shadow-pink-500/15 shrink-0 transform group-hover:scale-105 transition-transform`}
                      title={theme.name}
                    >
                      <span>{theme.emoji}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-slate-800">Lớp {cls.name}</h3>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${theme.accentBadge}`}>
                          {theme.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{grade?.name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <DoorOpen className="w-3 h-3 text-slate-400" />
                          {cls.roomNumber ? cls.roomNumber : 'P. học chưa đặt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit class & Delete class */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-sky-700 hover:bg-white/80 transition"
                      title="Chỉnh sửa thông tin lớp, phòng học, GVCN"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(cls)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa lớp học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Class Info body */}
              <div className="p-5 space-y-3">
                {/* Teacher info card */}
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-2xs">
                      <Users className="w-4 h-4 text-sky-600" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Giáo viên chủ nhiệm</div>
                      <div className="font-extrabold text-slate-800 text-xs">{teacherName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500 hidden sm:flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {teacherPhone}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenTeacherEdit(cls)}
                      className="px-2 py-1 text-[11px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                      title="Thay đổi thông tin giáo viên chủ nhiệm"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Đổi GV</span>
                    </button>
                  </div>
                </div>

                {/* Statistics Row */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-sky-50/60 border border-sky-100">
                    <div className="text-[10px] font-bold text-sky-700">Sĩ số</div>
                    <div className="text-base font-black text-sky-900 mt-0.5">{students.length} em</div>
                    <div className="text-[9px] text-slate-500 font-medium">({maleCount}N / {femaleCount}Nữ)</div>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100">
                    <div className="text-[10px] font-bold text-purple-700">Thi đua</div>
                    <div className="text-base font-black text-purple-900 mt-0.5">+{totalPoints}</div>
                    <div className="text-[9px] text-purple-600 font-bold">Điểm phong trào</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-700">Chuyên cần</div>
                    <div className="text-base font-black text-emerald-900 mt-0.5">
                      {students.length > 0 ? '98%' : '0%'}
                    </div>
                    <div className="text-[9px] text-emerald-600 font-bold">Hôm nay</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-center text-xs">
                <button
                  onClick={() => onNavigate('students', { classId: cls.id })}
                  className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 font-bold transition shadow-2xs"
                  title="Danh sách học sinh của lớp"
                >
                  Học sinh
                </button>
                <button
                  onClick={() => onNavigate('attendance', { classId: cls.id })}
                  className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-bold transition shadow-2xs"
                  title="Điểm danh lớp"
                >
                  Điểm danh
                </button>
                <button
                  onClick={() => onNavigate('competition', { classId: cls.id })}
                  className="py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 font-bold transition shadow-2xs"
                  title="Cộng/Trừ điểm thi đua"
                >
                  Thi đua
                </button>
                <button
                  onClick={() => onOpenImportModal(cls.id)}
                  className="py-1.5 px-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-bold shadow-xs transition"
                  title="Nhập danh sách học sinh vào lớp này"
                >
                  + Nhập HS
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header - Fixed */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">
                  {CUTE_CLASS_THEMES.find((t) => t.id === editAvatarThemeId)?.emoji || '🌸'}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Chỉnh sửa thông tin Lớp {editingClass.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đổi tên lớp, phòng học, giáo viên chủ nhiệm và hình biểu tượng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                title="Thoát"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Select Cute Animal or Flower Theme - Compact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn biểu tượng Hoa hoặc Con vật cho lớp:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {CUTE_CLASS_THEMES.map((theme) => {
                    const isSelected = editAvatarThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setEditAvatarThemeId(theme.id)}
                        className={`p-1.5 rounded-xl flex flex-col items-center justify-center text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-white shadow-md border-2 border-sky-500 scale-105'
                            : 'hover:bg-white border border-transparent'
                        }`}
                        title={theme.name}
                      >
                        <span className="text-xl mb-0.5">{theme.emoji}</span>
                        <span className="text-[8px] font-bold text-slate-700 truncate w-full">
                          {theme.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Name & Room Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên lớp học:
                  </label>
                  <input
                    type="text"
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    placeholder="Ví dụ: 4A, 1B, 5C..."
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phòng học:
                  </label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    placeholder="Ví dụ: P.401, P.A12..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Teacher name & phone */}
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-sky-800 uppercase tracking-wide">
                    Thông tin Giáo viên chủ nhiệm lớp
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeacherClass(editingClass);
                    }}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Mở hồ sơ chi tiết GV</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên Giáo viên chủ nhiệm:
                  </label>
                  <input
                    type="text"
                    value={editTeacherName}
                    onChange={(e) => setEditTeacherName(e.target.value)}
                    placeholder="Ví dụ: Cô Nguyễn Thị Mai"
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Giáo viên có thể trực tiếp đổi họ tên của mình tại đây.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="text"
                    value={editTeacherPhone}
                    onChange={(e) => setEditTeacherPhone(e.target.value)}
                    placeholder="Ví dụ: 0905 123 456"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khẩu hiệu / Ghi chú của lớp:
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ví dụ: Lớp đoàn kết, chăm ngoan, học giỏi"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Sticky Action Buttons Footer - Always Visible */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition cursor-pointer shadow-2xs"
                title="Thoát không lưu"
              >
                ✕ Thoát
              </button>
              <button
                type="button"
                onClick={handleSaveEditClass}
                className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                title="Lưu thay đổi lớp"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirm Modal */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Xác nhận xóa lớp học</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ xóa lớp khỏi năm học hiện tại</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/60 p-3 rounded-2xl border border-rose-100 mb-4">
              Bạn có chắc chắn muốn xóa <strong>Lớp {deletingClass.name}</strong>?
              Nếu lớp đang có học sinh, học sinh sẽ cần được chuyển sang lớp khác hoặc cập nhật lại.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
              >
                Xác nhận xóa lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                <span>Thêm Lớp học mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                title="Thoát"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClass} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Cute avatar theme choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn biểu tượng Con vật hoặc Loài hoa:
                </label>
                <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {CUTE_CLASS_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setNewAvatarThemeId(theme.id)}
                      className={`p-1.5 rounded-lg flex flex-col items-center justify-center text-center transition ${
                        newAvatarThemeId === theme.id
                          ? 'bg-white shadow-xs border-2 border-sky-500'
                          : 'hover:bg-white border border-transparent'
                      }`}
                      title={theme.name}
                    >
                      <span className="text-xl">{theme.emoji}</span>
                      <span className="text-[9px] font-bold text-slate-700 truncate w-full">
                        {theme.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên lớp (Ví dụ: 4C, 5B, 1D)
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ví dụ: 4C"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thuộc Khối
                  </label>
                  <select
                    value={newGradeId}
                    onChange={(e) => setNewGradeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  >
                    {db.grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phòng học
                  </label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="P.403"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên Giáo viên chủ nhiệm
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Ví dụ: Cô Nguyễn Thị Mai"
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại GVCN
                </label>
                <input
                  type="text"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  placeholder="0905 123 456"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </form>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition cursor-pointer shadow-2xs"
              >
                ✕ Thoát
              </button>
              <button
                type="button"
                onClick={handleAddClass}
                className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition"
              >
                Tạo lớp học mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Teacher Edit Modal */}
      {editingTeacherClass && (
        <TeacherEditModal
          isOpen={!!editingTeacherClass}
          teacher={db.teachers.find((t) => t.id === editingTeacherClass.homeroomTeacherId) || null}
          classNameContext={editingTeacherClass.name}
          onClose={() => setEditingTeacherClass(null)}
        />
      )}
    </div>
  );
};
