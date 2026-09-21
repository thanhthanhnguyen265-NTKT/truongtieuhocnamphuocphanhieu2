import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppDatabase, SchoolSettings } from '../types';
import { storage } from './storage';

export interface ReportOptions {
  title: string;
  reportType?: 'attendance' | 'competition' | 'ranking' | 'feedback' | 'evaluation' | 'general';
  timeframe?: 'day' | 'week' | 'month' | 'semester' | 'year';
  timeframeLabel?: string; // e.g. "Ngày 06/09/2026" or "Tuần 1 (01/09 - 07/09/2026)" or "Tháng 09/2026"
  dateRange?: string;
  periodType?: string;
  className?: string;
  gradeName?: string;
  schoolYearName?: string;
  headers?: string[];
  tableHeaders?: string[];
  rows?: (string | number)[][];
  tableRows?: (string | number)[][];
  summaryStats?: { label: string; value: string | number }[];
  notes?: string;
  signerName?: string;
  signerTitle?: string;
  subtitle?: string;
}

// Helper to remove accents for pure ASCII PDF fallback if needed
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function generateOfficialReportHtml(
  options: any,
  providedSettings?: SchoolSettings,
  providedCreatorName?: string
): string {
  const db = storage.getDb();
  const settings = providedSettings || db.settings;
  const creatorName =
    providedCreatorName ||
    options.signerName ||
    db.currentUser?.fullName ||
    settings.ownerName ||
    'Thanh Nguyễn';

  const title = options.title || 'BÁO CÁO CHÍNH THỨC';
  const timeframeLabel = options.dateRange || options.timeframeLabel || '';
  const schoolYearName =
    options.schoolYearName ||
    db.schoolYears.find((y) => y.id === db.currentSchoolYearId)?.name ||
    '2026–2027';

  const headers: string[] = options.tableHeaders || options.headers || [];
  const rows: (string | number)[][] = options.tableRows || options.rows || [];
  const currentDate = new Date();
  const day = currentDate.getDate().toString().padStart(2, '0');
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const year = currentDate.getFullYear();
  const formattedNow = `${day}/${month}/${year}`;
  const verificationHash = `NP2-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${options.title} - ${settings.schoolName} - ${settings.branchName}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 15mm 15mm 20mm 15mm;
      }
      body {
        font-family: 'Times New Roman', Times, serif, sans-serif;
        color: #111827;
        margin: 0;
        padding: 24px;
        background: #fff;
        line-height: 1.4;
      }
      .header-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }
      .org-header {
        text-align: center;
      }
      .org-header .sub {
        font-size: 13px;
        font-weight: 500;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .org-header .main {
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .org-header .branch {
        font-size: 12px;
        font-weight: 600;
        color: #047857;
      }
      .motto-header {
        text-align: center;
      }
      .motto-header .nation {
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .motto-header .motto {
        font-size: 13px;
        font-weight: bold;
      }
      .divider {
        width: 140px;
        height: 1px;
        background: #111827;
        margin: 4px auto 0;
      }
      .report-title-section {
        text-align: center;
        margin: 24px 0 16px;
      }
      .report-title-section h1 {
        font-size: 20px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 0 0 6px;
        color: #0f172a;
      }
      .report-meta {
        font-size: 14px;
        font-style: italic;
        color: #334155;
      }
      .meta-badges {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 8px;
        font-size: 13px;
      }
      .meta-badge {
        background: #f1f5f9;
        padding: 4px 10px;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
        font-weight: 600;
      }
      table.data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 18px 0;
        font-size: 12.5px;
      }
      table.data-table th, table.data-table td {
        border: 1px solid #334155;
        padding: 6px 8px;
        text-align: left;
      }
      table.data-table th {
        background: #f8fafc;
        font-weight: bold;
        text-align: center;
      }
      .text-center { text-align: center !important; }
      .text-right { text-align: right !important; }
      .summary-box {
        margin: 16px 0;
        padding: 12px 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        font-size: 13px;
      }
      .summary-item strong {
        color: #0369a1;
      }
      .footer-signatures {
        margin-top: 36px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        text-align: center;
        page-break-inside: avoid;
      }
      .signature-col .location-date {
        font-size: 13px;
        font-style: italic;
        margin-bottom: 6px;
      }
      .signature-col .role-title {
        font-size: 13.5px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .signature-col .role-sub {
        font-size: 11.5px;
        font-style: italic;
        color: #475569;
        margin-bottom: 60px;
      }
      .signature-name {
        font-weight: bold;
        font-size: 14px;
        margin-top: 8px;
        color: #0f172a;
      }
      .copyright-notice-bar {
        margin-top: 40px;
        border-top: 1px solid #cbd5e1;
        padding-top: 8px;
        font-size: 11px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="header-grid">
      <div class="org-header">
        <div class="sub">PHÒNG GD&ĐT HUYỆN DUY XUYÊN</div>
        <div class="main">${settings.schoolName}</div>
        <div class="branch">${settings.branchName}</div>
        <div class="divider"></div>
        <div style="font-size: 11px; margin-top: 4px; color: #475569;">Số: ${verificationHash}</div>
      </div>
      <div class="motto-header">
        <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
        <div class="divider"></div>
        <div style="font-size: 11px; margin-top: 4px; font-style: italic; color: #475569;">
          Nam Phước, ngày ${day} tháng ${month} năm ${year}
        </div>
      </div>
    </div>

    <div class="report-title-section">
      <h1>${title}</h1>
      <div class="report-meta">
        ${timeframeLabel ? `Phạm vi báo cáo: <strong>${timeframeLabel}</strong>` : ''}
      </div>
      <div class="meta-badges">
        <div class="meta-badge">Năm học: ${schoolYearName}</div>
        ${options.gradeName ? `<div class="meta-badge">${options.gradeName}</div>` : ''}
        ${options.className ? `<div class="meta-badge">Lớp: ${options.className}</div>` : ''}
      </div>
    </div>

    ${
      options.summaryStats && options.summaryStats.length > 0
        ? `
      <div class="summary-box">
        ${options.summaryStats
          .map(
            (item: any) => `
          <div class="summary-item">
            ${item.label}: <strong>${item.value}</strong>
          </div>
        `
          )
          .join('')}
      </div>
    `
        : ''
    }

    <table class="data-table">
      <thead>
        <tr>
          ${headers.map((h) => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            ${row
              .map((cell, idx) => {
                const isNumeric = typeof cell === 'number' || (idx === 0 && !isNaN(Number(cell)));
                return `<td class="${isNumeric ? 'text-center' : ''}">${cell ?? ''}</td>`;
              })
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    ${options.notes ? `<div style="font-size: 12px; font-style: italic; margin-top: 10px;">* Ghi chú: ${options.notes}</div>` : ''}

    <div class="footer-signatures">
      <div class="signature-col">
        <div class="location-date">&nbsp;</div>
        <div class="role-title">${options.creatorTitle || options.signerTitle || 'NGƯỜI LẬP BÁO CÁO / GIÁO VIÊN'}</div>
        <div class="role-sub">(Ký và ghi rõ họ tên)</div>
        <div class="signature-name">${creatorName}</div>
      </div>
      <div class="signature-col">
        <div class="location-date">Nam Phước, ngày ${day} tháng ${month} năm ${year}</div>
        <div class="role-title">${options.reviewerTitle || 'HIỆU TRƯỞNG / PHÂN HIỆU TRƯỞNG'}</div>
        <div class="role-sub">(Ký, đóng dấu và ghi rõ họ tên)</div>
        <div class="signature-name">${options.reviewerName || settings.principalName || 'Ban Giám Hiệu'}</div>
      </div>
    </div>

    <div class="copyright-notice-bar">
      <div>Bản quyền phần mềm & hệ thống: <strong>${settings.ownerName}</strong> (${settings.ownerEmail})</div>
      <div>Trường Tiểu học Nam Phước - Phân hiệu 2 Duy Phước 2</div>
    </div>
  </body>
  </html>
  `;

  // Auto-open print preview in browser when user clicks export
  try {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  } catch (e) {
    console.log('Popup blocked or iframe restriction:', e);
  }

  return html;
}

