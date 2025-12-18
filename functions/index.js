/**
 * Firebase Functions - 키워드 트렌드 모니터링 시스템
 * 
 * 주요 기능:
 * 1. 2시간마다 자동 데이터 수집 (scheduledDataCollection)
 * 2. 키워드 노출 빈도 추적
 * 3. 트렌드 급증 감지 및 알림
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin 초기화
admin.initializeApp();
const db = admin.firestore();

// ==================== 스케줄러: 2시간마다 데이터 수집 ====================
exports.scheduledDataCollection = functions.pubsub
    .schedule('every 2 hours')
    .timeZone('Asia/Seoul')
    .onRun(async (context) => {
        console.log('Starting scheduled data collection...');

        try {
            // 1. 키워드 및 매체 목록 가져오기
            const keywordsSnapshot = await db.collection('keywords').where('active', '==', true).get();
            const sourcesSnapshot = await db.collection('sources').where('active', '==', true).get();

            const keywords = keywordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sources = sourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`Found ${keywords.length} keywords and ${sources.length} sources`);

            // 2. 각 매체별로 데이터 수집
            const collectionPromises = sources.map(source =>
                collectDataFromSource(source, keywords)
            );

            const results = await Promise.allSettled(collectionPromises);

            // 3. 결과 집계
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            console.log(`Collection completed: ${successful} successful, ${failed} failed`);

            // 4. 트렌드 분석 및 알림
            await analyzeTrends();

            return { success: true, successful, failed };
        } catch (error) {
            console.error('Scheduled collection error:', error);
            return { success: false, error: error.message };
        }
    });

// ==================== 매체별 데이터 수집 ====================
async function collectDataFromSource(source, keywords) {
    console.log(`Collecting from ${source.name} (${source.type})`);

    try {
        let collector;

        // 매체 타입에 따라 적절한 수집기 선택
        switch (source.type) {
            case 'news':
                collector = require('./collectors/news');
                break;
            case 'community':
                collector = require('./collectors/community');
                break;
            case 'youtube':
                collector = require('./collectors/youtube');
                break;
            default:
                throw new Error(`Unknown source type: ${source.type}`);
        }

        // 각 키워드에 대해 데이터 수집
        for (const keyword of keywords) {
            const data = await collector.collect(source, keyword);

            // Firestore에 저장
            if (data && data.length > 0) {
                const batch = db.batch();

                data.forEach(item => {
                    const docRef = db.collection('data').doc();
                    batch.set(docRef, {
                        source: source.name,
                        sourceType: source.type,
                        keyword: keyword.name,
                        keywordId: keyword.id,
                        title: item.title,
                        url: item.url,
                        content: item.content || '',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        collectedAt: new Date().toISOString()
                    });
                });

                await batch.commit();
                console.log(`Saved ${data.length} items for keyword '${keyword.name}' from ${source.name}`);
            }
        }

        return { success: true, source: source.name };
    } catch (error) {
        console.error(`Error collecting from ${source.name}:`, error);
        throw error;
    }
}

// ==================== 트렌드 분석 ====================
async function analyzeTrends() {
    console.log('Analyzing trends...');

    try {
        // 최근 2시간 데이터 가져오기
        const now = new Date();
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
        const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);

        const recentSnapshot = await db.collection('data')
            .where('timestamp', '>=', twoHoursAgo)
            .get();

        const previousSnapshot = await db.collection('data')
            .where('timestamp', '>=', fourHoursAgo)
            .where('timestamp', '<', twoHoursAgo)
            .get();

        // 키워드별 언급량 집계
        const recentCounts = aggregateByKeyword(recentSnapshot.docs);
        const previousCounts = aggregateByKeyword(previousSnapshot.docs);

        // 급증 감지
        const alerts = detectSurges(recentCounts, previousCounts);

        // 알림 발송
        if (alerts.length > 0) {
            await sendAlerts(alerts);
        }

        console.log(`Trend analysis completed. Found ${alerts.length} surges.`);
        return alerts;
    } catch (error) {
        console.error('Trend analysis error:', error);
        throw error;
    }
}

// ==================== 키워드별 집계 ====================
function aggregateByKeyword(docs) {
    const counts = {};

    docs.forEach(doc => {
        const data = doc.data();
        const keyword = data.keyword;

        if (!counts[keyword]) {
            counts[keyword] = {
                count: 0,
                sources: new Set()
            };
        }

        counts[keyword].count++;
        counts[keyword].sources.add(data.source);
    });

    // Set을 Array로 변환
    Object.keys(counts).forEach(keyword => {
        counts[keyword].sources = Array.from(counts[keyword].sources);
    });

    return counts;
}

// ==================== 급증 감지 ====================
async function detectSurges(recentCounts, previousCounts) {
    const alerts = [];

    // 알림 설정 가져오기
    const settingsDoc = await db.collection('settings').doc('alerts').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { threshold: 50, enabled: true };

    if (!settings.enabled) {
        console.log('Alerts are disabled');
        return alerts;
    }

    const threshold = settings.threshold || 50;

    // 각 키워드 비교
    for (const keyword in recentCounts) {
        const recentCount = recentCounts[keyword].count;
        const previousCount = previousCounts[keyword]?.count || 1; // 0 방지

        const percentageChange = ((recentCount - previousCount) / previousCount) * 100;

        if (percentageChange >= threshold) {
            alerts.push({
                keyword: keyword,
                recentCount: recentCount,
                previousCount: previousCount,
                percentageChange: Math.round(percentageChange),
                sources: recentCounts[keyword].sources.join(', ')
            });
        }
    }

    return alerts;
}

// ==================== 알림 발송 ====================
async function sendAlerts(alerts) {
    console.log(`Sending ${alerts.length} alerts...`);

    try {
        // 알림 설정 가져오기
        const settingsDoc = await db.collection('settings').doc('alerts').get();
        const settings = settingsDoc.data() || {};

        for (const alert of alerts) {
            const message = `[트렌드 급증] 키워드 '${alert.keyword}'의 언급량이 전 주기 대비 ${alert.percentageChange}% 상승했습니다. (주요 매체: ${alert.sources})`;

            // 이메일 발송 (실제 구현 필요)
            if (settings.email) {
                console.log(`Email to ${settings.email}: ${message}`);
                // TODO: SendGrid, Nodemailer 등으로 이메일 발송
            }

            // Webhook 발송 (Slack, Discord 등)
            if (settings.webhook) {
                const axios = require('axios');
                await axios.post(settings.webhook, {
                    text: message
                });
                console.log(`Webhook sent: ${message}`);
            }
        }

        return { success: true, count: alerts.length };
    } catch (error) {
        console.error('Alert sending error:', error);
        throw error;
    }
}

// ==================== HTTP 트리거: 수동 수집 ====================
exports.manualCollect = functions.https.onRequest(async (req, res) => {
    try {
        console.log('Manual collection triggered');

        // CORS 설정
        res.set('Access-Control-Allow-Origin', '*');

        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Methods', 'POST');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            return res.status(204).send('');
        }

        // 수집 실행
        const keywordsSnapshot = await db.collection('keywords').where('active', '==', true).get();
        const sourcesSnapshot = await db.collection('sources').where('active', '==', true).get();

        const keywords = keywordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sources = sourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const collectionPromises = sources.map(source =>
            collectDataFromSource(source, keywords)
        );

        const results = await Promise.allSettled(collectionPromises);

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        res.json({
            success: true,
            message: 'Manual collection completed',
            successful,
            failed
        });
    } catch (error) {
        console.error('Manual collection error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
