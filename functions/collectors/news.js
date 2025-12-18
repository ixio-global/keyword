/**
 * 뉴스 데이터 수집기
 * - 구글 뉴스, 네이버 뉴스에서 키워드 검색 결과 수집
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 뉴스 데이터 수집
 * @param {Object} source - 뉴스 매체 정보
 * @param {Object} keyword - 검색 키워드
 * @returns {Array} 수집된 뉴스 데이터
 */
async function collect(source, keyword) {
    console.log(`Collecting news for keyword: ${keyword.name} from ${source.name}`);

    try {
        if (source.name === '구글 뉴스') {
            return await collectGoogleNews(keyword.name);
        } else if (source.name === '네이버 뉴스') {
            return await collectNaverNews(keyword.name);
        } else {
            console.warn(`Unknown news source: ${source.name}`);
            return [];
        }
    } catch (error) {
        console.error(`Error collecting news from ${source.name}:`, error);
        return [];
    }
}

/**
 * 구글 뉴스 수집
 */
async function collectGoogleNews(keyword) {
    try {
        // 구글 뉴스 RSS 사용
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        const items = [];

        $('item').each((i, elem) => {
            if (i >= 10) return false; // 최대 10개

            const title = $(elem).find('title').text();
            const link = $(elem).find('link').text();
            const pubDate = $(elem).find('pubDate').text();
            const description = $(elem).find('description').text();

            // 최근 2시간 이내 기사만
            const articleDate = new Date(pubDate);
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

            if (articleDate >= twoHoursAgo) {
                items.push({
                    title: title,
                    url: link,
                    content: description,
                    publishedAt: articleDate.toISOString()
                });
            }
        });

        console.log(`Collected ${items.length} items from Google News`);
        return items;
    } catch (error) {
        console.error('Google News collection error:', error);
        return [];
    }
}

/**
 * 네이버 뉴스 수집
 */
async function collectNaverNews(keyword) {
    try {
        // 네이버 뉴스 검색 API 또는 스크래핑
        // 주의: 네이버 검색 API는 별도 API 키가 필요합니다
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://search.naver.com/search.naver?where=news&query=${encodedKeyword}&sort=1`; // sort=1: 최신순

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const items = [];

        // 네이버 뉴스 검색 결과 파싱
        $('.news_area').each((i, elem) => {
            if (i >= 10) return false; // 최대 10개

            const $elem = $(elem);
            const title = $elem.find('.news_tit').text().trim();
            const link = $elem.find('.news_tit').attr('href');
            const description = $elem.find('.news_dsc').text().trim();

            if (title && link) {
                items.push({
                    title: title,
                    url: link,
                    content: description
                });
            }
        });

        console.log(`Collected ${items.length} items from Naver News`);
        return items;
    } catch (error) {
        console.error('Naver News collection error:', error);
        return [];
    }
}

module.exports = {
    collect
};