export function openPrintReportWindow(
  options: ReportOptions,
  settings: SchoolSettings,
  creatorName: string
) {
  const html = generateOfficialReportHtml(options, settings, creatorName);
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Allow styles to render before triggering print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // Fallback: download HTML or download PDF
    downloadDirectPdf(options, settings, creatorName);
  }
}

export function downloadDirectPdf(
  options: ReportOptions,
  settings: SchoolSettings,
  creatorName: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currentDate = new Date();
  const day = currentDate.getDate().toString().padStart(2, '0');
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const year = currentDate.getFullYear();
  const verificationHash = `NP2-${Date.now().toString(36).toUpperCase()}`;

  // Header
  doc.setFontSize(10);
  doc.text('PHONG GD&DT HUYEN DUY XUYEN', 20, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(removeVietnameseAccents(settings.schoolName).toUpperCase(), 20, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(removeVietnameseAccents(settings.branchName), 20, 29);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', 120, 18);
  doc.setFontSize(9);
  doc.text('Doc lap - Tu do - Hanh phuc', 135, 23);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Nam Phuoc, ngay ${day} thang ${month} nam ${year}`, 125, 29);

  // Line divider
  doc.setLineWidth(0.3);
  doc.line(20, 32, 190, 32);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const asciiTitle = removeVietnameseAccents(options.title).toUpperCase();
  doc.text(asciiTitle, 105, 42, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const asciiTimeframe = removeVietnameseAccents(options.timeframeLabel);
  doc.text(`Pham vi: ${asciiTimeframe} - Nam hoc: ${options.schoolYearName}`, 105, 48, { align: 'center' });

  if (options.className) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Lop: ${options.className}`, 105, 53, { align: 'center' });
  }

  // AutoTable
  const asciiHeaders = options.headers.map((h) => removeVietnameseAccents(h));
  const asciiRows = options.rows.map((row) =>
    row.map((cell) => (typeof cell === 'string' ? removeVietnameseAccents(cell) : cell))
  );

  autoTable(doc, {
    startY: 58,
    head: [asciiHeaders],
    body: asciiRows as any,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 243, 246],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      halign: 'center',
    },
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 180;

  // Educational Signatures Box (Người lập báo cáo & Hiệu trưởng)
  if (finalY < 240) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('NGUOI LAP BAO CAO', 40, finalY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('(Ky va ghi ro ho ten)', 40, finalY + 5);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(removeVietnameseAccents(creatorName), 40, finalY + 28);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Nam Phuoc, ngay ${day}/${month}/${year}`, 130, finalY - 4);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('HIEU TRUONG / BAN GIAM HIEU', 130, finalY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('(Ky, dong dau va ghi ro ho ten)', 130, finalY + 5);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(removeVietnameseAccents(settings.principalName || 'Ban Giam Hieu'), 130, finalY + 28);
  }

  const safeFilename = `${removeVietnameseAccents(options.title).toLowerCase().replace(/[^a-z0-9]/g, '_')}_${day}${month}${year}.pdf`;
  doc.save(safeFilename);
}

export function exportPdfDirectly(
  options: any,
  providedSettings?: SchoolSettings,
  providedCreatorName?: string
) {
  const db = storage.getDb();
  const settings = providedSettings || db.settings;
  const creatorName = providedCreatorName || options.signerName || settings.ownerName || 'Thanh Nguyễn';
  downloadDirectPdf(options, settings, creatorName);
}

