import React, { useState, useEffect } from 'react';
import { Department, DEPT_TYPES, DEPT_TYPE_LABELS, METRIC_LABELS, MetricKey, METRIC_GROUPS, PERSONNEL_GROUPS, PERSONNEL_LABELS, PersonnelKey } from '../types';
import { Check, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import clsx from 'clsx';

export default function ManageDepts() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<1 | 2 | 3 | 4>(DEPT_TYPES.INPATIENT);
  const [plannedBeds, setPlannedBeds] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
  const [personnel, setPersonnel] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchDepts = async () => {
    setLoading(true);
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handlePersonnelChange = (key: string, value: string) => {
    setPersonnel(prev => ({
      ...prev,
      [key]: value ? Number(value) : 0
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType(DEPT_TYPES.INPATIENT);
    setPlannedBeds('');
    setPersonnel({});
    // Metrics will be auto-set by the effect below based on type, unless we specify otherwise
  };

  const handleEditClick = (dept: Department) => {
    setEditingId(dept.id);
    setName(dept.name);
    setType(dept.type);
    setPlannedBeds(dept.planned_beds ? dept.planned_beds.toString() : '');
    setSelectedMetrics(dept.metrics);
    setPersonnel(dept.personnel || {});
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khoa này không? Mọi dữ liệu liên quan cũng sẽ bị xóa.")) return;
    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingId === id) resetForm();
      await fetchDepts();
    } else {
      alert("Có lỗi xảy ra khi xóa.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert("Vui lòng nhập tên khoa");
    if (type !== DEPT_TYPES.FUNCTIONAL && selectedMetrics.length === 0) return alert("Vui lòng chọn ít nhất 1 chỉ tiêu chuyên môn");
    
    setSubmitting(true);
    const url = editingId ? `/api/departments/${editingId}` : '/api/departments';
    const method = editingId ? 'PUT' : 'POST';

    // Cleanup empty personnel
    const cleanPersonnel = Object.fromEntries(
      Object.entries(personnel).filter(([_, v]) => (v as number) > 0)
    );

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        plannedBeds: type === DEPT_TYPES.INPATIENT ? Number(plannedBeds) : 0,
        metrics: selectedMetrics,
        personnel: cleanPersonnel
      })
    });
    
    if (res.ok) {
      resetForm();
      await fetchDepts();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert("Có lỗi xảy ra: " + (errData.error || "Không xác định"));
    }
    setSubmitting(false);
  };

  // Pre-select metrics based on type when type changes, ONLY when NOT editing
  useEffect(() => {
    if (editingId !== null) return;
    
    let defaults: MetricKey[] = [];
    if (type === DEPT_TYPES.OUTPATIENT) {
      defaults = ['kham_benh', 'ho_so_ngoai_tru', 'dich_vu_ky_thuat', 'tien_dvkt_yeu_cau'];
    } else if (type === DEPT_TYPES.INPATIENT) {
      defaults = ['ngay_dieu_tri_noi_tru', 'benh_nhan_noi_tru', 'dich_vu_ky_thuat', 'tien_dvkt_yeu_cau'];
    } else if (type === DEPT_TYPES.TECHNICAL) {
      defaults = ['sieu_am', 'x_quang', 'ecg', 'xet_nghiem', 'dich_vu_ky_thuat', 'tien_dvkt_yeu_cau'];
    } else if (type === DEPT_TYPES.FUNCTIONAL) {
      defaults = [];
    }
    setSelectedMetrics(defaults);
    setPersonnel({});
  }, [type, editingId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {editingId ? 'Cập nhật Khoa' : 'Thêm Khoa Mới'}
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <X size={16} /> Hủy cập nhật
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tên khoa</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="VD: Khoa Nội, Khoa Ngoại..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Loại khoa</label>
              <select
                value={type}
                onChange={e => setType(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {Object.entries(DEPT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          
          {type === DEPT_TYPES.INPATIENT && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số giường kế hoạch (Dùng để tính CSSDGB)</label>
              <input
                type="number"
                min="1"
                value={plannedBeds}
                onChange={e => setPlannedBeds(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 max-w-xs"
                placeholder="VD: 50"
                required
              />
            </div>
          )}

          {type !== DEPT_TYPES.FUNCTIONAL && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Các chỉ tiêu theo dõi của khoa</label>
              <div className="space-y-6">
                {METRIC_GROUPS.map(group => (
                  <div key={group.title} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">{group.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.keys.map(key => {
                        const isSelected = selectedMetrics.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleMetric(key)}
                            className={clsx(
                              "flex items-start text-left gap-3 p-3 rounded-lg border transition-all",
                              isSelected 
                                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400 shadow-sm" 
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:border-cyan-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900"
                            )}
                          >
                            <div className={clsx(
                              "w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              isSelected ? "bg-cyan-50 dark:bg-cyan-900/300 text-white" : "bg-slate-200"
                            )}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span className="text-sm font-medium">{METRIC_LABELS[key]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Nhân lực</label>
            <div className="space-y-6">
              {PERSONNEL_GROUPS.map(group => (
                <div key={group.title} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">{group.title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {group.keys.map(key => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{PERSONNEL_LABELS[key]}</label>
                        <input
                          type="number"
                          min="0"
                          value={personnel[key] || ''}
                          onChange={(e) => handlePersonnelChange(key, e.target.value)}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Số lượng..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              {editingId ? (
                <>
                  <Save size={20} /> Lưu thay đổi
                </>
              ) : (
                <>
                  <Plus size={20} /> Tạo khoa
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Danh sách khoa đã tạo</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Đang tải...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Chưa có khoa nào được tạo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <tr>
                  <th className="px-6 py-4">Tên khoa</th>
                  <th className="px-6 py-4">Phân loại</th>
                  <th className="px-6 py-4">Số giường</th>
                  <th className="px-6 py-4">Số chỉ tiêu</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map(dept => (
                  <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{dept.name}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-medium inline-block",
                        dept.type === 1 && "bg-blue-100 text-blue-700",
                        dept.type === 2 && "bg-rose-100 text-rose-700",
                        dept.type === 3 && "bg-amber-100 text-amber-700",
                        dept.type === 4 && "bg-emerald-100 text-emerald-700"
                      )}>
                        {DEPT_TYPE_LABELS[dept.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">{dept.planned_beds > 0 ? dept.planned_beds : '-'}</td>
                    <td className="px-6 py-4">{dept.metrics.length}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleEditClick(dept)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex"
                        title="Sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(dept.id)}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors inline-flex"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
