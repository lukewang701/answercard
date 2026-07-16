'use client';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FileSpreadsheet, FileText } from 'lucide-react';

export function ExportClient({ exam, questionStats }: { exam: any, questionStats: any[] }) {
  
  const handleExportExcel = () => {
    // 1. Student scores sheet
    const scoreData = exam.submissions.map((sub: any, index: number) => ({
      排名: index + 1,
      年級: sub.year,
      班級: sub.class,
      座號: sub.seatNumber,
      姓名: sub.studentName,
      是否遲交: sub.isLate ? '是' : '否',
      原始分數: sub.isLate && sub.rawScore != null ? sub.rawScore.toFixed(1) : sub.totalScore.toFixed(1),
      遲交扣分: sub.isLate ? `-${sub.latePenalty ?? 5}` : '-',
      最後分數: sub.totalScore.toFixed(1),
      ...(exam.totalScore !== 100 ? {
        '百分比(%)': ((sub.totalScore / exam.totalScore) * 100).toFixed(1) + '%'
      } : {}),
      繳交時間: new Date(sub.submittedAt).toLocaleString()
    }));

    // 2. Question stats sheet
    const statsData = questionStats.map((stat: any) => ({
      題號: stat.number,
      全班答對率: `${stat.correctRate}%`
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(scoreData);
    const ws2 = XLSX.utils.json_to_sheet(statsData);
    
    XLSX.utils.book_append_sheet(wb, ws1, "結構成績");
    XLSX.utils.book_append_sheet(wb, ws2, "題目答對率");
    
    XLSX.writeFile(wb, `${exam.name}_成績報表.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Use an embedded basic font or use English/Pinyin for demo if CJK is missing in default jsPDF
    // Note: jsPDF default doesn't support CJK out of the box, we would normally load a custom font.
    // For this prototype, we'll try to just output it.
    
    doc.setFontSize(20);
    // Since jsPDF default font doesn't render Chinese, we'll use English labels in the PDF to prevent mojibake 
    // unless we load a custom font. For a real app, we use a custom font.
    doc.text(`Exam Results: ${exam.name}`, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Total Submissions: ${exam.submissions.length}`, 14, 32);
    
    const head = exam.totalScore !== 100 ? ['Rank', 'Class', 'Seat', 'Name', 'Score', 'Percentage'] : ['Rank', 'Class', 'Seat', 'Name', 'Score'];

    const tableData = exam.submissions.map((sub: any, index: number) => {
      const row = [
        index + 1,
        `${sub.year}-${sub.class}`,
        sub.seatNumber,
        sub.studentName,
        sub.totalScore.toFixed(1)
      ];
      if (exam.totalScore !== 100) {
        row.push(((sub.totalScore / exam.totalScore) * 100).toFixed(1) + '%');
      }
      return row;
    });

    (doc as any).autoTable({
      startY: 40,
      head: [head],
      body: tableData,
    });
    
    doc.save(`${exam.name}_Results.pdf`);
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="card text-center py-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <FileSpreadsheet size={64} className="mx-auto mb-6 text-success" />
        <h2 className="mb-4">匯出 Excel (完整資料)</h2>
        <p className="mb-8 px-8">包含所有學生的詳細成績排名，以及各題目的答對率統計，適合老師後續做資料分析。</p>
        <button onClick={handleExportExcel} className="btn btn-success py-3 px-8 text-lg">
          下載 Excel 報表
        </button>
      </div>

      <div className="card text-center py-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <FileText size={64} className="mx-auto mb-6 text-danger" />
        <h2 className="mb-4">匯出 PDF (快速列印)</h2>
        <p className="mb-8 px-8">包含全班成績排名清單，排版最佳化，適合直接列印出來張貼或歸檔備查。</p>
        <button onClick={handleExportPDF} className="btn btn-danger py-3 px-8 text-lg">
          下載 PDF 報表
        </button>
      </div>
    </div>
  );
}
