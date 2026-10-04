import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Award,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Save,
  Users,
  Lightbulb,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Info,
  Check,
  Edit3,
  X,
  Archive,
  History,
  RotateCcw,
  Trash2,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SubjectClass, Student, AppDatabase, MonthlyAssessmentTT27, MonthlyReportEditArchive } from '../types';
import { storage, getMonthFromDate } from '../services/storage';
import { generateOfficialReportHtml, openPrintReportWindow } from '../services/pdfExport';
import { ChibiAvatar } from '../data/chibiAvatars';

interface SubjectTeacherMonthlyReportProps {
  subjectClass: SubjectClass;
  students: Student[];
  db: AppDatabase;
  onClose?: () => void;
  onRefresh?: () => void;
}

// School year months for primary education (Sep -> May)
export const SCHOOL_MONTHS = [
  { value: 9, label: 'Tháng 9 (Đầu HK1)' },
  { value: 10, label: 'Tháng 10 (HK1)' },
  { value: 11, label: 'Tháng 11 (Giữa HK1)' },
  { value: 12, label: 'Tháng 12 (Cuối HK1)' },
  { value: 1, label: 'Tháng 1 (Đầu HK2)' },
  { value: 2, label: 'Tháng 2 (HK2)' },
  { value: 3, label: 'Tháng 3 (Giữa HK2)' },
  { value: 4, label: 'Tháng 4 (HK2)' },
  { value: 5, label: 'Tháng 5 (Tổng kết HK2)' },
];

export interface TargetCommentGroup {
  id: string;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  comments: string[];
}

export const ENGLISH_TARGETED_COMMENTS: TargetCommentGroup[] = [
  {
    id: 'level_T',
    label: 'Mức T (Hoàn thành tốt / Năng khiếu)',
    badge: '🌟 Mức T',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Dành cho học sinh tiếp thu nhanh, vốn từ phong phú, phát âm chuẩn, tự tin giao tiếp',
    comments: [
      'Tiếp thu bài nhanh, phát âm chuẩn xác, tự tin giao tiếp Tiếng Anh trước lớp.',
      'Vốn từ vựng phong phú, nắm chắc mẫu câu và phản xạ giao tiếp nhanh nhạy.',
      'Kỹ năng nghe và nói rất tốt, tích cực tương tác bằng Tiếng Anh cùng thầy cô và bạn bè.',
      'Đọc trôi chảy, viết đúng ngữ pháp, hoàn thành xuất sắc các bài tập trên lớp.',
      'Có năng khiếu nổi trội môn Tiếng Anh, phát âm chuẩn ngữ điệu, nhiệt tình giúp đỡ bạn.',
      'Hăng hái phát biểu xây dựng bài, đạt nhiều điểm thi đua cao trong tháng.',
      'Ghi nhớ từ vựng tốt, phản xạ nhanh trong các trò chơi ngôn ngữ và hoạt động cặp nhóm.',
      'Kỹ năng phát âm và trọng âm tốt, giọng đọc truyền cảm, tự tin thuyết trình chủ đề đơn giản.',
      'Hiểu bài sâu, biết mở rộng vốn từ và sáng tạo khi thực hành hội thoại theo cặp.',
      'Phát âm to, rõ, ngữ điệu tự nhiên, phản xạ hỏi - đáp mẫu câu Tiếng Anh rất linh hoạt.',
      'Hoàn thành các phiếu bài tập rèn luyện nhanh chóng, chữ viết Tiếng Anh sạch đẹp, cẩn thận.',
      'Thể hiện sự say mê và yêu thích môn Tiếng Anh, luôn là nhân tố tích cực trong các tiết học.',
    ],
  },
  {
    id: 'level_H',
    label: 'Mức H (Hoàn thành / Đạt chuẩn)',
    badge: '📘 Mức H',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Dành cho học sinh nắm được kiến thức cơ bản, hoàn thành bài tập, cần rèn thêm tự tin',
    comments: [
      'Nắm được từ vựng và mẫu câu cơ bản, hoàn thành tốt nhiệm vụ học tập trên lớp.',
      'Có ý thức học tập tốt, hiểu bài và thực hiện đầy đủ các bài tập nghe - nói cơ bản.',
      'Hiểu và trả lời được các câu hỏi quen thuộc, cần tự tin hơn khi nói trước tập thể.',
      'Đọc đúng từ vựng theo hướng dẫn của giáo viên, cần luyện thêm phản xạ nghe hiểu.',
      'Chăm chỉ hoàn thành bài tập, cần rèn luyện thêm kỹ năng phát âm và trọng âm từ.',
      'Biết vận dụng mẫu câu vào giao tiếp đơn giản, cần tích cực giơ tay phát biểu hơn.',
      'Thuộc từ mới theo chủ đề, cần chú ý rèn thêm kỹ năng viết chính tả từ vựng.',
      'Có cố gắng trong học tập, hoàn thành yêu cầu bài học, cần tự tin tham gia hoạt động nhóm.',
      'Tiếp thu bài đạt yêu cầu, cần chú ý lắng nghe băng mẫu để phát âm chuẩn hơn.',
      'Đã thuộc các từ vựng trọng tâm trong bài, cần luyện đọc nối âm và ngữ điệu câu hỏi.',
      'Hợp tác tốt cùng bạn trong giờ học, cần mạnh dạn xung phong đóng vai đối thoại.',
      'Chú ý theo dõi bài học, làm bài tập đầy đủ, cần ôn luyện từ vựng thường xuyên ở nhà.',
    ],
  },
  {
    id: 'level_C',
    label: 'Mức C (Chưa đạt chuẩn / Nhắc nhở)',
    badge: '⚠️ Mức C (Chưa đạt chuẩn)',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Dành cho học sinh chưa đạt chuẩn kiến thức kỹ năng, vốn từ hạn chế, cần kèm cặp hỗ trợ',
    comments: [
      'Chưa đạt chuẩn kỹ năng nghe - nói cơ bản, cần tập trung ôn luyện từ vựng và mẫu câu hàng ngày.',
      'Phát âm còn ngập ngừng, chưa đạt chuẩn ngữ điệu, cần chú ý lắng nghe và nhắc lại theo phát âm mẫu của giáo viên.',
      'Vốn từ vựng còn hạn chế, chưa nhớ mặt chữ, cần dành thời gian luyện viết và ghi nhớ từ mới ở nhà.',
      'Còn nhút nhát khi giao tiếp, chưa đạt chuẩn phản xạ đối đáp, cần mạnh dạn tham gia luyện nói cùng bạn.',
      'Kỹ năng nghe hiểu còn chậm, chưa nắm chắc các mẫu câu giao tiếp đơn giản trong chương trình.',
      'Cần chuẩn bị bài chu đáo hơn trước khi đến lớp, mang đầy đủ sách bài tập và đồ dùng học tập môn Tiếng Anh.',
      'Cần tích cực phát biểu và rèn luyện thêm kỹ năng đọc - viết các từ đơn giản để đạt chuẩn.',
      'Gia đình cần phối hợp nhắc nhở em nghe lại các bài hội thoại mẫu và ôn từ vựng theo sách giáo khoa.',
      'Còn mất tập trung trong giờ học, cần chú ý nghe giảng để nắm chắc mẫu câu cơ bản.',
      'Còn lúng túng khi làm bài tập độc lập, cần giáo viên hỗ trợ kèm cặp thêm trong các tiết ôn tập.',
      'Chưa thuộc từ vựng bài học, cần tích cực rèn luyện kỹ năng nhớ từ và ghép câu đơn giản.',
      'Cần chủ động trao đổi với thầy cô khi chưa hiểu bài để nâng cao kết quả học tập môn Tiếng Anh.',
    ],
  },
  {
    id: 'skills_listen_speak',
    label: 'Kỹ năng Nghe - Nói & Phát âm (Phonics)',
    badge: '🗣️ Nghe - Nói',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Đánh giá chuyên sâu về ngữ điệu, phản xạ, đóng vai và giao tiếp',
    comments: [
      'Nghe - hiểu tốt các đoạn hội thoại mẫu, phản xạ đối đáp nhanh và tự nhiên.',
      'Phát âm rõ ràng, có ngữ điệu tự nhiên, rất tự tin khi thực hành đóng vai (role-play).',
      'Nghe bắt từ khóa (keywords) tốt, cần luyện thêm ngữ điệu và nối âm khi nói.',
      'Cần luyện nghe nhiều hơn qua bài hát và đoạn hội thoại ngắn để cải thiện khả năng nghe - hiểu.',
      'Có khả năng bắt chước ngữ điệu rất tốt, hào hứng tham gia các bài vè và bài hát Tiếng Anh.',
      'Phát âm to, rõ ràng, chú ý tốt các âm cuối (ending sounds: /s/, /t/, /d/).',
      'Cần chú ý nghe kỹ trọng âm của từ và phát âm đúng các nguyên âm đôi.',
      'Phản xạ nghe câu lệnh Tiếng Anh của giáo viên nhanh, thực hiện động tác chuẩn xác.',
      'Tự tin thể hiện bài hát và vè Tiếng Anh trước lớp, phát âm chuẩn xác từng câu từ.',
    ],
  },
  {
    id: 'skills_read_write',
    label: 'Kỹ năng Đọc - Viết & Từ vựng',
    badge: '✍️ Đọc - Viết',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Đánh giá chuyên sâu về nhận diện mặt chữ, đọc hiểu, viết câu và chính tả từ',
    comments: [
      'Đọc to, rõ ràng, phát âm đúng các âm đuôi, viết câu đúng chính tả và cấu trúc.',
      'Nhận diện mặt chữ nhanh, đọc hiểu tốt các đoạn văn ngắn theo chủ đề bài học.',
      'Viết chữ cẩn thận, đúng mẫu câu và cấu trúc, ghi chép bài học đầy đủ sạch đẹp.',
      'Cần rèn thêm kỹ năng nhận diện từ và viết đúng thứ tự các chữ cái trong từ mới.',
      'Đọc hiểu cơ bản tốt, cần chú ý dấu câu và viết hoa đầu câu khi làm bài viết.',
      'Thuộc nghĩa và viết đúng chính tả các từ vựng trọng tâm trong chương trình.',
      'Đọc diễn cảm, hiểu nhanh câu hỏi đọc hiểu và đưa ra câu trả lời chính xác.',
      'Hoàn thành xuất sắc các bài tập nối từ, điền từ vào chỗ trống và sắp xếp lại câu.',
      'Chữ viết Tiếng Anh ngay ngắn, trình bày vở cẩn thận, đúng quy định.',
    ],
  },
  {
    id: 'progress_competition',
    label: 'Khen thưởng thi đua & Tiến bộ vượt bậc',
    badge: '🏆 Thi đua',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'Dành cho học sinh có điểm thi đua cao, nỗ lực vươn lên, đóng góp cho tập thể',
    comments: [
      'Có nhiều tiến bộ vượt bậc trong tháng, phát biểu bài hăng hái và tự tin hơn rõ rệt.',
      'Tích cực hoạt động nhóm, là nhóm trưởng gương mẫu, dẫn dắt các bạn học tập tốt.',
      'Đạt thành tích thi đua xuất sắc trong tháng, chuẩn bị đồ dùng và bài vở môn Tiếng Anh rất chu đáo.',
      'Đã có nhiều cố gắng khắc phục tính nhút nhát, có tiến bộ rõ nét trong kỹ năng phát âm và đọc bài.',
      'Đạt nhiều bông hoa điểm tốt môn Tiếng Anh, thái độ học tập nghiêm túc và gương mẫu.',
      'Hăng say tham gia các trò chơi học tập môn Tiếng Anh, tạo không khí học tập sôi nổi cho lớp.',
      'Có tinh thần đồng đội cao, nhiệt tình hướng dẫn bạn cùng bàn luyện nói Tiếng Anh.',
      'Đã có ý thức giơ tay phát biểu bài nhiều hơn, có sự tiến bộ đáng khen trong kỹ năng viết từ mới.',
    ],
  },
  {
    id: 'attitude_discipline',
    label: 'Nề nếp & Thái độ học tập',
    badge: '⭐ Nề nếp',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Đánh giá tinh thần học tập, chuẩn bị bài, nề nếp kỷ luật trong giờ học Tiếng Anh',
    comments: [
      'Đi học đúng giờ, mang đầy đủ sách bài tập và đồ dùng học tập môn Tiếng Anh.',
      'Thái độ học tập nghiêm túc, chú ý lắng nghe thầy cô giảng bài và ghi chép cẩn thận.',
      'Ý thức tự giác học tập tốt, luôn hoàn thành bài tập về nhà trước khi đến lớp.',
      'Cần chú ý trật tự trong giờ học, tránh làm việc riêng để không bỏ lỡ kiến thức bài giảng.',
      'Cần chuẩn bị bài chu đáo trước khi đến lớp, tích cực tương tác cùng giáo viên.',
      'Thực hiện nghiêm túc nội quy phòng học bộ môn, giữ gìn tài liệu và trang thiết bị học tập.',
    ],
  },
];

