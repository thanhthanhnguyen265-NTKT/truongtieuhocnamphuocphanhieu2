import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  Link,
  Layers,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  DownloadCloud,
  FileCheck2,
  Award,
  Sparkles,
  X,
  Check,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  History,
  AlertCircle,
  Save,
  MessageSquare,
  ChevronRight,
  HelpCircle,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage, getSchoolWeekFromDate, getMonthFromDate } from '../services/storage';
import {
  SubjectClass,
  Student,
  SubjectClassEvaluation,
  SubjectClassAttendanceDay,
  CompetitionTransaction,
  AttendanceStatus,
} from '../types';
import { ChibiAvatar } from '../data/chibiAvatars';

export const SPECIALIZED_SUBJECTS = [
  'Tiếng Anh',
  'Tin học',
  'Mỹ thuật',
  'Âm nhạc',
  'GD Thể chất',
  'Khoa học',
  'Lịch sử & Địa lý',
  'Đạo đức',
  'Kỹ năng sống / CLB',
];

// Tiêu chí cộng / trừ điểm thi đua đặc thù cho giáo viên chuyên / nhô
export interface SpecializedCriterion {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  points: number;
  category: 'Học tập & Thực hành' | 'Nề nếp & Kỷ luật' | 'Đồ dùng học tập' | 'Phong trào & CLB';
  description: string;
}

export const SPECIALIZED_CRITERIA: SpecializedCriterion[] = [
  // Điểm cộng (+)
  {
    id: 'SC_POS_1',
    name: 'Phát biểu xây dựng bài sôi nổi môn chuyên',
    type: 'positive',
    points: 2,
    category: 'Học tập & Thực hành',
    description: 'Tích cực hăng hái giơ tay, trả lời chính xác câu hỏi chuyên môn',
  },
  {
    id: 'SC_POS_2',
    name: 'Hoàn thành xuất sắc bài thực hành / sản phẩm',
    type: 'positive',
    points: 3,
    category: 'Học tập & Thực hành',
    description: 'Tạo ra sản phẩm mỹ thuật đẹp, bài lập trình/gõ máy chuẩn, hát đúng nhịp',
  },
  {
    id: 'SC_POS_3',
    name: 'Đạt điểm 9-10 bài kiểm tra chuyên môn',
    type: 'positive',
    points: 5,
    category: 'Học tập & Thực hành',
    description: 'Đạt điểm giỏi trong bài kiểm tra định kỳ hoặc thường xuyên môn chuyên',
  },
  {
    id: 'SC_POS_4',
    name: 'Chuẩn bị đầy đủ đồ dùng, sách vở chuyên biệt',
    type: 'positive',
    points: 2,
    category: 'Đồ dùng học tập',
    description: 'Có đầy đủ bút vẽ, màu nước, sách Tiếng Anh, trang phục thể thao',
  },
  {
    id: 'SC_POS_5',
    name: 'Hợp tác nhóm tốt và hỗ trợ bạn cùng học',
    type: 'positive',
    points: 2,
    category: 'Học tập & Thực hành',
    description: 'Tinh thần tương trợ, hướng dẫn bạn cùng bàn hoàn thành bài tập thực hành',
  },
  {
    id: 'SC_POS_6',
    name: 'Có tiến bộ vượt bậc trong tiết học',
    type: 'positive',
    points: 3,
    category: 'Học tập & Thực hành',
    description: 'Học sinh có nhiều nỗ lực vươn lên, tiếp thu bài tốt hơn rõ rệt',
  },
  {
    id: 'SC_POS_7',
    name: 'Tích cực tham gia câu lạc bộ / phong trào năng khiếu',
    type: 'positive',
    points: 5,
    category: 'Phong trào & CLB',
    description: 'Tham gia đội tuyển Tin học trẻ, Giao lưu Tiếng Anh, Hội khỏe Phù Đổng',
  },

  // Điểm trừ (-)
  {
    id: 'SC_NEG_1',
    name: 'Quên đồ dùng học tập / sách vở môn chuyên',
    type: 'negative',
    points: -2,
    category: 'Đồ dùng học tập',
    description: 'Không mang màu vẽ, bút chì, sách bài tập hoặc trang phục học tập',
  },
  {
    id: 'SC_NEG_2',
    name: 'Không hoàn thành nhiệm vụ thực hành trên lớp',
    type: 'negative',
    points: -2,
    category: 'Học tập & Thực hành',
    description: 'Không làm bài tập nhóm hoặc không thao tác thực hành theo yêu cầu GV',
  },
  {
    id: 'SC_NEG_3',
    name: 'Mất trật tự, làm việc riêng trong giờ chuyên môn',
    type: 'negative',
    points: -2,
    category: 'Nề nếp & Kỷ luật',
    description: 'Nói chuyện tự do, làm ồn, chơi game trên máy hoặc nghịch ngợm',
  },
  {
    id: 'SC_NEG_4',
    name: 'Đi muộn vào phòng học bộ môn / phòng máy',
    type: 'negative',
    points: -1,
    category: 'Nề nếp & Kỷ luật',
    description: 'Đến lớp muộn khi chuông báo đã reo quá 5 phút',
  },
  {
    id: 'SC_NEG_5',
    name: 'Vi phạm quy định an toàn phòng học bộ môn',
    type: 'negative',
    points: -5,
    category: 'Nề nếp & Kỷ luật',
    description: 'Cắm rút thiết bị điện trái phép, tự ý nghịch hoá chất/dụng cụ nguy hiểm',
  },
  {
    id: 'SC_NEG_6',
    name: 'Không giữ gìn vệ sinh phòng học chức năng',
    type: 'negative',
    points: -2,
    category: 'Nề nếp & Kỷ luật',
    description: 'Để rác, bôi bẩn bàn ghế, không thu dọn đồ dùng sau giờ học',
  },
];

// Gợi ý nhận xét mẫu chuẩn Thông tư 27 theo từng môn chuyên
export const QUICK_COMMENTS_BY_SUBJECT: Record<string, string[]> = {
  'Tiếng Anh': [
    'Tiếp thu bài nhanh, phát âm chuẩn và tự tin giao tiếp.',
    'Nắm chắc từ vựng và mẫu câu cơ bản, chăm chỉ học tập.',
    'Có khả năng nghe - hiểu tốt, tích cực tham gia trò chuyện cùng bạn.',
    'Cần rèn luyện thêm kỹ năng phát âm và phản xạ nói.',
    'Cần tập trung ôn luyện từ vựng và tự tin hơn khi trả lời câu hỏi.',
    'Hoàn thành tốt các bài tập nghe và đọc hiểu trên lớp.',
  ],
  'Tin học': [
    'Thao tác máy tính nhanh nhẹn, hoàn thành tốt bài thực hành.',
    'Nắm vững kiến thức bài học, có tư duy logic tốt.',
    'Sử dụng thành thạo bàn phím và chuột, sáng tạo trong bài tập đồ họa.',
    'Cần luyện tập thêm kỹ năng gõ bàn phím đúng cách bằng 10 ngón.',
    'Cần chú ý lắng nghe hướng dẫn thao tác máy từ giáo viên.',
    'Có năng khiếu vượt trội trong môn học, nhiệt tình giúp đỡ bạn bè.',
  ],
  'Mỹ thuật': [
    'Bức vẽ sáng tạo, phối màu hài hòa và đường nét sinh động.',
    'Có năng khiếu hội họa nổi bật, hoàn thành sản phẩm đúng hạn.',
    'Chăm chỉ, khéo tay, biết thể hiện ý tưởng phong phú qua tranh vẽ.',
    'Cần rèn thêm kỹ năng tô màu đều tay và bố cục tranh cân đối.',
    'Cần chuẩn bị đầy đủ dụng cụ vẽ và màu nước trước khi vào lớp.',
  ],
  'Âm nhạc': [
    'Hát đúng cao độ và trường độ, biểu diễn tự tin trước lớp.',
    'Cảm thụ âm nhạc tốt, thuộc bài hát nhanh và gõ đệm nhịp nhàng.',
    'Tích cực tham gia các tiết mục văn nghệ và hoạt động nhóm.',
    'Cần chú ý nghe nhạc mẫu để hát đúng nhịp điệu của bài.',
    'Cần tự tin hơn khi thể hiện giọng hát trước tập thể lớp.',
  ],
  'GD Thể chất': [
    'Thể lực tốt, thực hiện động tác chuẩn xác, nhanh nhẹn và dứt khoát.',
    'Nhiệt tình tham gia các trò chơi vận động, có tinh thần đồng đội cao.',
    'Ý thức kỷ luật tốt, trang phục thể thao đầy đủ và đúng quy định.',
    'Cần rèn luyện thêm tính bền bỉ và chú ý khởi động kỹ trước giờ tập.',
  ],
  default: [
    'Tiếp thu bài tốt, có nhiều tiến bộ trong học tập và rèn luyện.',
    'Nắm vững kiến thức trọng tâm, tích cực phát biểu xây dựng bài.',
    'Chăm chỉ, có ý thức chuẩn bị bài và hoàn thành tốt nhiệm vụ được giao.',
    'Cần chú ý tập trung nghe giảng và rèn luyện thêm các kỹ năng cơ bản.',
    'Hợp tác tốt với bạn bè, có thái độ học tập nghiêm túc.',
  ],
};

