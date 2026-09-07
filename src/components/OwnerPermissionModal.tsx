import React, { useState } from 'react';
import { Shield, Key, Mail, Phone, CheckCircle2, AlertTriangle, X, Lock, Send } from 'lucide-react';
import { storage } from '../services/storage';
import { PermissionRequest } from '../types';

interface OwnerPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized?: () => void;
  onGranted?: () => void;
  actionAttempted?: string;
  attemptedAction?: string;
}

export const OwnerPermissionModal: React.FC<OwnerPermissionModalProps> = ({
  isOpen,
  onClose,
  onAuthorized,
  onGranted,
  actionAttempted,
  attemptedAction,
}) => {
  const effectiveAction = actionAttempted || attemptedAction || 'sửa đổi dữ liệu';
  const handleSuccess = () => {
    if (onGranted) onGranted();
    if (onAuthorized) onAuthorized();
  };
  const db = storage.getDb();
  const [tab, setTab] = useState<'request' | 'pin'>('request');
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState('Giáo viên / Khách truy cập');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [reason, setReason] = useState(`Yêu cầu cấp quyền để thực hiện: ${actionAttempted}`);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !contactEmail.trim() || !reason.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ tên, Email và Lý do yêu cầu.');
      return;
    }

    const newRequest: PermissionRequest = {
      id: `REQ_${Date.now()}`,
      requesterName: requesterName.trim(),
      requesterRole,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      reason: reason.trim(),
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };

    const currentDb = storage.getDb();
    currentDb.permissionRequests = [newRequest, ...currentDb.permissionRequests];
    storage.save(currentDb, true, {
      category: 'Hệ thống',
      action: 'Gửi yêu cầu cấp quyền sửa đổi',
      details: `${requesterName} đã gửi yêu cầu cấp quyền sửa đổi đến chủ sở hữu Thanh Nguyễn.`,
    });

    setSuccessMsg('Đã gửi yêu cầu cấp quyền thành công tới Chủ sở hữu Thanh Nguyễn! Yêu cầu đang chờ phê duyệt.');
    setErrorMsg('');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 2500);
  };

  const handleVerifyOwnerPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default owner passcode for Thanh Nguyễn
    if (pin.trim() === '2605' || pin.trim().toLowerCase() === 'thanhnguyen' || pin.trim() === '123456') {
      const currentDb = storage.getDb();
      currentDb.isOwnerUnlocked = true;
      // Switch active user to owner if guest
      if (currentDb.currentUser.role === 'guest') {
        const ownerTeacher = currentDb.teachers.find((t) => t.isOwner) || currentDb.teachers[0];
        currentDb.currentUser = ownerTeacher;
      }
      storage.save(currentDb, true, {
        category: 'Hệ thống',
        action: 'Xác thực mã chủ sở hữu',
        details: 'Đã mở khóa quyền sửa đổi toàn hệ thống bởi chủ sở hữu Thanh Nguyễn.',
      });
      setSuccessMsg('Xác thực quyền chủ sở hữu thành công! Bạn có toàn quyền sửa đổi hệ thống.');
      setErrorMsg('');
      setTimeout(() => {
        setSuccessMsg('');
        handleSuccess();
        onClose();
      }, 1000);
    } else {
      setErrorMsg('Mã xác thực chủ sở hữu không chính xác. Vui lòng liên hệ Thanh Nguyễn (0905 123 456).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with official notice */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                Thông báo bản quyền & Bảo mật
              </div>
              <h2 className="text-lg font-bold leading-tight mt-0.5">
                Quyền sửa đổi thuộc sở hữu của Thanh Nguyễn
              </h2>
              <p className="text-xs text-red-100 mt-1">
                Trường Tiểu học Nam Phước - Phân hiệu 2 Duy Phước 2
              </p>
            </div>
          </div>
        </div>

        {/* Notice description */}
        <div className="p-5 border-b border-slate-100 bg-amber-50/60 text-slate-700 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900">Quy định truy cập:</span> Hệ thống được đăng ký bản quyền bởi{' '}
              <strong className="text-red-700 font-bold">Thanh Nguyễn</strong>. Người truy cập muốn sửa đổi, bổ sung hoặc xóa dữ liệu phải hỏi ý kiến và được chủ sở hữu phê duyệt trước khi thực hiện.
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setTab('request'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-sm font-semibold text-center flex items-center justify-center gap-2 border-b-2 transition ${
              tab === 'request'
                ? 'border-red-600 text-red-600 bg-red-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Gửi yêu cầu tới Thanh Nguyễn
          </button>
          <button
            onClick={() => { setTab('pin'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-sm font-semibold text-center flex items-center justify-center gap-2 border-b-2 transition ${
              tab === 'pin'
                ? 'border-red-600 text-red-600 bg-red-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            Tôi là Chủ sở hữu (Nhập PIN)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'request' ? (
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người yêu cầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Ví dụ: Thầy Trần Văn Nam"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung & Mục đích sửa đổi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ghi rõ lý do và những phần dữ liệu cần chỉnh sửa..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-hidden"
                  required
                />
              </div>

              {/* Owner contact card */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col gap-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-600" />
                  Kênh gửi trực tiếp đến Thanh Nguyễn:
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Email: <strong>{db.settings.ownerEmail}</strong></span>
                  <span>Hotline: <strong>{db.settings.ownerPhone}</strong></span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Gửi yêu cầu phê duyệt
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOwnerPin} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Xác thực quyền Chủ sở hữu</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nhập mã PIN hoặc mật khẩu quản trị của Thanh Nguyễn để kích hoạt quyền chỉnh sửa tức thì.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã PIN Chủ sở hữu (Mặc định: 2605)
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Nhập mã PIN..."
                  autoFocus
                  className="w-full px-4 py-2.5 text-center tracking-widest text-lg font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-hidden"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                💡 <em>Gợi ý thử nghiệm:</em> Nhập <strong>2605</strong> hoặc <strong>thanhnguyen</strong> để mở khóa nhanh quyền chủ sở hữu.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Mở khóa quyền
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
