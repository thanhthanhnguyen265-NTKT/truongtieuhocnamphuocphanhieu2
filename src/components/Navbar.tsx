import React, { useState, useEffect } from 'react';
import {
  School,
  ShieldCheck,
  Undo2,
  Calendar,
  User,
  PlusCircle,
  FileDown,
  CheckCircle2,
  Search,
  Menu,
  Sparkles,
  Lock,
  ChevronDown,
  Edit2,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Teacher } from '../types';
import { TeacherEditModal } from './TeacherEditModal';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenOwnerModal: (action?: string) => void;
  onOpenImportModal?: () => void;
  onOpenQuickAction?: (action: string) => void;
  onSearch?: (query: string) => void;
  activeSearchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenOwnerModal,
  onOpenImportModal,
  onOpenQuickAction,
  onSearch,
  activeSearchQuery,
  onSearchChange,
  searchQuery,
  onNavigate,
}) => {
  const [db, setDb] = useState(storage.getDb());
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showTeacherEdit, setShowTeacherEdit] = useState(false);
  const [canUndo, setCanUndo] = useState(storage.canUndo());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const currentSearch = searchQuery ?? activeSearchQuery ?? '';
  const handleSearchChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    if (onSearch) onSearch(val);
  };

  useEffect(() => {
    const unsubStatus = storage.subscribeSaveStatus((status, timeStr) => {
      setSaveStatus(status);
      setLastSavedTime(timeStr);
    });

    const unsubStorage = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
      setCanUndo(storage.canUndo());
    });

    return () => {
      unsubStatus();
      unsubStorage();
    };
  }, []);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = { ...db, currentSchoolYearId: e.target.value };
    storage.save(updated, true, {
      category: 'Hệ thống',
      action: 'Chuyển năm học làm việc',
      details: `Đã chọn năm học: ${db.schoolYears.find((y) => y.id === e.target.value)?.name}`,
    });
  };

  const handleSwitchUser = (teacher: Teacher) => {
    const updated = { ...db, currentUser: teacher };
    storage.save(updated, false);
    setUserMenuOpen(false);
  };

  const handleUndo = () => {
    if (storage.undo()) {
      // triggered via subscription
    }
  };

  const triggerQuickAction = (action: string) => {
    if (onOpenQuickAction) {
      onOpenQuickAction(action);
    } else if (onNavigate) {
      onNavigate(action);
    }
    setQuickMenuOpen(false);
  };

  const isOwner = db.currentUser?.isOwner || db.isOwnerUnlocked;

  return (
    <header className="sticky top-0 z-30 shadow-md">
      {/* Primary Professional Polish Header: Deep sky-900 with official school emblem */}
      <div className="bg-sky-900 text-white p-4 sm:p-5 flex flex-wrap justify-between items-center gap-4 shadow-lg border-b border-sky-950">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center border-2 border-sky-600 shrink-0 shadow-md">
            <span className="text-sky-900 font-bold text-xl sm:text-2xl tracking-tight">NP</span>
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold uppercase tracking-tight text-white leading-tight">
              Trường Tiểu học Nam Phước - Phân hiệu 2 Duy Phước 2
            </h1>
            <p className="text-sky-200 text-xs italic mt-0.5">
              Bản quyền sở hữu: {db.settings.ownerName || 'Thanh Nguyễn'}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-2 text-sky-100 text-xs sm:text-sm mb-1">
            {saveStatus === 'saving' ? (
              <>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                <span className="text-amber-200 font-medium">Đang tự động lưu...</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                <span className="text-rose-200 font-medium">Lỗi lưu dữ liệu</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-100 font-medium">Đã tự động lưu lúc {lastSavedTime}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-sky-300 uppercase font-medium hidden sm:block">
              Vui lòng hỏi ý kiến chủ sở hữu để sửa đổi
            </p>
            <button
              onClick={() => onOpenOwnerModal('Cấp quyền sửa đổi')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                isOwner
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                  : 'bg-red-500/30 text-red-200 border border-red-400/40 hover:bg-red-500/40'
              }`}
            >
              {isOwner ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Chủ sở hữu</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Hỏi ý kiến Thanh Nguyễn</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Utility Toolbar */}
      <div className="bg-sky-950 text-slate-200 px-4 py-2 flex items-center justify-between gap-3 border-t border-sky-800/80">
        {/* Left: Mobile hamburger & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-sky-200 hover:text-white hover:bg-sky-900 rounded-lg lg:hidden transition"
            title="Mở menu hệ thống"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-sky-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm kiếm học sinh (Mã HS, Họ tên, SĐT, Lớp)..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-sky-900/60 hover:bg-sky-900 focus:bg-sky-900 text-white placeholder-sky-300/70 border border-sky-700/80 rounded-lg focus:ring-1 focus:ring-sky-400 focus:border-sky-400 transition outline-hidden"
            />
            {currentSearch && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-sky-300 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Year selector, Undo, Quick Action, Role switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* School Year Selector */}
          <div className="flex items-center gap-1.5 bg-sky-900/80 border border-sky-700 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <select
              value={db.currentSchoolYearId}
              onChange={handleYearChange}
              className="bg-transparent text-xs font-semibold text-white outline-hidden cursor-pointer"
            >
              {db.schoolYears.map((sy) => (
                <option key={sy.id} value={sy.id} className="bg-slate-900 text-white">
                  {sy.name} {sy.isCurrent ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Undo Action Button */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Hoàn tác thao tác vừa thực hiện (Undo)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              canUndo
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer shadow-xs'
                : 'bg-sky-900/50 text-sky-500/60 border border-sky-800/40 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hoàn tác</span>
          </button>

          {/* Quick Action Dropdown */}
          <div className="relative">
            <button
              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tác vụ nhanh</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {quickMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 text-slate-800"
                onClick={() => setQuickMenuOpen(false)}
              >
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Lối tắt tác vụ
                </div>
                <button
                  onClick={() => triggerQuickAction('attendance')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Điểm danh nhanh lớp
                </button>
                {onOpenImportModal && (
                  <button
                    onClick={onOpenImportModal}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-800 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    Nhập học sinh (Copy / Excel)
                  </button>
                )}
                <button
                  onClick={() => triggerQuickAction('competition')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-800 flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4 text-amber-600" />
                  Cộng / Trừ điểm thi đua
                </button>
                <button
                  onClick={() => triggerQuickAction('reports')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-800 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-rose-600" />
                  Xuất báo cáo PDF / Excel
                </button>
              </div>
            )}
          </div>

          {/* User / Teacher Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 hover:bg-sky-900 rounded-lg border border-sky-700 transition text-white"
              title="Chuyển đổi vai trò người dùng"
            >
              <div className="w-6 h-6 rounded-md bg-white text-sky-900 flex items-center justify-center font-bold text-xs shadow-xs">
                {db.currentUser?.fullName ? db.currentUser.fullName.charAt(0) : 'T'}
              </div>
              <div className="text-left hidden lg:block leading-tight pr-1">
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  {db.currentUser?.fullName}
                  {isOwner && <span className="text-amber-400 text-xs">★</span>}
                </div>
                <div className="text-[10px] text-sky-200">
                  {db.currentUser?.role === 'admin'
                    ? 'Chủ sở hữu & BGH'
                    : db.currentUser?.role === 'homeroom'
                    ? 'GV Chủ nhiệm'
                    : db.currentUser?.role === 'subject'
                    ? 'GV Bộ môn'
                    : 'Khách (Chỉ xem)'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-sky-300" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in zoom-in-95 text-slate-800"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3 pb-2 mb-1 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{db.currentUser?.fullName}</div>
                    <div className="text-xs text-slate-500">{db.currentUser?.email}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {db.currentUser?.role === 'guest' ? (
                        <span className="text-red-600 font-semibold">Cần hỏi ý kiến Thanh Nguyễn để sửa</span>
                      ) : (
                        <span>Vai trò: {db.currentUser?.role === 'admin' ? 'Chủ sở hữu' : 'Giáo viên'}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTeacherEdit(true);
                      setUserMenuOpen(false);
                    }}
                    className="p-1 px-2 text-[10px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Thay đổi thông tin giáo viên"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Đổi thông tin</span>
                  </button>
                </div>

                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chuyển nhanh vai trò đăng nhập
                </div>

                {db.teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => handleSwitchUser(teacher)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition ${
                      db.currentUser?.id === teacher.id
                        ? 'bg-sky-50 text-sky-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{teacher.fullName}</div>
                      <div className="text-[10px] text-slate-500">
                        {teacher.role === 'admin'
                          ? '⭐ Chủ sở hữu / BGH'
                          : teacher.role === 'homeroom'
                          ? `🏫 GVCN lớp ${teacher.assignedClasses?.join(', ') || ''}`
                          : `📘 GV ${teacher.subjectsTaught?.join(', ') || 'Chuyên môn'} (${teacher.assignedClasses?.join(', ') || ''})`}
                      </div>
                    </div>
                    {db.currentUser?.id === teacher.id && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                  </button>
                ))}

                <div className="mt-2 pt-2 border-t border-slate-100 px-3">
                  <button
                    onClick={() => onOpenOwnerModal()}
                    className="w-full py-1.5 px-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Xác thực quyền Chủ sở hữu Thanh Nguyễn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teacher Edit Modal */}
      {showTeacherEdit && (
        <TeacherEditModal
          isOpen={showTeacherEdit}
          teacher={db.currentUser}
          onClose={() => setShowTeacherEdit(false)}
        />
      )}
    </header>
  );
};

