// 경호대상자 필드 변환 헬퍼 — 실제 백엔드(Deploy/Police 계열)와 프론트 표현이
// 다른 지점을 한곳에 모은다.

// 실제 API는 성별을 정수 코드로 주고받는다(DEPLOY_REQUEST.SUSPECT_GENDER 코멘트:
// "0 : 남자 1 : 여자"). 프론트 폼/표시는 '남'/'여' 문자열을 쓴다.
export function genderLabelToCode(label: string): number {
  return label === '여' ? 1 : 0
}

export function genderCodeToLabel(code: number): string {
  return code === 1 ? '여' : '남'
}

// 생년월일(YYYY-MM-DD)에서 만나이 문자열을 계산한다. 값이 비었거나 파싱 불가하면
// 빈 문자열(화면에서 "-"로 렌더됨).
export function calcAge(birthDate: string): string {
  const birth = new Date(`${birthDate}T00:00:00.000Z`)
  if (Number.isNaN(birth.getTime())) return ''

  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1
  }
  return age >= 0 ? String(age) : ''
}
