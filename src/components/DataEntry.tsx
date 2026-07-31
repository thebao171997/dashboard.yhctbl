import React, { useState, useEffect } from 'react';
import { Department, METRIC_LABELS, METRIC_GROUPS } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, parseISO } from 'date-fns';
import { Save, AlertTriangle, Edit3, Trash2, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

type PeriodType = 'week' | 'month' | 'quarter' | 'custom';
type TabMode = 'department' | 'target';

export default function DataEntry() {
  const [activeTab, setActiveTab] = useState<TabMode>('department');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [dateStr, setDateStr] = useState<string>(format(new Date(), 'yyyy-MM')); // YYYY-MM or YYYY-Www
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  
  const [data, setData] = useState<Record<string, string>>({});
  
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [existingRecordId, setExistingRecordId] = useState<number | null>(null);
  const [recordHistory, setRecordHistory] = useState<any[]>([]);
  const [historyYear, setHistoryYear] = useState<number | ''>(new Date().getFullYear());
  
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [overlapDates, setOverlapDates] = useState<{start: string, end: string}[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(data));
  }, []);

  const selectedDept = departments.find(d => d.id === selectedDeptId);

  // Helper to compute periodValue and dates
  const getPeriodInfo = () => {
    let pValue = dateStr;
    let start = '', end = '';
    
    try {
      if (periodType === 'week') {
         if (!pValue || !pValue.includes('-W')) return null;
         const [year, week] = pValue.split('-W');
         const simpleDate = new Date(Number(year), 0, 1 + (Number(week) - 1) * 7);
         start = format(startOfWeek(simpleDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
         end = format(endOfWeek(simpleDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (periodType === 'month') {
         if (!pValue || !pValue.includes('-')) return null;
         const d = parseISO(pValue + '-01');
         start = format(startOfMonth(d), 'yyyy-MM-dd');
         end = format(endOfMonth(d), 'yyyy-MM-dd');
      } else if (periodType === 'quarter') {
         if (!pValue || !pValue.includes('-Q')) return null;
         const [year, q] = pValue.split('-Q');
         const month = (Number(q) - 1) * 3;
         const d = new Date(Number(year), month, 1);
         start = format(startOfQuarter(d), 'yyyy-MM-dd');
         end = format(endOfQuarter(d), 'yyyy-MM-dd');
      } else if (periodType === 'custom') {
         if (!customStart || !customEnd) return null;
         pValue = `${customStart}:${customEnd}`;
         start = customStart;
         end = customEnd;
      }
      return { pValue, start, end };
    } catch (e) {
      return null;
    }
  };

  // Auto-check and load data
  const loadRecordHistory = () => {
    if (!selectedDeptId) {
      setRecordHistory([]);
      return;
    }
    fetch(`/api/records?deptId=${selectedDeptId}&year=${historyYear}`)
      .then(res => res.json())
      .then(data => setRecordHistory(data));
  };

  useEffect(() => {
    loadRecordHistory();
  }, [selectedDeptId, historyYear]);

  useEffect(() => {
    if (selectedDept) {
      const initial: Record<string, string> = {};
      selectedDept.metrics.forEach(m => initial[m] = '');
      setData(initial);
      setExistingRecordId(null);
      
      const info = getPeriodInfo();
      if (info) {
        setChecking(true);
        fetch(`/api/records/check?deptId=${selectedDeptId}&periodType=${periodType}&periodValue=${info.pValue}`)
          .then(res => res.json())
          .then(checkData => {
            if (checkData.exists) {
              setExistingRecordId(checkData.recordId);
              // Load data into form
              const loadedData = { ...initial };
              for (const [key, value] of Object.entries(checkData.data)) {
                if (key in loadedData) {
                  loadedData[key] = String(value);
                }
              }
              setData(loadedData);
            }
            setChecking(false);
          })
          .catch(() => setChecking(false));
      }
    } else {
      setData({});
      setExistingRecordId(null);
    }
  }, [selectedDeptId, periodType, dateStr, customStart, customEnd]);

  const handleSave = async (replaceOverlaps = false) => {
    if (!selectedDeptId) return;
    
    // Format inputs: replace empty with '0'
    const formattedData = { ...data };
    for (const key in formattedData) {
      if (formattedData[key] === '') {
        formattedData[key] = '0';
      }
    }

    const info = getPeriodInfo();
    if (!info) {
       setToastMessage("Vui lòng chọn thời gian hợp lệ");
       return;
    }

    setSaving(true);
    
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deptId: selectedDeptId,
        periodType,
        periodValue: info.pValue,
        startDate: info.start,
        endDate: info.end,
        data: formattedData,
        overwriteRecordId: replaceOverlaps ? null : existingRecordId,
        replaceOverlaps
      })
    });

    if (res.status === 409) {
      const errData = await res.json().catch(() => ({}));
      setOverlapDates(errData.overlaps || []);
      setSaving(false);
      setShowOverlapModal(true);
      return;
    }

    if (res.ok) {
      setToastMessage((existingRecordId || replaceOverlaps) ? "Cập nhật dữ liệu thành công!" : "Lưu dữ liệu thành công!");
      setExistingRecordId((await res.json()).recordId);
      setData(formattedData);
      setShowOverlapModal(false);
      loadRecordHistory();
    } else {
      const errData = await res.json().catch(() => ({}));
      setToastMessage("Có lỗi xảy ra: " + (errData.error || "Không xác định"));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!existingRecordId) return;
    setDeleting(true);
    const res = await fetch(`/api/records/${existingRecordId}`, {
      method: 'DELETE'
    });
    setDeleting(false);
    if (res.ok) {
      setToastMessage("Đã xóa dữ liệu báo cáo!");
      setExistingRecordId(null);
      setData({}); // Clear form
      setShowDeleteModal(false);
      loadRecordHistory();
    } else {
      setToastMessage("Lỗi khi xóa dữ liệu");
    }
  };

  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [targetData, setTargetData] = useState<Record<string, string>>({});
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    if (activeTab === 'target') {
      fetch(`/api/targets?year=${targetYear}`)
        .then(res => res.json())
        .then(data => {
          const newTargetData: Record<string, string> = {};
          data.forEach((t: any) => {
            newTargetData[t.metric_key] = t.target_value.toString();
          });
          setTargetData(newTargetData);
        });
    }
  }, [activeTab, targetYear]);

  const handleSaveTarget = async () => {
    setSavingTarget(true);
    const res = await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: targetYear, targets: targetData })
    });
    if (res.ok) {
      setToastMessage("Lưu kế hoạch thành công!");
    } else {
      setToastMessage("Có lỗi xảy ra khi lưu kế hoạch!");
    }
    setSavingTarget(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('department')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'department' ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Nhập Báo Cáo Khoa
        </button>
        <button
          onClick={() => setActiveTab('target')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'target' ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Kế Hoạch Toàn Viện
        </button>
      </div>

      {activeTab === 'department' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Nhập & Chỉnh sửa Số Liệu Báo Cáo</h3>
        
        <div className={`grid grid-cols-1 gap-6 mb-8 items-end ${periodType === 'custom' ? 'lg:grid-cols-4 md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <div className={`${periodType === 'custom' ? 'lg:col-span-1' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Chọn khoa</label>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">-- Chọn khoa --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          
          <div className={`${periodType === 'custom' ? 'lg:col-span-1' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kỳ báo cáo</label>
            <select
              value={periodType}
              onChange={e => {
                const val = e.target.value as PeriodType;
                setPeriodType(val);
                const now = new Date();
                if (val === 'month') {
                  setDateStr(format(now, 'yyyy-MM'));
                } else if (val === 'week') {
                  const y = now.getFullYear();
                  setDateStr(`${y}-W01`);
                } else if (val === 'quarter') {
                  const y = now.getFullYear();
                  const q = Math.floor(now.getMonth() / 3) + 1;
                  setDateStr(`${y}-Q${q}`);
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="week">Theo Tuần</option>
              <option value="month">Theo Tháng</option>
              <option value="quarter">Theo Quý</option>
              <option value="custom">Tùy chọn (Từ ngày - Đến ngày)</option>
            </select>
          </div>

          <div className={`${periodType === 'custom' ? 'lg:col-span-2 md:col-span-2' : ''}`}>
            {periodType === 'custom' ? (
              <div className="flex gap-3">
                <div className="flex-1">
                   <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
                   <DatePicker
                     selected={customStart ? new Date(customStart) : null}
                     onChange={(date: Date | null) => setCustomStart(date ? format(date, 'yyyy-MM-dd') : '')}
                     dateFormat="dd/MM/yyyy"
                     showYearDropdown
                     showMonthDropdown
                     dropdownMode="select"
                     className="w-full border border-slate-200 rounded-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                     placeholderText="dd/mm/yyyy"
                   />
                </div>
                <div className="flex-1">
                   <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
                   <DatePicker
                     selected={customEnd ? new Date(customEnd) : null}
                     onChange={(date: Date | null) => setCustomEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                     dateFormat="dd/MM/yyyy"
                     showYearDropdown
                     showMonthDropdown
                     dropdownMode="select"
                     className="w-full border border-slate-200 rounded-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                     placeholderText="dd/mm/yyyy"
                   />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Chọn thời gian</label>
                {periodType === 'month' && (
                  <div className="flex gap-2">
                    <select 
                      value={dateStr.split('-')[1] || new Date().getMonth() + 1}
                      onChange={e => {
                        const year = dateStr.split('-')[0] || new Date().getFullYear();
                        const month = e.target.value.toString().padStart(2, '0');
                        setDateStr(`${year}-${month}`);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>Tháng {i + 1}</option>
                      ))}
                    </select>
                    <select
                      value={dateStr.split('-')[0] || new Date().getFullYear()}
                      onChange={e => {
                        const month = dateStr.split('-')[1] || (new Date().getMonth() + 1).toString().padStart(2, '0');
                        setDateStr(`${e.target.value}-${month}`);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {Array.from({ length: 10 }).map((_, i) => {
                        const year = new Date().getFullYear() - 5 + i;
                        return <option key={year} value={year}>Năm {year}</option>;
                      })}
                    </select>
                  </div>
                )}
                {periodType === 'week' && (
                  <input type="week" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                )}
                {periodType === 'quarter' && (
                  <div className="flex gap-2">
                    <select 
                      value={dateStr.split('-')[1] || 'Q1'}
                      onChange={e => {
                        const year = dateStr.split('-')[0] || new Date().getFullYear();
                        setDateStr(`${year}-${e.target.value}`);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="Q1">Quý 1</option>
                      <option value="Q2">Quý 2</option>
                      <option value="Q3">Quý 3</option>
                      <option value="Q4">Quý 4</option>
                    </select>
                    <select
                      value={dateStr.split('-')[0] || new Date().getFullYear()}
                      onChange={e => {
                        const quarter = dateStr.split('-')[1] || 'Q1';
                        setDateStr(`${e.target.value}-${quarter}`);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {Array.from({ length: 10 }).map((_, i) => {
                        const year = new Date().getFullYear() - 5 + i;
                        return <option key={year} value={year}>Năm {year}</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedDept ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                {existingRecordId ? <Edit3 size={18} className="text-cyan-600" /> : <Save size={18} className="text-slate-400" />}
                {existingRecordId ? 'Chỉnh sửa số liệu đã nhập' : 'Nhập số liệu mới'}
              </h4>
              {checking && <span className="text-sm text-slate-400 italic">Đang tải...</span>}
            </div>
            
            <div className="space-y-6">
              {METRIC_GROUPS.map(group => {
                const groupMetrics = group.keys.filter(k => selectedDept.metrics.includes(k));
                if (groupMetrics.length === 0) return null;
                return (
                  <div key={group.title} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h5 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider">{group.title}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupMetrics.map(key => (
                        <div key={key}>
                          <label className="block text-sm text-slate-600 mb-1">{METRIC_LABELS[key]}</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={data[key] || ''}
                            onChange={e => setData({...data, [key]: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Nhập số..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              {existingRecordId && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={saving || checking || deleting}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 size={20} /> Xóa dữ liệu
                </button>
              )}
              <button
                onClick={() => handleSave(false)}
                disabled={saving || checking || deleting}
                className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                {existingRecordId ? <Edit3 size={20} /> : <Save size={20} />} 
                {existingRecordId ? 'Cập nhật số liệu' : 'Lưu số liệu'}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            Vui lòng chọn khoa và thời gian để bắt đầu nhập liệu
          </div>
        )}
      </div>
      )}

      {activeTab === 'department' && selectedDeptId && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Danh sách các kỳ đã nhập liệu</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Lọc theo năm:</label>
              <input 
                type="number" 
                value={historyYear} 
                onChange={e => setHistoryYear(e.target.value === '' ? '' : Number(e.target.value))} 
                className="w-24 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Loại kỳ</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Từ ngày</th>
                  <th className="px-4 py-3">Đến ngày</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recordHistory.length > 0 ? (
                  recordHistory.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {record.period_type === 'month' && 'Tháng'}
                      {record.period_type === 'quarter' && 'Quý'}
                      {record.period_type === 'week' && 'Tuần'}
                      {record.period_type === 'custom' && 'Tùy chọn'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {record.period_type === 'custom' ? 'Tùy chọn' : record.period_value}
                    </td>
                    <td className="px-4 py-3">{format(parseISO(record.start_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">{format(parseISO(record.end_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => {
                          setPeriodType(record.period_type);
                          if (record.period_type === 'custom') {
                            setCustomStart(record.start_date);
                            setCustomEnd(record.end_date);
                          } else {
                            setDateStr(record.period_value);
                          }
                          document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-cyan-600 hover:text-cyan-700 font-medium px-3 py-1 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                      >
                        Xem/Sửa
                      </button>
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Chưa có dữ liệu trong năm này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'target' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Nhập Kế Hoạch Năm Toàn Viện</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Năm:</label>
              <input 
                type="number" 
                value={targetYear} 
                onChange={e => setTargetYear(Number(e.target.value))} 
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" 
              />
            </div>
          </div>
          
          <div className="space-y-6">
            {METRIC_GROUPS.map(group => (
              <div key={group.title} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h5 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider">{group.title}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.keys.map(key => {
                    const label = METRIC_LABELS[key];
                    return (
                      <div key={key}>
                        <label className="block text-sm text-slate-600 mb-1">{label}</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={targetData[key] || ''}
                          onChange={e => setTargetData({...targetData, [key]: e.target.value})}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Nhập chỉ tiêu..."
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={handleSaveTarget}
              disabled={savingTarget}
              className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save size={20} /> 
              Lưu Kế Hoạch {targetYear}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Overlap Modal */}
      {showOverlapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 text-amber-500 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold text-slate-800">Cảnh báo Trùng lặp</h3>
              </div>
              <p className="text-slate-600 mb-4">
                Đã có dữ liệu trong khoảng thời gian bị trùng lặp với kỳ báo cáo bạn vừa chọn.
              </p>
              {overlapDates.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Các khoảng thời gian trùng lặp:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {overlapDates.map((d, i) => (
                      <li key={i}>Từ {format(parseISO(d.start), 'dd/MM/yyyy')} đến {format(parseISO(d.end), 'dd/MM/yyyy')}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-slate-600 mb-6">
                Bạn có muốn thay thế toàn bộ dữ liệu cũ nằm trong khoảng thời gian này bằng dữ liệu mới không?
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => {
                     setShowOverlapModal(false);
                     const initial: Record<string, string> = {};
                     const dept = departments.find(d => d.id === selectedDeptId);
                     if (dept) {
                        dept.metrics.forEach(m => initial[m] = '');
                     }
                     setData(initial);
                  }}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Bỏ qua
                </button>
                <button 
                  onClick={() => { setShowOverlapModal(false); handleSave(true); }}
                  className="px-5 py-2.5 rounded-xl font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
                >
                  Thay thế dữ liệu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <Trash2 size={28} />
                <h3 className="text-xl font-bold text-slate-800">Xác nhận Xóa</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Bạn có chắc chắn muốn xóa hoàn toàn dữ liệu của kỳ báo cáo này khỏi hệ thống? 
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
