/**
 * 대시보드 로직
 * - 실시간 통계 표시
 * - 트렌드 그래프 렌더링
 * - 데이터 테이블 표시
 */

// ==================== 전역 변수 ====================
let trendChart = null;
let currentPage = 1;
const itemsPerPage = 20;
let allData = [];
let filteredData = [];

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
});

// ==================== 대시보드 초기화 ====================
async function initializeDashboard() {
    try {
        await loadStatistics();
        await loadKeywordsForFilter();
        await loadTrendData();
        await loadTableData();
    } catch (error) {
        console.error('대시보드 초기화 오류:', error);
        showError('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// ==================== 통계 로드 ====================
async function loadStatistics() {
    try {
        // 총 언급량
        const dataSnapshot = await dataRef.get();
        const totalMentions = dataSnapshot.size;
        document.getElementById('total-mentions').textContent = totalMentions.toLocaleString();

        // 활성 키워드
        const keywordsSnapshot = await keywordsRef.get();
        document.getElementById('active-keywords').textContent = keywordsSnapshot.size;

        // 모니터링 매체
        const sourcesSnapshot = await sourcesRef.get();
        document.getElementById('active-sources').textContent = sourcesSnapshot.size;

        // 마지막 업데이트
        if (dataSnapshot.size > 0) {
            const latestData = await dataRef.orderBy('timestamp', 'desc').limit(1).get();
            const timestamp = latestData.docs[0].data().timestamp.toDate();
            document.getElementById('last-update').textContent = formatTimeAgo(timestamp);
        } else {
            document.getElementById('last-update').textContent = '데이터 없음';
        }
    } catch (error) {
        console.error('통계 로드 오류:', error);
    }
}

// ==================== 필터용 키워드 로드 ====================
async function loadKeywordsForFilter() {
    try {
        const snapshot = await keywordsRef.get();
        const select = document.getElementById('keyword-filter');

        snapshot.forEach(doc => {
            const keyword = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = keyword.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('키워드 필터 로드 오류:', error);
    }
}

// ==================== 트렌드 그래프 로드 ====================
async function loadTrendData() {
    try {
        const timeFilter = document.getElementById('time-filter').value;
        const keywordFilter = document.getElementById('keyword-filter').value;

        // 시간 범위 계산
        const now = new Date();
        let startDate;
        switch (timeFilter) {
            case '24h':
                startDate = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 24 * 60 * 60 * 1000);
        }

        // 데이터 쿼리
        let query = dataRef.where('timestamp', '>=', startDate).orderBy('timestamp', 'asc');

        if (keywordFilter) {
            query = query.where('keyword', '==', keywordFilter);
        }

        const snapshot = await query.get();

        // 시간대별 집계
        const timeSeriesData = aggregateByTime(snapshot.docs, timeFilter);

        // 차트 렌더링
        renderTrendChart(timeSeriesData);
    } catch (error) {
        console.error('트렌드 데이터 로드 오류:', error);
        // 샘플 데이터로 차트 표시
        renderSampleChart();
    }
}

// ==================== 시간대별 데이터 집계 ====================
function aggregateByTime(docs, timeFilter) {
    const aggregated = {};

    docs.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp.toDate();

        // 시간 키 생성
        let timeKey;
        if (timeFilter === '24h') {
            timeKey = `${date.getHours()}:00`;
        } else {
            timeKey = `${date.getMonth() + 1}/${date.getDate()}`;
        }

        if (!aggregated[timeKey]) {
            aggregated[timeKey] = 0;
        }
        aggregated[timeKey]++;
    });

    return aggregated;
}

// ==================== 차트 렌더링 ====================
function renderTrendChart(data) {
    const ctx = document.getElementById('trend-chart');

    if (trendChart) {
        trendChart.destroy();
    }

    const labels = Object.keys(data);
    const values = Object.values(data);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '언급량',
                data: values,
                borderColor: '#007BFF',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(33, 37, 41, 0.9)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#E9ECEF'
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// ==================== 샘플 차트 (데이터 없을 때) ====================
function renderSampleChart() {
    const sampleData = {
        '00:00': 5, '02:00': 8, '04:00': 3, '06:00': 12,
        '08:00': 18, '10:00': 25, '12:00': 30, '14:00': 22,
        '16:00': 28, '18:00': 35, '20:00': 20, '22:00': 15
    };
    renderTrendChart(sampleData);
}

// ==================== 테이블 데이터 로드 ====================
async function loadTableData() {
    try {
        const keywordFilter = document.getElementById('keyword-filter').value;
        const sourceFilter = document.getElementById('source-filter').value;
        const timeFilter = document.getElementById('time-filter').value;

        // 시간 범위 계산
        const now = new Date();
        let startDate;
        switch (timeFilter) {
            case '24h':
                startDate = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 24 * 60 * 60 * 1000);
        }

        // 쿼리 구성
        let query = dataRef.where('timestamp', '>=', startDate).orderBy('timestamp', 'desc');

        if (keywordFilter) {
            query = query.where('keyword', '==', keywordFilter);
        }

        const snapshot = await query.get();
        allData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 소스 필터 적용
        if (sourceFilter) {
            filteredData = allData.filter(item => item.sourceType === sourceFilter);
        } else {
            filteredData = allData;
        }

        currentPage = 1;
        renderTable();
        updatePagination();
    } catch (error) {
        console.error('테이블 데이터 로드 오류:', error);
        renderEmptyTable();
    }
}

// ==================== 테이블 렌더링 ====================
function renderTable() {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">데이터가 없습니다.</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    pageData.forEach(item => {
        const row = document.createElement('tr');

        // 소스 아이콘
        let sourceIcon = '📄';
        if (item.sourceType === 'news') sourceIcon = '📰';
        else if (item.sourceType === 'community') sourceIcon = '💬';
        else if (item.sourceType === 'youtube') sourceIcon = '📺';

        row.innerHTML = `
      <td>${sourceIcon} ${item.source || '-'}</td>
      <td><span class="badge badge-primary">${item.keyword || '-'}</span></td>
      <td>${item.title || '-'}</td>
      <td><a href="${item.url || '#'}" target="_blank" class="text-primary">링크 →</a></td>
      <td>${formatTimestamp(item.timestamp)}</td>
    `;

        tbody.appendChild(row);
    });
}

