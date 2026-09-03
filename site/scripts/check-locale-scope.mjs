/*
 * 언어판마다 **그 나라 독자에게 맞는 제도만** 나오는지 검사한다.
 *
 * ★ 왜 있나 (2026-09-02, 오너 지적):
 *   스페인어·포르투갈어를 추가하면서 내가 "생활 요령 글에 있는 산정특례·장기요양보험을
 *   어떻게 할까요"라고 물었다가 크게 지적받았다 —
 *   *"생활요령에 산정특례 장기요양보험이 저 나라 사람들에게 애초에 왜 나오냐고!!
 *     그 나라 사람에 맞게 이걸 세팅해야하는데!!"*
 *   맞는 말이다. 물어볼 일이 아니라 애초에 나오면 안 되는 것이고, **사람이 매번 기억하는
 *   대신 검사로 막아야 하는 것**이다. 그래서 오너가 "검증 로직 만들어. 검증 통과 못하면
 *   나한테 보고도 못하게 하고"라고 지시했다.
 *
 * ── 무엇을 잡나
 * 나라 고유의 **제도·기관 고유명사**가 그 나라를 담당하지 않는 언어판에 나오면 실패시킨다.
 *   예) 스페인어 글에 "산정특례"  → 멕시코 독자가 쓸 수 없는 제도다
 *   예) 영어 글에 "指定難病"      → 미국 독자와 무관하다
 *
 * ── 무엇을 안 잡나 (일부러)
 *   - **나라 이름 자체**("Korea", "韓国", "Corée")는 잡지 않는다. 연구의 출처를 밝히는 것은
 *     정상이고 실제로 그렇게 쓰고 있다(소식 #8: "a nationwide cohort in Korea").
 *     막을 것은 "그 나라 제도를 독자가 쓸 수 있는 것처럼 안내하는 것"이지 국적 언급이 아니다.
 *   - `sources:` 블록·URL·import·파일경로·MDX 주석 — 문장이 아니라 식별자·인용이다.
 *
 * ── 한 언어가 여러 나라를 담당한다
 * 그래서 용어마다 "이 용어를 써도 되는 언어"를 집합으로 적는다. 영어는 미국·캐나다·호주·
 * 뉴질랜드를, 프랑스어는 캐나다(퀘벡)를 담당하므로 그 나라 제도는 허용된다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTICLES = path.join(ROOT, 'src/content/articles');

/**
 * 나라 고유 제도·기관 고유명사.
 * `allow` = 그 제도를 안내해도 되는 언어판(그 나라 독자를 담당하는 언어).
 */
