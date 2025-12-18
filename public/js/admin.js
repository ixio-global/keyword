/**
 * 관리자 페이지 로직
 * - 키워드 관리
 * - 매체 관리
 * - 알림 설정
 */

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
    loadKeywords();
    loadAlertSettings();
    loadAccountSettings(); // 계정 정보 로드 추가
    setupFormHandlers();
    setupAccountHandlers(); // 계정 폼 핸들러 추가
});

// ==================== 키워드 관리 ====================

// 키워드 목록 로드
async function loadKeywords() {
    try {
        const snapshot = await keywordsRef.orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('keywords-table-body');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">등록된 키워드가 없습니다.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const keyword = doc.data();
            const row = document.createElement('tr');

            // 카테고리 이름 변환
            const categoryNames = {
                'product': '제품',
                'brand': '브랜드',
                'trend': '트렌드',
                'event': '이벤트',
                'other': '기타'
            };

            row.innerHTML = `
        <td><strong>${keyword.name}</strong></td>
        <td><span class="badge badge-primary">${categoryNames[keyword.category] || '기타'}</span></td>
        <td>${keyword.description || '-'}</td>
        <td>${formatDate(keyword.createdAt)}</td>
        <td>
          <button class="btn btn-danger" onclick="deleteKeyword('${doc.id}', '${keyword.name}')">삭제</button>
        </td>
      `;

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('키워드 로드 오류:', error);
        showAlert('키워드를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 키워드 추가
async function addKeyword(event) {
    event.preventDefault();

    const name = document.getElementById('keyword-name').value.trim();
    const category = document.getElementById('keyword-category').value;
    const description = document.getElementById('keyword-description').value.trim();

    if (!name) {
        showAlert('키워드를 입력해주세요.', 'danger');
        return;
    }

    try {
        // 중복 확인
        const existing = await keywordsRef.where('name', '==', name).get();
        if (!existing.empty) {
            showAlert('이미 등록된 키워드입니다.', 'warning');
            return;
        }

        // 추가
        await keywordsRef.add({
            name: name,
            category: category,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            active: true
        });

        showAlert('키워드가 추가되었습니다.', 'success');
        document.getElementById('keyword-form').reset();
        loadKeywords();
    } catch (error) {
        console.error('키워드 추가 오류:', error);
        showAlert('키워드 추가 중 오류가 발생했습니다.', 'danger');
    }
}

// 키워드 삭제
async function deleteKeyword(id, name) {
    if (!confirm(`'${name}' 키워드를 삭제하시겠습니까?`)) {
        return;
    }

    try {
        await keywordsRef.doc(id).delete();
        showAlert('키워드가 삭제되었습니다.', 'success');
        loadKeywords();
    } catch (error) {
        console.error('키워드 삭제 오류:', error);
        showAlert('키워드 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// ==================== 매체 관리 ====================

// 매체 추가
async function addSource(event) {
    event.preventDefault();

    const name = document.getElementById('source-name').value.trim();
    const type = document.getElementById('source-type').value;
    const url = document.getElementById('source-url').value.trim();
    const notes = document.getElementById('source-notes').value.trim();

    if (!name || !type || !url) {
        showAlert('모든 필수 항목을 입력해주세요.', 'danger');
        return;
    }

    try {
        // 중복 확인
        const existing = await sourcesRef.where('url', '==', url).get();
        if (!existing.empty) {
            showAlert('이미 등록된 URL입니다.', 'warning');
            return;
        }

        // 추가
        await sourcesRef.add({
            name: name,
            type: type,
            url: url,
            notes: notes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            active: true
        });

        showAlert('매체가 추가되었습니다.', 'success');
        document.getElementById('source-form').reset();

        // 페이지 새로고침 (실제로는 동적으로 테이블 업데이트)
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('매체 추가 오류:', error);
        showAlert('매체 추가 중 오류가 발생했습니다.', 'danger');
    }
}

// ==================== 알림 설정 ====================

// 알림 설정 로드
async function loadAlertSettings() {
    try {
        const doc = await settingsRef.doc('alerts').get();

        if (doc.exists) {
            const settings = doc.data();
            document.getElementById('alert-threshold').value = settings.threshold || 50;
            document.getElementById('alert-email').value = settings.email || '';
            document.getElementById('alert-webhook').value = settings.webhook || '';
            document.getElementById('alert-enabled').checked = settings.enabled !== false;
        }
    } catch (error) {
        console.error('알림 설정 로드 오류:', error);
    }
}

// 알림 설정 저장
async function saveAlertSettings(event) {
    event.preventDefault();

    const threshold = parseInt(document.getElementById('alert-threshold').value);
    const email = document.getElementById('alert-email').value.trim();
    const webhook = document.getElementById('alert-webhook').value.trim();
    const enabled = document.getElementById('alert-enabled').checked;

    if (threshold < 10 || threshold > 500) {
        showAlert('급증 기준은 10% ~ 500% 사이여야 합니다.', 'danger');
        return;
    }

    try {
        await settingsRef.doc('alerts').set({
            threshold: threshold,
            email: email,
            webhook: webhook,
            enabled: enabled,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showAlert('알림 설정이 저장되었습니다.', 'success');
    } catch (error) {
        console.error('알림 설정 저장 오류:', error);
        showAlert('설정 저장 중 오류가 발생했습니다.', 'danger');
    }
}

// ==================== 폼 핸들러 설정 ====================
function setupFormHandlers() {
    document.getElementById('keyword-form').addEventListener('submit', addKeyword);
    document.getElementById('source-form').addEventListener('submit', addSource);
    document.getElementById('alert-settings-form').addEventListener('submit', saveAlertSettings);
}

// ==================== 유틸리티 함수 ====================

function formatDate(timestamp) {
    if (!timestamp) return '-';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    container.appendChild(alert);

    // 3초 후 자동 제거
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// ==================== 계정 관리 ====================

// 계정 정보 컬렉션 참조
const accountsRef = db.collection('accounts');

// 계정 정보 로드
async function loadAccountSettings() {
    try {
        // 네이버 계정 로드
        const naverDoc = await accountsRef.doc('naver').get();
        if (naverDoc.exists) {
            const naverData = naverDoc.data();
            document.getElementById('naver-id').value = decodeCredential(naverData.id || '');
            // 비밀번호는 보안상 표시하지 않음
            document.getElementById('naver-enabled').checked = naverData.enabled || false;

            updateAccountStatus('naver', naverData.enabled ? '계정 연결됨 ✓' : '비활성화');
        }

        // 블라인드 계정 로드
        const blindDoc = await accountsRef.doc('blind').get();
        if (blindDoc.exists) {
            const blindData = blindDoc.data();
            document.getElementById('blind-email').value = decodeCredential(blindData.email || '');
            // 비밀번호는 보안상 표시하지 않음
            document.getElementById('blind-enabled').checked = blindData.enabled || false;

            updateAccountStatus('blind', blindData.enabled ? '계정 연결됨 ✓' : '비활성화');
        }
    } catch (error) {
        console.error('계정 정보 로드 오류:', error);
    }
}

// 네이버 계정 저장
async function saveNaverAccount(event) {
    event.preventDefault();

    const id = document.getElementById('naver-id').value.trim();
    const password = document.getElementById('naver-password').value;
    const enabled = document.getElementById('naver-enabled').checked;

    if (!id || !password) {
        showAlert('네이버 ID와 비밀번호를 모두 입력해주세요.', 'danger');
        return;
    }

    try {
        // 간단한 Base64 인코딩 (실제 환경에서는 더 강력한 암호화 필요)
        await accountsRef.doc('naver').set({
            id: encodeCredential(id),
            password: encodeCredential(password),
            enabled: enabled,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showAlert('네이버 계정이 저장되었습니다.', 'success');
        updateAccountStatus('naver', enabled ? '계정 연결됨 ✓' : '저장됨 (비활성화)');

        // 비밀번호 필드 초기화
        document.getElementById('naver-password').value = '';
    } catch (error) {
        console.error('네이버 계정 저장 오류:', error);
        showAlert('계정 저장 중 오류가 발생했습니다.', 'danger');
    }
}

// 블라인드 계정 저장
async function saveBlindAccount(event) {
    event.preventDefault();

    const email = document.getElementById('blind-email').value.trim();
    const password = document.getElementById('blind-password').value;
    const enabled = document.getElementById('blind-enabled').checked;

    if (!email || !password) {
        showAlert('이메일과 비밀번호를 모두 입력해주세요.', 'danger');
        return;
    }

    try {
        // 간단한 Base64 인코딩 (실제 환경에서는 더 강력한 암호화 필요)
        await accountsRef.doc('blind').set({
            email: encodeCredential(email),
            password: encodeCredential(password),
            enabled: enabled,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showAlert('블라인드 계정이 저장되었습니다.', 'success');
        updateAccountStatus('blind', enabled ? '계정 연결됨 ✓' : '저장됨 (비활성화)');

        // 비밀번호 필드 초기화
        document.getElementById('blind-password').value = '';
    } catch (error) {
        console.error('블라인드 계정 저장 오류:', error);
        showAlert('계정 저장 중 오류가 발생했습니다.', 'danger');
    }
}

// 네이버 계정 테스트
async function testNaverAccount() {
    showAlert('연결 테스트 기능은 Firebase Functions에서 구현됩니다.', 'warning');
    // TODO: Firebase Functions API 호출하여 실제 네이버 로그인 테스트
}

// 블라인드 계정 테스트
async function testBlindAccount() {
    showAlert('연결 테스트 기능은 Firebase Functions에서 구현됩니다.', 'warning');
    // TODO: Firebase Functions API 호출하여 실제 블라인드 로그인 테스트
}

// 네이버 계정 삭제
async function deleteNaverAccount() {
    if (!confirm('네이버 계정 정보를 삭제하시겠습니까?')) {
        return;
    }

    try {
        await accountsRef.doc('naver').delete();
        document.getElementById('naver-id').value = '';
        document.getElementById('naver-password').value = '';
        document.getElementById('naver-enabled').checked = false;
        updateAccountStatus('naver', '');
        showAlert('네이버 계정이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('계정 삭제 오류:', error);
        showAlert('계정 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// 블라인드 계정 삭제
async function deleteBlindAccount() {
    if (!confirm('블라인드 계정 정보를 삭제하시겠습니까?')) {
        return;
    }

    try {
        await accountsRef.doc('blind').delete();
        document.getElementById('blind-email').value = '';
        document.getElementById('blind-password').value = '';
        document.getElementById('blind-enabled').checked = false;
        updateAccountStatus('blind', '');
        showAlert('블라인드 계정이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('계정 삭제 오류:', error);
        showAlert('계정 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// 계정 폼 핸들러 설정
function setupAccountHandlers() {
    document.getElementById('naver-account-form').addEventListener('submit', saveNaverAccount);
    document.getElementById('blind-account-form').addEventListener('submit', saveBlindAccount);
}

// 계정 상태 업데이트
function updateAccountStatus(platform, message) {
    const statusDiv = document.getElementById(`${platform}-status`);
    const statusText = document.getElementById(`${platform}-status-text`);

    if (message) {
        statusDiv.style.display = 'block';
        statusText.textContent = message;
    } else {
        statusDiv.style.display = 'none';
    }
}

// 간단한 Base64 인코딩 (보안 강화 필요)
function encodeCredential(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

// Base64 디코딩
function decodeCredential(encoded) {
    try {
        return decodeURIComponent(escape(atob(encoded)));
    } catch {
        return '';
    }
}

// 전역 함수로 노출 (HTML에서 호출)
window.deleteKeyword = deleteKeyword;
window.testNaverAccount = testNaverAccount;
window.testBlindAccount = testBlindAccount;
window.deleteNaverAccount = deleteNaverAccount;
window.deleteBlindAccount = deleteBlindAccount;
