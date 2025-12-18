# 키워드 트렌드 모니터링 시스템

## 📌 프로젝트 개요
뉴스, 커뮤니티, 유튜브에서 키워드 트렌드를 2시간 주기로 자동 수집하고 분석하는 시스템입니다.

## 🏗️ 아키텍처

### 프론트엔드 (GitHub Pages)
- **기술 스택**: HTML5, Vanilla CSS, JavaScript
- **디자인**: Pretendard 폰트, 미니멀리즘 (화이트 배경)
- **페이지 구성**:
  - `index.html`: 대시보드 (추이 그래프, 데이터 테이블)
  - `admin.html`: 관리자 설정 (매체/키워드/알림 관리)

### 백엔드 (Firebase)
- **Firebase Functions**: 데이터 수집 및 분석
- **Firestore Database**: 키워드, 매체, 수집 데이터 저장
- **Firebase Auth**: 관리자 인증
- **Cloud Scheduler**: 2시간 주기 자동 실행

### AI 분석
- **통계 분석**: 언급량 추이 및 급증 패턴 감지

## 📂 프로젝트 구조

```
keyword/
├── public/                 # GitHub Pages 배포용
│   ├── index.html         # 대시보드
│   ├── admin.html         # 관리자 페이지
│   ├── css/
│   │   └── style.css      # 통합 스타일
│   └── js/
│       ├── dashboard.js   # 대시보드 로직
│       ├── admin.js       # 관리자 로직
│       └── firebase-config.js
├── functions/             # Firebase Functions
│   ├── index.js          # 메인 함수
│   ├── collectors/       # 데이터 수집기
│   │   ├── news.js
│   │   ├── community.js
│   │   └── youtube.js
│   └── package.json
├── firebase.json          # Firebase 설정
├── firestore.rules        # Firestore 보안 규칙
└── README.md
```

## 🚀 배포 방법

### 1. Firebase 설정
```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 2. Functions 배포
```bash
cd functions
npm install
firebase deploy --only functions
```

### 3. GitHub Pages 배포
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

## 🎨 디자인 가이드라인

- **폰트**: Pretendard
- **배경**: #FFFFFF (Pure White)
- **텍스트**: #212529 (Dark Gray)
- **포인트**: #007BFF (Blue)
- **레이아웃**: 미니멀리즘, 충분한 화이트 스페이스

## 📊 대상 매체

### 뉴스
- 구글 뉴스
- 네이버 뉴스

### 커뮤니티
- 디시인사이드
- 뽐뿌
- 루리웹
- 클리앙
- 블라인드
- 아사모 (네이버 카페)

### 유튜브 채널
- 잇섭
- 슈카월드
- UnderKG
- 가전주부
- 디에디트

## 🔔 알림 기능

트렌드 급증 시 알림 발송:
> [트렌드 급증] 키워드 '{키워드}'의 언급량이 전 주기 대비 {x}% 상승했습니다. (주요 매체: {매체명})

## 📝 라이선스
MIT License
