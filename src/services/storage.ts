import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { firestore, ensureAuthUser } from './firebase';
import {
  SchoolYear,
  Grade,
  ClassRoom,
  Teacher,
  Student,
  StudentYearHistory,
  AttendanceRecord,
  FeedbackRecord,
  EvaluationRecord,
  CompetitionCriterion,
  CompetitionTransaction,
  Badge,
  TitleCondition,
  ParentNotificationTemplate,
  ParentCommunicationLog,
  AuditLog,
  SchoolSettings,
  PermissionRequest,
  MonthlyAssessmentTT27,
  SubjectClass,
  DatabaseBackup,
  AppDatabase,
} from '../types';
import {
  INITIAL_SCHOOL_YEARS,
  INITIAL_GRADES,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  generateCompleteRoster,
} from '../data/mockData';

const STORAGE_KEY = 'SMART_STUDENT_MANAGER_NAM_PHUOC_V2';
const BACKUP_STORAGE_KEY = 'SMART_STUDENT_MANAGER_BACKUP_HISTORY_V2';
const EMERGENCY_STUDENTS_KEY = 'SMART_STUDENT_MANAGER_EMERGENCY_STUDENTS_V2';
const EMERGENCY_TRANSACTIONS_KEY = 'SMART_STUDENT_MANAGER_EMERGENCY_TRANSACTIONS_V2';
const FIRESTORE_COLLECTION = 'school_database';
const FIRESTORE_DOC_ID = 'nam_phuoc_duy_phuoc_2';

export {
  INITIAL_SCHOOL_YEARS,
  INITIAL_GRADES,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
};

/**
 * Chuẩn hóa địa chỉ học sinh: 
 * - Hiện nay không còn là huyện Duy Xuyên, nên chỉ hiển thị là xã Nam Phước.
 * - Tự động loại bỏ "Huyện Duy Xuyên" và chuyển đổi các địa danh từ "Duy Phước", "Thị trấn Nam Phước" thành "Xã Nam Phước".
 */
export function normalizeStudentAddress(addr?: string): string {
  if (!addr || !addr.trim()) {
    return 'Xã Nam Phước';
  }
  let s = addr
    .replace(/huyện\s*duy\s*xuyên/gi, '')
    .replace(/duy\s*xuyên/gi, '')
    .replace(/thị\s*trấn\s*nam\s*phước/gi, 'Xã Nam Phước')
    .replace(/xã\s*duy\s*phước/gi, 'Xã Nam Phước')
    .replace(/duy\s*phước/gi, 'Nam Phước')
    .trim();

  // Strip leading/trailing commas or spaces
  s = s.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ', ').trim();

  // If empty or just "Nam Phước"
  if (!s || s.toLowerCase() === 'nam phước') {
    return 'Xã Nam Phước';
  }

  // Ensure "Xã Nam Phước" format
  if (!/nam\s*phước/i.test(s)) {
    s += ', Xã Nam Phước';
  } else if (!/xã\s*nam\s*phước/i.test(s)) {
    s = s.replace(/nam\s*phước/gi, 'Xã Nam Phước');
  }

  // Final cleanup of duplicate "Xã Xã" or multiple commas or spaces
  s = s.replace(/xã\s+xã/gi, 'Xã')
       .replace(/,\s*,+/g, ',')
       .replace(/\s+/g, ' ')
       .trim();

  return s;
}

/**
 * Trộn danh sách học sinh an toàn theo từng lớp:
 * - Bảo đảm tải lớp nào thì giữ nguyên số lượng và danh sách lớp đó, lớp khác không bị ảnh hưởng.
 * - Không làm mất học sinh khi đồng bộ với Firestore.
 */
export function mergeStudentRosters(primary: Student[], secondary: Student[]): Student[] {
  if (!primary || primary.length === 0) return secondary || [];
  if (!secondary || secondary.length === 0) return primary || [];

  const classIds = new Set<string>();
  primary.forEach((s) => s.currentClassId && classIds.add(s.currentClassId));
  secondary.forEach((s) => s.currentClassId && classIds.add(s.currentClassId));

  const result: Student[] = [];

  classIds.forEach((clsId) => {
    const pStudents = primary.filter((s) => s.currentClassId === clsId);
    const sStudents = secondary.filter((s) => s.currentClassId === clsId);

    if (pStudents.length > 0 && sStudents.length === 0) {
      result.push(...pStudents);
    } else if (sStudents.length > 0 && pStudents.length === 0) {
      result.push(...sStudents);
    } else {
      // Both have students for this class: keep the list with more students, or primary if equal
      if (pStudents.length >= sStudents.length) {
        result.push(...pStudents);
      } else {
        result.push(...sStudents);
      }
    }
  });

  // Also include students without class assignment
  const pNoClass = primary.filter((s) => !s.currentClassId);
  const sNoClass = secondary.filter((s) => !s.currentClassId);
  if (pNoClass.length >= sNoClass.length) {
    result.push(...pNoClass);
  } else {
    result.push(...sNoClass);
  }

  return result;
}

/**
 * Trộn danh sách giao dịch điểm thi đua an toàn tuyệt đối:
 * - Bảo đảm không làm mất điểm đã nhập khi đồng bộ giữa LocalStorage và Firestore.
 * - Hợp nhất dựa theo mã ID độc nhất của từng giao dịch (CompetitionTransaction.id).
 */
export function mergeTransactions(
  primary: CompetitionTransaction[],
  secondary: CompetitionTransaction[]
): CompetitionTransaction[] {
  if (!primary || primary.length === 0) return secondary || [];
  if (!secondary || secondary.length === 0) return primary || [];

  const map = new Map<string, CompetitionTransaction>();
  // Thêm danh sách phụ trước
  secondary.forEach((t) => {
    if (t && t.id) map.set(t.id, t);
  });
  // Ghi đè/bổ sung danh sách chính lên trên
  primary.forEach((t) => {
    if (t && t.id) map.set(t.id, t);
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date).getTime() || 0;
    const timeB = new Date(b.createdAt || b.date).getTime() || 0;
    return timeB - timeA;
  });
}

/**
 * Ngày bắt đầu năm học chính thức (Tuần 1): Thứ Hai, 07/09/2026
 */
export const SCHOOL_YEAR_START_DATE = '2026-09-07';

/**
 * Tính số tuần học (1 - 35) từ ngày YYYY-MM-DD
 * Quy chuẩn: Tuần 1 bắt đầu từ ngày 07/09/2026
 */
export function getSchoolWeekFromDate(dateStr: string, schoolYearStart = SCHOOL_YEAR_START_DATE): number {
  try {
    if (!dateStr) return 1;
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return 1;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    const startParts = schoolYearStart.split('-').map(Number);
    const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);

    const diffMs = dateObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1;
    const week = Math.floor(diffDays / 7) + 1;
    return Math.max(1, Math.min(35, week));
  } catch {
    return 1;
  }
}

/**
 * Lấy tháng (1 - 12) từ ngày YYYY-MM-DD
 */
export function getMonthFromDate(dateStr: string): number {
  try {
    if (!dateStr) return new Date().getMonth() + 1;
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return parseInt(parts[1], 10);
    }
    return new Date(dateStr).getMonth() + 1;
  } catch {
    return 9;
  }
}

/**
 * Tính khoảng ngày của tuần học (VD: Tuần 1: 07/09 - 13/09/2026, Tuần 2: 14/09 - 20/09/2026)
 */
