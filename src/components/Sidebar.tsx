import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  CheckSquare,
  MessageSquare,
  FileCheck2,
  Award,
  ListOrdered,
  Medal,
  Sparkles,
  Trophy,
  BarChart3,
  FileText,
  UploadCloud,
  DownloadCloud,
  Database,
  PhoneCall,
  Settings,
  ShieldAlert,
  ChevronRight,
  School,
  BookOpen,
  BookMarked,
} from 'lucide-react';
import { storage } from '../services/storage';

export type ActiveTab =
  | 'dashboard'
  | 'schoolYears'
  | 'classes'
  | 'subjectClasses'
  | 'teachers'
  | 'students'
  | 'attendance'
  | 'feedback'
  | 'monthlyFeedback'
  | 'evaluation'
  | 'competition'
  | 'criteria'
  | 'achievements'
  | 'badges'
  | 'titles'
  | 'ranking'
  | 'analytics'
  | 'reports'
  | 'import'
  | 'export'
  | 'backup'
  | 'parents'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenOwnerModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenOwnerModal,
}) => {
  const db = storage.getDb();
  const currentYear = db.schoolYears.find((y) => y.id === db.currentSchoolYearId);
  const totalStudents = db.students.filter((s) => s.currentSchoolYearId === db.currentSchoolYearId).length;
  const isOwner = db.currentUser?.isOwner || db.isOwnerUnlocked;

  const handleNav = (tab: ActiveTab) => {
    onSelectTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const menuSections = [
    {
      group: 'CHÍNH',
      items: [
        { id: 'dashboard' as ActiveTab, label: 'Dashboard Tổng quan', icon: LayoutDashboard },
      ],
    },
    {
      group: 'QUẢN LÝ DỮ LIỆU',
      items: [
        { id: 'schoolYears' as ActiveTab, label: 'Năm học', icon: Calendar },
        { id: 'classes' as ActiveTab, label: 'Khối & Lớp', icon: Layers, count: db.classes.length },
        { id: 'subjectClasses' as ActiveTab, label: 'Lớp Chuyên / Nhô', icon: BookOpen, count: (db.subjectClasses || []).length },
        { id: 'teachers' as ActiveTab, label: 'Giáo viên', icon: Users, count: db.teachers.length },
        { id: 'students' as ActiveTab, label: 'Học sinh', icon: GraduationCap, count: totalStudents },
      ],
    },
    {
      group: 'ĐÁNH GIÁ & CHUYÊN CẦN',
      items: [
        { id: 'attendance' as ActiveTab, label: 'Điểm danh hàng ngày', icon: CheckSquare },
        { id: 'monthlyFeedback' as ActiveTab, label: 'Sổ Nhận xét Tháng (TT27)', icon: BookMarked, highlight: true },
        { id: 'feedback' as ActiveTab, label: 'Nhận xét học sinh', icon: MessageSquare, count: db.feedback.length },
        { id: 'evaluation' as ActiveTab, label: 'Đánh giá H / T / C', icon: FileCheck2 },
      ],
    },
    {
      group: 'THI ĐUA & KHEN THƯỞNG',
      items: [
        { id: 'competition' as ActiveTab, label: 'Thi đua cộng / trừ điểm', icon: Award },
        { id: 'criteria' as ActiveTab, label: 'Tiêu chí thi đua', icon: ListOrdered },
        { id: 'ranking' as ActiveTab, label: 'Bảng xếp hạng thi đua', icon: Trophy },
        { id: 'titles' as ActiveTab, label: 'Danh hiệu tự động', icon: Sparkles },
        { id: 'badges' as ActiveTab, label: 'Huy hiệu', icon: Medal },
      ],
    },
    {
      group: 'THỐNG KÊ & BÁO CÁO',
      items: [
        { id: 'analytics' as ActiveTab, label: 'Thống kê & Xu hướng', icon: BarChart3 },
        { id: 'reports' as ActiveTab, label: 'Báo cáo PDF & Chữ ký số', icon: FileText, highlight: true },
      ],
    },
    {
      group: 'DỮ LIỆU & HỆ THỐNG',
      items: [
        { id: 'import' as ActiveTab, label: 'Nhập học sinh (Wizard)', icon: UploadCloud },
        { id: 'export' as ActiveTab, label: 'Xuất dữ liệu Excel/CSV', icon: DownloadCloud },
        { id: 'backup' as ActiveTab, label: 'Sao lưu & Khôi phục (JSON)', icon: Database },
      ],
    },
    {
      group: 'GIAO TIẾP & CÀI ĐẶT',
      items: [
        { id: 'parents' as ActiveTab, label: 'Liên lạc Phụ huynh', icon: PhoneCall },
        { id: 'settings' as ActiveTab, label: 'Cài đặt hệ thống & Bản quyền', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 lg:w-72 bg-white text-slate-700 flex flex-col border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:h-full lg:z-10 lg:translate-x-0 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-900 text-white flex items-center justify-center font-bold text-base border-2 border-sky-600 shadow-xs shrink-0">
              NP
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-sky-900 uppercase tracking-tight truncate">
                Tiểu học Nam Phước
              </div>
              <div className="text-xs text-slate-500 truncate">
                Phân hiệu 2 Duy Phước 2
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                Năm học: {currentYear?.name || '2026–2027'}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
                {section.group}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between group transition ${
                        isActive
                          ? 'bg-sky-50 border border-sky-200 text-sky-800 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isActive ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-600 bg-sky-600 shadow-inner flex items-center justify-center shrink-0">
                            <span className="w-1 h-1 bg-white rounded-full"></span>
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0 group-hover:border-slate-400"></span>
                        )}
                        <Icon
                          className={`w-4 h-4 shrink-0 transition ${
                            isActive ? 'text-sky-700' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.count !== undefined && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              isActive
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-700" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Owner Copyright Footer Card */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
            <span>BẢN QUYỀN SỞ HỮU</span>
            <span className="text-[10px] text-emerald-600 font-bold">Xác thực</span>
          </div>
          <div className="font-bold text-slate-900 text-sm truncate">{db.settings.ownerName}</div>
          <div className="text-[11px] text-slate-500 truncate">{db.settings.ownerEmail}</div>

          <button
            onClick={onOpenOwnerModal}
            className="mt-3 w-full py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Hỏi ý kiến cấp quyền sửa</span>
          </button>
        </div>
      </aside>
    </>
  );
};
