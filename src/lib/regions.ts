// ============================================================
// 销售区域定义与国家 → 区域自动划分
// 业务划分（磨机衬板销售区域）：
//   APAC：蒙古、东南亚国家、澳大利亚、巴布亚新几内亚
//   CIS ：中国、5个斯坦国家，及俄罗斯、白俄罗斯、乌克兰等独联体国家
//   EUR ：欧洲（塞尔维亚、希腊、欧盟各国、英国、挪威、瑞士、巴尔干等）
//   AFR ：非洲所有国家
//   SAM ：所有中美洲和南美洲国家
//   OTHER：未在上述划分中的国家（可手动指定区域）
// ============================================================

export const REGIONS = ['APAC', 'CIS', 'EUR', 'AFR', 'SAM', 'OTHER'] as const
export type Region = (typeof REGIONS)[number]

export const REGION_META: Record<
  Region,
  { label: string; short: string; color: string; description: string }
> = {
  APAC: {
    label: 'APAC 亚太区',
    short: 'APAC',
    color: '#059669', // emerald-600
    description: '蒙古、东南亚国家、澳大利亚、巴布亚新几内亚（PNG）及大洋洲',
  },
  CIS: {
    label: 'CIS 中国/独联体区',
    short: 'CIS',
    color: '#d97706', // amber-600
    description: '中国、哈萨克斯坦/乌兹别克斯坦/土库曼斯坦/吉尔吉斯斯坦/塔吉克斯坦，及俄罗斯、白俄罗斯、乌克兰等独联体国家',
  },
  EUR: {
    label: 'EUR 欧洲区',
    short: 'EUR',
    color: '#2563eb', // blue-600
    description: '欧洲国家：塞尔维亚、希腊、欧盟各国、英国、挪威、瑞士、巴尔干地区、土耳其等',
  },
  AFR: {
    label: 'AFR 非洲区',
    short: 'AFR',
    color: '#7c3aed', // violet-600
    description: '非洲所有国家（54 国及主要属地）',
  },
  SAM: {
    label: 'SAM 南美区',
    short: 'SAM',
    color: '#e11d48', // rose-600
    description: '所有中美洲和南美洲国家（含加勒比地区）',
  },
  OTHER: {
    label: '未分配区域',
    short: '其他',
    color: '#64748b', // slate-500
    description: '不在上述销售区域划分内的国家，可在客户编辑中手动指定区域',
  },
}

// 国家名标准化（小写、去空格/标点），支持常见别名
function normalizeCountry(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
}

