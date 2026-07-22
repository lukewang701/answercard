'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

export function ExportClient({ exam, questionStats }: { exam: any, questionStats: any[] }) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const handleExportExcel = () => {
    // 1. Student scores sheet
    const scoreData = exam.submissions.map((sub: any, index: number) => {
      const penalty = sub.isLate ? (sub.latePenalty ?? 5) : 0;
      const raw = sub.isLate && sub.rawScore != null ? sub.rawScore : sub.totalScore;
      const finalScore = sub.isLate ? Math.max(0, raw - penalty) : sub.totalScore;

      return {
        排名: index + 1,
        年級: sub.year,
        班級: sub.class,
        座號: sub.seatNumber,
        姓名: sub.studentName,
        是否遲交: sub.isLate ? '是' : '否',
        原始分數: raw.toFixed(1),
        遲交扣分: sub.isLate ? `-${penalty}` : '-',
        最後分數: finalScore.toFixed(1),
      ...(exam.totalScore !== 100 ? {
        '百分比(%)': ((finalScore / exam.totalScore) * 100).toFixed(1) + '%'
      } : {}),
      繳交時間: new Date(sub.submittedAt).toLocaleString()
    };
  });

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

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const doc = new jsPDF();
      
      // Fetch Chinese font
      const fontUrl = 'https://cdn.jsdelivr.net/npm/noto-sans-tc@1.0.1/fonts/NotoSansTC-Regular.ttf';
      const response = await fetch(fontUrl);
      const buffer = await response.arrayBuffer();
      
      // Base64 encode the font array buffer
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fontBase64 = btoa(binary);
      
      doc.addFileToVFS('NotoSansTC-Regular.ttf', fontBase64);
      doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
      doc.setFont('NotoSansTC');
      
      doc.setFontSize(20);
      doc.text(`Exam Results: ${exam.name}`, 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Total Submissions: ${exam.submissions.length}`, 14, 32);
      
      const head = exam.totalScore !== 100 
        ? ['Class', 'Seat', 'Name', 'Score', 'Percentage', 'Rank'] 
        : ['Class', 'Seat', 'Name', 'Score', 'Rank'];

      // Sort by seat number
      const sortedSubmissions = [...exam.submissions].sort((a, b) => {
        const seatA = parseInt(a.seatNumber) || 0;
        const seatB = parseInt(b.seatNumber) || 0;
        return seatA - seatB;
      });

      const tableData = sortedSubmissions.map((sub: any, index: number) => {
        // Original rank in exam.submissions was index + 1 (since it came pre-sorted by score)
        const rank = exam.submissions.findIndex((s: any) => s.id === sub.id) + 1;
        
        const row = [
          `${sub.year}-${sub.class}`,
          sub.seatNumber,
          sub.studentName,
          sub.totalScore.toFixed(1)
        ];
        
        if (exam.totalScore !== 100) {
          row.push(((sub.totalScore / exam.totalScore) * 100).toFixed(1) + '%');
        }
        
        row.push(rank);
        return row;
      });

      autoTable(doc, {
        startY: 40,
        head: [head],
        body: tableData,
        styles: { font: 'NotoSansTC' }
      });
      
      doc.save(`${exam.name}_Results.pdf`);
    } catch (e) {
      console.error(e);
      alert('無法載入字體或產生PDF');
    } finally {
      setIsExportingPDF(false);
    }
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
        <button onClick={handleExportPDF} disabled={isExportingPDF} className="btn btn-danger py-3 px-8 text-lg flex items-center justify-center gap-2 mx-auto">
          {isExportingPDF ? (
            <><Loader2 className="animate-spin" size={20} /> 產生中...</>
          ) : (
            '下載 PDF 報表'
          )}
        </button>
      </div>
    </div>
  );
}
