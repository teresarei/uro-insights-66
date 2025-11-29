import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiaryEntry, ComputedStats } from '@/types/database';
import { format, parseISO } from 'date-fns';

interface ExportOptions {
  entries: DiaryEntry[];
  stats: ComputedStats;
  patientName?: string;
  dateRange?: { start: string; end: string };
}

export function generateDiaryPDF(options: ExportOptions): void {
  const { entries, stats, patientName, dateRange } = options;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(35, 89, 113); // BankID blue
  doc.text('UroTracker', 14, yPos);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Bladder Diary Report', 14, yPos + 7);
  
  // Date generated
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - 14, yPos, { align: 'right' });

  yPos += 20;

  // Patient info box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text('Patient Information', 20, yPos + 8);
  
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(`Name: ${patientName || 'Not specified'}`, 20, yPos + 17);
  
  if (dateRange) {
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 100, yPos + 17);
  }

  yPos += 35;

  // Summary Statistics
  doc.setFontSize(14);
  doc.setTextColor(35, 89, 113);
  doc.text('Summary Statistics (48-hour period)', 14, yPos);
  
  yPos += 8;

  const statsData = [
    ['Total Voids', stats.totalVoids.toString(), 'Day Voids', stats.dayVoids.toString()],
    ['Total Leakages', stats.totalLeakages.toString(), 'Night Voids', stats.nightVoids.toString()],
    ['Total Intake', `${(stats.totalIntake / 1000).toFixed(1)} L`, 'Avg Voids/Day', stats.avgVoidsPerDay.toString()],
    ['Median Volume', `${stats.medianVolume} ml`, 'Volume Range', `${stats.minVolume}-${stats.maxVolume} ml`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: statsData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 35 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Void Events Table
  const voids = entries.filter(e => e.event_type === 'void');
  if (voids.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(35, 89, 113);
    doc.text('Void Events', 14, yPos);
    
    yPos += 5;

    const voidData = voids.map(v => [
      format(parseISO(v.date), 'MMM d'),
      v.time.slice(0, 5),
      `${v.volume_ml || '-'} ml`,
      v.urgency ? `${v.urgency}/5` : '-',
      v.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Time', 'Volume', 'Urgency', 'Notes']],
      body: voidData,
      theme: 'striped',
      headStyles: {
        fillColor: [35, 89, 113],
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        4: { cellWidth: 50 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Fluid Intake Table
  const intakes = entries.filter(e => e.event_type === 'intake');
  if (intakes.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(35, 89, 113);
    doc.text('Fluid Intake', 14, yPos);
    
    yPos += 5;

    const intakeData = intakes.map(i => [
      format(parseISO(i.date), 'MMM d'),
      i.time.slice(0, 5),
      `${i.volume_ml || '-'} ml`,
      i.intake_type || '-',
      i.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Time', 'Volume', 'Type', 'Notes']],
      body: intakeData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        4: { cellWidth: 50 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Leakage Events Table
  const leakages = entries.filter(e => e.event_type === 'leakage');
  if (leakages.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(35, 89, 113);
    doc.text('Leakage Events', 14, yPos);
    
    yPos += 5;

    const leakageData = leakages.map(l => [
      format(parseISO(l.date), 'MMM d'),
      l.time.slice(0, 5),
      l.leakage_severity || '-',
      l.trigger || '-',
      l.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Time', 'Amount', 'Trigger', 'Notes']],
      body: leakageData,
      theme: 'striped',
      headStyles: {
        fillColor: [234, 179, 8],
        textColor: [30, 30, 30],
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        4: { cellWidth: 50 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | UroTracker Bladder Diary | For medical consultation purposes`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `UroTracker_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
