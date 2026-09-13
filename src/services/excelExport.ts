import * as XLSX from 'xlsx';
import { AppDatabase } from '../types';
import { storage } from './storage';

export function exportFullSchoolExcel(db: AppDatabase, filename = 'Bao_Cao_Tong_Hop_Nam_Phuoc_DP2.xlsx') {
  const wb = XLSX.utils.book_new();

  // 1. Students Sheet
  const studentsData = db.students.map((s, idx) => {
    const cls = db.classes.find((c) => c.id === s.currentClassId);
    return {
      'STT': idx + 1,
      'Mã Học Sinh': s.studentCode,
      'Họ và Tên': s.fullName,
      'Giới Tính': s.gender,
      'Ngày Sinh': s.dateOfBirth,
      'Lớp': cls ? cls.name : '',
      'Địa Chỉ': s.address,
      'Họ Tên Phụ Huynh': s.parentName,
      'SĐT Phụ Huynh': s.parentPhone,
      'Email Phụ Huynh': s.parentEmail || '',
      'Ghi Chú': s.notes || '',
    };
  });
  const wsStudents = XLSX.utils.json_to_sheet(studentsData);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');

  // 2. Attendance Sheet
  const attendanceData = db.attendance.map((a, idx) => {
    const stu = db.students.find((s) => s.id === a.studentId);
    const cls = db.classes.find((c) => c.id === a.classId);
    const statusMap = {
      present: 'Có mặt',
      excused: 'Nghỉ có phép',
      unexcused: 'Nghỉ không phép',
      late: 'Đi muộn',
    };
    return {
      'STT': idx + 1,
      'Ngày': a.date,
      'Mã HS': stu ? stu.studentCode : '',
      'Họ và Tên': stu ? stu.fullName : '',
      'Lớp': cls ? cls.name : '',
      'Trạng Thái': statusMap[a.status] || a.status,
      'Ghi Chú': a.note || '',
      'Giáo Viên': a.teacherName || '',
    };
  });
  const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance');

  // 3. Feedback Sheet
  const feedbackData = db.feedback.map((f, idx) => {
    const stu = db.students.find((s) => s.id === f.studentId);
    const cls = db.classes.find((c) => c.id === f.classId);
    const catMap = {
      academic: 'Học lực',
      conduct: 'Hạnh kiểm',
      health: 'Sức khỏe',
      general: 'Chung',
    };
    return {
      'STT': idx + 1,
      'Ngày': f.date,
      'Học Kỳ': f.semester,
      'Mã HS': stu ? stu.studentCode : '',
      'Họ Tên': stu ? stu.fullName : f.studentName || '',
      'Lớp': cls ? cls.name : '',
      'Môn Học': f.subject,
      'Phân Loại': catMap[f.category] || f.category,
      'Mức Đánh Giá': f.rating,
      'Nội Dung Nhận Xét': f.content,
      'Giáo Viên': f.teacherName,
    };
  });
  const wsFeedback = XLSX.utils.json_to_sheet(feedbackData);
  XLSX.utils.book_append_sheet(wb, wsFeedback, 'Feedback');

  // 4. Competition Sheet
  const compData = db.transactions.map((t, idx) => {
    const stu = db.students.find((s) => s.id === t.studentId);
    const cls = db.classes.find((c) => c.id === t.classId);
    return {
      'STT': idx + 1,
      'Ngày': t.date,
      'Mã HS': stu ? stu.studentCode : '',
      'Họ Tên': stu ? stu.fullName : t.studentName || '',
      'Lớp': cls ? cls.name : '',
      'Loại': t.type === 'positive' ? 'Cộng (+)' : 'Trừ (-)',
      'Tiêu Chí': t.criterionName,
      'Điểm': t.points > 0 ? `+${t.points}` : `${t.points}`,
      'Ghi Chú': t.note || '',
      'Giáo Viên Ghi Nhận': t.teacherName,
    };
  });
  const wsComp = XLSX.utils.json_to_sheet(compData);
  XLSX.utils.book_append_sheet(wb, wsComp, 'Competition');

  // 5. Ranking & Achievements Sheet
  const rankingData = db.students.map((stu) => {
    const cls = db.classes.find((c) => c.id === stu.currentClassId);
    const stuTx = db.transactions.filter((t) => t.studentId === stu.id);
    const pos = stuTx.filter((t) => t.type === 'positive').reduce((sum, t) => sum + t.points, 0);
    const neg = stuTx.filter((t) => t.type === 'negative').reduce((sum, t) => sum + Math.abs(t.points), 0);
    const finalScore = pos - neg;
    return {
      'Mã HS': stu.studentCode,
      'Họ và Tên': stu.fullName,
      'Lớp': cls ? cls.name : '',
      'Điểm Cộng': pos,
      'Điểm Trừ': neg,
      'Tổng Điểm Thi Đua': finalScore,
    };
  }).sort((a, b) => b['Tổng Điểm Thi Đua'] - a['Tổng Điểm Thi Đua']);

  const rankingWithRanks = rankingData.map((r, idx) => ({
    'Hạng': idx + 1,
    ...r,
  }));
  const wsRanking = XLSX.utils.json_to_sheet(rankingWithRanks);
  XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking');

  // 6. Evaluation Sheet (H/T/C)
  const evalData = db.evaluations.map((e, idx) => {
    const stu = db.students.find((s) => s.id === e.studentId);
    const cls = db.classes.find((c) => c.id === e.classId);
    const levelMap = {
      T: 'Tốt (T)',
      H: 'Hoàn thành (H)',
      C: 'Chưa hoàn thành (C)',
    };
    return {
      'STT': idx + 1,
      'Ngày': e.date,
      'Mã HS': stu ? stu.studentCode : '',
      'Họ Tên': stu ? stu.fullName : '',
      'Lớp': cls ? cls.name : '',
      'Môn Học': e.subject,
      'Học Kỳ': e.semester,
      'Mức Đạt': levelMap[e.level] || e.level,
      'Ghi Chú': e.notes || '',
      'Giáo Viên': e.teacherName || '',
    };
  });
  const wsEval = XLSX.utils.json_to_sheet(evalData);
  XLSX.utils.book_append_sheet(wb, wsEval, 'Evaluation');

  XLSX.writeFile(wb, filename);
}