// ---- 国家 → 区域映射表 ----
const COUNTRY_REGION: Record<string, Region> = {
  // ===== APAC：蒙古、东南亚、大洋洲 =====
  mongolia: 'APAC',
  'papua new guinea': 'APAC',
  'png': 'APAC',
  australia: 'APAC',
  'new zealand': 'APAC',
  'new caledonia': 'APAC',
  fiji: 'APAC',
  'solomon islands': 'APAC',
  vanuatu: 'APAC',
  // 东南亚
  vietnam: 'APAC',
  'viet nam': 'APAC',
  laos: 'APAC',
  'lao pdr': 'APAC',
  cambodia: 'APAC',
  thailand: 'APAC',
  myanmar: 'APAC',
  burma: 'APAC',
  malaysia: 'APAC',
  singapore: 'APAC',
  indonesia: 'APAC',
  philippines: 'APAC',
  brunei: 'APAC',
  'brunei darussalam': 'APAC',
  'timor-leste': 'APAC',
  'east timor': 'APAC',

  // ===== CIS：中国、5个斯坦、独联体国家 =====
  china: 'CIS',
  'hong kong': 'CIS',
  'hong kong sar': 'CIS',
  taiwan: 'CIS',
  kazakhstan: 'CIS',
  uzbekistan: 'CIS',
  turkmenistan: 'CIS',
  kyrgyzstan: 'CIS',
  'kyrgyz republic': 'CIS',
  tajikistan: 'CIS',
  // 独联体 / 前苏联国家（俄罗斯、高加索、东斯拉夫）
  russia: 'CIS',
  'russian federation': 'CIS',
  belarus: 'CIS',
  ukraine: 'CIS',
  moldova: 'CIS',
  'republic of moldova': 'CIS',
  georgia: 'CIS',
  armenia: 'CIS',
  azerbaijan: 'CIS',

  // ===== EUR：欧洲（塞尔维亚、希腊等） =====
  // ---- 巴尔干 ----
  serbia: 'EUR',
  greece: 'EUR',
  bulgaria: 'EUR',
  romania: 'EUR',
  slovenia: 'EUR',
  croatia: 'EUR',
  'bosnia and herzegovina': 'EUR',
  bosnia: 'EUR',
  montenegro: 'EUR',
  'north macedonia': 'EUR',
  macedonia: 'EUR',
  albania: 'EUR',
  kosovo: 'EUR',
  // ---- 西欧 ----
  'united kingdom': 'EUR',
  uk: 'EUR',
  'great britain': 'EUR',
  england: 'EUR',
  scotland: 'EUR',
  wales: 'EUR',
  'northern ireland': 'EUR',
  ireland: 'EUR',
  'republic of ireland': 'EUR',
  france: 'EUR',
  germany: 'EUR',
  netherlands: 'EUR',
  'the netherlands': 'EUR',
  holland: 'EUR',
  belgium: 'EUR',
  luxembourg: 'EUR',
  switzerland: 'EUR',
  liechtenstein: 'EUR',
  austria: 'EUR',
  monaco: 'EUR',
  andorra: 'EUR',
  // ---- 北欧 ----
  denmark: 'EUR',
  norway: 'EUR',
  sweden: 'EUR',
  finland: 'EUR',
  iceland: 'EUR',
  'faroe islands': 'EUR',
  // ---- 南欧 ----
  italy: 'EUR',
  spain: 'EUR',
  portugal: 'EUR',
  malta: 'EUR',
  gibraltar: 'EUR',
  'san marino': 'EUR',
  // ---- 中东欧 ----
  poland: 'EUR',
  'czech republic': 'EUR',
  czechia: 'EUR',
  slovakia: 'EUR',
  hungary: 'EUR',
  estonia: 'EUR',
  latvia: 'EUR',
  lithuania: 'EUR',
  // ---- 跨洲国家（销售惯例归入欧洲） ----
  turkey: 'EUR',
  'türkiye': 'EUR',
  turkiye: 'EUR',
  cyprus: 'EUR',
  greenland: 'EUR',

  // ===== AFR：非洲所有国家（54 国 + 主要属地） =====  // ---- 北非 ----
  algeria: 'AFR',
  egypt: 'AFR',
  libya: 'AFR',
  morocco: 'AFR',
  tunisia: 'AFR',
  sudan: 'AFR',
  'south sudan': 'AFR',
  'western sahara': 'AFR',
  // ---- 西非 ----
  benin: 'AFR',
  'burkina faso': 'AFR',
  'cape verde': 'AFR',
  'cabo verde': 'AFR',
  "côte d'ivoire": 'AFR',
  "cote d'ivoire": 'AFR',
  "cote divoire": 'AFR',
  "ivory coast": 'AFR',
  gambia: 'AFR',
  ghana: 'AFR',
  guinea: 'AFR',
  'guinea-bissau': 'AFR',
  liberia: 'AFR',
  mali: 'AFR',
  mauritania: 'AFR',
  niger: 'AFR',
  nigeria: 'AFR',
  senegal: 'AFR',
  'sierra leone': 'AFR',
  togo: 'AFR',
  'saint helena': 'AFR',
  // ---- 中非 ----
  burundi: 'AFR',
  cameroon: 'AFR',
  'central african republic': 'AFR',
  chad: 'AFR',
  'congo republic': 'AFR',
  'republic of the congo': 'AFR',
  'congo-brazzaville': 'AFR',
  'congo kinshasa': 'AFR',
  'dr congo': 'AFR',
  'drc': 'AFR',
  'democratic republic of the congo': 'AFR',
  'democratic republic of congo': 'AFR',
  'd r congo': 'AFR',
  'équatorial guinea': 'AFR',
  'equatorial guinea': 'AFR',
  gabon: 'AFR',
  'são tomé and príncipe': 'AFR',
  'sao tome and principe': 'AFR',
  'sao tome': 'AFR',
  // ---- 东非 ----
  comoros: 'AFR',
  djibouti: 'AFR',
  eritrea: 'AFR',
  ethiopia: 'AFR',
  kenya: 'AFR',
  madagascar: 'AFR',
  malawi: 'AFR',
  mauritius: 'AFR',
  mayotte: 'AFR',
  mozambique: 'AFR',
  réunion: 'AFR',
  reunion: 'AFR',
  rwanda: 'AFR',
  seychelles: 'AFR',
  somalia: 'AFR',
  'somaliland': 'AFR',
  tanzania: 'AFR',
  uganda: 'AFR',
  zambia: 'AFR',
  zimbabwe: 'AFR',
  // ---- 南部非洲 ----
  botswana: 'AFR',
  eswatini: 'AFR',
  swaziland: 'AFR',
  lesotho: 'AFR',
  namibia: 'AFR',
  'south africa': 'AFR',
  angola: 'AFR',

  // ===== SAM：中美洲 + 南美洲（含加勒比） =====
  // ---- 中美洲 ----
  belize: 'SAM',
  'costa rica': 'SAM',
  'el salvador': 'SAM',
  guatemala: 'SAM',
  honduras: 'SAM',
  nicaragua: 'SAM',
  panama: 'SAM',
  // ---- 加勒比 ----
  cuba: 'SAM',
  'dominican republic': 'SAM',
  haiti: 'SAM',
  jamaica: 'SAM',
  'puerto rico': 'SAM',
  trinidad: 'SAM',
  'trinidad and tobago': 'SAM',
  barbados: 'SAM',
  'cayman islands': 'SAM',
  // ---- 南美洲 ----
  argentina: 'SAM',
  bolivia: 'SAM',
  brazil: 'SAM',
  chile: 'SAM',
  colombia: 'SAM',
  columbia: 'SAM', // 常见拼写别名
  ecuador: 'SAM',
  'french guiana': 'SAM',
  guyana: 'SAM',
  paraguay: 'SAM',
  peru: 'SAM',
  suriname: 'SAM',
  uruguay: 'SAM',
  venezuela: 'SAM',
}

