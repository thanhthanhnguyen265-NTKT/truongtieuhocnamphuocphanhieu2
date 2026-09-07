import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  UploadCloud,
  CheckCircle2,
  X,
  Undo2,
  Info,
} from 'lucide-react';
import { storage } from '../services/storage';

interface ClearStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport: () => void;
  currentYearName: string;
  currentYearId: string;
  currentClassName?: string;
  currentClassId?: string;
}

export const ClearStudentsModal: React.FC<ClearStudentsModalProps> = ({
  isOpen,
  onClose,
  onOpenImport,
  currentYearName,
  currentYearId,
  currentClassName,
  currentClassId,
}) => {
  const [scope, setScope] = useState<'sample' | 'year' | 'class' | 'all'>('sample');
  const [confirmed, setConfirmed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

  if (!isOpen) return null;

  const db = storage.getDb();
  const totalStudents = db.students.length;
  const yearStudentsCount = db.students.filter((s) => s.currentSchoolYearId === currentYearId).length;
  const classStudentsCount = currentClassId && currentClassId !== 'all'
    ? db.students.filter((s) => s.currentClassId === currentClassId).length
    : 0;

  const handleExecuteDelete = (openImportAfter = false) => {
    if (!confirmed && scope === 'all') {
      alert('Vui lòng tích vào ô xác nhận trước khi tiếp tục.');
      return;
    }

    const count = storage.clearStudents({
      scope,
      yearId: currentYearId,
      classId: currentClassId !== 'all' ? currentClassId : undefined,
    });

    setDeletedCount(count);
    setIsDone(true);

    if (openImportAfter) {
      setTimeout(() => {
        onClose();
        onOpenImport();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        {!isDone ? (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Xóa danh sách học sinh & Thay thế mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dọn sạch học sinh mẫu để tự tạo / nạp danh sách học sinh chuẩn xác
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs text-amber-800">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Lưu ý an toàn:</strong> Sau khi xóa, bạn có thể nhấn nút{' '}
                <span className="font-bold underline text-amber-900">Hoàn tác (Undo)</span> trên thanh công cụ
                bất cứ lúc nào nếu cần khôi phục lại dữ liệu trước đó.
              </div>
            </div>

            <div className="space-y-2.5 mb-5 text-xs">
              <label className="block font-bold text-slate-700 mb-1">
                Chọn phạm vi học sinh muốn xóa:
              </label>

              {/* Option 1: Sample students */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'sample'
                    ? 'border-red-500 bg-red-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="clearScope"
                  checked={scope === 'sample'}
                  onChange={() => setScope('sample')}
                  className="mt-0.5 text-red-600"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-800">
                    Xóa danh sách học sinh mẫu (Demo ban đầu)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Xóa các học sinh mẫu (mã HS0001 - HS0300) để bạn tự tạo học sinh mới của trường mình.
                  </div>
                </div>
              </label>

              {/* Option 2: Current year */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'year'
                    ? 'border-red-500 bg-red-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="clearScope"
                  checked={scope === 'year'}
                  onChange={() => setScope('year')}
                  className="mt-0.5 text-red-600"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-800">
                    Xóa toàn bộ học sinh {currentYearName} ({yearStudentsCount} học sinh)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Dọn sạch học sinh thuộc năm học này để nạp mới danh sách chính thức từ file Excel.
                  </div>
                </div>
              </label>

              {/* Option 3: Current class if selected */}
              {currentClassId && currentClassId !== 'all' && (
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    scope === 'class'
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearScope"
                    checked={scope === 'class'}
                    onChange={() => setScope('class')}
                    className="mt-0.5 text-red-600"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">
                      Chỉ xóa học sinh của lớp {currentClassName} ({classStudentsCount} học sinh)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Chỉ dọn sạch danh sách lớp này để chuẩn bị thay thế danh sách mới.
                    </div>
                  </div>
                </label>
              )}

              {/* Option 4: All students */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'all'
                    ? 'border-red-500 bg-red-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="clearScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mt-0.5 text-red-600"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-800">
                    Xóa sạch toàn bộ học sinh toàn trường ({totalStudents} học sinh)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Xóa trắng dữ liệu tất cả các năm học để khởi tạo hệ thống từ con số 0.
                  </div>
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span>Tôi đã hiểu và muốn tiếp tục</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Thoát
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDelete(false)}
                  disabled={!confirmed}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa danh sách
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDelete(true)}
                  disabled={!confirmed}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Xóa & Nhập mới ngay
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Đã xóa thành công {deletedCount} học sinh!
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Hệ thống đã dọn sạch danh sách. Bạn có thể tự thêm học sinh lẻ hoặc tải lên danh sách học sinh mới từ file Excel / dán văn bản.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <UploadCloud className="w-4 h-4" />
                Mở bộ tải lên Excel / Dán text
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