export function downloadSampleExcelTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleRows = [
    {
      'STT': 1,
      'Mã học sinh': 'HS0001',
      'Họ và tên': 'Nguyễn Văn An',
      'Giới tính': 'Nam',
      'Ngày sinh': '2016-03-15',
      'Địa chỉ': 'Thôn Lang Châu Bắc, Xã Nam Phước',
      'Họ tên phụ huynh': 'Nguyễn Văn Hùng',
      'Số điện thoại': '0905111222',
      'Email': 'nguyenhung@gmail.com',
      'Ghi chú': 'Học sinh tích cực',
    },
    {
      'STT': 2,
      'Mã học sinh': 'HS0002',
      'Họ và tên': 'Trần Thị Bình',
      'Giới tính': 'Nữ',
      'Ngày sinh': '2016-07-22',
      'Địa chỉ': 'Thôn Hà Nhuận, Xã Nam Phước',
      'Họ tên phụ huynh': 'Trần Đình Trọng',
      'Số điện thoại': '0905222333',
      'Email': 'trandinhtrong@gmail.com',
      'Ghi chú': 'Chữ viết đẹp',
    },
    {
      'STT': 3,
      'Mã học sinh': 'HS0003',
      'Họ và tên': 'Lê Văn Cường',
      'Giới tính': 'Nam',
      'Ngày sinh': '2016-11-05',
      'Địa chỉ': 'Xã Nam Phước',
      'Họ tên phụ huynh': 'Lê Văn Đức',
      'Số điện thoại': '0905333444',
      'Email': '',
      'Ghi chú': 'Tiến bộ',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Ma HS
    { wch: 22 }, // Ho ten
    { wch: 10 }, // Gioi tinh
    { wch: 14 }, // Ngay sinh
    { wch: 30 }, // Dia chi
    { wch: 22 }, // Phu huynh
    { wch: 16 }, // SDT
    { wch: 24 }, // Email
    { wch: 25 }, // Ghi chu
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Danh_Sach_HS');
  XLSX.writeFile(wb, 'Mau_Nhap_Hoc_Sinh_Tieu_Hoc_Nam_Phuoc.xlsx');
}

export function exportTableToCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Vietnamese display
    [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportComprehensiveExcelWorkbook(db?: AppDatabase) {
  const currentDb = db || storage.getDb();
  exportFullSchoolExcel(currentDb, `Bao_Cao_Tong_Hop_Truong_TH_Nam_Phuoc_${Date.now()}.xlsx`);
}

