// Mock 假数据生成：姓名、手机号、邮箱、地址、身份证、公司、日期等

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢傅钟姜崔谭廖范汪陆金石戴贾韦夏邱方侯邹熊孟秦白江阎薛尹段雷黎史龙陶贺顾毛郝龚邵万钱严覃武戴莫孔向汤'
const GIVEN = '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超秀兰霞平刚桂英文辉力金明健世昌春晓宇浩然子墨梓涵一诺欣怡雨泽嘉懿俊博思远天翊'

const CITIES = [
  ['北京市', '朝阳区', '海淀区', '西城区', '东城区'],
  ['上海市', '浦东新区', '徐汇区', '静安区', '黄浦区'],
  ['广东省', '广州市', '深圳市', '珠海市', '东莞市'],
  ['浙江省', '杭州市', '宁波市', '温州市', '嘉兴市'],
  ['江苏省', '南京市', '苏州市', '无锡市', '常州市'],
  ['四川省', '成都市', '绵阳市', '德阳市', '南充市'],
]
const STREETS = ['中山路', '人民路', '解放路', '建设大道', '滨江路', '科技园路', '兴业路', '和平街']
const COMPANY_PREFIX = ['华为', '腾达', '恒信', '博远', '优创', '天成', '中科', '数联', '云图', '锐驰']
const COMPANY_TYPE = ['科技', '网络', '信息技术', '电子商务', '智能', '数据']
const COMPANY_SUFFIX = ['有限公司', '股份有限公司', '集团有限公司']
const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'qq.com', '163.com', 'hotmail.com', 'foxmail.com']

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function randChar(s: string): string {
  return s.charAt(randInt(0, s.length - 1))
}

export function mockName(): string {
  const len = randInt(1, 2)
  let given = ''
  for (let i = 0; i < len; i++) given += randChar(GIVEN)
  return randChar(SURNAMES) + given
}

export function mockPhone(): string {
  const prefixes = ['138', '139', '150', '151', '158', '159', '186', '188', '135', '136', '137', '176', '177', '178']
  let n = pick(prefixes)
  for (let i = 0; i < 8; i++) n += randInt(0, 9)
  return n
}

export function mockEmail(): string {
  const nameLen = randInt(5, 10)
  let name = ''
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < nameLen; i++) name += randChar(chars)
  return `${name}@${pick(EMAIL_DOMAINS)}`
}

export function mockAddress(): string {
  const region = pick(CITIES)
  const province = region[0]
  const city = region[randInt(1, region.length - 1)]
  return `${province}${city}${pick(STREETS)}${randInt(1, 999)}号`
}

export function mockCompany(): string {
  const region = pick(CITIES)
  const city = (region[randInt(1, region.length - 1)] || region[0]).replace(/[省市区]$/, '')
  return `${city}${pick(COMPANY_PREFIX)}${pick(COMPANY_TYPE)}${pick(COMPANY_SUFFIX)}`
}

/** 生成通过校验位算法的 18 位身份证号（区码为示例 110101 等） */
export function mockIdCard(): string {
  const areaCodes = ['110101', '310101', '440101', '330101', '320101', '510101']
  const area = pick(areaCodes)
  const year = randInt(1960, 2005)
  const month = String(randInt(1, 12)).padStart(2, '0')
  const day = String(randInt(1, 28)).padStart(2, '0')
  let seq = ''
  for (let i = 0; i < 3; i++) seq += randInt(0, 9)
  const base = `${area}${year}${month}${day}${seq}`
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkMap = '10X98765432'
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(base[i]) * weights[i]
  const check = checkMap[sum % 11]
  return base + check
}

export function mockDate(startYear = 2000, endYear = 2025): string {
  const year = randInt(startYear, endYear)
  const month = String(randInt(1, 12)).padStart(2, '0')
  const day = String(randInt(1, 28)).padStart(2, '0')
  const h = String(randInt(0, 23)).padStart(2, '0')
  const mi = String(randInt(0, 59)).padStart(2, '0')
  const s = String(randInt(0, 59)).padStart(2, '0')
  return `${year}-${month}-${day} ${h}:${mi}:${s}`
}

export function mockUrl(): string {
  const domains = ['example.com', 'test.org', 'demo.net', 'sample.io']
  const paths = ['home', 'about', 'products', 'blog', 'contact', 'api/v1/users']
  return `https://www.${pick(domains)}/${pick(paths)}`
}

export function mockInt(min = 0, max = 10000): number {
  return randInt(min, max)
}

export type MockFieldType =
  | 'name'
  | 'phone'
  | 'email'
  | 'address'
  | 'company'
  | 'idcard'
  | 'date'
  | 'url'
  | 'int'

export interface MockField {
  key: string
  type: MockFieldType
}

const generators: Record<MockFieldType, () => string | number> = {
  name: mockName,
  phone: mockPhone,
  email: mockEmail,
  address: mockAddress,
  company: mockCompany,
  idcard: mockIdCard,
  date: () => mockDate(),
  url: mockUrl,
  int: () => mockInt(),
}

export const mockFieldLabels: Record<MockFieldType, string> = {
  name: '姓名',
  phone: '手机号',
  email: '邮箱',
  address: '地址',
  company: '公司名',
  idcard: '身份证',
  date: '日期时间',
  url: 'URL',
  int: '整数',
}

export function generateMockData(
  fields: MockField[],
  count: number,
): Array<Record<string, string | number>> {
  const rows: Array<Record<string, string | number>> = []
  const n = Math.max(0, Math.min(count, 10000))
  for (let i = 0; i < n; i++) {
    const row: Record<string, string | number> = {}
    for (const f of fields) {
      row[f.key || f.type] = generators[f.type]()
    }
    rows.push(row)
  }
  return rows
}

export function mockToCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const header = keys.join(',')
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = String(r[k] ?? '')
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
        })
        .join(','),
    )
    .join('\n')
  return `${header}\n${body}`
}
