import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  MessageSquare,
  Search,
  Filter,
  Send,
  Copy,
  CheckCircle2,
  ExternalLink,
  Users,
  Calendar,
  AlertCircle,
  Plus,
  BookOpen,
  Layers,
  Sparkles,
  Phone,
  Mail,
  User,
  History,
  FileText,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Student, ParentNotificationTemplate, ParentCommunicationLog } from '../types';

interface ParentsViewProps {
  onNavigate?: (tab: string, params?: any) => void;
  onOpenOwnerModal?: (action: string) => void;
}

export const ParentsView: React.FC<ParentsViewProps> = ({ onNavigate, onOpenOwnerModal }) => {
  const [db, setDb] = useState(storage.getDb());
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'compose' | 'history'>('directory');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compose / Template states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('PT_ATTENDANCE');
  const [customMessage, setCustomMessage] = useState('');
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [previewText, setPreviewText] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'Zalo' | 'SMS' | 'Sổ liên lạc điện tử'>('Zalo');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return () => unsub();
  }, []);

  const classes = db.classes || [];
  const students = db.students || [];
  const templates = db.parentTemplates || [];
  const parentLogs = db.parentLogs || [];

  // Filter students by class and search query
  const filteredStudents = students.filter((s) => {
    if (selectedClassId !== 'all') {
      const cls = classes.find((c) => c.id === selectedClassId);
      const matchClass =
        s.currentClassId === selectedClassId ||
        s.currentClassId?.toLowerCase() === selectedClassId?.toLowerCase() ||
        (cls && (s.currentClassId === cls.name || s.currentClassId?.toLowerCase() === cls.name.toLowerCase()));
      if (!matchClass) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = s.fullName?.toLowerCase().includes(q);
    const matchCode = s.studentCode?.toLowerCase().includes(q);
    const matchParent = s.parentName?.toLowerCase().includes(q);
    const matchPhone = s.parentPhone?.toLowerCase().includes(q);
    return matchName || matchCode || matchParent || matchPhone;
  });

  // Calculate stats
  const totalStudentsCount = students.length;
  const studentsWithPhone = students.filter((s) => s.parentPhone && s.parentPhone.trim().length >= 8).length;
  const totalLogsCount = parentLogs.length;

  // Handle template selection & generation
  const handleSelectTemplate = (templateId: string, studentId?: string) => {
    setSelectedTemplateId(templateId);
    const t = templates.find((tmp) => tmp.id === templateId);
    if (!t) return;

    const stuId = studentId || targetStudentId || filteredStudents[0]?.id;
    if (!stuId) {
      setCustomMessage(t.template);
      setPreviewText(t.template);
      return;
    }

    const stu = students.find((s) => s.id === stuId);
    if (!stu) {
      setCustomMessage(t.template);
      setPreviewText(t.template);
      return;
    }

    const cls = classes.find((c) => c.id === stu.currentClassId);
    const dateStr = new Date().toLocaleDateString('vi-VN');

    // Get attendance stats for student
    const att = db.attendance.filter((a) => a.studentId === stu.id);
    const absentCount = att.filter((a) => a.status === 'excused' || a.status === 'unexcused').length;
    const lateCount = att.filter((a) => a.status === 'late').length;

    // Get competition points
    const txs = db.transactions.filter((tx) => tx.studentId === stu.id);
    const pos = txs.filter((tx) => tx.type === 'positive').reduce((sum, tx) => sum + tx.points, 0);
    const neg = txs.filter((tx) => tx.type === 'negative').reduce((sum, tx) => sum + Math.abs(tx.points), 0);
    const score = pos - neg;

    let text = t.template
      .replace(/{{student_name}}/g, stu.fullName)
      .replace(/{{class_name}}/g, cls?.name || 'Lớp')
      .replace(/{{date}}/g, dateStr)
      .replace(/{{attendance_status}}/g, absentCount > 0 ? 'có vắng học' : 'đi học đầy đủ')
      .replace(/{{absent_days}}/g, String(absentCount))
      .replace(/{{late_count}}/g, String(lateCount))
      .replace(/{{competition_score}}/g, String(score))
      .replace(/{{positive_points}}/g, String(pos))
      .replace(/{{negative_points}}/g, String(neg))
      .replace(/{{attendance_rate}}/g, '98')
      .replace(/{{teacher_comment}}/g, 'Chăm ngoan, tích cực tham gia các hoạt động.')
      .replace(/{{teacher_name}}/g, cls?.customTeacherName || db.currentUser?.fullName || 'Giáo viên')
      .replace(/{{urgent_note}}/g, 'chưa hoàn thành đủ bài tập về nhà môn Toán.');

    setCustomMessage(text);
    setPreviewText(text);
  };

  const handleOpenComposeForStudent = (stu: Student) => {
    setTargetStudentId(stu.id);
    setActiveSubTab('compose');
    handleSelectTemplate(selectedTemplateId, stu.id);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => {
      setCopiedId(null);
      setToastMessage('');
    }, 2000);
  };

  const handleSaveAndSend = () => {
    const stu = students.find((s) => s.id === targetStudentId) || filteredStudents[0];
    if (!stu) {
      alert('Vui lòng chọn học sinh để gửi thông báo.');
      return;
    }

    const newLog: ParentCommunicationLog = {
      id: `PL_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentId: stu.id,
      studentName: stu.fullName,
      parentName: stu.parentName || 'Phụ huynh',
      phone: stu.parentPhone || '',
      date: new Date().toISOString(),
      content: customMessage || previewText,
      channel: selectedChannel,
      status: 'Đã chuẩn bị',
    };

    const updatedDb = {
      ...db,
      parentLogs: [newLog, ...(db.parentLogs || [])],
    };

    storage.save(updatedDb, true, {
      category: 'Phụ huynh',
      action: 'Ghi nhật ký liên lạc',
      details: `Đã chuẩn bị tin nhắn gửi phụ huynh em ${stu.fullName} qua kênh ${selectedChannel}.`,
    });

    setToastMessage(`Đã lưu tin nhắn vào Nhật ký liên lạc (${selectedChannel})!`);
    setTimeout(() => setToastMessage(''), 2500);

    // If Zalo, offer to open
    const cleanPhone = stu.parentPhone?.replace(/\D/g, '');
    if (selectedChannel === 'Zalo' && cleanPhone) {
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
            <PhoneCall className="w-4 h-4" />
            <span>Kênh Thông Tin Nhà Trường – Phụ Huynh Học Sinh</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Sổ Liên Lạc & Thông Báo Phụ Huynh</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu số điện thoại phụ huynh, soạn tin nhắn tự động theo mẫu (vắng học, tiến độ rèn luyện, thi đua) và kết nối qua Zalo/SMS.
          </p>
        </div>

        {/* SubTab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'directory'
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Danh Bạ Phụ Huynh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('compose');
              handleSelectTemplate(selectedTemplateId);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'compose'
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Soạn Tin & Gửi Mẫu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký Gửi ({totalLogsCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Tổng số học sinh</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{totalStudentsCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Toàn phân hiệu</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>Đã có SĐT Phụ huynh</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{studentsWithPhone}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            Đạt {totalStudentsCount > 0 ? Math.round((studentsWithPhone / totalStudentsCount) * 100) : 0}% hồ sơ
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
            <span>Mẫu tin nhắn sẵn</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{templates.length}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Chuyên cần, thi đua, nề nếp</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold mb-1">
            <span>Lượt đã tương tác</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{totalLogsCount}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Lịch sử Zalo / SMS</div>
        </div>
      </div>

      {/* Toast message */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TAB 1: DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 shrink-0">Chọn lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white text-slate-800 outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Tất cả các lớp ({students.length} HS)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} {c.customTeacherName ? `(${c.customTeacherName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh, phụ huynh, SĐT..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium outline-hidden"
              />
            </div>
          </div>

          {/* Student & Parent List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Học Sinh</th>
                    <th className="py-3 px-4">Lớp</th>
                    <th className="py-3 px-4">Họ Tên Phụ Huynh</th>
                    <th className="py-3 px-4">Số Điện Thoại</th>
                    <th className="py-3 px-4">Địa Chỉ</th>
                    <th className="py-3 px-4 text-right">Thao Tác Nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((stu, idx) => {
                    const cls = classes.find((c) => c.id === stu.currentClassId);
                    const cleanPhone = stu.parentPhone?.replace(/\D/g, '') || '';
                    const hasPhone = cleanPhone.length >= 8;

                    return (
                      <tr key={stu.id} className="hover:bg-sky-50/50 transition">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{stu.fullName}</div>
                          <div className="text-[10px] text-slate-400">{stu.studentCode} • {stu.gender}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-800 font-bold border border-sky-200 text-[11px]">
                            Lớp {cls?.name || stu.currentClassId}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {stu.parentName || <span className="text-slate-400 italic">Chưa cập nhật</span>}
                        </td>
                        <td className="py-3 px-4">
                          {hasPhone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{stu.parentPhone}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(stu.parentPhone, stu.id)}
                                className="p-1 text-slate-400 hover:text-sky-600 rounded-md transition"
                                title="Sao chép SĐT"
                              >
                                {copiedId === stu.id ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa có SĐT</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {stu.address || 'Xã Duy Phước'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasPhone && (
                              <>
                                <a
                                  href={`https://zalo.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition"
                                  title="Mở trò chuyện Zalo"
                                >
                                  <span>Zalo</span>
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg transition"
                                  title="Gọi điện thoại"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenComposeForStudent(stu)}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-[11px] font-bold border border-sky-200 transition"
                            >
                              Soạn tin
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <div className="font-bold text-slate-700">Không tìm thấy phụ huynh học sinh nào</div>
                        <p className="text-xs text-slate-400 mt-1">
                          Hãy kiểm tra lại bộ lọc lớp hoặc nhập danh sách học sinh vào lớp.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPOSE & TEMPLATES */}
      {activeSubTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Template Chooser & Target Student */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>1. Chọn Mẫu Thông Báo</span>
            </h3>

            <div className="space-y-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'border-sky-400 bg-sky-50 text-sky-950 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">{tmpl.title}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tmpl.template}</div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block font-bold text-slate-700 text-xs mb-1">
                2. Học sinh nhận thông báo:
              </label>
              <select
                value={targetStudentId}
                onChange={(e) => {
                  setTargetStudentId(e.target.value);
                  handleSelectTemplate(selectedTemplateId, e.target.value);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white text-slate-800 outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Chọn học sinh trong danh sách --</option>
                {students.map((s) => {
                  const cls = classes.find((c) => c.id === s.currentClassId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({cls ? `Lớp ${cls.name}` : ''}) {s.parentPhone ? `- ${s.parentPhone}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">
                3. Kênh gửi thông báo:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Zalo', 'SMS', 'Sổ liên lạc điện tử'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedChannel(ch)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      selectedChannel === ch
                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Action */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Nội Dung Tin Nhắn Gửi Phụ Huynh</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {customMessage.length} ký tự
                </span>
              </div>

              <textarea
                rows={8}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Nội dung thông báo gửi đến phụ huynh học sinh..."
                className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 leading-relaxed outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />

              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Nội dung tự động chèn họ tên học sinh, lớp, giáo viên phụ trách và điểm rèn luyện thực tế.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopyText(customMessage, 'compose_text')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'compose_text' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>Sao chép nội dung</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndSend}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Lưu & Mở {selectedChannel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" />
              <span>Nhật Ký Liên Lạc & Thông Báo Phụ Huynh</span>
            </h3>
            <span className="text-xs text-slate-500">
              Tổng cộng {parentLogs.length} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Học Sinh</th>
                  <th className="py-3 px-4">Phụ Huynh & SĐT</th>
                  <th className="py-3 px-4">Kênh</th>
                  <th className="py-3 px-4">Nội Dung Đã Gửi</th>
                  <th className="py-3 px-4 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parentLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.date).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.studentName}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{log.parentName}</div>
                      <div className="text-[11px] text-slate-500">{log.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-100 text-sky-800">
                        {log.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="text-slate-700 text-xs line-clamp-2">{log.content}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {parentLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <div className="font-bold text-slate-700">Chưa có nhật ký thông báo phụ huynh nào</div>
                      <p className="text-xs text-slate-400 mt-1">
                        Khi giáo viên gửi tin nhắn hoặc mở Zalo liên lạc, thông tin sẽ được lưu tại đây.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
