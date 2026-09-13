import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { Student } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SchoolYearsView } from './components/SchoolYearsView';
import { ClassesView } from './components/ClassesView';
import { TeachersView } from './components/TeachersView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { CompetitionView } from './components/CompetitionView';
import { FeedbackView } from './components/FeedbackView';
import { ReportsExportView } from './components/ReportsExportView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { MonthlyFeedbackView } from './components/MonthlyFeedbackView';
import { SubjectClassesView } from './components/SubjectClassesView';
import { ParentsView } from './components/ParentsView';
import { AnalyticsView } from './components/AnalyticsView';
import { OwnerPermissionModal } from './components/OwnerPermissionModal';
import { ImportWizardModal } from './components/ImportWizardModal';
import { StudentProfileModal } from './components/StudentProfileModal';

export default function App() {
  const [dbVersion, setDbVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [ownerPendingAction, setOwnerPendingAction] = useState<string>('');
  const [ownerActionCallback, setOwnerActionCallback] = useState<(() => void) | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetClassId, setImportTargetClassId] = useState<string | undefined>(undefined);

  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Tab navigation parameters (e.g. initial classId)
  const [tabParams, setTabParams] = useState<any>({});

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setDbVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenOwnerModal = (action: string, callback?: () => void) => {
    setOwnerPendingAction(action);
    if (callback) {
      setOwnerActionCallback(() => callback);
    } else {
      setOwnerActionCallback(null);
    }
    setIsOwnerModalOpen(true);
  };

  const handleOwnerGranted = () => {
    setIsOwnerModalOpen(false);
    if (ownerActionCallback) {
      ownerActionCallback();
      setOwnerActionCallback(null);
    }
  };

  const handleNavigate = (tab: string, params?: any) => {
    setActiveTab(tab);
    if (params) {
      setTabParams(params);
    }
    // On mobile, automatically collapse sidebar
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleOpenImport = (classId?: string) => {
    setImportTargetClassId(classId);
    setIsImportModalOpen(true);
  };

  const handleOpenProfile = (student: Student) => {
    setSelectedStudentForProfile(student);
    setIsProfileModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800 font-sans antialiased overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Top Professional Polish Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenOwnerModal={handleOpenOwnerModal}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        onNavigate={handleNavigate}
        onOpenImportModal={handleOpenImport}
        onOpenQuickAction={(action) => handleNavigate(action)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigate={handleNavigate}
                onOpenImportModal={handleOpenImport}
              />
            )}

            {activeTab === 'schoolYears' && (
              <SchoolYearsView onOpenOwnerModal={handleOpenOwnerModal} />
            )}

            {activeTab === 'classes' && (
              <ClassesView
                onNavigate={handleNavigate}
                onOpenImportModal={handleOpenImport}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'teachers' && (
              <TeachersView
                onNavigate={handleNavigate}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'subjectClasses' && (
              <SubjectClassesView onOpenOwnerModal={handleOpenOwnerModal} />
            )}

            {activeTab === 'students' && (
              <StudentsView
                initialClassId={tabParams.classId}
                onSelectStudent={handleOpenProfile}
                onOpenImportModal={handleOpenImport}
                onOpenOwnerModal={handleOpenOwnerModal}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView
                initialClassId={tabParams.classId}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'monthlyFeedback' && (
              <MonthlyFeedbackView
                initialClassId={tabParams.classId}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'evaluation' && (
              <MonthlyFeedbackView
                initialClassId={tabParams.classId}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {(activeTab === 'competition' ||
              activeTab === 'criteria' ||
              activeTab === 'ranking' ||
              activeTab === 'titles' ||
              activeTab === 'badges') && (
              <CompetitionView
                initialClassId={tabParams.classId}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackView
                initialClassId={tabParams.classId}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'parents' && (
              <ParentsView
                onNavigate={handleNavigate}
                onOpenOwnerModal={handleOpenOwnerModal}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView onNavigate={handleNavigate} />
            )}

            {(activeTab === 'reports' || activeTab === 'export') && <ReportsExportView />}

            {activeTab === 'import' && (
              <StudentsView
                initialClassId={tabParams.classId}
                onSelectStudent={handleOpenProfile}
                onOpenImportModal={handleOpenImport}
                onOpenOwnerModal={handleOpenOwnerModal}
                searchQuery={searchQuery}
                autoOpenImport={true}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogView onOpenOwnerModal={handleOpenOwnerModal} />
            )}

            {activeTab === 'settings' && (
              <SettingsView onOpenOwnerModal={handleOpenOwnerModal} />
            )}

            {activeTab === 'backup' && (
              <BackupRestoreView onOpenOwnerModal={handleOpenOwnerModal} />
            )}
          </div>
        </main>
      </div>

      {/* Institutional Legal Footer from Professional Polish Design */}
      <footer className="bg-slate-200 px-6 py-2.5 text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-slate-300 font-medium shrink-0">
        <span>Hệ thống Quản lý Báo cáo Phân hiệu 2 v1.0.4 – Trường TH Nam Phước</span>
        <span className="font-bold text-slate-700 tracking-wide text-center sm:text-right">
          TUYỆT ĐỐI KHÔNG THAY ĐỔI NỘI DUNG KHI CHƯA CÓ SỰ ĐỒNG Ý CỦA THANH NGUYỄN
        </span>
      </footer>

      {/* Global Modals */}
      <OwnerPermissionModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onGranted={handleOwnerGranted}
        attemptedAction={ownerPendingAction}
      />

      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetClassId={importTargetClassId}
        onOpenOwnerModal={handleOpenOwnerModal}
      />

      <StudentProfileModal
        student={selectedStudentForProfile}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedStudentForProfile(null);
        }}
        onOpenOwnerModal={handleOpenOwnerModal}
      />
    </div>
  );
}