export function getDateRangeOfWeek(
  weekNum: number,
  schoolYearStart = SCHOOL_YEAR_START_DATE
): { startStr: string; endStr: string; label: string } {
  try {
    const startParts = schoolYearStart.split('-').map(Number);
    const startWeek = new Date(startParts[0], startParts[1] - 1, startParts[2] + (weekNum - 1) * 7);
    const endWeek = new Date(startParts[0], startParts[1] - 1, startParts[2] + (weekNum - 1) * 7 + 6);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${startWeek.getFullYear()}-${pad(startWeek.getMonth() + 1)}-${pad(startWeek.getDate())}`;
    const endStr = `${endWeek.getFullYear()}-${pad(endWeek.getMonth() + 1)}-${pad(endWeek.getDate())}`;
    const label = `${pad(startWeek.getDate())}/${pad(startWeek.getMonth() + 1)} - ${pad(endWeek.getDate())}/${pad(endWeek.getMonth() + 1)}`;

    return { startStr, endStr, label };
  } catch {
    return { startStr: '', endStr: '', label: `Tuần ${weekNum}` };
  }
}

/**
 * Chuẩn hóa và tự động cập nhật tuần/tháng học cho toàn bộ giao dịch điểm thi đua:
 * Quy chuẩn Tuần 1 bắt đầu từ ngày 07/09/2026.
 */
export function normalizeTransactionsSchoolWeek(
  transactions: CompetitionTransaction[]
): { updatedTransactions: CompetitionTransaction[]; count: number } {
  if (!transactions || transactions.length === 0) {
    return { updatedTransactions: [], count: 0 };
  }

  let count = 0;
  const updatedTransactions = transactions.map((tx) => {
    if (!tx || !tx.date) return tx;
    const correctWeek = getSchoolWeekFromDate(tx.date, SCHOOL_YEAR_START_DATE);
    const correctMonth = getMonthFromDate(tx.date);

    if (tx.weekNumber !== correctWeek || tx.monthNumber !== correctMonth) {
      count++;
      return {
        ...tx,
        weekNumber: correctWeek,
        monthNumber: correctMonth,
      };
    }
    return tx;
  });

  return { updatedTransactions, count };
}

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'Trường Tiểu học Nam Phước',
  branchName: 'Phân hiệu 2 Duy Phước 2',
  ownerName: 'Thanh Nguyễn',
  ownerEmail: 'thanhthanhnguyen265@gmail.com',
  ownerPhone: '0905 123 456',
  copyrightNotice: 'Bản quyền sở hữu thuộc về Thanh Nguyễn. Mọi sửa đổi phải được sự chấp thuận từ chủ sở hữu.',
  address: 'Thôn Lang Châu Bắc, Xã Nam Phước',
  district: 'Xã Nam Phước',
  province: 'Tỉnh Quảng Nam',
  digitalSealNumber: 'NP-DP2-2026/XTS',
  digitalSignatureTitle: 'XÁC THỰC CHỮ KÝ SỐ ĐIỆN TỬ - THANH NGUYỄN',
  rankingTieBreaker: 'points_positive',
};

export const INITIAL_CRITERIA: CompetitionCriterion[] = [
  // Positive (+ points)
  { id: 'CR_POS_1', name: 'Phát biểu xây dựng bài', type: 'positive', points: 2, category: 'Học tập', icon: 'Hand', isActive: true },
  { id: 'CR_POS_2', name: 'Giúp đỡ bạn cùng tiến', type: 'positive', points: 3, category: 'Đạo đức', icon: 'Heart', isActive: true },
  { id: 'CR_POS_3', name: 'Đạt điểm tốt (9, 10)', type: 'positive', points: 5, category: 'Học tập', icon: 'Award', isActive: true },
  { id: 'CR_POS_4', name: 'Hoàn thành tốt bài tập về nhà', type: 'positive', points: 2, category: 'Học tập', icon: 'CheckCircle', isActive: true },
  { id: 'CR_POS_5', name: 'Trực nhật lớp sạch sẽ gọn gàng', type: 'positive', points: 2, category: 'Vệ sinh', icon: 'Sparkles', isActive: true },
  { id: 'CR_POS_6', name: 'Tích cực tham gia phong trào Đội', type: 'positive', points: 3, category: 'Hoạt động', icon: 'Flag', isActive: true },
  { id: 'CR_POS_7', name: 'Nhặt được của rơi trả người đánh mất', type: 'positive', points: 5, category: 'Đạo đức', icon: 'ShieldCheck', isActive: true },
  // Negative (- points)
  { id: 'CR_NEG_1', name: 'Đi học muộn', type: 'negative', points: -2, category: 'Kỷ luật', icon: 'Clock', isActive: true },
  { id: 'CR_NEG_2', name: 'Không làm bài tập', type: 'negative', points: -3, category: 'Học tập', icon: 'AlertTriangle', isActive: true },
  { id: 'CR_NEG_3', name: 'Nói chuyện riêng trong giờ học', type: 'negative', points: -2, category: 'Kỷ luật', icon: 'MessageCircleOff', isActive: true },
  { id: 'CR_NEG_4', name: 'Quên đồ dùng học tập / sách vở', type: 'negative', points: -1, category: 'Học tập', icon: 'BookOpen', isActive: true },
  { id: 'CR_NEG_5', name: 'Vi phạm nội quy trường lớp', type: 'negative', points: -5, category: 'Kỷ luật', icon: 'Ban', isActive: true },
];

export const INITIAL_BADGES: Badge[] = [
  { id: 'B1', code: 'STAR', name: 'Ngôi Sao Sáng', icon: '⭐', description: 'Đạt thành tích thi đua xuất sắc trong tuần', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'B2', code: 'CHAMPION', name: 'Quán Quân Thi Đua', icon: '🏆', description: 'Dẫn đầu điểm thi đua toàn khối/lớp', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'B3', code: 'HARD_WORKER', name: 'Chăm Chỉ', icon: '📚', description: 'Luôn hoàn thành xuất sắc mọi bài tập', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'B4', code: 'EXCELLENT', name: 'Xuất Sắc', icon: '💯', description: 'Điểm tổng kết tuyệt đối, chuyên cần 100%', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'B5', code: 'PROGRESS', name: 'Tiến Bộ Vượt Bậc', icon: '🌟', description: 'Có sự bứt phá tiến bộ rõ nét qua từng tuần', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'B6', code: 'HELPFUL', name: 'Hoa Việc Tốt', icon: '❤️', description: 'Tận tình giúp đỡ bạn bè và giữ gìn vệ sinh lớp', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'B7', code: 'ATTENDANCE', name: 'Chuyên Cần Vàng', icon: '🎯', description: 'Đi học đúng giờ đầy đủ 100% không vắng buổi nào', color: 'bg-teal-100 text-teal-800 border-teal-300' },
];

export const INITIAL_TITLES: TitleCondition[] = [
  { id: 'T_STAR_WEEK', name: 'Ngôi sao tuần', description: 'Tổng điểm thi đua tuần đạt từ 15 điểm trở lên và không có điểm trừ', minPoints: 15, minAttendanceRate: 100, period: 'week', badgeCode: 'STAR' },
  { id: 'T_STAR_MONTH', name: 'Ngôi sao tháng', description: 'Tổng điểm thi đua tháng từ 50 điểm trở lên và chuyên cần từ 95%', minPoints: 50, minAttendanceRate: 95, period: 'month', badgeCode: 'CHAMPION' },
  { id: 'T_ATTENDANCE', name: 'Chuyên cần', description: 'Không nghỉ học không phép và không đi muộn trong kỳ xét', minPoints: 0, minAttendanceRate: 100, period: 'month', badgeCode: 'ATTENDANCE' },
  { id: 'T_PROGRESS', name: 'Tiến bộ vượt bậc', description: 'Điểm tuần sau cao hơn tuần trước ít nhất 5 điểm liên tiếp', minPoints: 20, minAttendanceRate: 90, period: 'month', badgeCode: 'PROGRESS' },
  { id: 'T_EXCELLENT', name: 'Học sinh tiêu biểu', description: 'Tổng điểm học kỳ từ 80 điểm trở lên và đánh giá học lực Tốt', minPoints: 80, minAttendanceRate: 95, period: 'semester', badgeCode: 'EXCELLENT' },
];

export const INITIAL_PARENT_TEMPLATES: ParentNotificationTemplate[] = [
  {
    id: 'PT_ATTENDANCE',
    title: 'Thông báo chuyên cần & vắng học',
    type: 'attendance',
    template: 'Kính gửi Quý phụ huynh em {{student_name}} (Lớp {{class_name}}), hôm nay ngày {{date}} nhà trường ghi nhận em {{attendance_status}}. Số buổi nghỉ trong tháng: {{absent_days}} buổi, đi muộn: {{late_count}} lần. Kính mong phụ huynh phối hợp theo dõi. Trân trọng!',
  },
  {
    id: 'PT_WEEKLY',
    title: 'Phiếu tiến trình rèn luyện tuần',
    type: 'weekly_progress',
    template: 'Báo cáo tuần - Em {{student_name}} (Lớp {{class_name}}): Tổng điểm thi đua tuần đạt {{competition_score}} điểm (+{{positive_points}}/-{{negative_points}}). Điểm chuyên cần: {{attendance_rate}}%. Nhận xét rèn luyện: {{teacher_comment}}. Giáo viên: {{teacher_name}}.',
  },
  {
    id: 'PT_URGENT',
    title: 'Nhắc nhở nề nếp và đồ dùng học tập',
    type: 'urgent',
    template: 'Kính gửi phụ huynh em {{student_name}} (Lớp {{class_name}}), trong buổi học ngày {{date}}, em có biểu hiện: {{urgent_note}}. Kính mong Quý phụ huynh nhắc nhở em để chuẩn bị tốt cho buổi học sau.',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG_INIT',
    timestamp: '2026-09-06T00:00:00Z',
    teacherName: 'Thanh Nguyễn',
    category: 'Hệ thống',
    action: 'Khởi tạo hệ thống đám mây',
    details: 'Đã kết nối Firestore Cloud Database với đầy đủ sĩ số 10 lớp học và tiêu chí thi đua.',
  },
  {
    id: 'LOG_ATT_1',
    timestamp: '2026-09-06T07:15:00Z',
    teacherName: 'Cô Nguyễn Thị Mai',
    category: 'Điểm danh',
    action: 'Điểm danh lớp 4A',
    details: 'Đã điểm danh 30 học sinh lớp 4A ngày 06/09/2026: 28 có mặt, 1 phép, 1 muộn.',
  },
];

export const INITIAL_PERMISSION_REQUESTS: PermissionRequest[] = [
  {
    id: 'REQ_01',
    requesterName: 'Thầy Lê Văn Hùng',
    requesterRole: 'Giáo viên phụ trách Thể Dục',
    contactEmail: 'levanhung.sport@gmail.com',
    contactPhone: '0905 998 877',
    reason: 'Xin cấp quyền nhập đánh giá môn Thể dục và điểm thi đua phong trào HK1 cho Khối 4 và Khối 5.',
    requestedAt: '2026-09-05T14:20:00Z',
    status: 'pending',
  },
];

export function getInitialDatabase(): AppDatabase {
  return {
    schoolYears: INITIAL_SCHOOL_YEARS,
    grades: INITIAL_GRADES,
    classes: INITIAL_CLASSES,
    teachers: INITIAL_TEACHERS,
    students: [], // Started clean: 270 mock students removed per user request
    studentHistory: [],
    attendance: [],
    feedback: [],
    evaluations: [],
    criteria: INITIAL_CRITERIA,
    transactions: [],
    badges: INITIAL_BADGES,
    titles: INITIAL_TITLES,
    parentTemplates: INITIAL_PARENT_TEMPLATES,
    parentLogs: [],
    auditLogs: INITIAL_AUDIT_LOGS,
    permissionRequests: INITIAL_PERMISSION_REQUESTS,
    monthlyAssessments: [],
    subjectClasses: [],
    settings: DEFAULT_SETTINGS,
    currentSchoolYearId: 'SY2026_2027',
    currentUser: INITIAL_TEACHERS[0], // Default logged in as Thanh Nguyễn (Owner / Admin)
    isOwnerUnlocked: true,
  };
}

class StorageService {
  private cache: AppDatabase | null = null;
  private undoStack: AppDatabase[] = [];
  private listeners: Set<() => void> = new Set();
  private isSaving = false;
  private saveStatus: 'saved' | 'saving' | 'error' = 'saved';
  private lastSavedTimeStr: string = '';
  private saveStatusListeners: Set<(status: 'saved' | 'saving' | 'error', timeStr: string) => void> = new Set();
  private autoSaveTimer: any = null;
  private firestoreUnsubscribe: (() => void) | null = null;
  private isCloudConnected = false;

  constructor() {
    const n = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    this.lastSavedTimeStr = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    
    // Initial local cache load for instant UI render
    this.loadFromLocal();

    // Start cloud synchronization with Firestore
    this.initFirestoreSync();
  }

  /**
   * Initializes real-time Firestore sync.
   * This guarantees that changes made on one computer appear on all other machines!
   */
  private async initFirestoreSync() {
    try {
      await ensureAuthUser();
      const docRef = doc(firestore, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

      // Check if remote doc exists first
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        console.log('Firebase: Initializing cloud database with complete school roster...');
        const initial = this.cache || getInitialDatabase();
        await setDoc(docRef, initial);
        this.cache = initial;
        this.isCloudConnected = true;
        this.notify();
      } else {
        const remoteData = snap.data() as AppDatabase;
        console.log(`Firebase: Loaded remote database with ${remoteData.students?.length || 0} students.`);
        
        // SAFE MERGE: Use class-scoped reconciliation so no class loses students!
        const localStudents = this.cache?.students || [];
        const remoteStudents = remoteData.students || [];
        const mergedStudents = mergeStudentRosters(localStudents, remoteStudents);
        remoteData.students = mergedStudents;

        // SAFE MERGE: Competition Transactions (Cộng/Trừ điểm thi đua)
        const localTransactions = this.cache?.transactions || [];
        const remoteTransactions = remoteData.transactions || [];
        const mergedTransactions = mergeTransactions(localTransactions, remoteTransactions);
        
        // Chuẩn hóa và tự động cập nhật tuần/tháng học cho toàn bộ điểm thi đua theo mốc Tuần 1 từ 07/09/2026
        const { updatedTransactions, count: normCount } = normalizeTransactionsSchoolWeek(mergedTransactions);
        remoteData.transactions = updatedTransactions;

        const shouldSyncBack =
          mergedStudents.length > (remoteStudents.length || 0) ||
          mergedTransactions.length > (remoteTransactions.length || 0) ||
          normCount > 0;

        if (shouldSyncBack) {
          console.log(`Firebase: Syncing ${mergedStudents.length} students & ${updatedTransactions.length} competition transactions (${normCount} updated to week 1 from 07/09/2026) back to cloud database...`);
          setDoc(docRef, remoteData).catch((err) => console.warn('Cloud sync merge back error:', err));
        }

        this.cache = this.reconcileDb(remoteData);
        this.isCloudConnected = true;
        this.notify();
      }

      // Listen for real-time changes across devices
      this.firestoreUnsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists() && !this.isSaving) {
          const remoteData = snapshot.data() as AppDatabase;
          const localStudents = this.cache?.students || [];
          const remoteStudents = remoteData.students || [];
          
          // Reconcile students safely: never drop uploaded classes or truncate to 9 students
          const mergedStudents = mergeStudentRosters(localStudents, remoteStudents);
          remoteData.students = mergedStudents;

          // Reconcile competition transactions safely: never lose scored points
          const localTransactions = this.cache?.transactions || [];
          const remoteTransactions = remoteData.transactions || [];
          const mergedTransactions = mergeTransactions(localTransactions, remoteTransactions);
          const { updatedTransactions, count: normCount } = normalizeTransactionsSchoolWeek(mergedTransactions);
          remoteData.transactions = updatedTransactions;

          const shouldSyncBack =
            mergedStudents.length > (remoteStudents.length || 0) ||
            mergedTransactions.length > (remoteTransactions.length || 0) ||
            normCount > 0;

          if (shouldSyncBack) {
            setDoc(docRef, remoteData).catch((err) => console.warn('Sync back merged data error:', err));
          }

          // Keep current logged-in user preferences locally to avoid jarring role switches
          const localCurrentUser = this.cache?.currentUser;
          const localSchoolYearId = this.cache?.currentSchoolYearId;
          const reconciled = this.reconcileDb(remoteData);
          if (localCurrentUser) reconciled.currentUser = localCurrentUser;
          if (localSchoolYearId) reconciled.currentSchoolYearId = localSchoolYearId;
          
          this.cache = reconciled;
          this.isCloudConnected = true;
          this.notify();
        }
      }, (err) => {
        console.warn('Firestore onSnapshot listener error:', err);
      });
    } catch (e) {
      console.warn('Firebase sync initialization fallback to local storage:', e);
      this.isCloudConnected = false;
    }
  }

  private reconcileDb(parsed: any): AppDatabase {
    // Ensure all critical collections exist
    const base = getInitialDatabase();
    if (!parsed.classes || !Array.isArray(parsed.classes) || parsed.classes.length === 0) {
      parsed.classes = base.classes;
    }
    if (!parsed.students || !Array.isArray(parsed.students) || parsed.students.length === 0) {
      // Check emergency snapshot if available
      try {
        const emergency = localStorage.getItem(EMERGENCY_STUDENTS_KEY);
        if (emergency) {
          const recovered = JSON.parse(emergency);
          if (Array.isArray(recovered) && recovered.length > 0) {
            console.log(`Restored ${recovered.length} students from emergency persistence.`);
            parsed.students = recovered;
          } else {
            parsed.students = [];
          }
        } else {
          parsed.students = [];
        }
      } catch (e) {
        parsed.students = [];
      }
    } else {
      // Purge 270 mock sample students per user request:
      // "xóa hết danh sách 270 học sinh mẫu có sẵn, chỉ hiển thị khi danh sách học sinh được cập nhật theo từng lớp lên hệ thống app"
      const isMockStudent = (s: Student) => {
        if (!s || typeof s.id !== 'string') return false;
        return (
          /^STU_C[1-5][AB]_\d+$/.test(s.id) ||
          (s.parentEmail && s.parentEmail.endsWith('@phuhuynh.namphuoc.edu.vn') && s.createdAt === '2026-08-25T08:00:00.000Z')
        );
      };
      if (parsed.students.some(isMockStudent)) {
        parsed.students = parsed.students.filter((s: Student) => !isMockStudent(s));
      }
      // Ensure all student addresses are normalized: strip "Huyện Duy Xuyên" and force "Xã Nam Phước"
      parsed.students = parsed.students.map((s: Student) => {
        return {
          ...s,
          address: normalizeStudentAddress(s.address),
        };
      });
    }
    if (!parsed.studentHistory || !Array.isArray(parsed.studentHistory)) {
      parsed.studentHistory = [];
    }
    if (!parsed.schoolYears || !Array.isArray(parsed.schoolYears) || parsed.schoolYears.length === 0) {
      parsed.schoolYears = base.schoolYears;
    }
    if (!parsed.teachers || !Array.isArray(parsed.teachers)) {
      parsed.teachers = base.teachers;
    } else {
      // Ensure the permanent school owner (Thanh Nguyễn / T001) always exists so admin access is never lost
      const hasOwner = parsed.teachers.some((t: Teacher) => t.isOwner || t.id === 'T001');
      if (!hasOwner) {
        const ownerTeacher = base.teachers.find((t) => t.isOwner || t.id === 'T001');
        if (ownerTeacher) parsed.teachers.unshift(ownerTeacher);
      }
    }
    if (!parsed.criteria || !Array.isArray(parsed.criteria) || parsed.criteria.length === 0) {
      parsed.criteria = base.criteria;
    }
    if (!parsed.badges || !Array.isArray(parsed.badges) || parsed.badges.length === 0) {
      parsed.badges = base.badges;
    }
    if (!parsed.settings) {
      parsed.settings = base.settings;
    } else {
      parsed.settings.address = normalizeStudentAddress(parsed.settings.address);
      parsed.settings.district = 'Xã Nam Phước';
    }
    if (!parsed.monthlyAssessments || !Array.isArray(parsed.monthlyAssessments)) {
      parsed.monthlyAssessments = [];
    }
    if (!parsed.subjectClasses || !Array.isArray(parsed.subjectClasses)) {
      parsed.subjectClasses = [];
    }
    if (!parsed.attendance || !Array.isArray(parsed.attendance)) {
      parsed.attendance = [];
    }
    if (!parsed.feedback || !Array.isArray(parsed.feedback)) {
      parsed.feedback = [];
    }
    if (!parsed.evaluations || !Array.isArray(parsed.evaluations)) {
      parsed.evaluations = [];
    }
    if (!parsed.transactions || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
      try {
        const emergencyTx = localStorage.getItem(EMERGENCY_TRANSACTIONS_KEY);
        if (emergencyTx) {
          const recovered = JSON.parse(emergencyTx);
          if (Array.isArray(recovered) && recovered.length > 0) {
            console.log(`Restored ${recovered.length} competition transactions from emergency storage.`);
            parsed.transactions = recovered;
          } else {
            parsed.transactions = [];
          }
        } else {
          parsed.transactions = [];
        }
      } catch (e) {
        parsed.transactions = [];
      }
    } else {
      try {
        const emergencyTx = localStorage.getItem(EMERGENCY_TRANSACTIONS_KEY);
        if (emergencyTx) {
          const recovered = JSON.parse(emergencyTx);
          if (Array.isArray(recovered) && recovered.length > 0) {
            parsed.transactions = mergeTransactions(parsed.transactions, recovered);
          }
        }
      } catch (e) {}
    }

    // Luôn chuẩn hóa tuần/tháng học cho toàn bộ các điểm thi đua đã lưu (Tuần 1 từ 07/09/2026)
    if (parsed.transactions && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
      const { updatedTransactions, count } = normalizeTransactionsSchoolWeek(parsed.transactions);
      if (count > 0) {
        console.log(`Normalized ${count} competition transactions to start from week 1 (07/09/2026).`);
      }
      parsed.transactions = updatedTransactions;
      try {
        localStorage.setItem(EMERGENCY_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
      } catch (e) {}
    }
    if (!parsed.backups || !Array.isArray(parsed.backups)) {
      try {
        const rawBks = localStorage.getItem(BACKUP_STORAGE_KEY);
        parsed.backups = rawBks ? JSON.parse(rawBks) : [];
      } catch (e) {
        parsed.backups = [];
      }
    }
    return parsed as AppDatabase;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeSaveStatus(listener: (status: 'saved' | 'saving' | 'error', timeStr: string) => void): () => void {
    this.saveStatusListeners.add(listener);
    listener(this.saveStatus, this.lastSavedTimeStr);
    return () => {
      this.saveStatusListeners.delete(listener);
    };
  }

  public getSaveStatus(): { status: 'saved' | 'saving' | 'error'; lastSavedTime: string; isCloud: boolean } {
    return { status: this.saveStatus, lastSavedTime: this.lastSavedTimeStr, isCloud: this.isCloudConnected };
  }

  private notifySaveStatus(status: 'saved' | 'saving' | 'error') {
    this.saveStatus = status;
    const n = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    this.lastSavedTimeStr = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    this.saveStatusListeners.forEach((fn) => fn(this.saveStatus, this.lastSavedTimeStr));
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getDb(): AppDatabase {
    if (!this.cache) {
      this.loadFromLocal();
    }
    return this.cache!;
  }

  private loadFromLocal(): AppDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cache = this.reconcileDb(parsed);
        return this.cache!;
      }
    } catch (e) {
      console.error('Error loading stored DB from localStorage:', e);
    }
    const initial = getInitialDatabase();
    this.cache = initial;
    return initial;
  }

  /**
   * Save database changes both in-memory, to Firestore cloud, and localStorage fallback
   */
  public async save(
    newDb: AppDatabase,
    pushToUndo = true,
    auditAction?: { category: AuditLog['category']; action: string; details: string; status?: AuditLog['status'] }
  ) {
    this.notifySaveStatus('saving');

    if (pushToUndo && this.cache) {
      this.undoStack.push(JSON.parse(JSON.stringify(this.cache)));
      if (this.undoStack.length > 15) {
        this.undoStack.shift();
      }
    }

    if (auditAction) {
      const logItem: AuditLog = {
        id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        teacherName: newDb.currentUser?.fullName || 'Hệ thống',
        performedBy: newDb.currentUser?.fullName || 'Hệ thống',
        category: auditAction.category,
        action: auditAction.action,
        details: auditAction.details,
        status: auditAction.status || 'SUCCESS',
      };
      newDb.auditLogs = [logItem, ...(newDb.auditLogs || [])].slice(0, 100);
    }

    newDb.lastUpdated = new Date().toISOString();
    this.cache = newDb;
    this.isSaving = true;

    try {
      // 0. Update emergency copies if present to prevent data loss
      if (newDb.students && newDb.students.length > 0) {
        try {
          localStorage.setItem(EMERGENCY_STUDENTS_KEY, JSON.stringify(newDb.students));
        } catch (err) {}
      }
      if (newDb.transactions && newDb.transactions.length > 0) {
        try {
          localStorage.setItem(EMERGENCY_TRANSACTIONS_KEY, JSON.stringify(newDb.transactions));
        } catch (err) {}
      }

      // 1. Local storage fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDb));

      // 2. Direct Cloud persistence to Firestore
      const docRef = doc(firestore, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
      await setDoc(docRef, newDb);
      this.isCloudConnected = true;
      this.notifySaveStatus('saved');
    } catch (e) {
      console.warn('Firestore cloud save failed or offline, kept in local storage:', e);
      this.notifySaveStatus('saved'); // Still saved locally
    } finally {
      this.isSaving = false;
      this.notify();
    }
  }

  /**
   * Automatically debounces save so typing in inputs auto-saves seamlessly after 600ms
   */
  public autoSave(newDb: AppDatabase, reason = 'Tự động lưu thay đổi nhập liệu') {
    this.notifySaveStatus('saving');
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.save(newDb, true, {
        category: 'Hệ thống',
        action: 'Tự động lưu dữ liệu lên đám mây',
        details: reason,
        status: 'SUCCESS',
      });
    }, 600);
  }

  /**
   * RBAC: Check if current teacher can edit personal student profile details
   */
  public canEditStudentProfile(student: Student): { allowed: boolean; reason?: string } {
    const db = this.getDb();
    const user = db.currentUser;
    if (!user) return { allowed: false, reason: 'Chưa đăng nhập.' };

    if (user.role === 'admin' || user.isOwner || db.isOwnerUnlocked) {
      return { allowed: true };
    }

    if (user.role === 'homeroom') {
      if (user.assignedClassIds.includes(student.currentClassId)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Bạn là Giáo viên chủ nhiệm (${user.fullName}), chỉ có quyền sửa hồ sơ học sinh thuộc lớp mình chủ nhiệm.`,
      };
    }

    if (user.role === 'subject') {
      return {
        allowed: false,
        reason: 'Giáo viên chuyên môn không có quyền sửa hồ sơ lý lịch học sinh. Quyền này thuộc về Giáo viên chủ nhiệm hoặc Ban Giám hiệu.',
      };
    }

    return { allowed: false, reason: 'Tài khoản khách chỉ có quyền xem, không được chỉnh sửa.' };
  }

  /**
   * RBAC: Check if current teacher can mark attendance for a class
   */
  public canMarkAttendance(classId: string): { allowed: boolean; reason?: string } {
    const db = this.getDb();
    const user = db.currentUser;
    if (!user) return { allowed: false, reason: 'Chưa đăng nhập.' };

    if (user.role === 'admin' || user.isOwner || db.isOwnerUnlocked) {
      return { allowed: true };
    }

    if (user.role === 'homeroom') {
      if (user.assignedClassIds.includes(classId)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Bạn chỉ có quyền điểm danh lớp mình chủ nhiệm.',
      };
    }

    if (user.role === 'subject') {
      return {
        allowed: false,
        reason: 'Sổ điểm danh chuyên cần chính của lớp do Giáo viên chủ nhiệm quản lý và theo dõi.',
      };
    }

    return { allowed: false, reason: 'Không có quyền điểm danh.' };
  }

  /**
   * RBAC: Check if current teacher can evaluate/give feedback for a subject
   */
  public canEvaluateSubject(classId: string, subject: string): { allowed: boolean; reason?: string } {
    const db = this.getDb();
    const user = db.currentUser;
    if (!user) return { allowed: false, reason: 'Chưa đăng nhập.' };

    if (user.role === 'admin' || user.isOwner || db.isOwnerUnlocked) {
      return { allowed: true };
    }

    if (user.role === 'homeroom') {
      if (user.assignedClassIds.includes(classId)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Bạn chỉ có quyền nhận xét lớp mình chủ nhiệm.' };
    }

    if (user.role === 'subject') {
      if (!user.assignedClassIds.includes(classId)) {
        return { allowed: false, reason: `Bạn không được phân công giảng dạy tại lớp này.` };
      }
      const teacherSubjects = user.subjects || [];
      const isAllowedSubject = teacherSubjects.some((s) =>
        s.toLowerCase().includes(subject.toLowerCase()) || subject.toLowerCase().includes(s.toLowerCase())
      );
      if (!isAllowedSubject) {
        return {
          allowed: false,
          reason: `Bạn là Giáo viên chuyên ${teacherSubjects.join(', ')}, chỉ được nhận xét môn học của mình. Không thể sửa nhận xét môn ${subject}.`,
        };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Không có quyền nhận xét.' };
  }

  /**
   * RBAC: Check if current teacher can add competition points
   */
  public canScoreCompetition(classId: string): { allowed: boolean; reason?: string } {
    const db = this.getDb();
    const user = db.currentUser;
    if (!user) return { allowed: false, reason: 'Chưa đăng nhập.' };

    if (user.role === 'admin' || user.isOwner || db.isOwnerUnlocked) {
      return { allowed: true };
    }

    if (user.assignedClassIds.includes(classId)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Bạn không được phân công phụ trách giảng dạy tại lớp này để cộng/trừ điểm thi đua.',
    };
  }

  /**
   * Log potential access attempts and unauthorized modification attempts
   */
  public logAccessOrModificationAttempt(actionAttempted: string, details?: string, blocked = true): void {
    const db = this.getDb();
    const currentUserName = db.currentUser?.fullName || 'Khách truy cập / Người dùng';
    const logItem: AuditLog = {
      id: `LOG_SEC_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      teacherName: currentUserName,
      performedBy: currentUserName,
      category: 'Bảo mật & Quyền sở hữu Thanh Nguyễn',
      action: blocked ? `[CHẶN] Nỗ lực sửa đổi: ${actionAttempted}` : `Yêu cầu cấp quyền: ${actionAttempted}`,
      details: details || `Phát hiện nỗ lực sửa đổi trái phép "${actionAttempted}". Đã kích hoạt cơ chế yêu cầu xin phép chủ sở hữu Thanh Nguyễn.`,
      status: blocked ? 'BLOCKED' : 'PENDING',
    };

    db.auditLogs = [logItem, ...(db.auditLogs || [])].slice(0, 100);
    this.save(db, false);
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const previousState = this.undoStack.pop()!;
    this.save(previousState, false, {
      category: 'Hệ thống',
      action: 'Hoàn tác dữ liệu (Undo)',
      details: 'Đã quay lại trạng thái dữ liệu trước đó.',
    });
    return true;
  }

  public resetToDemo(): void {
    const fresh = getInitialDatabase();
    this.save(fresh, true, {
      category: 'Hệ thống',
      action: 'Khởi tạo lại dữ liệu mẫu',
      details: 'Khôi phục lại toàn bộ dữ liệu demo đầy đủ học sinh của trường tiểu học.',
    });
  }

  public wipeAllData(): void {
    const empty: AppDatabase = {
      ...getInitialDatabase(),
      students: [],
      attendance: [],
      feedback: [],
      evaluations: [],
      transactions: [],
      parentLogs: [],
      auditLogs: [],
    };
    this.save(empty, true, {
      category: 'Hệ thống',
      action: 'Xóa toàn bộ dữ liệu học sinh',
      details: 'Đã dọn sạch danh sách học sinh, điểm danh, nhận xét, thi đua để chuẩn bị nạp mới.',
    });
  }

  public exportBackupJson(): string {
    return JSON.stringify(this.getDb(), null, 2);
  }

  public resetToInitial(): void {
    this.resetToDemo();
  }

  /**
   * Xóa danh sách học sinh theo phạm vi (toàn trường, mẫu, theo năm học hoặc theo lớp)
   */
  public clearStudents(options: {
    scope: 'all' | 'sample' | 'year' | 'class';
    yearId?: string;
    classId?: string;
  }): number {
    const db = this.getDb();
    const initialCount = db.students.length;
    let remainingStudents = [...db.students];
    let removedIds = new Set<string>();

    if (options.scope === 'all') {
      remainingStudents.forEach((s) => removedIds.add(s.id));
      remainingStudents = [];
    } else if (options.scope === 'year') {
      const targetYear = options.yearId || db.currentSchoolYearId;
      remainingStudents = db.students.filter((s) => {
        if (s.currentSchoolYearId === targetYear) {
          removedIds.add(s.id);
          return false;
        }
        return true;
      });
    } else if (options.scope === 'class' && options.classId) {
      remainingStudents = db.students.filter((s) => {
        if (s.currentClassId === options.classId) {
          removedIds.add(s.id);
          return false;
        }
        return true;
      });
    } else if (options.scope === 'sample') {
      // Xóa các học sinh mẫu (HS0001 -> HS0300 hoặc tạo sẵn ban đầu)
      remainingStudents = db.students.filter((s) => {
        const isSampleCode = /^HS0\d{3}$/.test(s.studentCode) || s.id.startsWith('STU_GEN_') || s.notes?.includes('học sinh mẫu');
        if (isSampleCode) {
          removedIds.add(s.id);
          return false;
        }
        return true;
      });
    }

    const removedCount = initialCount - remainingStudents.length;

    const updatedDb: AppDatabase = {
      ...db,
      students: remainingStudents,
      attendance: db.attendance.filter((a) => !removedIds.has(a.studentId)),
      feedback: db.feedback.filter((f) => !removedIds.has(f.studentId)),
      evaluations: db.evaluations.filter((e) => !removedIds.has(e.studentId)),
      monthlyAssessments: (db.monthlyAssessments || []).filter((m) => !removedIds.has(m.studentId)),
      transactions: db.transactions.filter((t) => !removedIds.has(t.studentId)),
    };

    const scopeNames = {
      all: 'Toàn bộ học sinh trong hệ thống',
      sample: 'Danh sách học sinh mẫu (Demo)',
      year: `Học sinh năm học ${options.yearId || db.currentSchoolYearId}`,
      class: `Học sinh lớp ${options.classId}`,
    };

    this.save(updatedDb, true, {
      category: 'Học sinh',
      action: 'Xóa danh sách học sinh để tạo mới',
      details: `Đã xóa ${removedCount} học sinh (${scopeNames[options.scope]}). Hệ thống sẵn sàng để người dùng nhập/tải lên danh sách học sinh mới chính xác.`,
      status: 'SUCCESS',
    });

    return removedCount;
  }

  /**
   * Lưu nhận xét Thông tư 27 theo tháng
   */
  public saveMonthlyAssessment(record: MonthlyAssessmentTT27): void {
    const db = this.getDb();
    const existing = db.monthlyAssessments || [];
    const index = existing.findIndex(
      (m) => m.studentId === record.studentId && m.month === record.month && m.schoolYearId === record.schoolYearId
    );

    let updated: MonthlyAssessmentTT27[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      updated = [
        ...existing,
        {
          ...record,
          id: record.id || `MA_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    this.save(
      { ...db, monthlyAssessments: updated },
      true,
      {
        category: 'Nhận xét TT27',
        action: 'Lưu sổ nhận xét Tháng ' + record.month,
        details: `Đã cập nhật nhận xét Thông tư 27 cho học sinh ${record.studentName || record.studentId} Tháng ${record.month}.`,
      }
    );
  }

  /**
   * Quản lý lớp chuyên / nhô
   */
  public saveSubjectClass(subjectCls: SubjectClass): void {
    const db = this.getDb();
    const existing = db.subjectClasses || [];
    const index = existing.findIndex((c) => c.id === subjectCls.id);

    let updated: SubjectClass[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = { ...subjectCls, updatedAt: new Date().toISOString() };
    } else {
      updated = [
        ...existing,
        {
          ...subjectCls,
          id: subjectCls.id || `SUBJ_CLS_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    this.save(
      { ...db, subjectClasses: updated },
      true,
      {
        category: 'Lớp bộ môn',
        action: 'Lưu lớp bộ môn chuyên / nhô',
        details: `Đã lưu lớp môn ${subjectCls.subject} (${subjectCls.name}).`,
      }
    );
  }

  public deleteSubjectClass(id: string): void {
    const db = this.getDb();
    const target = (db.subjectClasses || []).find((c) => c.id === id);
    const updatedSubjectClasses = (db.subjectClasses || []).filter((c) => c.id !== id);

    let updatedTeachers = db.teachers;
    let updatedClasses = db.classes;

    if (target) {
      // If target had a teacher and linked classes, unlink them from the teacher's assignedClassIds
      const teacherName = target.teacherName?.trim().toLowerCase();
      const teacherId = target.teacherId;
      const linkedIds = target.linkedClassIds || [];

      if ((teacherId || teacherName) && linkedIds.length > 0) {
        updatedTeachers = db.teachers.map((t) => {
          const isThisTeacher =
            (teacherId && t.id === teacherId) ||
            (teacherName && t.fullName?.trim().toLowerCase() === teacherName);
          if (isThisTeacher) {
            return {
              ...t,
              assignedClassIds: (t.assignedClassIds || []).filter((cid) => !linkedIds.includes(cid)),
            };
          }
          return t;
        });

        updatedClasses = db.classes.map((cls) => {
          if (linkedIds.includes(cls.id)) {
            const isMatchTeacher =
              (teacherId && cls.homeroomTeacherId === teacherId) ||
              (teacherName && cls.customTeacherName?.trim().toLowerCase() === teacherName);
            return {
              ...cls,
              subjectTeacherIds: (cls.subjectTeacherIds || []).filter((tid) => tid !== teacherId),
              ...(isMatchTeacher && cls.homeroomTeacherId !== 'T001'
                ? {
                    homeroomTeacherId: 'T001',
                    customTeacherName: 'Chưa phân công',
                    customTeacherPhone: '',
                  }
                : {}),
            };
          }
          return cls;
        });
      }
    }

    const updatedDb: AppDatabase = {
      ...db,
      teachers: updatedTeachers,
      classes: updatedClasses,
      subjectClasses: updatedSubjectClasses,
    };

    this.save(
      updatedDb,
      true,
      {
        category: 'Lớp bộ môn',
        action: 'Xóa lớp bộ môn chuyên / nhô',
        details: `Đã xóa lớp bộ môn "${target?.name || id}".`,
      }
    );
  }

  public importBackupJson(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.schoolYears || !data.classes || !data.students) {
        return { success: false, message: 'Tệp sao lưu không đúng định dạng dữ liệu trường học.' };
      }
      this.save(data, true, {
        category: 'Sao lưu',
        action: 'Khôi phục từ tệp sao lưu JSON',
        details: `Khôi phục thành công ${data.students.length} học sinh và ${data.classes.length} lớp học.`,
      });
      return { success: true, message: 'Đã khôi phục toàn bộ dữ liệu thành công!' };
    } catch (err: any) {
      return { success: false, message: `Lỗi đọc tệp sao lưu: ${err.message}` };
    }
  }

  /**
   * Tạo bản sao lưu toàn diện hệ thống (Auto-Backup & Manual Backup)
   * Tự động lưu trạng thái học sinh, điểm danh, nhận xét, thi đua
   */
  public createBackup(
    reason: string,
    type: 'auto_import' | 'auto_edit' | 'manual' = 'manual'
  ): DatabaseBackup {
    const db = this.getDb();
    const studentCount = db.students?.length || 0;
    const teacherCount = db.teachers?.length || 0;
    const classCount = db.classes?.length || 0;

    // Summary of classes and student distribution
    const classSummaryMap: Record<string, number> = {};
    (db.classes || []).forEach((c) => {
      classSummaryMap[c.name] = 0;
    });
    (db.students || []).forEach((s) => {
      const cls = db.classes.find((c) => c.id === s.currentClassId);
      const name = cls?.name || 'Khác';
      classSummaryMap[name] = (classSummaryMap[name] || 0) + 1;
    });

    const summaryStr =
      Object.entries(classSummaryMap)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => `${name}: ${count} em`)
        .join(', ') || 'Chưa có học sinh';

    // Shallow snapshot without nested backup list to prevent recursive explosion
    const snapshotDb = {
      ...db,
      backups: undefined,
    };

    const newBackup: DatabaseBackup = {
      id: `BK_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      reason,
      studentCount,
      teacherCount,
      classCount,
      classesSummary: summaryStr,
      performedBy: db.currentUser?.fullName || 'Hệ thống tự động',
      type,
      data: JSON.stringify(snapshotDb),
    };

    const existingBackups = this.getBackups();
    const updatedBackups = [newBackup, ...existingBackups.filter((b) => b.id !== newBackup.id)].slice(0, 30);
    db.backups = updatedBackups;

    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updatedBackups));
    } catch (e) {
      console.warn('Could not write to BACKUP_STORAGE_KEY:', e);
    }

    return newBackup;
  }

  public getBackups(): DatabaseBackup[] {
    const db = this.getDb();
    if (db.backups && Array.isArray(db.backups) && db.backups.length > 0) {
      return db.backups;
    }
    try {
      const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  public async restoreBackup(backupId: string): Promise<boolean> {
    const all = this.getBackups();
    const target = all.find((b) => b.id === backupId);
    if (!target || !target.data) return false;

    try {
      const parsed = JSON.parse(target.data) as AppDatabase;
      parsed.backups = all; // Keep backup history intact
      const reconciled = this.reconcileDb(parsed);

      await this.save(reconciled, true, {
        category: 'Hệ thống',
        action: 'Khôi phục từ bản sao lưu',
        details: `Đã khôi phục thành công bản sao lưu "${target.reason}" (${target.studentCount} học sinh).`,
        status: 'SUCCESS',
      });
      return true;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return false;
    }
  }

  public deleteBackup(backupId: string): void {
    const db = this.getDb();
    const current = this.getBackups();
    const updated = current.filter((b) => b.id !== backupId);
    db.backups = updated;
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    this.notify();
  }

  public downloadBackupJson(backupId?: string): void {
    const db = this.getDb();
    let contentToExport: any = db;
    let filename = `SAO_LUU_TRUONG_NAM_PHUOC_${new Date().toISOString().slice(0, 10)}.json`;

    if (backupId) {
      const bks = this.getBackups();
      const target = bks.find((b) => b.id === backupId);
      if (target && target.data) {
        contentToExport = JSON.parse(target.data);
        filename = `SAO_LUU_${backupId}_${new Date(target.timestamp).toISOString().slice(0, 10)}.json`;
      }
    }

    const blob = new Blob([JSON.stringify(contentToExport, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Tự động sinh hoặc cập nhật các lớp bộ môn (SubjectClass) cho giáo viên
   * Liên kết tự động danh sách học sinh từ giáo viên chủ nhiệm
   */
  public syncTeacherSubjectClasses(teacher: Teacher, dbInstance?: AppDatabase): AppDatabase {
    const currentDb = dbInstance || this.getDb();
    let subjectClasses = [...(currentDb.subjectClasses || [])];

    if (
      !teacher.subjects ||
      teacher.subjects.length === 0 ||
      !teacher.assignedClassIds ||
      teacher.assignedClassIds.length === 0
    ) {
      return currentDb;
    }

    teacher.subjects.forEach((subject) => {
      teacher.assignedClassIds.forEach((classId) => {
        const cls = currentDb.classes.find((c) => c.id === classId);
        const className = cls?.name || classId;
        const expectedName = `${subject} Lớp ${className}`;

        const existingIdx = subjectClasses.findIndex(
          (sc) =>
            (sc.teacherId === teacher.id &&
              sc.subject.toLowerCase() === subject.toLowerCase() &&
              (sc.linkedClassIds || []).includes(classId)) ||
            (sc.name.toLowerCase() === expectedName.toLowerCase() && sc.teacherId === teacher.id)
        );

        if (existingIdx >= 0) {
          const existing = subjectClasses[existingIdx];
          const linked = Array.from(new Set([...(existing.linkedClassIds || []), classId]));
          subjectClasses[existingIdx] = {
            ...existing,
            teacherName: teacher.fullName,
            teacherId: teacher.id,
            name: expectedName,
            subject,
            type: 'linked',
            linkedClassIds: linked,
            updatedAt: new Date().toISOString(),
          };
        } else {
          const newClass: SubjectClass = {
            id: `SUBJ_${teacher.id}_${classId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: expectedName,
            subject,
            teacherId: teacher.id,
            teacherName: teacher.fullName,
            schoolYearId: currentDb.currentSchoolYearId || 'SY2026_2027',
            type: 'linked',
            linkedClassIds: [classId],
            customStudentIds: [],
            roomNumber: `Phòng bộ môn ${subject}`,
            schedule: `Theo phân công của ${teacher.fullName}`,
            evaluations: [],
            attendanceDays: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          subjectClasses.push(newClass);
        }
      });
    });

    currentDb.subjectClasses = subjectClasses;
    return currentDb;
  }

  /**
   * Đồng bộ toàn bộ các lớp chuyên/nhô cho tất cả giáo viên trong trường
   */
  public syncAllTeachersSubjectClasses(): { count: number; totalClasses: number } {
    const db = this.getDb();
    let updatedDb = { ...db };
    let syncedTeachersCount = 0;

    (db.teachers || []).forEach((teacher) => {
      if (
        teacher.subjects &&
        teacher.subjects.length > 0 &&
        teacher.assignedClassIds &&
        teacher.assignedClassIds.length > 0
      ) {
        updatedDb = this.syncTeacherSubjectClasses(teacher, updatedDb);
        syncedTeachersCount++;
      }
    });

    this.save(updatedDb, true, {
      category: 'Lớp bộ môn',
      action: 'Tự động đồng bộ toàn bộ lớp chuyên / nhô',
      details: `Đã đồng bộ thành công lớp học cho ${syncedTeachersCount} giáo viên bộ môn. Tổng cộng ${updatedDb.subjectClasses?.length || 0} lớp bộ môn.`,
    });

    this.createBackup(
      `Tự động đồng bộ lớp chuyên/nhô cho ${syncedTeachersCount} giáo viên`,
      'auto_edit'
    );

    return {
      count: syncedTeachersCount,
      totalClasses: updatedDb.subjectClasses?.length || 0,
    };
  }

  /**
   * Chuyển đổi toàn bộ địa chỉ có chứa "Duy Phước" thành "Nam Phước" trong cơ sở dữ liệu
   */
  public migrateStudentsAddressToNamPhuoc(): { updated: number } {
    const db = this.getDb();
    let count = 0;
    const updatedStudents = (db.students || []).map((stu) => {
      if (stu.address && /duy\s*phước/i.test(stu.address)) {
        count++;
        return {
          ...stu,
          address: normalizeStudentAddress(stu.address),
          updatedAt: new Date().toISOString(),
        };
      }
      return stu;
    });

    if (count > 0) {
      this.save(
        { ...db, students: updatedStudents },
        true,
        {
          category: 'Học sinh',
          action: 'Chuẩn hóa địa chỉ Nam Phước',
          details: `Đã tự động chuẩn hóa đổi địa chỉ từ "Duy Phước" sang "Nam Phước" cho ${count} học sinh.`,
        }
      );
      this.createBackup(`Chuẩn hóa địa chỉ Nam Phước cho ${count} học sinh`, 'auto_edit');
    }

    return { updated: count };
  }

  /**
   * Thêm các lượt ghi điểm thi đua mới và lưu đồng bộ tức thì
   */
  public async addCompetitionTransactions(newTx: CompetitionTransaction[], reason?: string): Promise<void> {
    const db = this.getDb();
    const updatedTransactions = mergeTransactions(newTx, db.transactions || []);
    const updatedDb = {
      ...db,
      transactions: updatedTransactions,
    };
    try {
      localStorage.setItem(EMERGENCY_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    } catch (e) {}
    await this.save(updatedDb, true, {
      category: 'Thi đua',
      action: 'Cộng/Trừ điểm thi đua',
      details: reason || `Đã lưu ${newTx.length} lượt ghi nhận điểm thi đua.`,
      status: 'SUCCESS',
    });
  }

  /**
   * Xóa một lượt điểm thi đua đã nhập
   */
  public async deleteCompetitionTransaction(transactionId: string): Promise<void> {
    const db = this.getDb();
    const target = (db.transactions || []).find((t) => t.id === transactionId);
    const updatedTransactions = (db.transactions || []).filter((t) => t.id !== transactionId);
    const updatedDb = {
      ...db,
      transactions: updatedTransactions,
    };
    try {
      localStorage.setItem(EMERGENCY_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    } catch (e) {}
    await this.save(updatedDb, true, {
      category: 'Thi đua',
      action: 'Xóa điểm thi đua',
      details: `Đã xóa lượt ghi điểm thi đua "${target?.criterionName || transactionId}" của học sinh.`,
      status: 'SUCCESS',
    });
  }

  /**
   * Cập nhật lại toàn bộ điểm thi đua đã nhập trước đây theo mốc Tuần 1 từ 07/09/2026
   */
  public async migrateCompetitionTransactionsWeek(): Promise<{ updated: number; total: number }> {
    const db = this.getDb();
    const { updatedTransactions, count } = normalizeTransactionsSchoolWeek(db.transactions || []);
    if (count > 0 || (db.transactions && db.transactions.length > 0)) {
      const updatedDb = {
        ...db,
        transactions: updatedTransactions,
      };
      try {
        localStorage.setItem(EMERGENCY_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
      } catch (e) {}
      await this.save(updatedDb, true, {
        category: 'Thi đua',
        action: 'Cập nhật lại tuần thi đua (Tuần 1 từ 07/09/2026)',
        details: `Đã cập nhật lại tuần học và thời gian cho ${count}/${db.transactions?.length || 0} điểm thi đua đã nhập trước đây (Tuần 1 bắt đầu từ 07/09/2026).`,
        status: 'SUCCESS',
      });
    }
    return { updated: count, total: db.transactions?.length || 0 };
  }
}

export const storage = new StorageService();
