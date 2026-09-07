import React, { useState } from 'react';
import {
  History,
  Shield,
  Clock,
  User,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { storage } from '../services/storage';

interface AuditLogViewProps {
  onOpenOwnerModal: (action: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ onOpenOwnerModal }) => {
  const db = storage.getDb();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAllowedToUndo = db.currentUser?.isOwner || db.isOwnerUnlocked;

  const handleUndo = () => {
    if (!isAllowedToUndo) {
      onOpenOwnerModal('Hoàn tác thay đổi gần nhất');
      return;
    }
    const success = storage.undo();
    if (!success) {
      alert('Không còn thao tác nào trong hàng đợi hoàn tác.');
    }
  };

  const filteredLogs = db.auditLogs.filter((log) => {
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Kiểm toán & Giám sát bảo mật hệ thống</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Nhật ký Hoạt động & Lịch sử Thay đổi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi lại mọi hoạt động sửa đổi dữ liệu theo thời gian thực để phục vụ kiểm tra và hoàn tác.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            Hoàn tác thao tác gần nhất (Undo)
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo hành động, người thực hiện, chi tiết..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
        >
          <option value="all">Tất cả danh mục</option>
          <option value="Học sinh">Học sinh</option>
          <option value="Điểm danh">Điểm danh</option>
          <option value="Thi đua">Thi đua</option>
          <option value="Nhận xét">Nhận xét</option>
          <option value="Bảo mật & Quyền sở hữu Thanh Nguyễn">Bảo mật & Quyền sở hữu Thanh Nguyễn</option>
          <option value="Hệ thống">Hệ thống & Tự động lưu</option>
        </select>
      </div>

      {/* Logs Timeline / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Nhật ký kiểm toán ({filteredLogs.length} sự kiện)
          </span>
          <span className="text-slate-500">Chỉ chủ sở hữu (Thanh Nguyễn) mới có quyền hoàn tác</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 w-40">Thời gian</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Người thực hiện</th>
                <th className="p-3">Danh mục</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isBlocked = log.status === 'BLOCKED' || log.action.includes('[CHẶN]');
                  return (
                    <tr key={log.id} className={`transition ${isBlocked ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3">
                        {isBlocked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Bị chặn
                          </span>
                        ) : log.status === 'PENDING' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 border border-amber-200">
                            Chờ duyệt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Thành công
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          {log.performedBy}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.category}
                        </span>
                      </td>
                      <td className={`p-3 font-bold ${isBlocked ? 'text-rose-700' : 'text-blue-700'}`}>
                        {log.action}
                      </td>
                      <td className="p-3 text-slate-600 text-xs max-w-md">{log.details}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Chưa có nhật ký hoạt động nào được ghi nhận.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
