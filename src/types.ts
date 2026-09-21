export type UserRole = 'admin' | 'homeroom' | 'subject' | 'guest';

export interface UserPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
  attendance: boolean;
  feedback: boolean;
  competition: boolean;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isOwner?: boolean;
  assignedClassIds: string[]; // Classes this teacher manages
  subjects?: string[]; // e.g. ['Tiếng Anh', 'Tin học', 'Âm nhạc', 'Mỹ thuật']
  permissions: UserPermissions;
}

export interface SchoolYear {
  id: string;
  name: string; // e.g., '2026–2027'
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'active' | 'archived';
  notes?: string;
}

export interface Grade {
  id: string;
  level: number; // 1, 2, 3, 4, 5
  name: string; // 'Khối 1', 'Khối 2', etc.
}

export interface ClassRoom {
  id: string;
  name: string; // '1A', '2B', '4A', etc.
  gradeId: string;
  schoolYearId: string;
  homeroomTeacherId: string;
  customTeacherName?: string; // Direct teacher name entered/changed by teacher
  customTeacherPhone?: string; // Teacher phone number
  avatarThemeId?: string; // Animal or flower cute theme ID (e.g. 'rabbit', 'sunflower')
  subjectTeacherIds: string[];
  roomNumber?: string;
  notes?: string;
}

