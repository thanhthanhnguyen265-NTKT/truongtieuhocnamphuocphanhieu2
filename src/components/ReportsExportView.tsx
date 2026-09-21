import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Calendar,
  Layers,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  UserCheck,
  Edit3,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage, getMonthFromDate } from '../services/storage';
import { generateOfficialReportHtml, exportPdfDirectly } from '../services/pdfExport';
import { exportComprehensiveExcelWorkbook } from '../services/excelExport';
import { getThemeByClass } from '../data/classThemes';
import { SPECIALIZED_SUBJECTS } from './SubjectClassesView';
import { Student } from '../types';

export const ReportsExportView: React.FC = () => {
  const db = storage.getDb();
  const [reportType, setReportType] = useState<
    'attendance' | 'competition' | 'roster' | 'feedback' | 'schoolMaster' | 'subjectTeacherMonthly'
  >('attendance');
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'semester'>('week');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedWeek, setSelectedWeek] = useState<string>('Tuần 4 (Tháng 9)');
  const [selectedMonth, setSelectedMonth] = useState<string>('Tháng 9/2026');

  // Teacher name customization as requested:
  // "Bỏ chữ kí số, logo Thanh Nguyễn (cho phép giáo viên nhập/ thay đổi họ và tên của mình trong chính lớp của mình)"
  const currentYear = db.schoolYears.find((y) => y.id === db.currentSchoolYearId);
  const targetClass = db.classes.find((c) => c.id === selectedClassId);

  const [teacherCustomName, setTeacherCustomName] = useState<string>(() => {
    if (targetClass?.customTeacherName) return targetClass.customTeacherName;
    return db.currentUser?.fullName || 'Cô Nguyễn Thị Mai';
  });

  const [signerRole, setSignerRole] = useState<'teacher' | 'principal'>('teacher');
  const [includeLogo, setIncludeLogo] = useState(true);

  // Dedicated Subject Teacher Monthly Report states
  const [selectedSubject, setSelectedSubject] = useState<string>('Tiếng Anh');
  const [selectedSubjectClassId, setSelectedSubjectClassId] = useState<string>('all');
  const [selectedSubjectMonth, setSelectedSubjectMonth] = useState<number>(9);
  const [subjectTeacherCustomName, setSubjectTeacherCustomName] = useState<string>(
    () => db.currentUser?.fullName || 'Cô Lê Thị Hoàng Yến'
  );
  const [subjectSignerRole, setSubjectSignerRole] = useState<'subjectLeader' | 'principal'>('subjectLeader');

  // Update teacher name when selected class changes
  useEffect(() => {
    if (selectedClassId !== 'all') {
      const cls = db.classes.find((c) => c.id === selectedClassId);
      if (cls?.customTeacherName) {
        setTeacherCustomName(cls.customTeacherName);
      }
    }
  }, [selectedClassId, db.classes]);

  // Filter students
  const filteredStudents = db.students.filter((s) => {
    if (s.currentSchoolYearId !== db.currentSchoolYearId) return false;
    if (selectedClassId !== 'all' && s.currentClassId !== selectedClassId) return false;
    return true;
  });

  // Calculate subject students and records for Subject Teacher Monthly Report
  const targetSubjClasses = (db.subjectClasses || []).filter(
    (c) => c.subject === selectedSubject && (selectedSubjectClassId === 'all' || c.id === selectedSubjectClassId)
  );

  let subjectReportStudents: Student[] = [];
  if (selectedSubjectClassId !== 'all') {
    const targetCls = db.subjectClasses?.find((c) => c.id === selectedSubjectClassId);
    if (targetCls) {
      if (targetCls.type === 'custom' && targetCls.customStudentIds) {
        subjectReportStudents = db.students.filter((s) => targetCls.customStudentIds!.includes(s.id));
      } else if (targetCls.linkedClassIds) {
        subjectReportStudents = db.students.filter((s) => targetCls.linkedClassIds!.includes(s.currentClassId));
      }
    }
  } else {
    const allStudentIdSet = new Set<string>();
    targetSubjClasses.forEach((sc) => {
      if (sc.type === 'custom' && sc.customStudentIds) {
        sc.customStudentIds.forEach((id) => allStudentIdSet.add(id));
      } else if (sc.linkedClassIds) {
        db.students
          .filter((s) => sc.linkedClassIds!.includes(s.currentClassId))
          .forEach((s) => allStudentIdSet.add(s.id));
      }
    });
    subjectReportStudents = db.students.filter((s) => allStudentIdSet.has(s.id));
  }

  if (subjectReportStudents.length === 0) {
    subjectReportStudents = db.students.filter((s) => s.currentSchoolYearId === db.currentSchoolYearId);
  }

  // Update subject teacher name when subject class changes
  useEffect(() => {
    if (selectedSubjectClassId !== 'all') {
      const sc = db.subjectClasses?.find((c) => c.id === selectedSubjectClassId);
      if (sc?.teacherName) {
        setSubjectTeacherCustomName(sc.teacherName);
      }
    }
  }, [selectedSubjectClassId, db.subjectClasses]);

  // Function to compute row data for a student in subject report
  const getSubjectStudentRowData = (s: Student, idx: number) => {
    const homeClass = db.classes.find((c) => c.id === s.currentClassId);
    const transactions = (db.transactions || []).filter((t) => {
      if (t.studentId !== s.id) return false;
      const txMonth = t.monthNumber || getMonthFromDate(t.date);
      if (txMonth !== selectedSubjectMonth) return false;
      const noteLower = (t.note || '').toLowerCase();
      const critLower = (t.criterionName || '').toLowerCase();
      const subjLower = selectedSubject.toLowerCase();
      return (
        noteLower.includes(subjLower) ||
        critLower.includes(subjLower) ||
        (t.criterionId && t.criterionId.startsWith('SC_'))
      );
    });

    const pos = transactions.filter((t) => t.type === 'positive').reduce((acc, t) => acc + t.points, 0);
    const neg = transactions.filter((t) => t.type === 'negative').reduce((acc, t) => acc + Math.abs(t.points), 0);
    const net = pos - neg;
    const totalStr = net > 0 ? `+${net}` : net === 0 ? '0' : `${net}`;

    let rank = 'Đạt chuẩn 🟢';
    if (net >= 10) rank = 'Xuất sắc ⭐';
    else if (net >= 5) rank = 'Tích cực 🌟';
    else if (net < 0) rank = 'Cần nhắc nhở ⚠️';

    let level = 'T';
    let note = `Em có ý thức tốt và tiến bộ môn ${selectedSubject}.`;

    const monthlyRecord = (db.monthlyAssessments || []).find(
      (m) => m.studentId === s.id && m.month === selectedSubjectMonth
    );
    if (monthlyRecord?.subjects?.[selectedSubject]) {
      level = monthlyRecord.subjects[selectedSubject].level || 'T';
      note = monthlyRecord.subjects[selectedSubject].note || note;
    } else {
      for (const sc of targetSubjClasses) {
        const ev = (sc.evaluations || []).find(
          (e) => e.studentId === s.id && e.month === selectedSubjectMonth
        );
        if (ev) {
          level = ev.level || 'T';
          note = ev.note || note;
          break;
        }
      }
    }

    return {
      index: (idx + 1).toString(),
      code: s.studentCode,
      name: s.fullName,
      className: homeClass?.name ? `Lớp ${homeClass.name}` : '-',
      level,
      pos: `+${pos}`,
      neg: `-${neg}`,
      net: totalStr,
      rank,
      note,
    };
  };

  // Export Excel specifically for Subject Teacher Monthly Report
  const handleExportSubjectMonthlyExcel = () => {
    const scopeLabel =
      selectedSubjectClassId === 'all'
        ? `Tất cả các lớp môn ${selectedSubject}`
        : targetSubjClasses.find((c) => c.id === selectedSubjectClassId)?.name || 'Lớp bộ môn';

    const excelRows = subjectReportStudents.map((s, idx) => {
      const data = getSubjectStudentRowData(s, idx);
      return {
        'STT': idx + 1,
        'Mã Học Sinh': data.code,
        'Họ và Tên Học Sinh': data.name,
        'Lớp Chủ Nhiệm': data.className,
        'Môn Học': selectedSubject,
        'Tháng Báo Cáo': `Tháng ${selectedSubjectMonth}/2026`,
        'Mức ĐG Môn (T/H/C)': data.level,
        'Điểm Cộng (+)': data.pos,
        'Điểm Trừ (-)': data.neg,
        'Tổng Điểm Thi Đua': data.net,
        'Xếp Loại Thi Đua': data.rank,
        'Nhận Xét Của GV Bộ Môn': data.note,
        'Giáo Viên Bộ Môn': subjectTeacherCustomName,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `BaoCao_Thang${selectedSubjectMonth}`);
    const safeSubj = selectedSubject.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `BaoCaoThang_GVBM_${safeSubj}_Thang${selectedSubjectMonth}.xlsx`);
  };

  // Generate Report Action
  const handleExportOfficialPdf = () => {
    const creatorName = teacherCustomName.trim() || db.currentUser?.fullName || 'Giáo viên';
    const signerName = signerRole === 'principal' ? (db.settings.principalName || 'Ban Giám Hiệu') : creatorName;
    const signerTitle = signerRole === 'principal' ? 'HIỆU TRƯỞNG TRƯỜNG TIỂU HỌC' : 'GIÁO VIÊN CHỦ NHIỆM / NGƯỜI LẬP';

    const dateRangeStr =
      periodType === 'day'
        ? `Ngày ${selectedDate}`
        : periodType === 'week'
        ? selectedWeek
        : periodType === 'month'
        ? selectedMonth
        : 'Học kỳ 1 Năm học 2026–2027';

    if (reportType === 'attendance') {
      const tableRows = filteredStudents.map((s, idx) => {
        const cls = db.classes.find((c) => c.id === s.currentClassId);
        const stuAtt = db.attendance.filter((a) => a.studentId === s.id);
        const present = stuAtt.filter((a) => a.status === 'present').length;
        const total = stuAtt.length || 1;
        const rate = Math.round((present / total) * 100);

        return [
          (idx + 1).toString(),
          s.studentCode,
          s.fullName,
          `Lớp ${cls?.name || '-'}`,
          `${present}/${total} buổi`,
          `${rate}%`,
          rate >= 95 ? 'Tốt' : 'Cần cố gắng',
        ];
      });

      generateOfficialReportHtml({
        title: `BÁO CÁO CHUYÊN CẦN & ĐIỂM DANH HỌC SINH`,
        subtitle: `Phạm vi: ${selectedClassId === 'all' ? 'Toàn trường' : `Lớp ${targetClass?.name}`} • ${dateRangeStr}`,
        dateRange: dateRangeStr,
        periodType,
        tableHeaders: ['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Có mặt', 'Tỷ lệ chuyên cần', 'Đánh giá'],
        tableRows,
        summaryStats: [
          { label: 'Tổng số học sinh', value: `${filteredStudents.length} em` },
          { label: 'Phạm vi', value: selectedClassId === 'all' ? 'Toàn trường' : `Lớp ${targetClass?.name}` },
          { label: 'Thời gian báo cáo', value: dateRangeStr },
          { label: 'Người lập báo cáo', value: creatorName },
        ],
        signerTitle,
        signerName,
        creatorName,
      });
    } else if (reportType === 'competition') {
      const tableRows = filteredStudents
        .map((s) => {
          const stuTx = db.transactions.filter((t) => t.studentId === s.id);
          const pos = stuTx.filter((t) => t.type === 'positive').reduce((acc, t) => acc + t.points, 0);
          const neg = stuTx.filter((t) => t.type === 'negative').reduce((acc, t) => acc + Math.abs(t.points), 0);
          const total = pos - neg;
          const cls = db.classes.find((c) => c.id === s.currentClassId);
          return { s, pos, neg, total, cls };
        })
        .sort((a, b) => b.total - a.total)
        .map((item, idx) => [
          (idx + 1).toString(),
          item.s.studentCode,
          item.s.fullName,
          `Lớp ${item.cls?.name || '-'}`,
          `+${item.pos}`,
          `-${item.neg}`,
          `+${item.total} đ`,
          idx === 0 ? 'Xuất sắc (Top 1)' : idx < 3 ? 'Giỏi (Top 3)' : 'Đạt chuẩn',
        ]);

      generateOfficialReportHtml({
        title: `BÁO CÁO TỔNG KẾT THI ĐUA RÈN LUYỆN`,
        subtitle: `Phạm vi: ${selectedClassId === 'all' ? 'Toàn trường' : `Lớp ${targetClass?.name}`} • ${dateRangeStr}`,
        dateRange: dateRangeStr,
        periodType,
        tableHeaders: ['Hạng', 'Mã HS', 'Họ và tên', 'Lớp', 'Điểm cộng', 'Điểm trừ', 'Tổng điểm', 'Xếp loại'],
        tableRows,
        summaryStats: [
          { label: 'Tổng số học sinh', value: `${filteredStudents.length} em` },
          { label: 'Điểm cao nhất', value: tableRows[0]?.[6] || '0 đ' },
          { label: 'Thời gian', value: dateRangeStr },
          { label: 'Năm học', value: currentYear?.name || '-' },
        ],
        signerTitle,
        signerName,
        creatorName,
      });
    } else if (reportType === 'roster') {
      const tableRows = filteredStudents.map((s, idx) => {
        const cls = db.classes.find((c) => c.id === s.currentClassId);
        return [
          (idx + 1).toString(),
          s.studentCode,
          s.fullName,
          s.gender,
          s.dateOfBirth,
          `Lớp ${cls?.name || '-'}`,
          s.parentName || '-',
          s.parentPhone || '-',
        ];
      });

      generateOfficialReportHtml({
        title: `DANH SÁCH HỌC SINH CHÍNH THỨC`,
        subtitle: `Năm học ${currentYear?.name} • ${selectedClassId === 'all' ? 'Toàn trường' : `Lớp ${targetClass?.name}`}`,
        dateRange: `Thời điểm xuất: ${new Date().toLocaleDateString('vi-VN')}`,
        periodType: 'semester',
        tableHeaders: ['STT', 'Mã HS', 'Họ và tên', 'Giới tính', 'Ngày sinh', 'Lớp', 'Phụ huynh', 'SĐT liên hệ'],
        tableRows,
        summaryStats: [
          { label: 'Tổng sĩ số', value: `${filteredStudents.length} em` },
          { label: 'Học sinh Nam', value: `${filteredStudents.filter((s) => s.gender === 'Nam').length} em` },
          { label: 'Học sinh Nữ', value: `${filteredStudents.filter((s) => s.gender === 'Nữ').length} em` },
          { label: 'Phân hiệu', value: db.settings.branchName },
        ],
        signerTitle,
        signerName,
        creatorName,
      });
    } else if (reportType === 'schoolMaster') {
      // General master summary
      const tableRows = db.classes
        .filter((c) => c.schoolYearId === db.currentSchoolYearId)
        .map((c, idx) => {
          const cStudents = db.students.filter((s) => s.currentClassId === c.id);
          const cTx = db.transactions.filter((t) => t.classId === c.id);
          const totalPoints = cTx.reduce((acc, t) => acc + (t.type === 'positive' ? t.points : -Math.abs(t.points)), 0);
          const teacher = c.customTeacherName || db.teachers.find((t) => t.id === c.homeroomTeacherId)?.fullName || 'Chưa phân công';

          return [
            (idx + 1).toString(),
            `Lớp ${c.name}`,
            db.grades.find((g) => g.id === c.gradeId)?.name || '-',
            teacher,
            `${cStudents.length} em`,
            `+${totalPoints} đ`,
            '98.5%',
          ];
        });

      generateOfficialReportHtml({
        title: `BÁO CÁO TỔNG HỢP TOÀN TRƯỜNG TIỂU HỌC`,
        subtitle: `Trường TH Nam Phước - Phân hiệu 2 Duy Phước 2 • ${dateRangeStr}`,
        dateRange: dateRangeStr,
        periodType,
        tableHeaders: ['STT', 'Lớp học', 'Khối', 'GVCN', 'Sĩ số', 'Điểm thi đua', 'Tỷ lệ chuyên cần'],
        tableRows,
        summaryStats: [
          { label: 'Tổng số lớp', value: `${tableRows.length} lớp` },
          { label: 'Tổng học sinh', value: `${filteredStudents.length} em` },
          { label: 'Người lập', value: creatorName },
          { label: 'Năm học', value: currentYear?.name || '-' },
        ],
        signerTitle,
        signerName,
        creatorName,
      });
    } else if (reportType === 'subjectTeacherMonthly') {
      const scopeLabel =
        selectedSubjectClassId === 'all'
          ? `Tất cả các lớp môn ${selectedSubject}`
          : targetSubjClasses.find((c) => c.id === selectedSubjectClassId)?.name || 'Lớp bộ môn';

      const tableRows = subjectReportStudents.map((s, idx) => {
        const data = getSubjectStudentRowData(s, idx);
        return [
          data.index,
          data.code,
          data.name,
          data.className,
          data.level,
          data.pos,
          data.neg,
          data.net,
          data.rank,
          data.note,
        ];
      });

      const reviewerTitle =
        subjectSignerRole === 'principal'
          ? 'HIỆU TRƯỞNG TRƯỜNG TIỂU HỌC'
          : 'TỔ TRƯỞNG CHUYÊN MÔN';
      const reviewerName =
        subjectSignerRole === 'principal'
          ? db.settings.principalName || 'Ban Giám Hiệu'
          : 'Tổ trưởng Chuyên môn';

      generateOfficialReportHtml({
        title: `BÁO CÁO THÁNG MÔN ${selectedSubject.toUpperCase()} - THÁNG ${selectedSubjectMonth}`,
        subtitle: `Phạm vi: ${scopeLabel} • Giáo viên bộ môn: ${subjectTeacherCustomName}`,
        dateRange: `Tháng ${selectedSubjectMonth} (Năm học 2026–2027)`,
        className: scopeLabel,
        tableHeaders: [
          'STT',
          'Mã HS',
          'Họ và tên học sinh',
          'Lớp CN',
          'Mức ĐG',
          'Cộng (+)',
          'Trừ (-)',
          'Tổng ĐTĐ',
          'Xếp loại',
          'Nhận xét tháng của Giáo viên bộ môn',
        ],
        tableRows,
        summaryStats: [
          { label: 'Sĩ số học sinh', value: `${subjectReportStudents.length} em` },
          { label: 'Môn học', value: selectedSubject },
          { label: 'Thời gian', value: `Tháng ${selectedSubjectMonth}/2026` },
          { label: 'Giáo viên bộ môn', value: subjectTeacherCustomName },
        ],
        creatorTitle: 'GIÁO VIÊN BỘ MÔN',
        signerName: subjectTeacherCustomName,
        reviewerTitle,
        reviewerName,
        notes: `Báo cáo tổng hợp được lập từ phân hệ Sổ Theo Dõi Giáo Viên Bộ Môn trường Tiểu học Nam Phước - Phân hiệu 2 Duy Phước 2. Mọi đánh giá định kỳ và điểm thi đua đã được đối chiếu Thông tư 27/2020/TT-BGDĐT.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Trung tâm xuất bản báo cáo & hồ sơ trường học</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Xuất Báo Cáo Theo Ngày, Tuần, Tháng & Kỳ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động tổng hợp và xuất bản báo cáo PDF & Excel với đầy đủ tiêu đề trường, quốc hiệu tiêu ngữ và chữ ký giáo viên lập báo cáo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportComprehensiveExcelWorkbook}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section: Controls & Customization (4 cols on lg) */}
        <aside className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          {/* Section: Report Category */}
          <div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
              1. Chọn Loại báo cáo
            </h2>
            <div className="space-y-1.5 text-xs">
              {[
                { id: 'attendance', label: 'Báo cáo Điểm danh & Chuyên cần' },
                { id: 'competition', label: 'Báo cáo Thi đua & Xếp hạng' },
                { id: 'roster', label: 'Danh sách Học sinh chính thức' },
                { id: 'schoolMaster', label: 'Báo cáo Tổng hợp Toàn trường' },
                {
                  id: 'subjectTeacherMonthly',
                  label: 'Báo cáo Tháng GV Bộ Môn (Thi đua & Nhận xét)',
                  isSpecial: true,
                },
              ].map((item: any) => {
                const isSelected = reportType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setReportType(item.id as any)}
                    className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? item.isSpecial
                          ? 'bg-purple-50 text-purple-950 font-bold border border-purple-300 shadow-2xs'
                          : 'bg-sky-50 text-sky-900 font-bold border border-sky-300 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.isSpecial && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-800 rounded-full font-black uppercase">
                          Mới
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2
                        className={`w-4 h-4 ${item.isSpecial ? 'text-purple-600' : 'text-sky-600'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific controls when reportType === 'subjectTeacherMonthly' */}
          {reportType === 'subjectTeacherMonthly' ? (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Chọn Môn Học Chuyên Biệt */}
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  2. Chọn Môn học chuyên biệt
                </h2>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedSubjectClassId('all');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                >
                  {SPECIALIZED_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>
                      📖 Môn: {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Lớp Bộ Môn */}
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  3. Lớp học bộ môn
                </h2>
                <select
                  value={selectedSubjectClassId}
                  onChange={(e) => setSelectedSubjectClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="all">Tất cả các lớp bộ môn {selectedSubject}</option>
                  {targetSubjClasses.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.subject})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Tháng Báo Cáo */}
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  4. Chọn Tháng báo cáo
                </h2>
                <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
                  {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedSubjectMonth(m)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        selectedSubjectMonth === m
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Th.{m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tên Giáo Viên Bộ Môn Ký Báo Cáo */}
              <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                  <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Họ tên Giáo viên bộ môn ký báo cáo</span>
                </div>
                <input
                  type="text"
                  value={subjectTeacherCustomName}
                  onChange={(e) => setSubjectTeacherCustomName(e.target.value)}
                  placeholder="Nhập tên GV bộ môn..."
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-purple-200 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500 text-slate-800"
                />
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subjectSigner"
                      checked={subjectSignerRole === 'subjectLeader'}
                      onChange={() => setSubjectSignerRole('subjectLeader')}
                      className="accent-purple-600"
                    />
                    <span>Tổ trưởng CM ký</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subjectSigner"
                      checked={subjectSignerRole === 'principal'}
                      onChange={() => setSubjectSignerRole('principal')}
                      className="accent-purple-600"
                    />
                    <span>Hiệu trưởng ký</span>
                  </label>
                </div>
              </div>

              {/* Actions for Subject Teacher Monthly Report */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleExportOfficialPdf}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Printer className="w-4 h-4" />
                  <span>Mở Xem & Xuất Báo Cáo PDF</span>
                </button>

                <button
                  onClick={handleExportSubjectMonthlyExcel}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất File Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Section: Period selection */}
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  2. Chu kỳ thời gian báo cáo
                </h2>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-3 text-xs">
                  {(['day', 'week', 'month', 'semester'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPeriodType(type)}
                      className={`py-1.5 rounded-lg font-bold capitalize transition cursor-pointer ${
                        periodType === type
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {type === 'day' ? 'Ngày' : type === 'week' ? 'Tuần' : type === 'month' ? 'Tháng' : 'Học kỳ'}
                    </button>
                  ))}
                </div>

                {/* Dynamic Pickers */}
                <div className="space-y-2">
                  {periodType === 'day' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn ngày lập</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  )}

                  {periodType === 'week' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn tuần</label>
                      <select
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="Tuần 1 (Tháng 9)">Tuần 1 (Tháng 9)</option>
                        <option value="Tuần 2 (Tháng 9)">Tuần 2 (Tháng 9)</option>
                        <option value="Tuần 3 (Tháng 9)">Tuần 3 (Tháng 9)</option>
                        <option value="Tuần 4 (Tháng 9)">Tuần 4 (Tháng 9)</option>
                      </select>
                    </div>
                  )}

                  {periodType === 'month' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn tháng</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="Tháng 9/2026">Tháng 9/2026</option>
                        <option value="Tháng 10/2026">Tháng 10/2026</option>
                        <option value="Tháng 11/2026">Tháng 11/2026</option>
                        <option value="Tháng 12/2026">Tháng 12/2026</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Scope / Class */}
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  3. Phạm vi lớp học
                </h2>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="all">🏫 Toàn trường (Tất cả các lớp)</option>
                  {db.classes
                    .filter((c) => c.schoolYearId === db.currentSchoolYearId)
                    .map((c) => {
                      const theme = getThemeByClass(c.name, c.avatarThemeId);
                      return (
                        <option key={c.id} value={c.id}>
                          {theme.emoji} Lớp {c.name} - {theme.label}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Section: Teacher name editing */}
              <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                  <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Họ tên Giáo viên lập báo cáo</span>
                </div>
                <input
                  type="text"
                  value={teacherCustomName}
                  onChange={(e) => setTeacherCustomName(e.target.value)}
                  placeholder="Nhập họ và tên giáo viên..."
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
                <p className="text-[10px] text-slate-500">
                  * Giáo viên có thể tự do nhập hoặc thay đổi họ tên của mình trên báo cáo này.
                </p>
              </div>

              {/* Print PDF Button */}
              <button
                onClick={handleExportOfficialPdf}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                <span>MỞ XEM & XUẤT FILE PDF</span>
              </button>
            </>
          )}
        </aside>

        {/* Right Section: Paper Document Live Preview (8 cols on lg) */}
        <section className="lg:col-span-8">
          <div className="bg-white shadow-xl rounded-3xl border border-slate-200 flex flex-col p-8 sm:p-12 relative font-sans">
            {/* National Header */}
            <div className="flex justify-between border-b-2 border-slate-800 pb-5 mb-8 gap-4">
              <div className="text-center uppercase font-bold text-xs">
                <p className="tracking-wide text-slate-600">PHÒNG GD&ĐT HUYỆN DUY XUYÊN</p>
                <p className="text-slate-900 font-black text-sm mt-0.5">Trường TH Nam Phước</p>
                <p className="text-[10px] text-sky-700 font-semibold lowercase italic mt-0.5">
                  Phân hiệu 2 Duy Phước 2
                </p>
              </div>
              <div className="text-center uppercase font-bold text-xs">
                <p className="tracking-wide text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="underline underline-offset-4 font-black mt-0.5 text-slate-900">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <p className="text-[10px] text-slate-400 font-normal italic mt-1">
                  Duy Phước, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {reportType === 'attendance' && 'BÁO CÁO TỔNG HỢP CHUYÊN CẦN & ĐIỂM DANH'}
                {reportType === 'competition' && 'BÁO CÁO TỔNG KẾT THI ĐUA & RÈN LUYỆN HỌC SINH'}
                {reportType === 'roster' && 'DANH SÁCH HỌC SINH CHÍNH THỨC TOÀN TRƯỜNG'}
                {reportType === 'schoolMaster' && 'BÁO CÁO TỔNG HỢP CÔNG TÁC GIÁO DỤC'}
                {reportType === 'subjectTeacherMonthly' &&
                  `BÁO CÁO THÁNG MÔN ${selectedSubject.toUpperCase()} - THÁNG ${selectedSubjectMonth}`}
              </h3>
              <p className="text-slate-500 italic mt-1 text-xs">
                {reportType === 'subjectTeacherMonthly' ? (
                  <>
                    Phạm vi:{' '}
                    {selectedSubjectClassId === 'all'
                      ? `Tất cả các lớp bộ môn ${selectedSubject}`
                      : targetSubjClasses.find((c) => c.id === selectedSubjectClassId)?.name || 'Lớp bộ môn'}{' '}
                    • Tháng {selectedSubjectMonth}/2026 • GV Bộ môn: {subjectTeacherCustomName}
                  </>
                ) : (
                  <>
                    Phạm vi: {selectedClassId === 'all' ? 'Toàn trường' : `Lớp ${targetClass?.name}`} • Chu kỳ:{' '}
                    {periodType === 'day'
                      ? `Ngày ${selectedDate}`
                      : periodType === 'week'
                      ? selectedWeek
                      : periodType === 'month'
                      ? selectedMonth
                      : 'Học kỳ 1 Năm học 2026–2027'}
                  </>
                )}
              </p>
            </div>

            {/* Summary statistics row */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center mb-6">
              {reportType === 'subjectTeacherMonthly' ? (
                <>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Môn học & Thời gian</div>
                    <div className="text-xs font-black text-purple-800 mt-0.5">
                      {selectedSubject} • Tháng {selectedSubjectMonth}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Sĩ số học sinh</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">
                      {subjectReportStudents.length} em
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Giáo viên bộ môn</div>
                    <div className="text-xs font-black text-purple-700 mt-0.5">
                      {subjectTeacherCustomName}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Phạm vi</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">
                      {selectedClassId === 'all' ? 'Toàn trường' : `Lớp ${targetClass?.name}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Sĩ số học sinh</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">
                      {filteredStudents.length} em
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Người lập báo cáo</div>
                    <div className="text-xs font-black text-sky-700 mt-0.5">{teacherCustomName}</div>
                  </div>
                </>
              )}
            </div>

            {/* Live Data Sample Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs mb-8">
              {reportType === 'subjectTeacherMonthly' ? (
                <table className="w-full text-left">
                  <thead className="bg-purple-50 text-[10px] uppercase font-bold text-purple-900">
                    <tr>
                      <th className="p-2.5">STT</th>
                      <th className="p-2.5">Mã HS</th>
                      <th className="p-2.5">Họ tên</th>
                      <th className="p-2.5">Lớp CN</th>
                      <th className="p-2.5 text-center">ĐG Môn</th>
                      <th className="p-2.5 text-center">Điểm (+)</th>
                      <th className="p-2.5 text-center">Điểm (-)</th>
                      <th className="p-2.5 text-center">Tổng ĐTĐ</th>
                      <th className="p-2.5">Xếp loại</th>
                      <th className="p-2.5">Nhận xét tháng của GVBM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {subjectReportStudents.slice(0, 6).map((stu, i) => {
                      const data = getSubjectStudentRowData(stu, i);
                      return (
                        <tr key={stu.id} className="hover:bg-purple-50/30 transition">
                          <td className="p-2.5 font-bold text-slate-500">{data.index}</td>
                          <td className="p-2.5 font-mono text-slate-600">{data.code}</td>
                          <td className="p-2.5 font-bold text-slate-800">{data.name}</td>
                          <td className="p-2.5 text-slate-600">{data.className}</td>
                          <td className="p-2.5 text-center font-black text-purple-700">{data.level}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-600">{data.pos}</td>
                          <td className="p-2.5 text-center font-bold text-rose-600">{data.neg}</td>
                          <td className="p-2.5 text-center font-black text-indigo-700">{data.net}</td>
                          <td className="p-2.5 font-bold text-slate-700">{data.rank}</td>
                          <td className="p-2.5 text-slate-600 italic max-w-xs truncate">{data.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="p-2.5">STT</th>
                      <th className="p-2.5">Mã HS</th>
                      <th className="p-2.5">Họ tên</th>
                      <th className="p-2.5">Lớp</th>
                      <th className="p-2.5 text-right">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {filteredStudents.slice(0, 5).map((stu, i) => (
                      <tr key={stu.id}>
                        <td className="p-2.5 font-bold text-slate-500">{i + 1}</td>
                        <td className="p-2.5 font-mono text-slate-600">{stu.studentCode}</td>
                        <td className="p-2.5 font-bold text-slate-800">{stu.fullName}</td>
                        <td className="p-2.5 text-slate-600">
                          {db.classes.find((c) => c.id === stu.currentClassId)?.name}
                        </td>
                        <td className="p-2.5 text-right text-emerald-600 font-bold">Chăm ngoan</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reportType === 'subjectTeacherMonthly' ? (
                subjectReportStudents.length > 6 && (
                  <div className="p-2 bg-purple-50/50 text-[10px] text-center text-purple-700 italic">
                    Và {subjectReportStudents.length - 6} học sinh khác sẽ được xuất đầy đủ trong file PDF và Excel...
                  </div>
                )
              ) : (
                filteredStudents.length > 5 && (
                  <div className="p-2 bg-slate-50 text-[10px] text-center text-slate-400 italic">
                    Và {filteredStudents.length - 5} học sinh khác sẽ được xuất đầy đủ trong file PDF...
                  </div>
                )
              )}
            </div>

            {/* Official School Signatures Footer */}
            <div className="mt-auto pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-xs font-bold uppercase text-slate-700">
                  {reportType === 'subjectTeacherMonthly'
                    ? 'GIÁO VIÊN BỘ MÔN'
                    : 'NGƯỜI LẬP BÁO CÁO / GIÁO VIÊN'}
                </p>
                <p className="text-[10px] italic text-slate-400 mb-14">(Ký và ghi rõ họ tên)</p>
                <p className="text-sm font-bold text-slate-900">
                  {reportType === 'subjectTeacherMonthly' ? subjectTeacherCustomName : teacherCustomName}
                </p>
              </div>

              <div>
                <p className="text-[10px] italic text-slate-400">
                  Duy Phước, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm{' '}
                  {new Date().getFullYear()}
                </p>
                <p className="text-xs font-bold uppercase text-slate-700 mt-0.5">
                  {reportType === 'subjectTeacherMonthly' && subjectSignerRole === 'subjectLeader'
                    ? 'TỔ TRƯỞNG CHUYÊN MÔN'
                    : 'HIỆU TRƯỞNG / BAN GIÁM HIỆU'}
                </p>
                <p className="text-[10px] italic text-slate-400 mb-14">(Ký, đóng dấu và ghi rõ họ tên)</p>
                <p className="text-sm font-bold text-slate-900">
                  {reportType === 'subjectTeacherMonthly' && subjectSignerRole === 'subjectLeader'
                    ? 'Tổ trưởng Chuyên môn'
                    : db.settings.principalName || 'Ban Giám Hiệu'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
