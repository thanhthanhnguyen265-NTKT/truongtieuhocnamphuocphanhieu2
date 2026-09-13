import React, { useState, useEffect } from 'react';
import {
  Shield,
  RotateCcw,
  Download,
  Upload,
  Clock,
  Users,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Database,
  Calendar,
  FileCheck2,
  ArrowDownToLine,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { storage } from '../services/storage';
import { DatabaseBackup } from '../types';

interface BackupRestoreViewProps {
  onOpenOwnerModal: (action: string) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ onOpenOwnerModal }) => {
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [saveStatusInfo, setSaveStatusInfo] = useState(storage.getSaveStatus());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'auto_import' | 'auto_edit' | 'manual'>('all');
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [manualReason, setManualReason] = useState('');

  const db = storage.getDb();
  const isAllowedToEdit = db.currentUser?.isOwner || db.isOwnerUnlocked;

  const refreshBackups = () => {
    setBackups(storage.getBackups());
    setSaveStatusInfo(storage.getSaveStatus());
  };

  useEffect(() => {
    refreshBackups();
    const unsub = storage.subscribe(() => {
      refreshBackups();
    });
    const unsubStatus = storage.subscribeSaveStatus(() => {
      setSaveStatusInfo(storage.getSaveStatus());
    });
    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCreateManualBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Tạo điểm sao lưu dữ liệu mới');
      return;
    }

    const reason = manualReason.trim() || 'Sao lưu chủ động trước khi thao tác';
    const newBk = storage.createBackup(reason, 'manual');
    setIsCreatingManual(false);
    setManualReason('');
    refreshBackups();
    showToast('success', `Đã tạo điểm sao lưu thành công (${newBk.studentCount} học sinh)!`);
  };

  const handleRestore = async (bk: DatabaseBackup) => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal(`Khôi phục dữ liệu từ bản sao lưu ${bk.reason}`);
      return;
    }

    const confirmed = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn khôi phục toàn bộ dữ liệu trường học về thời điểm:\n"${bk.reason}"\n(Thời gian: ${new Date(bk.timestamp).toLocaleString('vi-VN')}, gồm ${bk.studentCount} học sinh)?\n\nDữ liệu hiện tại sẽ được thay thế bằng bản sao lưu này.`
    );

    if (!confirmed) return;

    // First create safety snapshot of right now before restoring!
    storage.createBackup(`Tự động lưu trạng thái trước khi khôi phục bản (${bk.reason})`, 'auto_edit');

    const success = await storage.restoreBackup(bk.id);
    if (success) {
      refreshBackups();
      showToast('success', `Đã khôi phục thành công dữ liệu từ bản "${bk.reason}"!`);
    } else {
      showToast('error', 'Không thể khôi phục bản sao lưu. Dữ liệu có thể bị lỗi.');
    }
  };

  const handleDelete = (bk: DatabaseBackup) => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Xóa bản sao lưu dữ liệu');
      return;
    }

    if (window.confirm(`Bạn có chắc muốn xóa bản sao lưu này? (${bk.reason})`)) {
      storage.deleteBackup(bk.id);
      refreshBackups();
      showToast('success', 'Đã xóa bản sao lưu.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Khôi phục từ tệp JSON bên ngoài');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = storage.importBackupJson(text);
        if (result.success) {
          storage.createBackup('Khôi phục từ tệp JSON tải lên từ máy tính', 'manual');
          refreshBackups();
          showToast('success', result.message);
        } else {
          showToast('error', result.message);
        }
      } catch (err: any) {
        showToast('error', `Lỗi đọc tệp: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredBackups = backups.filter((bk) => {
    const matchesSearch =
      bk.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bk.performedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bk.classesSummary || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || bk.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3 ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border border-emerald-700'
              : 'bg-rose-900 text-rose-100 border border-rose-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Hệ thống bảo vệ dữ liệu trường học (Zero Data-Loss Guarantee)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Trung Tâm Sao Lưu & Khôi Phục Dữ Liệu Tự Động
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Hệ thống tự động sao lưu tức thời mỗi khi tải danh sách học sinh lên hệ thống, giáo viên nhập điểm danh, nhận xét hay phân công chuyên môn. Bạn luôn có thể quay lại bất kỳ thời điểm nào chỉ với 1 cú nhấp chuột.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCreatingManual(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bản sao lưu ngay</span>
          </button>

          <button
            onClick={() => storage.downloadBackupJson()}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 border border-slate-300/80 cursor-pointer"
            title="Tải toàn bộ cơ sở dữ liệu về máy tính dạng tệp JSON"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Tải JSON về máy</span>
          </button>

          <label className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 border border-slate-300/80 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Khôi phục từ file JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Manual Backup Modal */}
      {isCreatingManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Tạo bản sao lưu dữ liệu toàn diện</span>
            </div>
            <p className="text-xs text-slate-500">
              Hệ thống sẽ chụp lại ảnh toàn bộ {db.students?.length || 0} học sinh, {db.classes?.length || 0} lớp học, sổ nhận xét và điểm thi đua.
            </p>

            <form onSubmit={handleCreateManualBackup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú lý do sao lưu (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Ví dụ: Trước khi cập nhật danh sách lớp 5A..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingManual(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
                >
                  Xác nhận Sao lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 font-medium">Bản sao lưu đã lưu</div>
            <div className="text-lg font-black text-slate-900">{backups.length} bản</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 font-medium">Học sinh hiện tại</div>
            <div className="text-lg font-black text-blue-700">{db.students?.length || 0} học sinh</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 font-medium">Lớp học hiện có</div>
            <div className="text-lg font-black text-indigo-700">{db.classes?.length || 0} lớp</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 font-medium">Lần tự động lưu</div>
            <div className="text-sm font-bold text-amber-700">
              {saveStatusInfo.lastSavedTime || 'Mới cập nhật'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung sao lưu, lớp học..."
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-hidden cursor-pointer"
          >
            <option value="all">Tất cả loại sao lưu</option>
            <option value="auto_import">📥 Tự động khi nạp học sinh</option>
            <option value="auto_edit">✏️ Tự động khi giáo viên sửa</option>
            <option value="manual">🛡️ Sao lưu chủ động</option>
          </select>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Hiển thị: <strong className="text-blue-700">{filteredBackups.length}</strong> bản sao lưu
        </div>
      </div>

      {/* Backup Items List */}
      <div className="space-y-3">
        {filteredBackups.length > 0 ? (
          filteredBackups.map((bk) => {
            const dateStr = new Date(bk.timestamp).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <div
                key={bk.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 p-4 sm:p-5 shadow-xs transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {bk.type === 'auto_import' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <ArrowDownToLine className="w-3 h-3" />
                        Tự động khi nạp học sinh
                      </span>
                    )}
                    {bk.type === 'auto_edit' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Tự động khi nhập liệu
                      </span>
                    )}
                    {bk.type === 'manual' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Sao lưu chủ động
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>

                    <span className="text-[11px] text-slate-500">
                      bởi: <strong className="text-slate-700">{bk.performedBy}</strong>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{bk.reason}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{bk.studentCount} Học sinh</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{bk.classCount} Lớp học</span>
                    </div>

                    {bk.classesSummary && (
                      <div className="text-[11px] text-slate-500 truncate max-w-md">
                        Phân bổ: <span className="font-medium text-slate-700">{bk.classesSummary}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    onClick={() => handleRestore(bk)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Khôi phục toàn bộ danh sách học sinh và điểm về bản này"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục bản này</span>
                  </button>

                  <button
                    onClick={() => storage.downloadBackupJson(bk.id)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition cursor-pointer"
                    title="Tải tệp JSON của riêng bản sao lưu này"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(bk)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition cursor-pointer"
                    title="Xóa bản sao lưu này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Chưa tìm thấy bản sao lưu nào phù hợp</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hệ thống sẽ tự động tạo bản sao lưu ngay khi bạn tải lên danh sách học sinh hoặc nhập liệu lớp học.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
