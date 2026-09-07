import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  DownloadCloud,
  Printer,
  Sparkles,
  Search,
  Filter,
  Award,
  Heart,
  Brain,
  Edit3,
  ChevronRight,
  Eye,
  Check,
  FileText,
  AlertCircle,
  HelpCircle,
  X,
  Share2,
} from 'lucide-react';
import { storage } from '../services/storage';
import { MonthlyAssessmentTT27, Student, ClassRoom } from '../types';
import { ChibiAvatar } from '../data/chibiAvatars';

// Thông tư 27: Khung thời gian từ Tháng 9 đến Tháng 5
export const SCHOOL_MONTHS = [
  { value: 9, label: 'Tháng 9', desc: 'Bắt đầu năm học', semester: 'HK1' },
  { value: 10, label: 'Tháng 10', desc: 'Giữa kỳ 1', semester: 'HK1' },
  { value: 11, label: 'Tháng 11', desc: 'Thi đua chào mừng 20/11', semester: 'HK1' },
  { value: 12, label: 'Tháng 12', desc: 'Đánh giá cuối HK1', semester: 'HK1' },
  { value: 1, label: 'Tháng 1', desc: 'Bắt đầu học kỳ 2', semester: 'HK2' },
  { value: 2, label: 'Tháng 2', desc: 'Học kỳ 2 (Sau Tết)', semester: 'HK2' },
  { value: 3, label: 'Tháng 3', desc: 'Giữa kỳ 2', semester: 'HK2' },
  { value: 4, label: 'Tháng 4', desc: 'Ôn tập học kỳ 2', semester: 'HK2' },
  { value: 5, label: 'Tháng 5', desc: 'Tổng kết cuối năm học', semester: 'HK2' },
];

export const TT27_SUBJECTS = [
  'Tiếng Việt',
  'Toán',
  'Tiếng Anh',
  'Tin học',
  'Đạo đức',
  'TN&XH / Khoa học',
  'Lịch sử & Địa lý',
  'Âm nhạc',
  'Mỹ thuật',
  'GD Thể chất',
  'HĐ Trải nghiệm',
];

