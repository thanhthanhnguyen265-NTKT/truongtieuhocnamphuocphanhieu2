import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Trophy,
  PlusCircle,
  MinusCircle,
  Medal,
  Calendar,
  Sparkles,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Printer,
  ChevronUp,
  ChevronDown,
  Trash2,
  Clock,
  ArrowUpDown,
  History,
  Info,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
  CloudCheck,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  storage,
  getSchoolWeekFromDate,
  getMonthFromDate,
  getDateRangeOfWeek,
} from '../services/storage';
import {
  AppDatabase,
  CompetitionCriterion,
  CompetitionTransaction,
  Student,
} from '../types';
import { generateOfficialReportHtml } from '../services/pdfExport';

interface CompetitionViewProps {
  initialClassId?: string;
  onOpenOwnerModal: (action: string) => void;
}

type TimeframeType = 'day' | 'week' | 'month' | 'all';

export const CompetitionView: React.FC<CompetitionViewProps> = ({
  initialClassId,
  onOpenOwnerModal,
}) => {
  // 1. Reactive state subscribing to storage so changes never get lost
  const [db, setDb] = useState<AppDatabase>(() => storage.getDb());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return unsub;
  }, []);

  const getTodayStr = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const todayStr = getTodayStr();
  const currentWeek = getSchoolWeekFromDate(todayStr);
  const currentMonth = getMonthFromDate(todayStr);

  // Class selection
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || db.classes[0]?.id || 'C4A'
  );

  // Active View Tab
  const [viewTab, setViewTab] = useState<
    'scoring' | 'studentRanking' | 'classRanking' | 'history' | 'criteria'
  >('scoring');

  // Timeframe filter state (for Rankings and History)
  const [timeframeType, setTimeframeType] = useState<TimeframeType>('week');
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterWeek, setFilterWeek] = useState<number>(currentWeek);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);

  // Scoring Form State
  const [scoringDate, setScoringDate] = useState<string>(todayStr);
  const [scoringWeek, setScoringWeek] = useState<number>(currentWeek);
  const [scoringMonth, setScoringMonth] = useState<number>(currentMonth);
  const [scoringMode, setScoringMode] = useState<'preset' | 'custom'>('preset');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>(
    db.criteria[0]?.id || 'CR01'
  );
  const [customPoints, setCustomPoints] = useState<number>(2);
  const [customType, setCustomType] = useState<'positive' | 'negative'>('positive');
  const [customName, setCustomName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [scoringSuccess, setScoringSuccess] = useState<string>('');
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false);

  // History tab search and filter
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('all');
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Migration of competition points to Week 1 from 07/09/2026
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [isMigrating, setIsMigrating] = useState<boolean>(false);

  // Tự động kiểm tra và chuẩn hóa tuần học cho toàn bộ điểm thi đua khi mở tab
  useEffect(() => {
    storage.migrateCompetitionTransactionsWeek().then((res) => {
      if (res.updated > 0) {
        setMigrationStatus(`Đã tự động cập nhật lại tuần học cho ${res.updated} điểm thi đua đã nhập trước đây (Tuần 1 từ 07/09/2026).`);
        setTimeout(() => setMigrationStatus(''), 7000);
      }
    });
  }, []);

  const handleManualMigrate = async () => {
    setIsMigrating(true);
    try {
      const res = await storage.migrateCompetitionTransactionsWeek();
      setMigrationStatus(`Đã rà soát & cập nhật thành công ${res.total} điểm thi đua theo chuẩn Tuần 1 bắt đầu từ 07/09/2026.`);
      setTimeout(() => setMigrationStatus(''), 7000);
    } catch (e) {
      setMigrationStatus('Có lỗi khi cập nhật.');
    } finally {
      setIsMigrating(false);
    }
  };

  // Expand student details modal in ranking
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Automatically adjust week & month when scoring date changes
  const handleScoringDateChange = (newDate: string) => {
    setScoringDate(newDate);
    if (newDate) {
      setScoringWeek(getSchoolWeekFromDate(newDate));
      setScoringMonth(getMonthFromDate(newDate));
    }
  };

  // RBAC checks
  const canScore = storage.canScoreCompetition(selectedClassId);
  const isAllowedToEdit = canScore.allowed;

  const currentClass = db.classes.find((c) => c.id === selectedClassId);
  const currentSchoolYear = db.schoolYears.find((y) => y.id === db.currentSchoolYearId);
  const students = db.students.filter(
    (s) => s.currentClassId === selectedClassId && s.currentSchoolYearId === db.currentSchoolYearId
  );
  const selectedCriterion = db.criteria.find((c) => c.id === selectedCriterionId);

  // Filter transactions according to selected timeframe
  const filteredTransactions = useMemo(() => {
    return (db.transactions || []).filter((tx) => {
      if (tx.schoolYearId && db.currentSchoolYearId && tx.schoolYearId !== db.currentSchoolYearId) {
        return false;
      }

      if (timeframeType === 'all') return true;

      if (timeframeType === 'day') {
        return tx.date === filterDate;
      }

      if (timeframeType === 'week') {
        const w = tx.weekNumber || getSchoolWeekFromDate(tx.date);
        return w === filterWeek;
      }

      if (timeframeType === 'month') {
        const m = tx.monthNumber || getMonthFromDate(tx.date);
        return m === filterMonth;
      }

      return true;
    });
  }, [db.transactions, db.currentSchoolYearId, timeframeType, filterDate, filterWeek, filterMonth]);

  // Toggle student selection
  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const selectAllStudents = () => {
    const visibleStudents = students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(studentSearch.toLowerCase())
    );
    if (selectedStudentIds.length === visibleStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(visibleStudents.map((s) => s.id));
    }
  };

  // Handle saving score
  const handleApplyScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      if (canScore.reason) {
        alert(canScore.reason);
      } else {
        onOpenOwnerModal('Cộng/Trừ điểm thi đua');
      }
      return;
    }

    if (selectedStudentIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 học sinh để ghi điểm thi đua.');
      return;
    }

    let critName = '';
    let critType: 'positive' | 'negative' = 'positive';
    let critPoints = 0;
    let critId: string | undefined = undefined;

    if (scoringMode === 'preset') {
      if (!selectedCriterion) {
        alert('Vui lòng chọn tiêu chí thi đua.');
        return;
      }
      critName = selectedCriterion.name;
      critType = selectedCriterion.type;
      critPoints = selectedCriterion.points;
      critId = selectedCriterion.id;
    } else {
      if (!customName.trim()) {
        alert('Vui lòng nhập tên hành vi hoặc thành tích thi đua.');
        return;
      }
      critName = customName.trim();
      critType = customType;
      critPoints = customType === 'positive' ? Math.abs(customPoints) : -Math.abs(customPoints);
      critId = 'CR_CUSTOM';
    }

    setIsSavingScore(true);

    const teacher = db.currentUser || db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);

    const newTransactions: CompetitionTransaction[] = selectedStudentIds.map((sid) => {
      const student = db.students.find((s) => s.id === sid);
      return {
        id: `TX_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        studentId: sid,
        studentName: student?.fullName || '',
        classId: selectedClassId,
        schoolYearId: db.currentSchoolYearId || 'SY2026_2027',
        criterionId: critId,
        criterionName: critName,
        type: critType,
        points: critPoints,
        date: scoringDate,
        weekNumber: scoringWeek,
        monthNumber: scoringMonth,
        note: note.trim() || undefined,
        teacherId: teacher?.id || 'T002',
        teacherName: teacher?.fullName || 'Giáo viên',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    try {
      await storage.addCompetitionTransactions(
        newTransactions,
        `Áp dụng "${critName}" (${critPoints > 0 ? '+' : ''}${critPoints}đ) cho ${
          selectedStudentIds.length
        } học sinh lớp ${currentClass?.name}. Ngày: ${scoringDate} (Tuần ${scoringWeek}, Tháng ${scoringMonth})`
      );

      setScoringSuccess(
        `Đã lưu thành công điểm thi đua cho ${selectedStudentIds.length} học sinh vào hệ thống!`
      );
      setSelectedStudentIds([]);
      setNote('');
      if (scoringMode === 'custom') {
        setCustomName('');
      }
      setTimeout(() => setScoringSuccess(''), 4000);
    } catch (err) {
      console.error('Lỗi khi lưu điểm thi đua:', err);
      alert('Đã xảy ra lỗi khi lưu điểm thi đua. Vui lòng thử lại!');
    } finally {
      setIsSavingScore(false);
    }
  };

  // Delete transaction handler
  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lượt ghi nhận điểm thi đua này không?')) {
      return;
    }
    setDeletingTxId(txId);
    try {
      await storage.deleteCompetitionTransaction(txId);
    } catch (e) {
      console.error('Lỗi khi xóa điểm thi đua:', e);
      alert('Không thể xóa điểm thi đua. Vui lòng thử lại.');
    } finally {
      setDeletingTxId(null);
    }
  };

  // Calculate Student Rankings for current class in selected timeframe
  const studentRankings = useMemo(() => {
    return students
      .map((stu) => {
        const stuTx = filteredTransactions.filter((t) => t.studentId === stu.id);
        const pos = stuTx
          .filter((t) => t.type === 'positive')
          .reduce((sum, t) => sum + Math.abs(t.points), 0);
        const neg = stuTx
          .filter((t) => t.type === 'negative')
          .reduce((sum, t) => sum + Math.abs(t.points), 0);
        const total = pos - neg;
        return {
          student: stu,
          pos,
          neg,
          total,
          txCount: stuTx.length,
          transactions: stuTx,
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.pos !== a.pos) return b.pos - a.pos;
        return a.neg - b.neg;
      });
  }, [students, filteredTransactions]);

  // Calculate Class Rankings across whole school in selected timeframe
  const classRankings = useMemo(() => {
    return db.classes
      .filter((c) => c.schoolYearId === db.currentSchoolYearId)
      .map((c) => {
        const classTx = filteredTransactions.filter((t) => t.classId === c.id);
        const pos = classTx
          .filter((t) => t.type === 'positive')
          .reduce((sum, t) => sum + Math.abs(t.points), 0);
        const neg = classTx
          .filter((t) => t.type === 'negative')
          .reduce((sum, t) => sum + Math.abs(t.points), 0);
        const total = pos - neg;
        const classStudents = db.students.filter(
          (s) => s.currentClassId === c.id && s.currentSchoolYearId === db.currentSchoolYearId
        );
        const teacher = db.teachers.find((t) => t.id === c.homeroomTeacherId);
        const avgPerStudent = classStudents.length > 0 ? total / classStudents.length : 0;

        return {
          classRoom: c,
          total,
          pos,
          neg,
          studentCount: classStudents.length,
          avgPerStudent,
          teacherName: teacher?.fullName || c.customTeacherName || 'Chưa phân công',
          txCount: classTx.length,
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return b.avgPerStudent - a.avgPerStudent;
      });
  }, [db.classes, db.students, db.teachers, db.currentSchoolYearId, filteredTransactions]);

  // Formatted timeframe label
  const getTimeframeLabel = () => {
    if (timeframeType === 'day') {
      const parts = filterDate.split('-');
      const d = parts[2] || '';
      const m = parts[1] || '';
      const y = parts[0] || '';
      return `Ngày ${d}/${m}/${y}`;
    }
    if (timeframeType === 'week') {
      const range = getDateRangeOfWeek(filterWeek);
      return `Tuần ${filterWeek} (${range.label})`;
    }
    if (timeframeType === 'month') {
      return `Tháng ${filterMonth}/${filterMonth >= 9 ? '2026' : '2027'}`;
    }
    return `Toàn năm học ${currentSchoolYear?.name || '2026–2027'}`;
  };

  // Export Ranking PDF with official school header and signatures
  const handlePrintRanking = () => {
    const periodLabel = getTimeframeLabel();

    const tableRows = studentRankings.map((item, idx) => [
      (idx + 1).toString(),
      item.student.studentCode,
      item.student.fullName,
      item.student.gender,
      `+${item.pos}`,
      `-${item.neg}`,
      `${item.total > 0 ? '+' : ''}${item.total} đ`,
      item.txCount.toString(),
      idx === 0
        ? '⭐ Hoa Điểm Mười'
        : idx === 1
        ? '🌟 Kiện Tướng Chăm Ngoan'
        : idx === 2
        ? '🥉 Sao Thi Đua Tích Cực'
        : 'Đạt chuẩn thi đua',
    ]);

    generateOfficialReportHtml({
      title: `BẢNG XẾP HẠNG THI ĐUA RÈN LUYỆN - LỚP ${currentClass?.name || ''}`,
      subtitle: `Năm học: ${currentSchoolYear?.name} • Trường TH Nam Phước • Phân hiệu 2 Duy Phước 2`,
      dateRange: `Kỳ thi đua: ${periodLabel}`,
      headers: [
        'Hạng',
        'Mã HS',
        'Họ và tên',
        'Giới tính',
        'Điểm cộng',
        'Điểm trừ',
        'Tổng điểm',
        'Số lượt',
        'Danh hiệu trao tặng',
      ],
      rows: tableRows,
      summaryStats: [
        { label: 'Kỳ tổng kết', value: periodLabel },
        { label: 'Lớp xếp hạng', value: `Lớp ${currentClass?.name || ''}` },
        { label: 'Tổng sĩ số', value: `${students.length} học sinh` },
        { label: 'Học sinh dẫn đầu', value: studentRankings[0]?.student.fullName || '-' },
        {
          label: 'Điểm cao nhất',
          value: `${studentRankings[0]?.total > 0 ? '+' : ''}${studentRankings[0]?.total || 0} đ`,
        },
      ],
      signerTitle: 'TỔNG PHỤ TRÁCH ĐỘI',
      signerName: db.settings?.ownerName || 'Thanh Nguyễn',
    });
  };

  // Quick recent scoring transactions in this class
  const recentClassTransactions = useMemo(() => {
    return (db.transactions || [])
      .filter((t) => t.classId === selectedClassId)
      .slice(0, 10);
  }, [db.transactions, selectedClassId]);

  // Filtered transactions for the History tab
  const historyList = useMemo(() => {
    return (db.transactions || []).filter((tx) => {
      if (historyClassFilter !== 'all' && tx.classId !== historyClassFilter) {
        return false;
      }
      if (timeframeType === 'day' && tx.date !== filterDate) return false;
      if (timeframeType === 'week') {
        const w = tx.weekNumber || getSchoolWeekFromDate(tx.date);
        if (w !== filterWeek) return false;
      }
      if (timeframeType === 'month') {
        const m = tx.monthNumber || getMonthFromDate(tx.date);
        if (m !== filterMonth) return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const stu = db.students.find((s) => s.id === tx.studentId);
        const matchStu = stu?.fullName.toLowerCase().includes(q) || stu?.studentCode.toLowerCase().includes(q);
        const matchCrit = tx.criterionName.toLowerCase().includes(q);
        const matchNote = tx.note?.toLowerCase().includes(q);
        return matchStu || matchCrit || matchNote;
      }
      return true;
    });
  }, [db.transactions, db.students, historyClassFilter, timeframeType, filterDate, filterWeek, filterMonth, historySearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5" />
            <span>Hệ thống Quản lý Thi đua & Khen thưởng Nề nếp</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Lưu trữ vĩnh viễn trên Đám mây
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Điểm thi đua & Bảng vàng Rèn luyện Học sinh
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cộng / Trừ điểm theo Ngày, theo Tuần, theo Tháng • Xếp hạng thi đua tự động không bao giờ mất điểm khi mở lại.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>Tuần 1: từ 07/09/2026</span>
          </div>

          <button
            type="button"
            onClick={handleManualMigrate}
            disabled={isMigrating}
            className="px-3 py-2 bg-slate-100 hover:bg-purple-100 text-purple-900 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Đồng bộ và tính lại tuần/tháng học cho các điểm đã nhập"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
            {isMigrating ? 'Đang cập nhật...' : 'Cập nhật lại tuần'}
          </button>

          <button
            type="button"
            onClick={handlePrintRanking}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Xuất Báo cáo Thi đua & Chữ ký
          </button>
        </div>
      </div>

      {/* Migration Status Alert */}
      {migrationStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{migrationStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setMigrationStatus('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap bg-white rounded-xl p-1.5 border border-slate-200 shadow-xs gap-1">
        <button
          type="button"
          onClick={() => setViewTab('scoring')}
          className={`flex-1 min-w-[140px] py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'scoring'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Chấm điểm thi đua (Cộng/Trừ)
        </button>

        <button
          type="button"
          onClick={() => setViewTab('studentRanking')}
          className={`flex-1 min-w-[150px] py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'studentRanking'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Bảng xếp hạng Học sinh Lớp {currentClass?.name}
        </button>

        <button
          type="button"
          onClick={() => setViewTab('classRanking')}
          className={`flex-1 min-w-[150px] py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'classRanking'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Medal className="w-4 h-4" />
          Bảng xếp hạng Toàn trường (Liên đội)
        </button>

        <button
          type="button"
          onClick={() => setViewTab('history')}
          className={`flex-1 min-w-[130px] py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'history'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Lịch sử đã lưu ({db.transactions?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setViewTab('criteria')}
          className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'criteria'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Tiêu chí ({db.criteria?.length || 0})
        </button>
      </div>

      {/* TIMEFRAME BAR (Shown in studentRanking, classRanking, and history tabs) */}
      {viewTab !== 'criteria' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">
                Xem bảng xếp hạng & điểm thi đua theo:
              </span>
            </div>

            {/* Timeframe selector segmented pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setTimeframeType('day')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  timeframeType === 'day'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Theo Ngày
              </button>

              <button
                type="button"
                onClick={() => setTimeframeType('week')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  timeframeType === 'week'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Theo Tuần
              </button>

              <button
                type="button"
                onClick={() => setTimeframeType('month')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  timeframeType === 'month'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Theo Tháng
              </button>

              <button
                type="button"
                onClick={() => setTimeframeType('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  timeframeType === 'all'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Cả năm học
              </button>
            </div>
          </div>

          {/* Sub-controls based on chosen timeframe */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            {timeframeType === 'day' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-medium">Chọn ngày cụ thể:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setFilterDate(todayStr)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                    filterDate === todayStr
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yest = new Date();
                    yest.setDate(yest.getDate() - 1);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    setFilterDate(`${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Hôm qua
                </button>
                <span className="text-purple-700 font-bold ml-2">
                  Đang xem: {getTimeframeLabel()}
                </span>
              </div>
            )}

            {timeframeType === 'week' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-medium">Chọn tuần học:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={filterWeek <= 1}
                    onClick={() => setFilterWeek((prev) => Math.max(1, prev - 1))}
                    className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
                    title="Tuần trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <select
                    value={filterWeek}
                    onChange={(e) => setFilterWeek(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                  >
                    {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                      const range = getDateRangeOfWeek(w);
                      return (
                        <option key={w} value={w}>
                          Tuần {w} ({range.label})
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    disabled={filterWeek >= 35}
                    onClick={() => setFilterWeek((prev) => Math.min(35, prev + 1))}
                    className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
                    title="Tuần kế tiếp"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFilterWeek(currentWeek)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                    filterWeek === currentWeek
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tuần hiện tại (Tuần {currentWeek})
                </button>

                <span className="text-purple-700 font-bold ml-2">
                  Đang xem: {getTimeframeLabel()}
                </span>
              </div>
            )}

            {timeframeType === 'month' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1">Chọn tháng học:</span>
                {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFilterMonth(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      filterMonth === m
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Tháng {m}
                  </button>
                ))}
              </div>
            )}

            {timeframeType === 'all' && (
              <div className="text-purple-700 font-bold flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <span>Tổng hợp điểm thi đua lũy kế toàn bộ năm học {currentSchoolYear?.name}</span>
              </div>
            )}

            {/* Quick stats counter */}
            <div className="text-slate-500 text-[11px] font-medium ml-auto">
              Tìm thấy <strong className="text-slate-800">{filteredTransactions.length}</strong> lượt cộng/trừ điểm trong kỳ này.
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 1: SCORING (CỘNG / TRỪ ĐIỂM THI ĐUA) */}
      {viewTab === 'scoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Class & Student picker */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Lớp học:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50"
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  {selectedStudentIds.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn cả lớp'}
                </button>
                <span className="text-xs text-slate-500">
                  Đã chọn: <strong className="text-purple-700 font-bold">{selectedStudentIds.length}</strong> / {students.length} em
                </span>
              </div>
            </div>

            {/* Student Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm nhanh học sinh theo tên hoặc mã HS..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Students Grid Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {students
                .filter(
                  (s) =>
                    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.studentCode.toLowerCase().includes(studentSearch.toLowerCase())
                )
                .map((stu) => {
                  const isSelected = selectedStudentIds.includes(stu.id);
                  // Student score in this class
                  const stuTx = (db.transactions || []).filter((t) => t.studentId === stu.id);
                  const score = stuTx.reduce(
                    (sum, t) => sum + (t.type === 'positive' ? Math.abs(t.points) : -Math.abs(t.points)),
                    0
                  );

                  return (
                    <div
                      key={stu.id}
                      onClick={() => toggleStudentSelection(stu.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between select-none ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-xs ring-1 ring-purple-500'
                          : 'border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div className="truncate">
                          <div className="font-bold text-slate-800 truncate">{stu.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{stu.studentCode}</div>
                        </div>
                      </div>
                      <span
                        className={`font-black text-[11px] shrink-0 ml-1 ${
                          score >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {score > 0 ? `+${score}` : score} đ
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Recent scoring transactions of this class */}
            {recentClassTransactions.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    Các lượt chấm điểm gần đây của Lớp {currentClass?.name}:
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewTab('history')}
                    className="text-purple-600 hover:underline font-semibold"
                  >
                    Xem tất cả ({db.transactions?.length || 0})
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {recentClassTransactions.map((tx) => {
                    const student = db.students.find((s) => s.id === tx.studentId);
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] ${
                              tx.type === 'positive'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.points > 0 ? `+${tx.points}` : tx.points} đ
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {student?.fullName || tx.studentName || 'Học sinh'}
                          </span>
                          <span className="text-slate-500 text-[11px] truncate">
                            - {tx.criterionName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tx.date} (Tuần {tx.weekNumber || getSchoolWeekFromDate(tx.date)})
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransaction(tx.id);
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Xóa lượt chấm này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right 1 Col: Apply Criteria & Points Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Ghi nhận Điểm thi đua
            </h3>

            {scoringSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scoringSuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplyScore} className="space-y-4 text-xs">
              {/* 1. Date, Week, Month picker */}
              <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-2.5">
                <label className="block font-bold text-purple-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  Thời gian ghi nhận điểm (Theo ngày, tuần, tháng):
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Ngày chấm điểm:</label>
                    <input
                      type="date"
                      value={scoringDate}
                      onChange={(e) => handleScoringDateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Tuần học:</label>
                    <select
                      value={scoringWeek}
                      onChange={(e) => setScoringWeek(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                    >
                      {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w}>
                          Tuần {w} ({getDateRangeOfWeek(w).label})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Thuộc tháng học:</label>
                  <select
                    value={scoringMonth}
                    onChange={(e) => setScoringMonth(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                  >
                    {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                      <option key={m} value={m}>
                        Tháng {m} (Năm học {currentSchoolYear?.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Mode Selector: Preset vs Custom */}
              <div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg mb-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setScoringMode('preset')}
                    className={`flex-1 py-1 rounded-md transition ${
                      scoringMode === 'preset'
                        ? 'bg-white text-purple-700 shadow-xs font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    Tiêu chí có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringMode('custom')}
                    className={`flex-1 py-1 rounded-md transition ${
                      scoringMode === 'custom'
                        ? 'bg-white text-purple-700 shadow-xs font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    Nhập điểm tùy chỉnh
                  </button>
                </div>

                {scoringMode === 'preset' ? (
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700">Chọn tiêu chí thi đua</label>
                    <select
                      value={selectedCriterionId}
                      onChange={(e) => setSelectedCriterionId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                    >
                      <optgroup label="🌟 Cộng điểm thưởng (+)">
                        {db.criteria
                          .filter((c) => c.type === 'positive')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              [+{c.points}đ] {c.name} ({c.category})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="⚠️ Trừ điểm nhắc nhở (-)">
                        {db.criteria
                          .filter((c) => c.type === 'negative')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              [-{Math.abs(c.points)}đ] {c.name} ({c.category})
                            </option>
                          ))}
                      </optgroup>
                    </select>

                    {selectedCriterion && (
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          selectedCriterion.type === 'positive'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{selectedCriterion.name}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            Phân loại: {selectedCriterion.category}
                          </div>
                        </div>
                        <div className="text-lg font-black">
                          {selectedCriterion.type === 'positive'
                            ? `+${selectedCriterion.points}`
                            : `-${Math.abs(selectedCriterion.points)}`}{' '}
                          đ
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Loại điểm:
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomType('positive')}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 ${
                            customType === 'positive'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-emerald-700 border-slate-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Cộng điểm (+)
                        </button>

                        <button
                          type="button"
                          onClick={() => setCustomType('negative')}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 ${
                            customType === 'negative'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-rose-700 border-slate-300'
                          }`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                          Trừ điểm (-)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Tên hành vi / Thành tích:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Giúp đỡ bạn cùng lớp, Điểm 10 môn Toán..."
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Số điểm {customType === 'positive' ? 'cộng' : 'trừ'}:
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 5, 10].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setCustomPoints(pt)}
                            className={`px-3 py-1 rounded-lg font-bold border text-xs ${
                              customPoints === pt
                                ? customType === 'positive'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {customType === 'positive' ? `+${pt}` : `-${pt}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú cụ thể (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Tiết học Toán sáng thứ 2, phát biểu sôi nổi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={selectedStudentIds.length === 0 || isSavingScore}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs"
              >
                {isSavingScore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang lưu trữ dữ liệu...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Lưu điểm thi đua cho {selectedStudentIds.length} học sinh
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: STUDENT RANKING (BẢNG XẾP HẠNG HỌC SINH) */}
      {viewTab === 'studentRanking' && (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {studentRankings.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 items-end text-center">
              {/* Silver (2nd) */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-sm flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xl mb-2">
                  🥈
                </div>
                <div className="text-xs font-bold text-slate-800 truncate w-full">
                  {studentRankings[1].student.fullName}
                </div>
                <div className="text-xs font-black text-purple-700 mt-1">
                  {studentRankings[1].total > 0 ? `+${studentRankings[1].total}` : studentRankings[1].total} đ
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">Hạng Nhì (Bạc)</div>
              </div>

              {/* Gold (1st) */}
              <div className="bg-gradient-to-b from-amber-50 to-white p-5 rounded-2xl border-2 border-amber-400 shadow-md flex flex-col items-center -translate-y-2">
                <div className="w-14 h-14 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl mb-2 shadow-sm">
                  👑
                </div>
                <div className="text-sm font-bold text-amber-950 truncate w-full">
                  {studentRankings[0].student.fullName}
                </div>
                <div className="text-sm font-black text-amber-600 mt-1">
                  {studentRankings[0].total > 0 ? `+${studentRankings[0].total}` : studentRankings[0].total} đ
                </div>
                <div className="text-xs font-bold text-amber-800">Quán Quân Thi Đua</div>
              </div>

              {/* Bronze (3rd) */}
              <div className="bg-white p-4 rounded-2xl border-2 border-amber-600/30 shadow-sm flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xl mb-2">
                  🥉
                </div>
                <div className="text-xs font-bold text-slate-800 truncate w-full">
                  {studentRankings[2].student.fullName}
                </div>
                <div className="text-xs font-black text-purple-700 mt-1">
                  {studentRankings[2].total > 0 ? `+${studentRankings[2].total}` : studentRankings[2].total} đ
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">Hạng Ba (Đồng)</div>
              </div>
            </div>
          )}

          {/* Full ranking table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800">
                  Bảng vàng thi đua Lớp {currentClass?.name} ({studentRankings.length} học sinh)
                </span>
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-full border border-purple-200">
                  {getTimeframeLabel()}
                </span>
              </div>

              {/* Class switcher for ranking */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Đổi lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50"
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-14">Hạng</th>
                    <th className="p-3">Mã HS</th>
                    <th className="p-3">Họ và Tên</th>
                    <th className="p-3 text-center">Giới tính</th>
                    <th className="p-3 text-center">Điểm cộng (+)</th>
                    <th className="p-3 text-center">Điểm trừ (-)</th>
                    <th className="p-3 text-center">Tổng điểm</th>
                    <th className="p-3 text-center">Số lượt</th>
                    <th className="p-3">Danh hiệu khen tặng</th>
                    <th className="p-3 text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentRankings.map((item, idx) => (
                    <React.Fragment key={item.student.id}>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center">
                          {idx === 0 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black inline-flex items-center justify-center text-xs shadow-xs">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black inline-flex items-center justify-center text-xs">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-black inline-flex items-center justify-center text-xs">
                              3
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500 font-bold">{idx + 1}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">{item.student.studentCode}</td>
                        <td className="p-3 font-bold text-slate-800">{item.student.fullName}</td>
                        <td className="p-3 text-center text-slate-600">{item.student.gender}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">
                          {item.pos > 0 ? `+${item.pos}` : 0}
                        </td>
                        <td className="p-3 text-center font-bold text-rose-600">
                          {item.neg > 0 ? `-${item.neg}` : 0}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-black border ${
                              item.total > 0
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : item.total === 0
                                ? 'bg-slate-50 text-slate-600 border-slate-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {item.total > 0 ? `+${item.total}` : item.total} đ
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-500 font-bold">
                          {item.txCount} lượt
                        </td>
                        <td className="p-3">
                          {idx === 0 ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                              ⭐ Hoa Điểm Mười
                            </span>
                          ) : idx === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-300">
                              🌟 Kiện Tướng Chăm Ngoan
                            </span>
                          ) : idx === 2 ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                              🥉 Sao Thi Đua Tích Cực
                            </span>
                          ) : item.total > 0 ? (
                            <span className="text-emerald-700 text-[11px] font-semibold">Tích cực rèn luyện</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Đạt chuẩn thi đua</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedStudentId(
                                expandedStudentId === item.student.id ? null : item.student.id
                              )
                            }
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="Xem chi tiết các lượt điểm"
                          >
                            {expandedStudentId === item.student.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable details for student */}
                      {expandedStudentId === item.student.id && (
                        <tr>
                          <td colSpan={10} className="bg-purple-50/40 p-4 border-y border-purple-100">
                            <div className="space-y-2">
                              <div className="font-bold text-xs text-purple-900 flex items-center justify-between">
                                <span>Chi tiết các lượt ghi nhận điểm của em {item.student.fullName} trong kỳ ({getTimeframeLabel()}):</span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Tổng số: {item.transactions.length} lượt
                                </span>
                              </div>

                              {item.transactions.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Chưa có lượt ghi nhận điểm nào trong kỳ này.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {item.transactions.map((tx) => (
                                    <div
                                      key={tx.id}
                                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-purple-200/60 text-xs shadow-2xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`font-black px-2 py-0.5 rounded-md text-[11px] ${
                                            tx.type === 'positive'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}
                                        >
                                          {tx.points > 0 ? `+${tx.points}` : tx.points} đ
                                        </span>
                                        <span className="font-bold text-slate-800">
                                          {tx.criterionName}
                                        </span>
                                        {tx.note && (
                                          <span className="text-slate-500 text-[11px]">
                                            ({tx.note})
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                                        <span>Ngày {tx.date} (Tuần {tx.weekNumber || getSchoolWeekFromDate(tx.date)})</span>
                                        <span>• GV: {tx.teacherName}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTransaction(tx.id)}
                                          className="text-rose-500 hover:text-rose-700 p-1"
                                          title="Xóa lượt điểm này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 3: CLASS RANKING (BẢNG XẾP HẠNG TOÀN TRƯỜNG / LIÊN ĐỘI) */}
      {viewTab === 'classRanking' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-800 text-sm">
                Bảng xếp hạng Thi đua các Lớp toàn trường (Liên đội)
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Năm học {currentSchoolYear?.name} • Kỳ xếp hạng: <strong className="text-purple-700">{getTimeframeLabel()}</strong>
              </p>
            </div>
            <span className="text-slate-500 font-medium">Tự động tính theo điểm cộng và điểm trừ của học sinh từng lớp</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 text-center w-14">Hạng</th>
                  <th className="p-3">Lớp học</th>
                  <th className="p-3">Khối lớp</th>
                  <th className="p-3">Giáo viên chủ nhiệm</th>
                  <th className="p-3 text-center">Sĩ số</th>
                  <th className="p-3 text-center">Điểm cộng (+)</th>
                  <th className="p-3 text-center">Điểm trừ (-)</th>
                  <th className="p-3 text-center">Tổng điểm thi đua</th>
                  <th className="p-3 text-center">Bình quân / HS</th>
                  <th className="p-3">Cờ thi đua Liên đội</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classRankings.map((item, idx) => (
                  <tr key={item.classRoom.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-black">
                      {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                    </td>
                    <td className="p-3 font-black text-slate-800 text-sm">
                      Lớp {item.classRoom.name}
                    </td>
                    <td className="p-3 text-slate-600">
                      {db.grades.find((g) => g.id === item.classRoom.gradeId)?.name}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{item.teacherName}</td>
                    <td className="p-3 text-center font-bold text-slate-600">
                      {item.studentCount} em
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-600">
                      {item.pos > 0 ? `+${item.pos}` : 0}
                    </td>
                    <td className="p-3 text-center font-bold text-rose-600">
                      {item.neg > 0 ? `-${item.neg}` : 0}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full font-black text-xs border ${
                          item.total > 0
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : item.total === 0
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {item.total > 0 ? `+${item.total}` : item.total} đ
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      {item.avgPerStudent > 0 ? `+${item.avgPerStudent.toFixed(1)}` : item.avgPerStudent.toFixed(1)} đ/em
                    </td>
                    <td className="p-3">
                      {idx === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[11px] inline-flex items-center gap-1">
                          🚩 Cờ Xuất Sắc {timeframeType === 'week' ? 'Tuần' : timeframeType === 'month' ? 'Tháng' : ''}
                        </span>
                      ) : idx < 3 ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-300 text-[11px] inline-flex items-center gap-1">
                          🏳️ Cờ Tiên Tiến
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Đạt chuẩn nề nếp</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TAB 4: HISTORY (LỊCH SỬ CỘNG/TRỪ ĐIỂM) */}
      {viewTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Lịch sử ghi nhận điểm thi đua ({historyList.length} lượt)
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ các lần cộng/trừ điểm đã được lưu an toàn. Bạn có thể xóa lượt chấm nếu nhập sai sót.
              </p>
            </div>

            {/* Filter by class */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Lọc theo lớp:</span>
              <select
                value={historyClassFilter}
                onChange={(e) => setHistoryClassFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50"
              >
                <option value="all">Tất cả các lớp toàn trường</option>
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

          {/* Search in history */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên học sinh, mã HS, tiêu chí hoặc ghi chú..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          {/* History table */}
          {historyList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-slate-600">Không tìm thấy lượt ghi nhận điểm thi đua nào.</p>
              <p className="mt-1">Hãy chuyển sang tab "Chấm điểm thi đua" để bắt đầu ghi nhận điểm cho học sinh.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Lớp</th>
                    <th className="p-3">Học sinh</th>
                    <th className="p-3">Tiêu chí thi đua</th>
                    <th className="p-3 text-center">Điểm số</th>
                    <th className="p-3">Ghi chú</th>
                    <th className="p-3">Người ghi nhận</th>
                    <th className="p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {historyList.map((tx) => {
                    const stu = db.students.find((s) => s.id === tx.studentId);
                    const cls = db.classes.find((c) => c.id === tx.classId);
                    const week = tx.weekNumber || getSchoolWeekFromDate(tx.date);
                    const month = tx.monthNumber || getMonthFromDate(tx.date);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{tx.date}</div>
                          <div className="text-[10px] text-purple-700 font-semibold">
                            Tuần {week} • Tháng {month}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-700">Lớp {cls?.name || tx.classId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{stu?.fullName || tx.studentName || 'Học sinh'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{stu?.studentCode}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{tx.criterionName}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md font-black text-xs ${
                              tx.type === 'positive'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.points > 0 ? `+${tx.points}` : tx.points} đ
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 italic max-w-xs truncate">
                          {tx.note || '-'}
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{tx.teacherName}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            disabled={deletingTxId === tx.id}
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                            title="Xóa lượt chấm này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW TAB 5: CRITERIA LIST (DANH MỤC TIÊU CHÍ) */}
      {viewTab === 'criteria' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-800">
                Danh mục Tiêu chí cộng / trừ điểm thi đua chuẩn
              </h3>
              <p className="text-xs text-slate-500">
                Quy chuẩn thang điểm rèn luyện nề nếp và học tập của Trường Tiểu học Nam Phước.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {db.criteria.map((cr) => (
              <div
                key={cr.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  cr.type === 'positive'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-slate-800">{cr.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Mã: {cr.id} • Nhóm: {cr.category}
                  </div>
                </div>
                <div
                  className={`text-base font-black px-2.5 py-1 rounded-lg ${
                    cr.type === 'positive' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {cr.type === 'positive' ? `+${cr.points}` : `-${Math.abs(cr.points)}`} đ
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
