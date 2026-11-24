'use client'

// ============================================================
// 双语界面（English / 中文）i18n 模块
// - LangProvider：语言上下文，localStorage 持久化（key: mill-lang）
// - useI18n()：返回 { lang, setLang, t, regionLabel, regionShort, statusLabel }
// - translateServerError()：将 API 返回的中文错误消息转为当前语言
// ============================================================

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react'

export type Lang = 'en' | 'zh'

const en = {
  // ---- 导航 / 页面框架 ----
  'nav.title': 'Mill Liners Customer Overview',
  'nav.subtitle': 'Sales intelligence for grinding mill customers · APAC / CIS / EUR / AFR / SAM',
  'nav.loading': 'Loading…',
  'nav.stats': '{c} customers · {m} mills',
  'nav.refresh': 'Refresh data',
  'tab.dashboard': 'Dashboard',
  'tab.map': 'Map',
  'tab.analytics': 'Analytics',
  'tab.manage': 'Manage',
  'footer.source': 'Data source: "Mill Liners Current and Potential Sales" workbook · Nov 2025 sales demo',
  'footer.regions':
    'Regions: APAC (Mongolia / SE Asia / Australia / PNG) · CIS (China / 5 Stan countries / Russia & other ex-Soviet states) · EUR (Europe incl. Serbia & Greece) · AFR (all African countries) · SAM (Central & South America)',
  'lang.toggle': 'Switch language',

  // ---- 主题 ----
  'theme.toLight': 'Switch to light mode',
  'theme.toDark': 'Switch to dark mode',
  'theme.toggle': 'Toggle theme',

  // ---- 区域 ----
  'region.APAC': 'APAC Asia-Pacific',
  'region.CIS': 'CIS China & CIS',
  'region.EUR': 'EUR Europe',
  'region.AFR': 'AFR Africa',
  'region.SAM': 'SAM South America',
  'region.OTHER': 'Unassigned',
  'region.APAC.short': 'APAC',
  'region.CIS.short': 'CIS',
  'region.EUR.short': 'EUR',
  'region.AFR.short': 'AFR',
  'region.SAM.short': 'SAM',
  'region.OTHER.short': 'Other',

  // ---- 客户状态 ----
  'status.existing': 'Existing Customer',
  'status.current': 'Current Customer', // 兼容旧数据展示
  'status.potential': 'Potential Customer',

  // ---- 通用 ----
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.delete': 'Delete',
  'common.saveFailed': 'Save failed',
  'common.unknown': 'Unknown',
  'common.notSet': 'Not set',

  // ---- 筛选（多个页面共用）----
  'filter.region': 'Region',
  'filter.allRegions': 'All regions',
  'filter.global': 'Global',
  'filter.country': 'Country',
  'filter.allCountries': 'All countries',
  'filter.owner': 'Owner (Company)',
  'filter.allOwners': 'All owners',
  'filter.millType': 'Mill type',
  'filter.allMillTypes': 'All types',
  'filter.millSize': 'Mill size',
  'filter.allMillSizes': 'All sizes',
  'filter.unknownSize': 'Unknown size',
  'filter.supplier': 'Supplier',
  'filter.allSuppliers': 'All suppliers',
  'filter.status': 'Status',
  'filter.allStatuses': 'All statuses',
  'filter.searchOwnerSite': 'Search owner / site',
  'filter.searchOwnerSiteCountry': 'Search owner / site / country',

  // ---- 数据总览 ----
  'dash.customers': 'Customers (Mines)',
  'dash.currentPotential': '{c} current · {p} potential',
  'dash.mills': 'Mills',
  'dash.countries': 'Countries',
  'dash.nRegions': '{n} sales regions',
  'dash.annualTotal': 'Total annual potential',
  'dash.annualTip': 'Annual potential value: {v}',
  'dash.setTip': 'Total liner set value: {v}',
  'dash.setShort': 'Set value {v}',
  'dash.reset': 'Reset filters',
  'dash.filtered': 'Filtered: {c} customers / {m} mills',
  'dash.showAll': 'Showing all data',
  'dash.exportExcel': 'Export Excel',
  'dash.byCustomer': 'By customer',
  'dash.byMill': 'By mill',
  'dash.expandHint': 'Click a row to expand its mills',
  'dash.col.ownerSite': 'Owner / Site',
  'dash.col.country': 'Country',
  'dash.col.region': 'Region',
  'dash.col.mills': 'Mills',
  'dash.col.millTypes': 'Mill types',
  'dash.col.annual': 'Annual potential',
  'dash.col.status': 'Status',
  'dash.col.map': 'Map',
  'dash.col.equipment': 'Equipment',
  'dash.col.diameter': 'Diameter',
  'dash.col.length': 'Length',
  'dash.col.type': 'Type',
  'dash.col.supplier': 'Supplier',
  'dash.col.setPrice': 'Set price',
  'dash.totalCustomers': 'Total ({n} customers)',
  'dash.totalMills': 'Total ({n} mills)',
  'dash.noData': 'No data matches the filters. Try adjusting them.',
  'dash.viewOnMap': 'View on map',
  'dash.setUnit': 'Set {v}',

  // ---- 地图 ----
  'map.loading': 'Loading map…',
  'map.countrySelect': 'Country',
  'map.allCountriesInRegion': 'All countries',
  'map.noCountries': 'No data in this region',
  'map.countryN': '{n} customers',
  'map.zoomedToCountry': 'Zoomed to {c}',
  'map.clearCountry': 'Clear country filter',
  'map.legendTitle': 'Sales regions',
  'map.legendHint': 'Dot size = annual potential value',
  'map.missingCoords': '{n} customers missing coordinates are not shown on the map',
  'map.distribution': 'Customer distribution ({n})',
  'map.millsN': '{n} mills',
  'map.annualN': 'Annual potential {v}',
  'map.noMatch': 'No customers match the filters',
  'map.millCountShort': '{n} mills',
  'map.popup.millCount': 'Mills',
  'map.popup.nUnits': '{n}',
  'map.popup.annualValue': 'Annual potential',

  // ---- 可视化分析 ----
  'an.topOwners': 'Top 10 Owners by Annual Potential',
  'an.byCountry': 'Annual Value by Country',
  'an.onlyPriced': 'Only countries with entered sales values are shown',
  'an.millsByCountry': 'Mill Count by Country',
  'an.millTypeMix': 'Mill Type Mix (by value)',
  'an.supplierShare': 'Liner Supplier Share (by value)',
  'an.diameterDist': 'Mill Diameter Distribution (by count)',
  'an.scatterTitle': 'Diameter vs. Liner Set Price',
  'an.scatterX': 'Mill diameter (ft)',
  'an.scatterY': 'Liner set price',
  'an.diameter': 'Diameter',
  'an.setPrice': 'Set price',
  'an.supplierUnknown': 'Supplier unknown',
  'an.popupDiameter': 'Diameter {d} ft · Set price {v}',
  'an.annualValue': 'Annual value',
  'an.scatterHint': 'Bubble size = annual potential; only mills with price data are shown',
  'an.annualName': 'Annual potential',
  'an.millCountName': 'Mill count',
  'an.valueSuffix': '{name} value',
  'an.countUnits': '{n} mills',

  // ---- 客户管理 ----
  'mg.customerDeleted': 'Customer deleted',
  'mg.millDeleted': 'Mill deleted',
  'mg.deleteFailed': 'Delete failed',
  'mg.pickFile': 'Please select an Excel file',
  'mg.importDone': 'Import complete',
  'mg.importFailed': 'Import failed',
  'mg.addCustomer': 'Add customer',
  'mg.importExcel': 'Import Excel',
  'mg.exportAll': 'Export all data',
  'mg.col.ownerSite': 'Owner / Site',
  'mg.col.countryRegion': 'Country / Region',
  'mg.col.mills': 'Mills',
  'mg.col.annual': 'Annual potential',
  'mg.col.coords': 'Coordinates',
  'mg.col.actions': 'Actions',
  'mg.editCustomer': 'Edit customer',
  'mg.deleteCustomer': 'Delete customer',
  'mg.millDetails': 'Mill details ({n})',
  'mg.notesLabel': 'Notes: {n}',
  'mg.addMill': 'Add mill',
  'mg.noMills': 'No mills yet — click "Add mill" to add one in the Excel format',
  'mg.col.setPrice': 'Set price',
  'mg.col.annualValue': 'Annual value',
  'mg.editMill': 'Edit mill',
  'mg.deleteMill': 'Delete mill',
  'mg.noMatch': 'No matching customers',
  'mg.confirmDelete': 'Confirm deletion?',
  'mg.deleteCustomerMsg':
    'This will delete customer {owner} · {site} and all {n} of its mills. This cannot be undone.',
  'mg.deleteMillMsg': 'This will delete mill {equipment}{num}. This cannot be undone.',
  'mg.importTitle': 'Excel bulk import',
  'mg.importDesc':
    'Supports the Data Entry sheet of the "Mill Liners Current and Potential Sales" workbook (header row auto-detected; Latitude / Longitude columns are synced).',
  'mg.importAppend': 'Append',
  'mg.importAppendDesc':
    'Keep existing data and import new rows (exact duplicate mill rows are skipped; regions auto-assigned by country)',
  'mg.importReplace': 'Replace all',
  'mg.importReplaceDesc': 'Clear all customers and mills, then import (for a full refresh)',
  'mg.importResult': 'Import result (sheet: {s})',
  'mg.importRows': '{n} mill rows parsed',
  'mg.importCustomers': '{c} customers created · {u} existing linked',
  'mg.importMills': '{c} mills created · {s} duplicates skipped',
  'mg.importRegions': 'Regions corrected by country for {n} customers',
  'mg.importCoords': 'Auto-corrected swapped latitude/longitude on {n} rows',
  'mg.importing': 'Importing…',
  'mg.startImport': 'Start import',

  // ---- 客户对话框 ----
  'cd.ownerRequired': 'Owner (company name) is required',
  'cd.countryRequired': 'Country is required',
  'cd.latRange': 'Latitude must be between -90 and 90',
  'cd.lngRange': 'Longitude must be between -180 and 180',
  'cd.updated': 'Customer updated',
  'cd.created': 'Customer added: {owner}{site}',
  'cd.editTitle': 'Edit customer',
  'cd.addTitle': 'Add customer (mine)',
  'cd.desc': 'Fields match the Excel "Data Entry" sheet; region is auto-assigned by country and can be overridden.',
  'cd.ownerLabel': 'Owner (Company) *',
  'cd.ownerPh': 'e.g. Zijin Mining',
  'cd.siteLabel': 'Mine / Project (Site)',
  'cd.sitePh': 'e.g. Zijinshan',
  'cd.countryLabel': 'Country *',
  'cd.countryPh': 'e.g. China',
  'cd.autoRegionNote': 'Auto-assigned to {r} by country',
  'cd.regionLabel': 'Sales region',
  'cd.autoAssign': 'Auto-assign',
  'cd.autoByCountry': 'Auto (by country)',
  'cd.statusLabel': 'Customer status',
  'cd.currentOption': 'Existing Customer',
  'cd.potentialOption': 'Potential Customer',
  'cd.reviewedLabel': 'Reviewed',
  'cd.latLabel': 'Latitude',
  'cd.lngLabel': 'Longitude',
  'cd.notesLabel': 'Notes',
  'cd.notesPh': 'Optional',

  // ---- 磨机对话框 ----
  'md.autoCalcNeed': 'Fill in liner mass / annual consumption and price $/kg first',
  'md.autoCalcDone': 'Auto-calculated as unit price × quantity',
  'md.typeRequired': 'Mill type is required',
  'md.badNumber': 'Invalid number format',
  'md.updated': 'Mill updated',
  'md.created': 'Mill added',
  'md.editTitle': 'Edit mill',
  'md.addTitle': 'Add mill',
  'md.customer': 'Customer: {owner}{site} ({country})',
  'md.equipment': 'Equipment description',
  "md.equipmentPh": "e.g. 30' x 16.5' SAG or 10.363 x 5.182 SAG",
  'md.millNumber': 'Mill #',
  'md.millNumberPh': 'e.g. SAG 1',
  'md.diameter': 'Diameter',
  "md.diameterPh": "e.g. 30'",
  'md.length': 'Length',
  "md.lengthPh": "e.g. 16.5'",
  'md.millType': 'Mill type',
  'md.millTypePh': 'SAG / Ball / Vertical',
  'md.linerType': 'Liner type',
  'md.linerTypePh': 'e.g. Complete Set',
  'md.linerSize': 'Liner size',
  'md.linerSizePh': 'e.g. Large',
  'md.material': 'Material',
  'md.materialPh': 'e.g. Chrome-Moly',
  'md.supplier': 'Supplier',
  'md.supplierPh': 'Competitor supplier, e.g. Metso',
  'md.salesSection': 'Sales & pricing data (USD)',
  'md.autoCalc': 'Auto-calculate price',
  'md.massPerSet': 'Set mass (kg)',
  'md.annualConsumption': 'Annual consumption (kg)',
  'md.pricePerKg': 'Price ($/kg)',
  'md.setPrice': 'Set price ($)',
  'md.annualValue': 'Annual value ($)',
  'md.calcRule': 'Rule: set price = set mass × price; annual value = annual consumption × price',

  // ---- 登录 / 访问控制 ----
  'auth.brandHeadline': 'Mill liner sales intelligence for your global customer base',
  'auth.feature1': 'Customer & mill data overview with composite filters and Excel export',
  'auth.feature2': 'Interactive map across 5 sales regions with country drill-down',
  'auth.feature3': 'Analytics dashboards: top owners, value by country, mill mix & more',
  'auth.signInTitle': 'Sign in to continue',
  'auth.signInDesc': 'Enter your account credentials to access the customer overview',
  'auth.username': 'Username',
  'auth.usernamePh': 'e.g. admin',
  'auth.password': 'Password',
  'auth.passwordPh': 'Enter your password',
  'auth.confirmPassword': 'Confirm password',
  'auth.passwordHint': 'At least 6 characters; used to sign in and manage data',
  'auth.signIn': 'Sign in',
  'auth.signingIn': 'Signing in…',
  'auth.welcomeBack': 'Welcome back!',
  'auth.loginFailed': 'Sign-in failed',
  'auth.usernameRequired': 'Please enter a username',
  'auth.passwordRequired': 'Please enter a password',
  'auth.pwMismatch': 'Passwords do not match',
  'auth.setupTitle': 'Welcome! Create your administrator account',
  'auth.setupDesc':
    'This is the first time the app is used. Create the first administrator account — it has full permissions and can manage other users.',
  'auth.setupBtn': 'Create admin account',
  'auth.settingUp': 'Creating…',
  'auth.setupDone': 'Administrator created — welcome!',
  'auth.displayName': 'Display name',
  'auth.displayNamePh': 'e.g. Zhang San',
  'auth.localNote': 'This app runs 100% locally; accounts are stored in the local database.',

  // ---- 用户菜单 ----
  'user.role.admin': 'Administrator',
  'user.role.user': 'Viewer',
  'user.changePassword': 'Change password',
  'user.userManagement': 'User management',
  'user.signOut': 'Sign out',
  'user.signedOut': 'You have signed out',
  'user.you': '(you)',

  // ---- 修改密码 ----
  'cp.title': 'Change password',
  'cp.desc': 'Set a new password for your account',
  'cp.current': 'Current password',
  'cp.new': 'New password (at least 6 characters)',
  'cp.confirm': 'Confirm new password',
  'cp.mismatch': 'New passwords do not match',
  'cp.tooShort': 'Password must be at least 6 characters',
  'cp.wrongCurrent': 'Please enter your current password',
  'cp.changed': 'Password changed',

  // ---- 用户管理 ----
  'um.title': 'User management',
  'um.desc': 'Create accounts and control who can access the app',
  'um.count': '{n} accounts',
  'um.countOne': '1 account',
  'um.empty': 'No users yet — click "Add user" to create one',
  'um.loadFailed': 'Failed to load users',
  'um.addUser': 'Add user',
  'um.addDesc': 'The new user can sign in immediately with the username and password you set',
  'um.newUsernamePh': 'e.g. john',
  'um.pwHint': 'At least 6 characters',
  'um.newPassword': 'New password',
  'um.col.username': 'Username',
  'um.col.displayName': 'Display name',
  'um.col.role': 'Role',
  'um.col.status': 'Status',
  'um.col.lastLogin': 'Last sign-in',
  'um.col.actions': 'Actions',
  'um.editUser': 'Edit user',
  'um.editDesc': 'Updating account: {u}',
  'um.resetPassword': 'Reset password',
  'um.resetDesc': 'Set a new password for account {u}',
  'um.deleteUser': 'Delete user',
  'um.confirmDelete': 'Delete this user?',
  'um.deleteMsg': 'User {u} will be removed and can no longer sign in. This cannot be undone.',
  'um.active': 'Active',
  'um.inactive': 'Disabled',
  'um.userCreated': 'User created: {u}',
  'um.userUpdated': 'User updated',
  'um.userDeleted': 'User deleted: {u}',
  'um.userEnabled': 'Account enabled: {u}',
  'um.userDisabled': 'Account disabled: {u}',
  'um.passwordReset': 'Password has been reset for {u}',
  'um.roleAdmin': 'Administrator — full access incl. data management & user accounts',
  'um.roleUser': 'Viewer — browse dashboards, map & analytics (read-only)',
  'um.cannotSelf': 'You cannot change your own role or status, or delete your own account',
  'um.hint': 'Administrators manage customers / mills and user accounts; viewers can browse and export data.',
} as const

