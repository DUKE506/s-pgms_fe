// 사건유형(범죄유형) 변환 헬퍼 — 프론트 표현과 실제 백엔드 표현이 다른 지점을
// 한곳에 모은다(성별을 다루는 shared/lib/subject.ts와 같은 패턴).
//
// 프론트: 화면/폼은 한글 라벨('스토킹' 등, features/police/types/securityCase.ts의
// CaseType 유니온)을 쓴다.
// 백엔드: DEPLOY_REQUEST.CRIME_TYPE은 "범죄유형 코드" 컬럼이고, 스웨거(대시보드
// crimeType 파라미터)에 enum 값이 stalking/domestic/dating/threat/etc/none으로
// 명시돼 있다. 배치요구서 등록·수정(Add/UpdateDeployRequest)은 이 코드로 보낸다.
//
// ⚠️ 백엔드는 값 정규화를 안 한다 — 기존 DB에 우리 폼이 넣은 한글('스토킹')과
// 직접 들어간 레거시 영문('stalking')이 섞여 있다(findings.md). 그래서 읽기 방향
// (crimeCodeToCaseType)은 enum·레거시 한글 둘 다 수용한다. 백엔드가 조회 응답을
// enum으로 통일하고 레거시 행까지 정규화하면 한글 폴백은 제거할 수 있다.

import type { CaseType } from '../../features/police/types/securityCase'

export type CrimeTypeCode = 'stalking' | 'domestic' | 'dating' | 'threat' | 'etc' | 'none'

// 한글 라벨 → 서버 enum 코드. '사건미접수'는 none(미전송/null 아님).
const CASE_TYPE_TO_CODE: Record<CaseType, CrimeTypeCode> = {
  스토킹: 'stalking',
  가정폭력: 'domestic',
  교제폭력: 'dating',
  협박: 'threat',
  기타: 'etc',
  사건미접수: 'none',
}

const CODE_TO_CASE_TYPE: Record<CrimeTypeCode, CaseType> = {
  stalking: '스토킹',
  domestic: '가정폭력',
  dating: '교제폭력',
  threat: '협박',
  etc: '기타',
  none: '사건미접수',
}

const CASE_TYPE_LABELS = new Set<string>(Object.keys(CASE_TYPE_TO_CODE))

// 쓰기용 — 배치요구서 등록/수정 시 폼 라벨을 서버 코드로.
export function caseTypeToCrimeCode(label: CaseType): CrimeTypeCode {
  return CASE_TYPE_TO_CODE[label] ?? 'none'
}

// 읽기용 — 조회 응답의 crimeType을 폼/화면 라벨로. enum 코드, 레거시 한글 라벨,
// 그 밖의 값(null·미상)을 모두 받아 항상 유효한 CaseType을 돌려준다.
export function crimeCodeToCaseType(value: string | null | undefined): CaseType {
  if (!value) return '사건미접수'
  if (value in CODE_TO_CASE_TYPE) return CODE_TO_CASE_TYPE[value as CrimeTypeCode]
  if (CASE_TYPE_LABELS.has(value)) return value as CaseType
  return '사건미접수'
}