interface SubjectClassesViewProps {
  onOpenOwnerModal?: (action: string) => void;
}

export const SubjectClassesView: React.FC<SubjectClassesViewProps> = ({
  onOpenOwnerModal,
}) => {
  const [db, setDb] = useState(storage.getDb());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SubjectClass | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    subject: string;
    teacherName: string;
    type: 'linked' | 'custom';
    linkedClassIds: string[];
    customStudentIds: string[];
    roomNumber: string;
    schedule: string;
    notes: string;
  }>({
    name: '',
    subject: 'Tiếng Anh',
    teacherName: '',
    type: 'linked',
    linkedClassIds: [db.classes[0]?.id || ''],
    customStudentIds: [],
    roomNumber: 'Phòng học bộ môn',
    schedule: 'Thứ 3 - Tiết 2',
    notes: '',
  });

  // 3 Primary Sub-modes inside an active subject class
  const [assessmentMode, setAssessmentMode] = useState<
    'evaluation' | 'attendance' | 'competition'
  >('evaluation');

  // Evaluation states (Kỳ 1 / Kỳ 2)
  const [selectedSemester, setSelectedSemester] = useState<'HK1' | 'HK2' | 'All'>('HK1');
  const [selectedPeriod, setSelectedPeriod] = useState<'Giữa kỳ' | 'Cuối kỳ'>('Cuối kỳ');

  // Attendance by session date state
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(getTodayStr());

  // In-memory working copies for instant responsiveness
  const [evaluationsState, setEvaluationsState] = useState<
    Record<string, Record<string, { level: 'T' | 'H' | 'C'; score?: number; note: string }>>
  >({});
  // evaluationsState format: { [studentId]: { HK1: { level, score, note }, HK2: { level, score, note } } }

  const [attendanceState, setAttendanceState] = useState<
    Record<string, Record<string, AttendanceStatus>>
  >({});
  // attendanceState format: { [date]: { [studentId]: status } }

  const [attendanceNotes, setAttendanceNotes] = useState<
    Record<string, Record<string, string>>
  >({});

  // Competition criteria scoring state
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>(SPECIALIZED_CRITERIA[0].id);
  const [selectedStudentIdsForScoring, setSelectedStudentIdsForScoring] = useState<string[]>([]);
  const [scoringNote, setScoringNote] = useState<string>('');
  const [criterionFilterType, setCriterionFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Folder-based teacher grouping states
  const [viewMode, setViewMode] = useState<'folder' | 'flat'>('folder');
  const [selectedTeacherFolder, setSelectedTeacherFolder] = useState<string | null>(null);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDb({ ...storage.getDb() });
    });
    return () => unsub();
  }, []);

  const subjectClasses = (db.subjectClasses || []).filter(
    (c) => !c.schoolYearId || c.schoolYearId === db.currentSchoolYearId || c.schoolYearId === 'SY2026_2027'
  );

  const filteredClasses = subjectClasses.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject =
      selectedSubjectFilter === 'all' || c.subject === selectedSubjectFilter;
    return matchSearch && matchSubject;
  });

  const activeClass = subjectClasses.find((c) => c.id === activeClassId);

  // Student list resolution
  const getStudentsForClass = (cls: SubjectClass): Student[] => {
    if (cls.type === 'linked') {
      return db.students.filter(
        (s) =>
          (cls.linkedClassIds || []).includes(s.currentClassId) &&
          (s.currentSchoolYearId === db.currentSchoolYearId || s.currentSchoolYearId === 'SY2026_2027')
      );
    } else {
      return db.students.filter((s) => (cls.customStudentIds || []).includes(s.id));
    }
  };

  // Group filteredClasses by teacher name into folders
  const teacherFolders = React.useMemo(() => {
    const map: Record<
      string,
      {
        teacherName: string;
        teacherId?: string;
        classes: SubjectClass[];
        subjects: string[];
        totalStudents: number;
      }
    > = {};

    filteredClasses.forEach((cls) => {
      const tName = (cls.teacherName || '').trim() || 'Chưa phân công giáo viên';
      if (!map[tName]) {
        map[tName] = {
          teacherName: tName,
          teacherId: cls.teacherId,
          classes: [],
          subjects: [],
          totalStudents: 0,
        };
      }
      map[tName].classes.push(cls);
      if (cls.subject && !map[tName].subjects.includes(cls.subject)) {
        map[tName].subjects.push(cls.subject);
      }
      const students = getStudentsForClass(cls);
      map[tName].totalStudents += students.length;
    });

    return Object.values(map).sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [filteredClasses, db.students, db.currentSchoolYearId]);

  const activeClassStudents = activeClass ? getStudentsForClass(activeClass) : [];

  // Initialize active class evaluations & attendance when switching class
  useEffect(() => {
    if (!activeClass) return;

    // Load evaluations
    const initialEvals: Record<
      string,
      Record<string, { level: 'T' | 'H' | 'C'; score?: number; note: string }>
    > = {};

    activeClassStudents.forEach((stu) => {
      initialEvals[stu.id] = {
        HK1: {
          level: 'H',
          score: 8,
          note: `Em tiếp thu tốt bài học môn ${activeClass.subject}.`,
        },
        HK2: {
          level: 'H',
          score: 8,
          note: `Có tiến bộ trong học tập môn ${activeClass.subject}.`,
        },
      };
    });

    if (activeClass.evaluations && activeClass.evaluations.length > 0) {
      activeClass.evaluations.forEach((item) => {
        if (!initialEvals[item.studentId]) {
          initialEvals[item.studentId] = {
            HK1: { level: 'H', note: '' },
            HK2: { level: 'H', note: '' },
          };
        }
        initialEvals[item.studentId][item.semester] = {
          level: item.level || 'H',
          score: item.score,
          note: item.note || '',
        };
      });
    }

    setEvaluationsState(initialEvals);

    // Load attendance by date
    const initialAtt: Record<string, Record<string, AttendanceStatus>> = {};
    const initialNotes: Record<string, Record<string, string>> = {};

    if (activeClass.attendanceDays && activeClass.attendanceDays.length > 0) {
      activeClass.attendanceDays.forEach((day) => {
        initialAtt[day.date] = { ...day.records };
        if (day.notes) {
          initialNotes[day.date] = { ...day.notes };
        }
      });
    }

    // Default current date if empty
    const today = getTodayStr();
    if (!initialAtt[today]) {
      initialAtt[today] = {};
      activeClassStudents.forEach((stu) => {
        initialAtt[today][stu.id] = 'present';
      });
    }

    setAttendanceState(initialAtt);
    setAttendanceNotes(initialNotes);
  }, [activeClassId]);

  // Ensure current date is initialized in attendanceState
  useEffect(() => {
    if (!selectedAttendanceDate || !activeClass) return;
    setAttendanceState((prev) => {
      if (prev[selectedAttendanceDate]) return prev;
      const newDay: Record<string, AttendanceStatus> = {};
      activeClassStudents.forEach((stu) => {
        newDay[stu.id] = 'present';
      });
      return { ...prev, [selectedAttendanceDate]: newDay };
    });
  }, [selectedAttendanceDate, activeClassId]);

  // Show transient toast
  const triggerToast = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  // Save evaluations
  const handleSaveEvaluations = () => {
    if (!activeClass) return;

    const flattenedList: SubjectClassEvaluation[] = [];
    Object.keys(evaluationsState).forEach((stuId) => {
      const stuEvals = evaluationsState[stuId];
      if (stuEvals.HK1) {
        flattenedList.push({
          studentId: stuId,
          semester: 'HK1',
          period: selectedPeriod,
          level: stuEvals.HK1.level,
          score: stuEvals.HK1.score,
          note: stuEvals.HK1.note,
          updatedAt: new Date().toISOString(),
        });
      }
      if (stuEvals.HK2) {
        flattenedList.push({
          studentId: stuId,
          semester: 'HK2',
          period: selectedPeriod,
          level: stuEvals.HK2.level,
          score: stuEvals.HK2.score,
          note: stuEvals.HK2.note,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const updatedCls: SubjectClass = {
      ...activeClass,
      evaluations: flattenedList,
      updatedAt: new Date().toISOString(),
    };

    storage.saveSubjectClass(updatedCls);
    triggerToast(
      `Đã lưu bảng đánh giá & nhận xét môn ${activeClass.subject} cho ${activeClassStudents.length} học sinh thành công!`
    );
  };

  // Save attendance for the selected date
  const handleSaveAttendanceDay = () => {
    if (!activeClass || !selectedAttendanceDate) return;

    const currentDayRecords = attendanceState[selectedAttendanceDate] || {};
    const currentDayNotes = attendanceNotes[selectedAttendanceDate] || {};

    const existingDays = activeClass.attendanceDays || [];
    const filteredDays = existingDays.filter((d) => d.date !== selectedAttendanceDate);

    const updatedDay: SubjectClassAttendanceDay = {
      date: selectedAttendanceDate,
      records: currentDayRecords,
      notes: currentDayNotes,
    };

    const updatedCls: SubjectClass = {
      ...activeClass,
      attendanceDays: [...filteredDays, updatedDay],
      updatedAt: new Date().toISOString(),
    };

    storage.saveSubjectClass(updatedCls);

    // Count present
    const presentCount = Object.values(currentDayRecords).filter((s) => s === 'present').length;
    triggerToast(
      `Đã lưu sổ điểm danh ngày ${selectedAttendanceDate} (${presentCount}/${activeClassStudents.length} có mặt) thành công!`
    );
  };

  // Mark all present for selected date
  const handleMarkAllPresent = () => {
    if (!selectedAttendanceDate) return;
    setAttendanceState((prev) => {
      const updatedDay: Record<string, AttendanceStatus> = {};
      activeClassStudents.forEach((stu) => {
        updatedDay[stu.id] = 'present';
      });
      return { ...prev, [selectedAttendanceDate]: updatedDay };
    });
    triggerToast(`Đã chọn Có mặt cho toàn bộ học sinh ngày ${selectedAttendanceDate}`);
  };

  // Quick evaluation template application
  const applyQuickLevelToAll = (level: 'T' | 'H' | 'C') => {
    const sem = selectedSemester === 'All' ? 'HK1' : selectedSemester;
    setEvaluationsState((prev) => {
      const updated = { ...prev };
      activeClassStudents.forEach((stu) => {
        if (!updated[stu.id]) {
          updated[stu.id] = {
            HK1: { level: 'H', note: '' },
            HK2: { level: 'H', note: '' },
          };
        }
        updated[stu.id] = {
          ...updated[stu.id],
          [sem]: {
            ...updated[stu.id][sem],
            level,
          },
        };
      });
      return updated;
    });
    triggerToast(`Đã gán nhanh mức [${level}] cho tất cả học sinh (${sem})`);
  };

  // Competition points for a student in this subject
  const getStudentSubjectPoints = (stuId: string): number => {
    return db.transactions
      .filter(
        (t) =>
          t.studentId === stuId &&
          (t.note?.includes(activeClass?.subject || '') ||
            t.teacherName === activeClass?.teacherName ||
            t.classId === activeClass?.id)
      )
      .reduce((sum, t) => sum + t.points, 0);
  };

  const getStudentTotalPoints = (stuId: string): number => {
    return db.transactions
      .filter((t) => t.studentId === stuId)
      .reduce((sum, t) => sum + t.points, 0);
  };

  // Apply Competition Score
  const handleApplyCompetitionScore = () => {
    if (!activeClass) return;
    if (selectedStudentIdsForScoring.length === 0) {
      alert('Vui lòng chọn ít nhất 1 học sinh để cộng/trừ điểm thi đua.');
      return;
    }

    const crit = SPECIALIZED_CRITERIA.find((c) => c.id === selectedCriterionId);
    if (!crit) return;

    const teacherName =
      activeClass.teacherName || db.currentUser?.fullName || 'Giáo viên bộ môn';
    const today = selectedAttendanceDate || getTodayStr();

    const newTransactions: CompetitionTransaction[] = selectedStudentIdsForScoring.map(
      (sid) => {
        const stu = db.students.find((s) => s.id === sid);
        return {
          id: `TRANS_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          studentId: sid,
          studentName: stu?.fullName || '',
          classId: stu?.currentClassId || activeClass.id,
          schoolYearId: db.currentSchoolYearId || 'SY2026_2027',
          type: crit.type,
          criterionId: crit.id,
          criterionName: crit.name,
          points: crit.points,
          date: today,
          weekNumber: getSchoolWeekFromDate(today),
          monthNumber: getMonthFromDate(today),
          note: scoringNote.trim()
            ? `[Môn ${activeClass.subject}] ${scoringNote.trim()}`
            : `[Môn ${activeClass.subject}] ${crit.name}`,
          teacherId: activeClass.teacherId || 'T_CUSTOM',
          teacherName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    );

    storage.save(
      { ...db, transactions: [...newTransactions, ...db.transactions] },
      true,
      {
        category: 'Thi đua',
        action: `Cộng/Trừ điểm môn ${activeClass.subject}`,
        details: `Đã ${crit.points > 0 ? 'cộng' : 'trừ'} ${Math.abs(
          crit.points
        )}đ cho ${selectedStudentIdsForScoring.length} học sinh môn ${
          activeClass.subject
        } (${crit.name}).`,
      }
    );

    triggerToast(
      `Đã ${crit.points > 0 ? 'cộng' : 'trừ'} ${Math.abs(crit.points)} điểm cho ${
        selectedStudentIdsForScoring.length
      } học sinh thành công!`
    );
    setSelectedStudentIdsForScoring([]);
    setScoringNote('');
  };

  // Toggle single student for scoring
  const toggleStudentScoring = (id: string) => {
    if (selectedStudentIdsForScoring.includes(id)) {
      setSelectedStudentIdsForScoring(selectedStudentIdsForScoring.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIdsForScoring([...selectedStudentIdsForScoring, id]);
    }
  };

  const selectAllStudentsForScoring = () => {
    if (selectedStudentIdsForScoring.length === activeClassStudents.length) {
      setSelectedStudentIdsForScoring([]);
    } else {
      setSelectedStudentIdsForScoring(activeClassStudents.map((s) => s.id));
    }
  };

  // ==========================================
  // 1. EXPORT TO WORD (.doc)
  // ==========================================
  const handleExportWord = (targetSemester: 'HK1' | 'HK2' | 'All') => {
    if (!activeClass) return;

    const semText =
      targetSemester === 'HK1'
        ? 'HỌC KỲ 1'
        : targetSemester === 'HK2'
        ? 'HỌC KỲ 2'
        : 'CẢ NĂM HỌC 2026 - 2027';

    let rowsHtml = '';
    activeClassStudents.forEach((stu, idx) => {
      const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
      const stuEval = evaluationsState[stu.id]?.[
        targetSemester === 'All' ? 'HK2' : targetSemester
      ] || { level: 'H', note: `Hoàn thành tốt nội dung môn ${activeClass.subject}.` };

      const levelLabel =
        stuEval.level === 'T'
          ? 'T (Tốt)'
          : stuEval.level === 'C'
          ? 'C (Cần cố gắng)'
          : 'H (Hoàn thành)';
      const scoreVal = stuEval.score !== undefined ? stuEval.score : '-';
      const commentText =
        stuEval.note || `Em tiếp thu bài và hoàn thành tốt yêu cầu môn ${activeClass.subject}.`;

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace;">${stu.studentCode}</td>
          <td><strong>${stu.fullName}</strong></td>
          <td style="text-align: center;">${stu.gender}</td>
          <td style="text-align: center;">Lớp ${homeClass?.name || stu.currentClassId}</td>
          <td style="text-align: center; font-weight: bold; ${
            stuEval.level === 'T'
              ? 'color: #1d4ed8;'
              : stuEval.level === 'C'
              ? 'color: #b45309;'
              : 'color: #15803d;'
          }">${levelLabel}</td>
          <td style="text-align: center; font-weight: bold;">${scoreVal}</td>
          <td>${commentText}</td>
        </tr>
      `;
    });

    const htmlDocument = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>BẢNG ĐÁNH GIÁ NHẬN XÉT MÔN ${activeClass.subject.toUpperCase()}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35; color: #111; }
          .header-tbl { width: 100%; border: none; margin-bottom: 20px; }
          .header-tbl td { border: none; vertical-align: top; }
          .title { text-align: center; font-weight: bold; font-size: 16pt; margin: 15px 0 5px 0; text-transform: uppercase; }
          .subtitle { text-align: center; font-size: 13pt; margin-bottom: 20px; }
          .data-tbl { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .data-tbl th, .data-tbl td { border: 1px solid black; padding: 6px 8px; font-size: 12pt; vertical-align: middle; }
          .data-tbl th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .sign-tbl { width: 100%; border: none; margin-top: 40px; }
          .sign-tbl td { border: none; text-align: center; vertical-align: top; width: 50%; font-size: 13pt; }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="text-align: center; width: 45%;">
              PHÒNG GD&ĐT HUYỆN DUY XUYÊN<br/>
              <strong>TRƯỜNG TIỂU HỌC NAM PHƯỚC</strong><br/>
              <em>(PHÂN HIỆU 2 DUY PHƯỚC 2)</em>
            </td>
            <td style="text-align: center; width: 55%;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
              <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
              ---------------------------------
            </td>
          </tr>
        </table>

        <div class="title">BẢNG TỔNG HỢP ĐÁNH GIÁ ĐỊNH KỲ VÀ NHẬN XÉT HỌC SINH</div>
        <div class="subtitle">
          MÔN HỌC CHUYÊN / NHÔ: <strong>${activeClass.subject.toUpperCase()}</strong><br/>
          Lớp bộ môn: <strong>${activeClass.name}</strong> • Sĩ số: <strong>${activeClassStudents.length} học sinh</strong><br/>
          <em>Thời điểm đánh giá: <strong>${semText}</strong> (Năm học 2026 - 2027)</em><br/>
          <em>Giáo viên phụ trách bộ môn: <strong>${activeClass.teacherName || 'Giáo viên bộ môn'}</strong></em>
        </div>

        <table class="data-tbl">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th style="width: 80px;">Mã HS</th>
              <th style="width: 180px;">Họ và tên học sinh</th>
              <th style="width: 60px;">Giới tính</th>
              <th style="width: 75px;">Lớp CN</th>
              <th style="width: 95px;">Mức đạt<br/>(T / H / C)</th>
              <th style="width: 65px;">Điểm KT<br/>(nếu có)</th>
              <th>Nhận xét sự tiến bộ, năng lực, phẩm chất môn học (Chuẩn TT27)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px; font-size: 12pt; font-style: italic;">
          * Ghi chú tiêu chuẩn Thông tư 27: Mức T (Hoàn thành Tốt), Mức H (Hoàn thành), Mức C (Chưa hoàn thành / Cần cố gắng).
        </div>

        <table class="sign-tbl">
          <tr>
            <td>
              <strong>BAN GIÁM HIỆU / TỔ TRƯỞNG CHUYÊN MÔN</strong><br/>
              <em>(Ký, ghi rõ họ tên và đóng dấu)</em>
              <br/><br/><br/><br/><br/>
              <strong>Thanh Nguyễn</strong>
            </td>
            <td>
              <em>Nam Phước, ngày ...... tháng ...... năm 2026</em><br/>
              <strong>GIÁO VIÊN PHỤ TRÁCH BỘ MÔN</strong><br/>
              <em>(Ký và ghi rõ họ tên)</em>
              <br/><br/><br/><br/><br/>
              <strong>${activeClass.teacherName || 'Giáo viên bộ môn'}</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlDocument], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSubj = activeClass.subject.replace(/\s+/g, '_');
    const cleanCls = activeClass.name.replace(/\s+/g, '_');
    link.download = `Nhan_Xet_${cleanSubj}_${cleanCls}_${targetSemester}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(`Đã xuất tệp Word (.doc) bảng nhận xét môn ${activeClass.subject} thành công!`);
  };

  // ==========================================
  // 2. EXPORT TO EXCEL (.xlsx)
  // ==========================================
  const handleExportExcel = () => {
    if (!activeClass) return;

    const exportRows = activeClassStudents.map((stu, idx) => {
      const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
      const evHk1 = evaluationsState[stu.id]?.HK1 || { level: 'H', note: '' };
      const evHk2 = evaluationsState[stu.id]?.HK2 || { level: 'H', note: '' };
      const subjectPts = getStudentSubjectPoints(stu.id);

      return {
        'STT': idx + 1,
        'Mã Học Sinh': stu.studentCode,
        'Họ và Tên': stu.fullName,
        'Giới Tính': stu.gender,
        'Lớp Chủ Nhiệm': homeClass?.name || stu.currentClassId,
        'Mức đạt HK1': evHk1.level,
        'Điểm KT HK1': evHk1.score ?? '',
        'Nhận xét HK1 (Chuẩn TT27)': evHk1.note,
        'Mức đạt HK2': evHk2.level,
        'Điểm KT HK2': evHk2.score ?? '',
        'Nhận xét HK2 (Chuẩn TT27)': evHk2.note,
        'Điểm thi đua môn chuyên': subjectPts > 0 ? `+${subjectPts}` : subjectPts,
        'Ghi chú': stu.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeClass.subject.substring(0, 25);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const cleanSubj = activeClass.subject.replace(/\s+/g, '_');
    const cleanCls = activeClass.name.replace(/\s+/g, '_');
    const fileName = `Nhan_Xet_${cleanSubj}_${cleanCls}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    triggerToast(`Đã xuất tệp Excel (.xlsx) danh sách và nhận xét môn ${activeClass.subject} thành công!`);
  };

  // Attendance stats for selected date
  const currentAttendanceRecords =
    (selectedAttendanceDate && attendanceState[selectedAttendanceDate]) || {};
  const presentCount = Object.values(currentAttendanceRecords).filter(
    (s) => s === 'present'
  ).length;
  const excusedCount = Object.values(currentAttendanceRecords).filter(
    (s) => s === 'excused'
  ).length;
  const unexcusedCount = Object.values(currentAttendanceRecords).filter(
    (s) => s === 'unexcused'
  ).length;
  const lateCount = Object.values(currentAttendanceRecords).filter((s) => s === 'late').length;

  const pastAttendanceDays = activeClass?.attendanceDays || [];

  // Form handling for Add/Edit
  const handleOpenAdd = (presetTeacher?: string) => {
    const tName = presetTeacher || selectedTeacherFolder || '';
    const teacherObj = db.teachers.find((t) => t.fullName === tName);
    const defaultSubj = teacherObj?.subjects?.[0] || 'Tiếng Anh';

    setEditingClass(null);
    setFormData({
      name: `${defaultSubj} Lớp ${db.classes[0]?.name || '4A'}`,
      subject: defaultSubj,
      teacherName: tName,
      type: 'linked',
      linkedClassIds: [db.classes[0]?.id || ''],
      customStudentIds: [],
      roomNumber: `Phòng bộ môn ${defaultSubj}`,
      schedule: 'Thứ 2 (Tiết 3) & Thứ 4 (Tiết 2)',
      notes: tName ? `Lớp bộ môn phân công cho ${tName}` : 'Lớp bộ môn chuyên theo phân phối chương trình',
    });
    setShowAddModal(true);
  };

  const handleOpenAddForTeacher = (teacherName: string) => {
    handleOpenAdd(teacherName);
  };

  const handleOpenEdit = (cls: SubjectClass) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      subject: cls.subject,
      teacherName: cls.teacherName || '',
      type: cls.type,
      linkedClassIds: cls.linkedClassIds || [],
      customStudentIds: cls.customStudentIds || [],
      roomNumber: cls.roomNumber || '',
      schedule: cls.schedule || '',
      notes: cls.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa lớp bộ môn "${name}" khỏi hệ thống và thư mục giáo viên?`)) {
      storage.deleteSubjectClass(id);
      if (activeClassId === id) setActiveClassId(null);
      setDb({ ...storage.getDb() });
      triggerToast(`Đã xóa lớp bộ môn "${name}" thành công!`);
    }
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const savedRecord: SubjectClass = {
      id:
        editingClass?.id ||
        `SUBJ_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: formData.name.trim(),
      subject: formData.subject,
      teacherId: editingClass?.teacherId || 'T_CUSTOM',
      teacherName: formData.teacherName.trim() || 'Giáo viên phụ trách',
      schoolYearId: db.currentSchoolYearId || 'SY2026_2027',
      type: formData.type,
      linkedClassIds: formData.linkedClassIds,
      customStudentIds: formData.customStudentIds,
      roomNumber: formData.roomNumber.trim(),
      schedule: formData.schedule.trim(),
      notes: formData.notes.trim(),
      evaluations: editingClass?.evaluations || [],
      attendanceDays: editingClass?.attendanceDays || [],
      createdAt: editingClass?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveSubjectClass(savedRecord);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {saveSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Phân Hệ Quản Lý Lớp Học Dành Cho Giáo Viên Chuyên / Nhô</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Lớp Bộ Môn Chuyên Biệt (Tiếng Anh, Tin học, Mỹ thuật, Âm nhạc, GDTC...)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý khoa học theo từng <strong>thư mục tên giáo viên</strong>, theo dõi chuyên cần theo ngày, đánh giá định kỳ Kỳ 1 & Kỳ 2 theo Thông tư 27, chấm điểm thi đua và xuất file Word/Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const res = storage.syncAllTeachersSubjectClasses();
              setSaveSuccessMessage(`Đã đồng bộ ${res.totalClasses} lớp bộ môn cho ${res.count} giáo viên!`);
              setTimeout(() => setSaveSuccessMessage(null), 4000);
            }}
            className="px-3.5 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Tự động đồng bộ và liên kết danh sách học sinh theo phân công của giáo viên"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Đồng bộ từ Giáo viên</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lớp Bộ Môn Mới</span>
          </button>
        </div>
      </div>

      {/* Main Grid or Class Detail View */}
      {!activeClass ? (
        <>
          {/* Toolbar with Folder Mode Switcher */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* View Mode Toggle: Folders vs Flat */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('folder');
                    setSelectedTeacherFolder(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'folder'
                      ? 'bg-white text-indigo-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Theo Thư Mục Giáo Viên ({teacherFolders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('flat');
                    setSelectedTeacherFolder(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'flat'
                      ? 'bg-white text-indigo-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Xem Toàn Bộ Lớp ({filteredClasses.length})</span>
                </button>
              </div>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm lớp, giáo viên, môn..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
              >
                <option value="all">Tất cả bộ môn</option>
                {SPECIALIZED_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <span>{teacherFolders.length} Thư mục GV</span>
              <span>•</span>
              <span className="text-indigo-700 font-bold">{filteredClasses.length} Lớp học</span>
            </div>
          </div>

          {/* Teacher Folder Breadcrumb Header if inside a folder */}
          {selectedTeacherFolder && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTeacherFolder(null)}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Quay lại danh sách các thư mục giáo viên"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Tất cả thư mục</span>
                </button>

                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <span>Thư mục giáo viên</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <span>{selectedTeacherFolder}</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddForTeacher(selectedTeacherFolder)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm lớp cho {selectedTeacherFolder}</span>
                </button>
              </div>
            </div>
          )}

          {/* RENDER MODE 1: Teacher Folders Grid (when viewMode is 'folder' and no folder is selected) */}
          {viewMode === 'folder' && !selectedTeacherFolder ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherFolders.length > 0 ? (
                teacherFolders.map((folder) => {
                  return (
                    <div
                      key={folder.teacherName}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                    >
                      <div>
                        {/* Folder Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                              <Folder className="w-5 h-5 fill-amber-500/20" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Thư mục giáo viên
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition line-clamp-1">
                                {folder.teacherName}
                              </h3>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold">
                            {folder.classes.length} Lớp
                          </span>
                        </div>

                        {/* Subjects badges */}
                        <div className="mb-3">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-emerald-600" />
                            <span>Môn phụ trách:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {folder.subjects.length > 0 ? (
                              folder.subjects.map((sub, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold"
                                >
                                  {sub}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Chưa xác định môn</span>
                            )}
                          </div>
                        </div>

                        {/* Statistics metrics */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              <strong>{folder.classes.length}</strong> lớp bộ môn
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Users className="w-3.5 h-3.5 text-sky-600" />
                            <span>
                              <strong>{folder.totalStudents}</strong> học sinh
                            </span>
                          </div>
                        </div>

                        {/* Class list previews in this folder */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Các lớp trong thư mục:
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {folder.classes.map((cls) => (
                              <span
                                key={cls.id}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-md text-[10px] font-medium transition"
                              >
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Folder Action Buttons */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherFolder(folder.teacherName)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Mở Thư Mục ({folder.classes.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddForTeacher(folder.teacherName)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition cursor-pointer"
                          title={`Thêm lớp cho ${folder.teacherName}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                  <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Chưa có thư mục giáo viên nào</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Nhấn nút "Đồng bộ từ Giáo viên" để tự động tạo thư mục lớp cho toàn bộ giáo viên theo môn học và lớp phân công.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const res = storage.syncAllTeachersSubjectClasses();
                      setSaveSuccessMessage(`Đã đồng bộ ${res.totalClasses} lớp bộ môn cho ${res.count} giáo viên!`);
                      setTimeout(() => setSaveSuccessMessage(null), 4000);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Đồng bộ từ Giáo viên ngay</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* RENDER MODE 2: Individual Classes Cards Grid (Inside a Teacher Folder OR in Flat View) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const classesToDisplay = selectedTeacherFolder
                  ? filteredClasses.filter((c) => {
                      const t = (c.teacherName || '').trim() || 'Chưa phân công giáo viên';
                      return t === selectedTeacherFolder;
                    })
                  : filteredClasses;

                if (classesToDisplay.length === 0) {
                  return (
                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-700">Không tìm thấy lớp học nào</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        {selectedTeacherFolder
                          ? `Thư mục "${selectedTeacherFolder}" chưa có lớp học phù hợp với bộ lọc.`
                          : 'Chưa có lớp bộ môn nào.'}
                      </p>
                      <button
                        onClick={() => handleOpenAdd(selectedTeacherFolder || undefined)}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tạo Lớp Cho Thư Mục Này</span>
                      </button>
                    </div>
                  );
                }

                return classesToDisplay.map((cls) => {
                  const students = getStudentsForClass(cls);
                  return (
                    <div
                      key={cls.id}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">
                            {cls.subject}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(cls);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                              title="Sửa lớp"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClass(cls.id, cls.name);
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition"
                              title="Xóa lớp này"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mb-1">{cls.name}</h3>

                        <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Sĩ số: <strong className="text-slate-900">{students.length}</strong> học sinh
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({cls.type === 'linked' ? 'Liên kết lớp CN' : 'Danh sách riêng'})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              GV phụ trách: <strong className="text-slate-800">{cls.teacherName || 'GV Bộ môn'}</strong>
                            </span>
                          </div>

                          {cls.schedule && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{cls.schedule}</span>
                            </div>
                          )}

                          {cls.roomNumber && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{cls.roomNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => setActiveClassId(cls.id)}
                          className="w-full py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Vào Sổ Đánh Giá, Điểm Danh & Thi Đua</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </>
      ) : (
        /* ========================================================= */
        /* DETAILED CLASS MANAGEMENT (Evaluation, Attendance, Competition) */
        /* ========================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          {/* Top Info & Actions Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <span>Lớp Bộ Môn Chuyên: {activeClass.subject}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>{activeClass.name}</span>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
                  {activeClassStudents.length} học sinh
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                GV phụ trách: <strong>{activeClass.teacherName}</strong> • {activeClass.schedule || 'Lịch học linh hoạt'} • {activeClass.roomNumber || 'Phòng bộ môn'}
              </p>
            </div>

            {/* Back button & Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveClassId(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ← Quay lại danh sách
              </button>

              {/* Nút Xuất Word (.doc) */}
              <button
                onClick={() => handleExportWord(selectedSemester)}
                className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Tải bảng nhận xét định kỳ ra file Word (.doc)"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Xuất Word (.doc)</span>
              </button>

              {/* Nút Xuất Excel (.xlsx) */}
              <button
                onClick={handleExportExcel}
                className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Tải bảng điểm và nhận xét ra file Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel (.xlsx)</span>
              </button>

              {/* Nút Xóa Lớp */}
              <button
                type="button"
                onClick={() => handleDeleteClass(activeClass.id, activeClass.name)}
                className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Xóa lớp học này"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Xóa Lớp</span>
              </button>
            </div>
          </div>

          {/* 3 Main View Modes Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-2xl">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setAssessmentMode('evaluation')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                  assessmentMode === 'evaluation'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>1. Đánh giá định kỳ & Nhận xét (Kỳ 1 & Kỳ 2)</span>
              </button>

              <button
                onClick={() => setAssessmentMode('attendance')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                  assessmentMode === 'attendance'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>2. Điểm danh buổi học theo ngày</span>
              </button>

              <button
                onClick={() => setAssessmentMode('competition')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                  assessmentMode === 'competition'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>3. Tiêu chí cộng / trừ thi đua điểm môn</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: ĐÁNH GIÁ ĐỊNH KỲ & NHẬN XÉT THEO KỲ 1 VÀ KỲ 2     */}
          {/* ========================================================= */}
          {assessmentMode === 'evaluation' && (
            <div className="space-y-4">
              {/* Semester Switcher & Quick Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Đợt đánh giá:</span>
                  <div className="flex items-center bg-white p-1 rounded-lg border border-indigo-200">
                    <button
                      onClick={() => setSelectedSemester('HK1')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        selectedSemester === 'HK1'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Học kỳ 1
                    </button>
                    <button
                      onClick={() => setSelectedSemester('HK2')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        selectedSemester === 'HK2'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Học kỳ 2
                    </button>
                    <button
                      onClick={() => setSelectedSemester('All')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        selectedSemester === 'All'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Cả năm học
                    </button>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-slate-500">Thời điểm:</span>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value as any)}
                      className="px-2 py-1 text-xs font-semibold bg-white border border-indigo-200 rounded-md outline-hidden"
                    >
                      <option value="Giữa kỳ">Giữa kỳ</option>
                      <option value="Cuối kỳ">Cuối kỳ</option>
                    </select>
                  </div>
                </div>

                {/* Quick Batch Level Assignment */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Gán nhanh:</span>
                  <button
                    type="button"
                    onClick={() => applyQuickLevelToAll('T')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition cursor-pointer"
                    title="Gán mức T (Tốt) cho toàn bộ học sinh"
                  >
                    Tất cả T (Tốt)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickLevelToAll('H')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md transition cursor-pointer"
                    title="Gán mức H (Hoàn thành) cho toàn bộ học sinh"
                  >
                    Tất cả H (Hoàn thành)
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEvaluations}
                    className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition flex items-center gap-1 shadow-2xs cursor-pointer ml-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu sổ nhận xét</span>
                  </button>
                </div>
              </div>

              {/* Evaluation Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3 w-56">Học sinh</th>
                      <th className="p-3 w-28">Lớp CN</th>
                      <th className="p-3 text-center w-36">
                        Mức đạt ({selectedSemester === 'All' ? 'HK2' : selectedSemester})
                      </th>
                      <th className="p-3 text-center w-28">
                        Điểm KTĐK (1-10)
                      </th>
                      <th className="p-3">
                        Nhận xét sự tiến bộ môn {activeClass.subject} (Chuẩn TT27)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeClassStudents.length > 0 ? (
                      activeClassStudents.map((stu, idx) => {
                        const targetSem = selectedSemester === 'All' ? 'HK2' : selectedSemester;
                        const currentEval = evaluationsState[stu.id]?.[targetSem] || {
                          level: 'H',
                          score: 8,
                          note: `Em tiếp thu tốt bài học môn ${activeClass.subject}.`,
                        };
                        const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
                        const quickSuggestions =
                          QUICK_COMMENTS_BY_SUBJECT[activeClass.subject] ||
                          QUICK_COMMENTS_BY_SUBJECT.default;

                        return (
                          <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <ChibiAvatar
                                  gender={stu.gender}
                                  avatarId={stu.chibiAvatarId}
                                  seed={stu.id || stu.studentCode}
                                  size={32}
                                  showGenderBadge={true}
                                />
                                <div>
                                  <div className="font-bold text-slate-800">{stu.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {stu.studentCode} • {stu.gender}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              Lớp {homeClass?.name || stu.currentClassId}
                            </td>

                            {/* Mức đạt (T / H / C) */}
                            <td className="p-3 text-center">
                              <select
                                value={currentEval.level}
                                onChange={(e) => {
                                  const newLevel = e.target.value as 'T' | 'H' | 'C';
                                  setEvaluationsState((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...prev[stu.id],
                                      [targetSem]: {
                                        ...currentEval,
                                        level: newLevel,
                                      },
                                    },
                                  }));
                                }}
                                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border outline-hidden cursor-pointer ${
                                  currentEval.level === 'T'
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : currentEval.level === 'C'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <option value="T">T - Hoàn thành tốt</option>
                                <option value="H">H - Hoàn thành</option>
                                <option value="C">C - Cần cố gắng</option>
                              </select>
                            </td>

                            {/* Điểm kiểm tra định kỳ (1 - 10) */}
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                step={1}
                                value={currentEval.score ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value) : undefined;
                                  setEvaluationsState((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...prev[stu.id],
                                      [targetSem]: {
                                        ...currentEval,
                                        score: val,
                                      },
                                    },
                                  }));
                                }}
                                placeholder="1 - 10"
                                className="w-16 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500"
                              />
                            </td>

                            {/* Lời nhận xét & Gợi ý nhanh */}
                            <td className="p-3 space-y-1.5">
                              <input
                                type="text"
                                value={currentEval.note}
                                onChange={(e) => {
                                  const newNote = e.target.value;
                                  setEvaluationsState((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...prev[stu.id],
                                      [targetSem]: {
                                        ...currentEval,
                                        note: newNote,
                                      },
                                    },
                                  }));
                                }}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 font-medium"
                                placeholder={`Nhận xét sự tiến bộ môn ${activeClass.subject}...`}
                              />

                              {/* Gợi ý nhận xét nhanh */}
                              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                <span className="text-slate-400 font-semibold">Gợi ý:</span>
                                {quickSuggestions.slice(0, 3).map((sug, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => {
                                      setEvaluationsState((prev) => ({
                                        ...prev,
                                        [stu.id]: {
                                          ...prev[stu.id],
                                          [targetSem]: {
                                            ...currentEval,
                                            note: sug,
                                          },
                                        },
                                      }));
                                    }}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md transition text-[10px] cursor-pointer"
                                  >
                                    + {sug.length > 28 ? sug.substring(0, 28) + '...' : sug}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          Chưa có học sinh nào trong lớp này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom save button */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleSaveEvaluations}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Sổ Đánh Giá & Nhận Xét Môn {activeClass.subject} ({selectedSemester})</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ĐIỂM DANH THEO BUỔI HỌC THÌ PHẢI HIỂN THỊ THEO NGÀY*/}
          {/* ========================================================= */}
          {assessmentMode === 'attendance' && (
            <div className="space-y-4">
              {/* Date Selector Header Banner */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Sổ Điểm Danh Buổi Học Theo Ngày Cụ Thể</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Chọn ngày học:</span>
                      <input
                        type="date"
                        value={selectedAttendanceDate}
                        onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-emerald-300 rounded-xl text-emerald-950 shadow-2xs outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setSelectedAttendanceDate(getTodayStr())}
                      className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition cursor-pointer"
                    >
                      Hôm nay
                    </button>
                  </div>
                </div>

                {/* Quick stats for selected date */}
                <div className="flex items-center gap-2">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-center shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Có mặt</div>
                    <div className="text-base font-black text-emerald-600">{presentCount}</div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-200 text-center shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Có phép</div>
                    <div className="text-base font-black text-blue-600">{excusedCount}</div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-rose-200 text-center shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Vắng</div>
                    <div className="text-base font-black text-rose-600">{unexcusedCount}</div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-center shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Muộn</div>
                    <div className="text-base font-black text-amber-600">{lateCount}</div>
                  </div>
                </div>
              </div>

              {/* Previously Recorded Dates Bar */}
              {pastAttendanceDays.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                  <span className="text-slate-500 font-bold whitespace-nowrap flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lịch sử các ngày đã điểm danh:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {pastAttendanceDays.map((d) => {
                      const dayPresent = Object.values(d.records || {}).filter(
                        (v) => v === 'present'
                      ).length;
                      const isCurrent = d.date === selectedAttendanceDate;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setSelectedAttendanceDate(d.date)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span>{d.date}</span>
                          <span className="text-[10px] opacity-80">({dayPresent} có mặt)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attendance Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3 w-60">Học sinh</th>
                      <th className="p-3 w-28">Lớp CN</th>
                      <th className="p-3 text-center w-64">
                        Trạng thái điểm danh ngày {selectedAttendanceDate}
                      </th>
                      <th className="p-3">Ghi chú lý do / tình hình buổi học</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeClassStudents.length > 0 ? (
                      activeClassStudents.map((stu, idx) => {
                        const currentStatus =
                          attendanceState[selectedAttendanceDate]?.[stu.id] || 'present';
                        const currentNote =
                          attendanceNotes[selectedAttendanceDate]?.[stu.id] || '';
                        const homeClass = db.classes.find((c) => c.id === stu.currentClassId);

                        return (
                          <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <ChibiAvatar
                                  gender={stu.gender}
                                  avatarId={stu.chibiAvatarId}
                                  seed={stu.id || stu.studentCode}
                                  size={32}
                                  showGenderBadge={true}
                                />
                                <div>
                                  <div className="font-bold text-slate-800">{stu.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {stu.studentCode} • {stu.gender}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              Lớp {homeClass?.name || stu.currentClassId}
                            </td>

                            {/* Status selector buttons */}
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceState((prev) => ({
                                      ...prev,
                                      [selectedAttendanceDate]: {
                                        ...prev[selectedAttendanceDate],
                                        [stu.id]: 'present',
                                      },
                                    }));
                                  }}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-emerald-50 text-slate-600'
                                  }`}
                                >
                                  Có mặt
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceState((prev) => ({
                                      ...prev,
                                      [selectedAttendanceDate]: {
                                        ...prev[selectedAttendanceDate],
                                        [stu.id]: 'excused',
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'excused'
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-blue-50 text-slate-600'
                                  }`}
                                >
                                  Có phép
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceState((prev) => ({
                                      ...prev,
                                      [selectedAttendanceDate]: {
                                        ...prev[selectedAttendanceDate],
                                        [stu.id]: 'unexcused',
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'unexcused'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-rose-50 text-slate-600'
                                  }`}
                                >
                                  Vắng
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceState((prev) => ({
                                      ...prev,
                                      [selectedAttendanceDate]: {
                                        ...prev[selectedAttendanceDate],
                                        [stu.id]: 'late',
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'late'
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-amber-50 text-slate-600'
                                  }`}
                                >
                                  Muộn
                                </button>
                              </div>
                            </td>

                            {/* Daily Note */}
                            <td className="p-3">
                              <input
                                type="text"
                                value={currentNote}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setAttendanceNotes((prev) => ({
                                    ...prev,
                                    [selectedAttendanceDate]: {
                                      ...prev[selectedAttendanceDate],
                                      [stu.id]: text,
                                    },
                                  }));
                                }}
                                placeholder="Ghi chú buổi học ngày hôm nay (VD: Ốm có đơn, đến muộn 10p...)"
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500"
                              />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          Chưa có học sinh nào trong lớp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Điểm danh tất cả Có mặt</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendanceDay}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Sổ Điểm Danh Ngày {selectedAttendanceDate}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: TIÊU CHÍ CỘNG / TRỪ THI ĐUA ĐIỂM TRONG LỚP HỌC     */}
          {/* ========================================================= */}
          {assessmentMode === 'competition' && (
            <div className="space-y-5">
              {/* Introduction & Category Filter */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Bộ Tiêu Chí Cộng & Trừ Điểm Thi Đua Dành Riêng Cho Lớp Môn Chuyên</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Giáo viên chuyên/nhô trực tiếp cộng điểm khuyến khích hoặc trừ điểm vi phạm nề nếp thực hành, tích hợp trực tiếp vào bảng thi đua chung toàn trường.
                  </p>
                </div>

                <div className="flex items-center bg-white p-1 rounded-xl border border-amber-200 shrink-0">
                  <button
                    onClick={() => setCriterionFilterType('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      criterionFilterType === 'all'
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả tiêu chí
                  </button>
                  <button
                    onClick={() => setCriterionFilterType('positive')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      criterionFilterType === 'positive'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Điểm cộng (+)</span>
                  </button>
                  <button
                    onClick={() => setCriterionFilterType('negative')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      criterionFilterType === 'negative'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Điểm trừ (-)</span>
                  </button>
                </div>
              </div>

              {/* Criteria Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SPECIALIZED_CRITERIA.filter(
                  (c) => criterionFilterType === 'all' || c.type === criterionFilterType
                ).map((crit) => {
                  const isSelected = selectedCriterionId === crit.id;
                  const isPositive = crit.type === 'positive';
                  return (
                    <div
                      key={crit.id}
                      onClick={() => setSelectedCriterionId(crit.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? isPositive
                            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300'
                            : 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-300'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPositive ? `+${crit.points} đ` : `${crit.points} đ`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {crit.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">
                          {crit.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {crit.description}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-bold ${
                            isSelected
                              ? isPositive
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {isSelected ? '✓ Đang chọn tiêu chí này' : 'Bấm để chọn'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scoring Panel: Target Students Selection & Apply */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">
                      Chọn học sinh cần chấm điểm:
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-md">
                      {selectedStudentIdsForScoring.length} / {activeClassStudents.length} đã chọn
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllStudentsForScoring}
                      className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition cursor-pointer"
                    >
                      {selectedStudentIdsForScoring.length === activeClassStudents.length
                        ? 'Bỏ chọn tất cả'
                        : 'Chọn tất cả cả lớp'}
                    </button>
                  </div>
                </div>

                {/* Horizontal Quick Student Selector Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                  {activeClassStudents.map((stu) => {
                    const isChecked = selectedStudentIdsForScoring.includes(stu.id);
                    const pts = getStudentSubjectPoints(stu.id);
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => toggleStudentScoring(stu.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{stu.fullName}</span>
                        <span
                          className={`text-[10px] px-1 rounded-md ${
                            pts >= 0 ? 'bg-indigo-900/30 text-white' : 'bg-rose-900/30 text-white'
                          }`}
                        >
                          {pts >= 0 ? `+${pts}` : pts}đ
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Note and Apply Action */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <input
                    type="text"
                    value={scoringNote}
                    onChange={(e) => setScoringNote(e.target.value)}
                    placeholder="Ghi chú thêm về tiết học (ví dụ: Tiết 2 Thứ 3, thực hành xuất sắc...)"
                    className="flex-1 w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  />

                  {(() => {
                    const activeCrit = SPECIALIZED_CRITERIA.find(
                      (c) => c.id === selectedCriterionId
                    );
                    const isPos = activeCrit ? activeCrit.type === 'positive' : true;
                    return (
                      <button
                        type="button"
                        onClick={handleApplyCompetitionScore}
                        disabled={selectedStudentIdsForScoring.length === 0}
                        className={`w-full sm:w-auto px-5 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                          selectedStudentIdsForScoring.length === 0
                            ? 'bg-slate-400 cursor-not-allowed'
                            : isPos
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        <span>
                          Chấm {activeCrit ? `${activeCrit.points > 0 ? '+' : ''}${activeCrit.points} đ` : ''} ({selectedStudentIdsForScoring.length} em)
                        </span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Student Points Overview Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <div className="p-3 bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Bảng tổng hợp điểm thi đua học sinh môn {activeClass.subject}:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (Điểm được cộng dồn theo thời gian thực)
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Học sinh</th>
                      <th className="p-3 text-center w-32">Lớp chủ nhiệm</th>
                      <th className="p-3 text-center w-36">Điểm môn {activeClass.subject}</th>
                      <th className="p-3 text-center w-36">Tổng điểm toàn trường</th>
                      <th className="p-3 text-center w-28">Thao tác nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeClassStudents.map((stu, idx) => {
                      const subjectPts = getStudentSubjectPoints(stu.id);
                      const totalPts = getStudentTotalPoints(stu.id);
                      const homeClass = db.classes.find((c) => c.id === stu.currentClassId);

                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <ChibiAvatar
                                gender={stu.gender}
                                avatarId={stu.chibiAvatarId}
                                seed={stu.id || stu.studentCode}
                                size={30}
                              />
                              <div>
                                <div className="font-bold text-slate-800">{stu.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {stu.studentCode}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">
                            Lớp {homeClass?.name || stu.currentClassId}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                subjectPts > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : subjectPts < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {subjectPts > 0 ? `+${subjectPts}` : subjectPts} đ
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-black">
                              +{totalPts} đ
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentIdsForScoring([stu.id]);
                                window.scrollTo({ top: 350, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition cursor-pointer"
                            >
                              Chấm điểm
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TẠO / CHỈNH SỬA LỚP BỘ MÔN                         */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>{editingClass ? 'Chỉnh sửa Lớp Bộ Môn' : 'Tạo Lớp Bộ Môn Mới'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên lớp bộ môn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Tiếng Anh 4A, Tin học Khối 4..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bộ môn chuyên biệt</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    {SPECIALIZED_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giáo viên phụ trách <span className="text-slate-400 font-normal text-[11px]">(tự nhập họ tên)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    placeholder="Ví dụ: Thầy Trần Anh Tuấn, Cô Lê Thu Hà..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Selection type: Linked from Homeroom vs Custom list */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phương thức lập danh sách học sinh:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'linked' })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      formData.type === 'linked'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Liên kết lớp chủ nhiệm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Lấy tự động toàn bộ học sinh từ 1 hoặc nhiều lớp CN.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'custom' })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      formData.type === 'custom'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tự lập danh sách riêng</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Dành cho nhóm bồi dưỡng, CLB năng khiếu...
                    </div>
                  </button>
                </div>
              </div>

              {formData.type === 'linked' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chọn các lớp chủ nhiệm được liên kết:
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {db.classes
                      .filter((c) => !c.schoolYearId || c.schoolYearId === db.currentSchoolYearId || c.schoolYearId === 'SY2026_2027' || db.classes.length <= 10)
                      .map((c) => {
                        const isChecked = formData.linkedClassIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    linkedClassIds: [...formData.linkedClassIds, c.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    linkedClassIds: formData.linkedClassIds.filter((id) => id !== c.id),
                                  });
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Lớp {c.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chọn học sinh vào lớp chuyên ({formData.customStudentIds.length} đã chọn):
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                    {db.students
                      .filter((s) => s.currentSchoolYearId === db.currentSchoolYearId || s.currentSchoolYearId === 'SY2026_2027')
                      .slice(0, 40)
                      .map((s) => {
                        const isSelected = formData.customStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer"
                          >
                            <span className="font-medium text-slate-700">
                              {s.fullName} ({s.studentCode})
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    customStudentIds: [...formData.customStudentIds, s.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    customStudentIds: formData.customStudentIds.filter((id) => id !== s.id),
                                  });
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng học / Địa điểm</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="Phòng Tin học, Phòng Âm nhạc..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lịch học</label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="Thứ 3 (Tiết 2)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về lớp học..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {editingClass ? 'Lưu thay đổi' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