export type I18nKey = keyof typeof en

const zh: Record<I18nKey, string> = {
  // ---- 导航 / 页面框架 ----
  'nav.title': '磨机衬板客户总览',
  'nav.subtitle': 'Mill Liners Customer Overview · APAC / CIS / EUR / AFR / SAM',
  'nav.loading': '加载中…',
  'nav.stats': '{c} 客户 · {m} 磨机',
  'nav.refresh': '刷新数据',
  'tab.dashboard': '数据总览',
  'tab.map': '地图分布',
  'tab.analytics': '可视化分析',
  'tab.manage': '客户管理',
  'footer.source': '数据来源：Mill Liners Current and Potential Sales 工作簿 · 2025-11 销售演示文档',
  'footer.regions':
    '销售区域：APAC（蒙古/东南亚/澳洲/PNG）· CIS（中国/中亚五国/俄罗斯等独联体国家）· EUR（欧洲，含塞尔维亚、希腊）· AFR（非洲所有国家）· SAM（中美与南美）',
  'lang.toggle': '切换语言',

  // ---- 主题 ----
  'theme.toLight': '切换为浅色模式',
  'theme.toDark': '切换为深色模式',
  'theme.toggle': '切换主题',

  // ---- 区域 ----
  'region.APAC': 'APAC 亚太区',
  'region.CIS': 'CIS 中国/独联体区',
  'region.EUR': 'EUR 欧洲区',
  'region.AFR': 'AFR 非洲区',
  'region.SAM': 'SAM 南美区',
  'region.OTHER': '未分配区域',
  'region.APAC.short': 'APAC',
  'region.CIS.short': 'CIS',
  'region.EUR.short': 'EUR',
  'region.AFR.short': 'AFR',
  'region.SAM.short': 'SAM',
  'region.OTHER.short': '其他',

  // ---- 客户状态 ----
  'status.existing': '现有客户',
  'status.current': '现有客户', // 兼容旧数据展示
  'status.potential': '潜在客户',

  // ---- 通用 ----
  'common.save': '保存',
  'common.saving': '保存中…',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.delete': '删除',
  'common.saveFailed': '保存失败',
  'common.unknown': '未知',
  'common.notSet': '未设置',

  // ---- 筛选 ----
  'filter.region': '销售区域',
  'filter.allRegions': '全部区域',
  'filter.global': '全球',
  'filter.country': '国家',
  'filter.allCountries': '全部国家',
  'filter.owner': '公司（业主）',
  'filter.allOwners': '全部公司',
  'filter.millType': '磨机类型',
  'filter.allMillTypes': '全部类型',
  'filter.millSize': '磨机尺寸',
  'filter.allMillSizes': '全部尺寸',
  'filter.unknownSize': '未知尺寸',
  'filter.supplier': '供应商',
  'filter.allSuppliers': '全部供应商',
  'filter.status': '客户状态',
  'filter.allStatuses': '全部状态',
  'filter.searchOwnerSite': '搜索业主/矿山',
  'filter.searchOwnerSiteCountry': '搜索业主 / 矿山 / 国家',

  // ---- 数据总览 ----
  'dash.customers': '客户（矿山）数',
  'dash.currentPotential': '现有 {c} · 潜在 {p}',
  'dash.mills': '磨机数量',
  'dash.countries': '覆盖国家',
  'dash.nRegions': '{n} 个销售区域',
  'dash.annualTotal': '年潜在销售额合计',
  'dash.annualTip': '年潜在销售额：{v}',
  'dash.setTip': '衬板套价合计：{v}',
  'dash.setShort': '套价 {v}',
  'dash.reset': '重置筛选',
  'dash.filtered': '已筛选：{c} 个客户 / {m} 台磨机',
  'dash.showAll': '显示全部数据',
  'dash.exportExcel': '导出 Excel',
  'dash.byCustomer': '按客户汇总',
  'dash.byMill': '按磨机明细',
  'dash.expandHint': '点击行展开该客户的磨机明细',
  'dash.col.ownerSite': '业主 / 矿山',
  'dash.col.country': '国家',
  'dash.col.region': '区域',
  'dash.col.mills': '磨机',
  'dash.col.millTypes': '磨机类型',
  'dash.col.annual': '年潜在销售额',
  'dash.col.status': '状态',
  'dash.col.map': '地图',
  'dash.col.equipment': '设备',
  'dash.col.diameter': '直径',
  'dash.col.length': '长度',
  'dash.col.type': '类型',
  'dash.col.supplier': '供应商',
  'dash.col.setPrice': '衬板套价',
  'dash.totalCustomers': '合计（{n} 个客户）',
  'dash.totalMills': '合计（{n} 台磨机）',
  'dash.noData': '没有符合筛选条件的数据，请调整筛选条件',
  'dash.viewOnMap': '在地图中查看',
  'dash.setUnit': '套价 {v}',

  // ---- 地图 ----
  'map.loading': '地图加载中…',
  'map.countrySelect': '国家',
  'map.allCountriesInRegion': '全部国家',
  'map.noCountries': '该区域暂无数据',
  'map.countryN': '{n} 个客户',
  'map.zoomedToCountry': '已定位至 {c}',
  'map.clearCountry': '清除国家筛选',
  'map.legendTitle': '销售区域',
  'map.legendHint': '圆点大小 = 年潜在销售额',
  'map.missingCoords': '{n} 个客户缺少经纬度，未在地图显示',
  'map.distribution': '客户分布（{n}）',
  'map.millsN': '磨机 {n} 台',
  'map.annualN': '年潜在销售额 {v}',
  'map.noMatch': '没有符合筛选条件的客户',
  'map.millCountShort': '{n} 台',
  'map.popup.millCount': '磨机数量',
  'map.popup.nUnits': '{n} 台',
  'map.popup.annualValue': '年潜在销售额',

  // ---- 可视化分析 ----
  'an.topOwners': '业主年潜在销售额 Top 10',
  'an.byCountry': '国家销售额分布',
  'an.onlyPriced': '仅显示已录入销售金额的国家',
  'an.millsByCountry': '各国磨机数量',
  'an.millTypeMix': '磨机类型构成（按销售额）',
  'an.supplierShare': '衬板供应商份额（按销售额）',
  'an.diameterDist': '磨机直径分布（按台数）',
  'an.scatterTitle': '磨机直径 × 衬板套价分析',
  'an.scatterX': '磨机直径 (ft)',
  'an.scatterY': '衬板套价',
  'an.diameter': '直径',
  'an.setPrice': '套价',
  'an.supplierUnknown': '供应商未知',
  'an.popupDiameter': '直径 {d} ft · 套价 {v}',
  'an.annualValue': '年销售额',
  'an.scatterHint': '气泡大小 = 年潜在销售额；仅显示已有价格数据的磨机',
  'an.annualName': '年潜在销售额',
  'an.millCountName': '磨机数量',
  'an.valueSuffix': '{name} 销售额',
  'an.countUnits': '{n} 台',

  // ---- 客户管理 ----
  'mg.customerDeleted': '客户已删除',
  'mg.millDeleted': '磨机已删除',
  'mg.deleteFailed': '删除失败',
  'mg.pickFile': '请选择 Excel 文件',
  'mg.importDone': '导入完成',
  'mg.importFailed': '导入失败',
  'mg.addCustomer': '新增客户',
  'mg.importExcel': 'Excel 导入',
  'mg.exportAll': '导出全部数据',
  'mg.col.ownerSite': '业主 / 矿山',
  'mg.col.countryRegion': '国家 / 区域',
  'mg.col.mills': '磨机',
  'mg.col.annual': '年潜在销售额',
  'mg.col.coords': '经纬度',
  'mg.col.actions': '操作',
  'mg.editCustomer': '编辑客户',
  'mg.deleteCustomer': '删除客户',
  'mg.millDetails': '磨机明细（{n} 台）',
  'mg.notesLabel': '备注：{n}',
  'mg.addMill': '新增磨机',
  'mg.noMills': '暂无磨机数据，点击"新增磨机"按 Excel 格式添加',
  'mg.col.setPrice': '套价',
  'mg.col.annualValue': '年销售额',
  'mg.editMill': '编辑磨机',
  'mg.deleteMill': '删除磨机',
  'mg.noMatch': '没有匹配的客户',
  'mg.confirmDelete': '确认删除？',
  'mg.deleteCustomerMsg': '将删除客户 {owner} · {site} 及其全部 {n} 台磨机数据，此操作不可恢复。',
  'mg.deleteMillMsg': '将删除磨机 {equipment}{num}，此操作不可恢复。',
  'mg.importTitle': 'Excel 批量导入',
  'mg.importDesc':
    '支持《Mill Liners Current and Potential Sales》工作簿的 Data Entry 表格式（自动识别表头行，含 Latitude / Longitude 列时将同步坐标）。',
  'mg.importAppend': '追加导入',
  'mg.importAppendDesc': '保留现有数据，导入新行（完全重复的磨机行自动跳过，区域按国家自动划分）',
  'mg.importReplace': '替换全部',
  'mg.importReplaceDesc': '清空现有客户与磨机后完整导入（用于全量刷新）',
  'mg.importResult': '导入结果（工作表：{s}）',
  'mg.importRows': '共解析 {n} 行磨机数据',
  'mg.importCustomers': '新增客户 {c} 个 · 关联已有客户 {u} 个',
  'mg.importMills': '新增磨机 {c} 台 · 跳过重复 {s} 台',
  'mg.importRegions': '区域按国家纠正 {n} 个客户',
  'mg.importCoords': '自动纠正 {n} 行经纬度互换的坐标',
  'mg.importing': '导入中…',
  'mg.startImport': '开始导入',

  // ---- 客户对话框 ----
  'cd.ownerRequired': '请填写业主/公司名（Owner）',
  'cd.countryRequired': '请填写国家（Country）',
  'cd.latRange': '纬度范围为 -90 ~ 90',
  'cd.lngRange': '经度范围为 -180 ~ 180',
  'cd.updated': '客户信息已更新',
  'cd.created': '已新增客户：{owner}{site}',
  'cd.editTitle': '编辑客户信息',
  'cd.addTitle': '新增客户（矿山）',
  'cd.desc': '字段与 Excel《Data Entry》表对应；销售区域默认按国家自动划分，可手动指定。',
  'cd.ownerLabel': '业主 / 公司 (Owner) *',
  'cd.ownerPh': '如 Zijin Mining',
  'cd.siteLabel': '矿山 / 项目 (Site)',
  'cd.sitePh': '如 Zijinshan',
  'cd.countryLabel': '国家 (Country) *',
  'cd.countryPh': '如 China',
  'cd.autoRegionNote': '按国家将自动分配至 {r}',
  'cd.regionLabel': '销售区域 (Region)',
  'cd.autoAssign': '自动分配',
  'cd.autoByCountry': '自动分配（按国家）',
  'cd.statusLabel': '客户状态 (Status)',
  'cd.currentOption': '现有客户 (Existing)',
  'cd.potentialOption': '潜在客户 (Potential)',
  'cd.reviewedLabel': '已审核 (Reviewed)',
  'cd.latLabel': '纬度 (Latitude)',
  'cd.lngLabel': '经度 (Longitude)',
  'cd.notesLabel': '备注 (Notes)',
  'cd.notesPh': '可选',

  // ---- 磨机对话框 ----
  'md.autoCalcNeed': '请先填写衬板重量/年消耗量与售价 $/kg',
  'md.autoCalcDone': '已按 单价 × 数量 自动计算',
  'md.typeRequired': '请填写磨机类型',
  'md.badNumber': '数值字段格式有误',
  'md.updated': '磨机信息已更新',
  'md.created': '已新增磨机',
  'md.editTitle': '编辑磨机',
  'md.addTitle': '新增磨机',
  'md.customer': '客户：{owner}{site}（{country}）',
  'md.equipment': '设备描述 (Equipment)',
  "md.equipmentPh": "如 30' x 16.5' SAG 或 10.363 x 5.182 SAG",
  'md.millNumber': '磨机编号 (Mill #)',
  'md.millNumberPh': '如 SAG 1',
  'md.diameter': '直径 (Diameter)',
  "md.diameterPh": "如 30'",
  'md.length': '长度 (Length)',
  "md.lengthPh": "如 16.5'",
  'md.millType': '磨机类型 (Mill Type)',
  'md.millTypePh': 'SAG / Ball / Vertical',
  'md.linerType': '衬板类型 (Liner Type)',
  'md.linerTypePh': '如 Complete Set',
  'md.linerSize': '衬板规格 (Liner Size)',
  'md.linerSizePh': '如 Large',
  'md.material': '材质 (Material)',
  'md.materialPh': '如 Chrome-Moly',
  'md.supplier': '供应商 (Supplier)',
  'md.supplierPh': '竞品供应商，如 Metso',
  'md.salesSection': '销售与价格数据（USD）',
  'md.autoCalc': '自动计算价格',
  'md.massPerSet': '单套重量 (kg)',
  'md.annualConsumption': '年消耗量 (kg)',
  'md.pricePerKg': '售价 ($/kg)',
  'md.setPrice': '单套价格 ($)',
  'md.annualValue': '年销售总额 ($)',
  'md.calcRule': '自动计算规则：单套价格 = 单套重量 × 售价；年销售总额 = 年消耗量 × 售价',

  // ---- 登录 / 访问控制 ----
  'auth.brandHeadline': '面向全球磨机衬板客户的销售情报平台',
  'auth.feature1': '客户与磨机数据总览：复合筛选、Excel 导出',
  'auth.feature2': '五大销售区域交互式地图，支持按国家下钻定位',
  'auth.feature3': '可视化分析：头部业主、国家销售额、磨机类型构成等',
  'auth.signInTitle': '登录以继续',
  'auth.signInDesc': '输入账号和密码，访问客户总览数据',
  'auth.username': '用户名',
  'auth.usernamePh': '如 admin',
  'auth.password': '密码',
  'auth.passwordPh': '请输入密码',
  'auth.confirmPassword': '确认密码',
  'auth.passwordHint': '至少 6 个字符，用于登录与数据管理',
  'auth.signIn': '登录',
  'auth.signingIn': '登录中…',
  'auth.welcomeBack': '欢迎回来！',
  'auth.loginFailed': '登录失败',
  'auth.usernameRequired': '请输入用户名',
  'auth.passwordRequired': '请输入密码',
  'auth.pwMismatch': '两次输入的密码不一致',
  'auth.setupTitle': '欢迎使用！请创建管理员账号',
  'auth.setupDesc': '首次使用本应用。请创建第一个管理员账号，它拥有全部权限，并可管理其他用户。',
  'auth.setupBtn': '创建管理员账号',
  'auth.settingUp': '创建中…',
  'auth.setupDone': '管理员账号已创建，欢迎！',
  'auth.displayName': '显示名称',
  'auth.displayNamePh': '如 张三',
  'auth.localNote': '本应用完全在本地运行，账号保存在本地数据库中。',

  // ---- 用户菜单 ----
  'user.role.admin': '管理员',
  'user.role.user': '浏览用户',
  'user.changePassword': '修改密码',
  'user.userManagement': '用户管理',
  'user.signOut': '退出登录',
  'user.signedOut': '已退出登录',
  'user.you': '（我）',

  // ---- 修改密码 ----
  'cp.title': '修改密码',
  'cp.desc': '为你的账号设置新密码',
  'cp.current': '当前密码',
  'cp.new': '新密码（至少 6 个字符）',
  'cp.confirm': '确认新密码',
  'cp.mismatch': '两次输入的新密码不一致',
  'cp.tooShort': '密码至少需要 6 个字符',
  'cp.wrongCurrent': '请输入当前密码',
  'cp.changed': '密码已修改',

  // ---- 用户管理 ----
  'um.title': '用户管理',
  'um.desc': '创建账号并控制应用的访问权限',
  'um.count': '共 {n} 个账号',
  'um.countOne': '共 1 个账号',
  'um.empty': '暂无用户，点击“新增用户”创建',
  'um.loadFailed': '读取用户列表失败',
  'um.addUser': '新增用户',
  'um.addDesc': '创建后，该用户即可使用你设置的用户名和密码登录',
  'um.newUsernamePh': '如 zhangsan',
  'um.pwHint': '至少 6 个字符',
  'um.newPassword': '新密码',
  'um.col.username': '用户名',
  'um.col.displayName': '显示名称',
  'um.col.role': '角色',
  'um.col.status': '状态',
  'um.col.lastLogin': '最近登录',
  'um.col.actions': '操作',
  'um.editUser': '编辑用户',
  'um.editDesc': '正在更新账号：{u}',
  'um.resetPassword': '重置密码',
  'um.resetDesc': '为账号 {u} 设置新密码',
  'um.deleteUser': '删除用户',
  'um.confirmDelete': '确认删除该用户？',
  'um.deleteMsg': '用户 {u} 将被删除且无法再登录，此操作不可恢复。',
  'um.active': '启用',
  'um.inactive': '已停用',
  'um.userCreated': '已创建用户：{u}',
  'um.userUpdated': '用户信息已更新',
  'um.userDeleted': '已删除用户：{u}',
  'um.userEnabled': '已启用账号：{u}',
  'um.userDisabled': '已停用账号：{u}',
  'um.passwordReset': '已重置 {u} 的密码',
  'um.roleAdmin': '管理员 — 完整权限，含客户数据管理与用户管理',
  'um.roleUser': '浏览用户 — 只读浏览总览、地图与分析数据',
  'um.cannotSelf': '不能修改自己的角色/状态，也不能删除自己的账号',
  'um.hint': '管理员可管理客户/磨机数据与用户账号；浏览用户仅可查看与导出数据。',
}

