import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Save,
  Printer,
  FileCheck2,
  Plus,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { storage } from '../services/storage';
import { StudentFeedback, EvaluationRecord } from '../types';
import { generateOfficialReportHtml } from '../services/pdfExport';

interface FeedbackViewProps {
  initialClassId?: string;
  onOpenOwnerModal: (action: string) => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  initialClassId,
  onOpenOwnerModal,
}) => {
  const db = storage.getDb();
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || db.classes[0]?.id || 'C4A'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán');
  const [selectedSemester, setSelectedSemester] = useState<string>('Học kỳ 1');
  const [activeTab, setActiveTab] = useState<'feedback' | 'evaluations'>('feedback');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick comment templates
  const quickComments = [
    'Tiếp thu bài nhanh, tính toán cẩn thận và chính xác.',
    'Có tiến bộ rõ rệt trong giờ học, chăm chỉ phát biểu xây dựng bài.',
    'Chữ viết nắn nót, trình bày bài sạch đẹp, cần duy trì.',
    'Cần rèn luyện thêm kỹ năng đọc hiểu và giải toán có lời văn.',
    'Ngoan ngoãn, lễ phép, đoàn kết và luôn giúp đỡ bạn bè.',
    'Tích cực tham gia các phong trào Đội và hoạt động tập thể.',
  ];

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    db.students[0]?.id || ''
  );
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'academic' | 'conduct' | 'health' | 'general'>('academic');
  const [feedbackRating, setFeedbackRating] = useState<'Tốt' | 'Đạt' | 'Cần cố gắng'>('Tốt');
  const [saveSuccess, setSaveSuccess] = useState('');

  const canEval = storage.canEvaluateSubject(selectedClassId, selectedSubject);
  const isAllowedToEdit = canEval.allowed;

  const currentClass = db.classes.find((c) => c.id === selectedClassId);
  const students = db.students.filter(
    (s) => s.currentClassId === selectedClassId && s.currentSchoolYearId === db.currentSchoolYearId
  );

  const subjects = [
    'Toán',
    'Tiếng Việt',
    'Tiếng Anh',
    'Đạo đức',
    'Khoa học',
    'Lịch sử & Địa lý',
    'Tin học & Công nghệ',
    'Âm nhạc',
    'Mỹ thuật',
    'Giáo dục thể chất',
    'Hoạt động trải nghiệm',
  ];

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      if (canEval.reason) {
        alert(canEval.reason);
      } else {
        onOpenOwnerModal('Lưu nhận xét giáo viên');
      }
      return;
    }
    if (!feedbackContent.trim()) return;

    const currentTeacher = db.currentUser || db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);
    const newFb: StudentFeedback = {
      id: `FB_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentId: selectedStudentId,
      classId: selectedClassId,
      schoolYearId: db.currentSchoolYearId,
      teacherId: currentTeacher?.id || 'T002',
      teacherName: currentTeacher?.fullName || 'Giáo viên',
      subject: selectedSubject,
      category: feedbackCategory,
      content: feedbackContent.trim(),
      rating: feedbackRating,
      date: new Date().toISOString().split('T')[0],
      semester: selectedSemester,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = {
      ...db,
      feedback: [newFb, ...db.feedback],
    };

    storage.save(updated, true, {
      category: 'Nhận xét',
      action: 'Lưu nhận xét học sinh',
      details: `Đã ghi nhận xét môn ${selectedSubject} cho học sinh.`,
    });

    setSaveSuccess('Đã lưu nhận xét thành công!');
    setFeedbackContent('');
    setTimeout(() => setSaveSuccess(''), 2500);
  };

  // Quick evaluation update for H/T/C
  const handleUpdateEvaluation = (
    studentId: string,
    level: 'T' | 'H' | 'C'
  ) => {
    if (!isAllowedToEdit) {
      if (canEval.reason) {
        alert(canEval.reason);
      } else {
        onOpenOwnerModal('Đánh giá học sinh theo Thông tư');
      }
      return;
    }

    const currentTeacher = db.currentUser || db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);
    const existingIndex = db.evaluations.findIndex(
      (e) =>
        e.studentId === studentId &&
        e.subject === selectedSubject &&
        e.semester === selectedSemester &&
        e.schoolYearId === db.currentSchoolYearId
    );

    let updatedEvaluations = [...db.evaluations];

    if (existingIndex >= 0) {
      updatedEvaluations[existingIndex] = {
        ...updatedEvaluations[existingIndex],
        level,
        teacherId: currentTeacher?.id || updatedEvaluations[existingIndex].teacherId,
        teacherName: currentTeacher?.fullName || updatedEvaluations[existingIndex].teacherName,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newEv: EvaluationRecord = {
        id: `EV_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        classId: selectedClassId,
        schoolYearId: db.currentSchoolYearId,
        subject: selectedSubject,
        semester: selectedSemester,
        level,
        teacherId: currentTeacher?.id || 'T002',
        teacherName: currentTeacher?.fullName || 'Giáo viên',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedEvaluations.push(newEv);
    }

    storage.save(
      { ...db, evaluations: updatedEvaluations },
      true,
      {
        category: 'Đánh giá',
        action: 'Đánh giá môn học (H/T/C)',
        details: `Cập nhật mức đánh giá môn ${selectedSubject} cho học sinh.`,
      }
    );
  };

  // Export report
  const handlePrintFeedbackReport = () => {
    const tableRows = students.map((s, idx) => {
      const fbList = db.feedback.filter(
        (f) => f.studentId === s.id && f.subject === selectedSubject && f.semester === selectedSemester
      );
      const ev = db.evaluations.find(
        (e) => e.studentId === s.id && e.subject === selectedSubject && e.semester === selectedSemester
      );
      const levelText = ev?.level === 'T' ? 'Tốt (T)' : ev?.level === 'H' ? 'Hoàn thành (H)' : ev?.level === 'C' ? 'Chưa HT (C)' : 'Chưa xếp';
      const commentText = fbList.map((f) => f.content).join('; ') || 'Hoàn thành chương trình học tập';

      return [
        (idx + 1).toString(),
        s.studentCode,
        s.fullName,
        levelText,
        commentText,
      ];
    });

    generateOfficialReportHtml({
      title: `BÁO CÁO NHẬN XÉT & ĐÁNH GIÁ MÔN ${selectedSubject.toUpperCase()} LỚP ${currentClass?.name || ''}`,
      subtitle: `${selectedSemester} • Năm học ${db.schoolYears.find((y) => y.id === db.currentSchoolYearId)?.name} • Trường TH Nam Phước`,
      dateRange: selectedSemester,
      periodType: 'month',
      tableHeaders: ['STT', 'Mã HS', 'Họ và tên học sinh', 'Mức đạt (H/T/C)', 'Lời nhận xét của Giáo viên'],
      tableRows,
      summaryStats: [
        { label: 'Tổng số học sinh', value: `${students.length} em` },
        { label: 'Môn học', value: selectedSubject },
        { label: 'Kỳ đánh giá', value: selectedSemester },
        { label: 'Lớp', value: currentClass?.name || '-' },
      ],
      signerTitle: 'GIÁO VIÊN BỘ MÔN',
      signerName:
        db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId)?.fullName ||
        'Thanh Nguyễn',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Sổ nhận xét điện tử & Đánh giá định kỳ</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Nhận xét & Đánh giá Môn học Lớp {currentClass?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận xét theo môn, đánh giá H/T/C theo Thông tư Bộ Giáo dục và Đào tạo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintFeedbackReport}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Xuất Báo cáo Nhận xét & Chữ ký
          </button>
        </div>
      </div>

      {/* Role Assignment Notice */}
      {db.currentUser?.role === 'subject' ? (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs text-xs text-sky-900">
          <BookOpen className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sky-950 text-sm">Phân công Giáo viên Chuyên môn</div>
            <p className="mt-0.5">
              Thầy/Cô: <strong>{db.currentUser.fullName}</strong> • Phụ trách chuyên môn:{' '}
              <span className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                {db.currentUser.subjects?.join(', ')}
              </span>{' '}
              • Các lớp được phân công:{' '}
              <span className="font-bold text-sky-800">
                {db.currentUser.assignedClassIds
                  ?.map((cid) => db.classes.find((c) => c.id === cid)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </p>
            {!isAllowedToEdit && (
              <p className="text-amber-800 font-semibold mt-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                ⚠️ Lưu ý: Môn "{selectedSubject}" của Lớp {currentClass?.name} không thuộc phân công chuyên môn của Thầy/Cô (đang ở chế độ xem).
              </p>
            )}
          </div>
        </div>
      ) : !isAllowedToEdit ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-950 text-sm">Chế độ xem nhận xét môn học</div>
            <p className="mt-0.5">
              Bạn đang ở chế độ xem. Môn học "{selectedSubject}" Lớp {currentClass?.name} do Giáo viên phụ trách đánh giá.
            </p>
          </div>
        </div>
      ) : null}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-600 mb-1">Lớp</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-1.5 font-bold border border-slate-200 rounded-lg bg-slate-50"
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

        <div>
          <label className="block font-bold text-slate-600 mb-1">Môn học</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-1.5 font-bold border border-slate-200 rounded-lg bg-slate-50"
          >
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Học kỳ / Đợt</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-3 py-1.5 font-semibold border border-slate-200 rounded-lg bg-slate-50"
          >
            <option value="Học kỳ 1">Học kỳ 1</option>
            <option value="Học kỳ 2">Học kỳ 2</option>
            <option value="Cả năm">Cả năm</option>
            <option value="Giữa HK1">Giữa HK1</option>
            <option value="Giữa HK2">Giữa HK2</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Chế độ xem</label>
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 py-1 rounded-md font-bold text-[11px] transition ${
                activeTab === 'feedback' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Nhận xét
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`flex-1 py-1 rounded-md font-bold text-[11px] transition ${
                activeTab === 'evaluations' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Đánh giá H/T/C
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'feedback' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Add Feedback Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Ghi nhận xét mới
            </h3>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveFeedback} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn học sinh</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} - {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="academic">Học lực</option>
                    <option value="conduct">Hạnh kiểm</option>
                    <option value="health">Sức khỏe</option>
                    <option value="general">Chung</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đánh giá chung</label>
                  <select
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Tốt">Tốt</option>
                    <option value="Đạt">Đạt</option>
                    <option value="Cần cố gắng">Cần cố gắng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung nhận xét cụ thể
                </label>
                <textarea
                  rows={4}
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="Nhập lời nhận xét cho học sinh..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <div className="font-bold text-slate-600 mb-1.5">Ngân hàng lời nhận xét mẫu:</div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {quickComments.map((qc, idx) => (
                    <div
                      key={idx}
                      onClick={() => setFeedbackContent(qc)}
                      className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 rounded-lg border border-slate-200 cursor-pointer transition text-[11px] text-slate-700"
                    >
                      • {qc}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Lưu lời nhận xét
              </button>
            </form>
          </div>

          {/* Right: Feedback History for the class */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-800">
                Lịch sử nhận xét môn {selectedSubject} - Lớp {currentClass?.name}
              </h3>
              <span className="text-xs text-slate-500">
                {db.feedback.filter((f) => f.classId === selectedClassId && f.subject === selectedSubject).length} nhận xét
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {db.feedback
                .filter((f) => f.classId === selectedClassId && f.subject === selectedSubject)
                .map((fb) => {
                  const student = db.students.find((s) => s.id === fb.studentId);
                  return (
                    <div
                      key={fb.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {student?.fullName || 'Học sinh'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                            {student?.studentCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {fb.rating}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{fb.date} • {fb.semester}</span>
                      </div>

                      <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200">
                        "{fb.content}"
                      </p>

                      <div className="text-[11px] text-slate-500 text-right">
                        Người nhận xét: <strong>{fb.teacherName}</strong>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* TAB EVALUATIONS H/T/C */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Bảng đánh giá mức đạt chuẩn môn {selectedSubject} ({selectedSemester})
            </span>
            <span className="text-slate-500">
              T: Hoàn thành tốt • H: Hoàn thành • C: Chưa hoàn thành
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 text-center w-12">STT</th>
                  <th className="p-3">Mã HS</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3 text-center">Mức đánh giá hiện tại</th>
                  <th className="p-3 text-center">Cập nhật nhanh mức đạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((stu, idx) => {
                  const ev = db.evaluations.find(
                    (e) =>
                      e.studentId === stu.id &&
                      e.subject === selectedSubject &&
                      e.semester === selectedSemester &&
                      e.schoolYearId === db.currentSchoolYearId
                  );
                  const currentLevel = ev?.level || 'H';

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{stu.studentCode}</td>
                      <td className="p-3 font-bold text-slate-800">{stu.fullName}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full font-black text-xs ${
                            currentLevel === 'T'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : currentLevel === 'H'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {currentLevel === 'T'
                            ? 'Hoàn thành tốt (T)'
                            : currentLevel === 'H'
                            ? 'Hoàn thành (H)'
                            : 'Chưa hoàn thành (C)'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => handleUpdateEvaluation(stu.id, 'T')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                              currentLevel === 'T'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700'
                            }`}
                          >
                            T (Tốt)
                          </button>
                          <button
                            onClick={() => handleUpdateEvaluation(stu.id, 'H')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                              currentLevel === 'H'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-blue-700'
                            }`}
                          >
                            H (Đạt)
                          </button>
                          <button
                            onClick={() => handleUpdateEvaluation(stu.id, 'C')}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                              currentLevel === 'C'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700'
                            }`}
                          >
                            C (Chưa HT)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
