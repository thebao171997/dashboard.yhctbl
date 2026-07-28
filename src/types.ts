export type MetricKey =
  | 'kham_benh'
  | 'ho_so_ngoai_tru'
  | 'sieu_am'
  | 'x_quang'
  | 'ecg'
  | 'xet_nghiem'
  | 'ngay_dieu_tri_noi_tru'
  | 'benh_nhan_noi_tru'
  | 'dich_vu_ky_thuat'
  | 'tien_dvkt_yeu_cau'
  // Computed
  | 'cssdgb'
  | 'ndttb';

export type PersonnelKey =
  | 'nl_bs_tc' | 'nl_bs_cd' | 'nl_bs_dh' | 'nl_bs_ths' | 'nl_bs_ck1' | 'nl_bs_ck2'
  | 'nl_dd_tc' | 'nl_dd_cd' | 'nl_dd_dh' | 'nl_dd_ths' | 'nl_dd_ck1' | 'nl_dd_ck2'
  | 'nl_ktv_tc' | 'nl_ktv_cd' | 'nl_ktv_dh' | 'nl_ktv_ths' | 'nl_ktv_ck1' | 'nl_ktv_ck2'
  | 'nl_ds_tc' | 'nl_ds_cd' | 'nl_ds_dh' | 'nl_ds_ck1' | 'nl_ds_ck2'
  | 'nl_khac_tc' | 'nl_khac_cd' | 'nl_khac_dh' | 'nl_khac_sdh'
  | 'nl_hd111_tc' | 'nl_hd111_cd' | 'nl_hd111_dh' | 'nl_hd111_sdh' | 'nl_hd111_khac';

export const METRIC_LABELS: Record<MetricKey, string> = {
  kham_benh: 'Số lượt khám',
  ho_so_ngoai_tru: 'Số Hồ sơ điều trị ngoại trú',
  sieu_am: 'Số lượt Siêu âm',
  x_quang: 'Số lượt X-quang',
  ecg: 'Số lượt ECG',
  xet_nghiem: 'Số lượng Xét nghiệm',
  ngay_dieu_tri_noi_tru: 'Số ngày điều trị nội trú',
  benh_nhan_noi_tru: 'Số lượng bệnh nhân điều trị nội trú',
  dich_vu_ky_thuat: 'Số lượng dịch vụ kỹ thuật',
  tien_dvkt_yeu_cau: 'Số tiền dịch vụ kỹ thuật theo yêu cầu',
  cssdgb: 'Công suất sử dụng giường bệnh (%)',
  ndttb: 'Ngày điều trị trung bình',
};

export const PERSONNEL_LABELS: Record<PersonnelKey, string> = {
  nl_bs_tc: 'Trung cấp', nl_bs_cd: 'Cao đẳng', nl_bs_dh: 'Đại học', nl_bs_ths: 'Thạc sỹ', nl_bs_ck1: 'CKI', nl_bs_ck2: 'CKII',
  nl_dd_tc: 'Trung cấp', nl_dd_cd: 'Cao đẳng', nl_dd_dh: 'Đại học', nl_dd_ths: 'Thạc sỹ', nl_dd_ck1: 'CKI', nl_dd_ck2: 'CKII',
  nl_ktv_tc: 'Trung cấp', nl_ktv_cd: 'Cao đẳng', nl_ktv_dh: 'Đại học', nl_ktv_ths: 'Thạc sỹ', nl_ktv_ck1: 'CKI', nl_ktv_ck2: 'CKII',
  nl_ds_tc: 'Trung cấp', nl_ds_cd: 'Cao đẳng', nl_ds_dh: 'Đại học', nl_ds_ck1: 'CKI', nl_ds_ck2: 'CKII',
  nl_khac_tc: 'Trung cấp', nl_khac_cd: 'Cao đẳng', nl_khac_dh: 'Đại học', nl_khac_sdh: 'Sau đại học',
  nl_hd111_tc: 'Trung cấp', nl_hd111_cd: 'Cao đẳng', nl_hd111_dh: 'Đại học', nl_hd111_sdh: 'Sau đại học', nl_hd111_khac: 'Khác',
};

export const DEPT_TYPES = {
  OUTPATIENT: 1, // Khoa Khám bệnh
  INPATIENT: 2,  // Các khoa Nội trú
  TECHNICAL: 3,  // Khoa chỉ thực hiện DVKT
  FUNCTIONAL: 4, // Phòng chức năng
} as const;

export const METRIC_GROUPS: { title: string; keys: MetricKey[] }[] = [
  {
    title: 'Chuyên môn y tế',
    keys: [
      'kham_benh', 'ho_so_ngoai_tru', 'sieu_am', 'x_quang', 'ecg', 'xet_nghiem',
      'ngay_dieu_tri_noi_tru', 'benh_nhan_noi_tru', 'dich_vu_ky_thuat', 'tien_dvkt_yeu_cau'
    ]
  }
];

export const PERSONNEL_GROUPS: { title: string; keys: PersonnelKey[] }[] = [
  {
    title: 'Bác sỹ',
    keys: ['nl_bs_tc', 'nl_bs_cd', 'nl_bs_dh', 'nl_bs_ths', 'nl_bs_ck1', 'nl_bs_ck2']
  },
  {
    title: 'Điều dưỡng',
    keys: ['nl_dd_tc', 'nl_dd_cd', 'nl_dd_dh', 'nl_dd_ths', 'nl_dd_ck1', 'nl_dd_ck2']
  },
  {
    title: 'Kỹ thuật viên',
    keys: ['nl_ktv_tc', 'nl_ktv_cd', 'nl_ktv_dh', 'nl_ktv_ths', 'nl_ktv_ck1', 'nl_ktv_ck2']
  },
  {
    title: 'Dược sĩ',
    keys: ['nl_ds_tc', 'nl_ds_cd', 'nl_ds_dh', 'nl_ds_ck1', 'nl_ds_ck2']
  },
  {
    title: 'Khác',
    keys: ['nl_khac_tc', 'nl_khac_cd', 'nl_khac_dh', 'nl_khac_sdh']
  },
  {
    title: 'HĐ 111',
    keys: ['nl_hd111_tc', 'nl_hd111_cd', 'nl_hd111_dh', 'nl_hd111_sdh', 'nl_hd111_khac']
  }
];

export const DEPT_TYPE_LABELS = {
  [DEPT_TYPES.OUTPATIENT]: 'Khoa Khám bệnh',
  [DEPT_TYPES.INPATIENT]: 'Khoa Nội trú',
  [DEPT_TYPES.TECHNICAL]: 'Khoa Dịch vụ Kỹ thuật',
  [DEPT_TYPES.FUNCTIONAL]: 'Phòng chức năng',
};

export type UserContextType = {
  user: { role: string } | null;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
};

export type Department = {
  id: number;
  name: string;
  type: 1 | 2 | 3 | 4;
  planned_beds: number;
  metrics: MetricKey[];
  personnel?: Record<string, number>;
};

export type DashboardDeptData = {
  id: number;
  name: string;
  type: 1 | 2 | 3 | 4;
  planned_beds: number;
  metrics: Record<string, number>;
  personnel?: Record<string, number>;
  days: number;
};
export type HospitalTarget = { year: number; metric_key: string; target_value: number; };