export const QUICK_COMMENTS_BY_SUBJECT: Record<string, string[]> = {
  'Tiếng Anh': [
    ...ENGLISH_TARGETED_COMMENTS.flatMap((g) => g.comments),
  ],
  'Tin học': [
    'Thao tác máy tính nhanh nhẹn, hoàn thành tốt bài thực hành.',
    'Nắm vững kiến thức bài học, có tư duy logic và thao tác chuẩn.',
    'Sử dụng thành thạo bàn phím và chuột, tích cực sáng tạo.',
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
    'Nhiệt tình tham gia các trò chơi vận động, tinh thần đồng đội cao.',
    'Ý thức kỷ luật tốt, trang phục thể thao đầy đủ và đúng quy định.',
    'Cần rèn luyện thêm tính bền bỉ và khởi động kỹ trước giờ tập.',
  ],
  default: [
    'Tiếp thu bài tốt, có nhiều tiến bộ trong học tập và rèn luyện.',
    'Nắm vững kiến thức trọng tâm, tích cực phát biểu xây dựng bài.',
    'Chăm chỉ, có ý thức chuẩn bị bài và hoàn thành tốt nhiệm vụ.',
    'Cần chú ý tập trung nghe giảng và rèn luyện thêm các kỹ năng cơ bản.',
    'Hợp tác tốt với bạn bè, có thái độ học tập nghiêm túc.',
  ],
};

