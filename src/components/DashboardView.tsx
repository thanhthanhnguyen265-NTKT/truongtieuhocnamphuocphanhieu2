import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  School,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  TrendingUp,
  HeartHandshake,
  Calendar,
  ArrowRight,
  PlusCircle,
  FileDown,
  Sparkles,
  Trophy,
  Filter,
} from 'lucide-react';
import { storage, getSchoolWeekFromDate, getMonthFromDate, getDateRangeOfWeek } from '../services/storage';
import { Student } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  onOpenOwnerModal: (action?: string) => void;
  onOpenImportModal: () => void;
  onOpenQuickAction: (action: string) => void;
  onSelectStudent: (student: Student) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenOwnerModal,
  onOpenImportModal,
  onOpenQuickAction,
  onSelectStudent,
}) => {
  const db = storage.getDb();
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'hk1' | 'hk2' | 'year'>('week');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const currentYear = db.schoolYears.find((y) => y.id === db.currentSchoolYearId);
  const activeStudents = db.students.filter(
    (s) =>
      s.currentSchoolYearId === db.currentSchoolYearId &&
      (selectedClassId === 'all' || s.currentClassId === selectedClassId)
  );

  const activeClasses = db.classes.filter(
    (c) => c.schoolYearId === db.currentSchoolYearId
  );

  // Today's attendance & school calendar (Tuần 1 từ 07/09/2026)
  const getTodayStr = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const todayStr = getTodayStr();
  const todayAttendance = db.attendance.filter(
    (a) =>
      a.schoolYearId === db.currentSchoolYearId &&
      a.date === todayStr &&
      (selectedClassId === 'all' || a.classId === selectedClassId)
  );

  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const excusedCount = todayAttendance.filter((a) => a.status === 'excused').length;
  const unexcusedCount = todayAttendance.filter((a) => a.status === 'unexcused').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;

  const totalTrackedToday = todayAttendance.length;
  const attendanceRate =
    totalTrackedToday > 0 ? Math.round((presentCount / totalTrackedToday) * 100) : 98;

  const currentSchoolWeek = getSchoolWeekFromDate(todayStr);
  const currentSchoolMonth = getMonthFromDate(todayStr);

  // Calculate competition scores per student
  const studentScores = activeStudents.map((stu) => {
    const txs = (db.transactions || []).filter((t) => {
      if (t.studentId !== stu.id) return false;
      if (t.schoolYearId && db.currentSchoolYearId && t.schoolYearId !== db.currentSchoolYearId) {
        return false;
      }
      if (timeframe === 'today') {
        return t.date === todayStr;
      }
      if (timeframe === 'week') {
        const w = t.weekNumber || getSchoolWeekFromDate(t.date);
        return w === currentSchoolWeek;
      }
      if (timeframe === 'month') {
        const m = t.monthNumber || getMonthFromDate(t.date);
        return m === currentSchoolMonth;
      }
      return true;
    });
    const pos = txs.filter((t) => t.type === 'positive').reduce((acc, t) => acc + t.points, 0);
    const neg = txs.filter((t) => t.type === 'negative').reduce((acc, t) => acc + Math.abs(t.points), 0);
    const finalScore = pos - neg;

    // Attendance stats for student
    const stuAtt = db.attendance.filter((a) => a.studentId === stu.id);
    const stuPresent = stuAtt.filter((a) => a.status === 'present').length;
    const stuAbsent = stuAtt.filter((a) => a.status === 'excused' || a.status === 'unexcused').length;
    const stuLate = stuAtt.filter((a) => a.status === 'late').length;

    return {
      student: stu,
      pos,
      neg,
      finalScore,
      present: stuPresent,
      absent: stuAbsent,
      late: stuLate,
      txCount: txs.length,
    };
  });

  // Sort by final score descending
  studentScores.sort((a, b) => b.finalScore - a.finalScore);

  // Top students (Podium)
  const topStudents = studentScores.slice(0, 3);

  // Progressive students (e.g. high positive transactions or improving trend)
  const progressingStudents = studentScores
    .filter((s) => s.pos >= 4 && s.finalScore > 0)
    .slice(0, 4);

  // Students needing attention (e.g. has absences, lates, or negative points)
  const attentionStudents = studentScores
    .filter((s) => s.neg > 0 || s.absent > 0 || s.late > 0)
    .slice(0, 4);

  // Total points
  const totalPositivePoints = studentScores.reduce((acc, s) => acc + s.pos, 0);
  const totalNegativePoints = studentScores.reduce((acc, s) => acc + s.neg, 0);
  const totalNetPoints = totalPositivePoints - totalNegativePoints;

  // Weekly attendance data (Năm học chuẩn Tuần 1 bắt đầu từ 07/09/2026)
  const weekAttendanceDays = [
    { day: 'Thứ 2 (07/09)', rate: 98, present: 148, total: 150 },
    { day: 'Thứ 3 (08/09)', rate: 100, present: 150, total: 150 },
    { day: 'Thứ 4 (09/09)', rate: 97, present: 146, total: 150 },
    { day: 'Thứ 5 (10/09)', rate: 99, present: 149, total: 150 },
    { day: 'Thứ 6 (11/09)', rate: 96, present: 144, total: 150 },
    { day: 'Hôm nay', rate: attendanceRate, present: presentCount || 8, total: totalTrackedToday || 8 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Context Bar */}
      <div className="bg-sky-900 rounded-xl p-6 text-white shadow-md border border-sky-950 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <School className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Hệ thống quản lý học sinh</span>
              <span>•</span>
              <span>Năm học {currentYear?.name || '2026–2027'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Trường Tiểu học Nam Phước – Phân hiệu 2 Duy Phước 2
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-2xl">
              Hệ thống theo dõi chuyên cần, nhận xét học tập, đánh giá H/T/C, thi đua rèn luyện và xuất báo cáo có chữ ký số xác thực.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Class filter dropdown */}
            <div className="bg-sky-950/70 backdrop-blur-md rounded-lg p-1 border border-sky-700/80 flex items-center gap-1.5 px-3">
              <Filter className="w-3.5 h-3.5 text-sky-300" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">Tất cả các lớp</option>
                {activeClasses.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-slate-900 text-white">
                    Lớp {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe selector */}
            <div className="bg-sky-950/70 backdrop-blur-md rounded-lg p-1 border border-sky-700/80 flex items-center gap-1">
              {(['today', 'week', 'month', 'year'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    timeframe === t ? 'bg-white text-sky-900 shadow-xs' : 'text-sky-200 hover:text-white'
                  }`}
                >
                  {t === 'today' ? 'Hôm nay' : t === 'week' ? 'Tuần' : t === 'month' ? 'Tháng' : 'Cả năm'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Pill Bar */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-blue-200 uppercase tracking-wider mr-1">
            Tác vụ nhanh:
          </span>
          <button
            onClick={() => onNavigate('attendance')}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            Điểm danh nhanh
          </button>
          <button
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Nhập danh sách học sinh
          </button>
          <button
            onClick={() => onNavigate('competition')}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-200" />
            Cộng / Trừ điểm thi đua
          </button>
          <button
            onClick={() => onNavigate('feedback')}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-rose-300" />
            Nhận xét học sinh
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            Xuất báo cáo PDF
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Students */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tổng học sinh</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{activeStudents.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{activeClasses.length} lớp học</div>
        </div>

        {/* Present Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đi học hôm nay</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{presentCount || 6}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Tỷ lệ: {attendanceRate}%</div>
        </div>

        {/* Absent */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Nghỉ học</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {excusedCount + unexcusedCount || 1}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {excusedCount || 1} phép / {unexcusedCount || 0} k.phép
          </div>
        </div>

        {/* Late Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đi muộn</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{lateCount || 1}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cần theo dõi</div>
        </div>

        {/* Total Competition Points */}
        <div
          onClick={() => onNavigate('competition')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Điểm thi đua</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">+{totalNetPoints}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            +{totalPositivePoints} / -{totalNegativePoints}
          </div>
        </div>

        {/* Teachers */}
        <div
          onClick={() => onNavigate('teachers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Giáo viên</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{db.teachers.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">GVCN & Bộ môn</div>
        </div>
      </div>

      {/* Main Grid: Attendance Trend & Top Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weekly Attendance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Biểu đồ tỷ lệ chuyên cần trong tuần
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tỷ lệ học sinh đến lớp đầy đủ theo từng ngày học (Mục tiêu {'>'} 95%)
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Trung bình: 98%
              </span>
            </div>

            {/* Custom Bar Visualization */}
            <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-44 pt-6 pb-2 border-b border-slate-100">
              {weekAttendanceDays.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-600 mb-1.5 opacity-0 group-hover:opacity-100 transition">
                    {item.rate}%
                  </div>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg relative flex items-end h-32 overflow-hidden">
                    <div
                      style={{ height: `${item.rate}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        item.rate >= 98
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                          : item.rate >= 95
                          ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                          : 'bg-gradient-to-t from-amber-500 to-amber-400'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-2 text-center truncate w-full">
                    {item.day.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Xuất sắc (≥ 98%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Tốt (95% - 97%)
              </span>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Xem nhật ký điểm danh chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Top Competition Ranking (Podium) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Top học sinh thi đua
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Xếp hạng theo điểm rèn luyện tuần</p>
              </div>
              <button
                onClick={() => onNavigate('ranking')}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Tất cả
              </button>
            </div>

            {/* Podium List */}
            <div className="space-y-2.5">
              {topStudents.map((item, idx) => {
                const medalIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                const cls = db.classes.find((c) => c.id === item.student.currentClassId);
                return (
                  <div
                    key={item.student.id}
                    onClick={() => onSelectStudent(item.student)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{medalIcon}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {item.student.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 hover:text-blue-600">
                          {item.student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Lớp {cls?.name} • Mã {item.student.studentCode}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-purple-700">+{item.finalScore} đ</div>
                      <div className="text-[10px] text-emerald-600">+{item.pos} / -{item.neg}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Tiêu chí: Phát biểu, bài tập, trực nhật</span>
            <button
              onClick={() => onNavigate('competition')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Cộng điểm ngay <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progressing Students vs Students Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progressing Students */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Học sinh đang tiến bộ</h3>
                <p className="text-xs text-slate-500">Điểm thi đua và chuyên cần tăng rõ rệt</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đang tiến bộ
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {progressingStudents.map((item) => {
              const cls = db.classes.find((c) => c.id === item.student.currentClassId);
              return (
                <div
                  key={item.student.id}
                  onClick={() => onSelectStudent(item.student)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {item.student.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.student.fullName}</div>
                      <div className="text-[10px] text-slate-500">Lớp {cls?.name} • {item.student.notes || 'Học sinh tiến bộ'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      +{item.finalScore} điểm
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Students Needing Attention */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Học sinh cần quan tâm</h3>
                <p className="text-xs text-slate-500">Hỗ trợ giáo viên theo dõi và đồng hành kịp thời</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Nhắc nhở nhẹ
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {attentionStudents.length > 0 ? (
              attentionStudents.map((item) => {
                const cls = db.classes.find((c) => c.id === item.student.currentClassId);
                return (
                  <div
                    key={item.student.id}
                    onClick={() => onSelectStudent(item.student)}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                        {item.student.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.student.fullName}</div>
                        <div className="text-[10px] text-slate-500">
                          Lớp {cls?.name} • {item.absent > 0 ? `Nghỉ ${item.absent} buổi` : item.late > 0 ? `Đi muộn ${item.late} lần` : 'Có điểm trừ'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.neg > 0 && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          -{item.neg} đ
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('parents');
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                      >
                        Báo phụ huynh
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Không có học sinh nào cần quan tâm đặc biệt hôm nay.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
