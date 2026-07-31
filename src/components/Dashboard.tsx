import React, { useEffect, useState } from 'react';
import { DashboardDeptData, HospitalTarget, METRIC_LABELS, PERSONNEL_GROUPS, PERSONNEL_LABELS, PersonnelKey, METRIC_GROUPS } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Users, BedDouble, Stethoscope, Trophy, BarChart as BarChartIcon, X, Filter, List, Download, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

const CustomYAxisTick = (props: any) => {
  const { x, y, payload, index } = props;
  
  let content = null;
  let bgClass = 'bg-slate-50 dark:bg-slate-900';
  let borderClass = 'border-l-4 border-slate-300 dark:border-slate-600';
  
  if (index === 0) {
    content = <span className="text-xl animate-bounce drop-shadow-md inline-block">🥇</span>;
    bgClass = 'bg-yellow-50 dark:bg-yellow-900/30';
    borderClass = 'border-l-4 border-yellow-400';
  } else if (index === 1) {
    content = <span className="text-xl drop-shadow-md inline-block">🥈</span>;
    bgClass = 'bg-slate-50 dark:bg-slate-900';
    borderClass = 'border-l-4 border-slate-400 dark:border-slate-500';
  } else if (index === 2) {
    content = <span className="text-xl drop-shadow-md inline-block">🥉</span>;
    bgClass = 'bg-slate-50 dark:bg-slate-900';
    borderClass = 'border-l-4 border-orange-400';
  } else if (index === 3) {
    content = <span className="text-lg font-black text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]">4</span>;
    bgClass = 'bg-slate-50 dark:bg-slate-900';
    borderClass = 'border-l-4 border-cyan-400';
  } else if (index === 4) {
    content = <span className="text-lg font-black text-purple-400 drop-shadow-[0_0_4px_rgba(192,132,252,0.8)]">5</span>;
    bgClass = 'bg-slate-50 dark:bg-slate-900';
    borderClass = 'border-l-4 border-purple-400';
  } else {
    content = <span className="text-lg font-black text-slate-400 drop-shadow-sm">{index + 1}</span>;
    bgClass = 'bg-slate-50 dark:bg-slate-900';
    borderClass = 'border-l-4 border-slate-300 dark:border-slate-600';
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-200} y={-18} width={200} height={36}>
        <div className={`flex items-center w-full h-full ${bgClass} ${borderClass} px-2 gap-2 rounded-r-md box-border`}>
          <div className="w-8 flex items-center justify-center shrink-0">
            {content}
          </div>
          <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
            {payload.value}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardDeptData[]>([]);
  const [prevData, setPrevData] = useState<DashboardDeptData[]>([]);
  const [targets, setTargets] = useState<HospitalTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeptComparison, setShowDeptComparison] = useState(false);
  const [showTotalHospitalModal, setShowTotalHospitalModal] = useState(false);
  const [showDeptDataModal, setShowDeptDataModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDeptForModal, setSelectedDeptForModal] = useState<DashboardDeptData | null>(null);
  const [expandedPersonnel, setExpandedPersonnel] = useState<Record<string, boolean>>({});
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [effectiveDates, setEffectiveDates] = useState<{start: string, end: string} | null>(null);

  const fetchDashboardData = () => {
    setLoading(true);
    let url = '/api/dashboard';
    if (startDate && endDate) {
       url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(res => {
        setData(res.data || []);
        setTargets(res.targets || []);
        if (res.effectiveStartDate && res.effectiveEndDate) {
          setEffectiveDates({ start: res.effectiveStartDate, end: res.effectiveEndDate });
        } else {
          setEffectiveDates(null);
        }
        
        let prevStart = '';
        let prevEnd = '';
        if (startDate && endDate) {
          prevStart = startDate.replace(/^\d{4}/, String(parseInt(startDate.slice(0, 4)) - 1));
          prevEnd = endDate.replace(/^\d{4}/, String(parseInt(endDate.slice(0, 4)) - 1));
        } else if (res.effectiveStartDate && res.effectiveEndDate) {
          prevStart = res.effectiveStartDate.replace(/^\d{4}/, String(parseInt(res.effectiveStartDate.slice(0, 4)) - 1));
          prevEnd = res.effectiveEndDate.replace(/^\d{4}/, String(parseInt(res.effectiveEndDate.slice(0, 4)) - 1));
        } else {
          const now = new Date();
          const prevYear = now.getFullYear() - 1;
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          prevStart = `${prevYear}-01-01`;
          prevEnd = `${prevYear}-${mm}-${dd}`;
        }

        fetch(`/api/dashboard?startDate=${prevStart}&endDate=${prevEnd}`)
          .then(r => r.json())
          .then(prevRes => {
             setPrevData(prevRes.data || []);
             setLoading(false);
          })
          .catch(() => {
             setPrevData([]);
             setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleFilter = () => {
    fetchDashboardData();
  };

  if (loading && data.length === 0) return <div className="text-center p-12 text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</div>;

  if (data.length === 0) return <div className="text-center p-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">Chưa có dữ liệu. Vui lòng nhập số liệu báo cáo.</div>;

  // Filter and sort for rankings
  const inpatientDepts = data.filter(d => d.type === 2);
  const inpatientAndOutpatient = data.filter(d => d.type === 1 || d.type === 2);
  
  // Ranking: CSSDGB (Inpatient)
  const rankCSSDGB = [...inpatientDepts]
    .filter(d => d.metrics.cssdgb > 0)
    .sort((a, b) => b.metrics.cssdgb - a.metrics.cssdgb);

  // Ranking: Revenue (All)
  const rankRevenue = [...data]
    .filter(d => d.metrics.tien_dvkt_yeu_cau > 0)
    .sort((a, b) => b.metrics.tien_dvkt_yeu_cau - a.metrics.tien_dvkt_yeu_cau);

  // Total hospital stats
  const totalVisits = data.reduce((sum, d) => sum + (d.metrics.kham_benh || 0), 0);
  const totalRevenue = data.reduce((sum, d) => sum + (d.metrics.tien_dvkt_yeu_cau || 0), 0);

  const totalPersonnel: Record<string, number> = {};
  data.forEach(dept => {
    if (dept.personnel) {
      Object.entries(dept.personnel).forEach(([key, val]) => {
        totalPersonnel[key] = (totalPersonnel[key] || 0) + (val as number);
      });
    }
  });

  const totalHospitalPersonnel = Object.values(totalPersonnel).reduce((sum, val) => sum + val, 0);
  
  let totalInpatientDays = 0;
  let totalBedDaysCapacity = 0;
  inpatientDepts.forEach(d => {
    totalInpatientDays += (d.metrics.ngay_dieu_tri_noi_tru || 0);
    totalBedDaysCapacity += (d.planned_beds || 0) * (d.days || 1);
  });
  const totalCSSDGB = totalBedDaysCapacity > 0 ? (totalInpatientDays * 100) / totalBedDaysCapacity : 0;
  
  // Prepare Comparison Data for all departments (type 1 & 2)
  const deptComparisonData = inpatientAndOutpatient.map(d => ({
    name: d.name,
    'DVKT': d.metrics.dich_vu_ky_thuat || 0,
    'Siêu Âm': d.metrics.sieu_am || 0,
    'X-Quang': d.metrics.x_quang || 0,
    'ECG': d.metrics.ecg || 0,
    'Xét nghiệm': d.metrics.xet_nghiem || 0,
  }));

  const inpatientChartData = inpatientDepts.map(d => ({
    name: d.name,
    'Ngày ĐT': d.metrics.ngay_dieu_tri_noi_tru || 0,
    'BN Nội trú': d.metrics.benh_nhan_noi_tru || 0,
    'CSSDGB': d.metrics.cssdgb || 0,
    'Ngày ĐT trung bình': d.metrics.ndttb || 0,
  }));

  const revenueChartData = data
    .filter(d => d.type !== 4) // Exclude DEPT_TYPES.FUNCTIONAL
    .map(d => ({
      name: d.name,
      'Doanh thu DVKT theo yêu cầu': d.metrics.tien_dvkt_yeu_cau || 0,
    }));

  const totalPlannedBeds = data.reduce((sum, d) => sum + (d.planned_beds || 0), 0);

  // Calculate total metrics for the whole hospital
  const totalHospitalMetrics: Record<string, number> = {};
  data.forEach(d => {
    Object.keys(d.metrics).forEach(key => {
      // Don't simply sum up CSSDGB and NDTTB as they are derived
      if (key !== 'cssdgb' && key !== 'ndttb') {
        totalHospitalMetrics[key] = (totalHospitalMetrics[key] || 0) + (d.metrics[key] || 0);
      }
    });
  });
  // Add derived metrics correctly
  totalHospitalMetrics['cssdgb'] = totalCSSDGB;
  const totalInpatientPatients = data.reduce((sum, d) => sum + (d.metrics.benh_nhan_noi_tru || 0), 0);
  totalHospitalMetrics['ndttb'] = totalInpatientPatients > 0 ? totalInpatientDays / totalInpatientPatients : 0;

  // Calculate prev year total metrics
  const prevTotalHospitalMetrics: Record<string, number> = {};
  let prevTotalInpatientDays = 0;
  let prevTotalBedDaysCapacity = 0;
  
  prevData.forEach(d => {
    Object.keys(d.metrics).forEach(key => {
      if (key !== 'cssdgb' && key !== 'ndttb') {
        prevTotalHospitalMetrics[key] = (prevTotalHospitalMetrics[key] || 0) + (d.metrics[key] || 0);
      }
    });
  });

  const prevInpatientDepts = prevData.filter(d => d.type === 2);
  prevInpatientDepts.forEach(d => {
    prevTotalInpatientDays += (d.metrics.ngay_dieu_tri_noi_tru || 0);
    prevTotalBedDaysCapacity += (d.planned_beds || 0) * (d.days || 1);
  });
  
  prevTotalHospitalMetrics['cssdgb'] = prevTotalBedDaysCapacity > 0 ? (prevTotalInpatientDays * 100) / prevTotalBedDaysCapacity : 0;
  const prevTotalInpatientPatients = prevData.reduce((sum, d) => sum + (d.metrics.benh_nhan_noi_tru || 0), 0);
  prevTotalHospitalMetrics['ndttb'] = prevTotalInpatientPatients > 0 ? prevTotalInpatientDays / prevTotalInpatientPatients : 0;

  const selectedYear = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear();
  const currentTargets = targets.filter(t => t.year === selectedYear);

  // Format currency
  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const exportExcel = (exportType: 'total' | 'dept' | 'both') => {
    const wb = XLSX.utils.book_new();

    // 1. Sheet Toàn viện
    if (exportType === 'total' || exportType === 'both') {
      const totalData: any[] = [];
      
      totalData.push(['BÁO CÁO TỔNG HỢP TOÀN VIỆN']);
      totalData.push([`Từ ngày: ${startDate || 'Đầu năm'}`, `Đến ngày: ${endDate || 'Hiện tại'}`]);
      totalData.push([]);

      totalData.push(['CHUYÊN MÔN Y TẾ']);
      totalData.push(['Chỉ tiêu', 'Thực hiện', 'Kế hoạch', '% KH', 'Cùng kỳ', 'So với cùng kỳ']);
      
      Object.entries(METRIC_LABELS).forEach(([key, label]) => {
         const targetObj = currentTargets.find(t => t.metric_key === key);
         const targetVal = targetObj ? targetObj.target_value : null;
         const actualVal = totalHospitalMetrics[key] || 0;
         const prevVal = prevTotalHospitalMetrics[key] || 0;
         
         const isPercentMetric = key === 'cssdgb';
         const isAvgMetric = key === 'ndttb';
         
         let percent: string | number = '-';
         if (targetVal !== null && targetVal > 0 && !isAvgMetric) {
            percent = (actualVal / targetVal) * 100;
         }

         let yoyDiff = actualVal - prevVal;
         
         totalData.push([
           label,
           actualVal,
           targetVal || '-',
           percent,
           prevVal,
           yoyDiff
         ]);
      });

      totalData.push([]);
      totalData.push(['NHÂN LỰC TOÀN VIỆN']);
      totalData.push(['Chức danh', 'Số lượng']);
      
      PERSONNEL_GROUPS.forEach(group => {
         totalData.push([group.title.toUpperCase(), '']);
         group.keys.forEach(key => {
            if (totalPersonnel[key]) {
               totalData.push([PERSONNEL_LABELS[key], totalPersonnel[key]]);
            }
         });
      });

      const wsTotal = XLSX.utils.aoa_to_sheet(totalData);
      XLSX.utils.book_append_sheet(wb, wsTotal, "Toàn Viện");
    }

    // 2. Sheet Từng khoa
    if (exportType === 'dept' || exportType === 'both') {
      data.forEach(dept => {
        const deptData: any[] = [];
        deptData.push([`BÁO CÁO KHOA/PHÒNG: ${dept.name.toUpperCase()}`]);
        deptData.push([`Từ ngày: ${startDate || 'Đầu năm'}`, `Đến ngày: ${endDate || 'Hiện tại'}`]);
        deptData.push([]);

        if (dept.type !== 4) { // Chuyên môn
          deptData.push(['CHUYÊN MÔN Y TẾ']);
          deptData.push(['Chỉ tiêu', 'Thực hiện', 'Cùng kỳ', 'So với cùng kỳ']);
          
          const prevDept = prevData.find(d => d.id === dept.id);
          
          [...METRIC_GROUPS[0].keys, 'cssdgb', 'ndttb'].filter(k => dept.metrics[k] !== undefined).forEach(key => {
             const val = dept.metrics[key];
             const prevVal = prevDept ? (prevDept.metrics[key] as number || 0) : 0;
             const diff = (val as number) - prevVal;
             
             deptData.push([
               METRIC_LABELS[key as keyof typeof METRIC_LABELS] || key,
               val,
               prevVal,
               diff
             ]);
          });
          deptData.push([]);
        }

        deptData.push(['NHÂN LỰC']);
        deptData.push(['Chức danh', 'Số lượng']);
        if (dept.personnel) {
           PERSONNEL_GROUPS.forEach(group => {
              const keys = group.keys.filter(k => dept.personnel![k]);
              if (keys.length > 0) {
                 deptData.push([group.title.toUpperCase(), '']);
                 keys.forEach(key => {
                    deptData.push([PERSONNEL_LABELS[key], dept.personnel![key]]);
                 });
              }
           });
        }

        const wsDept = XLSX.utils.aoa_to_sheet(deptData);
        let safeName = dept.name.replace(/[\[\]\*\\\/\?]/g, "").substring(0, 31);
        XLSX.utils.book_append_sheet(wb, wsDept, safeName);
      });
    }

    XLSX.writeFile(wb, `BaoCao_${startDate || 'DauNam'}_${endDate || 'HienTai'}.xlsx`);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Từ ngày</label>
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(date: Date | null) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
              dateFormat="dd/MM/yyyy"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
              placeholderText="dd/mm/yyyy"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Đến ngày</label>
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(date: Date | null) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
              dateFormat="dd/MM/yyyy"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
              placeholderText="dd/mm/yyyy"
            />
          </div>
          <button 
            onClick={handleFilter}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors h-[38px]"
          >
            <Filter size={16} /> Lọc dữ liệu
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors h-[38px] whitespace-nowrap"
          >
            <Download size={16} /> Xuất báo cáo
          </button>
        </div>
        {effectiveDates && (
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic">
            Số liệu thống kê từ ngày {format(new Date(effectiveDates.start), 'dd/MM/yyyy')} đến ngày {format(new Date(effectiveDates.end), 'dd/MM/yyyy')}
          </div>
        )}
      </div>

      {data.length === 0 && !loading && (
        <div className="text-center p-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">Không có dữ liệu trong khoảng thời gian này.</div>
      )}

      {data.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-5 border-l-4 border-l-cyan-500">
              <div className="w-14 h-14 bg-slate-100 text-cyan-600 rounded-2xl flex items-center justify-center shrink-0">
                <Users size={28} />
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tổng Lượt Khám</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{totalVisits.toLocaleString('vi-VN')}</h3>
              </div>
            </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-5 border-l-4 border-l-rose-500">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
            <BedDouble size={28} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">CSSDGB Toàn Viện</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{totalCSSDGB.toFixed(1)}%</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-5 border-l-4 border-l-amber-500">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Doanh Thu DVKT Theo YC</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatVND(totalRevenue)}</h3>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <button 
          onClick={() => setShowDeptDataModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
        >
          <List size={16} className="text-indigo-500" />
          Xem số liệu từng khoa/phòng
        </button>
        <button 
          onClick={() => setShowTotalHospitalModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
        >
          <Activity size={16} className="text-emerald-500" />
          Xem số liệu toàn viện
        </button>
        <button 
          onClick={() => setShowDeptComparison(!showDeptComparison)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
        >
          <BarChartIcon size={16} className={showDeptComparison ? "text-cyan-600" : "text-slate-400"} />
          {showDeptComparison ? "Ẩn biểu đồ so sánh chi tiết các khoa" : "Hiển thị biểu đồ so sánh chi tiết các khoa"}
        </button>
      </div>

      {/* Comparison Chart across departments */}
      {showDeptComparison && (
        <div className="space-y-6">
          {/* Chart 1: Inpatient Depts */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-cyan-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">So sánh chỉ tiêu các khoa nội trú</h3>
            </div>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inpatientChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: number) => Number.isInteger(val) ? val : Number(val.toFixed(1))}
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="Ngày ĐT" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="BN Nội trú" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CSSDGB" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ngày ĐT trung bình" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: CLS & DVKT */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">So sánh chỉ tiêu Cận lâm sàng & DVKT giữa các khoa</h3>
            </div>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: number) => Number.isInteger(val) ? val : Number(val.toFixed(1))}
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="DVKT" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Siêu Âm" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="X-Quang" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ECG" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Xét nghiệm" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Revenue */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-emerald-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">So sánh doanh thu DVKT theo yêu cầu</h3>
            </div>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => (v/1000000) + 'M'} tick={{fill: '#64748b', fontSize: 13}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: number) => formatVND(val)}
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="Doanh thu DVKT theo yêu cầu" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart: CSSDGB Comparison */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-amber-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Xếp hạng Công suất Giường bệnh</h3>
          </div>
          <div style={{ height: Math.max(288, rankCSSDGB.length * 40 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankCSSDGB} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" unit="%" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={200} axisLine={false} tickLine={false} tick={<CustomYAxisTick />} />
                <Tooltip 
                  formatter={(val: number) => Number.isInteger(val) ? val : Number(val.toFixed(1))}
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="metrics.cssdgb" name="CSSDGB" radius={[0, 6, 6, 0]}>
                  {rankCSSDGB.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Revenue Comparison */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-amber-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Top Doanh thu DVKT theo yêu cầu</h3>
          </div>
          <div style={{ height: Math.max(288, rankRevenue.length * 40 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankRevenue} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v) => (v/1000000) + 'M'} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={200} axisLine={false} tickLine={false} tick={<CustomYAxisTick />} />
                <Tooltip 
                  formatter={(val: number) => formatVND(val)}
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="metrics.tien_dvkt_yeu_cau" name="Doanh thu" radius={[0, 6, 6, 0]}>
                  {rankRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Data Tables */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <Stethoscope className="text-cyan-600" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Chi tiết Khối Nội Trú</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
              <tr>
                <th className="px-6 py-4">Khoa</th>
                <th className="px-6 py-4 text-right">BN Nội trú</th>
                <th className="px-6 py-4 text-right">Ngày ĐT</th>
                <th className="px-6 py-4 text-right">Ngày ĐT TB</th>
                <th className="px-6 py-4 text-right">CSSDGB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inpatientDepts.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900">
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{d.name}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.benh_nhan_noi_tru?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.ngay_dieu_tri_noi_tru?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.ndttb ? d.metrics.ndttb.toFixed(1) : '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-cyan-600">{d.metrics.cssdgb ? d.metrics.cssdgb.toFixed(1) + '%' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <Activity className="text-cyan-600" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dịch vụ Cận Lâm Sàng & Khám</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
              <tr>
                <th className="px-6 py-4">Khoa</th>
                <th className="px-6 py-4 text-right">Lượt Khám</th>
                <th className="px-6 py-4 text-right">DVKT</th>
                <th className="px-6 py-4 text-right">Siêu Âm</th>
                <th className="px-6 py-4 text-right">X-Quang</th>
                <th className="px-6 py-4 text-right">ECG</th>
                <th className="px-6 py-4 text-right">Xét nghiệm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inpatientAndOutpatient.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900">
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{d.name}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.kham_benh?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.dich_vu_ky_thuat?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.sieu_am?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.x_quang?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.ecg?.toLocaleString('vi-VN') || '-'}</td>
                  <td className="px-6 py-4 text-right">{d.metrics.xet_nghiem?.toLocaleString('vi-VN') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="text-cyan-600" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nhân lực Toàn Viện</h3>
          </div>
          <div className="text-lg font-bold text-cyan-600">
            Tổng cộng: {totalHospitalPersonnel}
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {PERSONNEL_GROUPS.map(group => {
              const groupTotal = group.keys.reduce((sum, key) => sum + (totalPersonnel[key] || 0), 0);
              return (
              <div key={group.title}>
                <div 
                  className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 mb-2 pb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors rounded-lg px-2 -mx-2"
                  onClick={() => setExpandedPersonnel(prev => ({ ...prev, [group.title]: !prev[group.title] }))}
                >
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{group.title}</h4>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Tổng: {groupTotal}</span>
                    <button className="flex items-center text-xs text-cyan-600 font-medium whitespace-nowrap w-24 justify-end">
                      {expandedPersonnel[group.title] ? 'Ẩn chi tiết' : 'Chi tiết'}
                      {expandedPersonnel[group.title] ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                    </button>
                  </div>
                </div>
                {expandedPersonnel[group.title] && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-3 mb-4">
                    {group.keys.map(key => {
                      const val = totalPersonnel[key] || 0;
                      return (
                        <div key={key} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{PERSONNEL_LABELS[key]}</span>
                          <span className="block text-lg font-bold text-slate-800 dark:text-slate-100">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>
      </div>

      {showTotalHospitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tổng Hợp Số Liệu Toàn Viện</h3>
              <button 
                onClick={() => setShowTotalHospitalModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Số giường kế hoạch */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Số giường kế hoạch</span>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {totalPlannedBeds.toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                {Object.entries(METRIC_LABELS).map(([key, label]) => {
                  const targetObj = currentTargets.find(t => t.metric_key === key);
                  const targetVal = targetObj ? targetObj.target_value : null;
                  const actualVal = totalHospitalMetrics[key] || 0;
                  
                  const isPercentMetric = key === 'cssdgb';
                  const isAvgMetric = key === 'ndttb';
                  const isCurrency = key === 'tien_dvkt_yeu_cau';

                  let percent = null;
                  let diff = null;
                  if (targetVal !== null && targetVal > 0) {
                     if (isAvgMetric) {
                        diff = actualVal - targetVal;
                     } else {
                        percent = (actualVal / targetVal) * 100;
                     }
                  }

                  let yoyDiff: number | null = null;
                  if (prevData.length > 0) {
                     yoyDiff = actualVal - (prevTotalHospitalMetrics[key] || 0);
                  }

                  const formatVal = (v: number) => {
                     if (isPercentMetric) return v.toFixed(1) + '%';
                     if (isAvgMetric) return v.toFixed(1);
                     if (isCurrency) return formatVND(v);
                     return v.toLocaleString('vi-VN');
                  };

                  return (
                    <div key={key} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</span>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          {formatVal(actualVal)}
                        </span>
                        {percent !== null && !isAvgMetric && (
                          <span className={clsx("text-sm font-medium", percent >= 100 ? "text-emerald-600" : "text-amber-500")}>
                            {percent.toFixed(1)}% KH
                          </span>
                        )}
                        {diff !== null && isAvgMetric && (
                          <span className={clsx("text-sm font-medium", diff <= 0 ? "text-emerald-600" : "text-amber-500")}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)} KH
                          </span>
                        )}
                      </div>
                      
                      {yoyDiff !== null && (
                         <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                           <span>So với cùng kỳ:</span>
                           <span className={clsx("font-semibold", yoyDiff > 0 ? "text-emerald-600" : yoyDiff < 0 ? "text-amber-500" : "text-slate-500 dark:text-slate-400")}>
                             {yoyDiff > 0 ? '+' : ''}{formatVal(yoyDiff)}
                           </span>
                         </div>
                      )}

                      {targetVal !== null && (
                         <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                           <span>Kế hoạch {selectedYear}:</span>
                           <span className="font-semibold text-slate-700 dark:text-slate-300">{formatVal(targetVal)}</span>
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeptDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col md:flex-row">
            {/* Header for mobile or just close button */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
               <h3 className="font-bold text-slate-800 dark:text-slate-100">Số liệu từng khoa</h3>
               <button onClick={() => setShowDeptDataModal(false)} className="text-slate-500 dark:text-slate-400"><X size={20}/></button>
            </div>
            
            {/* Sidebar List */}
            <div className="w-full md:w-1/4 border-r border-slate-100 dark:border-slate-700 flex flex-col h-1/3 md:h-full">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 hidden md:flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Danh sách Khoa/Phòng</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {data.map(dept => (
                  <button 
                    key={dept.id}
                    onClick={() => setSelectedDeptForModal(dept)}
                    className={clsx(
                      "w-full text-left px-4 py-3 rounded-xl transition-colors text-sm font-medium",
                      selectedDeptForModal?.id === dept.id ? "bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" : "hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="w-full md:w-3/4 flex flex-col h-2/3 md:h-full bg-slate-50 dark:bg-slate-900 relative">
              <button 
                onClick={() => setShowDeptDataModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-300 hidden md:block z-10"
              >
                <X size={24} />
              </button>
              
              {selectedDeptForModal ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">{selectedDeptForModal.name}</h2>
                  
                  {/* Chuyên môn */}
                  {selectedDeptForModal.type !== 4 && (
                    <>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Chuyên môn y tế</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {[...METRIC_GROUPS[0].keys, 'cssdgb', 'ndttb'].filter(k => selectedDeptForModal.metrics[k] !== undefined).map(key => {
                            const val = selectedDeptForModal.metrics[key] as number;
                            
                            const prevDept = prevData.find(d => d.id === selectedDeptForModal.id);
                            let yoyDiff: number | null = null;
                            if (prevData.length > 0) {
                                const prevVal = prevDept ? (prevDept.metrics[key] as number || 0) : 0;
                                yoyDiff = val - prevVal;
                            }
                            
                            const formatVal = (v: number) => {
                               if (key === 'cssdgb') return v.toFixed(1) + '%';
                               if (key === 'ndttb') return v.toFixed(1);
                               if (key === 'tien_dvkt_yeu_cau') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
                               return v.toLocaleString('vi-VN');
                            };

                            return (
                              <div key={key} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                                 <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{METRIC_LABELS[key as keyof typeof METRIC_LABELS] || key}</span>
                                 <div className="flex items-end justify-between">
                                   <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                     {formatVal(val)}
                                   </span>
                                 </div>
                                 
                                 {yoyDiff !== null && (
                                   <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                                     <span>So với cùng kỳ:</span>
                                     <span className={clsx("font-semibold", yoyDiff > 0 ? "text-emerald-600" : yoyDiff < 0 ? "text-amber-500" : "text-slate-500 dark:text-slate-400")}>
                                       {yoyDiff > 0 ? '+' : ''}{formatVal(yoyDiff)}
                                     </span>
                                   </div>
                                 )}
                              </div>
                            );
                         })}
                         {Object.keys(selectedDeptForModal.metrics).length === 0 && (
                            <div className="text-slate-500 dark:text-slate-400 col-span-full">Chưa có số liệu chuyên môn.</div>
                         )}
                      </div>
                    </>
                  )}

                  {/* Nhân lực */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nhân lực</h3>
                    <span className="text-lg font-bold text-cyan-600">
                      Tổng cộng: {selectedDeptForModal.personnel ? Object.values(selectedDeptForModal.personnel).reduce((sum: number, val) => sum + (val as number), 0) : 0}
                    </span>
                  </div>
                  <div className="space-y-6">
                    {PERSONNEL_GROUPS.map(group => {
                      const groupKeys = group.keys.filter(k => selectedDeptForModal.personnel && selectedDeptForModal.personnel[k] !== undefined && selectedDeptForModal.personnel[k] > 0);
                      if (groupKeys.length === 0) return null;
                      
                      const groupTotal = groupKeys.reduce((sum: number, k) => sum + (selectedDeptForModal.personnel![k] as number), 0);

                      return (
                        <div key={group.title}>
                          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{group.title}</h4>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Tổng: {groupTotal}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {groupKeys.map(key => (
                              <div key={key} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{PERSONNEL_LABELS[key]}</span>
                                <span className="block text-lg font-bold text-slate-800 dark:text-slate-100">{selectedDeptForModal.personnel![key]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {(!selectedDeptForModal.personnel || Object.keys(selectedDeptForModal.personnel).length === 0) && (
                      <div className="text-slate-500 dark:text-slate-400">Chưa có số liệu nhân lực.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <List size={48} className="mb-4 text-slate-300" />
                  <p>Vui lòng chọn một khoa/phòng từ danh sách bên trái để xem chi tiết.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tùy chọn Xuất Báo Cáo</h3>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex flex-col gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Vui lòng chọn loại dữ liệu muốn xuất ra Excel:</p>
              
              <button 
                onClick={() => exportExcel('total')}
                className="w-full text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors shadow-sm"
              >
                <div className="font-bold text-slate-800 dark:text-slate-100">Số liệu Toàn viện</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chỉ bao gồm số liệu tổng hợp của bệnh viện</div>
              </button>
              
              <button 
                onClick={() => exportExcel('dept')}
                className="w-full text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors shadow-sm"
              >
                <div className="font-bold text-slate-800 dark:text-slate-100">Số liệu Từng khoa</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gồm nhiều sheet, mỗi khoa là 1 sheet riêng</div>
              </button>
              
              <button 
                onClick={() => exportExcel('both')}
                className="w-full text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors shadow-sm"
              >
                <div className="font-bold text-slate-800 dark:text-slate-100">Cả hai (Toàn viện & Từng khoa)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gồm 1 sheet toàn viện và các sheet từng khoa</div>
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}
    </div>
  );
}
