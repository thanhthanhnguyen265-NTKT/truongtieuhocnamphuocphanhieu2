import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  Users,
  GraduationCap,
  Calendar,
  Layers,
  ArrowUpRight,
  School,
  FileSpreadsheet,
  Printer,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { storage } from '../services/storage';

interface AnalyticsViewProps {
  onNavigate?: (tab: string, params?: any) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  const [db, setDb] = useState(storage.getDb());
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return () => unsub();
  }, []);

  const classes = db.classes || [];
  const students = db.students || [];
  const grades = db.grades || [];

  // Filter students by grade if selected
  const activeStudents = students.filter((s) => {
    if (selectedGradeFilter !== 'all') {
      return s.currentGradeId === selectedGradeFilter;
    }
    return true;
  });

  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === 'Nam').length;
  const femaleCount = students.filter((s) => s.gender === 'Nữ').length;

  // Attendance stats
  const totalAttendance = db.attendance.length;
  const presentAttendance = db.attendance.filter((a) => a.status === 'present').length;
  const overallAttendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 98;

  // Competition stats
  const totalPositive = db.transactions
    .filter((t) => t.type === 'positive')
    .reduce((sum, t) => sum + t.points, 0);
  const totalNegative = db.transactions
    .filter((t) => t.type === 'negative')
    .reduce((sum, t) => sum + Math.abs(t.points), 0);
  const netPoints = totalPositive - totalNegative;

  // Grade breakdown
  const gradeStats = grades.map((g) => {
    const gradeStudents = students.filter((s) => s.currentGradeId === g.id);
    const gradeClasses = classes.filter((c) => c.gradeId === g.id);
    return {
      grade: g,
      studentCount: gradeStudents.length,
      classCount: gradeClasses.length,
      percentage: totalStudents > 0 ? Math.round((gradeStudents.length / totalStudents) * 100) : 0,
    };
  });

  // Class breakdown
  const classStats = classes.map((c) => {
    const classStudents = students.filter(
      (s) =>
        s.currentClassId === c.id ||
        s.currentClassId?.toLowerCase() === c.id.toLowerCase() ||
        s.currentClassId === c.name ||
        s.currentClassId?.toLowerCase() === c.name.toLowerCase()
    );

    const classAtt = db.attendance.filter((a) => a.classId === c.id);
    const classPresent = classAtt.filter((a) => a.status === 'present').length;
    const attRate = classAtt.length > 0 ? Math.round((classPresent / classAtt.length) * 100) : 98;

    const classTxs = db.transactions.filter((t) => t.classId === c.id);
    const pts = classTxs.reduce((acc, t) => acc + (t.type === 'positive' ? t.points : -Math.abs(t.points)), 0);

    return {
      cls: c,
      studentCount: classStudents.length,
      attendanceRate: attRate,
      competitionPoints: pts,
    };
  });

  // Sort classes by competition points
  const rankedClasses = [...classStats].sort((a, b) => b.competitionPoints - a.competitionPoints);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
            <School className="w-4 h-4" />
            <span>Trường Tiểu học Nam Phước – Phân hiệu 2 Duy Phước 2</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-600" />
            <span>Thống Kê, Số Liệu & Xu Hướng Toàn Trường</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp dữ liệu chuyên cần, cơ cấu học sinh theo khối lớp, phong trào thi đua và kết quả đánh giá theo Thông tư 27.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Báo Cáo PDF / Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Tổng số học sinh</span>
            <GraduationCap className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{totalStudents}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Nam: {maleCount} • Nữ: {femaleCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>Tỷ lệ chuyên cần</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{overallAttendanceRate}%</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Mức chuyên cần toàn trường</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold mb-1">
            <span>Điểm thi đua rèn luyện</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">+{netPoints}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">
            +{totalPositive} điểm cộng / -{totalNegative} điểm trừ
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
            <span>Quy mô lớp học</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{classes.length}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">10 lớp chính khóa Khối 1 - 5</div>
        </div>
      </div>

      {/* Two Column Section: Grade Breakdown & Class Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Phân Bổ Học Sinh Theo Khối Lớp</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">5 Khối lớp</span>
          </h3>

          <div className="space-y-3 pt-1">
            {gradeStats.map((stat) => (
              <div key={stat.grade.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{stat.grade.name} ({stat.classCount} lớp)</span>
                  <span className="text-slate-900">{stat.studentCount} học sinh ({stat.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stat.percentage, 4)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Bình quân: {Math.round(totalStudents / (classes.length || 1))} học sinh/lớp</span>
            <span className="font-semibold text-sky-700">Chuẩn trường tiểu học</span>
          </div>
        </div>

        {/* Top Classes by Competition */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span>Bảng Xếp Hạng Phong Trào Thi Đua Lớp</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">Năm học 2026–2027</span>
          </h3>

          <div className="space-y-2">
            {rankedClasses.slice(0, 5).map((stat, idx) => (
              <div
                key={stat.cls.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-purple-50/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">
                      Lớp {stat.cls.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {stat.cls.customTeacherName || 'Giáo viên'} • {stat.studentCount} HS
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-purple-700">
                    +{stat.competitionPoints} đ
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Chuyên cần: {stat.attendanceRate}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('competition')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem chi tiết bảng xếp hạng thi đua</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Class by Class Comprehensive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Bảng Theo Dõi Tổng Hợp 10 Lớp Học (Phân hiệu 2)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Cập nhật theo dữ liệu thực tế
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Lớp Học</th>
                <th className="py-3 px-4">Giáo Viên Chủ Nhiệm</th>
                <th className="py-3 px-4 text-center">Sĩ Số</th>
                <th className="py-3 px-4 text-center">Chuyên Cần</th>
                <th className="py-3 px-4 text-center">Điểm Thi Đua</th>
                <th className="py-3 px-4 text-right">Tác Vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStats.map((item, idx) => (
                <tr key={item.cls.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                      Lớp {item.cls.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {item.cls.customTeacherName || 'Chưa cập nhật'}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">
                    {item.studentCount} HS
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.attendanceRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-black text-purple-700">
                    +{item.competitionPoints} đ
                  </td>
                  <td className="py-3 px-4 text-right">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('students', { classId: item.cls.id })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-800 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        Xem học sinh
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
