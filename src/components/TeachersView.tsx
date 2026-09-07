import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  BookOpen,
  GraduationCap,
  Shield,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  School,
  Lock,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Teacher, UserRole } from '../types';

interface TeachersViewProps {
  onNavigate?: (tab: string, params?: any) => void;
  onOpenOwnerModal?: (action: string) => void;
}

const ROLE_LABELS: Record<UserRole, { label: string; color: string; badge: string }> = {
  admin: {
    label: 'Ban Giám Hiệu / Quản Trị',
    color: 'border-purple-200 bg-purple-50 text-purple-800',
    badge: 'bg-purple-600 text-white',
  },
  homeroom: {
    label: 'Giáo Viên Chủ Nhiệm',
    color: 'border-blue-200 bg-blue-50 text-blue-800',
    badge: 'bg-blue-600 text-white',
  },
  subject: {
    label: 'Giáo Viên Bộ Môn / Chuyên Biệt',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    badge: 'bg-emerald-600 text-white',
  },
  guest: {
    label: 'Khách Xem',
    color: 'border-slate-200 bg-slate-50 text-slate-700',
    badge: 'bg-slate-600 text-white',
  },
};

const COMMON_SUBJECTS = [
  'Toán',
  'Tiếng Việt',
  'Tiếng Anh',
  'Tin học',
  'Mỹ thuật',
  'Âm nhạc',
  'GD Thể chất',
  'Đạo đức',
  'Tự nhiên và Xã hội',
  'Khoa học',
  'Lịch sử & Địa lý',
  'Hoạt động trải nghiệm',
];

