import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Award,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Save,
  Users,
  Lightbulb,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Info,
  Check,
  Edit3,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SubjectClass, Student, AppDatabase, MonthlyAssessmentTT27 } from '../types';
import { storage, getMonthFromDate } from '../services/storage';
import { generateOfficialReportHtml, openPrintReportWindow } from '../services/pdfExport';
import { ChibiAvatar } from '../data/chibiAvatars';

interface SubjectTeacherMonthlyReportProps {
  subjectClass: SubjectClass;
  students: Student[];
  db: AppDatabase;
  onClose?: () => void;
  onRefresh?: () => void;
}

// School year months for primary education (Sep -> May)
export const SCHOOL_MONTHS = [
  { value: 9, label: 'Tháng 9 (Đầu HK1)' },
  { value: 10, label: 'Tháng 10 (HK1)' },
  { value: 11, label: 'Tháng 11 (Giữa HK1)' },
  { value: 12, label: 'Tháng 12 (Cuối HK1)' },
  { value: 1, label: 'Tháng 1 (Đầu HK2)' },
  { value: 2, label: 'Tháng 2 (HK2)' },
  { value: 3, label: 'Tháng 3 (Giữa HK2)' },
  { value: 4, label: 'Tháng 4 (HK2)' },
  { value: 5, label: 'Tháng 5 (Tổng kết HK2)' },
];

export const QUICK_COMMENTS_BY_SUBJECT: Record<string, string[]> = {
  'Tiếng Anh': [
    'Phát âm chuẩn xác, tự tin giao tiếp và nhớ từ vựng tốt.',
    'Nắm chắc từ vựng và mẫu câu cơ bản, chăm chỉ học tập.',
    'Có khả năng nghe - hiểu tốt, tích cực tham gia tương tác.',
    'Cần rèn luyện thêm kỹ năng phát âm và phản xạ nói.',
    'Cần tập trung ôn luyện từ vựng và tự tin hơn khi trả lời.',
    'Hoàn thành tốt các bài tập nghe và đọc hiểu trên lớp.',
  ],
  'Tin học': [
    'Thao tác máy tính nhanh nhẹn, hoàn thành tốt bài thực hành.',
    'Nắm vững kiến thức bài học, có tư duy logic và thao tác chuẩn.',
    'Sử dụng thành thạo bàn phím và chuột, tích cực sáng tạo.',
    'Cần luyện tập thêm kỹ năng gõ bàn phím đúng cách bằng 10 ngón.',
    'Cần chú ý lắng nghe hướng dẫn thao tác máy từ giáo viên.',
    'Có năng khiếu vượt trội trong môn học, nhiệt tình giúp đỡ bạn bè.',
  ],
  'Mỹ thuật': [
    'Bức vẽ sáng tạo, phối màu hài hòa và đường nét sinh động.',
    'Có năng khiếu hội họa nổi bật, hoàn thành sản phẩm đúng hạn.',
    'Chăm chỉ, khéo tay, biết thể hiện ý tưởng phong phú qua tranh vẽ.',
    'Cần rèn thêm kỹ năng tô màu đều tay và bố cục tranh cân đối.',
    'Cần chuẩn bị đầy đủ dụng cụ vẽ và màu nước trước khi vào lớp.',
  ],
  'Âm nhạc': [
    'Hát đúng cao độ và trường độ, biểu diễn tự tin trước lớp.',
    'Cảm thụ âm nhạc tốt, thuộc bài hát nhanh và gõ đệm nhịp nhàng.',
    'Tích cực tham gia các tiết mục văn nghệ và hoạt động nhóm.',
    'Cần chú ý nghe nhạc mẫu để hát đúng nhịp điệu của bài.',
    'Cần tự tin hơn khi thể hiện giọng hát trước tập thể lớp.',
  ],
  'GD Thể chất': [
    'Thể lực tốt, thực hiện động tác chuẩn xác, nhanh nhẹn và dứt khoát.',
    'Nhiệt tình tham gia các trò chơi vận động, tinh thần đồng đội cao.',
    'Ý thức kỷ luật tốt, trang phục thể thao đầy đủ và đúng quy định.',
    'Cần rèn luyện thêm tính bền bỉ và khởi động kỹ trước giờ tập.',
  ],
  default: [
    'Tiếp thu bài tốt, có nhiều tiến bộ trong học tập và rèn luyện.',
    'Nắm vững kiến thức trọng tâm, tích cực phát biểu xây dựng bài.',
    'Chăm chỉ, có ý thức chuẩn bị bài và hoàn thành tốt nhiệm vụ.',
    'Cần chú ý tập trung nghe giảng và rèn luyện thêm các kỹ năng cơ bản.',
    'Hợp tác tốt với bạn bè, có thái độ học tập nghiêm túc.',
  ],
};

