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
const FIRESTORE_COLLECTION = 'school_database';
const FIRESTORE_DOC_ID = 'nam_phuoc_duy_phuoc_2';

export {
  INITIAL_SCHOOL_YEARS,
  INITIAL_GRADES,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
};

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'Trường Tiểu học Nam Phước',
  branchName: 'Phân hiệu 2 Duy Phước 2',
  ownerName: 'Thanh Nguyễn',
  ownerEmail: 'thanhthanhnguyen265@gmail.com',
  ownerPhone: '0905 123 456',
  copyrightNotice: 'Bản quyền sở hữu thuộc về Thanh Nguyễn. Mọi sửa đổi phải được sự chấp thuận từ chủ sở hữu.',
  address: 'Thôn Lang Châu Bắc, Xã Duy Phước, Huyện Duy Xuyên',
  district: 'Huyện Duy Xuyên',
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
        this.cache = this.reconcileDb(remoteData);
        this.isCloudConnected = true;
        this.notify();
      }

      // Listen for real-time changes across devices
      this.firestoreUnsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists() && !this.isSaving) {
          const remoteData = snapshot.data() as AppDatabase;
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
    if (!parsed.students || !Array.isArray(parsed.students)) {
      parsed.students = [];
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
    }
    if (!parsed.studentHistory || !Array.isArray(parsed.studentHistory)) {
      parsed.studentHistory = [];
    }
    if (!parsed.schoolYears || !Array.isArray(parsed.schoolYears) || parsed.schoolYears.length === 0) {
      parsed.schoolYears = base.schoolYears;
    }
    if (!parsed.teachers || !Array.isArray(parsed.teachers) || parsed.teachers.length === 0) {
      parsed.teachers = base.teachers;
    }
    if (!parsed.criteria || !Array.isArray(parsed.criteria) || parsed.criteria.length === 0) {
      parsed.criteria = base.criteria;
    }
    if (!parsed.badges || !Array.isArray(parsed.badges) || parsed.badges.length === 0) {
      parsed.badges = base.badges;
    }
    if (!parsed.settings) {
      parsed.settings = base.settings;
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
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      parsed.transactions = [];
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

    this.cache = newDb;
    this.isSaving = true;

    try {
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

  public downloadBackupJson(): void {
    const json = this.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sao_Luu_TH_Nam_Phuoc_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    const updated = (db.subjectClasses || []).filter((c) => c.id !== id);
    this.save(
      { ...db, subjectClasses: updated },
      true,
      {
        category: 'Lớp bộ môn',
        action: 'Xóa lớp bộ môn chuyên / nhô',
        details: `Đã xóa lớp bộ môn chuyên/nhô mã ${id}.`,
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
}

export const storage = new StorageService();