export const TeachersView: React.FC<TeachersViewProps> = ({
  onNavigate,
  onOpenOwnerModal,
}) => {
  const [db, setDb] = useState(storage.getDb());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('homeroom');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [deleteConfirmTeacher, setDeleteConfirmTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return () => unsub();
  }, []);

  const teachers = db.teachers || [];

  // Filter teachers
  const filteredTeachers = teachers.filter((t) => {
    if (selectedRoleFilter !== 'all' && t.role !== selectedRoleFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const matchName = t.fullName?.toLowerCase().includes(q);
    const matchPhone = t.phone?.toLowerCase().includes(q);
    const matchEmail = t.email?.toLowerCase().includes(q);
    const matchSubjects = t.subjects?.some((s) => s.toLowerCase().includes(q));
    const matchClasses = t.assignedClassIds?.some((cId) => {
      const cls = db.classes.find((c) => c.id === cId);
      return cls?.name.toLowerCase().includes(q);
    });

    return matchName || matchPhone || matchEmail || matchSubjects || matchClasses;
  });

  const totalTeachers = teachers.length;
  const homeroomCount = teachers.filter((t) => t.role === 'homeroom').length;
  const subjectCount = teachers.filter((t) => t.role === 'subject').length;
  const adminCount = teachers.filter((t) => t.role === 'admin').length;

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setRole('homeroom');
    setSelectedSubjects(['Toán', 'Tiếng Việt']);
    setCustomSubjectInput('');
    setAssignedClassIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFullName(t.fullName || '');
    setPhone(t.phone || '');
    setEmail(t.email || '');
    setRole(t.role || 'homeroom');
    setSelectedSubjects(t.subjects || []);
    setCustomSubjectInput('');
    setAssignedClassIds(t.assignedClassIds || []);
    setIsModalOpen(true);
  };

  const handleToggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects([...selectedSubjects, trimmed]);
      setCustomSubjectInput('');
    }
  };

  const handleToggleClass = (classId: string) => {
    if (assignedClassIds.includes(classId)) {
      setAssignedClassIds(assignedClassIds.filter((id) => id !== classId));
    } else {
      setAssignedClassIds([...assignedClassIds, classId]);
    }
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên giáo viên.');
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    let updatedDb = { ...db };

    if (editingTeacher) {
      // Update existing
      const updatedList = db.teachers.map((t) => {
        if (t.id === editingTeacher.id) {
          return {
            ...t,
            fullName: trimmedName,
            phone: trimmedPhone,
            email: trimmedEmail,
            role,
            subjects: selectedSubjects,
            assignedClassIds,
          };
        }
        return t;
      });

      // Update classes where this teacher is homeroom
      const updatedClasses = db.classes.map((cls) => {
        if (cls.homeroomTeacherId === editingTeacher.id) {
          return {
            ...cls,
            customTeacherName: trimmedName,
            customTeacherPhone: trimmedPhone,
          };
        }
        return cls;
      });

      // Update current user if editing self
      let updatedUser = db.currentUser;
      if (db.currentUser?.id === editingTeacher.id) {
        updatedUser = {
          ...db.currentUser,
          fullName: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
          role,
          subjects: selectedSubjects,
          assignedClassIds,
        };
      }

      updatedDb = {
        ...updatedDb,
        teachers: updatedList,
        classes: updatedClasses,
        currentUser: updatedUser,
      };

      storage.save(updatedDb, true, {
        category: 'Hệ thống',
        action: 'Cập nhật giáo viên',
        details: `Cập nhật thông tin giáo viên ${trimmedName}.`,
      });
    } else {
      // Create new
      const newId = `T_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newTeacher: Teacher = {
        id: newId,
        fullName: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        role,
        assignedClassIds,
        subjects: selectedSubjects,
        permissions: {
          view: true,
          create: role === 'admin' || role === 'homeroom',
          edit: role === 'admin' || role === 'homeroom',
          delete: role === 'admin',
          export: true,
          import: role === 'admin' || role === 'homeroom',
          attendance: role === 'admin' || role === 'homeroom',
          feedback: true,
          competition: true,
        },
      };

      // If assigned classes and role is homeroom, also set as homeroom in classes
      let updatedClasses = [...db.classes];
      if (role === 'homeroom' && assignedClassIds.length > 0) {
        updatedClasses = updatedClasses.map((cls) => {
          if (assignedClassIds.includes(cls.id)) {
            return {
              ...cls,
              homeroomTeacherId: newId,
              customTeacherName: trimmedName,
              customTeacherPhone: trimmedPhone,
            };
          }
          return cls;
        });
      }

      updatedDb = {
        ...updatedDb,
        teachers: [...db.teachers, newTeacher],
        classes: updatedClasses,
      };

      storage.save(updatedDb, true, {
        category: 'Hệ thống',
        action: 'Thêm giáo viên mới',
        details: `Đã thêm giáo viên mới: ${trimmedName} (${ROLE_LABELS[role].label}).`,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteTeacher = (t: Teacher) => {
    if (t.isOwner || t.role === 'admin') {
      alert('Không thể xóa tài khoản Quản trị viên / Chủ sở hữu chính của trường.');
      return;
    }

    const updatedList = db.teachers.filter((teacher) => teacher.id !== t.id);
    const updatedClasses = db.classes.map((cls) => {
      if (cls.homeroomTeacherId === t.id) {
        return {
          ...cls,
          homeroomTeacherId: 'T001',
          customTeacherName: 'Chưa phân công',
        };
      }
      return cls;
    });

    const updatedDb = {
      ...db,
      teachers: updatedList,
      classes: updatedClasses,
    };

    storage.save(updatedDb, true, {
      category: 'Hệ thống',
      action: 'Xóa giáo viên',
      details: `Đã xóa giáo viên ${t.fullName} khỏi hệ thống.`,
    });

    setDeleteConfirmTeacher(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
            <School className="w-4 h-4" />
            <span>Trường Tiểu học Nam Phước – Phân hiệu 2 Duy Phước 2</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>Danh Sách Cán Bộ – Giáo Viên</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý hồ sơ đội ngũ giáo viên chủ nhiệm, giáo viên bộ môn chuyên biệt, phân công phụ trách giảng dạy và phân quyền quản trị hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Giáo Viên Mới</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Tổng số giáo viên</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{totalTeachers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cán bộ & Giáo viên</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
            <span>GV Chủ nhiệm</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{homeroomCount}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Phụ trách lớp chính khóa</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>GV Bộ môn / Chuyên</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{subjectCount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Anh, Tin, Nhạc, Họa, GDTC...</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold mb-1">
            <span>Ban Giám Hiệu</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{adminCount}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Quản trị & Phê duyệt</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, SĐT, môn học, lớp..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-medium"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('homeroom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedRoleFilter === 'homeroom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Chủ nhiệm ({homeroomCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('subject')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedRoleFilter === 'subject'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bộ môn ({subjectCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedRoleFilter === 'admin'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            BGH ({adminCount})
          </button>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((t) => {
          const roleConfig = ROLE_LABELS[t.role] || ROLE_LABELS.homeroom;
          const assignedClasses = db.classes.filter(
            (c) => c.homeroomTeacherId === t.id || t.assignedClassIds?.includes(c.id)
          );

          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-sky-300 hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {t.fullName?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition">
                        {t.fullName}
                      </h3>
                      <span
                        className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleConfig.badge}`}
                      >
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>

                  {t.isOwner && (
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Chủ sở hữu
                    </span>
                  )}
                </div>

                {/* Info List */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{t.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-500">{t.email || 'Chưa có email'}</span>
                  </div>

                  {/* Assigned Classes */}
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-sky-600" />
                      <span>Lớp phụ trách:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedClasses.length > 0 ? (
                        assignedClasses.map((cls) => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => onNavigate && onNavigate('students', { classId: cls.id })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-[11px] font-bold border border-sky-200 transition cursor-pointer"
                            title={`Xem danh sách học sinh Lớp ${cls.name}`}
                          >
                            <span>Lớp {cls.name}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Chưa phân công lớp</span>
                      )}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-emerald-600" />
                      <span>Bộ môn giảng dạy:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.subjects && t.subjects.length > 0 ? (
                        t.subjects.map((sub, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold"
                          >
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Chưa cập nhật môn</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(t)}
                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa thông tin</span>
                </button>

                {!t.isOwner && t.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTeacher(t)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Xóa giáo viên"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTeachers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">Không tìm thấy giáo viên nào</div>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "+ Thêm Giáo Viên Mới".</p>
          </div>
        )}
      </div>

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span>{editingTeacher ? 'Chỉnh Sửa Thông Tin Giáo Viên' : 'Thêm Giáo Viên Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên giáo viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Cô Lê Thị Vy, Thầy Trần Văn Nam..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tengiaovien@namphuoc.edu.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai trò & Chức vụ</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-800 outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  <option value="homeroom">Giáo Viên Chủ Nhiệm (Phụ trách lớp)</option>
                  <option value="subject">Giáo Viên Bộ Môn / Chuyên Biệt (Anh, Tin, Nhạc, Họa...)</option>
                  <option value="admin">Ban Giám Hiệu / Quản Trị Hệ Thống</option>
                </select>
              </div>

              {/* Class assignment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Phân công lớp phụ trách ({assignedClassIds.length} lớp đã chọn):
                </label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
                  {db.classes
                    .filter((c) => c.schoolYearId === db.currentSchoolYearId)
                    .map((cls) => {
                      const isChecked = assignedClassIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleClass(cls.id)}
                            className="rounded text-sky-600"
                          />
                          <span>Lớp {cls.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Subjects */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Môn học phụ trách:</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_SUBJECTS.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleSubject(sub)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {sub}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSubject();
                      }
                    }}
                    placeholder="Nhập tên môn khác nếu có..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    + Thêm môn
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingTeacher ? 'Lưu Thay Đổi' : 'Tạo Giáo Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa giáo viên?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa giáo viên{' '}
                <strong className="text-slate-800">{deleteConfirmTeacher.fullName}</strong> khỏi hệ thống? Dữ liệu này sẽ được đồng bộ cập nhật trên hệ thống lưu trữ.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeacher(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTeacher(deleteConfirmTeacher)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
