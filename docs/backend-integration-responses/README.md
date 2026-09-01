# 응답 샘플 저장소

`docs/api-swagger.json`에 Response 스키마가 없어서(`backend-integration-analysis.md` 4-1
참고) 실제 연동 작업 전에 화면이 쓰는 API를 스웨거 UI에서 직접 테스트해보고 받은 실제
응답을 여기 저장합니다. 전체 62개 엔드포인트를 미리 다 채우지 않고, `.claude/loop-backend/
PROGRESS.md` 순서대로 **그 iteration에 필요한 API가 생길 때마다** 추가합니다(뒤 순서
화면의 API는 앞 단계 데이터가 아직 없어 지금 테스트해도 실제와 다른 응답이 나올 수
있음).

## 파일 규칙

- 파일 1개 = 엔드포인트 1개. 이름은 스웨거 경로를 그대로 옮김:
  `{도메인}-{Police|Stec}-{동사+명사}.md`
  예: `POST /api/v1/GuardCase/Stec/W/AddGuardCase` → `GuardCase-Stec-AddGuardCase.md`
- 아래 템플릿을 채운다:

```markdown
# GuardCase/Stec/W/AddGuardCase

- 테스트 날짜:
- 사용한 테스트 계정/데이터:
- 엔드포인트: `POST /api/v1/GuardCase/Stec/W/AddGuardCase`

## 요청

\`\`\`json
{}
\`\`\`

## 응답 (실제)

\`\`\`json
{}
\`\`\`

## 특이사항

- (스웨거 description과 다른 점, 항상 null/빈 값인 필드, 페이지네이션 envelope 형태 등)
```

## 사용 시점

`.claude/loop-backend/LOOP_INSTRUCTIONS.md` 2단계(사전 점검)에서, 그 화면이 쓰는 API마다
여기 파일이 있는지 확인한다. 없으면 사용자에게 스웨거에서 테스트해서 저장해달라고
요청한 뒤 구현을 시작한다.