/** 按国家名获取销售区域；未匹配返回 null */
export function getRegionByCountry(country: string): Region | null {
  const key = normalizeCountry(country)
  if (!key) return null
  return COUNTRY_REGION[key] ?? null
}

// ---- 国家地图视野兜底表（该国客户均无坐标时用于地图定位） ----
// key 为标准化国家名（小写）；center 为 [纬度, 经度]
export const COUNTRY_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  // APAC
  mongolia: { center: [46.8, 103.8], zoom: 5 },
  australia: { center: [-25.3, 133.8], zoom: 4 },
  'papua new guinea': { center: [-6.5, 145.0], zoom: 5 },
  png: { center: [-6.5, 145.0], zoom: 5 },
  indonesia: { center: [-2.5, 118.0], zoom: 4 },
  philippines: { center: [12.9, 121.8], zoom: 5 },
  vietnam: { center: [16.0, 107.8], zoom: 5 },
  'viet nam': { center: [16.0, 107.8], zoom: 5 },
  thailand: { center: [15.1, 101.0], zoom: 5 },
  myanmar: { center: [21.2, 96.5], zoom: 5 },
  burma: { center: [21.2, 96.5], zoom: 5 },
  laos: { center: [18.5, 103.9], zoom: 5 },
  malaysia: { center: [4.2, 109.5], zoom: 5 },
  'new zealand': { center: [-41.8, 172.8], zoom: 5 },
  // CIS
  china: { center: [35.5, 105.0], zoom: 4 },
  kazakhstan: { center: [48.0, 68.0], zoom: 4 },
  uzbekistan: { center: [41.4, 64.6], zoom: 5 },
  turkmenistan: { center: [39.0, 59.4], zoom: 5 },
  kyrgyzstan: { center: [41.5, 74.6], zoom: 6 },
  tajikistan: { center: [38.9, 71.3], zoom: 6 },
  russia: { center: [61.5, 90.0], zoom: 3 },
  belarus: { center: [53.7, 27.9], zoom: 6 },
  ukraine: { center: [49.0, 32.0], zoom: 6 },
  // EUR
  serbia: { center: [44.2, 20.9], zoom: 7 },
  greece: { center: [39.3, 22.5], zoom: 6 },
  turkey: { center: [39.0, 35.2], zoom: 5 },
  'united kingdom': { center: [54.0, -2.5], zoom: 6 },
  uk: { center: [54.0, -2.5], zoom: 6 },
  germany: { center: [51.1, 10.4], zoom: 6 },
  france: { center: [46.6, 2.4], zoom: 6 },
  spain: { center: [40.2, -3.7], zoom: 6 },
  italy: { center: [42.8, 12.6], zoom: 6 },
  poland: { center: [52.1, 19.4], zoom: 6 },
  finland: { center: [64.5, 26.0], zoom: 5 },
  sweden: { center: [62.8, 16.7], zoom: 5 },
  norway: { center: [64.6, 12.5], zoom: 5 },
  bulgaria: { center: [42.7, 25.5], zoom: 7 },
  romania: { center: [45.8, 25.0], zoom: 7 },
  // AFR
  algeria: { center: [28.2, 2.6], zoom: 5 },
  egypt: { center: [26.8, 30.8], zoom: 5 },
  morocco: { center: [31.9, -6.9], zoom: 5 },
  ghana: { center: [7.9, -1.0], zoom: 7 },
  "côte d'ivoire": { center: [7.5, -5.5], zoom: 7 },
  "cote d'ivoire": { center: [7.5, -5.5], zoom: 7 },
  'ivory coast': { center: [7.5, -5.5], zoom: 7 },
  mali: { center: [17.6, -4.0], zoom: 5 },
  senegal: { center: [14.5, -14.5], zoom: 6 },
  guinea: { center: [10.4, -11.0], zoom: 6 },
  'dr congo': { center: [-2.9, 23.6], zoom: 5 },
  'drc': { center: [-2.9, 23.6], zoom: 5 },
  'congo kinshasa': { center: [-2.9, 23.6], zoom: 5 },
  'democratic republic of the congo': { center: [-2.9, 23.6], zoom: 5 },
  zambia: { center: [-13.5, 27.8], zoom: 6 },
  tanzania: { center: [-6.4, 34.9], zoom: 5 },
  kenya: { center: [0.2, 37.9], zoom: 6 },
  ethiopia: { center: [9.1, 40.5], zoom: 5 },
  namibia: { center: [-22.1, 17.2], zoom: 5 },
  'south africa': { center: [-29.0, 25.0], zoom: 5 },
  zimbabwe: { center: [-19.0, 29.9], zoom: 6 },
  botswana: { center: [-22.3, 24.7], zoom: 6 },
  mozambique: { center: [-18.7, 35.5], zoom: 5 },
  angola: { center: [-11.2, 17.9], zoom: 5 },
  madagascar: { center: [-18.8, 46.9], zoom: 5 },
  // SAM
  peru: { center: [-9.2, -75.0], zoom: 5 },
  chile: { center: [-35.7, -71.5], zoom: 4 },
  brazil: { center: [-10.8, -52.9], zoom: 4 },
  argentina: { center: [-38.4, -63.6], zoom: 4 },
  colombia: { center: [4.1, -73.1], zoom: 5 },
  columbia: { center: [4.1, -73.1], zoom: 5 },
  ecuador: { center: [-1.4, -78.4], zoom: 7 },
  bolivia: { center: [-16.3, -63.6], zoom: 5 },
  venezuela: { center: [6.4, -66.6], zoom: 5 },
  suriname: { center: [4.1, -55.9], zoom: 7 },
  guyana: { center: [4.8, -58.9], zoom: 7 },
  mexico: { center: [23.6, -102.5], zoom: 5 },
  'dominican republic': { center: [18.7, -70.2], zoom: 8 },
}

