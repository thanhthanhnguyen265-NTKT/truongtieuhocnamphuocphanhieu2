import React, { useState } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Lock,
  Save,
  Sparkles,
} from 'lucide-react';
import { storage } from '../services/storage';

interface SettingsViewProps {
  onOpenOwnerModal: (action: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenOwnerModal }) => {
  const db = storage.getDb();
  const [settings, setSettings] = useState(db.settings);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const isAllowedToEdit = db.currentUser?.isOwner || db.isOwnerUnlocked;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Lưu cấu hình hệ thống');
      return;
    }

    const updated = {
      ...db,
      settings,
    };

    storage.save(updated, true, {
      category: 'Hệ thống',
      action: 'Cập nhật cấu hình trường học',
      details: 'Đã lưu thông tin trường học, hiệu trưởng và bản quyền.',
    });

    setSaveMessage('Đã lưu cài đặt trường học thành công!');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Đổi mã PIN chủ sở hữu');
      return;
    }

    if (newPin !== confirmPin) {
      alert('Mã PIN xác nhận không trùng khớp.');
      return;
    }

    if (newPin.length < 4) {
      alert('Mã PIN phải có ít nhất 4 ký tự.');
      return;
    }

    const updated = {
      ...db,
      settings: {
        ...db.settings,
        ownerPin: newPin,
      },
    };

    storage.save(updated, true, {
      category: 'Hệ thống',
      action: 'Thay đổi mã PIN bảo mật chủ sở hữu',
      details: 'Đã cập nhật mã PIN bảo mật mới cho quyền sở hữu của Thanh Nguyễn.',
    });

    setSaveMessage('Đã đổi mã PIN bảo vệ thành công!');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  const handleExportBackup = () => {
    storage.downloadBackupJson();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Khôi phục cơ sở dữ liệu');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json && json.schoolYears && json.students) {
          storage.save(json, true, {
            category: 'Hệ thống',
            action: 'Khôi phục từ tệp JSON dự phòng',
            details: 'Toàn bộ cơ sở dữ liệu đã được nạp lại từ bản sao lưu.',
          });
          alert('Khôi phục dữ liệu sao lưu thành công!');
        } else {
          alert('Tệp sao lưu không đúng định dạng chuẩn.');
        }
      } catch (err: any) {
        alert(`Lỗi đọc tệp sao lưu: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetSampleData = () => {
    if (!isAllowedToEdit) {
      onOpenOwnerModal('Khôi phục dữ liệu mẫu');
      return;
    }

    if (
      confirm(
        'Bạn có chắc chắn muốn nạp lại dữ liệu mẫu của Trường Tiểu học Nam Phước – Phân hiệu 2 Duy Phước 2?'
      )
    ) {
      storage.resetToInitial();
      alert('Đã khôi phục dữ liệu mẫu thành công!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu hình hệ thống & Chủ quyền ứng dụng</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Cài đặt Hệ thống & Bản quyền Sở hữu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xác thực bản quyền Thanh Nguyễn, bảo mật mã PIN, sao lưu và phục hồi dữ liệu.
          </p>
        </div>

        {saveMessage && (
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {saveMessage}
          </div>
        )}
      </div>

      {/* Grid Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: School info & Copyright */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Thông tin Trường học & Chủ quyền Bản quyền
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tên trường chính</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phân hiệu trực thuộc</label>
              <input
                type="text"
                value={settings.branchName}
                onChange={(e) => setSettings({ ...settings, branchName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-blue-700"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Chủ sở hữu bản quyền</label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.copyrightOwner}
                  onChange={(e) => setSettings({ ...settings, copyrightOwner: e.target.value })}
                  className="w-full px-3 py-2 border border-purple-300 bg-purple-50/30 rounded-xl font-black text-purple-900"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                  Bản quyền pháp lý
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hiệu trưởng</label>
                <input
                  type="text"
                  value={settings.principalName}
                  onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại văn phòng</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Địa chỉ trường</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Lưu cài đặt trường học
              </button>
            </div>
          </form>
        </div>

        {/* Right: Security & Backup */}
        <div className="space-y-6">
          {/* Security PIN form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-600" />
              Đổi Mã PIN Bảo vệ Chủ sở hữu (Thanh Nguyễn)
            </h3>
            <p className="text-slate-500 text-[11px]">
              Mã PIN được yêu cầu khi bất kỳ người truy cập nào muốn chỉnh sửa, xóa, hoặc nạp học sinh.
            </p>

            <form onSubmit={handleChangePin} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã PIN mới</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Nhập 4-8 số"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Xác nhận PIN</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Xác nhận lại"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Cập nhật mã PIN
              </button>
            </form>
          </div>

          {/* Backup & Restore */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Sao lưu & Phục hồi cơ sở dữ liệu
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2 font-bold text-slate-700 text-left"
              >
                <Download className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div>Tải file sao lưu (.json)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Lưu về máy tính cá nhân</div>
                </div>
              </button>

              <label className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2 font-bold text-slate-700 text-left cursor-pointer">
                <Upload className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div>Khôi phục từ file (.json)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Tải tệp sao lưu đã có</div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Khôi phục về trạng thái mẫu ban đầu:</span>
              <button
                type="button"
                onClick={handleResetSampleData}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nạp lại dữ liệu mẫu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
