import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiaryEntry, ComputedStats } from '@/types/database';
import { ClinicalPattern, RecordingBlock } from '@/types/urotracker';
import { TreatmentPlan } from '@/types/roles';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getValidationSummary } from './recordingValidation';

interface ExportOptions {
  entries: DiaryEntry[];
  stats: ComputedStats;
  patientName?: string;
  dateRange?: { start: string; end: string };
  recordingBlocks?: RecordingBlock[];
}

interface DailySummary {
  date: string;
  totalIntake: number;
  totalVoided: number;
  medianVoided: number;
  minVoided: number | null;
  maxVoided: number | null;
  daytimeVoidCount: number;
  nighttimeVoidCount: number;
  daytimeVoidedVolume: number;
  nighttimeVoidedVolume: number;
  leakageCount: number;
  totalLeakageWeight: number;
}

const APP_VERSION = '1.0.0';
const PRIMARY_COLOR: [number, number, number] = [35, 89, 113];

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.text(
    `Void.AI v${APP_VERSION}`,
    14,
    pageHeight - 15
  );
  
  // Disclaimer
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    'This document summarizes diary data and guideline-based patterns. It is not a medical diagnosis.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}

function checkNewPage(doc: jsPDF, yPos: number, minSpace: number = 60): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - minSpace) {
    doc.addPage();
    return 25;
  }
  return yPos;
}

// Helper to determine if a time is daytime (06:00-22:00) or nighttime
function isDaytime(timeStr: string): boolean {
  const [hours] = timeStr.split(':').map(Number);
  return hours >= 6 && hours < 22;
}

// Calculate median from array of numbers
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// Group entries by date and compute daily summaries
function computeDailySummaries(entries: DiaryEntry[]): DailySummary[] {
  // Group entries by date
  const byDate: Record<string, DiaryEntry[]> = {};
  
  entries.forEach(entry => {
    if (!byDate[entry.date]) {
      byDate[entry.date] = [];
    }
    byDate[entry.date].push(entry);
  });

  // Compute summary for each date
  const summaries: DailySummary[] = Object.keys(byDate)
    .sort()
    .map(date => {
      const dayEntries = byDate[date];
      
      // Intakes
      const intakes = dayEntries.filter(e => e.event_type === 'intake');
      const totalIntake = intakes.reduce((sum, e) => sum + (e.volume_ml || 0), 0);
      
      // Voids
      const voids = dayEntries.filter(e => e.event_type === 'void');
      const voidVolumes = voids.map(v => v.volume_ml || 0).filter(v => v > 0);
      const totalVoided = voidVolumes.reduce((sum, v) => sum + v, 0);
      const medianVoided = calculateMedian(voidVolumes);
      const minVoided = voidVolumes.length > 0 ? Math.min(...voidVolumes) : null;
      const maxVoided = voidVolumes.length > 0 ? Math.max(...voidVolumes) : null;
      
      // Day/Night void breakdown
      const daytimeVoids = voids.filter(v => isDaytime(v.time));
      const nighttimeVoids = voids.filter(v => !isDaytime(v.time));
      const daytimeVoidCount = daytimeVoids.length;
      const nighttimeVoidCount = nighttimeVoids.length;
      const daytimeVoidedVolume = daytimeVoids.reduce((sum, v) => sum + (v.volume_ml || 0), 0);
      const nighttimeVoidedVolume = nighttimeVoids.reduce((sum, v) => sum + (v.volume_ml || 0), 0);
      
      // Leakages
      const leakages = dayEntries.filter(e => e.event_type === 'leakage');
      const leakageCount = leakages.length;
      // Only sum leakage_weight_g where both pad weights were provided
      const totalLeakageWeight = leakages
        .filter(l => l.leakage_weight_g !== null && l.leakage_weight_g !== undefined)
        .reduce((sum, l) => sum + (l.leakage_weight_g || 0), 0);
      
      return {
        date,
        totalIntake,
        totalVoided,
        medianVoided,
        minVoided,
        maxVoided,
        daytimeVoidCount,
        nighttimeVoidCount,
        daytimeVoidedVolume,
        nighttimeVoidedVolume,
        leakageCount,
        totalLeakageWeight,
      };
    });

  return summaries;
}