export const SubjectTeacherMonthlyReport: React.FC<SubjectTeacherMonthlyReportProps> = ({
  subjectClass,
  students,
  db,
  onClose,
  onRefresh,
}) => {
  // Current month default
  const curMonth = new Date().getMonth() + 1;
  const initialMonth = [9, 10, 11, 12, 1, 2, 3, 4, 5].includes(curMonth) ? curMonth : 9;
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  // Custom teacher signature name
  const [customTeacherName, setCustomTeacherName] = useState<string>(() => {
    return subjectClass.teacherName || db.currentUser?.fullName || 'Giáo viên bộ môn';
  });
  const [isEditingTeacherName, setIsEditingTeacherName] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'T' | 'H' | 'C'>('all');
  const [pointFilter, setPointFilter] = useState<'all' | 'pos' | 'neg' | 'high'>('all');
  const [sortField, setSortField] = useState<'name' | 'points' | 'level'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Archive Modal states (Mục lưu trữ chỉnh sửa báo cáo theo tháng, theo từng lớp)
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveFilterMonth, setArchiveFilterMonth] = useState<number | 'all'>('all');
  const [selectedArchiveDetail, setSelectedArchiveDetail] = useState<MonthlyReportEditArchive | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Selected student for quick comment suggestion modal/popover
  const [activeSuggestionStudentId, setActiveSuggestionStudentId] = useState<string | null>(null);
  const [suggestionCategory, setSuggestionCategory] = useState<string>('all');
  const [suggestionSearch, setSuggestionSearch] = useState<string>('');
  const [selectedStudentTxDetail, setSelectedStudentTxDetail] = useState<Student | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Tải nhận xét và mức đánh giá theo tháng an toàn từ 3 nguồn:
   * 1. subjectClass.evaluations (đánh giá lớp bộ môn)
   * 2. db.monthlyAssessments (Thông tư 27)
   * 3. db.monthlyReportArchives (Kho lưu trữ các bản đã lưu trước đó)
   */
  const getInitialMonthlyDataForMonth = (monthToLoad: number) => {
    const updated: Record<string, { level: 'T' | 'H' | 'C'; note: string }> = {};

    // Tìm lớp bộ môn mới nhất trong cơ sở dữ liệu
    const currentClassInDb =
      (db.subjectClasses || []).find((c) => c.id === subjectClass.id) || subjectClass;

    // Tìm bản lưu trữ gần nhất cho lớp và tháng này
    const latestArchive = (db.monthlyReportArchives || []).find(
      (a) =>
        (a.classId === subjectClass.id || a.className === subjectClass.name) &&
        Number(a.month) === Number(monthToLoad)
    );

    students.forEach((stu) => {
      // 1. Kiểm tra trong subjectClass.evaluations
      const clsEval = (currentClassInDb.evaluations || subjectClass.evaluations || []).find(
        (e) => e.studentId === stu.id && Number(e.month) === Number(monthToLoad)
      );
      if (clsEval && (clsEval.note || clsEval.level)) {
        updated[stu.id] = { level: clsEval.level || 'T', note: clsEval.note || '' };
        return;
      }

      // 2. Kiểm tra trong db.monthlyAssessments
      const monthlyAssessment = (db.monthlyAssessments || []).find(
        (m) =>
          m.studentId === stu.id &&
          Number(m.month) === Number(monthToLoad) &&
          (!m.schoolYearId || !db.currentSchoolYearId || m.schoolYearId === db.currentSchoolYearId || m.schoolYearId === 'SY2026_2027')
      );
      const subjRecord = monthlyAssessment?.subjects?.[subjectClass.subject];
      if (subjRecord && (subjRecord.note || subjRecord.level)) {
        updated[stu.id] = { level: subjRecord.level || 'T', note: subjRecord.note || '' };
        return;
      }

      // 3. Kiểm tra trong kho lưu trữ bản chỉnh sửa
      if (latestArchive && latestArchive.records) {
        const archRow = latestArchive.records.find((r) => r.studentId === stu.id);
        if (archRow && (archRow.note || archRow.level)) {
          updated[stu.id] = { level: archRow.level || 'T', note: archRow.note || '' };
          return;
        }
      }

      // 4. Dự phòng: Kiểm tra đánh giá học kỳ
      const semKey = [9, 10, 11, 12].includes(monthToLoad) ? 'HK1' : 'HK2';
      const semEval = (currentClassInDb.evaluations || subjectClass.evaluations || []).find(
        (e) => e.studentId === stu.id && e.semester === semKey
      );
      if (semEval && (semEval.note || semEval.level)) {
        updated[stu.id] = { level: semEval.level || 'T', note: semEval.note || '' };
        return;
      }

      // 5. Giá trị mặc định
      updated[stu.id] = {
        level: 'T',
        note:
          subjectClass.subject === 'Tiếng Anh'
            ? 'Tiếp thu bài nhanh, phát âm chuẩn xác, tự tin giao tiếp Tiếng Anh trước lớp.'
            : `Em chăm chỉ, tiếp thu bài tốt môn ${subjectClass.subject}.`,
      };
    });

    return updated;
  };

  // State of monthly comments and levels
  const [monthlyData, setMonthlyData] = useState<
    Record<string, { level: 'T' | 'H' | 'C'; note: string }>
  >(() => getInitialMonthlyDataForMonth(initialMonth));

  // Tự động đồng bộ và nạp lại khi chuyển tháng hoặc đổi lớp
  useEffect(() => {
    const fresh = getInitialMonthlyDataForMonth(selectedMonth);
    setMonthlyData(fresh);
  }, [selectedMonth, subjectClass.id, students.length]);

  // When selectedMonth changes, reload comments
  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    const updated = getInitialMonthlyDataForMonth(newMonth);
    setMonthlyData(updated);
  };

  // Danh sách các bản lưu trữ báo cáo của lớp này
  const classArchives = useMemo(() => {
    return (db.monthlyReportArchives || []).filter(
      (a) =>
        (a.classId === subjectClass.id || a.className === subjectClass.name) &&
        (archiveFilterMonth === 'all' || Number(a.month) === Number(archiveFilterMonth))
    );
  }, [db.monthlyReportArchives, subjectClass.id, subjectClass.name, archiveFilterMonth]);

  // Khôi phục một bản báo cáo từ kho lưu trữ vào bảng làm việc
  const handleRestoreArchive = (archive: MonthlyReportEditArchive) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn nạp lại bản lưu trữ Tháng ${archive.month} (lưu ngày ${new Date(archive.editedAt).toLocaleString('vi-VN')}) vào bảng làm việc hiện tại?`
      )
    ) {
      return;
    }
    setSelectedMonth(Number(archive.month));
    const restoredData: Record<string, { level: 'T' | 'H' | 'C'; note: string }> = {};
    archive.records.forEach((r) => {
      restoredData[r.studentId] = {
        level: r.level || 'T',
        note: r.note || '',
      };
    });
    setMonthlyData(restoredData);
    setShowArchiveModal(false);
    triggerToast(
      `Đã khôi phục thành công dữ liệu báo cáo Tháng ${archive.month} lớp ${archive.className} từ kho lưu trữ!`
    );
  };

  // Xóa bản lưu trữ
  const handleDeleteArchive = (archiveId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản lưu trữ báo cáo tháng này?')) return;
    storage.deleteMonthlyReportArchive(archiveId);
    if (selectedArchiveDetail?.id === archiveId) setSelectedArchiveDetail(null);
    triggerToast('Đã xóa bản lưu trữ thành công!');
  };

  // Helper to calculate student monthly competition points
  const getStudentMonthlyCompetition = (studentId: string, month: number) => {
    const transactions = (db.transactions || []).filter((t) => {
      if (t.studentId !== studentId) return false;

      // Month match (either normalized monthNumber or parsed from date)
      const txMonth = t.monthNumber || getMonthFromDate(t.date);
      if (txMonth !== month) return false;

      // Subject relevance match:
      const noteLower = (t.note || '').toLowerCase();
      const critLower = (t.criterionName || '').toLowerCase();
      const subjLower = subjectClass.subject.toLowerCase();
      const clsNameLower = subjectClass.name.toLowerCase();

      return (
        noteLower.includes(subjLower) ||
        critLower.includes(subjLower) ||
        noteLower.includes(clsNameLower) ||
        (t.teacherName && t.teacherName.trim().toLowerCase() === (subjectClass.teacherName || '').trim().toLowerCase()) ||
        (t.classId && t.classId === subjectClass.id) ||
        (t.criterionId && t.criterionId.startsWith('SC_'))
      );
    });

    const pos = transactions
      .filter((t) => t.type === 'positive')
      .reduce((sum, t) => sum + t.points, 0);
    const neg = transactions
      .filter((t) => t.type === 'negative')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);
    const total = pos - neg;

    // Overall competition in the school in this month for context
    const allSchoolTx = (db.transactions || []).filter((t) => {
      if (t.studentId !== studentId) return false;
      const txMonth = t.monthNumber || getMonthFromDate(t.date);
      return txMonth === month;
    });
    const schoolPos = allSchoolTx
      .filter((t) => t.type === 'positive')
      .reduce((sum, t) => sum + t.points, 0);
    const schoolNeg = allSchoolTx
      .filter((t) => t.type === 'negative')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);
    const schoolTotal = schoolPos - schoolNeg;

    let rankBadge = 'Đạt chuẩn 🟢';
    let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (total >= 10) {
      rankBadge = 'Xuất sắc ⭐';
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
    } else if (total >= 5) {
      rankBadge = 'Tích cực 🌟';
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (total < 0) {
      rankBadge = 'Cần nhắc nhở ⚠️';
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300';
    }

    return {
      transactions,
      pos,
      neg,
      total,
      schoolTotal,
      rankBadge,
      badgeStyle,
      txCount: transactions.length,
    };
  };

  // Student list aggregated with competition and evaluation
  const studentRows = useMemo(() => {
    return students.map((stu, index) => {
      const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
      const evalItem = monthlyData[stu.id] || { level: 'T', note: '' };
      const comp = getStudentMonthlyCompetition(stu.id, selectedMonth);

      return {
        index: index + 1,
        student: stu,
        homeClassName: homeClass?.name || stu.currentClassId,
        level: evalItem.level,
        note: evalItem.note,
        comp,
      };
    });
  }, [students, db.classes, monthlyData, selectedMonth, db.transactions]);

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    return studentRows
      .filter((row) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = row.student.fullName.toLowerCase().includes(q);
          const matchCode = row.student.studentCode.toLowerCase().includes(q);
          const matchClass = row.homeClassName.toLowerCase().includes(q);
          const matchNote = row.note.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchClass && !matchNote) return false;
        }

        // Level filter
        if (levelFilter !== 'all' && row.level !== levelFilter) {
          return false;
        }

        // Point filter
        if (pointFilter === 'pos' && row.comp.total <= 0) return false;
        if (pointFilter === 'neg' && row.comp.total >= 0) return false;
        if (pointFilter === 'high' && row.comp.total < 5) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortAsc
            ? a.student.fullName.localeCompare(b.student.fullName, 'vi')
            : b.student.fullName.localeCompare(a.student.fullName, 'vi');
        }
        if (sortField === 'points') {
          return sortAsc ? a.comp.total - b.comp.total : b.comp.total - a.comp.total;
        }
        if (sortField === 'level') {
          const order = { T: 3, H: 2, C: 1 };
          return sortAsc
            ? (order[a.level] || 0) - (order[b.level] || 0)
            : (order[b.level] || 0) - (order[a.level] || 0);
        }
        return 0;
      });
  }, [studentRows, searchQuery, levelFilter, pointFilter, sortField, sortAsc]);

  // Overall Statistics for this month
  const stats = useMemo(() => {
    const totalStudents = studentRows.length;
    const countT = studentRows.filter((r) => r.level === 'T').length;
    const countH = studentRows.filter((r) => r.level === 'H').length;
    const countC = studentRows.filter((r) => r.level === 'C').length;

    const pctT = totalStudents > 0 ? Math.round((countT / totalStudents) * 100) : 0;
    const pctH = totalStudents > 0 ? Math.round((countH / totalStudents) * 100) : 0;
    const pctC = totalStudents > 0 ? Math.round((countC / totalStudents) * 100) : 0;

    const totalPosPoints = studentRows.reduce((sum, r) => sum + r.comp.pos, 0);
    const totalNegPoints = studentRows.reduce((sum, r) => sum + r.comp.neg, 0);
    const totalNetPoints = totalPosPoints - totalNegPoints;

    // Top students
    const sortedByPoints = [...studentRows].sort((a, b) => b.comp.total - a.comp.total);
    const topStar = sortedByPoints[0]?.comp.total > 0 ? sortedByPoints[0] : null;

    return {
      totalStudents,
      countT,
      countH,
      countC,
      pctT,
      pctH,
      pctC,
      totalPosPoints,
      totalNegPoints,
      totalNetPoints,
      topStar,
    };
  }, [studentRows]);

  // Save all monthly evaluations & synchronize
  const handleSaveMonthlyAssessments = () => {
    const sem = [9, 10, 11, 12].includes(selectedMonth) ? 'HK1' : 'HK2';
    const nowIso = new Date().toISOString();
    const targetMonth = Number(selectedMonth);

    // 1. Update subjectClass.evaluations
    const existingEvals = subjectClass.evaluations || [];
    const otherEvals = existingEvals.filter(
      (e) => !(Number(e.month) === targetMonth && students.some((s) => s.id === e.studentId))
    );

    const newClassEvals = students.map((stu) => {
      const data = monthlyData[stu.id] || { level: 'T', note: '' };
      return {
        studentId: stu.id,
        semester: sem,
        month: targetMonth,
        level: data.level,
        note: data.note,
        updatedAt: nowIso,
      };
    });

    const updatedSubjectClass: SubjectClass = {
      ...subjectClass,
      evaluations: [...otherEvals, ...newClassEvals],
      updatedAt: nowIso,
    };

    // 2. Synchronize to db.monthlyAssessments (TT27)
    let updatedMonthlyAssessments = [...(db.monthlyAssessments || [])];

    students.forEach((stu) => {
      const data = monthlyData[stu.id] || { level: 'T', note: '' };
      const matchIdx = updatedMonthlyAssessments.findIndex(
        (m) =>
          m.studentId === stu.id &&
          Number(m.month) === targetMonth &&
          (!m.schoolYearId || !db.currentSchoolYearId || m.schoolYearId === db.currentSchoolYearId || m.schoolYearId === 'SY2026_2027')
      );

      if (matchIdx >= 0) {
        const rec = updatedMonthlyAssessments[matchIdx];
        updatedMonthlyAssessments[matchIdx] = {
          ...rec,
          month: targetMonth,
          subjects: {
            ...rec.subjects,
            [subjectClass.subject]: {
              level: data.level,
              note: data.note,
            },
          },
          updatedAt: nowIso,
        };
      } else {
        const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
        const newRecord: MonthlyAssessmentTT27 = {
          id: `MA_${stu.id}_M${targetMonth}_${Date.now()}`,
          studentId: stu.id,
          studentName: stu.fullName,
          classId: homeClass?.id || subjectClass.id,
          schoolYearId: db.currentSchoolYearId || 'SY2026_2027',
          month: targetMonth,
          subjects: {
            [subjectClass.subject]: {
              level: data.level,
              note: data.note,
            },
          },
          qualities: {
            yeuNuoc: 'T',
            nhanAi: 'T',
            chamChi: 'T',
            trungThuc: 'T',
            trachNhiem: 'T',
          },
          competencies: {
            tuChuTuHoc: 'T',
            giaoTiepHopTac: 'T',
            giaiQuyetVanDe: 'T',
          },
          generalComment: `Em học tập chăm chỉ và có tiến bộ môn ${subjectClass.subject}.`,
          praiseNote: `Có ý thức học tập tốt môn ${subjectClass.subject}.`,
          supportMeasure: `Tiếp tục phát huy các thế mạnh đã đạt được.`,
          teacherId: subjectClass.teacherId || 'T001',
          teacherName: customTeacherName,
          updatedAt: nowIso,
        };
        updatedMonthlyAssessments.push(newRecord);
      }
    });

    // 3. Tự động lưu trữ một bản snapshot vào Kho lưu trữ báo cáo tháng
    const archiveRecords = students.map((stu) => {
      const data = monthlyData[stu.id] || { level: 'T', note: '' };
      const comp = getStudentMonthlyCompetition(stu.id, targetMonth);
      const homeClass = db.classes.find((c) => c.id === stu.currentClassId);
      return {
        studentId: stu.id,
        studentCode: stu.studentCode,
        studentName: stu.fullName,
        gender: stu.gender,
        homeClassName: homeClass?.name || stu.currentClassId,
        level: data.level,
        note: data.note,
        competitionPoints: comp.total,
        competitionRank: data.level === 'C' ? 'Chưa đạt chuẩn' : comp.rankBadge,
        posPoints: comp.pos,
        negPoints: comp.neg,
      };
    });

    const newArchiveEntry: MonthlyReportEditArchive = {
      id: `ARCHIVE_${subjectClass.id}_M${targetMonth}_${Date.now()}`,
      title: `Báo cáo Tháng ${targetMonth} - ${subjectClass.name} (${subjectClass.subject})`,
      classId: subjectClass.id,
      className: subjectClass.name,
      subject: subjectClass.subject,
      month: targetMonth,
      schoolYearId: db.currentSchoolYearId || 'SY2026_2027',
      editedAt: nowIso,
      editedBy: customTeacherName,
      studentCount: students.length,
      stats: {
        countT: stats.countT,
        countH: stats.countH,
        countC: stats.countC,
        pctT: stats.pctT,
        pctH: stats.pctH,
        pctC: stats.pctC,
      },
      records: archiveRecords,
      summaryNote: `Tổng điểm thi đua: +${stats.totalPosPoints}/-${stats.totalNegPoints}. Mức C (Chưa đạt chuẩn): ${stats.countC} em.`,
    };

    const updatedMonthlyReportArchives = [
      newArchiveEntry,
      ...(db.monthlyReportArchives || []).filter((a) => a.id !== newArchiveEntry.id),
    ];

    // 4. Save to database
    const updatedDb: AppDatabase = {
      ...db,
      subjectClasses: (db.subjectClasses || []).map((c) =>
        c.id === subjectClass.id ? updatedSubjectClass : c
      ),
      monthlyAssessments: updatedMonthlyAssessments,
      monthlyReportArchives: updatedMonthlyReportArchives,
    };

    storage.save(updatedDb, true, {
      category: 'Báo cáo tháng bộ môn',
      action: 'Lưu nhận xét tháng & Lưu trữ bản sửa',
      details: `Đã lưu đánh giá & lưu trữ bản báo cáo Tháng ${targetMonth} môn ${subjectClass.subject} (${subjectClass.name}) cho ${students.length} học sinh.`,
    });

    triggerToast(
      `Đã lưu & đồng bộ thành công vào kho lưu trữ nhận xét Tháng ${targetMonth} môn ${subjectClass.subject} cho ${students.length} học sinh!`
    );
    if (onRefresh) onRefresh();
  };

  // Batch assign comments
  const handleBatchApplyComment = (levelTarget: 'T' | 'H' | 'C', commentTemplate: string) => {
    setMonthlyData((prev) => {
      const updated = { ...prev };
      students.forEach((stu) => {
        const cur = updated[stu.id] || { level: 'T', note: '' };
        if (cur.level === levelTarget) {
          updated[stu.id] = {
            ...cur,
            note: commentTemplate,
          };
        }
      });
      return updated;
    });
    triggerToast(`Đã áp dụng nhận xét mẫu cho toàn bộ học sinh mức "${levelTarget}"!`);
  };

  // Grouped suggestions based on subject
  const availableCategoryGroups: TargetCommentGroup[] = useMemo(() => {
    if (subjectClass.subject === 'Tiếng Anh') {
      return ENGLISH_TARGETED_COMMENTS;
    }
    return [
      {
        id: 'level_T',
        label: `Mức T môn ${subjectClass.subject}`,
        badge: '🌟 Mức T',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: 'Dành cho học sinh tiếp thu nhanh, hoàn thành xuất sắc nhiệm vụ',
        comments: [
          `Tiếp thu bài nhanh, hoàn thành xuất sắc các bài tập và nội dung thực hành môn ${subjectClass.subject}.`,
          `Có năng khiếu nổi trội môn ${subjectClass.subject}, tích cực sáng tạo và giúp đỡ bạn bè.`,
          `Chăm chỉ, hăng hái phát biểu xây dựng bài, đạt nhiều điểm thi đua tốt môn ${subjectClass.subject}.`,
          `Nắm vững kiến thức trọng tâm, kỹ năng thực hành thành thạo và chuẩn xác.`,
        ],
      },
      {
        id: 'level_H',
        label: `Mức H môn ${subjectClass.subject}`,
        badge: '📘 Mức H',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        description: 'Dành cho học sinh hoàn thành bài học, đạt yêu cầu chuẩn kiến thức kỹ năng',
        comments: [
          `Nắm được kiến thức cơ bản, hoàn thành tốt nhiệm vụ học tập môn ${subjectClass.subject}.`,
          `Có ý thức học tập nghiêm túc, chuẩn bị đầy đủ đồ dùng học tập trước giờ học.`,
          `Thực hành đạt yêu cầu, cần tích cực phát biểu và tự tin hơn trước lớp.`,
          `Chăm chỉ, hợp tác tốt với bạn bè trong các hoạt động nhóm môn ${subjectClass.subject}.`,
        ],
      },
      {
        id: 'level_C',
        label: `Mức C môn ${subjectClass.subject}`,
        badge: '🛠️ Mức C',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
        description: 'Dành cho học sinh còn chậm, cần rèn luyện thêm',
        comments: [
          `Cần tập trung chú ý nghe giảng và rèn luyện thêm các kỹ năng cơ bản môn ${subjectClass.subject}.`,
          `Thao tác thực hành còn lúng túng, cần chú ý quan sát và làm theo hướng dẫn của giáo viên.`,
          `Cần chuẩn bị đầy đủ sách vở, dụng cụ học tập môn ${subjectClass.subject} khi đến lớp.`,
          `Còn mất trật tự trong giờ học, cần nghiêm túc và tích cực rèn luyện hơn.`,
        ],
      },
      {
        id: 'progress',
        label: 'Khen thưởng thi đua & Tiến bộ',
        badge: '🏆 Thi đua',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
        description: 'Dành cho học sinh có điểm thi đua cao hoặc tiến bộ rõ rệt',
        comments: [
          `Có nhiều tiến bộ trong tháng, hăng hái tham gia các hoạt động môn ${subjectClass.subject}.`,
          `Đạt thành tích thi đua tốt, có ý thức kỷ luật gương mẫu trong giờ học.`,
          `Nhiệt tình tham gia các phong trào và hoạt động chuyên môn của lớp.`,
        ],
      },
    ];
  }, [subjectClass.subject]);

  // Filtered comment suggestions for popover
  const filteredCommentSuggestions = useMemo(() => {
    let pool: { text: string; categoryLabel: string; badgeColor: string }[] = [];
    if (suggestionCategory === 'all') {
      availableCategoryGroups.forEach((cat) => {
        cat.comments.forEach((c) => {
          pool.push({ text: c, categoryLabel: cat.badge, badgeColor: cat.badgeColor });
        });
      });
    } else {
      const found = availableCategoryGroups.find((c) => c.id === suggestionCategory);
      if (found) {
        found.comments.forEach((c) => {
          pool.push({ text: c, categoryLabel: found.badge, badgeColor: found.badgeColor });
        });
      }
    }

    if (suggestionSearch.trim()) {
      const q = suggestionSearch.trim().toLowerCase();
      pool = pool.filter((item) => item.text.toLowerCase().includes(q));
    }

    return pool;
  }, [availableCategoryGroups, suggestionCategory, suggestionSearch]);

  // Open suggestion popover and auto preselect matching category
  const openSuggestionForStudent = (stuId: string) => {
    if (activeSuggestionStudentId === stuId) {
      setActiveSuggestionStudentId(null);
    } else {
      setActiveSuggestionStudentId(stuId);
      setSuggestionSearch('');
      const curLvl = monthlyData[stuId]?.level || 'T';
      if (curLvl === 'T') setSuggestionCategory('level_T');
      else if (curLvl === 'H') setSuggestionCategory('level_H');
      else if (curLvl === 'C') setSuggestionCategory('level_C');
      else setSuggestionCategory('all');
    }
  };

  // Smart suggestion generator for 1 single student
  const getSmartCommentForStudent = (stuId: string): string => {
    const cur = monthlyData[stuId] || { level: 'T', note: '' };
    const comp = getStudentMonthlyCompetition(stuId, selectedMonth);

    if (subjectClass.subject === 'Tiếng Anh') {
      if (comp.total >= 5) {
        const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'progress_competition')?.comments || [];
        return pool[Math.floor(Math.random() * pool.length)] || 'Có nhiều tiến bộ vượt bậc trong tháng, phát biểu bài hăng hái và tự tin hơn rõ rệt.';
      }
      if (cur.level === 'T') {
        const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'level_T')?.comments || [];
        return pool[Math.floor(Math.random() * pool.length)] || 'Tiếp thu bài nhanh, phát âm chuẩn xác, tự tin giao tiếp Tiếng Anh trước lớp.';
      }
      if (cur.level === 'H') {
        const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'level_H')?.comments || [];
        return pool[Math.floor(Math.random() * pool.length)] || 'Nắm được từ vựng và mẫu câu cơ bản, hoàn thành tốt nhiệm vụ học tập trên lớp.';
      }
      const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'level_C')?.comments || [];
      return pool[Math.floor(Math.random() * pool.length)] || 'Cần tập trung ôn luyện từ vựng hàng ngày và tự tin hơn khi thực hành nói Tiếng Anh.';
    }

    if (cur.level === 'T') return `Tiếp thu bài nhanh, hoàn thành xuất sắc các bài tập môn ${subjectClass.subject}.`;
    if (cur.level === 'H') return `Nắm được kiến thức cơ bản, hoàn thành tốt nhiệm vụ học tập môn ${subjectClass.subject}.`;
    return `Cần tập trung chú ý nghe giảng và rèn luyện thêm các kỹ năng cơ bản môn ${subjectClass.subject}.`;
  };

  // Smart auto-comment generation for the entire class with natural differentiation
  const handleSmartAutoFillAll = () => {
    setMonthlyData((prev) => {
      const updated = { ...prev };
      students.forEach((stu, idx) => {
        const cur = updated[stu.id] || { level: 'T', note: '' };
        const comp = getStudentMonthlyCompetition(stu.id, selectedMonth);

        let chosenComment = '';
        if (subjectClass.subject === 'Tiếng Anh') {
          if (comp.total >= 5 && (cur.level === 'T' || cur.level === 'H')) {
            const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'progress_competition')?.comments || [];
            chosenComment = pool[idx % pool.length];
          } else if (cur.level === 'T') {
            const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'level_T')?.comments || [];
            chosenComment = pool[idx % pool.length];
          } else if (cur.level === 'H') {
            const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'level_H')?.comments || [];
            chosenComment = pool[idx % pool.length];
          } else {
            const pool = ENGLISH_TARGETED_COMMENTS.find((c) => c.id === 'level_C')?.comments || [];
            chosenComment = pool[idx % pool.length];
          }
        } else {
          if (cur.level === 'T') chosenComment = `Tiếp thu bài nhanh, chăm chỉ và đạt kết quả tốt môn ${subjectClass.subject}.`;
          else if (cur.level === 'H') chosenComment = `Hoàn thành tốt các bài học và nội dung thực hành môn ${subjectClass.subject}.`;
          else chosenComment = `Cần cố gắng rèn luyện thêm và tập trung hơn trong giờ học môn ${subjectClass.subject}.`;
        }

        updated[stu.id] = {
          ...cur,
          note: chosenComment,
        };
      });
      return updated;
    });
    triggerToast(
      subjectClass.subject === 'Tiếng Anh'
        ? `Đã tự động tạo nhận xét Tiếng Anh phân hóa đa dạng chuẩn Thông tư 27 cho toàn bộ ${students.length} học sinh!`
        : `Đã tự động tạo nhận xét phân hóa theo đối tượng học sinh cho cả lớp!`
    );
  };

  // Quick suggestions for subject
  const availableSuggestions =
    QUICK_COMMENTS_BY_SUBJECT[subjectClass.subject] || QUICK_COMMENTS_BY_SUBJECT.default;

  // 1. PRINT OFFICIAL PDF REPORT
  const handlePrintOfficialPdf = () => {
    const dateStr = new Date();
    const day = dateStr.getDate();
    const month = dateStr.getMonth() + 1;
    const year = dateStr.getFullYear();

    const tableHeaders = [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Lớp CN',
      'Mức ĐG',
      'Cộng (+)',
      'Trừ (-)',
      'Tổng ĐTĐ',
      'Xếp loại',
      'Nhận xét tháng của Giáo viên bộ môn',
    ];

    const tableRows = studentRows.map((r) => {
      const compTotalStr =
        r.comp.total > 0 ? `+${r.comp.total}` : r.comp.total === 0 ? '0' : `${r.comp.total}`;
      const levelDisplay = r.level === 'C' ? 'C (Chưa đạt chuẩn)' : r.level;
      const rankDisplay = r.level === 'C' ? 'Chưa đạt chuẩn ⚠️' : r.comp.rankBadge;
      return [
        r.index,
        r.student.studentCode,
        r.student.fullName,
        r.homeClassName,
        levelDisplay,
        `+${r.comp.pos}`,
        `-${r.comp.neg}`,
        compTotalStr,
        rankDisplay,
        r.note || `Em chăm chỉ, hoàn thành tốt nhiệm vụ học tập môn ${subjectClass.subject}.`,
      ];
    });

    const reportOptions = {
      title: `BÁO CÁO THÁNG MÔN ${subjectClass.subject.toUpperCase()} - THÁNG ${selectedMonth}`,
      subtitle: `Lớp: ${subjectClass.name} • Giáo viên bộ môn: ${customTeacherName}`,
      timeframeLabel: `Tháng ${selectedMonth} (Năm học 2026–2027)`,
      dateRange: `Tháng ${selectedMonth}/2026`,
      className: subjectClass.name,
      tableHeaders,
      tableRows,
      summaryStats: [
        { label: 'Sĩ số học sinh', value: `${stats.totalStudents} em` },
        {
          label: 'Tỷ lệ Mức Đạt',
          value: `T: ${stats.countT} (${stats.pctT}%) • H: ${stats.countH} (${stats.pctH}%) • C (Chưa đạt chuẩn): ${stats.countC} (${stats.pctC}%)`,
        },
        {
          label: 'Tổng điểm thi đua môn',
          value: `+${stats.totalPosPoints} / -${stats.totalNegPoints} (Ròng: ${stats.totalNetPoints >= 0 ? '+' : ''}${stats.totalNetPoints}đ)`,
        },
        {
          label: 'Học sinh xuất sắc môn',
          value: stats.topStar
            ? `${stats.topStar.student.fullName} (+${stats.topStar.comp.total}đ)`
            : 'Đạt chuẩn đồng đều',
        },
      ],
      creatorTitle: 'GIÁO VIÊN BỘ MÔN',
      signerName: customTeacherName,
      reviewerTitle: 'TỔ TRƯỞNG CHUYÊN MÔN / BAN GIÁM HIỆU',
      reviewerName: db.settings.principalName || 'Ban Giám Hiệu',
      notes: `Báo cáo tổng hợp được lập từ phân hệ Sổ Theo Dõi Giáo Viên Bộ Môn trường Tiểu học Nam Phước - Phân hiệu 2 Duy Phước 2. Mọi đánh giá định kỳ và điểm thi đua đã được đối chiếu Thông tư 27/2020/TT-BGDĐT. Mức C: Chưa đạt chuẩn.`,
    };

    openPrintReportWindow(reportOptions as any, db.settings, customTeacherName);
  };

  // 2. EXPORT EXCEL (.xlsx)
  const handleExportExcel = () => {
    const exportRows = studentRows.map((r) => {
      const criteriaNotes = r.comp.transactions
        .map((t) => `${t.type === 'positive' ? '+' : '-'}${t.points}đ: ${t.note || t.criterionName}`)
        .join('; ');

      return {
        'STT': r.index,
        'Mã Học Sinh': r.student.studentCode,
        'Họ và Tên': r.student.fullName,
        'Giới Tính': r.student.gender,
        'Lớp Chủ Nhiệm': r.homeClassName,
        'Môn Học': subjectClass.subject,
        'Tháng Báo Cáo': `Tháng ${selectedMonth}`,
        'Mức Đánh Giá (TT27)': r.level === 'C' ? 'C (Chưa đạt chuẩn)' : r.level === 'T' ? 'T (Hoàn thành tốt)' : 'H (Hoàn thành)',
        'Điểm Cộng Thi Đua (+)': r.comp.pos,
        'Điểm Trừ Thi Đua (-)': r.comp.neg,
        'Tổng Điểm Thi Đua Tháng': r.comp.total,
        'Xếp Loại Thi Đua': r.level === 'C' ? 'Chưa đạt chuẩn' : r.comp.rankBadge,
        'Lời Nhận Xét Của GV Bộ Môn': r.note,
        'Chi Tiết Tiêu Chí Nhận Trong Tháng': criteriaNotes || 'Chưa có ghi nhận thêm',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = `Thang_${selectedMonth}_${subjectClass.subject.substring(0, 15)}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const cleanSubj = subjectClass.subject.replace(/\s+/g, '_');
    const cleanCls = subjectClass.name.replace(/\s+/g, '_');
    const fileName = `Bao_Cao_Thang_${selectedMonth}_${cleanSubj}_${cleanCls}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    triggerToast(`Đã xuất tệp Excel (.xlsx) báo cáo tháng ${selectedMonth} thành công!`);
  };

  // 3. EXPORT WORD (.doc)
  const handleExportWord = () => {
    const cleanSubj = subjectClass.subject.replace(/\s+/g, '_');
    const cleanCls = subjectClass.name.replace(/\s+/g, '_');
    const fileName = `Bao_Cao_Thang_${selectedMonth}_${cleanSubj}_${cleanCls}.doc`;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Báo Cáo Tháng ${selectedMonth} - ${subjectClass.subject}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; }
          .header-table { width: 100%; margin-bottom: 20px; }
          .header-table td { text-align: center; vertical-align: top; }
          .title { text-align: center; font-size: 16pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; }
          .subtitle { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          table.data-table th, table.data-table td { border: 1px solid #333; padding: 6px 8px; font-size: 11pt; }
          table.data-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
          .center { text-align: center; }
          .right { text-align: right; }
          .footer-table { width: 100%; margin-top: 40px; }
          .footer-table td { text-align: center; vertical-align: top; width: 50%; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 45%;">
              <strong>PHÒNG GD&ĐT DUY XUYÊN</strong><br>
              <strong>TRƯỜNG TH NAM PHƯỚC</strong><br>
              <em>Phân hiệu 2 Duy Phước 2</em>
            </td>
            <td style="width: 55%;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
              <strong>Độc lập - Tự do - Hạnh phúc</strong><br>
              <em>Duy Phước, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</em>
            </td>
          </tr>
        </table>

        <div class="title">BÁO CÁO THÁNG MÔN ${subjectClass.subject.toUpperCase()} - THÁNG ${selectedMonth}</div>
        <div class="subtitle">Lớp: ${subjectClass.name} • Năm học: 2026 - 2027 • Giáo viên bộ môn: ${customTeacherName}</div>

        <p><strong>1. Thống kê tổng hợp:</strong></p>
        <ul>
          <li>Sĩ số học sinh: ${stats.totalStudents} em.</li>
          <li>Xếp loại Môn học: Mức T (Hoàn thành tốt): ${stats.countT} em (${stats.pctT}%), Mức H (Hoàn thành): ${stats.countH} em (${stats.pctH}%), Mức C (Chưa đạt chuẩn): ${stats.countC} em (${stats.pctC}%).</li>
          <li>Điểm thi đua môn học trong tháng: Tổng điểm thưởng: +${stats.totalPosPoints} đ; Tổng điểm trừ: -${stats.totalNegPoints} đ; Điểm ròng: ${stats.totalNetPoints >= 0 ? '+' : ''}${stats.totalNetPoints} đ.</li>
        </ul>

        <p><strong>2. Bảng chi tiết điểm thi đua và nhận xét học sinh:</strong></p>
        <table class="data-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã HS</th>
              <th>Họ và tên học sinh</th>
              <th>Lớp CN</th>
              <th>Mức ĐG</th>
              <th>Điểm (+)</th>
              <th>Điểm (-)</th>
              <th>Tổng ĐTĐ</th>
              <th>Xếp loại</th>
              <th>Lời nhận xét theo tháng của GV Bộ môn</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows
              .map(
                (r) => `
              <tr>
                <td class="center">${r.index}</td>
                <td class="center">${r.student.studentCode}</td>
                <td><strong>${r.student.fullName}</strong></td>
                <td class="center">${r.homeClassName}</td>
                <td class="center">${r.level === 'C' ? '<strong style="color: #dc2626;">C (Chưa đạt chuẩn)</strong>' : `<strong>${r.level}</strong>`}</td>
                <td class="center" style="color: green;">+${r.comp.pos}</td>
                <td class="center" style="color: red;">-${r.comp.neg}</td>
                <td class="center"><strong>${r.comp.total > 0 ? `+${r.comp.total}` : r.comp.total}</strong></td>
                <td class="center">${r.level === 'C' ? '<span style="color: #dc2626; font-weight: bold;">Chưa đạt chuẩn</span>' : r.comp.rankBadge}</td>
                <td>${r.note || `Em tiếp thu tốt bài học môn ${subjectClass.subject}.`}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <table class="footer-table">
          <tr>
            <td>
              <br>
              <strong>GIÁO VIÊN BỘ MÔN</strong><br>
              <em>(Ký và ghi rõ họ tên)</em><br><br><br><br>
              <strong>${customTeacherName}</strong>
            </td>
            <td>
              <em>Duy Phước, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</em><br>
              <strong>TỔ TRƯỞNG CHUYÊN MÔN / BAN GIÁM HIỆU</strong><br>
              <em>(Ký, đóng dấu và ghi rõ họ tên)</em><br><br><br><br>
              <strong>${db.settings.principalName || 'Ban Giám Hiệu'}</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(`Đã xuất tệp Word (.doc) báo cáo tháng ${selectedMonth} thành công!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Báo Cáo Chuyên Môn Theo Tháng</span>
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-xs font-semibold">
                Môn: {subjectClass.subject}
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-xs font-semibold">
                Lớp: {subjectClass.name}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Báo Cáo Tháng {selectedMonth} - Môn {subjectClass.subject}</span>
            </h2>

            {/* Editable Teacher Name */}
            <div className="flex items-center gap-2 text-xs text-purple-200">
              <span>Giáo viên bộ môn lập báo cáo:</span>
              {isEditingTeacherName ? (
                <div className="flex items-center gap-1.5 bg-white/20 p-1 rounded-lg">
                  <input
                    type="text"
                    value={customTeacherName}
                    onChange={(e) => setCustomTeacherName(e.target.value)}
                    className="px-2 py-0.5 text-xs font-bold text-slate-900 bg-white rounded-md outline-hidden w-48"
                    placeholder="Nhập họ tên giáo viên..."
                  />
                  <button
                    onClick={() => setIsEditingTeacherName(false)}
                    className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition"
                    title="Xác nhận tên"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <strong className="text-white underline underline-offset-2 font-bold">
                    {customTeacherName}
                  </strong>
                  <button
                    onClick={() => setIsEditingTeacherName(true)}
                    className="p-1 text-purple-300 hover:text-white rounded-md transition"
                    title="Đổi tên giáo viên bộ môn"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintOfficialPdf}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handleExportWord}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất Word</span>
            </button>

            <button
              onClick={handleSaveMonthlyAssessments}
              className="px-4 py-2.5 bg-white text-indigo-950 hover:bg-slate-100 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-indigo-700" />
              <span>Lưu Nhận Xét Tháng</span>
            </button>
          </div>
        </div>

        {/* MONTH SELECTOR BAR */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-purple-200 mr-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Chọn tháng báo cáo:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10">
            {SCHOOL_MONTHS.map((m) => {
              const isSelected = selectedMonth === m.value;
              const isCurrent = curMonth === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => handleMonthChange(m.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-purple-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Sĩ số */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sĩ số học sinh
            </p>
            <p className="text-xl font-black text-slate-900">{stats.totalStudents} em</p>
            <p className="text-[11px] text-slate-500">Môn {subjectClass.subject}</p>
          </div>
        </div>

        {/* Card 2: Xếp loại T */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Hoàn thành tốt (T)
            </p>
            <p className="text-xl font-black text-emerald-600">
              {stats.countT} <span className="text-xs font-bold text-slate-400">({stats.pctT}%)</span>
            </p>
            <p className="text-[11px] text-slate-500">H: {stats.countH} em • C: {stats.countC} em</p>
          </div>
        </div>

        {/* Card 3: Tổng điểm thi đua môn */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Thi đua môn tháng
            </p>
            <p
              className={`text-xl font-black ${
                stats.totalNetPoints >= 0 ? 'text-purple-700' : 'text-rose-600'
              }`}
            >
              {stats.totalNetPoints >= 0 ? `+${stats.totalNetPoints}` : stats.totalNetPoints} đ
            </p>
            <p className="text-[11px] text-slate-500">
              Cộng: +{stats.totalPosPoints} • Trừ: -{stats.totalNegPoints}
            </p>
          </div>
        </div>

        {/* Card 4: Top thi đua môn */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Gương mặt tiêu biểu
            </p>
            {stats.topStar ? (
              <>
                <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">
                  {stats.topStar.student.fullName}
                </p>
                <p className="text-[11px] font-bold text-amber-600">
                  +{stats.topStar.comp.total} điểm thi đua
                </p>
              </>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic">Phong trào đồng đều</p>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & QUICK BATCH ACTION BAR */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm học sinh theo tên, mã..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-hidden focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="px-2 text-slate-400 font-bold text-[10px] uppercase">Mức:</span>
            {(['all', 'T', 'H', 'C'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  levelFilter === l
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {l === 'all' ? 'Tất cả' : l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="px-2 text-slate-400 font-bold text-[10px] uppercase">Thi đua:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pos', label: 'Có điểm (+)' },
              { id: 'neg', label: 'Có điểm (-)' },
              { id: 'high', label: 'Xuất sắc (≥5đ)' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPointFilter(p.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  pointFilter === p.id
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Batch Assign */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSmartAutoFillAll}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Tự động phân hóa nhận xét theo Mức ĐG (T, H, C) và Điểm thi đua của từng em"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Tự động nhận xét thông minh (TT27)</span>
          </button>

          <button
            onClick={() =>
              handleBatchApplyComment(
                'T',
                subjectClass.subject === 'Tiếng Anh'
                  ? 'Tiếp thu bài nhanh, phát âm chuẩn xác, tự tin giao tiếp Tiếng Anh trước lớp.'
                  : `Em chăm chỉ, tích cực tham gia các hoạt động học tập môn ${subjectClass.subject}.`
              )
            }
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Gán nhận xét nhanh cho toàn bộ học sinh mức T"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gán Mức T</span>
          </button>

          <button
            onClick={() =>
              handleBatchApplyComment(
                'H',
                subjectClass.subject === 'Tiếng Anh'
                  ? 'Nắm được từ vựng và mẫu câu cơ bản, hoàn thành tốt nhiệm vụ học tập trên lớp.'
                  : `Em hoàn thành các bài học và nội dung thực hành môn ${subjectClass.subject}.`
              )
            }
            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Gán nhận xét nhanh cho toàn bộ học sinh mức H"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Gán Mức H</span>
          </button>

          <button
            onClick={() =>
              handleBatchApplyComment(
                'C',
                subjectClass.subject === 'Tiếng Anh'
                  ? 'Cần tập trung ôn luyện từ vựng hàng ngày và tự tin hơn khi thực hành nói Tiếng Anh.'
                  : `Cần chú ý nghe giảng và rèn luyện thêm kỹ năng môn ${subjectClass.subject}.`
              )
            }
            className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Gán nhận xét nhanh cho toàn bộ học sinh mức C"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Gán Mức C</span>
          </button>
        </div>
      </div>

      {/* MAIN REPORT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Bảng Tổng Hợp Điểm Thi Đua & Nhận Xét Tháng {selectedMonth}
            </h3>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-extrabold">
              {filteredRows.length} / {studentRows.length} học sinh
            </span>
          </div>
          <div className="text-xs text-slate-500 italic">
            * Giáo viên có thể nhập trực tiếp nhận xét hoặc bấm biểu tượng 💡 để chọn câu gợi ý chuẩn Thông tư 27.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 w-12 text-center">STT</th>
                <th
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else {
                      setSortField('name');
                      setSortAsc(true);
                    }
                  }}
                  className="p-3 cursor-pointer hover:text-purple-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Học sinh</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center w-24">Lớp CN</th>
                <th
                  onClick={() => {
                    if (sortField === 'points') setSortAsc(!sortAsc);
                    else {
                      setSortField('points');
                      setSortAsc(false);
                    }
                  }}
                  className="p-3 text-center cursor-pointer hover:text-purple-700 w-44"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Điểm thi đua tháng</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'level') setSortAsc(!sortAsc);
                    else {
                      setSortField('level');
                      setSortAsc(false);
                    }
                  }}
                  className="p-3 text-center cursor-pointer hover:text-purple-700 w-36"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Mức ĐG (TT27)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">Lời nhận xét theo tháng của Giáo viên bộ môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const stu = row.student;
                  const comp = row.comp;

                  return (
                    <tr key={stu.id} className="hover:bg-purple-50/30 transition">
                      {/* STT */}
                      <td className="p-3 text-center text-slate-400 font-bold">{row.index}</td>

                      {/* Student Identity */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <ChibiAvatar
                            name={stu.fullName}
                            gender={stu.gender}
                            size={32}
                            className="shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{stu.fullName}</p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {stu.studentCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Homeroom Class */}
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]">
                          {row.homeClassName}
                        </span>
                      </td>

                      {/* Competition Points in Month */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                comp.total > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : comp.total < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {comp.total > 0 ? `+${comp.total}` : comp.total} đ
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${comp.badgeStyle}`}
                            >
                              {comp.rankBadge}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="text-emerald-600 font-bold">+{comp.pos}</span>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">-{comp.neg}</span>
                            {comp.txCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedStudentTxDetail(stu)}
                                className="text-indigo-600 hover:underline font-bold ml-1"
                                title="Xem chi tiết các giao dịch trong tháng"
                              >
                                ({comp.txCount} lần)
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Level T / H / C Selector */}
                      <td className="p-3 text-center">
                        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                          {(['T', 'H', 'C'] as const).map((lvl) => {
                            const isSelected = row.level === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => {
                                  setMonthlyData((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...(prev[stu.id] || { note: '' }),
                                      level: lvl,
                                    },
                                  }));
                                }}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                                  isSelected
                                    ? lvl === 'T'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : lvl === 'H'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title={
                                  lvl === 'T'
                                    ? 'Hoàn thành tốt'
                                    : lvl === 'H'
                                    ? 'Hoàn thành'
                                    : 'Chưa hoàn thành'
                                }
                              >
                                {lvl}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Monthly Comment Input with Quick Suggestion */}
                      <td className="p-3">
                        <div className="relative flex items-center gap-2">
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMonthlyData((prev) => ({
                                ...prev,
                                [stu.id]: {
                                  ...(prev[stu.id] || { level: 'T' }),
                                  note: val,
                                },
                              }));
                            }}
                            placeholder={`Nhập nhận xét tháng ${selectedMonth} cho em...`}
                            className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-800"
                          />

                          {/* Quick Suggestion Button */}
                          <button
                            type="button"
                            onClick={() => openSuggestionForStudent(stu.id)}
                            className={`p-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                              activeSuggestionStudentId === stu.id
                                ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                                : 'bg-slate-50 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border-slate-200'
                            }`}
                            title="Gợi ý nhận xét phân hóa theo đối tượng học sinh (Chuẩn TT27)"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </button>

                          {/* Quick Suggestion Dropdown / Modal */}
                          {activeSuggestionStudentId === stu.id && (
                            <div className="absolute right-0 top-10 z-50 w-96 sm:w-[480px] bg-white p-3.5 rounded-2xl shadow-2xl border-2 border-purple-200 space-y-3 animate-in fade-in zoom-in-95">
                              {/* Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                  <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>Gợi ý nhận xét môn {subjectClass.subject}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <span>Em: <strong className="text-slate-800">{stu.fullName}</strong></span>
                                    <span>•</span>
                                    <span>
                                      Mức: <strong className={row.level === 'T' ? 'text-emerald-700 font-bold' : row.level === 'H' ? 'text-blue-700 font-bold' : 'text-rose-700 font-bold'}>{row.level}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>Thi đua: <strong className={comp.total >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{comp.total >= 0 ? `+${comp.total}` : comp.total}đ</strong></span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveSuggestionStudentId(null)}
                                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Smart One-Click Recommendation Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const smartCmt = getSmartCommentForStudent(stu.id);
                                  setMonthlyData((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...(prev[stu.id] || { level: 'T' }),
                                      note: smartCmt,
                                    },
                                  }));
                                  setActiveSuggestionStudentId(null);
                                  triggerToast(`Đã áp dụng gợi ý phù hợp nhất cho em ${stu.fullName}!`);
                                }}
                                className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-50 via-purple-50 to-indigo-50 hover:from-amber-100 hover:to-indigo-100 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 transition flex items-center justify-between shadow-2xs cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Gợi ý tự động chuẩn đối tượng cho em này</span>
                                </span>
                                <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">
                                  Điền ngay ⚡
                                </span>
                              </button>

                              {/* Search Bar */}
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                                <input
                                  type="text"
                                  value={suggestionSearch}
                                  onChange={(e) => setSuggestionSearch(e.target.value)}
                                  placeholder="Tìm gợi ý theo từ khóa (phát âm, tự tin, nghe, viết, tiến bộ...)..."
                                  className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                                />
                              </div>

                              {/* Category Filter Tabs */}
                              <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
                                <button
                                  type="button"
                                  onClick={() => setSuggestionCategory('all')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                                    suggestionCategory === 'all'
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  Tất cả
                                </button>
                                {availableCategoryGroups.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSuggestionCategory(cat.id)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                                      suggestionCategory === cat.id
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {cat.badge}
                                  </button>
                                ))}
                              </div>

                              {/* Suggestions List */}
                              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                {filteredCommentSuggestions.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-slate-400 italic">
                                    Không tìm thấy nhận xét phù hợp với từ khóa tìm kiếm.
                                  </div>
                                ) : (
                                  filteredCommentSuggestions.map((item, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="p-2 rounded-xl text-[11px] text-slate-700 bg-slate-50/70 hover:bg-purple-50/80 hover:text-purple-950 transition leading-snug border border-slate-200/80 hover:border-purple-300 flex items-start justify-between gap-2"
                                    >
                                      <div
                                        onClick={() => {
                                          setMonthlyData((prev) => ({
                                            ...prev,
                                            [stu.id]: {
                                              ...(prev[stu.id] || { level: 'T' }),
                                              note: item.text,
                                            },
                                          }));
                                          setActiveSuggestionStudentId(null);
                                        }}
                                        className="flex-1 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                                            {item.categoryLabel}
                                          </span>
                                        </div>
                                        <p className="font-medium text-slate-800">{item.text}</p>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                        <button
                                          type="button"
                                          title="Gán thay thế nhận xét này"
                                          onClick={() => {
                                            setMonthlyData((prev) => ({
                                              ...prev,
                                              [stu.id]: {
                                                ...(prev[stu.id] || { level: 'T' }),
                                                note: item.text,
                                              },
                                            }));
                                            setActiveSuggestionStudentId(null);
                                          }}
                                          className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          Chọn
                                        </button>
                                        <button
                                          type="button"
                                          title="Thêm vào đuôi nhận xét hiện có"
                                          onClick={() => {
                                            const oldNote = monthlyData[stu.id]?.note || '';
                                            const newNote = oldNote.trim() ? `${oldNote.trim()} ${item.text}` : item.text;
                                            setMonthlyData((prev) => ({
                                              ...prev,
                                              [stu.id]: {
                                                ...(prev[stu.id] || { level: 'T' }),
                                                note: newNote,
                                              },
                                            }));
                                            setActiveSuggestionStudentId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          + Nối
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer save banner */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Dữ liệu nhận xét được đồng bộ vào cả <strong>Sổ Lớp Bộ Môn</strong> và{' '}
              <strong>Hồ Sơ Đánh Giá Định Kỳ Thông Tư 27</strong> của trường.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveMonthlyAssessments}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Toàn Bộ Nhận Xét Tháng {selectedMonth}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL: GIAO DỊCH THI ĐUA TRONG THÁNG */}
      {selectedStudentTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ChibiAvatar
                  name={selectedStudentTxDetail.fullName}
                  gender={selectedStudentTxDetail.gender}
                  size={36}
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedStudentTxDetail.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lịch sử điểm thi đua Tháng {selectedMonth} • Môn {subjectClass.subject}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentTxDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {getStudentMonthlyCompetition(selectedStudentTxDetail.id, selectedMonth).transactions
                .length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400 italic">
                  Chưa có ghi nhận cộng hoặc trừ điểm nào trong tháng {selectedMonth}.
                </p>
              ) : (
                getStudentMonthlyCompetition(
                  selectedStudentTxDetail.id,
                  selectedMonth
                ).transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      tx.type === 'positive'
                        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
                        : 'bg-rose-50/60 border-rose-100 text-rose-900'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">
                        {tx.criterionName || (tx.type === 'positive' ? 'Khen thưởng' : 'Nhắc nhở')}
                      </p>
                      {tx.note && <p className="text-[11px] text-slate-600 mt-0.5">{tx.note}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Ngày: {tx.date} • Tuần: {tx.weekNumber || '1'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        tx.type === 'positive'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {tx.type === 'positive' ? `+${tx.points}` : `-${Math.abs(tx.points)}`} đ
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudentTxDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