/** 获取国家的地图视野兜底配置；未匹配返回 null */
export function getCountryView(country: string): { center: [number, number]; zoom: number } | null {
  const key = normalizeCountry(country)
  if (!key) return null
  return COUNTRY_VIEWS[key] ?? null
}

// ---- 国家粗略包围盒 [minLat, maxLat, minLng, maxLng] ----
// 用于导入/录入时检测"经纬度互换"：若坐标落在国家包围盒外、而互换后落在盒内，则自动纠正。
// 数值为近似范围（粗粒度即可满足判定），未能识别的国家不做纠正。
export const COUNTRY_BBOX: Record<string, [number, number, number, number]> = {
  // APAC
  mongolia: [41.4, 52.2, 87.4, 119.9],
  australia: [-43.7, -10.0, 112.9, 153.7],
  'papua new guinea': [-11.5, -0.5, 140.5, 155.5],
  png: [-11.5, -0.5, 140.5, 155.5],
  'new zealand': [-47.3, -34.0, 166.0, 178.5],
  'new caledonia': [-23.0, -18.8, 163.0, 168.0],
  fiji: [-19.6, -12.1, 176.8, 180.0],
  'solomon islands': [-11.9, -5.2, 155.5, 162.5],
  vanuatu: [-20.3, -12.1, 166.2, 170.3],
  vietnam: [8.4, 23.4, 102.1, 109.7],
  'viet nam': [8.4, 23.4, 102.1, 109.7],
  laos: [13.9, 22.6, 99.9, 107.7],
  'lao pdr': [13.9, 22.6, 99.9, 107.7],
  cambodia: [10.3, 14.7, 102.3, 107.7],
  thailand: [5.6, 20.5, 97.3, 105.7],
  myanmar: [9.5, 28.6, 92.1, 101.2],
  burma: [9.5, 28.6, 92.1, 101.2],
  malaysia: [0.7, 7.5, 99.5, 119.5],
  singapore: [1.1, 1.5, 103.6, 104.1],
  indonesia: [-11.2, 6.2, 94.9, 141.5],
  philippines: [4.3, 21.2, 116.7, 126.8],
  brunei: [4.0, 5.1, 114.0, 115.4],
  'brunei darussalam': [4.0, 5.1, 114.0, 115.4],
  'timor-leste': [-9.6, -8.0, 124.0, 127.5],
  'east timor': [-9.6, -8.0, 124.0, 127.5],
  // CIS
  china: [17.5, 53.6, 73.5, 135.1],
  'hong kong': [22.1, 22.6, 113.8, 114.5],
  'hong kong sar': [22.1, 22.6, 113.8, 114.5],
  taiwan: [21.8, 25.4, 119.9, 122.1],
  kazakhstan: [40.4, 55.5, 46.4, 87.4],
  uzbekistan: [37.1, 45.7, 55.9, 73.2],
  turkmenistan: [35.1, 42.8, 52.3, 66.7],
  kyrgyzstan: [39.1, 43.3, 69.2, 80.3],
  'kyrgyz republic': [39.1, 43.3, 69.2, 80.3],
  tajikistan: [36.7, 41.1, 67.3, 75.2],
  russia: [41.1, 82.1, 19.6, 180.0],
  'russian federation': [41.1, 82.1, 19.6, 180.0],
  belarus: [51.3, 56.2, 23.2, 32.8],
  ukraine: [44.3, 52.4, 22.1, 40.2],
  moldova: [45.4, 48.5, 26.6, 30.2],
  'republic of moldova': [45.4, 48.5, 26.6, 30.2],
  georgia: [40.9, 43.6, 39.9, 46.7],
  armenia: [38.7, 41.3, 43.4, 46.6],
  azerbaijan: [38.3, 41.9, 44.7, 50.8],
  // EUR
  serbia: [41.8, 46.2, 18.8, 23.0],
  greece: [34.8, 41.8, 19.3, 28.3],
  bulgaria: [40.9, 44.2, 22.3, 28.7],
  romania: [43.6, 48.3, 20.2, 30.0],
  slovenia: [45.4, 46.9, 13.3, 16.6],
  croatia: [42.3, 46.6, 13.4, 19.5],
  'bosnia and herzegovina': [42.5, 45.3, 15.7, 19.7],
  bosnia: [42.5, 45.3, 15.7, 19.7],
  montenegro: [41.8, 43.6, 18.4, 20.9],
  'north macedonia': [40.9, 42.9, 20.5, 23.1],
  macedonia: [40.9, 42.9, 20.5, 23.1],
  albania: [39.6, 42.7, 19.2, 21.1],
  kosovo: [41.9, 43.3, 20.0, 21.8],
  'united kingdom': [49.9, 60.9, -8.6, 1.8],
  uk: [49.9, 60.9, -8.6, 1.8],
  'great britain': [49.9, 60.9, -8.6, 1.8],
  england: [49.9, 55.0, -6.4, 1.8],
  scotland: [54.6, 60.9, -8.6, -0.7],
  wales: [51.3, 53.5, -5.5, -2.6],
  'northern ireland': [54.0, 55.4, -8.2, -5.3],
  ireland: [51.3, 55.4, -10.8, -5.9],
  'republic of ireland': [51.3, 55.4, -10.8, -5.9],
  france: [41.3, 51.3, -5.3, 9.7],
  germany: [47.2, 55.1, 5.8, 15.1],
  netherlands: [50.7, 53.6, 3.3, 7.3],
  'the netherlands': [50.7, 53.6, 3.3, 7.3],
  holland: [50.7, 53.6, 3.3, 7.3],
  belgium: [49.4, 51.6, 2.4, 6.5],
  luxembourg: [49.4, 50.2, 5.7, 6.6],
  switzerland: [45.7, 47.9, 5.9, 10.6],
  liechtenstein: [47.0, 47.3, 9.4, 9.7],
  austria: [46.3, 49.1, 9.5, 17.2],
  monaco: [43.7, 43.8, 7.3, 7.5],
  andorra: [42.3, 42.8, 1.3, 1.9],
  denmark: [54.5, 57.8, 8.0, 12.9],
  norway: [57.9, 71.4, 4.4, 31.3],
  sweden: [55.1, 69.1, 10.9, 24.2],
  finland: [59.7, 70.1, 20.5, 31.6],
  iceland: [63.2, 67.3, -24.6, -13.4],
  'faroe islands': [61.3, 62.5, -7.7, -6.1],
  italy: [36.6, 47.1, 6.6, 18.6],
  spain: [35.9, 43.9, -9.4, 4.5],
  portugal: [36.9, 42.2, -9.6, -6.1],
  malta: [35.8, 36.1, 14.1, 14.6],
  gibraltar: [36.1, 36.2, -5.4, -5.3],
  'san marino': [43.9, 44.0, 12.4, 12.5],
  poland: [49.0, 55.0, 13.9, 24.2],
  'czech republic': [48.5, 51.1, 12.0, 18.9],
  czechia: [48.5, 51.1, 12.0, 18.9],
  slovakia: [47.7, 49.6, 16.8, 22.6],
  hungary: [45.7, 48.6, 16.1, 22.9],
  estonia: [57.5, 59.7, 21.8, 28.2],
  latvia: [55.7, 58.1, 20.9, 28.3],
  lithuania: [53.9, 56.5, 20.9, 26.9],
  turkey: [35.8, 42.4, 25.6, 45.0],
  'türkiye': [35.8, 42.4, 25.6, 45.0],
  turkiye: [35.8, 42.4, 25.6, 45.0],
  cyprus: [34.5, 35.8, 32.2, 34.7],
  greenland: [59.8, 83.6, -73.0, -11.8],
  // AFR
  algeria: [18.9, 37.2, -8.7, 12.0],
  egypt: [21.7, 31.7, 24.7, 37.1],
  libya: [19.5, 33.2, 9.3, 25.2],
  morocco: [27.6, 35.9, -13.2, -0.9],
  tunisia: [30.2, 37.6, 7.5, 11.6],
  sudan: [8.7, 22.2, 21.8, 38.8],
  'south sudan': [3.2, 12.2, 24.1, 36.0],
  'western sahara': [20.8, 28.0, -17.1, -8.7],
  benin: [6.1, 12.4, 0.7, 3.9],
  'burkina faso': [9.3, 15.1, -5.5, 2.3],
  'cape verde': [14.7, 17.2, -25.4, -22.6],
  'cabo verde': [14.7, 17.2, -25.4, -22.6],
  "côte d'ivoire": [4.3, 10.8, -8.6, -2.5],
  "cote d'ivoire": [4.3, 10.8, -8.6, -2.5],
  "cote divoire": [4.3, 10.8, -8.6, -2.5],
  'ivory coast': [4.3, 10.8, -8.6, -2.5],
  gambia: [13.0, 13.9, -16.8, -13.8],
  ghana: [4.5, 11.2, -3.3, 1.3],
  guinea: [7.2, 12.7, -15.0, -7.6],
  'guinea-bissau': [10.6, 12.7, -17.5, -13.6],
  liberia: [4.3, 8.6, -11.6, -7.4],
  mali: [10.1, 25.1, -12.3, 4.3],
  mauritania: [14.7, 27.4, -17.1, -4.8],
  niger: [11.7, 23.6, 0.1, 16.0],
  nigeria: [4.2, 13.9, 2.6, 14.8],
  senegal: [12.2, 16.7, -17.6, -11.3],
  'sierra leone': [6.7, 10.1, -13.3, -10.2],
  togo: [5.9, 11.2, -0.2, 1.8],
  'saint helena': [-16.2, -7.8, -14.5, -5.6],
  burundi: [-4.5, -2.2, 28.9, 30.9],
  cameroon: [1.6, 13.1, 8.4, 16.2],
  'central african republic': [2.2, 11.1, 14.4, 27.5],
  chad: [7.4, 23.6, 13.5, 24.1],
  'congo republic': [-5.0, 3.7, 11.8, 18.7],
  'republic of the congo': [-5.0, 3.7, 11.8, 18.7],
  'congo-brazzaville': [-5.0, 3.7, 11.8, 18.7],
  'congo kinshasa': [-13.5, 5.4, 12.0, 31.4],
  'dr congo': [-13.5, 5.4, 12.0, 31.4],
  'drc': [-13.5, 5.4, 12.0, 31.4],
  'democratic republic of the congo': [-13.5, 5.4, 12.0, 31.4],
  'democratic republic of congo': [-13.5, 5.4, 12.0, 31.4],
  'd r congo': [-13.5, 5.4, 12.0, 31.4],
  'equatorial guinea': [-1.7, 4.2, 5.4, 11.4],
  'équatorial guinea': [-1.7, 4.2, 5.4, 11.4],
  gabon: [-4.0, 2.3, 8.6, 14.5],
  'são tomé and príncipe': [-0.1, 0.5, 6.2, 7.5],
  'sao tome and principe': [-0.1, 0.5, 6.2, 7.5],
  'sao tome': [-0.1, 0.5, 6.2, 7.5],
  comoros: [-12.5, -11.2, 43.1, 43.9],
  djibouti: [10.9, 12.8, 41.7, 43.5],
  eritrea: [12.3, 18.1, 36.3, 43.2],
  ethiopia: [3.3, 14.9, 32.9, 48.0],
  kenya: [-4.7, 5.5, 33.9, 42.0],
  madagascar: [-25.7, -11.9, 43.1, 50.6],
  malawi: [-17.2, -9.3, 32.6, 36.0],
  mauritius: [-20.7, -19.9, 57.2, 57.8],
  mayotte: [-13.1, -12.5, 44.9, 45.4],
  mozambique: [-26.9, -10.3, 30.2, 41.0],
  réunion: [-21.5, -20.7, 55.2, 55.9],
  reunion: [-21.5, -20.7, 55.2, 55.9],
  rwanda: [-2.9, -1.0, 28.8, 30.9],
  seychelles: [-10.5, -3.4, 46.2, 56.5],
  somalia: [-1.7, 12.0, 40.9, 51.4],
  somaliland: [8.0, 11.5, 42.7, 49.0],
  tanzania: [-11.8, -0.9, 29.3, 40.5],
  uganda: [-1.5, 4.3, 29.5, 35.1],
  zambia: [-18.1, -8.2, 21.9, 33.7],
  zimbabwe: [-22.4, -15.6, 25.2, 33.1],
  botswana: [-26.9, -17.8, 19.9, 29.5],
  eswatini: [-27.3, -25.7, 30.8, 32.2],
  swaziland: [-27.3, -25.7, 30.8, 32.2],
  lesotho: [-30.7, -28.5, 27.0, 29.5],
  namibia: [-28.9, -16.9, 11.5, 25.3],
  'south africa': [-35.0, -22.1, 16.4, 32.9],
  angola: [-18.1, -4.3, 11.6, 24.1],
  // SAM
  mexico: [14.5, 32.7, -118.4, -86.7],
  belize: [15.8, 18.5, -89.2, -88.0],
  'costa rica': [7.9, 11.2, -86.0, -82.5],
  'el salvador': [13.1, 14.5, -90.2, -87.7],
  guatemala: [13.7, 17.8, -92.3, -88.2],
  honduras: [12.9, 16.5, -89.4, -83.1],
  nicaragua: [10.7, 15.0, -87.7, -82.6],
  panama: [7.2, 9.6, -83.1, -77.1],
  cuba: [19.8, 23.3, -85.0, -74.1],
  'dominican republic': [17.5, 20.1, -74.5, -68.3],
  haiti: [18.0, 20.1, -74.5, -71.6],
  jamaica: [16.2, 18.6, -78.4, -76.2],
  'puerto rico': [17.8, 18.6, -67.9, -65.2],
  trinidad: [9.9, 11.6, -62.0, -60.4],
  'trinidad and tobago': [9.9, 11.6, -62.0, -60.4],
  barbados: [13.0, 13.4, -59.7, -59.2],
  'cayman islands': [19.2, 19.8, -81.4, -79.7],
  argentina: [-55.1, -21.8, -73.6, -53.6],
  bolivia: [-23.0, -9.4, -69.6, -57.4],
  brazil: [-33.9, 5.3, -74.0, -32.4],
  chile: [-56.0, -17.4, -81.5, -66.3],
  colombia: [-4.3, 12.6, -82.1, -66.8],
  columbia: [-4.3, 12.6, -82.1, -66.8],
  ecuador: [-5.1, 1.5, -81.1, -75.2],
  'french guiana': [2.1, 6.0, -54.6, -51.6],
  guyana: [0.9, 8.6, -61.4, -56.4],
  paraguay: [-27.6, -19.3, -62.6, -54.2],
  peru: [-18.4, 0.0, -81.4, -68.6],
  suriname: [1.8, 6.1, -58.2, -53.8],
  uruguay: [-35.0, -30.1, -58.2, -53.2],
  venezuela: [0.7, 12.8, -73.4, -59.8],
}

