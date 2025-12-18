# 키워드 트렌드 모니터링 시스템 - 배포 가이드

## 📋 목차
1. [사전 준비](#사전-준비)
2. [Firebase 프로젝트 설정](#firebase-프로젝트-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [Firebase Functions 배포](#firebase-functions-배포)
5. [GitHub Pages 배포](#github-pages-배포)
6. [스케줄러 설정](#스케줄러-설정)

---

## 🔧 사전 준비

### 필요한 도구
- Node.js 18 이상
- npm 또는 yarn
- Git
- Firebase CLI

### Firebase CLI 설치
```bash
npm install -g firebase-tools
```

### Firebase 로그인
```bash
firebase login
```

---

## 🔥 Firebase 프로젝트 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `keyword-trend-monitoring` (원하는 이름)
4. Google Analytics 활성화 (선택사항)

### 2. Firestore Database 생성
1. Firebase Console → Firestore Database
2. "데이터베이스 만들기" 클릭
3. 프로덕션 모드로 시작
4. 리전 선택: `asia-northeast3` (서울)

### 3. Firebase Authentication 설정 (선택사항)
1. Firebase Console → Authentication
2. "시작하기" 클릭
3. 로그인 방법에서 "이메일/비밀번호" 활성화
4. 관리자 계정 생성

### 4. Firebase 프로젝트 초기화
```bash
cd c:\Users\mrbadguy\Documents\keyword
firebase init
```

선택 항목:
- [ ] Hosting
- [x] Functions
- [x] Firestore

---

## 🔑 환경 변수 설정

### 1. Firebase Config 업데이트

`public/js/firebase-config.js` 파일을 열고 Firebase 프로젝트 설정으로 교체:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**설정 값 확인 방법:**
1. Firebase Console → 프로젝트 설정 (⚙️)
2. "내 앱" 섹션에서 "웹 앱 추가" 또는 기존 앱 선택
3. SDK 설정 및 구성 코드 복사

### 2. YouTube API 키 설정 (선택사항)

```bash
firebase functions:config:set youtube.api_key="YOUR_YOUTUBE_API_KEY"
```

**YouTube API 키 발급:**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. API 및 서비스 → 사용자 인증 정보
3. "사용자 인증 정보 만들기" → API 키
4. YouTube Data API v3 활성화

---

## 🚀 Firebase Functions 배포

### 1. Functions 의존성 설치

```bash
cd functions
npm install
cd ..
```

### 2. Functions 배포

```bash
firebase deploy --only functions
```

배포되는 함수:
- `scheduledDataCollection`: 2시간마다 자동 실행
- `manualCollect`: HTTP 트리거 (수동 수집)

### 3. 배포 확인

```bash
firebase functions:log
```

---

## 🌐 GitHub Pages 배포

### 1. GitHub 저장소 생성
1. GitHub에서 `ixio-global/keyword` 저장소 생성
2. 저장소를 Public으로 설정

### 2. Git 초기화 및 푸시

```bash
cd c:\Users\mrbadguy\Documents\keyword
git init
git add .
git commit -m "Initial commit: Keyword Trend Monitoring System"
git branch -M main
git remote add origin https://github.com/ixio-global/keyword.git
git push -u origin main
```

### 3. GitHub Pages 활성화
1. GitHub 저장소 → Settings
2. Pages 섹션
3. Source: `main` 브랜치, `/public` 폴더 선택
4. Save 클릭

### 4. 배포 URL 확인
GitHub Pages URL: `https://ixio-global.github.io/keyword/`

---

## ⏰ 스케줄러 설정

### 1. Cloud Scheduler 활성화

Firebase Functions의 스케줄러는 Cloud Scheduler를 사용합니다.

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount@appspot.gserviceaccount.com \
  --role=roles/cloudscheduler.admin
```

### 2. 스케줄러 확인

Firebase Console → Functions → `scheduledDataCollection` 함수 확인

**실행 주기:** `every 2 hours` (2시간마다 자동 실행)

**수동 실행:**
```bash
firebase functions:shell
> scheduledDataCollection()
```

---

## ✅ 배포 후 확인 사항

### 1. 프론트엔드 확인
- [ ] GitHub Pages URL 접속
- [ ] 대시보드 정상 표시
- [ ] 관리자 페이지 접속
- [ ] Firebase 연결 확인

### 2. 백엔드 확인
- [ ] Functions 배포 완료
- [ ] 스케줄러 활성화
- [ ] Firestore 규칙 적용
- [ ] 환경 변수 설정 확인

### 3. 데이터 수집 테스트
- [ ] 관리자 페이지에서 키워드 추가
- [ ] 수동 수집 실행 (HTTP 트리거)
- [ ] Firestore에서 데이터 확인
- [ ] 대시보드에서 데이터 표시 확인

---

## 🐛 문제 해결

### Functions 배포 오류
```bash
# 로그 확인
firebase functions:log --only scheduledDataCollection

# 설정 확인
firebase functions:config:get
```

### Firestore 권한 오류
- Firestore 규칙이 올바르게 배포되었는지 확인
- Authentication 설정 확인

### GitHub Pages 404 오류
- 저장소가 Public인지 확인
- Pages 설정에서 `/public` 폴더 선택 확인
- 빌드 및 배포 완료 대기 (최대 10분)

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
- Firebase Console의 로그
- Browser Developer Console
- GitHub Actions (있는 경우)

---

## 🔄 업데이트

### Functions 업데이트
```bash
cd functions
# 코드 수정 후
cd ..
firebase deploy --only functions
```

### 프론트엔드 업데이트
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

GitHub Pages는 자동으로 업데이트됩니다.

---

## 📊 비용 추정

**Firebase 무료 할당량:**
- Firestore: 1GB 저장소, 50,000 읽기/일
- Functions: 2백만 호출/월
- Hosting: 10GB 전송/월

**예상 비용 (소규모):** 무료 ~ $10/월

**주의:** YouTube API는 별도 할당량이 있습니다.

---

완료되었습니다! 🎉
