import React, { useState } from 'react';
import {
  CheckSquare,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  Sparkles,
  Save,
  Filter,
} from 'lucide-react';
import { storage } from '../services/storage';
import { AttendanceRecord } from '../types';
import { generateOfficialReportHtml } from '../services/pdfExport';

interface AttendanceViewProps {
  initialClassId?: string;
  onOpenOwnerModal: (action: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  initialClassId,
  onOpenOwnerModal,
}) => {
  const db = storage.getDb();
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || db.classes[0]?.id || 'C4A'
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');

  const canMark = storage.canMarkAttendance(selectedClassId);
  const isAllowedToEdit = canMark.allowed;

  const currentClass = db.classes.find((c) => c.id === selectedClassId);
  const students = db.students.filter(
    (s) => s.currentClassId === selectedClassId && s.currentSchoolYearId === db.currentSchoolYearId
  );

  // Existing attendance records for this date and class
  const classAttendanceForDate = db.attendance.filter(
    (a) => a.classId === selectedClassId && a.date === selectedDate
  );

  const getStudentStatus = (studentId: string): 'present' | 'excused' | 'unexcused' | 'late' => {
    const rec = classAttendanceForDate.find((a) => a.studentId === studentId);
    return rec ? rec.status : 'present';
  };

  const getStudentNote = (studentId: string): string => {
    const rec = classAttendanceForDate.find((a) => a.studentId === studentId);
    return rec?.note || '';
  };

  // Change single student status
  const handleUpdateStatus = (
    studentId: string,
    status: 'present' | 'excused' | 'unexcused' | 'late'
  ) => {
    if (!isAllowedToEdit) {
      if (canMark.reason) {
        alert(canMark.reason);
      } else {
        onOpenOwnerModal('Cập nhật điểm danh');
      }
      return;
    }

    const teacher = db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);
    const existingRecIndex = db.attendance.findIndex(
      (a) => a.classId === selectedClassId && a.date === selectedDate && a.studentId === studentId
    );

    let updatedAttendance = [...db.attendance];

    if (existingRecIndex >= 0) {
      updatedAttendance[existingRecIndex] = {
        ...updatedAttendance[existingRecIndex],
        status,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newRec: AttendanceRecord = {
        id: `ATT_${selectedDate}_${studentId}`,
        studentId,
        classId: selectedClassId,
        schoolYearId: db.currentSchoolYearId,
        date: selectedDate,
        status,
        teacherId: currentClass?.homeroomTeacherId || 'T002',
        teacherName: teacher?.fullName || 'Giáo viên',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedAttendance.push(newRec);
    }

    storage.save(
      { ...db, attendance: updatedAttendance },
      true,
      {
        category: 'Điểm danh',
        action: 'Điểm danh học sinh',
        details: `Cập nhật trạng thái điểm danh ngày ${selectedDate} cho học sinh.`,
      }
    );
  };

  // Change student note
  const handleUpdateNote = (studentId: string, note: string) => {
    if (!isAllowedToEdit) {
      if (canMark.reason) {
        alert(canMark.reason);
      } else {
        onOpenOwnerModal('Ghi chú điểm danh');
      }
      return;
    }

    const teacher = db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);
    const existingRecIndex = db.attendance.findIndex(
      (a) => a.classId === selectedClassId && a.date === selectedDate && a.studentId === studentId
    );

    let updatedAttendance = [...db.attendance];

    if (existingRecIndex >= 0) {
      updatedAttendance[existingRecIndex] = {
        ...updatedAttendance[existingRecIndex],
        note,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newRec: AttendanceRecord = {
        id: `ATT_${selectedDate}_${studentId}`,
        studentId,
        classId: selectedClassId,
        schoolYearId: db.currentSchoolYearId,
        date: selectedDate,
        status: 'present',
        note,
        teacherId: currentClass?.homeroomTeacherId || 'T002',
        teacherName: teacher?.fullName || 'Giáo viên',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedAttendance.push(newRec);
    }

    storage.save(
      { ...db, attendance: updatedAttendance },
      true,
      {
        category: 'Điểm danh',
        action: 'Ghi chú lý do nghỉ',
        details: `Cập nhật ghi chú lý do nghỉ cho học sinh ngày ${selectedDate}.`,
      }
    );
  };

  // Quick action: Mark all present
  const handleMarkAllPresent = () => {
    if (!isAllowedToEdit) {
      if (canMark.reason) {
        alert(canMark.reason);
      } else {
        onOpenOwnerModal('Điểm danh nhanh cả lớp');
      }
      return;
    }

    const teacher = db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);
    let updatedAttendance = db.attendance.filter(
      (a) => !(a.classId === selectedClassId && a.date === selectedDate)
    );

    students.forEach((s) => {
      const newRec: AttendanceRecord = {
        id: `ATT_${selectedDate}_${s.id}`,
        studentId: s.id,
        classId: selectedClassId,
        schoolYearId: db.currentSchoolYearId,
        date: selectedDate,
        status: 'present',
        teacherId: currentClass?.homeroomTeacherId || 'T002',
        teacherName: teacher?.fullName || 'Giáo viên',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedAttendance.push(newRec);
    });

    storage.save(
      { ...db, attendance: updatedAttendance },
      true,
      {
        category: 'Điểm danh',
        action: `Điểm danh 100% có mặt lớp ${currentClass?.name}`,
        details: `Đã xác nhận tất cả ${students.length} học sinh có mặt ngày ${selectedDate}.`,
      }
    );
  };

  // Stats calculation
  const presentCount = students.filter((s) => getStudentStatus(s.id) === 'present').length;
  const excusedCount = students.filter((s) => getStudentStatus(s.id) === 'excused').length;
  const unexcusedCount = students.filter((s) => getStudentStatus(s.id) === 'unexcused').length;
  const lateCount = students.filter((s) => getStudentStatus(s.id) === 'late').length;
  const attendanceRate =
    students.length > 0 ? Math.round((presentCount / students.length) * 100) : 100;

  // Print Official Report
  const handlePrintReport = () => {
    const tableRows = students.map((s, idx) => {
      const st = getStudentStatus(s.id);
      const note = getStudentNote(s.id);
      const stText =
        st === 'present'
          ? 'Có mặt'
          : st === 'excused'
          ? 'Phép'
          : st === 'unexcused'
          ? 'K.Phép'
          : 'Muộn';
      return [
        (idx + 1).toString(),
        s.studentCode,
        s.fullName,
        s.gender,
        stText,
        note || '-',
      ];
    });

    generateOfficialReportHtml({
      title: `BÁO CÁO CHUYÊN CẦN VÀ ĐIỂM DANH LỚP ${currentClass?.name || ''}`,
      subtitle: `Ngày điểm danh: ${selectedDate} • Tổng số học sinh: ${students.length} em • Tỷ lệ hiện diện: ${attendanceRate}%`,
      dateRange: `Ngày ${selectedDate}`,
      periodType: 'day',
      tableHeaders: ['STT', 'Mã HS', 'Họ và tên học sinh', 'Giới tính', 'Điểm danh', 'Lý do / Ghi chú'],
      tableRows,
      summaryStats: [
        { label: 'Tổng sĩ số', value: `${students.length} em` },
        { label: 'Có mặt đầy đủ', value: `${presentCount} em` },
        { label: 'Nghỉ có phép', value: `${excusedCount} em` },
        { label: 'Nghỉ không phép', value: `${unexcusedCount} em` },
        { label: 'Đi muộn', value: `${lateCount} em` },
        { label: 'Tỷ lệ chuyên cần', value: `${attendanceRate}%` },
      ],
      signerTitle: 'GIÁO VIÊN CHỦ NHIỆM',
      signerName:
        db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId)?.fullName ||
        'Thanh Nguyễn',
    });
  };

  return (
    <div className="space-y-6">
      {/* Role Access Notice */}
      {!isAllowedToEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <div className="font-bold text-amber-950 text-sm">Chế độ xem thông tin chuyên cần</div>
            <p className="mt-0.5">
              Bạn đang đăng nhập với vai trò: <strong>{db.currentUser?.fullName}</strong> (
              {db.currentUser?.role === 'subject'
                ? `Giáo viên chuyên ${db.currentUser.subjects?.join(', ')}`
                : db.currentUser?.role === 'homeroom'
                ? 'Giáo viên chủ nhiệm lớp khác'
                : 'Khách / Người dùng'}
              ). Sổ điểm danh chính do Giáo viên chủ nhiệm Lớp {currentClass?.name} (
              <strong>{currentClass?.customTeacherName || 'GVCN'}</strong>) quản lý.
            </p>
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Sổ theo dõi chuyên cần điện tử</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Điểm danh Lớp {currentClass?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận có mặt, nghỉ phép, không phép, đi muộn. Lưu tự động theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            Điểm danh cả lớp có mặt (1 chạm)
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Xuất Báo cáo & Chữ ký số
          </button>
        </div>
      </div>

      {/* Select Class & Date Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn lớp</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
          >
            {db.classes
              .filter((c) => c.schoolYearId === db.currentSchoolYearId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.name} ({db.grades.find((g) => g.id === c.gradeId)?.name})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày điểm danh</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Lọc tên học sinh</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên học sinh..."
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
          />
        </div>
      </div>

      {/* Real-time KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xl font-black text-slate-800">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sĩ số lớp</div>
        </div>
        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-xl font-black text-emerald-700">{presentCount}</div>
          <div className="text-[11px] text-emerald-800 mt-0.5">Có mặt đầy đủ</div>
        </div>
        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 shadow-xs">
          <div className="text-xl font-black text-blue-700">{excusedCount}</div>
          <div className="text-[11px] text-blue-800 mt-0.5">Nghỉ có phép</div>
        </div>
        <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 shadow-xs">
          <div className="text-xl font-black text-rose-700">{unexcusedCount}</div>
          <div className="text-[11px] text-rose-800 mt-0.5">Nghỉ không phép</div>
        </div>
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
          <div className="text-xl font-black text-amber-700">{lateCount}</div>
          <div className="text-[11px] text-amber-800 mt-0.5">Đi muộn</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            Danh sách điểm danh Lớp {currentClass?.name} ({students.length} học sinh)
          </span>
          <span className="font-semibold text-emerald-600">
            Tỷ lệ chuyên cần ngày {selectedDate}: {attendanceRate}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 text-center w-12">STT</th>
                <th className="p-3">Mã HS</th>
                <th className="p-3">Họ và Tên</th>
                <th className="p-3 text-center">Giới tính</th>
                <th className="p-3 text-center">Trạng thái điểm danh</th>
                <th className="p-3">Lý do vắng / Đi muộn / Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {students
                .filter((s) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((stu, idx) => {
                  const currentStatus = getStudentStatus(stu.id);
                  const currentNote = getStudentNote(stu.id);

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{stu.studentCode}</td>
                      <td className="p-3 font-bold text-slate-800">{stu.fullName}</td>
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
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                          <button
                            onClick={() => handleUpdateStatus(stu.id, 'present')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Có mặt
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(stu.id, 'excused')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Phép
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(stu.id, 'unexcused')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'unexcused'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-white'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            K.Phép
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(stu.id, 'late')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-white'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Muộn
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          defaultValue={currentNote}
                          onBlur={(e) => handleUpdateNote(stu.id, e.target.value)}
                          placeholder="Nhập lý do..."
                          className="w-full max-w-xs px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
