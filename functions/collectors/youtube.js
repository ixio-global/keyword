/**
 * 유튜브 데이터 수집기
 * - YouTube Data API v3 사용
 */

const axios = require('axios');

// YouTube Data API 키는 Firebase Functions 설정에서 가져옴
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

/**
 * 유튜브 데이터 수집
 * @param {Object} source - 유튜브 채널 정보
 * @param {Object} keyword - 검색 키워드
 * @returns {Array} 수집된 영상 데이터
 */
async function collect(source, keyword) {
    console.log(`Collecting YouTube videos for keyword: ${keyword.name} from ${source.name}`);

    if (!YOUTUBE_API_KEY) {
        console.warn('YouTube API key is not set');
        return [];
    }

    try {
        // 채널 ID 추출 (URL에서 또는 직접)
        const channelId = extractChannelId(source.url);

        if (!channelId) {
            console.warn(`Could not extract channel ID from ${source.url}`);
            return [];
        }

        // 최근 업로드된 영상 검색
        const videos = await searchChannelVideos(channelId, keyword.name);

        console.log(`Collected ${videos.length} videos from ${source.name}`);
        return videos;
    } catch (error) {
        console.error(`Error collecting from YouTube channel ${source.name}:`, error);
        return [];
    }
}

/**
 * 채널 ID 추출
 */
function extractChannelId(url) {
    // URL 형식: https://www.youtube.com/@channelname
    // 또는 직접 채널 ID: UC...

    if (url.startsWith('UC')) {
        return url; // 이미 채널 ID
    }

    // @channelname 형식에서 채널명 추출
    const match = url.match(/@([a-zA-Z0-9_-]+)/);
    if (match) {
        return match[1]; // 실제로는 채널명을 채널 ID로 변환해야 함
    }

    return null;
}

/**
 * 채널의 영상 검색
 */
async function searchChannelVideos(channelIdentifier, keyword) {
    try {
        // 먼저 채널명으로 채널 ID 검색
        let channelId = channelIdentifier;

        if (!channelIdentifier.startsWith('UC')) {
            channelId = await getChannelIdByUsername(channelIdentifier);
            if (!channelId) {
                console.warn(`Could not find channel ID for ${channelIdentifier}`);
                return [];
            }
        }

        // 최근 2시간 이내 영상 필터링을 위한 시간 계산
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const publishedAfter = twoHoursAgo.toISOString();

        // YouTube API 호출
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                key: YOUTUBE_API_KEY,
                channelId: channelId,
                q: keyword,
                part: 'snippet',
                type: 'video',
                order: 'date',
                publishedAfter: publishedAfter,
                maxResults: 10
            },
            timeout: 10000
        });

        const items = response.data.items || [];

        // 데이터 포맷팅
        const videos = items.map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            content: item.snippet.description,
            publishedAt: item.snippet.publishedAt
        }));

        return videos;
    } catch (error) {
        console.error('YouTube API error:', error);

        // API 할당량 초과 시 대체 방법
        if (error.response?.status === 403) {
            console.warn('YouTube API quota exceeded');
        }

        return [];
    }
}

/**
 * 채널명으로 채널 ID 가져오기
 */
async function getChannelIdByUsername(username) {
    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                key: YOUTUBE_API_KEY,
                q: username,
                part: 'snippet',
                type: 'channel',
                maxResults: 1
            },
            timeout: 10000
        });

        const items = response.data.items || [];
        if (items.length > 0) {
            return items[0].snippet.channelId;
        }

        return null;
    } catch (error) {
        console.error('Error getting channel ID:', error);
        return null;
    }
}

/**
 * YouTube RSS 피드 사용 (API 할당량 절약 대안)
 */
async function collectFromRSS(channelId) {
    try {
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data, { xmlMode: true });
        const items = [];

        $('entry').each((i, elem) => {
            if (i >= 10) return false;

            const $elem = $(elem);
            const title = $elem.find('title').text();
            const videoId = $elem.find('videoId').text();
            const published = $elem.find('published').text();

            // 최근 2시간 이내만
            const publishedDate = new Date(published);
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

            if (publishedDate >= twoHoursAgo) {
                items.push({
                    title: title,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    content: '',
                    publishedAt: published
                });
            }
        });

        return items;
    } catch (error) {
        console.error('YouTube RSS feed error:', error);
        return [];
    }
}

module.exports = {
    collect
};