const dict: Record<Lang, Record<I18nKey, string>> = { en, zh }

// ---- API 中文错误消息 → 英文 对照表 ----
const SERVER_ERRORS_EN: Record<string, string> = {
  '无效的客户 ID': 'Invalid customer ID',
  '客户不存在': 'Customer not found',
  '新增磨机失败': 'Failed to add mill',
  '无效的磨机 ID': 'Invalid mill ID',
  '更新磨机失败': 'Failed to update mill',
  '删除磨机失败': 'Failed to delete mill',
  '请选择 Excel 文件（.xlsx）': 'Please select an Excel file (.xlsx)',
  '未找到包含 Owner / Equipment 表头的数据表（支持 Data Entry 格式）':
    'No sheet with Owner / Equipment headers found (Data Entry format supported)',
  '未找到 Owner 列': 'Owner column not found',
  '表格中没有有效数据行': 'No valid data rows in the sheet',
  '导入失败，请检查文件格式': 'Import failed — please check the file format',
  '读取客户数据失败': 'Failed to load customer data',
  '业主/公司名（Owner）为必填项': 'Owner (company name) is required',
  '国家（Country）为必填项': 'Country is required',
  '新增客户失败': 'Failed to add customer',
  '更新客户失败': 'Failed to update customer',
  '删除客户失败': 'Failed to delete customer',

  // ---- 认证 / 用户管理 ----
  '用户名或密码错误': 'Incorrect username or password',
  '请输入用户名和密码': 'Please enter both username and password',
  '该账号已被停用，请联系管理员': 'This account has been disabled — contact an administrator',
  '登录失败，请重试': 'Sign-in failed — please try again',
  '初始设置已完成，请直接登录': 'Initial setup is already complete — please sign in',
  '初始化失败，请重试': 'Setup failed — please try again',
  '未登录或会话已过期，请重新登录': 'Not signed in or session expired — please sign in again',
  '未登录或会话已过期': 'Not signed in or session expired',
  '需要管理员权限': 'Administrator privileges required',
  '当前密码不正确': 'Current password is incorrect',
  '新密码至少需要 6 个字符': 'New password must be at least 6 characters',
  '密码至少需要 6 个字符': 'Password must be at least 6 characters',
  '密码过长（最多 128 个字符）': 'Password too long (max 128 characters)',
  '用户名需为 2-30 个字符': 'Username must be 2-30 characters',
  '用户名不能包含空格': 'Username cannot contain spaces',
  '用户不存在': 'User not found',
  '无效的用户 ID': 'Invalid user ID',
  '读取用户列表失败': 'Failed to load users',
  '创建用户失败': 'Failed to create user',
  '更新用户失败': 'Failed to update user',
  '删除用户失败': 'Failed to delete user',
  '修改密码失败': 'Failed to change password',
  '不能删除自己的账号': 'You cannot delete your own account',
  '不能修改自己的角色或启用状态': 'You cannot change your own role or status',
  '系统至少需要保留一名可用的管理员': 'At least one active administrator is required',
  '没有需要更新的内容': 'Nothing to update',
}