// ==================== 빈 테이블 렌더링 ====================
function renderEmptyTable() {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">데이터가 없습니다.</td></tr>';
}

// ==================== 페이지네이션 업데이트 ====================
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const info = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    info.textContent = `${filteredData.length}개의 결과 (${currentPage}/${totalPages || 1} 페이지)`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// ==================== 이벤트 리스너 설정 ====================
function setupEventListeners() {
    // 필터 변경
    document.getElementById('keyword-filter').addEventListener('change', () => {
        loadTrendData();
        loadTableData();
    });

    document.getElementById('source-filter').addEventListener('change', () => {
        loadTableData();
    });

    document.getElementById('time-filter').addEventListener('change', () => {
        loadTrendData();
        loadTableData();
    });

    // 새로고침 버튼
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        const icon = document.getElementById('refresh-icon');

        btn.disabled = true;
        icon.innerHTML = '<span class="loading"></span> 새로고침 중...';

        await initializeDashboard();

        setTimeout(() => {
            btn.disabled = false;
            icon.textContent = '새로고침';
        }, 500);
    });

    // 페이지네이션
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            updatePagination();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            updatePagination();
        }
    });
}

// ==================== 유틸리티 함수 ====================

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
}

function showError(message) {
    alert(message); // 실제 환경에서는 더 나은 UI로 교체
}

// ==================== 초기 샘플 차트 로드 ====================
renderSampleChart();
