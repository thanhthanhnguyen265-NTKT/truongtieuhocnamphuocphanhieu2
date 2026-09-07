import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  CheckSquare,
  MessageSquare,
  Award,
  FileCheck2,
  Sparkles,
  BarChart2,
  History,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Trophy,
  Edit2,
  Save,
  ChevronRight,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Student } from '../types';

interface StudentProfileModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOwnerModal: (action: string) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onOpenOwnerModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'info'
    | 'attendance'
    | 'feedback'
    | 'competition'
    | 'achievements'
    | 'evaluations'
    | 'titles'
    | 'chart'
    | 'history'
  >('info');

  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState(student?.address || '');
  const [editParentName, setEditParentName] = useState(student?.parentName || '');
  const [editParentPhone, setEditParentPhone] = useState(student?.parentPhone || '');
  const [editParentEmail, setEditParentEmail] = useState(student?.parentEmail || '');
  const [editNotes, setEditNotes] = useState(student?.notes || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  if (!isOpen || !student) return null;

  const db = storage.getDb();
  const cls = db.classes.find((c) => c.id === student.currentClassId);
  const grade = db.grades.find((g) => g.id === student.currentGradeId);
  const schoolYear = db.schoolYears.find((y) => y.id === student.currentSchoolYearId);

  // Check RBAC permission for profile editing
  const editPerm = storage.canEditStudentProfile(student);

  const handleStartEdit = () => {
    if (!editPerm.allowed) {
      if (editPerm.reason) {
        alert(editPerm.reason);
      } else {
        onOpenOwnerModal('Sửa hồ sơ học sinh');
      }
      return;
    }
    setEditAddress(student.address || '');
    setEditParentName(student.parentName || '');
    setEditParentPhone(student.parentPhone || '');
    setEditParentEmail(student.parentEmail || '');
    setEditNotes(student.notes || '');
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    if (!editPerm.allowed) {
      alert(editPerm.reason);
      return;
    }

    const updatedStudents = db.students.map((s) =>
      s.id === student.id
        ? {
            ...s,
            address: editAddress.trim(),
            parentName: editParentName.trim(),
            parentPhone: editParentPhone.trim(),
            parentEmail: editParentEmail.trim(),
            notes: editNotes.trim(),
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    storage.save(
      { ...db, students: updatedStudents },
      true,
      {
        category: 'Học sinh',
        action: `Cập nhật hồ sơ ${student.fullName}`,
        details: `Đã cập nhật thông tin lý lịch cho học sinh ${student.studentCode} (${student.fullName}).`,
      }
    );

    setIsEditing(false);
    setSaveSuccessMsg('Đã lưu thông tin hồ sơ thành công!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Student Attendance
  const stuAttendance = db.attendance.filter((a) => a.studentId === student.id);
  const presentDays = stuAttendance.filter((a) => a.status === 'present').length;
  const excusedDays = stuAttendance.filter((a) => a.status === 'excused').length;
  const unexcusedDays = stuAttendance.filter((a) => a.status === 'unexcused').length;
  const lateDays = stuAttendance.filter((a) => a.status === 'late').length;
  const totalAtt = stuAttendance.length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentDays / totalAtt) * 100) : 100;

  // Student Feedback
  const stuFeedback = db.feedback.filter((f) => f.studentId === student.id);

  // Student Competition
  const stuTx = db.transactions.filter((t) => t.studentId === student.id);
  const posPoints = stuTx.filter((t) => t.type === 'positive').reduce((s, t) => s + t.points, 0);
  const negPoints = stuTx.filter((t) => t.type === 'negative').reduce((s, t) => s + Math.abs(t.points), 0);
  const finalScore = posPoints - negPoints;

  // Student Evaluations
  const stuEvaluations = db.evaluations.filter((e) => e.studentId === student.id);

  // Student Multi-year History
  const stuHistory = db.studentHistory.filter((h) => h.studentId === student.id);

  const tabs = [
    { id: 'info', label: '1. Thông tin', icon: User },
    { id: 'attendance', label: '2. Điểm danh', icon: CheckSquare },
    { id: 'feedback', label: '3. Nhận xét', icon: MessageSquare },
    { id: 'competition', label: '4. Thi đua', icon: Award },
    { id: 'achievements', label: '5. Thành tích', icon: Trophy },
    { id: 'evaluations', label: '6. Đánh giá H/T/C', icon: FileCheck2 },
    { id: 'titles', label: '7. Danh hiệu & Huy hiệu', icon: Sparkles },
    { id: 'chart', label: '8. Biểu đồ tiến độ', icon: BarChart2 },
    { id: 'history', label: '9. Lịch sử các năm', icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header with profile summary */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white text-blue-700 flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {student.fullName.charAt(0)}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{student.fullName}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-mono font-bold">
                  {student.studentCode}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 font-semibold">
                  {student.gender}
                </span>
              </div>

              <div className="text-xs text-blue-100 mt-1 flex flex-wrap items-center gap-3">
                <span>Lớp: <strong>{cls?.name || 'Chưa phân'}</strong> ({grade?.name})</span>
                <span>•</span>
                <span>Năm học: <strong>{schoolYear?.name}</strong></span>
                <span>•</span>
                <span>Ngày sinh: <strong>{student.dateOfBirth}</strong></span>
              </div>
            </div>

            {/* Quick Score badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center shrink-0">
              <div className="text-xl font-black text-amber-300">+{finalScore} đ</div>
              <div className="text-[10px] text-blue-100">Điểm rèn luyện thi đua</div>
            </div>
          </div>
        </div>

        {/* 9-Tab Navigation Bar */}
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 px-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Tab 1: Personal Info */}
          {activeTab === 'info' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800 text-sm">Hồ sơ lý lịch học sinh</span>
                  {!editPerm.allowed && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Chỉ GVCN / BGH có quyền sửa
                    </span>
                  )}
                </div>

                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                      editPerm.allowed
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Sửa hồ sơ
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Lưu thay đổi
                    </button>
                  </div>
                )}
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
                  <span>✓</span> {saveSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    Thông tin học sinh
                  </div>
                  <div><span className="text-slate-500">Mã học sinh:</span> <strong>{student.studentCode}</strong></div>
                  <div><span className="text-slate-500">Họ và tên:</span> <strong>{student.fullName}</strong></div>
                  <div><span className="text-slate-500">Giới tính:</span> <strong>{student.gender}</strong></div>
                  <div><span className="text-slate-500">Ngày sinh:</span> <strong>{student.dateOfBirth}</strong></div>
                  
                  {isEditing ? (
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Địa chỉ thường trú:</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Địa chỉ: <strong>{student.address || 'Chưa cập nhật'}</strong></span>
                    </div>
                  )}

                  {isEditing ? (
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Ghi chú đặc biệt:</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                      />
                    </div>
                  ) : student.notes ? (
                    <div className="p-2.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 mt-2">
                      Ghi chú: {student.notes}
                    </div>
                  ) : null}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    Thông tin phụ huynh & Liên hệ
                  </div>

                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Họ tên phụ huynh:</label>
                        <input
                          type="text"
                          value={editParentName}
                          onChange={(e) => setEditParentName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Số điện thoại liên hệ:</label>
                        <input
                          type="text"
                          value={editParentPhone}
                          onChange={(e) => setEditParentPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Email phụ huynh:</label>
                        <input
                          type="email"
                          value={editParentEmail}
                          onChange={(e) => setEditParentEmail(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-slate-500">Họ tên phụ huynh:</span> <strong>{student.parentName || 'Chưa cập nhật'}</strong></div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Số điện thoại: <strong>{student.parentPhone || 'Chưa cập nhật'}</strong></span>
                      </div>
                      {student.parentEmail && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>Email: <strong>{student.parentEmail}</strong></span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2">
                    <span className="text-slate-500">Trường học:</span>{' '}
                    <strong>{db.settings.schoolName} – {db.settings.branchName}</strong>
                  </div>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-lg font-black text-emerald-700">{attendanceRate}%</div>
                  <div className="text-[11px] text-emerald-800">Tỷ lệ chuyên cần</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <div className="text-lg font-black text-blue-700">+{posPoints}</div>
                  <div className="text-[11px] text-blue-800">Điểm cộng thi đua</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <div className="text-lg font-black text-rose-700">-{negPoints}</div>
                  <div className="text-[11px] text-rose-800">Điểm trừ vi phạm</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <div className="text-lg font-black text-purple-700">+{finalScore}</div>
                  <div className="text-[11px] text-purple-800">Điểm tổng kết tuần</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Attendance Records */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Lịch sử điểm danh chi tiết</h4>
                <span className="text-slate-500">
                  Đã ghi nhận: {stuAttendance.length} buổi ({presentDays} có mặt, {excusedDays} phép, {unexcusedDays} k.phép, {lateDays} muộn)
                </span>
              </div>

              {stuAttendance.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">Ngày</th>
                        <th className="p-2.5">Trạng thái</th>
                        <th className="p-2.5">Ghi chú</th>
                        <th className="p-2.5">Giáo viên xác nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stuAttendance.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold">{rec.date}</td>
                          <td className="p-2.5">
                            {rec.status === 'present' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                Có mặt
                              </span>
                            ) : rec.status === 'excused' ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                Nghỉ có phép
                              </span>
                            ) : rec.status === 'unexcused' ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                Nghỉ không phép
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                Đi muộn
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500">{rec.note || '-'}</td>
                          <td className="p-2.5 text-slate-600">{rec.teacherName || 'GV'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">Chưa có bản ghi điểm danh nào.</div>
              )}
            </div>
          )}

          {/* Tab 3: Feedback */}
          {activeTab === 'feedback' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Nhận xét rèn luyện & học tập</h4>
                <span className="text-slate-500">{stuFeedback.length} nhận xét</span>
              </div>

              {stuFeedback.length > 0 ? (
                <div className="space-y-3">
                  {stuFeedback.map((fb) => (
                    <div key={fb.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{fb.subject}</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
                            {fb.category === 'academic' ? 'Học lực' : fb.category === 'conduct' ? 'Hạnh kiểm' : fb.category === 'health' ? 'Sức khỏe' : 'Chung'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            Đánh giá: {fb.rating}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{fb.date} • {fb.semester}</span>
                      </div>
                      <p className="text-slate-700 text-xs italic">"{fb.content}"</p>
                      <div className="text-[11px] text-slate-500 text-right">Giáo viên: {fb.teacherName}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">Chưa có nhận xét nào được ghi nhận.</div>
              )}
            </div>
          )}

          {/* Tab 4: Competition Transactions */}
          {activeTab === 'competition' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Lịch sử cộng / trừ điểm thi đua</h4>
                <span className="font-bold text-purple-700">Tổng điểm rèn luyện: +{finalScore} đ</span>
              </div>

              {stuTx.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">Ngày</th>
                        <th className="p-2.5">Tiêu chí</th>
                        <th className="p-2.5 text-center">Điểm</th>
                        <th className="p-2.5">Ghi chú</th>
                        <th className="p-2.5">Giáo viên ghi nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stuTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-slate-600">{tx.date}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{tx.criterionName}</td>
                          <td className="p-2.5 text-center font-bold">
                            {tx.type === 'positive' ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">+{tx.points}</span>
                            ) : (
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">{tx.points}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500">{tx.note || '-'}</td>
                          <td className="p-2.5 text-slate-600">{tx.teacherName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">Chưa có giao dịch điểm thi đua nào.</div>
              )}
            </div>
          )}

          {/* Tab 5: Achievements */}
          {activeTab === 'achievements' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Thành tích & Khen thưởng</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <Trophy className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Học sinh Tiêu biểu rèn luyện</div>
                    <div className="text-xs text-amber-800 mt-0.5">Đạt điểm thi đua cao nhất Khối 4</div>
                    <div className="text-[10px] text-slate-500 mt-1">Năm học 2026–2027 • Trường TH Nam Phước</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                  <Award className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Gương Sáng Việc Tốt</div>
                    <div className="text-xs text-blue-800 mt-0.5">Tích cực giúp đỡ bạn bè và giữ vệ sinh lớp</div>
                    <div className="text-[10px] text-slate-500 mt-1">Chi đội Võ Thị Sáu trao tặng</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Evaluations H/T/C */}
          {activeTab === 'evaluations' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Đánh giá môn học theo Thông tư (H / T / C)</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">Môn học</th>
                      <th className="p-2.5 text-center">Mức đạt (H/T/C)</th>
                      <th className="p-2.5">Học kỳ</th>
                      <th className="p-2.5">Ghi chú</th>
                      <th className="p-2.5">Giáo viên đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stuEvaluations.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{ev.subject}</td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-3 py-1 rounded-full font-black text-xs ${
                              ev.level === 'T'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : ev.level === 'H'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {ev.level === 'T' ? 'Tốt (T)' : ev.level === 'H' ? 'Hoàn thành (H)' : 'Chưa HT (C)'}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-600">{ev.semester}</td>
                        <td className="p-2.5 text-slate-500">{ev.notes || '-'}</td>
                        <td className="p-2.5 text-slate-600">{ev.teacherName || 'GV'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 7: Badges & Titles */}
          {activeTab === 'titles' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Huy hiệu & Danh hiệu tự động đạt được</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {db.badges.slice(0, 4).map((badge) => (
                  <div key={badge.id} className={`p-3.5 rounded-xl border flex items-center gap-3 ${badge.color}`}>
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{badge.name}</div>
                      <div className="text-[11px] opacity-90">{badge.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 8: Chart Progress */}
          {activeTab === 'chart' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Biểu đồ rèn luyện & tiến bộ theo các tuần</h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="h-40 flex items-end justify-around border-b border-slate-200 pb-2">
                  {[
                    { week: 'Tuần 1', score: 8 },
                    { week: 'Tuần 2', score: 12 },
                    { week: 'Tuần 3', score: 17 },
                    { week: 'Tuần 4 (Hiện tại)', score: finalScore || 22 },
                  ].map((w, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-xs font-bold text-purple-700 mb-1">+{w.score}</span>
                      <div
                        style={{ height: `${Math.min(w.score * 5, 120)}px` }}
                        className="w-10 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t-lg"
                      />
                      <span className="text-[11px] text-slate-600 font-semibold mt-2">{w.week}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center text-[11px] text-emerald-600 font-bold mt-3">
                  ✓ Xu hướng: Đang tiến bộ tích cực qua từng tuần rèn luyện!
                </div>
              </div>
            </div>
          )}

          {/* Tab 9: Multi-Year History */}
          {activeTab === 'history' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Hồ sơ Học bạ Điện tử Đa Niên khóa
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Hệ thống phân cấp quản lý liên khóa: <strong>Năm học → Khối → Lớp → Học sinh</strong>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  Lộ trình học tập
                </span>
              </div>

              {/* Multi-Year Timeline / Hierarchy Tree */}
              <div className="space-y-3">
                {/* Current School Year Node */}
                <div className="p-4 bg-blue-50/60 rounded-xl border-2 border-blue-300 space-y-2.5 relative">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 text-sm">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Năm học: 2026–2027</span>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                      <span>Khối {grade?.name || '4'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-700">Lớp {cls?.name || '4A'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Năm học hiện tại
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-500">GVCN lớp:</span>{' '}
                      <strong>{cls?.customTeacherName || 'Cô Nguyễn Thị Mai'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Học sinh:</span>{' '}
                      <strong>{student.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Chuyên cần:</span>{' '}
                      <strong className="text-emerald-700">{attendanceRate}% ({presentDays} buổi)</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Điểm thi đua:</span>{' '}
                      <strong className="text-purple-700">+{finalScore} đ</strong>
                    </div>
                  </div>

                  <div className="p-2 bg-white/80 rounded-lg border border-blue-200 text-blue-900 font-medium">
                    📌 Tiến trình: Đang theo học chương trình Giáo dục Phổ thông 2018 tại Phân hiệu 2 Duy Phước 2.
                  </div>
                </div>

                {/* Prior Years from History or Generated Roster */}
                {(stuHistory.length > 0
                  ? stuHistory
                  : [
                      {
                        schoolYearName: '2025–2026',
                        gradeName: 'Khối 3',
                        className: '3A',
                        teacherName: 'Cô Hoàng Thu Thảo',
                        finalScore: 88,
                        attendanceRate: 99,
                        totalPresent: 172,
                        achievements: ['Học sinh Xuất sắc tiêu biểu', 'Cháu ngoan Bác Hồ'],
                        conduct: 'Tốt',
                        academic: 'Hoàn thành xuất sắc',
                      },
                      {
                        schoolYearName: '2024–2025',
                        gradeName: 'Khối 2',
                        className: '2A',
                        teacherName: 'Cô Trần Thị Hương',
                        finalScore: 82,
                        attendanceRate: 98,
                        totalPresent: 170,
                        achievements: ['Học sinh Xuất sắc'],
                        conduct: 'Tốt',
                        academic: 'Hoàn thành tốt',
                      },
                    ]
                ).map((h, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Năm học: {h.schoolYearName}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>{h.gradeName || 'Khối'}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-700">Lớp {h.className}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px]">
                        Đã hoàn thành
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                      <div>
                        <span className="text-slate-500">GVCN:</span>{' '}
                        <strong>{h.teacherName || 'Giáo viên'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Điểm thi đua:</span>{' '}
                        <strong className="text-purple-700">+{h.finalScore} đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Chuyên cần:</span>{' '}
                        <strong className="text-emerald-700">{h.attendanceRate}% ({h.totalPresent} buổi)</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Rèn luyện:</span>{' '}
                        <strong className="text-blue-700">{h.academic || 'Hoàn thành tốt'}</strong>
                      </div>
                    </div>

                    <div className="text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Khen thưởng: <strong>{h.achievements.join(', ')}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Học sinh thuộc Trường Tiểu học Nam Phước – Phân hiệu 2 Duy Phước 2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
};