/** 获取国家近似包围盒；未匹配返回 null */
export function getCountryBbox(country: string): [number, number, number, number] | null {
  const key = normalizeCountry(country)
  if (!key) return null
  return COUNTRY_BBOX[key] ?? null
}

/**
 * 经纬度规范化：检测并自动纠正"经纬度互换"的数据错误。
 * 判定规则（保守，仅在明确时纠正）：
 *   1) 纬度超出 ±90 或经度超出 ±180，而互换后在合法范围内 → 互换；
 *   2) 坐标落在该国包围盒之外，而互换后落在盒内 → 互换；
 *   其余情况原样保留。
 */
export function normalizeLatLng(
  lat: number | null,
  lng: number | null,
  country: string
): { latitude: number | null; longitude: number | null; swapped: boolean } {
  if (lat === null || lng === null) return { latitude: lat, longitude: lng, swapped: false }
  const valid = (la: number, lo: number) => Math.abs(la) <= 90 && Math.abs(lo) <= 180
  // 规则 1：数值越界
  if (!valid(lat, lng)) {
    if (valid(lng, lat)) return { latitude: lng, longitude: lat, swapped: true }
    return { latitude: lat, longitude: lng, swapped: false }
  }
  // 规则 2：国家包围盒判定
  const bbox = getCountryBbox(country)
  if (bbox) {
    const inBox = (la: number, lo: number) =>
      la >= bbox[0] && la <= bbox[1] && lo >= bbox[2] && lo <= bbox[3]
    if (!inBox(lat, lng) && inBox(lng, lat)) {
      return { latitude: lng, longitude: lat, swapped: true }
    }
  }
  return { latitude: lat, longitude: lng, swapped: false }
}

/** 磨机直径分档（用于筛选与图表） */
export const DIAMETER_BUCKETS = [
  { id: 'small', label: '≤ 22 ft', min: 0, max: 22 },
  { id: 'mid', label: '23–28 ft', min: 23, max: 28 },
  { id: 'large', label: '29–32 ft', min: 29, max: 32 },
  { id: 'xlarge', label: '33–36 ft', min: 33, max: 36 },
  { id: 'giant', label: '≥ 38 ft', min: 38, max: 999 },
] as const

export function diameterBucket(ft: number | null | undefined): string {
  if (ft === null || ft === undefined) return '未知'
  if (ft <= 22) return '≤ 22 ft'
  if (ft <= 28) return '23–28 ft'
  if (ft <= 32) return '29–32 ft'
  if (ft <= 36) return '33–36 ft'
  return '≥ 38 ft'
}
