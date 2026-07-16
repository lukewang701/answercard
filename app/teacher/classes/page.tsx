'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Plus, Trash2, Download, Upload, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';

type Student = { seatNumber: string; name: string };
type ClassType = { id: string; name: string; createdAt: string; _count: { students: number } };

function ClassManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams?.get('welcome') === '1';

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  const [newClassName, setNewClassName] = useState('');
  const [pastedData, setPastedData] = useState('');
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [existingStudents, setExistingStudents] = useState<Student[]>([]);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['班級', '座號', '姓名'],
      ['303', '01', '王小明'],
      ['303', '02', '李大華']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, '學生名單模板.xlsx');
  };

  const parsePastedData = (text: string) => {
    setPastedData(text);
    setErrorMsg('');
    if (!text.trim()) {
      setParsedStudents([]);
      return;
    }
    
    const lines = text.trim().split('\n');
    const students: Student[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('\t').map(p => p.trim());
      // Expecting at least 座號 and 姓名. If 班級 is first, it's 3 columns.
      if (parts.length >= 3) {
        if (i === 0 && (parts[0].includes('班級') || parts[1].includes('座號'))) continue;
        const seat = parts[1].padStart(2, '0');
        const name = parts[2];
        if (seat && name) students.push({ seatNumber: seat, name });
      } else if (parts.length === 2) {
        if (i === 0 && (parts[0].includes('座號'))) continue;
        const seat = parts[0].padStart(2, '0');
        const name = parts[1];
        if (seat && name) students.push({ seatNumber: seat, name });
      }
    }
    setParsedStudents(students);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
        
        const students: Student[] = [];
        data.forEach((row, idx) => {
          if (idx === 0 && (String(row[0]).includes('班級') || String(row[1]).includes('座號'))) return; // header
          
          if (row.length >= 3) {
            const seat = String(row[1] || '').trim().padStart(2, '0');
            const name = String(row[2] || '').trim();
            if (seat && name && seat !== '00') students.push({ seatNumber: seat, name });
          } else if (row.length >= 2) {
             const seat = String(row[0] || '').trim().padStart(2, '0');
             const name = String(row[1] || '').trim();
             if (seat && name && seat !== '00') students.push({ seatNumber: seat, name });
          }
        });
        
        setParsedStudents(students);
        setPastedData(`成功從 Excel 匯入 ${students.length} 筆資料`);
      } catch (err) {
        setErrorMsg('無法解析 Excel 檔案');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateNew = () => {
    setEditingClassId(null);
    setIsCreating(true);
    setNewClassName('');
    setPastedData('');
    setParsedStudents([]);
    setExistingStudents([]);
    setErrorMsg('');
  };

  const handleEditClick = async (cls: ClassType) => {
    setIsCreating(false);
    setEditingClassId(cls.id);
    setNewClassName(cls.name);
    setErrorMsg('');
    setParsedStudents([]);
    setExistingStudents([]);
    setPastedData('載入中...');
    
    try {
      const res = await fetch(`/api/classes/${cls.id}`);
      const data = await res.json();
      const students = data.students || [];
      setExistingStudents(students);
      setParsedStudents(students);
      
      const pastedStr = students.map((s: Student) => `${s.seatNumber}\t${s.name}`).join('\n');
      setPastedData(pastedStr);
    } catch (e) {
      console.error(e);
      setErrorMsg('無法載入班級資料');
      setPastedData('');
    }
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingClassId(null);
    setNewClassName('');
    setPastedData('');
    setParsedStudents([]);
    setExistingStudents([]);
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!newClassName.trim()) {
      setErrorMsg('請輸入班級名稱');
      return;
    }
    if (parsedStudents.length === 0) {
      setErrorMsg('名單不可為空');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    
    const url = editingClassId ? `/api/classes/${editingClassId}` : '/api/classes';
    const method = editingClassId ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          students: parsedStudents
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '儲存失敗');
      }

      await fetchClasses();
      handleCancelForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此班級嗎？所有關聯的學生將一併移除，但過去繳交的考卷記錄仍會保留。')) return;
    try {
      await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      await fetchClasses();
    } catch (e) {
      console.error(e);
      alert('刪除失敗');
    }
  };

  // Diff Logic for Edit mode
  const diffResult = useMemo(() => {
    if (!editingClassId) return null;
    if (parsedStudents.length === 0 && existingStudents.length === 0) return null;

    const existingMap = new Map(existingStudents.map(s => [s.name, s]));
    const parsedMap = new Map(parsedStudents.map(s => [s.name, s]));

    const added: Student[] = [];
    const removed: Student[] = [];
    const updated: { name: string, oldSeat: string, newSeat: string }[] = [];
    const unchanged: Student[] = [];

    parsedStudents.forEach(s => {
      const existing = existingMap.get(s.name);
      if (!existing) {
        added.push(s);
      } else if (existing.seatNumber !== s.seatNumber) {
        updated.push({ name: s.name, oldSeat: existing.seatNumber, newSeat: s.seatNumber });
      } else {
        unchanged.push(s);
      }
    });

    existingStudents.forEach(s => {
      if (!parsedMap.has(s.name)) {
        removed.push(s);
      }
    });

    return { added, removed, updated, unchanged };
  }, [parsedStudents, existingStudents, editingClassId]);

  if (loading) return <div className="container py-12 text-center">載入中...</div>;

  const showForm = isCreating || editingClassId !== null;

  return (
    <div className="container py-12 max-w-4xl">
      {isWelcome && classes.length === 0 && (
        <div className="card mb-8 bg-primary/10 border-primary text-primary">
          <div className="flex items-center gap-3 font-bold text-lg mb-2">
            <CheckCircle2 />
            歡迎使用答案卡掃描批改系統！
          </div>
          <p className="m-0 text-sm">
            在建立第一份試卷之前，請先建立您的班級名單。這樣系統才能為您追蹤學生繳交狀況與進行成績檢討。
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="m-0 flex items-center gap-3">
          <Users className="text-primary" size={32} />
          班級管理
        </h1>
        {!showForm && (
          <button onClick={handleCreateNew} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} />
            建立新班級
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-8 border-primary/30 shadow-lg animate-fade-in">
          <h2 className="text-xl mb-4 flex items-center gap-2">
            {editingClassId ? <Pencil size={24} className="text-primary" /> : <Plus size={24} className="text-primary" />}
            {editingClassId ? '編輯班級與名單' : '建立班級名單'}
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">班級名稱 (必填)</label>
            <input 
              type="text" 
              placeholder="例如：112學年度 303班" 
              className="w-full bg-background border border-border p-3 rounded focus:border-primary focus:outline-none"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold">匯入學生名單</label>
              <div className="flex gap-2">
                <button onClick={handleDownloadTemplate} className="btn btn-secondary text-xs flex items-center gap-1 py-1">
                  <Download size={14} /> 下載 Excel 模板
                </button>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-xs flex items-center gap-1 py-1">
                  <Upload size={14} /> 上傳 Excel
                </button>
              </div>
            </div>
            
            <p className="text-xs opacity-70 mb-2">
              您可以直接從 Excel 複製「班級、座號、姓名」三個欄位，然後貼到底下的輸入框。系統會自動解析並更新名單。
            </p>
            
            <textarea
              className="w-full bg-background border border-border p-3 rounded font-mono text-sm min-h-[150px] focus:border-primary focus:outline-none"
              placeholder="請貼上學生名單 (座號 \t 姓名)"
              value={pastedData}
              onChange={e => parsePastedData(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div className="bg-danger/10 text-danger p-3 rounded mb-6 flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* Diff Preview in Edit Mode */}
          {editingClassId && diffResult && parsedStudents.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-bold mb-2 text-primary">智慧比對預覽 (更新後共 {parsedStudents.length} 人)</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diffResult.added.length > 0 && (
                  <div className="border border-success/30 rounded p-3 bg-success/5">
                    <h4 className="text-success text-sm m-0 mb-2 font-bold flex items-center gap-2">🟢 新增學生 ({diffResult.added.length})</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {diffResult.added.map(s => (
                        <span key={s.name} className="px-2 py-1 bg-success/10 rounded">{s.seatNumber}號 {s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {diffResult.removed.length > 0 && (
                  <div className="border border-danger/30 rounded p-3 bg-danger/5">
                    <h4 className="text-danger text-sm m-0 mb-2 font-bold flex items-center gap-2">🔴 移除學生 ({diffResult.removed.length})</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {diffResult.removed.map(s => (
                        <span key={s.name} className="px-2 py-1 bg-danger/10 rounded line-through opacity-70">{s.seatNumber}號 {s.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {diffResult.updated.length > 0 && (
                  <div className="border border-warning/30 rounded p-3 bg-warning/5 md:col-span-2">
                    <h4 className="text-warning text-sm m-0 mb-2 font-bold flex items-center gap-2">🟡 座號異動 ({diffResult.updated.length})</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {diffResult.updated.map(s => (
                        <span key={s.name} className="px-2 py-1 bg-warning/10 rounded">
                          {s.name}: <span className="line-through opacity-70">{s.oldSeat}</span> ➡️ <strong>{s.newSeat}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {diffResult.added.length === 0 && diffResult.removed.length === 0 && diffResult.updated.length === 0 && (
                <div className="text-sm opacity-70 italic mt-2">名單完全沒有異動。</div>
              )}
            </div>
          )}

          {/* Simple Preview in Create Mode */}
          {!editingClassId && parsedStudents.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-bold mb-2 text-success">預覽：共解析到 {parsedStudents.length} 位學生</div>
              <div className="bg-secondary/20 p-3 rounded max-h-[150px] overflow-y-auto text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                {parsedStudents.map((s, i) => (
                  <div key={i} className="flex gap-2 border-b border-border pb-1">
                    <span className="opacity-70 w-6">{s.seatNumber}</span>
                    <span className="font-bold">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end border-t border-border pt-4">
            <button onClick={handleCancelForm} className="btn btn-secondary" disabled={saving}>
              取消
            </button>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving || parsedStudents.length === 0}>
              {saving ? '儲存中...' : (editingClassId ? '確認儲存變更' : '確認建立班級')}
            </button>
          </div>
        </div>
      )}

      {/* Class List */}
      {!showForm && classes.length === 0 && !isWelcome && (
        <div className="text-center py-12 opacity-50 card">
          目前沒有任何班級，請點擊上方按鈕建立。
        </div>
      )}

      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="card flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg m-0 text-primary">{cls.name}</h3>
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-bold">
                    {cls._count.students} 人
                  </span>
                </div>
                <p className="text-xs opacity-60 m-0 mb-4">
                  建立於 {new Date(cls.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditClick(cls)}
                  className="text-primary hover:bg-primary/10 p-2 rounded transition-colors"
                  title="編輯班級"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(cls.id)}
                  className="text-danger hover:bg-danger/10 p-2 rounded transition-colors"
                  title="刪除班級"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClassManagement() {
  return (
    <Suspense fallback={<div className="container py-12 text-center">載入中...</div>}>
      <ClassManagementContent />
    </Suspense>
  );
}