export interface Student {
  id: string;
  studentCode: string; // 'HS0001', 'HS0002'
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string; // YYYY-MM-DD
  photoUrl?: string;
  chibiAvatarId?: string; // Cute chibi avatar identifier
  address: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  currentClassId: string;
  currentGradeId: string;
  currentSchoolYearId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentYearHistory {
  studentId: string;
  schoolYearId: string;
  schoolYearName: string;
  gradeId: string;
  gradeName: string;
  classId: string;
  className: string;
  finalScore: number;
  attendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  achievements: string[];
  badges: string[];
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  schoolYearId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  teacherId: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

export type FeedbackCategory = 'academic' | 'conduct' | 'health' | 'general';
export type FeedbackRating = 'Tốt' | 'Khá' | 'Đạt' | 'Cần cố gắng';

export interface FeedbackRecord {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  schoolYearId: string;
  semester: 'HK1' | 'HK2' | 'Cả năm';
  subject: string;
  category: FeedbackCategory;
  rating: FeedbackRating;
  content: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type EvaluationLevel = 'H' | 'T' | 'C'; // H: Hoàn thành, T: Tốt, C: Chưa hoàn thành

export interface EvaluationRecord {
  id: string;
  studentId: string;
  classId: string;
  schoolYearId: string;
  teacherId: string;
  teacherName?: string;
  subject: string;
  level: EvaluationLevel;
  date?: string;
  semester: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: {
    level: EvaluationLevel;
    date: string;
    teacherName: string;
  }[];
}

export type StudentFeedback = FeedbackRecord;

export type CompetitionType = 'positive' | 'negative';

export interface CompetitionCriterion {
  id: string;
  name: string;
  type: CompetitionType;
  points: number; // e.g. +2 or -2
  category: string;
  icon?: string;
  isActive: boolean;
}

export interface CompetitionTransaction {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  schoolYearId: string;
  type: CompetitionType;
  criterionId?: string;
  criterionName: string;
  points: number;
  date: string;
  weekNumber?: number;
  monthNumber?: number;
  note?: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface TitleCondition {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  minAttendanceRate: number;
  period: 'week' | 'month' | 'semester' | 'year';
  badgeCode?: string;
}

export interface ParentNotificationTemplate {
  id: string;
  title: string;
  type: 'attendance' | 'weekly_progress' | 'urgent' | 'general';
  template: string; // Contains {{student_name}}, {{class_name}}, {{date}}, {{absent_days}}, {{late_count}}, {{competition_score}}
}

export interface ParentCommunicationLog {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  phone: string;
  date: string;
  content: string;
  channel: 'SMS' | 'Zalo' | 'Email' | 'Sổ liên lạc điện tử';
  status: 'Nháp' | 'Đã chuẩn bị' | 'Đã sao chép' | 'Đã gửi (Nội bộ)';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  teacherName?: string;
  performedBy?: string;
  action: string;
  category: string;
  details: string;
  status?: 'BLOCKED' | 'APPROVED' | 'SUCCESS' | 'PENDING';
  previousData?: any;
  newData?: any;
}

export interface PermissionRequest {
  id: string;
  requesterName: string;
  requesterRole: string;
  contactEmail: string;
  contactPhone: string;
  targetAction?: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  responseNote?: string;
}

export interface SchoolSettings {
  schoolName: string;
  branchName: string;
  ownerName: string;
  copyrightOwner?: string;
  principalName?: string;
  phone?: string;
  ownerPin?: string;
  ownerEmail: string;
  ownerPhone: string;
  copyrightNotice: string;
  address: string;
  district: string;
  province: string;
  digitalSealNumber: string;
  digitalSignatureTitle: string;
  rankingTieBreaker: 'points_positive' | 'less_negative' | 'attendance';
}

// Thông tư 27 - Sổ nhận xét học sinh theo tháng
export interface MonthlyAssessmentTT27 {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  schoolYearId: string;
  month: number; // 9, 10, 11, 12, 1, 2, 3, 4, 5
  // 1. Môn học & Hoạt động giáo dục (T / H / C)
  subjects: {
    [subjectName: string]: {
      level: 'T' | 'H' | 'C';
      note?: string;
    };
  };
  // 2. Phẩm chất chủ yếu (T / Đ / C)
  qualities: {
    yeuNuoc: 'T' | 'Đ' | 'C';
    nhanAi: 'T' | 'Đ' | 'C';
    chamChi: 'T' | 'Đ' | 'C';
    trungThuc: 'T' | 'Đ' | 'C';
    trachNhiem: 'T' | 'Đ' | 'C';
  };
  // 3. Năng lực cốt lõi (T / Đ / C)
  competencies: {
    tuChuTuHoc: 'T' | 'Đ' | 'C';
    giaoTiepHopTac: 'T' | 'Đ' | 'C';
    giaiQuyetVanDe: 'T' | 'Đ' | 'C';
    ngonNgu?: 'T' | 'Đ' | 'C';
    tinhToan?: 'T' | 'Đ' | 'C';
    thamMy?: 'T' | 'Đ' | 'C';
    theChat?: 'T' | 'Đ' | 'C';
  };
  generalComment: string; // Lời nhận xét cụ thể
  praiseNote: string; // Khen ngợi, động viên
  supportMeasure: string; // Biện pháp giúp đỡ
  teacherId: string;
  teacherName: string;
  updatedAt: string;
}

// Quản lý lớp học dành cho Giáo viên Chuyên / Nhô
export interface SubjectClassEvaluation {
  studentId: string;
  semester: 'HK1' | 'HK2';
  period?: 'Giữa kỳ' | 'Cuối kỳ';
  month?: number; // 9, 10, 11, 12, 1, 2, 3, 4, 5
  level: 'T' | 'H' | 'C';
  score?: number;
  note: string;
  updatedAt: string;
}

export interface SubjectClassAttendanceDay {
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>;
  notes?: Record<string, string>;
}

export interface SubjectClass {
  id: string;
  name: string; // e.g., 'Tiếng Anh 4A', 'Tin học Khối 4', 'CLB Mỹ thuật'
  subject: string; // 'Tiếng Anh' | 'Tin học' | 'Mỹ thuật' | 'Âm nhạc' | 'GDTC' | string
  teacherId: string;
  teacherName?: string;
  schoolYearId: string;
  type: 'linked' | 'custom'; // 'linked': lấy từ lớp chủ nhiệm | 'custom': tự lập danh sách riêng
  linkedClassIds: string[]; // e.g. ['C4A']
  customStudentIds: string[]; // danh sách học sinh riêng
  roomNumber?: string;
  schedule?: string;
  notes?: string;
  evaluations?: SubjectClassEvaluation[];
  attendanceDays?: SubjectClassAttendanceDay[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseBackup {
  id: string;
  timestamp: string;
  reason: string;
  studentCount: number;
  teacherCount: number;
  classCount: number;
  classesSummary: string;
  performedBy: string;
  type: 'auto_import' | 'auto_edit' | 'manual';
  data?: string; // Full JSON snapshot
}

export interface AppDatabase {
  schoolYears: SchoolYear[];
  grades: Grade[];
  classes: ClassRoom[];
  teachers: Teacher[];
  students: Student[];
  studentHistory: StudentYearHistory[];
  attendance: AttendanceRecord[];
  feedback: FeedbackRecord[];
  evaluations: EvaluationRecord[];
  monthlyAssessments?: MonthlyAssessmentTT27[];
  subjectClasses?: SubjectClass[];
  backups?: DatabaseBackup[];
  criteria: CompetitionCriterion[];
  transactions: CompetitionTransaction[];
  badges: Badge[];
  titles: TitleCondition[];
  parentTemplates: ParentNotificationTemplate[];
  parentLogs: ParentCommunicationLog[];
  auditLogs: AuditLog[];
  permissionRequests: PermissionRequest[];
  settings: SchoolSettings;
  currentSchoolYearId: string;
  currentUser: Teacher;
  isOwnerUnlocked: boolean;
  lastUpdated?: string;
}