// Thư viện câu gợi ý nhận xét chuẩn ngữ cảnh Thông tư 27
const TT27_SUGGESTIONS = {
  academic_T: [
    'Tiếp thu bài nhanh, tự giác hoàn thành tốt các nội dung học tập, tích cực phát biểu.',
    'Có năng khiếu nổi bật trong học tập, hoàn thành xuất sắc các bài tập và nhiệm vụ giáo viên giao.',
    'Đọc diễn cảm tốt, chữ viết rõ ràng nề nếp, có khả năng diễn đạt lưu loát trước tập thể.',
    'Tư duy tính toán nhanh, giải quyết tốt các bài toán có lời văn và bài tập vận dụng.',
  ],
  academic_H: [
    'Hoàn thành đầy đủ các nhiệm vụ học tập trên lớp, có tinh thần cố gắng trong giờ học.',
    'Biết lắng nghe cô giảng bài, làm đủ bài tập về nhà, cần chú ý rèn thêm tính cẩn thận.',
    'Nắm được kiến thức cơ bản các môn học, đọc to rõ ràng, cần rèn luyện thêm chữ viết.',
    'Có tiến bộ trong tính toán, cần chủ động hơn khi thảo luận cùng bạn bè.',
  ],
  academic_C: [
    'Tiếp thu bài còn chậm, cần rèn luyện thêm kỹ năng tính toán và đọc hiểu hàng ngày.',
    'Chưa tập trung cao trong giờ học, cần sự động viên và hướng dẫn sát sao từ giáo viên.',
    'Còn lúng túng khi làm bài tập độc lập, cần bổ sung kiến thức cơ bản vào buổi phụ đạo.',
  ],
  qualities_T: [
    'Chăm chỉ, thật thà, yêu quý bạn bè, có ý thức trách nhiệm cao trong công việc của lớp.',
    'Lễ phép với thầy cô, hòa nhã với bạn, luôn sẵn sàng giúp đỡ bạn bè cùng tiến bộ.',
    'Có tinh thần kỷ luật tốt, tích cực tham gia các phong trào Đội và giữ gìn vệ sinh chung.',
  ],
  qualities_H: [
    'Ngoan ngoãn, lễ phép, chấp hành tốt nội quy trường lớp, có ý thức kỷ luật.',
    'Hòa đồng với bạn bè, tích cực tham gia các hoạt động tập thể khi được phân công.',
    'Thực hiện đầy đủ nhiệm vụ của học sinh, cần phát huy tính tự giác hơn nữa.',
  ],
  qualities_C: [
    'Đôi lúc còn mất trật tự trong giờ học, cần nhắc nhở chấp hành nội quy tốt hơn.',
    'Cần rèn luyện tính trung thực và cẩn thận trong việc bảo quản đồ dùng cá nhân.',
  ],
  competencies_T: [
    'Khả năng tự học và tự quản tốt, tự tin chia sẻ và hợp tác hiệu quả trong nhóm.',
    'Giao tiếp tự tin, biết lắng nghe và tôn trọng ý kiến của người khác.',
    'Có năng lực giải quyết vấn đề sáng tạo, mạnh dạn trình bày ý kiến cá nhân.',
  ],
  competencies_H: [
    'Biết phối hợp cùng bạn trong hoạt động nhóm, hoàn thành nhiệm vụ được giao.',
    'Có khả năng tự học ở mức cơ bản, cần tự tin hơn khi phát biểu trước tập thể.',
    'Biết lắng nghe và làm theo hướng dẫn của giáo viên, cần chủ động trao đổi khi chưa hiểu.',
  ],
  competencies_C: [
    'Kỹ năng hợp tác nhóm còn hạn chế, còn rụt rè chưa dám bày tỏ ý kiến.',
    'Cần rèn luyện thêm khả năng tự giác tự học và hoàn thành bài tập đúng thời gian.',
  ],
  praise: [
    'Khen ngợi em đã có nhiều nỗ lực và tiến bộ vượt bậc trong tháng qua!',
    'Biểu dương tinh thần tự giác học tập và ý thức giúp đỡ bạn bè trong lớp.',
    'Khen ngợi chữ viết của em ngày càng sạch đẹp, tích cực phát biểu xây dựng bài.',
    'Rất hoan nghênh tinh thần tích cực tham gia các phong trào học tập của em.',
  ],
  support: [
    'Giáo viên tiếp tục kèm cặp thêm trong giờ tự học và phân công bạn giỏi hỗ trợ em.',
    'Gia đình phối hợp kiểm tra góc học tập và nhắc nhở em ôn bài 30 phút mỗi tối.',
    'Động viên em mạnh dạn phát biểu và giao việc nhỏ để rèn luyện kỹ năng tự tin.',
    'Phối hợp phụ huynh rèn thêm chữ viết và tính cẩn thận khi làm bài ở nhà.',
  ],
};

interface MonthlyFeedbackViewProps {
  onOpenOwnerModal?: (action: string) => void;
  initialClassId?: string;
}

