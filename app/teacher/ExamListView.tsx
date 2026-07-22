'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Folder, Users, FileBarChart, ChevronRight, FileStack, Trash2, X, Play, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExamListView({ initialExams }: { initialExams: any[] }) {
  const [groupBy, setGroupBy] = useState<'exam' | 'class'>('exam');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Delete folder state
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ key: string, exams: any[] } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 1. Prepare data mapping
  const processedExams = useMemo(() => {
    return initialExams.map(exam => {
      let bName = exam.baseName;
      let tClass = exam.targetClass;
      
      if (!bName) {
        // Try to parse "ExamName - ClassName"
        const parts = exam.name.split(' - ');
        if (parts.length > 1) {
          tClass = parts.pop();
          bName = parts.join(' - ');
        } else {
          bName = exam.name;
          tClass = '預設班級';
        }
      }
      return { ...exam, bName, tClass: tClass || '未設定班級' };
    });
  }, [initialExams]);

  // 2. Grouping
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    processedExams.forEach(exam => {
      const key = groupBy === 'exam' ? exam.bName : exam.tClass;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(exam);
    });

    const result = Array.from(map.entries()).map(([key, examsInGroup]) => {
      examsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW', { numeric: true }));
      const submissionsCount = examsInGroup.reduce((sum, e) => sum + (e._count?.submissions || 0), 0);
      return {
        key,
        exams: examsInGroup,
        submissionsCount
      };
    });
    
    result.sort((a, b) => a.key.localeCompare(b.key, 'zh-TW', { numeric: true }));
    return result;
  }, [processedExams, groupBy]);

  const handleGroupChange = (e: any) => {
    setGroupBy(e.target.value);
    setActiveFolder(null);
  };

  const handleOpenFolder = (groupKey: string) => {
    setActiveFolder(groupKey);
  };

  const activeGroup = groups.find(g => g.key === activeFolder);

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteFolderTarget || !deletePassword) return;
    
    setIsDeleting(true);
    setDeleteError('');
    
    try {
      const examIds = deleteFolderTarget.exams.map(ex => ex.id);
      const res = await fetch('/api/exams/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examIds, password: deletePassword })
      });
      
      const data = await res.json();
      if (data.success) {
        setDeleteFolderTarget(null);
        setDeletePassword('');
        router.refresh();
      } else {
        setDeleteError(data.message || '刪除失敗');
      }
    } catch (err) {
      setDeleteError('伺服器發生錯誤');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 flex items-center gap-2">
          <FileStack className="text-primary" />
          {activeFolder ? (
            <>
              <button className="text-foreground hover:text-primary transition-colors" onClick={() => setActiveFolder(null)}>
                所有資料夾
              </button>
              <ChevronRight size={18} className="opacity-50" />
              <span>{activeFolder}</span>
            </>
          ) : (
            <span className="text-foreground">所有資料夾</span>
          )}
        </h2>

        {!activeFolder && (
          <div className="flex items-center gap-3 bg-secondary/30 p-1 rounded-lg">
            <label className="text-sm pl-2">分類方式：</label>
            <select 
              value={groupBy}
              onChange={handleGroupChange}
              className="bg-background border-border text-sm py-1 px-3 rounded"
            >
              <option value="exam">依「考卷名稱」分群</option>
              <option value="class">依「班級」分群</option>
            </select>
          </div>
        )}
      </div>

      {/* View: Folders Grid */}
      {!activeFolder && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {groups.map(group => (
            <div 
              key={group.key} 
              className="card cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
              onClick={() => handleOpenFolder(group.key)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                    {groupBy === 'exam' ? <Folder size={32} /> : <Users size={32} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="m-0 mb-1 text-lg">{group.key}</h3>
                    <p className="text-sm opacity-70 m-0">
                      包含 {group.exams.length} 份試卷
                    </p>
                  </div>
                </div>
                <button 
                  className="p-2 text-foreground opacity-60 hover:text-danger hover:opacity-100 hover:bg-danger/10 rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteFolderTarget(group);
                  }}
                  title="刪除資料夾"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              <div className="pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="opacity-70">總收卷數</span>
                <span className="font-bold text-success">{group.submissionsCount} 份</span>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full text-center py-12 opacity-50">
              目前還沒有建立任何試卷
            </div>
          )}
        </div>
      )}

      {/* View: Child Exams in Folder */}
      {activeFolder && activeGroup && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {activeGroup.exams.map((exam) => (
            <div key={exam.id} className="card flex flex-col h-full">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="m-0 text-primary flex-1">{exam.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-background px-2 py-1 rounded-full border border-border">
                      代碼: {exam.shareCode}
                    </span>
                    <Link href={`/teacher/exams/${exam.id}/edit`} className="text-foreground/50 hover:text-primary transition-colors" title="編輯試卷">
                      <Edit size={18} />
                    </Link>
                  </div>
                </div>
                <p className="text-sm mb-4">日期: {new Date(exam.date).toLocaleDateString()}</p>
                <div className="flex justify-between text-sm mb-6 text-foreground/80">
                  <span>共 {exam.totalQuestions} 題</span>
                  <span>已繳交: <strong className="text-success">{exam._count?.submissions || 0}</strong> 份</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link href={`/teacher/exams/${exam.id}`} className="btn btn-primary w-full flex items-center justify-center gap-2">
                  <Play size={18} />
                  進入試卷
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/teacher/exams/${exam.id}/scan`} className="btn btn-primary flex items-center justify-center gap-2 text-sm">
                    掃描批改
                  </Link>
                  <Link href={`/teacher/exams/${exam.id}/export`} className="btn btn-secondary flex items-center justify-center gap-2 text-sm">
                    匯出報表
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Folder Modal */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary/50 border border-border p-6 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-danger flex items-center gap-2">
                <Trash2 size={24} />
                刪除資料夾確認
              </h3>
              <button 
                onClick={() => {
                  setDeleteFolderTarget(null);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="text-foreground/50 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="mb-6 opacity-90 text-sm">
              您即將刪除資料夾 <strong className="text-primary">{deleteFolderTarget.key}</strong>，這將會一併刪除其包含的 <strong>{deleteFolderTarget.exams.length}</strong> 份試卷，以及所有的學生繳交紀錄。
              <br/><br/>
              <span className="text-danger font-bold">⚠️ 此操作無法復原！</span>
            </p>

            <form onSubmit={handleDeleteSubmit}>
              <div className="mb-4">
                <label className="block text-sm mb-2 opacity-70">請輸入教師登入密碼以確認刪除</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  className="input w-full"
                  placeholder="輸入密碼..."
                  required
                  autoFocus
                />
              </div>
              
              {deleteError && (
                <div className="text-danger text-sm mb-4 bg-danger/10 p-2 rounded border border-danger/20">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setDeleteFolderTarget(null);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  disabled={isDeleting}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary bg-danger text-white hover:bg-danger/80"
                  disabled={isDeleting || !deletePassword}
                >
                  {isDeleting ? '刪除中...' : '確認刪除'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
