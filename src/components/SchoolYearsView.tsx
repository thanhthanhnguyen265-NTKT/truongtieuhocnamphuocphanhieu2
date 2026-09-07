import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Archive,
  Copy,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Edit2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { storage } from '../services/storage';
import { SchoolYear } from '../types';

interface SchoolYearsViewProps {
  onOpenOwnerModal: (action: string) => void;
}

export const SchoolYearsView: React.FC<SchoolYearsViewProps> = ({ onOpenOwnerModal }) => {
  const db = storage.getDb();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState('2027-09-05');
  const [newEndDate, setNewEndDate] = useState('2028-05-31');
  const [newNotes, setNewNotes] = useState('');

  // Promotion state
  const [sourceYearId, setSourceYearId] = useState(db.currentSchoolYearId);
  const [targetYearId, setTargetYearId] = useState(
    db.schoolYears.find((y) => y.id !== db.currentSchoolYearId)?.id || ''
  );
  const [promoteSuccess, setPromoteSuccess] = useState('');

  const isAllowedToEdit = db.currentUser?.isOwner || db.currentUser?.permissions?.edit || db.isOwnerUnlocked;

  const handleSetCurrent = (yearId: string) => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Đặt năm học hiện tại');
      return;
    }
    const updated = {
      ...db,
      currentSchoolYearId: yearId,
      schoolYears: db.schoolYears.map((y) => ({
        ...y,
        isCurrent: y.id === yearId,
      })),
    };
    storage.save(updated, true, {
      category: 'Hệ thống',
      action: 'Đặt năm học hiện tại',
      details: `Đã thiết lập năm học ${db.schoolYears.find((y) => y.id === yearId)?.name} làm năm học mặc định.`,
    });
  };

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Tạo năm học mới');
      return;
    }
    if (!newName.trim()) return;

    const id = `SY_${newName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newYear: SchoolYear = {
      id,
      name: newName.trim(),
      startDate: newStartDate,
      endDate: newEndDate,
      isCurrent: false,
      status: 'active',
      notes: newNotes,
    };

    const updated = {
      ...db,
      schoolYears: [...db.schoolYears, newYear],
    };
    storage.save(updated, true, {
      category: 'Hệ thống',
      action: 'Thêm năm học mới',
      details: `Đã khởi tạo năm học mới ${newName}.`,
    });

    setShowAddModal(false);
    setNewName('');
  };

  const handlePromoteStudents = () => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Chuyển học sinh lên lớp');
      return;
    }

    if (!targetYearId || targetYearId === sourceYearId) {
      alert('Vui lòng chọn năm học nguồn và năm học đích khác nhau.');
      return;
    }

    // Map: 1A -> 2A, 2A -> 3A, 3A -> 4A, 4A -> 5A, 5A -> Graduated (hoặc giữ nguyên)
    const sourceClasses = db.classes.filter((c) => c.schoolYearId === sourceYearId);
    let promotedCount = 0;

    const updatedStudents = db.students.map((stu) => {
      if (stu.currentSchoolYearId === sourceYearId) {
        const cls = db.classes.find((c) => c.id === stu.currentClassId);
        if (cls) {
          const className = cls.name; // e.g. "1A", "4A"
          const levelNum = parseInt(className.charAt(0), 10);
          const letter = className.slice(1); // e.g. "A"

          if (levelNum < 5) {
            const nextClassName = `${levelNum + 1}${letter}`;
            // Find target class in target school year
            let targetClass = db.classes.find(
              (c) => c.schoolYearId === targetYearId && c.name === nextClassName
            );
            if (!targetClass) {
              // Copy class structure if not exists
              targetClass = {
                id: `C_${nextClassName}_${targetYearId}`,
                name: nextClassName,
                gradeId: `G${levelNum + 1}`,
                schoolYearId: targetYearId,
                homeroomTeacherId: cls.homeroomTeacherId,
                subjectTeacherIds: cls.subjectTeacherIds,
              };
              db.classes.push(targetClass);
            }

            promotedCount++;
            return {
              ...stu,
              currentClassId: targetClass.id,
              currentGradeId: `G${levelNum + 1}`,
              currentSchoolYearId: targetYearId,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
      return stu;
    });

    const updated = {
      ...db,
      students: updatedStudents,
    };

    storage.save(updated, true, {
      category: 'Học sinh',
      action: 'Chuyển học sinh lên lớp',
      details: `Đã chuyển ${promotedCount} học sinh lên lớp thành công sang năm học mới.`,
    });

    setPromoteSuccess(`Chuyển ${promotedCount} học sinh lên lớp thành công!`);
    setTimeout(() => {
      setPromoteSuccess('');
      setShowPromoteModal(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Quản trị cơ sở dữ liệu thời gian</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Năm học & Chuyển lớp</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu mỗi năm học được lưu độc lập, bảo toàn lịch sử phát triển của học sinh qua các năm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromoteModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            Chuyển học sinh lên lớp (1A → 2A)
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Thêm năm học mới
          </button>
        </div>
      </div>

      {/* School Year Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {db.schoolYears.map((year) => {
          const yearStudents = db.students.filter((s) => s.currentSchoolYearId === year.id);
          const yearClasses = db.classes.filter((c) => c.schoolYearId === year.id);
          const isCurrent = year.id === db.currentSchoolYearId;

          return (
            <div
              key={year.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                isCurrent
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800">{year.name}</h3>
                      <div className="text-[11px] text-slate-400">
                        {year.status === 'archived' ? 'Đã lưu trữ' : 'Đang hoạt động'}
                      </div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Hiện tại
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetCurrent(year.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition"
                    >
                      Chọn làm việc
                    </button>
                  )}
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Thời gian năm học:</span>
                    <span className="font-semibold text-slate-800">
                      {year.startDate} đến {year.endDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Số lớp học:</span>
                    <span className="font-semibold text-slate-800">{yearClasses.length} lớp</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tổng số học sinh:</span>
                    <span className="font-semibold text-slate-800">{yearStudents.length} học sinh</span>
                  </div>
                </div>

                {year.notes && (
                  <div className="mt-3 text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {year.notes}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[10px]">{year.id}</span>
                {!isCurrent && (
                  <button
                    onClick={() => handleSetCurrent(year.id)}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Đặt làm năm học hiện tại →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add School Year Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Thêm Năm học mới
            </h3>
            <form onSubmit={handleCreateYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên năm học (Ví dụ: 2027–2028)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="2027–2028"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Kế hoạch năm học mới..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Lưu năm học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotion Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Chuyển danh sách học sinh lên lớp
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tự động nâng khối lớp cho học sinh (Ví dụ: 1A → 2A, 2A → 3A, 3A → 4A, 4A → 5A) sang năm học mới mà không làm mất lịch sử rèn luyện cũ.
            </p>

            {promoteSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{promoteSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Năm học nguồn (Hiện tại)
                  </label>
                  <select
                    value={sourceYearId}
                    onChange={(e) => setSourceYearId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg"
                  >
                    {db.schoolYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Năm học đích (Mới)
                  </label>
                  <select
                    value={targetYearId}
                    onChange={(e) => setTargetYearId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg"
                  >
                    {db.schoolYears
                      .filter((y) => y.id !== sourceYearId)
                      .map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Quy tắc chuyển lớp tự động:
                </div>
                <div>• Khối 1 lên Khối 2: 1A → 2A, 1B → 2B</div>
                <div>• Khối 2 lên Khối 3: 2A → 3A, 2B → 3B</div>
                <div>• Khối 3 lên Khối 4: 3A → 4A, 3B → 4B</div>
                <div>• Khối 4 lên Khối 5: 4A → 5A, 4B → 5B</div>
                <div>• Học sinh Khối 5: Được bảo lưu hồ sơ tốt nghiệp tiểu học.</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handlePromoteStudents}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Xác nhận chuyển lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
