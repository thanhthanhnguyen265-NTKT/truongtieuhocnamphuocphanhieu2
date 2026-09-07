import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
  Phone,
  Calendar,
  AlertTriangle,
  User,
  CheckCircle2,
  Award,
  FileSpreadsheet,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Student } from '../types';
import { ChibiAvatar, CHIBI_AVATARS } from '../data/chibiAvatars';
import { ClearStudentsModal } from './ClearStudentsModal';

interface StudentsViewProps {
  initialClassId?: string;
  onSelectStudent: (student: Student) => void;
  onOpenImportModal: (classId?: string) => void;
  onOpenOwnerModal: (action: string) => void;
  searchQuery?: string;
  autoOpenImport?: boolean;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  initialClassId,
  onSelectStudent,
  onOpenImportModal,
  onOpenOwnerModal,
  searchQuery = '',
  autoOpenImport = false,
}) => {
  const db = storage.getDb();
  const [selectedYearId, setSelectedYearId] = useState<string>(db.currentSchoolYearId);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'all');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync selectedClassId whenever initialClassId changes from navigation
  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);

  useEffect(() => {
    if (autoOpenImport) {
      onOpenImportModal(selectedClassId !== 'all' ? selectedClassId : undefined);
    }
  }, [autoOpenImport]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Form fields for Add/Edit
  const [formData, setFormData] = useState({
    studentCode: '',
    fullName: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    dateOfBirth: '2016-05-15',
    chibiAvatarId: 'chibi-boy-1',
    address: 'Xã Duy Phước, Huyện Duy Xuyên',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    currentClassId: db.classes[0]?.id || 'C4A',
    notes: '',
  });

  const isAllowedToEdit = db.currentUser?.isOwner || db.currentUser?.permissions?.edit || db.isOwnerUnlocked;
  const isAllowedToDelete = db.currentUser?.isOwner || db.currentUser?.permissions?.delete || db.isOwnerUnlocked;

  // Next student code generation
  const generateNextCode = (): string => {
    const existingCodes = db.students.map((s) => s.studentCode);
    for (let i = 1; i <= 9999; i++) {
      const code = `HS${i.toString().padStart(4, '0')}`;
      if (!existingCodes.includes(code)) {
        return code;
      }
    }
    return `HS${Date.now().toString().slice(-4)}`;
  };

  const handleOpenAdd = () => {
    if (db.currentUser?.role === 'subject') {
      alert(
        'Giáo viên chuyên môn không có quyền thêm mới học sinh vào trường/lớp. Quyền này thuộc về Giáo viên chủ nhiệm hoặc Ban Giám hiệu.'
      );
      return;
    }
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Thêm học sinh mới');
      return;
    }
    const defaultClass = selectedClassId !== 'all' ? selectedClassId : db.classes[0]?.id || 'C4A';
    setFormData({
      studentCode: generateNextCode(),
      fullName: '',
      gender: 'Nam',
      dateOfBirth: '2016-05-15',
      chibiAvatarId: 'boy_cap',
      address: 'Thôn Lang Châu Bắc, Duy Phước',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      currentClassId: defaultClass,
      notes: '',
    });
    setEditingStudent(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (stu: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    const check = storage.canEditStudentProfile(stu);
    if (!check.allowed) {
      if (check.reason) {
        alert(check.reason);
      } else {
        onOpenOwnerModal('Chỉnh sửa học sinh');
      }
      return;
    }
    setEditingStudent(stu);
    setFormData({
      studentCode: stu.studentCode,
      fullName: stu.fullName,
      gender: stu.gender,
      dateOfBirth: stu.dateOfBirth,
      chibiAvatarId: stu.chibiAvatarId || (stu.gender === 'Nữ' ? 'girl_bow' : 'boy_cap'),
      address: stu.address,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail || '',
      currentClassId: stu.currentClassId,
      notes: stu.notes || '',
    });
    setShowAddModal(true);
  };

  const handleCopy = (stu: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    const check = storage.canEditStudentProfile(stu);
    if (!check.allowed) {
      if (check.reason) {
        alert(check.reason);
      } else {
        onOpenOwnerModal('Sao chép học sinh');
      }
      return;
    }
    const newCode = generateNextCode();
    const copiedStudent: Student = {
      ...stu,
      id: `STU_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentCode: newCode,
      fullName: `${stu.fullName} (Bản sao)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = {
      ...db,
      students: [copiedStudent, ...db.students],
    };
    storage.save(updated, true, {
      category: 'Học sinh',
      action: 'Sao chép học sinh',
      details: `Đã sao chép hồ sơ của học sinh ${stu.fullName} thành mã ${newCode}.`,
    });
  };

  const handleDelete = () => {
    if (!deletingStudent) return;
    const check = storage.canEditStudentProfile(deletingStudent);
    if (!check.allowed) {
      if (check.reason) {
        alert(check.reason);
      } else {
        onOpenOwnerModal('Xóa học sinh');
      }
      setDeletingStudent(null);
      return;
    }

    const updated = {
      ...db,
      students: db.students.filter((s) => s.id !== deletingStudent.id),
      attendance: db.attendance.filter((a) => a.studentId !== deletingStudent.id),
      feedback: db.feedback.filter((f) => f.studentId !== deletingStudent.id),
      evaluations: db.evaluations.filter((e) => e.studentId !== deletingStudent.id),
      transactions: db.transactions.filter((t) => t.studentId !== deletingStudent.id),
    };

    storage.save(updated, true, {
      category: 'Học sinh',
      action: 'Xóa học sinh',
      details: `Đã xóa học sinh ${deletingStudent.fullName} (${deletingStudent.studentCode}).`,
    });

    setDeletingStudent(null);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    // Check duplicate code
    const isDuplicate = db.students.some(
      (s) =>
        s.studentCode.trim().toLowerCase() === formData.studentCode.trim().toLowerCase() &&
        (!editingStudent || s.id !== editingStudent.id)
    );
    if (isDuplicate) {
      alert(`Mã học sinh "${formData.studentCode}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    const targetClass = db.classes.find((c) => c.id === formData.currentClassId);
    const targetGradeId = targetClass ? targetClass.gradeId : 'G4';

    if (editingStudent) {
      const updatedStudents = db.students.map((s) => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            studentCode: formData.studentCode.trim(),
            fullName: formData.fullName.trim(),
            gender: formData.gender,
            dateOfBirth: formData.dateOfBirth,
            address: formData.address.trim(),
            parentName: formData.parentName.trim(),
            parentPhone: formData.parentPhone.trim(),
            parentEmail: formData.parentEmail.trim(),
            currentClassId: formData.currentClassId,
            currentGradeId: targetGradeId,
            chibiAvatarId: formData.chibiAvatarId,
            notes: formData.notes.trim(),
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });

      storage.save(
        { ...db, students: updatedStudents },
        true,
        {
          category: 'Học sinh',
          action: 'Cập nhật thông tin học sinh',
          details: `Đã cập nhật hồ sơ của học sinh ${formData.fullName} (${formData.studentCode}).`,
        }
      );
    } else {
      const newStudent: Student = {
        id: `STU_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentCode: formData.studentCode.trim(),
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address.trim(),
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim(),
        parentEmail: formData.parentEmail.trim(),
        currentClassId: formData.currentClassId,
        currentGradeId: targetGradeId,
        currentSchoolYearId: selectedYearId !== 'all' ? selectedYearId : db.currentSchoolYearId,
        chibiAvatarId: formData.chibiAvatarId,
        notes: formData.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.save(
        { ...db, students: [newStudent, ...db.students] },
        true,
        {
          category: 'Học sinh',
          action: 'Thêm học sinh mới',
          details: `Đã thêm học sinh mới ${formData.fullName} vào lớp ${targetClass?.name}.`,
        }
      );
    }

    setShowAddModal(false);
    setEditingStudent(null);
  };

  // Filter students
  const filteredStudents = db.students.filter((s) => {
    if (selectedYearId !== 'all' && s.currentSchoolYearId) {
      const normS = s.currentSchoolYearId.replace(/[-_]/g, '');
      const normY = selectedYearId.replace(/[-_]/g, '');
      if (normS !== normY && s.currentSchoolYearId !== 'SY2026_2027') return false;
    }
    if (selectedClassId !== 'all') {
      const targetCls = db.classes.find((c) => c.id === selectedClassId);
      const isMatch =
        s.currentClassId === selectedClassId ||
        s.currentClassId?.toLowerCase() === selectedClassId?.toLowerCase() ||
        (targetCls && (
          s.currentClassId === targetCls.name ||
          s.currentClassId?.toLowerCase() === targetCls.name?.toLowerCase() ||
          s.currentClassId?.toLowerCase() === `lớp ${targetCls.name.toLowerCase()}` ||
          (targetCls.customTeacherName && s.currentClassId?.toLowerCase().includes('vy') && targetCls.customTeacherName.toLowerCase().includes('vy'))
        ));
      if (!isMatch) return false;
    }
    if (selectedGradeId !== 'all' && s.currentGradeId && s.currentGradeId !== selectedGradeId) return false;
    if (selectedGender !== 'all' && s.gender !== selectedGender) return false;

    const query = (localSearch || searchQuery).toLowerCase().trim();
    if (query) {
      const cls = db.classes.find((c) => c.id === s.currentClassId);
      const matchName = s.fullName.toLowerCase().includes(query);
      const matchCode = s.studentCode.toLowerCase().includes(query);
      const matchPhone = s.parentPhone.toLowerCase().includes(query);
      const matchClass = cls ? cls.name.toLowerCase().includes(query) : false;
      const matchParent = s.parentName.toLowerCase().includes(query);
      return matchName || matchCode || matchPhone || matchClass || matchParent;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Hồ sơ học sinh toàn trường</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Học sinh</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tìm kiếm, xem hồ sơ 9 tab, chỉnh sửa, điểm danh và xuất báo cáo rèn luyện.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowClearModal(true)}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Xóa DS mẫu / Thay mới</span>
          </button>

          <button
            onClick={() => onOpenImportModal(selectedClassId !== 'all' ? selectedClassId : undefined)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nhập Excel / Dán DS</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm học sinh</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo Mã HS, Họ tên, SĐT, Phụ huynh..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* School Year filter */}
        <select
          value={selectedYearId}
          onChange={(e) => setSelectedYearId(e.target.value)}
          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
        >
          <option value="all">Tất cả năm học</option>
          {db.schoolYears.map((y) => (
            <option key={y.id} value={y.id}>
              Năm {y.name} {y.isCurrent ? '(Hiện hành)' : ''}
            </option>
          ))}
        </select>

        {/* Grade filter */}
        <select
          value={selectedGradeId}
          onChange={(e) => {
            setSelectedGradeId(e.target.value);
            setSelectedClassId('all');
          }}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
        >
          <option value="all">Tất cả các khối (1 - 5)</option>
          {db.grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        {/* Class filter */}
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
        >
          <option value="all">Tất cả các lớp</option>
          {db.classes
            .filter((c) => (selectedYearId === 'all' || c.schoolYearId === selectedYearId) && (selectedGradeId === 'all' || c.gradeId === selectedGradeId))
            .map((c) => {
              const matchedTeacher = db.teachers.find((t) => t.id === c.homeroomTeacherId);
              const teacherName = c.customTeacherName || matchedTeacher?.fullName || '';
              return (
                <option key={c.id} value={c.id}>
                  Lớp {c.name} {teacherName ? `(${teacherName})` : ''}
                </option>
              );
            })}
        </select>

        {/* Gender filter */}
        <select
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
        >
          <option value="all">Tất cả giới tính</option>
          <option value="Nam">Nam</option>
          <option value="Nữ">Nữ</option>
        </select>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            Hiển thị {filteredStudents.length} học sinh
          </span>
          <span className="text-slate-400">Nhấp vào dòng để xem chi tiết hồ sơ 9 tab</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 text-center w-12">STT</th>
                <th className="p-3">Mã HS</th>
                <th className="p-3">Họ và Tên</th>
                <th className="p-3">Lớp</th>
                <th className="p-3 text-center">Giới tính</th>
                <th className="p-3">Ngày sinh</th>
                <th className="p-3">Phụ huynh & SĐT</th>
                <th className="p-3 text-center">Điểm thi đua</th>
                <th className="p-3 text-right pr-4">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu, idx) => {
                  const cls = db.classes.find((c) => c.id === stu.currentClassId);
                  const stuTx = db.transactions.filter((t) => t.studentId === stu.id);
                  const score = stuTx.reduce(
                    (s, t) => s + (t.type === 'positive' ? t.points : -Math.abs(t.points)),
                    0
                  );

                  return (
                    <tr
                      key={stu.id}
                      onClick={() => onSelectStudent(stu)}
                      className="hover:bg-blue-50/50 transition cursor-pointer group"
                    >
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{stu.studentCode}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <ChibiAvatar
                            gender={stu.gender}
                            avatarId={stu.chibiAvatarId}
                            seed={stu.id || stu.studentCode}
                            size={36}
                            showGenderBadge={true}
                          />
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-blue-600">
                              {stu.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {stu.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-700">Lớp {cls?.name}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stu.gender === 'Nam'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{stu.dateOfBirth}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-700">{stu.parentName}</div>
                        <div className="text-[10px] text-slate-400">{stu.parentPhone}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          +{score} đ
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(stu);
                            }}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                            title="Xem hồ sơ 9 tab"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(stu, e)}
                            className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition"
                            title="Sửa học sinh"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleCopy(stu, e)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                            title="Sao chép hồ sơ"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingStudent(stu);
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                            title="Xóa học sinh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500 text-xs">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto text-2xl shadow-2xs">
                        🎒
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        {selectedClassId !== 'all'
                          ? `Lớp ${db.classes.find((c) => c.id === selectedClassId)?.name || ''} chưa có danh sách học sinh`
                          : 'Chưa có dữ liệu học sinh nào hiển thị'}
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        Hệ thống đã dọn sạch danh sách mẫu 270 em. Bạn có thể bấm <strong>"+ Nhập danh sách HS"</strong> để tải file Excel/dán danh sách lớp vào hệ thống, hoặc thêm từng học sinh mới.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => onOpenImportModal(selectedClassId !== 'all' ? selectedClassId : undefined)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>+ Nhập danh sách HS lớp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedClassId !== 'all') {
                              setFormData((prev) => ({ ...prev, currentClassId: selectedClassId }));
                            }
                            setShowAddModal(true);
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                        >
                          + Thêm 1 học sinh
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              {editingStudent ? 'Chỉnh sửa thông tin học sinh' : 'Thêm học sinh mới'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã học sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.studentCode}
                    onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lớp phân bổ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.currentClassId}
                    onChange={(e) => setFormData({ ...formData, currentClassId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    {db.classes
                      .filter((c) => c.schoolYearId === db.currentSchoolYearId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => {
                      const newGender = e.target.value as 'Nam' | 'Nữ';
                      const defaultAvatar = newGender === 'Nữ' ? 'girl_bow' : 'boy_cap';
                      setFormData({ ...formData, gender: newGender, chibiAvatarId: defaultAvatar });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Chibi Avatar Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Biểu tượng Chibi dễ thương ({formData.gender}):</span>
                  <span className="text-[11px] text-indigo-600 font-normal">Tự động phân loại theo giới tính</span>
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
                  {CHIBI_AVATARS.filter((a) => a.gender === formData.gender).map((av) => {
                    const isSelected = formData.chibiAvatarId === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, chibiAvatarId: av.id })}
                        className={`p-1.5 rounded-xl border-2 transition flex flex-col items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 shadow-xs'
                            : 'border-transparent hover:border-slate-300 hover:bg-white'
                        }`}
                        title={av.name}
                      >
                        <ChibiAvatar gender={av.gender} avatarId={av.id} size={40} />
                        <span className="text-[10px] font-medium text-slate-600 truncate max-w-[50px]">
                          {av.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Thôn Lang Châu Bắc, Duy Phước, Duy Xuyên"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ tên phụ huynh</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="Nguyễn Văn Hùng"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="0905 xxx xxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú rèn luyện</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về học sinh..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Lưu học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Xác nhận xóa học sinh?</h3>
            <p className="text-xs text-slate-500 mt-1.5">
              Bạn có chắc chắn muốn xóa học sinh <strong>{deletingStudent.fullName}</strong> ({deletingStudent.studentCode})? Bạn có thể sử dụng nút <strong>Hoàn tác (Undo)</strong> sau khi xóa nếu muốn khôi phục.
            </p>

            <div className="flex justify-center gap-2 mt-5">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Clear & Replace Students Modal */}
      <ClearStudentsModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onOpenImport={() => {
          setShowClearModal(false);
          onOpenImportModal(selectedClassId !== 'all' ? selectedClassId : undefined);
        }}
      />
    </div>
  );
};