export function generateDiaryPDF(options: ExportOptions): void {
  const { entries, patientName, dateRange, recordingBlocks } = options;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // ========== SECTION A: HEADER ==========
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Void.AI', 14, yPos);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text('Bladder Diary Report', 14, yPos + 8);
  
  // Date generated
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - 14, yPos, { align: 'right' });

  yPos += 22;

  // Patient info box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, pageWidth - 28, 28, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('Patient Information', 20, yPos + 8);
  
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(`Name: ${patientName || 'Not specified'}`, 20, yPos + 18);
  
  if (dateRange) {
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 100, yPos + 18);
  }

  yPos += 38;

  // ========== SECTION B: DAILY SUMMARY STATISTICS ==========
  const dailySummaries = computeDailySummaries(entries);
  
  if (dailySummaries.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Daily Summary Statistics', 14, yPos);
    yPos += 10;

    dailySummaries.forEach((day, index) => {
      yPos = checkNewPage(doc, yPos, 70);

      // Date header
      doc.setFillColor(240, 245, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 10, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.text(format(parseISO(day.date), 'EEEE, MMMM d, yyyy'), 20, yPos + 7);
      yPos += 14;

      // Summary data in two columns
      const leftCol = 20;
      const rightCol = pageWidth / 2 + 10;
      const lineHeight = 5.5;

      doc.setFontSize(9);
      doc.setTextColor(60);

      // Left column
      doc.text(`Total fluid intake:`, leftCol, yPos);
      doc.setTextColor(30);
      doc.text(`${day.totalIntake} mL`, leftCol + 45, yPos);
      
      doc.setTextColor(60);
      doc.text(`Total voided volume:`, leftCol, yPos + lineHeight);
      doc.setTextColor(30);
      doc.text(`${day.totalVoided} mL`, leftCol + 45, yPos + lineHeight);
      
      doc.setTextColor(60);
      doc.text(`Median void volume:`, leftCol, yPos + lineHeight * 2);
      doc.setTextColor(30);
      doc.text(`${day.medianVoided} mL`, leftCol + 45, yPos + lineHeight * 2);
      
      doc.setTextColor(60);
      doc.text(`Void volume range:`, leftCol, yPos + lineHeight * 3);
      doc.setTextColor(30);
      const rangeText = day.minVoided !== null && day.maxVoided !== null
        ? `${day.minVoided} – ${day.maxVoided} mL`
        : '–';
      doc.text(rangeText, leftCol + 45, yPos + lineHeight * 3);

      doc.setTextColor(60);
      doc.text(`Leakage events:`, leftCol, yPos + lineHeight * 4);
      doc.setTextColor(30);
      doc.text(`${day.leakageCount}`, leftCol + 45, yPos + lineHeight * 4);

      // Right column
      doc.setTextColor(60);
      doc.text(`Voids daytime (06-22):`, rightCol, yPos);
      doc.setTextColor(30);
      doc.text(`${day.daytimeVoidCount}`, rightCol + 50, yPos);
      
      doc.setTextColor(60);
      doc.text(`Voids nighttime (22-06):`, rightCol, yPos + lineHeight);
      doc.setTextColor(30);
      doc.text(`${day.nighttimeVoidCount}`, rightCol + 50, yPos + lineHeight);
      
      doc.setTextColor(60);
      doc.text(`Daytime voided volume:`, rightCol, yPos + lineHeight * 2);
      doc.setTextColor(30);
      doc.text(`${day.daytimeVoidedVolume} mL`, rightCol + 50, yPos + lineHeight * 2);
      
      doc.setTextColor(60);
      doc.text(`Nighttime voided volume:`, rightCol, yPos + lineHeight * 3);
      doc.setTextColor(30);
      doc.text(`${day.nighttimeVoidedVolume} mL`, rightCol + 50, yPos + lineHeight * 3);

      doc.setTextColor(60);
      doc.text(`Total leakage amount:`, rightCol, yPos + lineHeight * 4);
      doc.setTextColor(30);
      doc.text(`${day.totalLeakageWeight > 0 ? day.totalLeakageWeight.toFixed(1) + ' g' : '–'}`, rightCol + 50, yPos + lineHeight * 4);

      yPos += lineHeight * 5 + 8;

      // Separator between days (except last)
      if (index < dailySummaries.length - 1) {
        doc.setDrawColor(230);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 6;
      }
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('No entries recorded for the selected timeframe.', 14, yPos);
    yPos += 15;
  }

  // ========== SECTION C: DIAGNOSTIC ASSESSMENT ==========
  if (recordingBlocks && recordingBlocks.length > 0) {
    yPos = checkNewPage(doc, yPos, 80);
    
    // Add some spacing before diagnostics
    yPos += 10;

    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Diagnostic Assessment', 14, yPos);
    
    yPos += 12;

    recordingBlocks.forEach((block, blockIndex) => {
      yPos = checkNewPage(doc, yPos, 80);

      // Block header
      const startDate = format(new Date(block.start_datetime), 'MMM d, yyyy');
      const endDate = format(new Date(block.end_datetime), 'MMM d, yyyy');
      
      doc.setFillColor(240, 245, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 12, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.text(`Recording Block ${blockIndex + 1}: ${startDate} – ${endDate}`, 20, yPos + 8);
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      const statusText = block.status === 'complete' ? '✓ Complete (72h)' : '⚠ Incomplete';
      doc.text(statusText, pageWidth - 20, yPos + 8, { align: 'right' });
      
      yPos += 18;

      // Clinical Patterns
      if (block.clinical_patterns && block.clinical_patterns.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text('Clinical Patterns:', 14, yPos);
        yPos += 6;

        const patternData = block.clinical_patterns.map((pattern: ClinicalPattern, idx: number) => {
          return [
            `${idx + 1}. ${pattern.name}`,
            pattern.reasoning.substring(0, 90) + (pattern.reasoning.length > 90 ? '...' : ''),
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Pattern', 'Reasoning']],
          body: patternData,
          theme: 'plain',
          headStyles: {
            fillColor: [230, 235, 245],
            textColor: [40, 40, 40],
            fontSize: 8,
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 128 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;
      }

      // Overall Assessment
      if (block.overall_assessment) {
        yPos = checkNewPage(doc, yPos, 35);
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text('Overall Assessment:', 14, yPos);
        yPos += 5;
        
        const assessmentLines = doc.splitTextToSize(block.overall_assessment, pageWidth - 32);
        doc.setFontSize(9);
        doc.setTextColor(40);
        doc.text(assessmentLines.slice(0, 5), 14, yPos);
        yPos += Math.min(assessmentLines.length, 5) * 4 + 4;
      }

      // ========== SECTION D: TREATMENT PLAN ==========
      yPos = checkNewPage(doc, yPos, 45);
      
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text('Treatment Plan:', 14, yPos);
      yPos += 5;

      if (block.treatment_plan) {
        doc.setFillColor(252, 252, 250);
        const planLines = doc.splitTextToSize(block.treatment_plan, pageWidth - 36);
        const boxHeight = Math.min(planLines.length, 6) * 4 + 12;
        doc.roundedRect(14, yPos, pageWidth - 28, boxHeight, 2, 2, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(40);
        doc.text(planLines.slice(0, 6), 18, yPos + 5);
        
        if (block.treatment_plan_updated_at) {
          doc.setFontSize(7);
          doc.setTextColor(120);
          doc.text(
            `Last updated: ${format(new Date(block.treatment_plan_updated_at), 'MMM d, yyyy HH:mm')}`,
            18,
            yPos + boxHeight - 4
          );
        }
        yPos += boxHeight + 6;
      } else {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text('No treatment plan added for this recording.', 14, yPos);
        yPos += 10;
      }

      // Separator between blocks
      if (blockIndex < recordingBlocks.length - 1) {
        yPos += 4;
        doc.setDrawColor(220);
        doc.line(14, yPos, pageWidth - 14, yPos);
        yPos += 8;
      }
    });
  }

  // ========== SECTION E: FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  // Save the PDF
  const fileName = `Void.AI_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// ========== DOCTOR CLINICAL SUMMARY PDF ==========

interface DoctorExportOptions {
  entries: DiaryEntry[];
  stats: ComputedStats;
  patientName: string;
  patientPersonalNumber?: string;
  doctorName: string;
  treatmentPlans: TreatmentPlan[];
  clinicalPatterns: ClinicalPattern[];
  dateRange?: { start: string; end: string };
}

export function generateDoctorSummaryPDF(options: DoctorExportOptions): void {
  const { 
    entries, 
    stats, 
    patientName, 
    patientPersonalNumber,
    doctorName, 
    treatmentPlans, 
    clinicalPatterns,
    dateRange 
  } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Get validation summary
  const validation = getValidationSummary(entries);

  // ========== HEADER ==========
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Klinisk Sammanfattning', 14, yPos);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Blåsdagbok – Vårdgivarrapport', 14, yPos + 7);
  
  doc.setFontSize(9);
  doc.text(`Utskriven: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: sv })}`, pageWidth - 14, yPos, { align: 'right' });

  yPos += 20;

  // ========== PATIENT INFORMATION BOX ==========
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 35, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Patientinformation', 20, yPos + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`Namn: ${patientName}`, 20, yPos + 18);
  
  if (patientPersonalNumber) {
    doc.text(`Personnummer: ${patientPersonalNumber}`, 20, yPos + 26);
  }
  
  if (dateRange) {
    doc.text(`Mätperiod: ${dateRange.start} – ${dateRange.end}`, pageWidth / 2, yPos + 18);
  }
  
  doc.text(`Ansvarig läkare: ${doctorName}`, pageWidth / 2, yPos + 26);

  yPos += 45;

  // ========== SUMMARY STATISTICS ==========
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Sammanfattande statistik', 14, yPos);
  yPos += 10;

  const statsData = [
    ['Totalt antal miktioner', String(stats.totalVoids)],
    ['Miktioner dagtid (06-22)', String(stats.dayVoids)],
    ['Miktioner nattetid (22-06)', String(stats.nightVoids)],
    ['Totalt vätskeintag', `${stats.totalIntake} mL`],
    ['Median miktionsvolym', `${stats.medianVolume} mL`],
    ['Volymintervall', `${stats.minVolume || 0} – ${stats.maxVolume || 0} mL`],
    ['Läckageepisoder', String(stats.totalLeakages)],
    ['Total läckagevikt', stats.totalLeakageWeight > 0 ? `${stats.totalLeakageWeight.toFixed(1)} g` : '–'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Värde']],
    body: statsData,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;
  yPos = checkNewPage(doc, yPos, 80);

  // ========== CLINICAL PATTERNS ==========
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Diagnostisk bedömning', 14, yPos);
  yPos += 10;

  if (!validation.meets48hRequirement) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, yPos, pageWidth - 28, 15, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(120, 80, 0);
    doc.text('Diagnostisk bedömning kräver minst 48 timmars loggad data.', 20, yPos + 10);
    yPos += 25;
  } else if (clinicalPatterns.length > 0) {
    const patternData = clinicalPatterns.map((pattern, idx) => {
      const probText = pattern.probability === 'high' ? 'Hög' : pattern.probability === 'moderate' ? 'Måttlig' : 'Låg';
      return [
        pattern.name,
        probText,
        pattern.reasoning.length > 80 ? pattern.reasoning.substring(0, 77) + '...' : pattern.reasoning,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Mönster', 'Sannolikhet', 'Resonemang']],
      body: patternData,
      theme: 'striped',
      headStyles: {
        fillColor: PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 103 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Inga avvikande mönster identifierade.', 14, yPos);
    yPos += 10;
  }

  yPos = checkNewPage(doc, yPos, 80);

  // ========== RECOMMENDATIONS ==========
  if (validation.meets48hRequirement && clinicalPatterns.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Rekommendationer', 14, yPos);
    yPos += 8;

    clinicalPatterns.forEach((pattern, idx) => {
      yPos = checkNewPage(doc, yPos, 30);
      
      doc.setFontSize(9);
      doc.setTextColor(40);
      doc.text(`${idx + 1}. ${pattern.name}:`, 14, yPos);
      
      const recLines = doc.splitTextToSize(pattern.recommendation, pageWidth - 40);
      doc.setTextColor(80);
      doc.text(recLines.slice(0, 3), 20, yPos + 5);
      yPos += 5 + Math.min(recLines.length, 3) * 4 + 4;
    });

    yPos += 5;
  }

  yPos = checkNewPage(doc, yPos, 80);

  // ========== TREATMENT PLANS ==========
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Behandlingsplan', 14, yPos);
  yPos += 10;

  if (treatmentPlans.length > 0) {
    treatmentPlans.forEach((plan, idx) => {
      yPos = checkNewPage(doc, yPos, 50);

      // Plan header
      doc.setFillColor(252, 250, 245);
      doc.roundedRect(14, yPos, pageWidth - 28, 8, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Plan ${idx + 1} – ${format(new Date(plan.created_at), 'd MMMM yyyy', { locale: sv })}`, 18, yPos + 5.5);
      yPos += 12;

      // Plan text
      doc.setFontSize(9);
      doc.setTextColor(40);
      const planLines = doc.splitTextToSize(plan.plan_text, pageWidth - 36);
      doc.text(planLines.slice(0, 8), 18, yPos);
      yPos += Math.min(planLines.length, 8) * 4 + 4;

      // Clinician notes
      if (plan.clinician_notes) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Kliniska anteckningar:', 18, yPos);
        yPos += 4;
        
        doc.setFontSize(8);
        doc.setTextColor(80);
        const noteLines = doc.splitTextToSize(plan.clinician_notes, pageWidth - 40);
        doc.text(noteLines.slice(0, 4), 22, yPos);
        yPos += Math.min(noteLines.length, 4) * 3.5 + 4;
      }

      yPos += 6;
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Ingen behandlingsplan har registrerats.', 14, yPos);
    yPos += 10;
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addDoctorPageFooter(doc, i, pageCount, doctorName);
  }

  // Save the PDF
  const safePatientName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Klinisk_Sammanfattning_${safePatientName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

function addDoctorPageFooter(doc: jsPDF, pageNum: number, totalPages: number, doctorName: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `Sida ${pageNum} av ${totalPages}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.text(
    `Void.AI v${APP_VERSION} | ${doctorName}`,
    14,
    pageHeight - 15
  );
  
  // Disclaimer
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    'Detta dokument sammanfattar dagboksdata och riktlinjebaserade mönster. Det utgör inte en medicinsk diagnos.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}
