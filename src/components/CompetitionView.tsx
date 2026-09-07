import React, { useState } from 'react';
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
} from 'lucide-react';
import { storage } from '../services/storage';
import { CompetitionCriterion, CompetitionTransaction } from '../types';
import { generateOfficialReportHtml } from '../services/pdfExport';

interface CompetitionViewProps {
  initialClassId?: string;
  onOpenOwnerModal: (action: string) => void;
}

export const CompetitionView: React.FC<CompetitionViewProps> = ({
  initialClassId,
  onOpenOwnerModal,
}) => {
  const db = storage.getDb();
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || db.classes[0]?.id || 'C4A'
  );
  const [viewTab, setViewTab] = useState<'scoring' | 'classRanking' | 'studentRanking' | 'criteria'>('scoring');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>(
    db.criteria[0]?.id || 'CR01'
  );
  const [note, setNote] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [scoringSuccess, setScoringSuccess] = useState('');

  const canScore = storage.canScoreCompetition(selectedClassId);
  const isAllowedToEdit = canScore.allowed;

  const currentClass = db.classes.find((c) => c.id === selectedClassId);
  const students = db.students.filter(
    (s) => s.currentClassId === selectedClassId && s.currentSchoolYearId === db.currentSchoolYearId
  );
  const selectedCriterion = db.criteria.find((c) => c.id === selectedCriterionId);

  // Toggle select student for batch scoring
  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  // Perform scoring
  const handleApplyScore = (e: React.FormEvent) => {
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
      alert('Vui lòng chọn ít nhất 1 học sinh để cộng/trừ điểm.');
      return;
    }
    if (!selectedCriterion) return;

    const teacher = db.currentUser || db.teachers.find((t) => t.id === currentClass?.homeroomTeacherId);
    const today = new Date().toISOString().split('T')[0];

    const newTransactions: CompetitionTransaction[] = selectedStudentIds.map((sid) => {
      return {
        id: `TX_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: sid,
        classId: selectedClassId,
        schoolYearId: db.currentSchoolYearId,
        criterionId: selectedCriterion.id,
        criterionName: selectedCriterion.name,
        type: selectedCriterion.type,
        points: selectedCriterion.points,
        date: today,
        weekNumber: 4,
        monthNumber: 9,
        note: note.trim() || undefined,
        teacherId: teacher?.id || 'T002',
        teacherName: teacher?.fullName || 'Giáo viên',
        createdAt: new Date().toISOString(),
      };
    });

    const updated = {
      ...db,
      transactions: [...newTransactions, ...db.transactions],
    };

    storage.save(updated, true, {
      category: 'Thi đua',
      action: `${selectedCriterion.type === 'positive' ? 'Cộng' : 'Trừ'} điểm thi đua`,
      details: `Áp dụng tiêu chí "${selectedCriterion.name}" (${selectedCriterion.points > 0 ? '+' : ''}${selectedCriterion.points}đ) cho ${selectedStudentIds.length} học sinh lớp ${currentClass?.name}.`,
    });

    setScoringSuccess(`Đã ghi nhận điểm cho ${selectedStudentIds.length} học sinh thành công!`);
    setSelectedStudentIds([]);
    setNote('');
    setTimeout(() => setScoringSuccess(''), 3000);
  };

  // Calculate Student Rankings
  const studentRankings = students.map((stu) => {
    const stuTx = db.transactions.filter((t) => t.studentId === stu.id);
    const pos = stuTx.filter((t) => t.type === 'positive').reduce((s, t) => s + t.points, 0);
    const neg = stuTx.filter((t) => t.type === 'negative').reduce((s, t) => s + Math.abs(t.points), 0);
    const total = pos - neg;
    return {
      student: stu,
      pos,
      neg,
      total,
      txCount: stuTx.length,
    };
  }).sort((a, b) => b.total - a.total);

  // Calculate Class Rankings (all classes)
  const classRankings = db.classes
    .filter((c) => c.schoolYearId === db.currentSchoolYearId)
    .map((c) => {
      const classTx = db.transactions.filter((t) => t.classId === c.id);
      const pos = classTx.filter((t) => t.type === 'positive').reduce((s, t) => s + t.points, 0);
      const neg = classTx.filter((t) => t.type === 'negative').reduce((s, t) => s + Math.abs(t.points), 0);
      const total = pos - neg;
      const classStudents = db.students.filter((s) => s.currentClassId === c.id);
      const teacher = db.teachers.find((t) => t.id === c.homeroomTeacherId);
      return {
        classRoom: c,
        total,
        studentCount: classStudents.length,
        teacherName: teacher?.fullName || 'Chưa phân',
      };
    })
    .sort((a, b) => b.total - a.total);

  // Export Ranking PDF
  const handlePrintRanking = () => {
    const tableRows = studentRankings.map((item, idx) => [
      (idx + 1).toString(),
      item.student.studentCode,
      item.student.fullName,
      item.student.gender,
      `+${item.pos}`,
      `-${item.neg}`,
      `+${item.total} đ`,
      idx === 0 ? 'Hạng Nhất (Vàng)' : idx === 1 ? 'Hạng Nhì (Bạc)' : idx === 2 ? 'Hạng Ba (Đồng)' : `Hạng ${idx + 1}`,
    ]);

    generateOfficialReportHtml({
      title: `BẢNG XẾP HẠNG THI ĐUA RÈN LUYỆN LỚP ${currentClass?.name || ''}`,
      subtitle: `Năm học: ${db.schoolYears.find((y) => y.id === db.currentSchoolYearId)?.name} • Trường TH Nam Phước`,
      dateRange: `Tổng kết Tuần 4 - Tháng 9`,
      periodType: 'week',
      tableHeaders: ['Hạng', 'Mã HS', 'Họ và tên', 'Giới tính', 'Điểm cộng', 'Điểm trừ', 'Tổng điểm', 'Danh hiệu'],
      tableRows,
      summaryStats: [
        { label: 'Tổng sĩ số', value: `${students.length} em` },
        { label: 'Học sinh dẫn đầu', value: studentRankings[0]?.student.fullName || '-' },
        { label: 'Điểm cao nhất', value: `+${studentRankings[0]?.total || 0} đ` },
        { label: 'Lớp xếp hạng', value: currentClass?.name || '-' },
      ],
      signerTitle: 'TỔNG PHỤ TRÁCH ĐỘI',
      signerName: 'Thanh Nguyễn',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5" />
            <span>Thi đua - Khen thưởng & Nề nếp tác phong</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Hệ thống Thi đua & Bảng vàng Rèn luyện
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cộng / Trừ điểm theo tiêu chí, xếp hạng tuần/tháng và trao danh hiệu tự động.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintRanking}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Xuất Báo cáo Thi đua & Chữ ký
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-white rounded-xl p-1.5 border border-slate-200 shadow-xs gap-1">
        <button
          onClick={() => setViewTab('scoring')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'scoring'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Chấm điểm thi đua (Cộng/Trừ)
        </button>

        <button
          onClick={() => setViewTab('studentRanking')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'studentRanking'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Bảng xếp hạng Học sinh Lớp {currentClass?.name}
        </button>

        <button
          onClick={() => setViewTab('classRanking')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'classRanking'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Medal className="w-4 h-4" />
          Bảng xếp hạng Toàn trường (Liên đội)
        </button>

        <button
          onClick={() => setViewTab('criteria')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            viewTab === 'criteria'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Danh mục Tiêu chí ({db.criteria.length})
        </button>
      </div>

      {/* VIEW TAB 1: SCORING */}
      {viewTab === 'scoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Class & Student picker */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Chọn lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="px-3 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50"
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  {selectedStudentIds.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn cả lớp'}
                </button>
                <span className="text-xs text-slate-500">
                  Đã chọn: <strong>{selectedStudentIds.length}</strong> / {students.length} em
                </span>
              </div>
            </div>

            {/* Students Grid Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {students.map((stu) => {
                const isSelected = selectedStudentIds.includes(stu.id);
                const stuTx = db.transactions.filter((t) => t.studentId === stu.id);
                const score = stuTx.reduce(
                  (s, t) => s + (t.type === 'positive' ? t.points : -Math.abs(t.points)),
                  0
                );

                return (
                  <div
                    key={stu.id}
                    onClick={() => toggleStudentSelection(stu.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{stu.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{stu.studentCode}</div>
                      </div>
                    </div>
                    <span className="font-bold text-purple-700 text-[11px]">+{score} đ</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Apply Criteria Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Áp dụng Tiêu chí thi đua
            </h3>

            {scoringSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scoringSuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplyScore} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn tiêu chí thi đua</label>
                <select
                  value={selectedCriterionId}
                  onChange={(e) => setSelectedCriterionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  <optgroup label="Cộng điểm (+)">
                    {db.criteria
                      .filter((c) => c.type === 'positive')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [+{c.points}đ] {c.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Trừ điểm (-)">
                    {db.criteria
                      .filter((c) => c.type === 'negative')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [-{Math.abs(c.points)}đ] {c.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {selectedCriterion && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    selectedCriterion.type === 'positive'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm">{selectedCriterion.name}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Phân loại: {selectedCriterion.category}
                    </div>
                  </div>
                  <div className="text-xl font-black">
                    {selectedCriterion.type === 'positive' ? `+${selectedCriterion.points}` : `-${Math.abs(selectedCriterion.points)}`} đ
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú cụ thể</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Giúp đỡ bạn chép bài khi ốm, nhặt được của rơi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={selectedStudentIds.length === 0}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Ghi nhận cho {selectedStudentIds.length} học sinh
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: STUDENT RANKING */}
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
                  +{studentRankings[1].total} đ
                </div>
                <div className="text-[10px] text-slate-400">Hạng Nhì</div>
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
                  +{studentRankings[0].total} đ
                </div>
                <div className="text-xs font-bold text-amber-800">Quán Quân Tuần</div>
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
                  +{studentRankings[2].total} đ
                </div>
                <div className="text-[10px] text-slate-400">Hạng Ba</div>
              </div>
            </div>
          )}

          {/* Full ranking table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Bảng vàng thi đua Lớp {currentClass?.name} ({studentRankings.length} học sinh)
              </span>
              <span className="text-slate-500">Cập nhật tự động theo thời gian thực</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-14">Hạng</th>
                    <th className="p-3">Mã HS</th>
                    <th className="p-3">Họ và Tên</th>
                    <th className="p-3 text-center">Giới tính</th>
                    <th className="p-3 text-center">Điểm cộng</th>
                    <th className="p-3 text-center">Điểm trừ</th>
                    <th className="p-3 text-center">Tổng điểm</th>
                    <th className="p-3">Danh hiệu trao tặng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentRankings.map((item, idx) => (
                    <tr key={item.student.id} className="hover:bg-slate-50 transition">
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
                          <span className="font-mono text-slate-500">{idx + 1}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700">{item.student.studentCode}</td>
                      <td className="p-3 font-bold text-slate-800">{item.student.fullName}</td>
                      <td className="p-3 text-center text-slate-600">{item.student.gender}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">+{item.pos}</td>
                      <td className="p-3 text-center font-bold text-rose-600">-{item.neg}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-black border border-purple-200">
                          +{item.total} đ
                        </span>
                      </td>
                      <td className="p-3">
                        {idx === 0 ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                            ⭐ Hoa Điểm Mười
                          </span>
                        ) : idx < 3 ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-300">
                            🌟 Kiện Tướng Chăm Ngoan
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Đạt chuẩn thi đua</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 3: CLASS RANKING */}
      {viewTab === 'classRanking' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Bảng xếp hạng Thi đua các Lớp toàn trường (Liên đội)
            </span>
            <span className="text-slate-500">Năm học {db.schoolYears.find((y) => y.id === db.currentSchoolYearId)?.name}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 text-center w-14">Hạng</th>
                  <th className="p-3">Lớp</th>
                  <th className="p-3">Khối</th>
                  <th className="p-3">Giáo viên chủ nhiệm</th>
                  <th className="p-3 text-center">Sĩ số</th>
                  <th className="p-3 text-center">Tổng điểm thi đua</th>
                  <th className="p-3">Cờ thi đua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classRankings.map((item, idx) => (
                  <tr key={item.classRoom.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-bold">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="p-3 font-black text-slate-800 text-sm">Lớp {item.classRoom.name}</td>
                    <td className="p-3 text-slate-600">{db.grades.find((g) => g.id === item.classRoom.gradeId)?.name}</td>
                    <td className="p-3 font-semibold text-slate-700">{item.teacherName}</td>
                    <td className="p-3 text-center font-bold text-slate-600">{item.studentCount} em</td>
                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-black text-xs border border-purple-300">
                        +{item.total} đ
                      </span>
                    </td>
                    <td className="p-3">
                      {idx === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300">
                          🚩 Cờ Xuất Sắc Tuần
                        </span>
                      ) : idx === 1 ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-300">
                          🏳️ Cờ Tiên Tiến
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TAB 4: CRITERIA LIST */}
      {viewTab === 'criteria' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-800">Danh mục Tiêu chí cộng / trừ điểm</h3>
              <p className="text-xs text-slate-500">Quy chuẩn tính điểm nề nếp thi đua toàn trường.</p>
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
                    cr.type === 'positive'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
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