const INSTITUTIONS = [
  // ── 한국 ──────────────────────────────────────────────
  { allow: ['ko'], where: '한국', terms: [
    '산정특례', '장기요양보험', '노인장기요양', '국민건강보험', '건강보험공단', '국민연금',
    '보건복지부', '장애인등록', '뇌병변장애', '수정바델지수', '요양보호사', '읍·면·동',
    'kpda.co.kr',
    // 로마자·번역형 — 해외판에 새어 들어갈 때는 이 형태로 들어온다
    'National Health Insurance Service', 'Korean Parkinson', "Korea Parkinson",
  ]},
  // ── 일본 ──────────────────────────────────────────────
  { allow: ['ja'], where: '일본', terms: [
    '指定難病', '難病医療費助成', '介護保険', '障害年金', '厚生労働省', '難病情報センター',
    'nanbyou.or.jp', 'jpda.jp',
  ]},
  // ── 미국 ─ 영어판이 담당. 스페인어판도 미국 히스패닉을 담당한다(2026-09-02 확정) ──
  { allow: ['en', 'es'], where: '미국', terms: [
    'SSDI', 'Medicare', 'Medicaid', 'Social Security Administration', 'Blue Book',
    'VA disability', 'ssa.gov',
  ]},
  // ── 캐나다 ─ 영어판과 프랑스어판(퀘벡)이 담당 ──────────
  { allow: ['en', 'fr'], where: '캐나다', terms: [
    'Disability Tax Credit', 'Canada Caregiver Credit', 'CPP Disability', 'RAMQ',
    'Crédit canadien pour aidant naturel', 'crédit d’impôt pour personnes handicapées',
  ]},
  // ── 호주·뉴질랜드 ─ 영어판이 담당 ─────────────────────
  { allow: ['en'], where: '호주·뉴질랜드', terms: [
    'NDIS', 'Centrelink', 'Pharmaceutical Benefits Scheme', 'Work and Income',
  ]},
  // ── 중남미 ─ 스페인어판이 담당 ────────────────────────
  { allow: ['es'], where: '중남미', terms: [
    'IMSS', 'ISSSTE', 'INAPAM', 'ANSES', 'ChileAtiende', 'SENADIS', 'CONADIS', 'Fonasa',
    // 멕시코 제도 축 착수(2026-09-02)로 실제로 쓰기 시작한 고유명사들
    'IMSS-Bienestar', 'Pensión para el Bienestar', 'Módulo de Bienestar',
    'Secretaría de Bienestar', 'Ley del Seguro Social', 'CURP',
    'Unidad de Medicina Familiar', 'Reglas de Operación',
    // 아르헨티나 제도 축 착수(2026-09-02)로 실제로 쓰기 시작한 고유명사들
    'CUD', 'Certificado Único de Discapacidad', 'Junta Evaluadora', 'ANDIS', 'PAMI',
    'obra social', 'obras sociales', 'Ley 24.901', 'Ley 22.431', 'Ley 27.793',
    'Certificado Médico Oficial', 'Pensión No Contributiva', 'mi ANSES',
    'Mi Argentina', 'SUBE', 'CNRT', 'Símbolo Internacional de Acceso',
    'Clave de la Seguridad Social', 'monotributista', 'CUIL',
    'ACEPAR', 'Hospital Nacional Alejandro Posadas',
    'Unidad de Gestión Local', 'UGL', 'haber mínimo previsional',
    'haberes mínimos', 'CIE-10', 'DNI',
    'CONAMED', 'Comisión Nacional de Arbitraje Médico',
    'Comisiones Estatales de Arbitraje Médico', 'NSS',
    'RT-09', 'Subdelegación de Prestaciones', 'CLABE', 'INE',
    // 칠레 제도 축 착수(2026-09-02)로 실제로 쓰기 시작한 고유명사들
    'GES', 'AUGE', 'AUGE-GES', 'Isapre', 'Isapres', 'COMPIN', 'CESFAM', 'CECOSF',
    'ClaveÚnica', 'RND', 'Registro Nacional de la Discapacidad', 'PBSI', 'PGU',
    'Copago Cero', 'Dipreca', 'Capredena', 'Registro Social de Hogares',
    'Superintendencia de Salud', 'Liga Chilena contra el Mal de Parkinson',
    'Ley N° 20.422', 'Ley 20.422', 'SUSESO', 'licencia médica',
    'Superintendencia de Seguridad Social', 'subsidio por incapacidad laboral',
    // 콜롬비아 제도 축 착수(2026-09-02)로 실제로 쓰기 시작한 고유명사들
    'EPS', 'IPS', 'RLCPD', 'CIE-10', 'Colpensiones', 'AFP',
    'acción de tutela', 'tutela', 'Junta Nacional de Calificación',
    'junta de calificación de invalidez', 'Defensoría del Pueblo',
    'Personería Municipal', 'Casas de Justicia', 'Superintendencia de Salud',
    'Caja de Compensación Familiar', 'Ley 100 de 1993', 'Ley 1751 de 2015',
    'Resolución 113 de 2020', 'Resolución 1239 de 2022',
    'Fundación Parkinson Bogotá', 'Inspector del Trabajo',
    // ⚠️ 'PBS' 는 넣지 않는다 — 호주(Pharmaceutical Benefits Scheme)와 콜롬비아
    //    (Plan de Beneficios en Salud)가 같은 약어를 쓴다. 약어만으로는 나라를 못 가른다.
    //    정식 명칭만 넣는다. (2026-09-03 실제로 en 판 호주 글 5편이 오탐으로 걸렸다)
    'Supersalud', 'Superintendencia Nacional de Salud',
    'Plan de Beneficios en Salud', 'MIPRES',
    'PQRD', 'Ley 1949 de 2019', 'Ley 1122 de 2007', 'función jurisdiccional',
    'medicina prepagada', 'SGSSS', 'UPC', 'INVIMA',
    'Junta de Profesionales de la Salud', 'Resolución 740 de 2024',
  ]},
  // ── 브라질 ─ 포르투갈어판이 담당 ──────────────────────
  { allow: ['pt'], where: '브라질', terms: [
    'INSS', 'BPC/LOAS', 'LOAS', 'Sistema Único de Saúde',
    // 제도 축 착수(2026-09-02)로 실제로 쓰기 시작한 고유명사들
    'CadÚnico', 'CRAS', 'CREAS', 'Meu INSS', 'Receita Federal',
    'Defensoria Pública', 'Juizado Especial Federal', 'Juizados Especiais Federais',
    'Lei 7.713', 'Lei 8.213', 'Lei 8.742', 'Lei 8.989', 'Estatuto da Pessoa com Deficiência',
    'IPVA', 'PCDT', 'Ouvidoria do SUS',
    // 민간 의료보험(plano de saúde) 축 착수(2026-09-03)
    'ANS', 'NIP', 'plano de saúde', 'planos de saúde', 'operadora', 'operadoras',
    'Rol de Procedimentos', 'RN nº 259', 'RN nº 566', 'Disque ANS',
    'Agência Nacional de Saúde Suplementar',
    'Passe Livre', 'ANTT', 'GOV.BR', 'Lei nº 8.899', 'Lei nº 10.048',
    'FGTS', 'CAIXA', 'Perícia Médica Federal', 'PIS/PASEP', 'CPF',
    'Carteira de Trabalho', 'CRM',
    'Conselho Federal de Medicina', 'CRM',
  ]},
];

