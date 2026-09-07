import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  Link,
  Layers,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  DownloadCloud,
  FileCheck2,
  Award,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { storage } from '../services/storage';
import { SubjectClass, Student, Teacher } from '../types';
import { ChibiAvatar } from '../data/chibiAvatars';

export const SPECIALIZED_SUBJECTS = [
  'Tiếng Anh',
  'Tin học',
  'Mỹ thuật',
  'Âm nhạc',
  'GD Thể chất',
  'Khoa học',
  'Lịch sử & Địa lý',
  'Đạo đức',
  'Kỹ năng sống / CLB',
];

interface SubjectClassesViewProps {
  onOpenOwnerModal?: (action: string) => void;
}

export const SubjectClassesView: React.FC<SubjectClassesViewProps> = ({
  onOpenOwnerModal,
}) => {
  const [db, setDb] = useState(storage.getDb());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SubjectClass | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    subject: string;
    teacherName: string;
    type: 'linked' | 'custom';
    linkedClassIds: string[];
    customStudentIds: string[];
    roomNumber: string;
    schedule: string;
    notes: string;
  }>({
    name: '',
    subject: 'Tiếng Anh',
    teacherName: '',
    type: 'linked',
    linkedClassIds: [db.classes[0]?.id || ''],
    customStudentIds: [],
    roomNumber: 'Phòng học bộ môn',
    schedule: 'Thứ 3 - Tiết 2',
    notes: '',
  });

  // Tracking state inside a class
  const [assessmentMode, setAssessmentMode] = useState<'attendance' | 'evaluation'>('evaluation');
  const [classScores, setClassScores] = useState<Record<string, { level: 'T' | 'H' | 'C'; note: string }>>({});
  const [classAttendance, setClassAttendance] = useState<Record<string, 'present' | 'excused' | 'unexcused' | 'late'>>({});

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return () => unsub();
  }, []);

  const subjectClasses = (db.subjectClasses || []).filter(
    (c) => c.schoolYearId === db.currentSchoolYearId
  );

  const filteredClasses = subjectClasses.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject =
      selectedSubjectFilter === 'all' || c.subject === selectedSubjectFilter;
    return matchSearch && matchSubject;
  });

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormData({
      name: `Tiếng Anh Lớp ${db.classes[0]?.name || '4A'}`,
      subject: 'Tiếng Anh',
      teacherName: '',
      type: 'linked',
      linkedClassIds: [db.classes[0]?.id || ''],
      customStudentIds: [],
      roomNumber: 'Phòng chức năng số 1',
      schedule: 'Thứ 2 (Tiết 3) & Thứ 4 (Tiết 2)',
      notes: 'Lớp bộ môn chuyên theo phân phối chương trình',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (cls: SubjectClass) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      subject: cls.subject,
      teacherName: cls.teacherName || '',
      type: cls.type,
      linkedClassIds: cls.linkedClassIds || [],
      customStudentIds: cls.customStudentIds || [],
      roomNumber: cls.roomNumber || '',
      schedule: cls.schedule || '',
      notes: cls.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa lớp bộ môn "${name}"?`)) {
      storage.deleteSubjectClass(id);
      if (activeClassId === id) setActiveClassId(null);
    }
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const savedRecord: SubjectClass = {
      id: editingClass?.id || `SUBJ_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: formData.name.trim(),
      subject: formData.subject,
      teacherId: editingClass?.teacherId || 'T_CUSTOM',
      teacherName: formData.teacherName.trim() || 'Giáo viên phụ trách',
      schoolYearId: db.currentSchoolYearId,
      type: formData.type,
      linkedClassIds: formData.linkedClassIds,
      customStudentIds: formData.customStudentIds,
      roomNumber: formData.roomNumber.trim(),
      schedule: formData.schedule.trim(),
      notes: formData.notes.trim(),
      createdAt: editingClass?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveSubjectClass(savedRecord);
    setShowAddModal(false);
  };

  // Get student list for a subject class
  const getStudentsForClass = (cls: SubjectClass): Student[] => {
    if (cls.type === 'linked') {
      return db.students.filter(
        (s) =>
          cls.linkedClassIds.includes(s.currentClassId) &&
          s.currentSchoolYearId === db.currentSchoolYearId
      );
    } else {
      return db.students.filter((s) => (cls.customStudentIds || []).includes(s.id));
    }
  };

  const activeClass = subjectClasses.find((c) => c.id === activeClassId);
  const activeClassStudents = activeClass ? getStudentsForClass(activeClass) : [];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Phân Hệ Quản Lý Lớp Học Dành Cho Giáo Viên Chuyên / Nhô</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Lớp Bộ Môn Chuyên Biệt (Tiếng Anh, Tin học, Mỹ thuật, Âm nhạc, GDTC...)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hỗ trợ liên kết lấy danh sách từ lớp chủ nhiệm hoặc tự tạo danh sách riêng biệt. Theo dõi chuyên cần, đánh giá mức T/H/C và ghi nhận xét tương tự GV chủ nhiệm.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Lớp Bộ Môn Mới</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm lớp, môn học..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
          >
            <option value="all">Tất cả bộ môn</option>
            {SPECIALIZED_SUBJECTS.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Tổng số: <strong className="text-indigo-700">{filteredClasses.length}</strong> lớp bộ môn
        </div>
      </div>

      {/* Main Grid / Detail */}
      {!activeClass ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => {
              const students = getStudentsForClass(cls);
              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">
                        {cls.subject}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(cls)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50"
                          title="Sửa lớp"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50"
                          title="Xóa lớp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1">{cls.name}</h3>

                    <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Sĩ số: <strong className="text-slate-900">{students.length}</strong> học sinh
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({cls.type === 'linked' ? 'Liên kết lớp CN' : 'Danh sách riêng'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>GV phụ trách: <strong className="text-slate-800">{cls.teacherName || 'GV Bộ môn'}</strong></span>
                      </div>

                      {cls.schedule && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cls.schedule}</span>
                        </div>
                      )}

                      {cls.roomNumber && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cls.roomNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setActiveClassId(cls.id)}
                      className="w-full py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <span>Vào Sổ Đánh Giá & Điểm Danh</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Chưa có lớp bộ môn nào</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Nhấn nút "Tạo Lớp Bộ Môn Mới" để tạo lớp cho môn Tiếng Anh, Tin học, Mỹ thuật, Âm nhạc...
              </p>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo lớp bộ môn đầu tiên</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Detailed Class Management & Evaluation */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <span>Lớp Bộ Môn Chuyên: {activeClass.subject}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{activeClass.name}</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
                  {activeClassStudents.length} học sinh
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                GV phụ trách: <strong>{activeClass.teacherName}</strong> • {activeClass.schedule || 'Lịch học linh hoạt'} • {activeClass.roomNumber || 'Phòng bộ môn'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveClassId(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ← Quay lại danh sách lớp
              </button>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setAssessmentMode('evaluation')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    assessmentMode === 'evaluation'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Đánh giá định kỳ & Nhận xét
                </button>
                <button
                  onClick={() => setAssessmentMode('attendance')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    assessmentMode === 'attendance'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Điểm danh buổi học
                </button>
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-3 text-center w-12">STT</th>
                  <th className="p-3 w-64">Học sinh (Chibi)</th>
                  <th className="p-3">Lớp chủ nhiệm</th>
                  {assessmentMode === 'evaluation' ? (
                    <>
                      <th className="p-3 text-center w-32">Mức đạt (T / H / C)</th>
                      <th className="p-3">Nhận xét bộ môn chuyên (Chuẩn TT27)</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 text-center w-40">Trạng thái chuyên cần</th>
                      <th className="p-3">Ghi chú buổi học</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeClassStudents.length > 0 ? (
                  activeClassStudents.map((stu, idx) => {
                    const score = classScores[stu.id] || { level: 'H', note: `Em tiếp thu tốt bài học môn ${activeClass.subject}.` };
                    const att = classAttendance[stu.id] || 'present';
                    const homeClass = db.classes.find((c) => c.id === stu.currentClassId);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <ChibiAvatar
                              gender={stu.gender}
                              avatarId={stu.chibiAvatarId}
                              seed={stu.id || stu.studentCode}
                              size={34}
                              showGenderBadge={true}
                            />
                            <div>
                              <div className="font-bold text-slate-800">{stu.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {stu.studentCode} • {stu.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          Lớp {homeClass?.name || stu.currentClassId}
                        </td>

                        {assessmentMode === 'evaluation' ? (
                          <>
                            <td className="p-3 text-center">
                              <select
                                value={score.level}
                                onChange={(e) =>
                                  setClassScores({
                                    ...classScores,
                                    [stu.id]: { ...score, level: e.target.value as any },
                                  })
                                }
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                  score.level === 'T'
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : score.level === 'C'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <option value="T">T - Tốt</option>
                                <option value="H">H - Hoàn thành</option>
                                <option value="C">C - Cần cố gắng</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={score.note}
                                onChange={(e) =>
                                  setClassScores({
                                    ...classScores,
                                    [stu.id]: { ...score, note: e.target.value },
                                  })
                                }
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500"
                                placeholder={`Nhận xét sự tiến bộ môn ${activeClass.subject}...`}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-center">
                              <select
                                value={att}
                                onChange={(e) =>
                                  setClassAttendance({
                                    ...classAttendance,
                                    [stu.id]: e.target.value as any,
                                  })
                                }
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                  att === 'present'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : att === 'late'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="present">Có mặt</option>
                                <option value="excused">Nghỉ có phép</option>
                                <option value="unexcused">Vắng không phép</option>
                                <option value="late">Đi muộn</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Ghi chú buổi học bộ môn..."
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500"
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      Chưa có học sinh nào trong lớp này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                alert(`Đã lưu dữ liệu môn ${activeClass.subject} cho ${activeClassStudents.length} học sinh thành công!`);
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Sổ Theo Dõi Môn {activeClass.subject}</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>{editingClass ? 'Chỉnh sửa Lớp Bộ Môn' : 'Tạo Lớp Bộ Môn Mới'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên lớp bộ môn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Tiếng Anh 4A, Tin học Khối 4..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bộ môn chuyên biệt</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    {SPECIALIZED_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giáo viên phụ trách <span className="text-slate-400 font-normal text-[11px]">(tự nhập họ tên)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    placeholder="Ví dụ: Thầy Trần Anh Tuấn, Cô Lê Thu Hà..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Selection type: Linked from Homeroom vs Custom list */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phương thức lập danh sách học sinh:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'linked' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      formData.type === 'linked'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Liên kết lớp chủ nhiệm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Lấy tự động toàn bộ học sinh từ 1 hoặc nhiều lớp CN.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'custom' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      formData.type === 'custom'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tự lập danh sách riêng</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Dành cho nhóm bồi dưỡng, CLB năng khiếu...
                    </div>
                  </button>
                </div>
              </div>

              {formData.type === 'linked' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chọn các lớp chủ nhiệm được liên kết:
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {db.classes
                      .filter((c) => c.schoolYearId === db.currentSchoolYearId)
                      .map((c) => {
                        const isChecked = formData.linkedClassIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    linkedClassIds: [...formData.linkedClassIds, c.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    linkedClassIds: formData.linkedClassIds.filter((id) => id !== c.id),
                                  });
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Lớp {c.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chọn học sinh vào lớp chuyên ({formData.customStudentIds.length} đã chọn):
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                    {db.students
                      .filter((s) => s.currentSchoolYearId === db.currentSchoolYearId)
                      .slice(0, 30)
                      .map((s) => {
                        const isSelected = formData.customStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer"
                          >
                            <span className="font-medium text-slate-700">
                              {s.fullName} ({s.studentCode})
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    customStudentIds: [...formData.customStudentIds, s.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    customStudentIds: formData.customStudentIds.filter((id) => id !== s.id),
                                  });
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng học / Địa điểm</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="Phòng Tin học, Phòng Âm nhạc..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lịch học</label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="Thứ 3 (Tiết 2)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về lớp học..."
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
                  className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  {editingClass ? 'Lưu thay đổi' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