/** 将 API 返回的错误消息转换为当前语言（英文模式下翻译已知中文错误） */
export function translateServerError(msg: string, lang: Lang): string {
  if (lang !== 'en' || !msg) return msg
  if (SERVER_ERRORS_EN[msg]) return SERVER_ERRORS_EN[msg]
  if (msg.startsWith('客户已存在：')) return 'Customer already exists: ' + msg.slice('客户已存在：'.length)
  if (msg.startsWith('用户名已存在：')) return 'Username already exists: ' + msg.slice('用户名已存在：'.length)
  const sheetMatch = msg.match(/^表 (.+) 中未找到表头行$/)
  if (sheetMatch) return `Header row not found in sheet ${sheetMatch[1]}`
  return msg
}

// ---- Context ----

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
  regionLabel: (region: string) => string
  regionShort: (region: string) => string
  statusLabel: (status: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'mill-lang'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  // 首次挂载：读取 localStorage，无记录则按浏览器语言检测
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') {
      setLangState(saved)
    } else if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
      setLangState('zh')
    }
  }, [])

  // 同步 <html lang>，便于浏览器与读屏器
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>): string => {
      const raw = dict[lang][key] ?? key
      if (!vars) return raw
      return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`
      )
    },
    [lang]
  )

  const regionLabel = useCallback(
    (region: string): string => {
      const key = `region.${region}` as I18nKey
      return dict[lang][key] ?? region
    },
    [lang]
  )

  const regionShort = useCallback(
    (region: string): string => {
      const key = `region.${region}.short` as I18nKey
      return dict[lang][key] ?? region
    },
    [lang]
  )

  const statusLabel = useCallback(
    (status: string): string => {
      const s = String(status ?? '').trim().toLowerCase()
      if (s === 'current customer' || s === 'existing customer') return dict[lang]['status.existing']
      if (s === 'potential customer') return dict[lang]['status.potential']
      return status
    },
    [lang]
  )

  const value = useMemo(
    () => ({ lang, setLang, t, regionLabel, regionShort, statusLabel }),
    [lang, setLang, t, regionLabel, regionShort, statusLabel]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within LangProvider')
  return ctx
}
