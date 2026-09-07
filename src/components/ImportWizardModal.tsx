import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  ClipboardPaste,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  Edit2,
  Layers,
  Sparkles,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage } from '../services/storage';
import { Student } from '../types';
import { downloadSampleExcelTemplate } from '../services/excelExport';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClassId?: string;
  onOpenOwnerModal: (action: string) => void;
}

interface ParsedStudentRow {
  index: number;
  studentCode: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string;
  address: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  notes?: string;
  classId?: string;
  className?: string;
  isValid: boolean;
  error?: string;
}

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  isOpen,
  onClose,
  targetClassId,
  onOpenOwnerModal,
}) => {
  const db = storage.getDb();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [method, setMethod] = useState<'paste' | 'excel' | 'csv'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(
    targetClassId || db.classes[0]?.id || 'C4A'
  );
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // Sync selectedClass whenever modal opens or targetClassId changes
  useEffect(() => {
    if (isOpen) {
      if (targetClassId) {
        setSelectedClass(targetClassId);
      }
      setStep(1);
      setPasteText('');
      setParsedRows([]);
      setResultSummary(null);
    }
  }, [isOpen, targetClassId]);

  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [resultSummary, setResultSummary] = useState<{
    added: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  if (!isOpen) return null;

  const isAllowedToImport = db.currentUser?.isOwner || db.currentUser?.permissions?.import || db.isOwnerUnlocked;

  // STEP 2: Parse Paste Text
  const parsePasteInput = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const existingCodes = new Set(db.students.map((s) => s.studentCode));
    let nextNum = db.students.length + 1;

    const rows: ParsedStudentRow[] = lines.map((line, idx) => {
      // Check if line contains tabs or commas
      const isTab = line.includes('\t');
      const isComma = line.includes(',');
      const parts = isTab ? line.split('\t') : isComma ? line.split(',') : [line];

      let fullName = '';
      let gender: 'Nam' | 'Nữ' = 'Nam';
      let dateOfBirth = '2016-05-15';
      let address = 'Xã Duy Phước, Huyện Duy Xuyên';
      let parentName = '';
      let parentPhone = '';
      let studentCode = `HS${nextNum.toString().padStart(4, '0')}`;

      if (parts.length === 1) {
        // Just name e.g. "Nguyễn Văn An"
        fullName = parts[0].trim();
      } else if (parts.length >= 2) {
        // Example: STT | Ho ten | Gioi tinh | Ngay sinh ...
        // Check if first column is index
        const firstIsIndex = !isNaN(Number(parts[0].trim()));
        if (firstIsIndex && parts.length > 2) {
          fullName = parts[1].trim();
          if (parts[2]) {
            const g = parts[2].trim().toLowerCase();
            if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') gender = 'Nữ';
          }
          if (parts[3]) dateOfBirth = parts[3].trim();
          if (parts[4]) address = parts[4].trim();
          if (parts[5]) parentPhone = parts[5].trim();
        } else {
          fullName = parts[0].trim();
          if (parts[1]) {
            const g = parts[1].trim().toLowerCase();
            if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') gender = 'Nữ';
          }
          if (parts[2]) dateOfBirth = parts[2].trim();
          if (parts[3]) address = parts[3].trim();
        }
      }

      nextNum++;

      const isValid = fullName.length >= 2;
      const error = !isValid ? 'Thiếu họ và tên học sinh' : undefined;

      return {
        index: idx + 1,
        studentCode,
        fullName,
        gender,
        dateOfBirth,
        address,
        parentName,
        parentPhone,
        isValid,
        error,
      };
    });

    setParsedRows(rows);
    setStep(3);
  };

  // Upload Excel / CSV file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        let nextNum = db.students.length + 1;
        const rows: ParsedStudentRow[] = json.map((row: any, idx: number) => {
          // Flexible Vietnamese column mapping
          const fullName =
            row['Họ và tên'] ||
            row['Họ và Tên'] ||
            row['Họ tên'] ||
            row['Họ và tên học sinh'] ||
            row['Full Name'] ||
            row['Name'] ||
            '';

          const studentCode =
            row['Mã học sinh'] ||
            row['Mã HS'] ||
            row['Ma HS'] ||
            row['Student Code'] ||
            `HS${nextNum.toString().padStart(4, '0')}`;

          const rawGender = String(row['Giới tính'] || row['Giới Tính'] || row['Gender'] || 'Nam').toLowerCase();
          const gender: 'Nam' | 'Nữ' = rawGender.includes('nữ') || rawGender === 'f' || rawGender === 'female' ? 'Nữ' : 'Nam';

          const dateOfBirth = String(row['Ngày sinh'] || row['Ngày Sinh'] || row['DOB'] || '2016-05-15');
          const address = String(row['Địa chỉ'] || row['Địa Chỉ'] || row['Address'] || 'Xã Duy Phước');
          const parentName = String(row['Họ tên phụ huynh'] || row['Phụ huynh'] || row['Parent'] || '');
          const parentPhone = String(row['Số điện thoại'] || row['SĐT'] || row['Phone'] || '');
          const parentEmail = String(row['Email'] || '');
          const notes = String(row['Ghi chú'] || '');

          // Check if row specifies a class (e.g. "1B", "Lớp 1B", "Cô Lê Thị Vy")
          const classInRow = String(
            row['Lớp'] || row['Lớp học'] || row['Tên lớp'] || row['Class'] || row['GVCN'] || ''
          ).trim();
          let rowClassId = selectedClass;
          let rowClassName = '';
          if (classInRow) {
            const matchedCls = db.classes.find(
              (c) =>
                c.id.toLowerCase() === classInRow.toLowerCase() ||
                c.name.toLowerCase() === classInRow.toLowerCase() ||
                `lớp ${c.name.toLowerCase()}` === classInRow.toLowerCase() ||
                classInRow.toLowerCase().includes(c.name.toLowerCase()) ||
                (c.customTeacherName && classInRow.toLowerCase().includes(c.customTeacherName.toLowerCase()))
            );
            if (matchedCls) {
              rowClassId = matchedCls.id;
              rowClassName = matchedCls.name;
            }
          }

          nextNum++;
          const isValid = String(fullName).trim().length >= 2;

          return {
            index: idx + 1,
            studentCode: String(studentCode).trim(),
            fullName: String(fullName).trim(),
            gender,
            dateOfBirth,
            address,
            parentName,
            parentPhone,
            parentEmail,
            notes,
            classId: rowClassId,
            className: rowClassName,
            isValid,
            error: !isValid ? 'Dòng thiếu họ tên học sinh' : undefined,
          };
        });

        setParsedRows(rows);
        setStep(3);
      } catch (err: any) {
        alert(`Lỗi đọc tệp Excel/CSV: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (!isAllowedToImport) {
      onOpenOwnerModal('Nhập danh sách học sinh');
      return;
    }

    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Không có dòng dữ liệu học sinh hợp lệ để nạp vào lớp.');
      return;
    }

    const targetClass = db.classes.find((c) => c.id === selectedClass);
    let added = 0;
    let updatedCount = 0;
    let skipped = parsedRows.length - validRows.length;

    let newStudentsList = [...db.students];

    if (importMode === 'replace') {
      // Remove current students in this class
      newStudentsList = newStudentsList.filter(
        (s) => !(s.currentClassId === selectedClass && (s.currentSchoolYearId === db.currentSchoolYearId || s.currentSchoolYearId === 'SY2026_2027'))
      );
    }

    validRows.forEach((row) => {
      const stuClassId = row.classId || selectedClass;
      const stuClass = db.classes.find((c) => c.id === stuClassId) || targetClass;

      const existingIdx = newStudentsList.findIndex(
        (s) =>
          s.studentCode.trim().toLowerCase() === row.studentCode.trim().toLowerCase() ||
          (s.fullName.trim().toLowerCase() === row.fullName.trim().toLowerCase() && (s.currentClassId === stuClassId || s.currentClassId === stuClass?.name))
      );

      if (existingIdx >= 0 && importMode === 'merge') {
        newStudentsList[existingIdx] = {
          ...newStudentsList[existingIdx],
          fullName: row.fullName,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          address: row.address,
          parentName: row.parentName || newStudentsList[existingIdx].parentName,
          parentPhone: row.parentPhone || newStudentsList[existingIdx].parentPhone,
          currentClassId: stuClassId,
          currentGradeId: stuClass?.gradeId || newStudentsList[existingIdx].currentGradeId,
          updatedAt: new Date().toISOString(),
        };
        updatedCount++;
      } else {
        const newStu: Student = {
          id: `STU_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          studentCode: row.studentCode,
          fullName: row.fullName,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          address: row.address,
          parentName: row.parentName,
          parentPhone: row.parentPhone,
          parentEmail: row.parentEmail,
          currentClassId: stuClassId,
          currentGradeId: stuClass?.gradeId || targetClass?.gradeId || 'G1',
          currentSchoolYearId: db.currentSchoolYearId || 'SY2026_2027',
          notes: row.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newStudentsList.push(newStu);
        added++;
      }
    });

    const updatedDb = {
      ...db,
      students: newStudentsList,
    };

    storage.save(updatedDb, true, {
      category: 'Học sinh',
      action: `Nhập danh sách học sinh vào lớp ${targetClass?.name}`,
      details: `Đã nhập thành công ${added} học sinh mới, cập nhật ${updatedCount} học sinh theo phương thức ${importMode}.`,
    });

    setResultSummary({
      added,
      updated: updatedCount,
      skipped,
      errors: skipped,
    });
  };

  const handleFinish = () => {
    onClose();
    setStep(1);
    setPasteText('');
    setParsedRows([]);
    setResultSummary(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                Trình hướng dẫn 4 bước
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Nhập danh sách học sinh hàng loạt
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className={`font-bold flex items-center gap-1.5 ${step >= 1 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
              Phương thức
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-bold flex items-center gap-1.5 ${step >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
              Dữ liệu
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-bold flex items-center gap-1.5 ${step >= 3 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
              Xem trước & Sửa
            </span>
            <span className="text-slate-300">→</span>
            <span className={`font-bold flex items-center gap-1.5 ${step >= 4 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
              Nạp vào lớp
            </span>
          </div>

          <button
            onClick={downloadSampleExcelTemplate}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Excel mẫu (.xlsx)
          </button>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Result view if finished */}
          {resultSummary ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Hoàn tất nhập danh sách học sinh!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Dữ liệu học sinh đã được nạp thành công và tự động lưu vào cơ sở dữ liệu của trường.
              </p>

              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xl font-black text-emerald-700">+{resultSummary.added}</div>
                  <div className="text-[11px] text-emerald-800">Thêm mới</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-xl font-black text-blue-700">{resultSummary.updated}</div>
                  <div className="text-[11px] text-blue-800">Cập nhật</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xl font-black text-slate-700">{resultSummary.skipped}</div>
                  <div className="text-[11px] text-slate-600">Bỏ qua</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-xl font-black text-rose-700">{resultSummary.errors}</div>
                  <div className="text-[11px] text-rose-800">Dòng lỗi</div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Xong & Đóng cửa sổ
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Method selection */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Class Target Selector in Step 1 */}
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200">
                    <label className="block font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Chọn lớp học tiếp nhận danh sách học sinh:</span>
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-blue-300 rounded-xl bg-white text-blue-900 shadow-xs outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {db.classes
                        .filter((c) => !c.schoolYearId || c.schoolYearId === db.currentSchoolYearId || c.schoolYearId === 'SY2026_2027' || db.classes.length <= 10)
                        .map((c) => {
                          const matchedTeacher = db.teachers.find((t) => t.id === c.homeroomTeacherId);
                          const teacherName = c.customTeacherName || matchedTeacher?.fullName || 'Chưa phân công';
                          return (
                            <option key={c.id} value={c.id}>
                              Lớp {c.name} — GVCN: {teacherName}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="font-bold text-slate-800 text-sm">
                    Bước 1: Chọn phương thức nhập liệu phù hợp
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                      onClick={() => { setMethod('paste'); setStep(2); }}
                      className="p-4 rounded-xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center text-center space-y-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition">
                        <ClipboardPaste className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">A. Copy & Paste</div>
                      <p className="text-[11px] text-slate-500">
                        Copy trực tiếp các dòng từ Excel hoặc danh sách họ tên rồi dán vào ô nhập liệu.
                      </p>
                    </div>

                    <div
                      onClick={() => { setMethod('excel'); setStep(2); }}
                      className="p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 transition cursor-pointer flex flex-col items-center text-center space-y-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">B. Tải lên file Excel (.xlsx)</div>
                      <p className="text-[11px] text-slate-500">
                        Kéo thả tệp bảng tính Excel có sẵn. Tự động nhận diện cột tiếng Việt.
                      </p>
                    </div>

                    <div
                      onClick={() => { setMethod('csv'); setStep(2); }}
                      className="p-4 rounded-xl border-2 border-purple-200 hover:border-purple-600 bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer flex flex-col items-center text-center space-y-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center group-hover:scale-110 transition">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">C. Tải lên file CSV</div>
                      <p className="text-[11px] text-slate-500">
                        Nhập từ tệp CSV chuẩn mã UTF-8 hỗ trợ tiếng Việt có dấu đầy đủ.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Input Content */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 text-sm">
                      Bước 2: Cung cấp dữ liệu học sinh ({method === 'paste' ? 'Copy & Paste' : method === 'excel' ? 'File Excel' : 'File CSV'})
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Chọn lại phương thức
                    </button>
                  </div>

                  {method === 'paste' ? (
                    <div className="space-y-3">
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        💡 <strong>Gợi ý:</strong> Bạn có thể copy từ Excel (cột cách nhau bằng phím TAB) hoặc dán danh sách họ tên mỗi em một dòng. Ví dụ:
                        <pre className="mt-1 font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                          {`1\tNguyễn Văn An\tNam\t2016-03-15\tThôn Lang Châu Bắc\t0905111222\n2\tTrần Thị Bình\tNữ\t2016-07-22\tThôn Hà Nhuận\t0905222333`}
                        </pre>
                      </div>

                      <textarea
                        rows={9}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="Dán nội dung danh sách học sinh vào đây..."
                        className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={parsePasteInput}
                          disabled={!pasteText.trim()}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                        >
                          Phân tích dữ liệu & Xem trước <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer">
                        <input
                          type="file"
                          accept={method === 'excel' ? '.xlsx, .xls' : '.csv'}
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer block space-y-2">
                          <Upload className="w-10 h-10 text-blue-600 mx-auto" />
                          <div className="font-bold text-slate-800 text-sm">
                            Kéo thả hoặc nhấp để chọn tệp {method === 'excel' ? '.xlsx' : '.csv'}
                          </div>
                          <div className="text-xs text-slate-500">
                            Hỗ trợ tự động đọc: STT, Mã HS, Họ và tên, Giới tính, Ngày sinh, Địa chỉ, SĐT...
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Preview and Inline Edit */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        Bước 3: XEM TRƯỚC DỮ LIỆU & KIỂM TRA LỖI ({parsedRows.length} học sinh)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Kiểm tra trùng lặp, thiếu thông tin và chỉnh sửa trực tiếp trên bảng.
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Sửa dữ liệu đầu vào
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 w-10 text-center">STT</th>
                          <th className="p-2">Mã HS</th>
                          <th className="p-2">Họ và Tên</th>
                          <th className="p-2 text-center">Giới tính</th>
                          <th className="p-2">Ngày sinh</th>
                          <th className="p-2">Địa chỉ</th>
                          <th className="p-2">SĐT PH</th>
                          <th className="p-2 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parsedRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/70 text-rose-900'}
                          >
                            <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.studentCode}
                                onChange={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].studentCode = e.target.value;
                                  setParsedRows(updated);
                                }}
                                className="w-20 px-1 py-0.5 border border-slate-300 rounded font-mono font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.fullName}
                                onChange={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].fullName = e.target.value;
                                  updated[idx].isValid = e.target.value.trim().length >= 2;
                                  setParsedRows(updated);
                                }}
                                className="w-36 px-1.5 py-0.5 border border-slate-300 rounded font-bold"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <select
                                value={row.gender}
                                onChange={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].gender = e.target.value as any;
                                  setParsedRows(updated);
                                }}
                                className="px-1 py-0.5 border border-slate-300 rounded text-[11px]"
                              >
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.dateOfBirth}
                                onChange={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].dateOfBirth = e.target.value;
                                  setParsedRows(updated);
                                }}
                                className="w-24 px-1 py-0.5 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.address}
                                onChange={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].address = e.target.value;
                                  setParsedRows(updated);
                                }}
                                className="w-32 px-1 py-0.5 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.parentPhone}
                                onChange={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].parentPhone = e.target.value;
                                  setParsedRows(updated);
                                }}
                                className="w-24 px-1 py-0.5 border border-slate-300 rounded font-mono"
                              />
                            </td>
                            <td className="p-2 text-center">
                              {row.isValid ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                  Hợp lệ
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-300">
                                  Lỗi họ tên
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setStep(4)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      Tiếp tục nạp vào lớp <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Target class & Merge/Replace */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="font-bold text-slate-800 text-sm">
                    Bước 4: Chọn lớp tiếp nhận và Chế độ nạp
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Lớp tiếp nhận học sinh <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-blue-300 rounded-xl bg-blue-50/40 text-blue-900 focus:ring-2 focus:ring-blue-500"
                      >
                        {db.classes
                          .filter((c) => c.schoolYearId === db.currentSchoolYearId)
                          .map((c) => {
                            const matchedTeacher = db.teachers.find((t) => t.id === c.homeroomTeacherId);
                            const teacherName = c.customTeacherName || matchedTeacher?.fullName || 'Chưa phân công';
                            return (
                              <option key={c.id} value={c.id}>
                                Lớp {c.name} — GVCN: {teacherName}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Chế độ nạp dữ liệu <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                          />
                          <div>
                            <div className="font-bold text-slate-800">MERGE (Hợp nhất dữ liệu)</div>
                            <div className="text-[10px] text-slate-500">
                              Giữ học sinh cũ, thêm học sinh mới, nếu trùng mã HS thì cập nhật thông tin.
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                          />
                          <div>
                            <div className="font-bold text-rose-800">REPLACE ALL (Thay thế toàn bộ)</div>
                            <div className="text-[10px] text-rose-700">
                              Xóa sạch danh sách hiện tại của lớp và nạp danh sách mới này.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {importMode === 'replace' && (
                    <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>CẢNH BÁO NGUY HIỂM:</strong> Thao tác <em>Replace All</em> sẽ ghi đè và thay thế toàn bộ học sinh đang có trong lớp này. Vui lòng xác nhận kỹ lưỡng trước khi tiến hành.
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setStep(3)}
                      className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" /> Quay lại xem trước
                    </button>

                    <button
                      onClick={handleExecuteImport}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      Bắt đầu Nạp {parsedRows.filter((r) => r.isValid).length} học sinh
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
