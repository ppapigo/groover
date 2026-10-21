# API DTO 규칙

- 외부 API의 요청·응답 DTO는 담당 도메인의 `dto` 패키지에 각각 독립된 파일로 작성한다. 공통 응답은 `common.dto`에 둔다.
- 고정된 구조의 요청·응답에 `Map`이나 `Object`를 사용하지 않는다. 컨트롤러 반환형에는 `ApiResponse<ReviewResponse>`처럼 실제 타입을 명시하며, 데이터가 없으면 `ApiResponse<Void>`를 사용한다.
- 필드 구성과 검증 규칙이 같은 API는 DTO를 공유할 수 있다. 현재 리뷰 생성·수정은 `ReviewRequest`를 공유한다.
- 필드 구성, 필수 여부, 검증 조건, 입력 기본값 또는 응답 공개 범위가 달라지는 순간 해당 용도의 새 DTO를 만든다. 예를 들어 생성·수정 규칙이 갈라지면 `CreateReviewRequest`와 `UpdateReviewRequest`로 분리한다. 하나의 DTO에 분기 플래그나 검증 그룹을 덧붙여 서로 다른 계약을 유지하지 않는다.
- DTO를 분리할 때 기존 JSON 필드명·응답 구조·기본값·정규화 규칙을 보존한다. 계약을 변경하는 경우 API 문서와 관련 HTTP 테스트를 함께 갱신한다.
- 검증은 `groover-api`에서 `mvn test`로 수행한다.