export const MonthlyFeedbackView: React.FC<MonthlyFeedbackViewProps> = ({
  onOpenOwnerModal,
  initialClassId,
}) => {
  const [db, setDb] = useState(storage.getDb());
  const currentSchoolYear = db.schoolYears.find((y) => y.id === db.currentSchoolYearId);

  const classesInYear = db.classes.filter(
    (c) => c.schoolYearId === db.currentSchoolYearId
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId && classesInYear.some((c) => c.id === initialClassId)
      ? initialClassId
      : classesInYear[0]?.id || ''
  );

  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'table' | 'detail'>('table');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [editingAssessment, setEditingAssessment] = useState<MonthlyAssessmentTT27 | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionTargetField, setSuggestionTargetField] = useState<'generalComment' | 'praiseNote' | 'supportMeasure'>('generalComment');

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return () => unsub();
  }, []);

  const studentsInClass = db.students.filter((s) => {
    const matchClass = selectedClassId ? s.currentClassId === selectedClassId : true;
    const matchYear = s.currentSchoolYearId === db.currentSchoolYearId;
    const matchSearch =
      !searchQuery ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchYear && matchSearch;
  });

  const currentClass = db.classes.find((c) => c.id === selectedClassId);

  // Get or initialize assessment record for a student
  const getAssessment = (student: Student): MonthlyAssessmentTT27 => {
    const existing = (db.monthlyAssessments || []).find(
      (m) =>
        m.studentId === student.id &&
        m.month === selectedMonth &&
        m.schoolYearId === db.currentSchoolYearId
    );

    if (existing) return existing;

    // Default TT27 template
    const defaultSubjects: Record<string, { level: 'T' | 'H' | 'C'; note?: string }> = {};
    TT27_SUBJECTS.forEach((sub) => {
      defaultSubjects[sub] = { level: 'H' };
    });

    return {
      id: `MA_${student.id}_M${selectedMonth}_${db.currentSchoolYearId}`,
      studentId: student.id,
      studentName: student.fullName,
      classId: student.currentClassId,
      schoolYearId: db.currentSchoolYearId,
      month: selectedMonth,
      subjects: defaultSubjects,
      qualities: {
        yeuNuoc: 'Đ',
        nhanAi: 'Đ',
        chamChi: 'Đ',
        trungThuc: 'Đ',
        trachNhiem: 'Đ',
      },
      competencies: {
        tuChuTuHoc: 'Đ',
        giaoTiepHopTac: 'Đ',
        giaiQuyetVanDe: 'Đ',
        ngonNgu: 'Đ',
        tinhToan: 'Đ',
      },
      generalComment: 'Em hoàn thành tốt các nội dung học tập và rèn luyện trong tháng.',
      praiseNote: 'Khen ngợi em tích cực phát biểu và chăm ngoan.',
      supportMeasure: 'Tiếp tục phát huy các ưu điểm đã đạt được.',
      teacherId: db.currentUser?.id || 'T01',
      teacherName: db.currentUser?.fullName || 'Thanh Nguyễn',
      updatedAt: new Date().toISOString(),
    };
  };

  const handleOpenEditDetail = (student: Student) => {
    const assessment = getAssessment(student);
    setSelectedStudentId(student.id);
    setEditingAssessment(JSON.parse(JSON.stringify(assessment)));
    setActiveTab('detail');
  };

  const handleSaveAssessment = (assessment: MonthlyAssessmentTT27) => {
    storage.saveMonthlyAssessment(assessment);
    setEditingAssessment(assessment);
    alert(`Đã lưu nhận xét Tháng ${assessment.month} cho học sinh ${assessment.studentName || assessment.studentId}!`);
  };

  // Quick rating toggle directly in table
  const handleQuickScore = (
    student: Student,
    category: 'subjects' | 'qualities' | 'competencies',
    key: string,
    value: any
  ) => {
    const assessment = getAssessment(student);
    const updated = { ...assessment };

    if (category === 'subjects') {
      updated.subjects = {
        ...updated.subjects,
        [key]: { level: value },
      };
    } else if (category === 'qualities') {
      updated.qualities = {
        ...updated.qualities,
        [key]: value,
      };
    } else if (category === 'competencies') {
      updated.competencies = {
        ...updated.competencies,
        [key]: value,
      };
    }

    storage.saveMonthlyAssessment(updated);
  };

  // Quick comment change in table
  const handleQuickCommentChange = (student: Student, field: 'generalComment' | 'praiseNote' | 'supportMeasure', val: string) => {
    const assessment = getAssessment(student);
    const updated = {
      ...assessment,
      [field]: val,
    };
    storage.saveMonthlyAssessment(updated);
  };

  // Export Excel / CSV for whole class
  const handleExportExcel = () => {
    if (!studentsInClass.length) {
      alert('Không có dữ liệu học sinh để xuất.');
      return;
    }

    const monthObj = SCHOOL_MONTHS.find((m) => m.value === selectedMonth);
    const headers = [
      'STT',
      'Mã Học Sinh',
      'Họ và Tên',
      'Giới Tính',
      'Lớp',
      'Tháng Đánh Giá',
      'Tiếng Việt',
      'Toán',
      'Tiếng Anh',
      'Tin học',
      'Phẩm chất (Yêu nước)',
      'Phẩm chất (Nhân ái)',
      'Phẩm chất (Chăm chỉ)',
      'Phẩm chất (Trung thực)',
      'Phẩm chất (Trách nhiệm)',
      'Năng lực (Tự chủ tự học)',
      'Năng lực (Giao tiếp hợp tác)',
      'Năng lực (Giải quyết vấn đề)',
      'Lời nhận xét cụ thể',
      'Khen ngợi động viên',
      'Biện pháp giúp đỡ',
      'Giáo viên nhận xét',
    ];

    const rows = studentsInClass.map((stu, idx) => {
      const ass = getAssessment(stu);
      return [
        idx + 1,
        `"${stu.studentCode}"`,
        `"${stu.fullName}"`,
        stu.gender,
        `"${currentClass?.name || stu.currentClassId}"`,
        `"Tháng ${selectedMonth}"`,
        ass.subjects['Tiếng Việt']?.level || 'H',
        ass.subjects['Toán']?.level || 'H',
        ass.subjects['Tiếng Anh']?.level || 'H',
        ass.subjects['Tin học']?.level || 'H',
        ass.qualities.yeuNuoc,
        ass.qualities.nhanAi,
        ass.qualities.chamChi,
        ass.qualities.trungThuc,
        ass.qualities.trachNhiem,
        ass.competencies.tuChuTuHoc,
        ass.competencies.giaoTiepHopTac,
        ass.competencies.giaiQuyetVanDe,
        `"${(ass.generalComment || '').replace(/"/g, '""')}"`,
        `"${(ass.praiseNote || '').replace(/"/g, '""')}"`,
        `"${(ass.supportMeasure || '').replace(/"/g, '""')}"`,
        `"${ass.teacherName || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `So_Nhan_Xet_Thang_${selectedMonth}_Lop_${currentClass?.name || 'TatCa'}_TT27.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedStudent = studentsInClass.find((s) => s.id === selectedStudentId) || studentsInClass[0];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Sổ Nhận Xét Học Sinh Theo Tháng – Chuẩn Thông Tư 27/2020/TT-BGDĐT</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Đánh Giá Toàn Diện 3 Mặt (Môn Học, Phẩm Chất, Năng Lực)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Khung thời gian năm học chuẩn tiểu học từ <strong className="text-sky-700">Tháng 9 đến Tháng 5</strong>. Hỗ trợ nhập liệu, gợi ý chuẩn ngữ cảnh, in phiếu và xuất Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Xuất Excel Tháng {selectedMonth}</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>In Phiếu Nhận Xét</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar - Exactly from Month 9 to Month 5 */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            Chọn tháng đánh giá ({currentSchoolYear?.name || 'Năm học 2026-2027'}):
          </span>
          <span className="text-slate-400 font-normal">
            9 Tháng Học: Tháng 9 → Tháng 5
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
          {SCHOOL_MONTHS.map((m) => {
            const isSelected = selectedMonth === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`py-2 px-2.5 rounded-xl text-center transition flex flex-col items-center justify-center border cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="text-xs font-bold">{m.label}</span>
                <span
                  className={`text-[10px] truncate max-w-full ${
                    isSelected ? 'text-sky-100' : 'text-slate-400'
                  }`}
                >
                  {m.semester}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and View Toggles */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Class Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              {classesInYear.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.name} ({db.students.filter((s) => s.currentClassId === c.id && s.currentSchoolYearId === db.currentSchoolYearId).length} HS)
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'table'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bảng toàn lớp
          </button>
          <button
            onClick={() => {
              if (selectedStudent) {
                handleOpenEditDetail(selectedStudent);
              }
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'detail'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hồ sơ chi tiết 3 mặt
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Danh sách học sinh Lớp {currentClass?.name} – Tháng {selectedMonth}</span>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[11px] font-semibold">
                  {studentsInClass.length} học sinh
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Môn học (T: Tốt, H: Hoàn thành, C: Chưa HT) • Phẩm chất & Năng lực (T: Tốt, Đ: Đạt, C: Cần cố gắng)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-2.5 text-center w-10">STT</th>
                  <th className="p-2.5 w-60">Học sinh (Chibi)</th>
                  <th className="p-2.5 text-center bg-blue-50/60 border-l border-r border-blue-100" colSpan={4}>
                    Môn học cốt lõi (T / H / C)
                    <div className="flex justify-around font-normal text-[10px] text-slate-500 mt-0.5">
                      <span>T.Việt</span>
                      <span>Toán</span>
                      <span>T.Anh</span>
                      <span>Tin</span>
                    </div>
                  </th>
                  <th className="p-2.5 text-center bg-rose-50/60 border-r border-rose-100" colSpan={3}>
                    Phẩm chất (T / Đ / C)
                    <div className="flex justify-around font-normal text-[10px] text-slate-500 mt-0.5">
                      <span>Chăm chỉ</span>
                      <span>T.Thực</span>
                      <span>T.Nhiệm</span>
                    </div>
                  </th>
                  <th className="p-2.5 text-center bg-purple-50/60 border-r border-purple-100" colSpan={2}>
                    Năng lực (T / Đ / C)
                    <div className="flex justify-around font-normal text-[10px] text-slate-500 mt-0.5">
                      <span>Tự chủ</span>
                      <span>G.Tiếp</span>
                    </div>
                  </th>
                  <th className="p-2.5 min-w-[240px]">Lời nhận xét cụ thể (Chuẩn TT27)</th>
                  <th className="p-2.5 text-center w-20">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsInClass.length > 0 ? (
                  studentsInClass.map((stu, idx) => {
                    const ass = getAssessment(stu);
                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <ChibiAvatar
                              gender={stu.gender}
                              avatarId={stu.chibiAvatarId}
                              seed={stu.id || stu.studentCode}
                              size={34}
                              showGenderBadge={true}
                            />
                            <div className="truncate">
                              <div className="font-bold text-slate-800 hover:text-sky-600 cursor-pointer" onClick={() => handleOpenEditDetail(stu)}>
                                {stu.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {stu.studentCode} • {stu.gender}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Core Subjects */}
                        <td className="p-2 text-center bg-blue-50/20 border-l border-blue-100">
                          <select
                            value={ass.subjects['Tiếng Việt']?.level || 'H'}
                            onChange={(e) => handleQuickScore(stu, 'subjects', 'Tiếng Việt', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.subjects['Tiếng Việt']?.level === 'T'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : ass.subjects['Tiếng Việt']?.level === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="p-2 text-center bg-blue-50/20">
                          <select
                            value={ass.subjects['Toán']?.level || 'H'}
                            onChange={(e) => handleQuickScore(stu, 'subjects', 'Toán', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.subjects['Toán']?.level === 'T'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : ass.subjects['Toán']?.level === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="p-2 text-center bg-blue-50/20">
                          <select
                            value={ass.subjects['Tiếng Anh']?.level || 'H'}
                            onChange={(e) => handleQuickScore(stu, 'subjects', 'Tiếng Anh', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.subjects['Tiếng Anh']?.level === 'T'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : ass.subjects['Tiếng Anh']?.level === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="p-2 text-center bg-blue-50/20 border-r border-blue-100">
                          <select
                            value={ass.subjects['Tin học']?.level || 'H'}
                            onChange={(e) => handleQuickScore(stu, 'subjects', 'Tin học', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.subjects['Tin học']?.level === 'T'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : ass.subjects['Tin học']?.level === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* Qualities */}
                        <td className="p-2 text-center bg-rose-50/20">
                          <select
                            value={ass.qualities.chamChi}
                            onChange={(e) => handleQuickScore(stu, 'qualities', 'chamChi', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.qualities.chamChi === 'T'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : ass.qualities.chamChi === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="Đ">Đ</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="p-2 text-center bg-rose-50/20">
                          <select
                            value={ass.qualities.trungThuc}
                            onChange={(e) => handleQuickScore(stu, 'qualities', 'trungThuc', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.qualities.trungThuc === 'T'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : ass.qualities.trungThuc === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="Đ">Đ</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="p-2 text-center bg-rose-50/20 border-r border-rose-100">
                          <select
                            value={ass.qualities.trachNhiem}
                            onChange={(e) => handleQuickScore(stu, 'qualities', 'trachNhiem', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.qualities.trachNhiem === 'T'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : ass.qualities.trachNhiem === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="Đ">Đ</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* Competencies */}
                        <td className="p-2 text-center bg-purple-50/20">
                          <select
                            value={ass.competencies.tuChuTuHoc}
                            onChange={(e) => handleQuickScore(stu, 'competencies', 'tuChuTuHoc', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.competencies.tuChuTuHoc === 'T'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : ass.competencies.tuChuTuHoc === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="Đ">Đ</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="p-2 text-center bg-purple-50/20 border-r border-purple-100">
                          <select
                            value={ass.competencies.giaoTiepHopTac}
                            onChange={(e) => handleQuickScore(stu, 'competencies', 'giaoTiepHopTac', e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              ass.competencies.giaoTiepHopTac === 'T'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : ass.competencies.giaoTiepHopTac === 'C'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="T">T</option>
                            <option value="Đ">Đ</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* Comments */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={ass.generalComment}
                            onChange={(e) => handleQuickCommentChange(stu, 'generalComment', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:border-sky-500 focus:bg-white bg-slate-50/50"
                            placeholder="Nhập lời nhận xét..."
                          />
                        </td>

                        {/* Actions */}
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleOpenEditDetail(stu)}
                            className="p-1 px-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition inline-flex items-center gap-1"
                            title="Mở form chi tiết 3 mặt"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 text-xs">
                      Không tìm thấy học sinh nào trong lớp hoặc bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Detailed 3-aspect Assessment Form */
        editingAssessment && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <ChibiAvatar
                  gender={selectedStudent?.gender}
                  avatarId={selectedStudent?.chibiAvatarId}
                  seed={selectedStudent?.id || selectedStudent?.studentCode}
                  size={52}
                  showGenderBadge={true}
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingAssessment.studentName} ({selectedStudent?.studentCode})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lớp {currentClass?.name} • Nhận xét Tháng {editingAssessment.month} • Chuẩn Thông tư 27/2020/TT-BGDĐT
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Quay lại bảng
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAssessment(editingAssessment)}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu đánh giá</span>
                </button>
              </div>
            </div>

            {/* 1. Môn học và hoạt động giáo dục */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  1. Môn học & Hoạt động giáo dục (T: Tốt, H: Hoàn thành, C: Chưa hoàn thành)
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {TT27_SUBJECTS.map((sub) => {
                  const currentSub = editingAssessment.subjects[sub] || { level: 'H' };
                  return (
                    <div key={sub} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-700 mb-1.5 truncate" title={sub}>
                        {sub}
                      </div>
                      <div className="flex items-center gap-1">
                        {(['T', 'H', 'C'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setEditingAssessment({
                                ...editingAssessment,
                                subjects: {
                                  ...editingAssessment.subjects,
                                  [sub]: { ...currentSub, level: lvl },
                                },
                              });
                            }}
                            className={`flex-1 py-1 text-xs font-bold rounded-lg border transition ${
                              currentSub.level === lvl
                                ? lvl === 'T'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : lvl === 'H'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Phẩm chất chủ yếu */}
            <div>
              <h4 className="text-sm font-bold text-rose-700 flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4" />
                2. Phẩm chất chủ yếu (T: Tốt, Đ: Đạt, C: Cần cố gắng)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { key: 'yeuNuoc', label: 'Yêu nước' },
                  { key: 'nhanAi', label: 'Nhân ái' },
                  { key: 'chamChi', label: 'Chăm chỉ' },
                  { key: 'trungThuc', label: 'Trung thực' },
                  { key: 'trachNhiem', label: 'Trách nhiệm' },
                ].map(({ key, label }) => {
                  const currentVal = (editingAssessment.qualities as any)[key] || 'Đ';
                  return (
                    <div key={key} className="p-3 bg-rose-50/40 rounded-xl border border-rose-100">
                      <div className="text-xs font-bold text-slate-800 mb-1.5">{label}</div>
                      <div className="flex items-center gap-1">
                        {(['T', 'Đ', 'C'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setEditingAssessment({
                                ...editingAssessment,
                                qualities: {
                                  ...editingAssessment.qualities,
                                  [key]: lvl,
                                },
                              });
                            }}
                            className={`flex-1 py-1 text-xs font-bold rounded-lg border transition ${
                              currentVal === lvl
                                ? lvl === 'T'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : lvl === 'Đ'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Năng lực cốt lõi */}
            <div>
              <h4 className="text-sm font-bold text-purple-700 flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4" />
                3. Năng lực cốt lõi (T: Tốt, Đ: Đạt, C: Cần cố gắng)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'tuChuTuHoc', label: 'Tự chủ và tự học' },
                  { key: 'giaoTiepHopTac', label: 'Giao tiếp và hợp tác' },
                  { key: 'giaiQuyetVanDe', label: 'Giải quyết vấn đề và sáng tạo' },
                ].map(({ key, label }) => {
                  const currentVal = (editingAssessment.competencies as any)[key] || 'Đ';
                  return (
                    <div key={key} className="p-3 bg-purple-50/40 rounded-xl border border-purple-100">
                      <div className="text-xs font-bold text-slate-800 mb-1.5">{label}</div>
                      <div className="flex items-center gap-1">
                        {(['T', 'Đ', 'C'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setEditingAssessment({
                                ...editingAssessment,
                                competencies: {
                                  ...editingAssessment.competencies,
                                  [key]: lvl,
                                },
                              });
                            }}
                            className={`flex-1 py-1 text-xs font-bold rounded-lg border transition ${
                              currentVal === lvl
                                ? lvl === 'T'
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : lvl === 'Đ'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Lời nhận xét cụ thể, khen ngợi và biện pháp giúp đỡ */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Lời nhận xét cụ thể */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    <span>Lời nhận xét cụ thể (Môn học, phẩm chất, năng lực):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestionTargetField('generalComment');
                      setShowSuggestionModal(true);
                    }}
                    className="text-[11px] text-sky-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Gợi ý mẫu câu chuẩn TT27
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editingAssessment.generalComment}
                  onChange={(e) =>
                    setEditingAssessment({ ...editingAssessment, generalComment: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
                  placeholder="Nhập lời nhận xét cụ thể của giáo viên..."
                />
              </div>

              {/* Khen ngợi động viên */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Khen ngợi, động viên:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestionTargetField('praiseNote');
                      setShowSuggestionModal(true);
                    }}
                    className="text-[11px] text-sky-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Gợi ý lời khen
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editingAssessment.praiseNote}
                  onChange={(e) =>
                    setEditingAssessment({ ...editingAssessment, praiseNote: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
                  placeholder="Khen ngợi ưu điểm nổi bật của em..."
                />
              </div>

              {/* Biện pháp giúp đỡ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Biện pháp giúp đỡ của giáo viên & gia đình:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestionTargetField('supportMeasure');
                      setShowSuggestionModal(true);
                    }}
                    className="text-[11px] text-sky-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Gợi ý biện pháp
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editingAssessment.supportMeasure}
                  onChange={(e) =>
                    setEditingAssessment({ ...editingAssessment, supportMeasure: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
                  placeholder="Biện pháp hỗ trợ học sinh tiến bộ trong tháng tiếp theo..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSaveAssessment(editingAssessment)}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Lưu sổ nhận xét Tháng {editingAssessment.month}</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Suggestion Bank Modal */}
      {showSuggestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Gợi Ý Câu Nhận Xét Chuẩn Thông Tư 27
                </h3>
              </div>
              <button
                onClick={() => setShowSuggestionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
              {suggestionTargetField === 'generalComment' && (
                <>
                  <div>
                    <h5 className="font-bold text-blue-700 mb-2">Mức Tốt / Xuất sắc:</h5>
                    <div className="space-y-1.5">
                      {[...TT27_SUGGESTIONS.academic_T, ...TT27_SUGGESTIONS.qualities_T].map((txt, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (editingAssessment) {
                              setEditingAssessment({ ...editingAssessment, generalComment: txt });
                            }
                            setShowSuggestionModal(false);
                          }}
                          className="p-2.5 bg-blue-50/50 hover:bg-blue-100/70 text-slate-700 rounded-xl cursor-pointer border border-blue-100 transition"
                        >
                          "{txt}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-emerald-700 mb-2">Mức Hoàn thành / Đạt:</h5>
                    <div className="space-y-1.5">
                      {[...TT27_SUGGESTIONS.academic_H, ...TT27_SUGGESTIONS.qualities_H].map((txt, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (editingAssessment) {
                              setEditingAssessment({ ...editingAssessment, generalComment: txt });
                            }
                            setShowSuggestionModal(false);
                          }}
                          className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/70 text-slate-700 rounded-xl cursor-pointer border border-emerald-100 transition"
                        >
                          "{txt}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-amber-700 mb-2">Mức Cần cố gắng:</h5>
                    <div className="space-y-1.5">
                      {[...TT27_SUGGESTIONS.academic_C, ...TT27_SUGGESTIONS.qualities_C].map((txt, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (editingAssessment) {
                              setEditingAssessment({ ...editingAssessment, generalComment: txt });
                            }
                            setShowSuggestionModal(false);
                          }}
                          className="p-2.5 bg-amber-50/50 hover:bg-amber-100/70 text-slate-700 rounded-xl cursor-pointer border border-amber-100 transition"
                        >
                          "{txt}"
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {suggestionTargetField === 'praiseNote' && (
                <div>
                  <h5 className="font-bold text-amber-700 mb-2">Câu khen ngợi & động viên:</h5>
                  <div className="space-y-1.5">
                    {TT27_SUGGESTIONS.praise.map((txt, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (editingAssessment) {
                            setEditingAssessment({ ...editingAssessment, praiseNote: txt });
                          }
                          setShowSuggestionModal(false);
                        }}
                        className="p-2.5 bg-amber-50/50 hover:bg-amber-100/70 text-slate-700 rounded-xl cursor-pointer border border-amber-100 transition"
                      >
                        "{txt}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {suggestionTargetField === 'supportMeasure' && (
                <div>
                  <h5 className="font-bold text-emerald-700 mb-2">Biện pháp hỗ trợ & phối hợp phụ huynh:</h5>
                  <div className="space-y-1.5">
                    {TT27_SUGGESTIONS.support.map((txt, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (editingAssessment) {
                            setEditingAssessment({ ...editingAssessment, supportMeasure: txt });
                          }
                          setShowSuggestionModal(false);
                        }}
                        className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/70 text-slate-700 rounded-xl cursor-pointer border border-emerald-100 transition"
                      >
                        "{txt}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-6 print:hidden">
              <h3 className="font-bold text-base text-slate-800">
                Phiếu Nhận Xét Học Sinh Theo Tháng (Mẫu In Chuẩn TT27)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  In phiếu
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Form */}
            <div className="text-center space-y-1 mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {db.settings?.schoolName || 'TRƯỜNG TIỂU HỌC NAM PHƯỚC'} – {db.settings?.branchName || 'PHÂN HIỆU 2'}
              </div>
              <div className="text-xs uppercase text-slate-500 font-semibold">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM – Độc lập - Tự do - Hạnh phúc
              </div>
              <div className="pt-3">
                <h2 className="text-lg font-bold text-slate-900 uppercase">
                  PHIẾU NHẬN XÉT ĐÁNH GIÁ THÁNG {selectedMonth}
                </h2>
                <div className="text-xs text-slate-500 italic">
                  (Theo quy định chuẩn Thông tư 27/2020/TT-BGDĐT)
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center gap-4 text-xs">
              <ChibiAvatar
                gender={selectedStudent.gender}
                avatarId={selectedStudent.chibiAvatarId}
                seed={selectedStudent.id || selectedStudent.studentCode}
                size={56}
                showGenderBadge={true}
              />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                <div>Họ và tên: <strong className="text-slate-900">{selectedStudent.fullName}</strong></div>
                <div>Mã học sinh: <strong className="text-slate-900">{selectedStudent.studentCode}</strong></div>
                <div>Lớp: <strong className="text-slate-900">{currentClass?.name}</strong></div>
                <div>Giới tính: <strong className="text-slate-900">{selectedStudent.gender}</strong></div>
                <div>Năm học: <strong className="text-slate-900">{currentSchoolYear?.name}</strong></div>
                <div>GV Chủ nhiệm: <strong className="text-slate-900">{db.currentUser?.fullName || 'Thanh Nguyễn'}</strong></div>
              </div>
            </div>

            {/* Assessment summary */}
            {(() => {
              const ass = getAssessment(selectedStudent);
              return (
                <div className="space-y-4 text-xs">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="p-2.5 border-b">Nội dung đánh giá</th>
                          <th className="p-2.5 border-b text-center w-28">Mức đạt được</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-2.5 font-semibold text-slate-800">1. Môn học & Hoạt động giáo dục</td>
                          <td className="p-2.5 text-center font-bold text-blue-700">
                            Tiếng Việt ({ass.subjects['Tiếng Việt']?.level || 'H'}), Toán ({ass.subjects['Toán']?.level || 'H'})
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-semibold text-slate-800">2. Phẩm chất chủ yếu</td>
                          <td className="p-2.5 text-center font-bold text-rose-700">
                            Chăm chỉ: {ass.qualities.chamChi} • Trách nhiệm: {ass.qualities.trachNhiem}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-semibold text-slate-800">3. Năng lực cốt lõi</td>
                          <td className="p-2.5 text-center font-bold text-purple-700">
                            Tự chủ: {ass.competencies.tuChuTuHoc} • Giao tiếp: {ass.competencies.giaoTiepHopTac}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div>
                      <span className="font-bold text-slate-800">Lời nhận xét cụ thể:</span>{' '}
                      <span className="text-slate-700">{ass.generalComment}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Khen ngợi động viên:</span>{' '}
                      <span className="text-slate-700">{ass.praiseNote}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Biện pháp giúp đỡ:</span>{' '}
                      <span className="text-slate-700">{ass.supportMeasure}</span>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 grid grid-cols-2 gap-4 text-center text-xs">
                    <div>
                      <div className="font-bold text-slate-800">Ý KIẾN PHỤ HUYNH HỌC SINH</div>
                      <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-16"></div>
                    </div>
                    <div>
                      <div className="text-slate-500 italic">Duy Phước, ngày ..... tháng ..... năm 2026</div>
                      <div className="font-bold text-slate-800 mt-1">GIÁO VIÊN CHỦ NHIỆM</div>
                      <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                      <div className="h-12 flex items-center justify-center font-bold text-slate-700">
                        {db.currentUser?.fullName || 'Thanh Nguyễn'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