export const SubjectTeacherMonthlyReport: React.FC<SubjectTeacherMonthlyReportProps> = ({
  subjectClass,
  students,
  db,
  onClose,
  onRefresh,
}) => {
  // Current month default
  const curMonth = new Date().getMonth() + 1;
  const initialMonth = [9, 10, 11, 12, 1, 2, 3, 4, 5].includes(curMonth) ? curMonth : 9;
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  // Custom teacher signature name
  const [customTeacherName, setCustomTeacherName] = useState<string>(() => {
    return subjectClass.teacherName || db.currentUser?.fullName || 'Giáo viên bộ môn';
  });
  const [isEditingTeacherName, setIsEditingTeacherName] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'T' | 'H' | 'C'>('all');
  const [pointFilter, setPointFilter] = useState<'all' | 'pos' | 'neg' | 'high'>('all');
  const [sortField, setSortField] = useState<'name' | 'points' | 'level'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Selected student for quick comment suggestion modal/popover
  const [activeSuggestionStudentId, setActiveSuggestionStudentId] = useState<string | null>(null);
  const [selectedStudentTxDetail, setSelectedStudentTxDetail] = useState<Student | null>(null);

  // State of monthly comments and levels
  // Key format: studentId -> { level: 'T' | 'H' | 'C', note: string }
  const [monthlyData, setMonthlyData] = useState<
    Record<string, { level: 'T' | 'H' | 'C'; note: string }>
  >(() => {
    const initial: Record<string, { level: 'T' | 'H' | 'C'; note: string }> = {};
    students.forEach((stu) => {
      // 1. Try finding in subjectClass.evaluations for this month
      const clsEval = (subjectClass.evaluations || []).find(
        (e) => e.studentId === stu.id && e.month === initialMonth
      );
      if (clsEval) {
        initial[stu.id] = { level: clsEval.level || 'T', note: clsEval.note || '' };
        return;
      }

      // 2. Try finding in db.monthlyAssessments
      const monthlyAssessment = (db.monthlyAssessments || []).find(
        (m) =>
          m.studentId === stu.id &&
          m.month === initialMonth &&
          (m.schoolYearId === db.currentSchoolYearId || m.schoolYearId === 'SY2026_2027')
      );
      const subjRecord = monthlyAssessment?.subjects?.[subjectClass.subject];
      if (subjRecord) {
        initial[stu.id] = { level: subjRecord.level || 'T', note: subjRecord.note || '' };
        return;
      }

      // 3. Fallback: Check HK1 or HK2 from class evaluations
      const semKey = [9, 10, 11, 12].includes(initialMonth) ? 'HK1' : 'HK2';
      const semEval = (subjectClass.evaluations || []).find(
        (e) => e.studentId === stu.id && e.semester === semKey
      );
      if (semEval) {
        initial[stu.id] = { level: semEval.level || 'T', note: semEval.note || '' };
        return;
      }

      // Default
      initial[stu.id] = {
        level: 'T',
        note: `Em chăm chỉ, tiếp thu bài tốt môn ${subjectClass.subject}.`,
      };
    });
    return initial;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // When selectedMonth changes, reload or preserve comments
  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    const updated: Record<string, { level: 'T' | 'H' | 'C'; note: string }> = {};

    students.forEach((stu) => {
      // Check subjectClass.evaluations
      const clsEval = (subjectClass.evaluations || []).find(
        (e) => e.studentId === stu.id && e.month === newMonth
      );
      if (clsEval) {
        updated[stu.id] = { level: clsEval.level || 'T', note: clsEval.note || '' };
        return;
      }

      // Check db.monthlyAssessments
      const monthlyAssessment = (db.monthlyAssessments || []).find(
        (m) =>
          m.studentId === stu.id &&
          m.month === newMonth &&
          (m.schoolYearId === db.currentSchoolYearId || m.schoolYearId === 'SY2026_2027')
      );
      const subjRecord = monthlyAssessment?.subjects?.[subjectClass.subject];
      if (subjRecord) {
        updated[stu.id] = { level: subjRecord.level || 'T', note: subjRecord.note || '' };
        return;
      }

      // Default to existing or standard
      updated[stu.id] = monthlyData[stu.id] || {
        level: 'T',
        note: `Em tiếp thu tốt bài học môn ${subjectClass.subject}.`,
      };
    });

    setMonthlyData(updated);
  };

  // Helper to calculate student monthly competition points
  const getStudentMonthlyCompetition = (studentId: string, month: number) => {
    const transactions = (db.transactions || []).filter((t) => {
      if (t.studentId !== studentId) return false;

      // Month match (either normalized monthNumber or parsed from date)
      const txMonth = t.monthNumber || getMonthFromDate(t.date);
      if (txMonth !== month) return false;

      // Subject relevance match:
      const noteLower = (t.note || '').toLowerCase();
      const critLower = (t.criterionName || '').toLowerCase();
      const subjLower = subjectClass.subject.toLowerCase();
      const clsNameLower = subjectClass.name.toLowerCase();

      return (
        noteLower.includes(subjLower) ||
        critLower.includes(subjLower) ||
        noteLower.includes(clsNameLower) ||
        (t.teacherName && t.teacherName.trim().toLowerCase() === (subjectClass.teacherName || '').trim().toLowerCase()) ||
        (t.classId && t.classId === subjectClass.id) ||
        (t.criterionId && t.criterionId.startsWith('SC_'))
      );
    });

    const pos = transactions
      .filter((t) => t.type === 'positive')
      .reduce((sum, t) => sum + t.points, 0);
    const neg = transactions
      .filter((t) => t.type === 'negative')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);
    const total = pos - neg;

    // Overall competition in the school in this month for context
    const allSchoolTx = (db.transactions || []).filter((t) => {
      if (t.studentId !== studentId) return false;
      const txMonth = t.monthNumber || getMonthFromDate(t.date);
      return txMonth === month;
    });
    const schoolPos = allSchoolTx
      .filter((t) => t.type === 'positive')
      .reduce((sum, t) => sum + t.points, 0);
    const schoolNeg = allSchoolTx
      .filter((t) => t.type === 'negative')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);
    const schoolTotal = schoolPos - schoolNeg;

    let rankBadge = 'Đạt chuẩn 🟢';
    let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (total >= 10) {
      rankBadge = 'Xuất sắc ⭐';
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
    } else if (total >= 5) {
      rankBadge = 'Tích cực 🌟';
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (total < 0) {
      rankBadge = 'Cần nhắc nhở ⚠️';
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300';
    }

    return {
      transactions,
      pos,
      neg,
      total,
      schoolTotal,
      rankBadge,
      badgeStyle,
      txCount: transactions.length,
    };
  };

  // Student list aggregated with competition and evaluation
  const studentRows = useMemo(() => {
    return students.map((stu, index) => {
      const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
      const evalItem = monthlyData[stu.id] || { level: 'T', note: '' };
      const comp = getStudentMonthlyCompetition(stu.id, selectedMonth);

      return {
        index: index + 1,
        student: stu,
        homeClassName: homeClass?.name || stu.currentClassId,
        level: evalItem.level,
        note: evalItem.note,
        comp,
      };
    });
  }, [students, db.classes, monthlyData, selectedMonth, db.transactions]);

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    return studentRows
      .filter((row) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = row.student.fullName.toLowerCase().includes(q);
          const matchCode = row.student.studentCode.toLowerCase().includes(q);
          const matchClass = row.homeClassName.toLowerCase().includes(q);
          const matchNote = row.note.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchClass && !matchNote) return false;
        }

        // Level filter
        if (levelFilter !== 'all' && row.level !== levelFilter) {
          return false;
        }

        // Point filter
        if (pointFilter === 'pos' && row.comp.total <= 0) return false;
        if (pointFilter === 'neg' && row.comp.total >= 0) return false;
        if (pointFilter === 'high' && row.comp.total < 5) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortAsc
            ? a.student.fullName.localeCompare(b.student.fullName, 'vi')
            : b.student.fullName.localeCompare(a.student.fullName, 'vi');
        }
        if (sortField === 'points') {
          return sortAsc ? a.comp.total - b.comp.total : b.comp.total - a.comp.total;
        }
        if (sortField === 'level') {
          const order = { T: 3, H: 2, C: 1 };
          return sortAsc
            ? (order[a.level] || 0) - (order[b.level] || 0)
            : (order[b.level] || 0) - (order[a.level] || 0);
        }
        return 0;
      });
  }, [studentRows, searchQuery, levelFilter, pointFilter, sortField, sortAsc]);

  // Overall Statistics for this month
  const stats = useMemo(() => {
    const totalStudents = studentRows.length;
    const countT = studentRows.filter((r) => r.level === 'T').length;
    const countH = studentRows.filter((r) => r.level === 'H').length;
    const countC = studentRows.filter((r) => r.level === 'C').length;

    const pctT = totalStudents > 0 ? Math.round((countT / totalStudents) * 100) : 0;
    const pctH = totalStudents > 0 ? Math.round((countH / totalStudents) * 100) : 0;
    const pctC = totalStudents > 0 ? Math.round((countC / totalStudents) * 100) : 0;

    const totalPosPoints = studentRows.reduce((sum, r) => sum + r.comp.pos, 0);
    const totalNegPoints = studentRows.reduce((sum, r) => sum + r.comp.neg, 0);
    const totalNetPoints = totalPosPoints - totalNegPoints;

    // Top students
    const sortedByPoints = [...studentRows].sort((a, b) => b.comp.total - a.comp.total);
    const topStar = sortedByPoints[0]?.comp.total > 0 ? sortedByPoints[0] : null;

    return {
      totalStudents,
      countT,
      countH,
      countC,
      pctT,
      pctH,
      pctC,
      totalPosPoints,
      totalNegPoints,
      totalNetPoints,
      topStar,
    };
  }, [studentRows]);

  // Save all monthly evaluations & synchronize
  const handleSaveMonthlyAssessments = () => {
    const sem = [9, 10, 11, 12].includes(selectedMonth) ? 'HK1' : 'HK2';
    const nowIso = new Date().toISOString();

    // 1. Update subjectClass.evaluations
    const existingEvals = subjectClass.evaluations || [];
    const otherEvals = existingEvals.filter(
      (e) => !(e.month === selectedMonth && students.some((s) => s.id === e.studentId))
    );

    const newClassEvals = students.map((stu) => {
      const data = monthlyData[stu.id] || { level: 'T', note: '' };
      return {
        studentId: stu.id,
        semester: sem,
        month: selectedMonth,
        level: data.level,
        note: data.note,
        updatedAt: nowIso,
      };
    });

    const updatedSubjectClass: SubjectClass = {
      ...subjectClass,
      evaluations: [...otherEvals, ...newClassEvals],
      updatedAt: nowIso,
    };

    // 2. Synchronize to db.monthlyAssessments (TT27)
    let updatedMonthlyAssessments = [...(db.monthlyAssessments || [])];

    students.forEach((stu) => {
      const data = monthlyData[stu.id] || { level: 'T', note: '' };
      const matchIdx = updatedMonthlyAssessments.findIndex(
        (m) =>
          m.studentId === stu.id &&
          m.month === selectedMonth &&
          (m.schoolYearId === db.currentSchoolYearId || m.schoolYearId === 'SY2026_2027')
      );

      if (matchIdx >= 0) {
        const rec = updatedMonthlyAssessments[matchIdx];
        updatedMonthlyAssessments[matchIdx] = {
          ...rec,
          subjects: {
            ...rec.subjects,
            [subjectClass.subject]: {
              level: data.level,
              note: data.note,
            },
          },
        };
      } else {
        const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
        const newRecord: MonthlyAssessmentTT27 = {
          id: `MA_${stu.id}_${selectedMonth}_${Date.now()}`,
          studentId: stu.id,
          studentName: stu.fullName,
          classId: homeClass?.id || subjectClass.id,
          schoolYearId: db.currentSchoolYearId || 'SY2026_2027',
          month: selectedMonth,
          subjects: {
            [subjectClass.subject]: {
              level: data.level,
              note: data.note,
            },
          },
          qualities: {
            yeuNuoc: 'T',
            nhanAi: 'T',
            chamChi: 'T',
            trungThuc: 'T',
            trachNhiem: 'T',
          },
          competencies: {
            tuChuTuHoc: 'T',
            giaoTiepHopTac: 'T',
            giaiQuyetVanDe: 'T',
          },
          generalComment: `Em học tập chăm chỉ và có tiến bộ môn ${subjectClass.subject}.`,
          praiseNote: `Có ý thức học tập tốt môn ${subjectClass.subject}.`,
          supportMeasure: `Tiếp tục phát huy các thế mạnh đã đạt được.`,
          teacherId: subjectClass.teacherId || 'T001',
          teacherName: customTeacherName,
          updatedAt: nowIso,
        };
        updatedMonthlyAssessments.push(newRecord);
      }
    });

    // 3. Save to database
    const updatedDb: AppDatabase = {
      ...db,
      subjectClasses: (db.subjectClasses || []).map((c) =>
        c.id === subjectClass.id ? updatedSubjectClass : c
      ),
      monthlyAssessments: updatedMonthlyAssessments,
    };

    storage.save(updatedDb, true, {
      category: 'Báo cáo tháng bộ môn',
      action: 'Lưu nhận xét tháng của Giáo viên bộ môn',
      details: `Đã lưu đánh giá & nhận xét Tháng ${selectedMonth} môn ${subjectClass.subject} (${subjectClass.name}) cho ${students.length} học sinh.`,
    });

    triggerToast(
      `Đã lưu & đồng bộ thành công nhận xét Tháng ${selectedMonth} môn ${subjectClass.subject} cho ${students.length} học sinh!`
    );
    if (onRefresh) onRefresh();
  };

  // Batch assign comments
  const handleBatchApplyComment = (levelTarget: 'T' | 'H', commentTemplate: string) => {
    setMonthlyData((prev) => {
      const updated = { ...prev };
      students.forEach((stu) => {
        const cur = updated[stu.id] || { level: 'T', note: '' };
        if (cur.level === levelTarget && (!cur.note || cur.note.trim().length === 0)) {
          updated[stu.id] = {
            ...cur,
            note: commentTemplate,
          };
        }
      });
      return updated;
    });
    triggerToast(`Đã áp dụng nhận xét mẫu cho học sinh đạt mức "${levelTarget}"!`);
  };

  // Quick suggestions for subject
  const availableSuggestions =
    QUICK_COMMENTS_BY_SUBJECT[subjectClass.subject] || QUICK_COMMENTS_BY_SUBJECT.default;

  // 1. PRINT OFFICIAL PDF REPORT
  const handlePrintOfficialPdf = () => {
    const dateStr = new Date();
    const day = dateStr.getDate();
    const month = dateStr.getMonth() + 1;
    const year = dateStr.getFullYear();

    const tableHeaders = [
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
    ];

    const tableRows = studentRows.map((r) => {
      const compTotalStr =
        r.comp.total > 0 ? `+${r.comp.total}` : r.comp.total === 0 ? '0' : `${r.comp.total}`;
      return [
        r.index,
        r.student.studentCode,
        r.student.fullName,
        r.homeClassName,
        r.level,
        `+${r.comp.pos}`,
        `-${r.comp.neg}`,
        compTotalStr,
        r.comp.rankBadge,
        r.note || `Em chăm chỉ, hoàn thành tốt nhiệm vụ học tập môn ${subjectClass.subject}.`,
      ];
    });

    const reportOptions = {
      title: `BÁO CÁO THÁNG MÔN ${subjectClass.subject.toUpperCase()} - THÁNG ${selectedMonth}`,
      subtitle: `Lớp: ${subjectClass.name} • Giáo viên bộ môn: ${customTeacherName}`,
      timeframeLabel: `Tháng ${selectedMonth} (Năm học 2026–2027)`,
      dateRange: `Tháng ${selectedMonth}/2026`,
      className: subjectClass.name,
      tableHeaders,
      tableRows,
      summaryStats: [
        { label: 'Sĩ số học sinh', value: `${stats.totalStudents} em` },
        {
          label: 'Tỷ lệ Mức Đạt',
          value: `T: ${stats.countT} (${stats.pctT}%) • H: ${stats.countH} (${stats.pctH}%) • C: ${stats.countC} (${stats.pctC}%)`,
        },
        {
          label: 'Tổng điểm thi đua môn',
          value: `+${stats.totalPosPoints} / -${stats.totalNegPoints} (Ròng: ${stats.totalNetPoints >= 0 ? '+' : ''}${stats.totalNetPoints}đ)`,
        },
        {
          label: 'Học sinh xuất sắc môn',
          value: stats.topStar
            ? `${stats.topStar.student.fullName} (+${stats.topStar.comp.total}đ)`
            : 'Đạt chuẩn đồng đều',
        },
      ],
      creatorTitle: 'GIÁO VIÊN BỘ MÔN',
      signerName: customTeacherName,
      reviewerTitle: 'TỔ TRƯỞNG CHUYÊN MÔN / BAN GIÁM HIỆU',
      reviewerName: db.settings.principalName || 'Ban Giám Hiệu',
      notes: `Báo cáo tổng hợp được lập từ phân hệ Sổ Theo Dõi Giáo Viên Bộ Môn trường Tiểu học Nam Phước - Phân hiệu 2 Duy Phước 2. Mọi đánh giá định kỳ và điểm thi đua đã được đối chiếu Thông tư 27/2020/TT-BGDĐT.`,
    };

    openPrintReportWindow(reportOptions as any, db.settings, customTeacherName);
  };

  // 2. EXPORT EXCEL (.xlsx)
  const handleExportExcel = () => {
    const exportRows = studentRows.map((r) => {
      const criteriaNotes = r.comp.transactions
        .map((t) => `${t.type === 'positive' ? '+' : '-'}${t.points}đ: ${t.note || t.criterionName}`)
        .join('; ');

      return {
        'STT': r.index,
        'Mã Học Sinh': r.student.studentCode,
        'Họ và Tên': r.student.fullName,
        'Giới Tính': r.student.gender,
        'Lớp Chủ Nhiệm': r.homeClassName,
        'Môn Học': subjectClass.subject,
        'Tháng Báo Cáo': `Tháng ${selectedMonth}`,
        'Mức Đánh Giá (TT27)': r.level,
        'Điểm Cộng Thi Đua (+)': r.comp.pos,
        'Điểm Trừ Thi Đua (-)': r.comp.neg,
        'Tổng Điểm Thi Đua Tháng': r.comp.total,
        'Xếp Loại Thi Đua': r.comp.rankBadge,
        'Lời Nhận Xét Của GV Bộ Môn': r.note,
        'Chi Tiết Tiêu Chí Nhận Trong Tháng': criteriaNotes || 'Chưa có ghi nhận thêm',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = `Thang_${selectedMonth}_${subjectClass.subject.substring(0, 15)}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const cleanSubj = subjectClass.subject.replace(/\s+/g, '_');
    const cleanCls = subjectClass.name.replace(/\s+/g, '_');
    const fileName = `Bao_Cao_Thang_${selectedMonth}_${cleanSubj}_${cleanCls}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    triggerToast(`Đã xuất tệp Excel (.xlsx) báo cáo tháng ${selectedMonth} thành công!`);
  };

  // 3. EXPORT WORD (.doc)
  const handleExportWord = () => {
    const cleanSubj = subjectClass.subject.replace(/\s+/g, '_');
    const cleanCls = subjectClass.name.replace(/\s+/g, '_');
    const fileName = `Bao_Cao_Thang_${selectedMonth}_${cleanSubj}_${cleanCls}.doc`;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Báo Cáo Tháng ${selectedMonth} - ${subjectClass.subject}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; }
          .header-table { width: 100%; margin-bottom: 20px; }
          .header-table td { text-align: center; vertical-align: top; }
          .title { text-align: center; font-size: 16pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; }
          .subtitle { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          table.data-table th, table.data-table td { border: 1px solid #333; padding: 6px 8px; font-size: 11pt; }
          table.data-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
          .center { text-align: center; }
          .right { text-align: right; }
          .footer-table { width: 100%; margin-top: 40px; }
          .footer-table td { text-align: center; vertical-align: top; width: 50%; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 45%;">
              <strong>PHÒNG GD&ĐT DUY XUYÊN</strong><br>
              <strong>TRƯỜNG TH NAM PHƯỚC</strong><br>
              <em>Phân hiệu 2 Duy Phước 2</em>
            </td>
            <td style="width: 55%;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
              <strong>Độc lập - Tự do - Hạnh phúc</strong><br>
              <em>Duy Phước, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</em>
            </td>
          </tr>
        </table>

        <div class="title">BÁO CÁO THÁNG MÔN ${subjectClass.subject.toUpperCase()} - THÁNG ${selectedMonth}</div>
        <div class="subtitle">Lớp: ${subjectClass.name} • Năm học: 2026 - 2027 • Giáo viên bộ môn: ${customTeacherName}</div>

        <p><strong>1. Thống kê tổng hợp:</strong></p>
        <ul>
          <li>Sĩ số học sinh: ${stats.totalStudents} em.</li>
          <li>Xếp loại Môn học: Mức T (Hoàn thành tốt): ${stats.countT} em (${stats.pctT}%), Mức H (Hoàn thành): ${stats.countH} em (${stats.pctH}%), Mức C (Chưa hoàn thành): ${stats.countC} em (${stats.pctC}%).</li>
          <li>Điểm thi đua môn học trong tháng: Tổng điểm thưởng: +${stats.totalPosPoints} đ; Tổng điểm trừ: -${stats.totalNegPoints} đ; Điểm ròng: ${stats.totalNetPoints >= 0 ? '+' : ''}${stats.totalNetPoints} đ.</li>
        </ul>

        <p><strong>2. Bảng chi tiết điểm thi đua và nhận xét học sinh:</strong></p>
        <table class="data-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã HS</th>
              <th>Họ và tên học sinh</th>
              <th>Lớp CN</th>
              <th>Mức ĐG</th>
              <th>Điểm (+)</th>
              <th>Điểm (-)</th>
              <th>Tổng ĐTĐ</th>
              <th>Xếp loại</th>
              <th>Lời nhận xét theo tháng của GV Bộ môn</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows
              .map(
                (r) => `
              <tr>
                <td class="center">${r.index}</td>
                <td class="center">${r.student.studentCode}</td>
                <td><strong>${r.student.fullName}</strong></td>
                <td class="center">${r.homeClassName}</td>
                <td class="center"><strong>${r.level}</strong></td>
                <td class="center" style="color: green;">+${r.comp.pos}</td>
                <td class="center" style="color: red;">-${r.comp.neg}</td>
                <td class="center"><strong>${r.comp.total > 0 ? `+${r.comp.total}` : r.comp.total}</strong></td>
                <td class="center">${r.comp.rankBadge}</td>
                <td>${r.note || `Em tiếp thu tốt bài học môn ${subjectClass.subject}.`}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <table class="footer-table">
          <tr>
            <td>
              <br>
              <strong>GIÁO VIÊN BỘ MÔN</strong><br>
              <em>(Ký và ghi rõ họ tên)</em><br><br><br><br>
              <strong>${customTeacherName}</strong>
            </td>
            <td>
              <em>Duy Phước, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</em><br>
              <strong>TỔ TRƯỞNG CHUYÊN MÔN / BAN GIÁM HIỆU</strong><br>
              <em>(Ký, đóng dấu và ghi rõ họ tên)</em><br><br><br><br>
              <strong>${db.settings.principalName || 'Ban Giám Hiệu'}</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(`Đã xuất tệp Word (.doc) báo cáo tháng ${selectedMonth} thành công!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Báo Cáo Chuyên Môn Theo Tháng</span>
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-xs font-semibold">
                Môn: {subjectClass.subject}
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-xs font-semibold">
                Lớp: {subjectClass.name}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Báo Cáo Tháng {selectedMonth} - Môn {subjectClass.subject}</span>
            </h2>

            {/* Editable Teacher Name */}
            <div className="flex items-center gap-2 text-xs text-purple-200">
              <span>Giáo viên bộ môn lập báo cáo:</span>
              {isEditingTeacherName ? (
                <div className="flex items-center gap-1.5 bg-white/20 p-1 rounded-lg">
                  <input
                    type="text"
                    value={customTeacherName}
                    onChange={(e) => setCustomTeacherName(e.target.value)}
                    className="px-2 py-0.5 text-xs font-bold text-slate-900 bg-white rounded-md outline-hidden w-48"
                    placeholder="Nhập họ tên giáo viên..."
                  />
                  <button
                    onClick={() => setIsEditingTeacherName(false)}
                    className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition"
                    title="Xác nhận tên"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <strong className="text-white underline underline-offset-2 font-bold">
                    {customTeacherName}
                  </strong>
                  <button
                    onClick={() => setIsEditingTeacherName(true)}
                    className="p-1 text-purple-300 hover:text-white rounded-md transition"
                    title="Đổi tên giáo viên bộ môn"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintOfficialPdf}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handleExportWord}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất Word</span>
            </button>

            <button
              onClick={handleSaveMonthlyAssessments}
              className="px-4 py-2.5 bg-white text-indigo-950 hover:bg-slate-100 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-indigo-700" />
              <span>Lưu Nhận Xét Tháng</span>
            </button>
          </div>
        </div>

        {/* MONTH SELECTOR BAR */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-purple-200 mr-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Chọn tháng báo cáo:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10">
            {SCHOOL_MONTHS.map((m) => {
              const isSelected = selectedMonth === m.value;
              const isCurrent = curMonth === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => handleMonthChange(m.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-purple-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Sĩ số */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sĩ số học sinh
            </p>
            <p className="text-xl font-black text-slate-900">{stats.totalStudents} em</p>
            <p className="text-[11px] text-slate-500">Môn {subjectClass.subject}</p>
          </div>
        </div>

        {/* Card 2: Xếp loại T */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Hoàn thành tốt (T)
            </p>
            <p className="text-xl font-black text-emerald-600">
              {stats.countT} <span className="text-xs font-bold text-slate-400">({stats.pctT}%)</span>
            </p>
            <p className="text-[11px] text-slate-500">H: {stats.countH} em • C: {stats.countC} em</p>
          </div>
        </div>

        {/* Card 3: Tổng điểm thi đua môn */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Thi đua môn tháng
            </p>
            <p
              className={`text-xl font-black ${
                stats.totalNetPoints >= 0 ? 'text-purple-700' : 'text-rose-600'
              }`}
            >
              {stats.totalNetPoints >= 0 ? `+${stats.totalNetPoints}` : stats.totalNetPoints} đ
            </p>
            <p className="text-[11px] text-slate-500">
              Cộng: +{stats.totalPosPoints} • Trừ: -{stats.totalNegPoints}
            </p>
          </div>
        </div>

        {/* Card 4: Top thi đua môn */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Gương mặt tiêu biểu
            </p>
            {stats.topStar ? (
              <>
                <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">
                  {stats.topStar.student.fullName}
                </p>
                <p className="text-[11px] font-bold text-amber-600">
                  +{stats.topStar.comp.total} điểm thi đua
                </p>
              </>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic">Phong trào đồng đều</p>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & QUICK BATCH ACTION BAR */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm học sinh theo tên, mã..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-hidden focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="px-2 text-slate-400 font-bold text-[10px] uppercase">Mức:</span>
            {(['all', 'T', 'H', 'C'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  levelFilter === l
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {l === 'all' ? 'Tất cả' : l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="px-2 text-slate-400 font-bold text-[10px] uppercase">Thi đua:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pos', label: 'Có điểm (+)' },
              { id: 'neg', label: 'Có điểm (-)' },
              { id: 'high', label: 'Xuất sắc (≥5đ)' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPointFilter(p.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  pointFilter === p.id
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Batch Assign */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              handleBatchApplyComment(
                'T',
                `Em chăm chỉ, tích cực tham gia các hoạt động học tập môn ${subjectClass.subject}.`
              )
            }
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gán nhận xét nhanh cho mức T</span>
          </button>

          <button
            onClick={() =>
              handleBatchApplyComment(
                'H',
                `Em hoàn thành các bài học và nội dung thực hành môn ${subjectClass.subject}.`
              )
            }
            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Gán nhận xét nhanh cho mức H</span>
          </button>
        </div>
      </div>

      {/* MAIN REPORT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Bảng Tổng Hợp Điểm Thi Đua & Nhận Xét Tháng {selectedMonth}
            </h3>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-extrabold">
              {filteredRows.length} / {studentRows.length} học sinh
            </span>
          </div>
          <div className="text-xs text-slate-500 italic">
            * Giáo viên có thể nhập trực tiếp nhận xét hoặc bấm biểu tượng 💡 để chọn câu gợi ý chuẩn Thông tư 27.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 w-12 text-center">STT</th>
                <th
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else {
                      setSortField('name');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-purple-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Học sinh</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center w-24">Lớp CN</th>
                <th
                  onClick={() => {
                    if (sortField === 'points') setSortAsc(!sortAsc);
                    else {
                      setSortField('points');
                      setSortAsc(false);
                    }
                  }}
                  className="p-3 text-center cursor-pointer hover:text-purple-700 w-44"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Điểm thi đua tháng</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'level') setSortAsc(!sortAsc);
                    else {
                      setSortField('level');
                      setSortAsc(false);
                    }
                  }}
                  className="p-3 text-center cursor-pointer hover:text-purple-700 w-36"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Mức ĐG (TT27)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">Lời nhận xét theo tháng của Giáo viên bộ môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const stu = row.student;
                  const comp = row.comp;

                  return (
                    <tr key={stu.id} className="hover:bg-purple-50/30 transition">
                      {/* STT */}
                      <td className="p-3 text-center text-slate-400 font-bold">{row.index}</td>

                      {/* Student Identity */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <ChibiAvatar
                            name={stu.fullName}
                            gender={stu.gender}
                            size={32}
                            className="shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{stu.fullName}</p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {stu.studentCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Homeroom Class */}
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]">
                          {row.homeClassName}
                        </span>
                      </td>

                      {/* Competition Points in Month */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                comp.total > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : comp.total < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {comp.total > 0 ? `+${comp.total}` : comp.total} đ
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${comp.badgeStyle}`}
                            >
                              {comp.rankBadge}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="text-emerald-600 font-bold">+{comp.pos}</span>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">-{comp.neg}</span>
                            {comp.txCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedStudentTxDetail(stu)}
                                className="text-indigo-600 hover:underline font-bold ml-1"
                                title="Xem chi tiết các giao dịch trong tháng"
                              >
                                ({comp.txCount} lần)
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Level T / H / C Selector */}
                      <td className="p-3 text-center">
                        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                          {(['T', 'H', 'C'] as const).map((lvl) => {
                            const isSelected = row.level === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => {
                                  setMonthlyData((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...(prev[stu.id] || { note: '' }),
                                      level: lvl,
                                    },
                                  }));
                                }}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                                  isSelected
                                    ? lvl === 'T'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : lvl === 'H'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title={
                                  lvl === 'T'
                                    ? 'Hoàn thành tốt'
                                    : lvl === 'H'
                                    ? 'Hoàn thành'
                                    : 'Chưa hoàn thành'
                                }
                              >
                                {lvl}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Monthly Comment Input with Quick Suggestion */}
                      <td className="p-3">
                        <div className="relative flex items-center gap-2">
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMonthlyData((prev) => ({
                                ...prev,
                                [stu.id]: {
                                  ...(prev[stu.id] || { level: 'T' }),
                                  note: val,
                                },
                              }));
                            }}
                            placeholder={`Nhập nhận xét tháng ${selectedMonth} cho em...`}
                            className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-800"
                          />

                          {/* Quick Suggestion Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSuggestionStudentId(
                                activeSuggestionStudentId === stu.id ? null : stu.id
                              )
                            }
                            className={`p-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                              activeSuggestionStudentId === stu.id
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-50 text-slate-500 hover:text-amber-600 border-slate-200'
                            }`}
                            title="Gợi ý câu nhận xét chuẩn Thông tư 27"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </button>

                          {/* Quick Suggestion Dropdown */}
                          {activeSuggestionStudentId === stu.id && (
                            <div className="absolute right-0 top-10 z-40 w-80 bg-white p-3 rounded-2xl shadow-xl border border-slate-200 space-y-2 animate-in fade-in zoom-in-95">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Gợi ý câu nhận xét môn {subjectClass.subject}</span>
                                </span>
                                <button
                                  onClick={() => setActiveSuggestionStudentId(null)}
                                  className="text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {availableSuggestions.map((sug, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => {
                                      setMonthlyData((prev) => ({
                                        ...prev,
                                        [stu.id]: {
                                          ...(prev[stu.id] || { level: 'T' }),
                                          note: sug,
                                        },
                                      }));
                                      setActiveSuggestionStudentId(null);
                                    }}
                                    className="w-full text-left p-2 rounded-xl text-[11px] text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition leading-snug cursor-pointer border border-transparent hover:border-purple-200"
                                  >
                                    • {sug}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer save banner */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Dữ liệu nhận xét được đồng bộ vào cả <strong>Sổ Lớp Bộ Môn</strong> và{' '}
              <strong>Hồ Sơ Đánh Giá Định Kỳ Thông Tư 27</strong> của trường.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveMonthlyAssessments}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Toàn Bộ Nhận Xét Tháng {selectedMonth}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL: GIAO DỊCH THI ĐUA TRONG THÁNG */}
      {selectedStudentTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ChibiAvatar
                  name={selectedStudentTxDetail.fullName}
                  gender={selectedStudentTxDetail.gender}
                  size={36}
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedStudentTxDetail.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lịch sử điểm thi đua Tháng {selectedMonth} • Môn {subjectClass.subject}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentTxDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {getStudentMonthlyCompetition(selectedStudentTxDetail.id, selectedMonth).transactions
                .length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400 italic">
                  Chưa có ghi nhận cộng hoặc trừ điểm nào trong tháng {selectedMonth}.
                </p>
              ) : (
                getStudentMonthlyCompetition(
                  selectedStudentTxDetail.id,
                  selectedMonth
                ).transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      tx.type === 'positive'
                        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
                        : 'bg-rose-50/60 border-rose-100 text-rose-900'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">
                        {tx.criterionName || (tx.type === 'positive' ? 'Khen thưởng' : 'Nhắc nhở')}
                      </p>
                      {tx.note && <p className="text-[11px] text-slate-600 mt-0.5">{tx.note}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Ngày: {tx.date} • Tuần: {tx.weekNumber || '1'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        tx.type === 'positive'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {tx.type === 'positive' ? `+${tx.points}` : `-${Math.abs(tx.points)}`} đ
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudentTxDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