/*
 * 예외 — 파일별로 "이 용어는 여기서 허용"을 **명시적으로** 적는다.
 * 비어 있는 것이 정상이다. 한 줄이라도 늘리려면 이유를 함께 적을 것.
 * (연구 데이터의 출처를 고유명사로 밝혀야 하는 경우 정도만 해당된다.)
 */
const EXCEPTIONS = {
  // 'en/news/foo': ['National Health Insurance Service'],  // 연구 데이터 출처로 인용
};

/** 인용·출처·식별자를 지운 '우리가 쓴 문장'만 남긴다. */
function proseOnly(raw) {
  const parts = raw.split(/^---$/m);
  const fm = parts[1] ?? '';
  const body = parts.slice(2).join('---');

  const kept = [];
  let inSources = false;
  for (const line of fm.split('\n')) {
    if (/^sources:/.test(line)) { inSources = true; continue; }
    if (inSources) {
      if (/^\S/.test(line)) inSources = false;
      else continue;
    }
    kept.push(line);
  }

  let text = kept.join('\n') + '\n' + body;
  text = text.replace(/https?:\/\/\S+/g, ' ');
  text = text.replace(/^related:.*$/gm, ' ');
  text = text.replace(/^\s*(hero|thumbnail):.*$/gm, ' ');
  text = text.replace(/^import .*$/gm, ' ');
  text = text.replace(/\.{0,2}\/[\w./-]+\.(png|jpe?g|webp|svg|astro|mdx?)/g, ' ');
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
  return text;
}

/**
 * 고유명사가 **낱말로** 들어 있는지 본다.
 * 단순 포함으로 보면 "ANDIS"(아르헨티나) 안의 "NDIS"(호주)처럼
 * 다른 나라 약어가 겹쳐 오탐이 난다 — 2026-09-02 실제로 났다.
 * 앞뒤가 글자·숫자가 아닐 때만 일치로 친다.
 */
function hasTerm(text, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'u').test(text);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const files = await walk(ARTICLES);
const problems = [];

for (const file of files) {
  const rel = path.relative(ARTICLES, file).replace(/\\/g, '/');
  const locale = rel.split('/')[0];
  const key = rel.replace(/\.mdx$/, '');
  const allowedHere = new Set(EXCEPTIONS[key] ?? []);
  const text = proseOnly(await readFile(file, 'utf8'));

  for (const group of INSTITUTIONS) {
    if (group.allow.includes(locale)) continue;
    for (const term of group.terms) {
      if (allowedHere.has(term)) continue;
      if (hasTerm(text, term)) {
        problems.push({ rel, term, where: group.where, allow: group.allow });
      }
    }
  }
}

if (problems.length) {
  console.error('\n✗ 언어판 범위 검사 실패 — 그 언어 독자와 무관한 나라의 제도가 들어 있다\n');
  for (const p of problems) {
    console.error(`  ${p.rel}`);
    console.error(`    "${p.term}" 은(는) ${p.where} 제도다 — ${p.allow.join('/')} 판에서만 쓴다`);
  }
  console.error('\n  고치는 방법: 그 문단을 **이 언어 독자의 나라 기준으로 다시 쓴다.**');
  console.error('  번역만 하지 말 것 — 제도는 나라마다 다르고, 없는 제도를 안내하면 독자가 헛걸음한다.');
  console.error('  제도 안내가 필요하면 생활 요령이 아니라 제도·지원 축에 그 나라 글로 쓴다');
  console.error('  (docs/institutions-brief.md 0절 "나라 기준으로 본다").\n');
  process.exit(1);
}

const byLocale = new Set(files.map((f) => path.relative(ARTICLES, f).split(path.sep)[0]));
console.log(`✓ 언어판 범위 검사 통과 — ${files.length}편 / ${[...byLocale].sort().join(', ')}`);
