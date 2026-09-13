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
import { storage, normalizeStudentAddress } from '../services/storage';
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

// Helpers for robust parsing of dates and genders from Excel/CSV
function parseExcelDate(val: any): string {
  if (!val) return '2016-05-15';
  if (typeof val === 'number') {
    // Excel numeric date serial
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(val).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Match YYYY only
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }
  return '2016-05-15';
}

function parseGender(val: any, femaleVal?: any): 'Nam' | 'Nữ' {
  if (femaleVal !== undefined && femaleVal !== null && femaleVal !== '') {
    const fStr = String(femaleVal).trim().toLowerCase();
    if (fStr === 'x' || fStr === '1' || fStr === 'nữ' || fStr === 'nu' || fStr === 'v' || fStr === 'yes' || fStr === 'true') {
      return 'Nữ';
    }
  }
  if (!val) return 'Nam';
  const s = String(val).trim().toLowerCase();
  if (s.includes('nữ') || s.includes('nu') || s === 'female' || s === 'f' || s === 'gái') {
    return 'Nữ';
  }
  return 'Nam';
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
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace');
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

    const rawLines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const targetClass = db.classes.find((c) => c.id === selectedClass) || db.classes[0];

    const rows: ParsedStudentRow[] = [];
    let validCounter = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // Skip header lines like "STT | Họ và tên | Giới tính..."
      if (/^stt|^họ\s*và\s*tên|^họ\s*tên|^danh\s*sách|^stt\t/i.test(line)) {
        continue;
      }

      // Check delimiters
      const isTab = line.includes('\t');
      const isComma = line.includes(',');
      const isSemi = line.includes(';');
      const isPipe = line.includes('|');

      let parts: string[] = [];
      if (isTab) parts = line.split('\t');
      else if (isPipe) parts = line.split('|');
      else if (isSemi) parts = line.split(';');
      else if (isComma) parts = line.split(',');
      else parts = [line];

      parts = parts.map((p) => p.trim());

      let fullName = '';
      let gender: 'Nam' | 'Nữ' = 'Nam';
      let dateOfBirth = '2016-05-15';
      let address = 'Xã Nam Phước';
      let parentName = '';
      let parentPhone = '';

      if (parts.length === 1) {
        // Just name e.g. "Nguyễn Văn An" or "1. Nguyễn Văn An"
        fullName = parts[0].replace(/^\d+[\.\/\-\s]+/, '').trim();
      } else if (parts.length >= 2) {
        // Check if first column is an index (STT)
        const firstIsIndex = !isNaN(Number(parts[0]));
        const namePart = firstIsIndex ? parts[1] : parts[0];
        fullName = namePart.replace(/^\d+[\.\/\-\s]+/, '').trim();

        const offset = firstIsIndex ? 1 : 0;
        if (parts[offset + 1]) {
          gender = parseGender(parts[offset + 1]);
        }
        if (parts[offset + 2]) {
          dateOfBirth = parseExcelDate(parts[offset + 2]);
        }
        if (parts[offset + 3]) {
          address = normalizeStudentAddress(parts[offset + 3]);
        }
        if (parts[offset + 4]) {
          parentName = parts[offset + 4].trim();
        }
        if (parts[offset + 5]) {
          parentPhone = parts[offset + 5].trim();
        }
      }

      if (!fullName || fullName.length < 2) continue;

      validCounter++;
      const studentCode = `HS${targetClass.name.replace(/\s+/g, '')}_${validCounter.toString().padStart(2, '0')}`;

      rows.push({
        index: validCounter,
        studentCode,
        fullName,
        gender,
        dateOfBirth,
        address,
        parentName,
        parentPhone,
        classId: selectedClass,
        className: targetClass.name,
        isValid: true,
      });
    }

    if (rows.length === 0) {
      alert('Không tìm thấy họ tên học sinh hợp lệ trong văn bản dán.');
      return;
    }

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

        // 1. Get raw 2D array of rows
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          alert('Tệp Excel trống hoặc không đọc được dữ liệu.');
          return;
        }

        // 2. Locate header row
        let headerIdx = -1;
        let fullNameCol = -1;
        let lastNameCol = -1;
        let firstNameCol = -1;
        let codeCol = -1;
        let dobCol = -1;
        let genderCol = -1;
        let femaleCol = -1;
        let addressCol = -1;
        let parentCol = -1;
        let phoneCol = -1;
        let emailCol = -1;
        let notesCol = -1;

        const isHeaderLike = (cell: string) => {
          const c = cell.toLowerCase().trim();
          return (
            /họ\s*(và|&)?\s*tên|họ\s*tên|full\s*name/i.test(c) ||
            /họ\s*(và|&)?\s*(tên\s*đệm|chữ\s*đệm|đệm|lót)|^họ$/i.test(c) ||
            /^tên$|^tên\s*gọi$/i.test(c) ||
            /ngày\s*sinh|năm\s*sinh|dob|sinh\s*ngày/i.test(c) ||
            /mã\s*(hs|học\s*sinh|định\s*danh|số)|student\s*code/i.test(c) ||
            /giới\s*tính|gender/i.test(c) ||
            /^nữ$/i.test(c) ||
            /địa\s*chỉ|thường\s*trú|nơi\s*ở|chỗ\s*ở/i.test(c)
          );
        };

        // Scan rows 0 to min(25, rawRows.length - 1)
        for (let r = 0; r < Math.min(25, rawRows.length); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;
          const matchCount = row.filter((cell) => typeof cell === 'string' && isHeaderLike(cell)).length;
          if (matchCount >= 2 || (matchCount >= 1 && row.some((c) => /stt|họ\s*tên|họ\s*và\s*tên/i.test(String(c))))) {
            headerIdx = r;
            break;
          }
        }

        // Map column indices from header row
        if (headerIdx >= 0) {
          const headerRow = rawRows[headerIdx];
          headerRow.forEach((cellVal, colIdx) => {
            const c = String(cellVal || '').toLowerCase().trim();
            if (/họ\s*(và|&)?\s*tên|họ\s*tên|full\s*name|tên\s*học\s*sinh/i.test(c)) fullNameCol = colIdx;
            else if (/họ\s*(và|&)?\s*(tên\s*đệm|chữ\s*đệm|đệm|lót)|^họ$/i.test(c)) lastNameCol = colIdx;
            else if (/^tên$|^tên\s*gọi$/i.test(c) || (/tên/i.test(c) && !/họ|trường|lớp|cha|mẹ/i.test(c))) firstNameCol = colIdx;
            else if (/mã\s*(hs|học\s*sinh|định\s*danh|số)|student\s*code|^mã$/i.test(c)) codeCol = colIdx;
            else if (/ngày\s*sinh|năm\s*sinh|dob|sinh\s*ngày/i.test(c)) dobCol = colIdx;
            else if (/giới\s*tính|gender|nam\s*\/?\s*nữ/i.test(c)) genderCol = colIdx;
            else if (/^nữ$|^gái$/i.test(c)) femaleCol = colIdx;
            else if (/địa\s*chỉ|thường\s*trú|nơi\s*ở|chỗ\s*ở|quê\s*quán|hộ\s*khẩu|address/i.test(c)) addressCol = colIdx;
            else if (/phụ\s*huynh|cha\s*mẹ|họ\s*tên\s*cha|họ\s*tên\s*mẹ|người\s*giám\s*hộ|parent/i.test(c)) parentCol = colIdx;
            else if (/điện\s*thoại|sđt|số\s*đt|phone|liên\s*hệ/i.test(c)) phoneCol = colIdx;
            else if (/email|thư\s*điện\s*tử/i.test(c)) emailCol = colIdx;
            else if (/ghi\s*chú|note|khuyết\s*tật/i.test(c)) notesCol = colIdx;
          });
        }

        // Start processing rows after header, or from row 0 if no header found
        const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
        const targetClass = db.classes.find((c) => c.id === selectedClass) || db.classes[0];
        const parsed: ParsedStudentRow[] = [];
        let validCounter = 0;

        for (let r = startRow; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          // Check if row has any content
          const hasAnyContent = row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '');
          if (!hasAnyContent) continue;

          // Skip summary / footer rows
          const firstCellStr = String(row[0] || '').toLowerCase().trim();
          const secondCellStr = String(row[1] || '').toLowerCase().trim();
          if (
            firstCellStr.includes('tổng số') ||
            firstCellStr.includes('tổng cộng') ||
            firstCellStr.includes('giáo viên') ||
            firstCellStr.includes('hiệu trưởng') ||
            firstCellStr.includes('người lập') ||
            (firstCellStr.includes('ngày') && firstCellStr.includes('tháng')) ||
            secondCellStr.includes('tổng số') ||
            secondCellStr.includes('tổng cộng')
          ) {
            continue;
          }

          let fullName = '';
          if (fullNameCol >= 0 && row[fullNameCol]) {
            fullName = String(row[fullNameCol]).trim();
          } else if (lastNameCol >= 0 && firstNameCol >= 0) {
            fullName = `${String(row[lastNameCol] || '').trim()} ${String(row[firstNameCol] || '').trim()}`.trim();
          } else {
            // Fallback: find first cell that has 2+ words (typical Vietnamese name)
            for (let c = 0; c < Math.min(row.length, 5); c++) {
              const val = String(row[c] || '').trim();
              if (val.split(/\s+/).length >= 2 && !/^\d+$/.test(val) && !/nam|nữ/i.test(val)) {
                fullName = val;
                break;
              }
            }
          }

          // Strip leading numbering like "1. Nguyễn Văn An"
          fullName = fullName.replace(/^\d+[\.\/\-\s]+/, '').trim();

          if (!fullName || fullName.length < 2) {
            continue; // Skip non-student rows
          }

          validCounter++;

          let studentCode = codeCol >= 0 && row[codeCol] ? String(row[codeCol]).trim() : '';
          if (!studentCode) {
            studentCode = `HS${targetClass.name.replace(/\s+/g, '')}_${validCounter.toString().padStart(2, '0')}`;
          }

          const gender = parseGender(
            genderCol >= 0 ? row[genderCol] : undefined,
            femaleCol >= 0 ? row[femaleCol] : undefined
          );

          const dateOfBirth = parseExcelDate(dobCol >= 0 ? row[dobCol] : undefined);
          const rawAddress = addressCol >= 0 && row[addressCol] ? String(row[addressCol]) : '';
          const address = normalizeStudentAddress(rawAddress);
          const parentName = parentCol >= 0 && row[parentCol] ? String(row[parentCol]).trim() : '';
          const parentPhone = phoneCol >= 0 && row[phoneCol] ? String(row[phoneCol]).trim() : '';
          const parentEmail = emailCol >= 0 && row[emailCol] ? String(row[emailCol]).trim() : '';
          const notes = notesCol >= 0 && row[notesCol] ? String(row[notesCol]).trim() : '';

          parsed.push({
            index: validCounter,
            studentCode,
            fullName,
            gender,
            dateOfBirth,
            address,
            parentName,
            parentPhone,
            parentEmail,
            notes,
            classId: selectedClass,
            className: targetClass.name,
            isValid: true,
          });
        }

        if (parsed.length === 0) {
          alert('Không tìm thấy danh sách học sinh hợp lệ trong tệp Excel. Vui lòng kiểm tra lại cột Họ và tên.');
          return;
        }

        setParsedRows(parsed);
        setStep(3);
      } catch (err: any) {
        alert(`Lỗi đọc tệp Excel/CSV: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Execute Import: Đảm bảo tải lớp nào thì giữ nguyên số lượng và danh sách lớp đó, lớp khác không bị ảnh hưởng!
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

    const targetClass = db.classes.find((c) => c.id === selectedClass) || db.classes[0];

    // Check if a student belongs to target class
    const isStudentInTargetClass = (s: Student) => {
      if (!s) return false;
      if (s.currentClassId === targetClass.id) return true;
      if (s.currentClassId?.toLowerCase() === targetClass.name.toLowerCase()) return true;
      if (s.currentClassId?.toLowerCase() === `lớp ${targetClass.name.toLowerCase()}`) return true;
      return false;
    };

    // Keep all students in other classes 100% untouched and preserved
    const otherClassesStudents = db.students.filter((s) => !isStudentInTargetClass(s));
    const currentClassStudents = db.students.filter((s) => isStudentInTargetClass(s));

    let finalClassStudents: Student[] = [];
    let added = 0;
    let updatedCount = 0;

    if (importMode === 'replace') {
      // REPLACE MODE: Giữ nguyên chính xác số lượng và danh sách tải lên cho lớp này
      finalClassStudents = validRows.map((row, idx) => {
        let code = row.studentCode?.trim();
        if (!code) {
          code = `HS${targetClass.name.replace(/\s+/g, '')}_${(idx + 1).toString().padStart(2, '0')}`;
        }
        return {
          id: `STU_${targetClass.id}_${Date.now()}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
          studentCode: code,
          fullName: row.fullName.trim(),
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          address: normalizeStudentAddress(row.address),
          parentName: (row.parentName || '').trim(),
          parentPhone: (row.parentPhone || '').trim(),
          parentEmail: (row.parentEmail || '').trim(),
          currentClassId: targetClass.id,
          currentGradeId: targetClass.gradeId || 'G1',
          currentSchoolYearId: db.currentSchoolYearId || 'SY2026_2027',
          notes: (row.notes || '').trim(),
          chibiAvatarId: row.gender === 'Nữ' ? `chibi-girl-${(idx % 6) + 1}` : `chibi-boy-${(idx % 6) + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      added = finalClassStudents.length;
    } else {
      // MERGE MODE: Giữ học sinh cũ của lớp này, cập nhật hoặc bổ sung thêm
      finalClassStudents = [...currentClassStudents];
      validRows.forEach((row, idx) => {
        const normalizedAddress = normalizeStudentAddress(row.address);
        const existingIdx = finalClassStudents.findIndex(
          (s) =>
            s.studentCode.trim().toLowerCase() === row.studentCode.trim().toLowerCase() ||
            s.fullName.trim().toLowerCase() === row.fullName.trim().toLowerCase()
        );

        if (existingIdx >= 0) {
          finalClassStudents[existingIdx] = {
            ...finalClassStudents[existingIdx],
            fullName: row.fullName.trim(),
            gender: row.gender,
            dateOfBirth: row.dateOfBirth,
            address: normalizedAddress,
            parentName: (row.parentName || '').trim() || finalClassStudents[existingIdx].parentName,
            parentPhone: (row.parentPhone || '').trim() || finalClassStudents[existingIdx].parentPhone,
            updatedAt: new Date().toISOString(),
          };
          updatedCount++;
        } else {
          let code = row.studentCode?.trim();
          if (!code) {
            code = `HS${targetClass.name.replace(/\s+/g, '')}_${(finalClassStudents.length + 1).toString().padStart(2, '0')}`;
          }
          finalClassStudents.push({
            id: `STU_${targetClass.id}_${Date.now()}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
            studentCode: code,
            fullName: row.fullName.trim(),
            gender: row.gender,
            dateOfBirth: row.dateOfBirth,
            address: normalizedAddress,
            parentName: (row.parentName || '').trim(),
            parentPhone: (row.parentPhone || '').trim(),
            parentEmail: (row.parentEmail || '').trim(),
            currentClassId: targetClass.id,
            currentGradeId: targetClass.gradeId || 'G1',
            currentSchoolYearId: db.currentSchoolYearId || 'SY2026_2027',
            notes: (row.notes || '').trim(),
            chibiAvatarId: row.gender === 'Nữ' ? `chibi-girl-${(idx % 6) + 1}` : `chibi-boy-${(idx % 6) + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          added++;
        }
      });
    }

    // Combine: all other classes + this target class
    const updatedStudentsList = [...otherClassesStudents, ...finalClassStudents];

    const updatedDb = {
      ...db,
      students: updatedStudentsList,
      lastUpdated: new Date().toISOString(),
    };

    storage.save(updatedDb, true, {
      category: 'Học sinh',
      action: `Tải danh sách học sinh Lớp ${targetClass.name}`,
      details: `Đã nạp chính xác ${finalClassStudents.length} học sinh cho Lớp ${targetClass.name} (chế độ ${importMode}). Các lớp khác (${otherClassesStudents.length} học sinh) được giữ nguyên 100%.`,
    });

    // Auto-backup whenever student roster is imported
    storage.createBackup(
      `Tự động sao lưu: Tải danh sách học sinh Lớp ${targetClass.name} (${finalClassStudents.length} em)`,
      'auto_import'
    );

    setResultSummary({
      added,
      updated: updatedCount,
      skipped: parsedRows.length - validRows.length,
      errors: parsedRows.length - validRows.length,
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

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-left flex items-start gap-2.5 max-w-lg mx-auto">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-bold">Đã tự động sao lưu dữ liệu (Auto-Backup) thành công!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Hệ thống đã lưu ảnh chụp an toàn cho toàn bộ học sinh vừa nhập. Bạn có thể kiểm tra hoặc khôi phục lại bất cứ khi nào tại mục &quot;Sao lưu & Khôi phục&quot;.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
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

                  {/* Address Auto-Conversion Notification */}
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Chuẩn hóa địa chỉ:</strong> Tự động đổi toàn bộ địa chỉ từ <strong>"Duy Phước"</strong> thành <strong>"Nam Phước"</strong> theo quy chuẩn mới.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedRows((prev) =>
                          prev.map((r) => ({
                            ...r,
                            address: normalizeStudentAddress(r.address),
                          }))
                        );
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-[11px] shrink-0 transition cursor-pointer"
                    >
                      Đồng bộ lại Nam Phước
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
                          <th className="p-2">Địa chỉ (Nam Phước)</th>
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
                                onBlur={(e) => {
                                  const updated = [...parsedRows];
                                  updated[idx].address = normalizeStudentAddress(e.target.value);
                                  setParsedRows(updated);
                                }}
                                title="Địa chỉ (chuẩn hóa Nam Phước)"
                                className="w-36 px-1.5 py-0.5 border border-slate-300 rounded font-medium text-slate-800"
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
                        {db.classes.map((c) => {
                          const matchedTeacher = db.teachers.find((t) => t.id === c.homeroomTeacherId);
                          const teacherName = c.customTeacherName || matchedTeacher?.fullName || 'Chưa phân công';
                          const existingCount = db.students.filter(
                            (s) => s.currentClassId === c.id || s.currentClassId?.toLowerCase() === c.name.toLowerCase()
                          ).length;
                          return (
                            <option key={c.id} value={c.id}>
                              Lớp {c.name} ({existingCount} HS hiện tại) — GVCN: {teacherName}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Lớp được chọn sẽ tiếp nhận toàn bộ {parsedRows.filter((r) => r.isValid).length} học sinh từ file.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Chế độ nạp dữ liệu <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-blue-300 bg-blue-50/40 hover:bg-blue-50 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            className="mt-0.5"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                          />
                          <div>
                            <div className="font-bold text-blue-900 text-xs">
                              CẬP NHẬT CHUẨN XÁC THEO FILE (Khuyên dùng)
                            </div>
                            <div className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                              Lớp này sẽ có đúng chính xác <strong>{parsedRows.filter((r) => r.isValid).length} học sinh</strong> theo file tải lên. Danh sách của tất cả các lớp khác được bảo toàn 100%, không bị ảnh hưởng.
                            </div>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            className="mt-0.5"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                          />
                          <div>
                            <div className="font-bold text-slate-800 text-xs">BỔ SUNG THÊM VÀO LỚP</div>
                            <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                              Giữ nguyên học sinh cũ trong lớp này và bổ sung thêm học sinh mới từ file.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Safety Guarantee Box */}
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-emerald-900">Cam kết an toàn dữ liệu học sinh:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
                        <li>Tải lớp nào giữ nguyên số lượng và danh sách lớp đó, các lớp khác tuyệt đối không bị ảnh hưởng.</li>
                        <li>Đảm bảo đầy đủ thông tin, nạp đủ <strong>{parsedRows.filter((r) => r.isValid).length} học sinh</strong>, không bị thiếu sót hay mất học sinh.</li>
                        <li>Tự động chuẩn hóa địa chỉ: xóa "Huyện Duy Xuyên", hiển thị "Xã Nam Phước".</li>
                      </ul>
                    </div>
                  </div>

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
