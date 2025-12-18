// Firebase 설정
// TODO: Firebase 프로젝트 생성 후 실제 설정값으로 교체하세요

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 및 Auth 인스턴스
const db = firebase.firestore();
const auth = firebase.auth();

// 컬렉션 참조
const keywordsRef = db.collection('keywords');
const sourcesRef = db.collection('sources');
const dataRef = db.collection('data');
const settingsRef = db.collection('settings');

console.log('Firebase initialized successfully');
