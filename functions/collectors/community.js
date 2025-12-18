/**
 * 커뮤니티 데이터 수집기
 * - 디시인사이드, 뽐뿌, 루리웹, 클리앙, 블라인드, 아사모(네이버 카페)
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 커뮤니티 데이터 수집
 * @param {Object} source - 커뮤니티 정보
 * @param {Object} keyword - 검색 키워드
 * @returns {Array} 수집된 게시글 데이터
 */
async function collect(source, keyword) {
    console.log(`Collecting community posts for keyword: ${keyword.name} from ${source.name}`);

    try {
        switch (source.name) {
            case '디시인사이드':
                return await collectDCInside(keyword.name);
            case '뽐뿌':
                return await collectPPomppu(keyword.name);
            case '루리웹':
                return await collectRuliweb(keyword.name);
            case '클리앙':
                return await collectClien(keyword.name);
            case '블라인드':
                return await collectBlind(keyword.name);
            case '아사모 (네이버 카페)':
                return await collectNaverCafe(keyword.name);
            default:
                console.warn(`Unknown community source: ${source.name}`);
                return [];
        }
    } catch (error) {
        console.error(`Error collecting from ${source.name}:`, error);
        return [];
    }
}

/**
 * 디시인사이드 수집
 */
async function collectDCInside(keyword) {
    try {
        // 디시인사이드 통합검색
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://search.dcinside.com/combine/subject?keyword=${encodedKeyword}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const items = [];

        $('.sch_result_list li').each((i, elem) => {
            if (i >= 10) return false;

            const $elem = $(elem);
            const title = $elem.find('.tit a').text().trim();
            const link = $elem.find('.tit a').attr('href');

            if (title && link) {
                items.push({
                    title: title,
                    url: link.startsWith('http') ? link : `https://gall.dcinside.com${link}`,
                    content: ''
                });
            }
        });

        console.log(`Collected ${items.length} items from DCInside`);
        return items;
    } catch (error) {
        console.error('DCInside collection error:', error);
        return [];
    }
}

/**
 * 뽐뿌 수집
 */
async function collectPPomppu(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://www.ppomppu.co.kr/search_bbs.php?keyword=${encodedKeyword}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const items = [];

        // 뽐뿌 검색 결과 파싱
        $('table.board_table tr').each((i, elem) => {
            if (i >= 10 || i === 0) return; // 헤더 제외

            const $elem = $(elem);
            const title = $elem.find('td.title a').text().trim();
            const link = $elem.find('td.title a').attr('href');

            if (title && link) {
                items.push({
                    title: title,
                    url: link.startsWith('http') ? link : `https://www.ppomppu.co.kr/${link}`,
                    content: ''
                });
            }
        });

        console.log(`Collected ${items.length} items from Ppomppu`);
        return items;
    } catch (error) {
        console.error('Ppomppu collection error:', error);
        return [];
    }
}

/**
 * 루리웹 수집
 */
async function collectRuliweb(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://bbs.ruliweb.com/community/board/300143?search_type=subject&search_key=${encodedKeyword}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const items = [];

        $('.board_list_wrapper table tr').each((i, elem) => {
            if (i >= 10) return false;

            const $elem = $(elem);
            const title = $elem.find('.subject a').text().trim();
            const link = $elem.find('.subject a').attr('href');

            if (title && link) {
                items.push({
                    title: title,
                    url: link.startsWith('http') ? link : `https://bbs.ruliweb.com${link}`,
                    content: ''
                });
            }
        });

        console.log(`Collected ${items.length} items from Ruliweb`);
        return items;
    } catch (error) {
        console.error('Ruliweb collection error:', error);
        return [];
    }
}

/**
 * 클리앙 수집
 */
async function collectClien(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://www.clien.net/service/search?q=${encodedKeyword}&sort=recency`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const items = [];

        $('.list_item').each((i, elem) => {
            if (i >= 10) return false;

            const $elem = $(elem);
            const title = $elem.find('.list_subject span').text().trim();
            const link = $elem.find('.list_subject').attr('href');

            if (title && link) {
                items.push({
                    title: title,
                    url: link.startsWith('http') ? link : `https://www.clien.net${link}`,
                    content: ''
                });
            }
        });

        console.log(`Collected ${items.length} items from Clien`);
        return items;
    } catch (error) {
        console.error('Clien collection error:', error);
        return [];
    }
}

/**
 * 블라인드 수집
 */
async function collectBlind(keyword) {
    try {
        // 블라인드는 로그인이 필요하므로 제한적
        console.warn('Blind requires authentication - limited access');

        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://www.teamblind.com/kr/search/${encodedKeyword}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        // 블라인드는 SPA이므로 실제 데이터는 API에서 가져와야 함
        // 여기서는 기본 구조만 제공

        console.log('Blind collection requires API integration');
        return [];
    } catch (error) {
        console.error('Blind collection error:', error);
        return [];
    }
}

/**
 * 네이버 카페 (아사모) 수집
 */
async function collectNaverCafe(keyword) {
    try {
        // 네이버 카페는 인증과 멤버십 등급이 필요할 수 있음
        console.warn('Naver Cafe requires authentication and membership');

        const encodedKeyword = encodeURIComponent(keyword);
        const cafeUrl = 'asamo'; // 카페 ID
        const url = `https://cafe.naver.com/ArticleSearchList.nhn?search.clubid=10322133&search.searchBy=0&search.query=${encodedKeyword}`;

        // 네이버 카페는 로그인이 필요하므로 실제 구현 시 쿠키/세션 관리 필요

        console.log('Naver Cafe collection requires authentication');
        return [];
    } catch (error) {
        console.error('Naver Cafe collection error:', error);
        return [];
    }
}

module.exports = {
    collect
};
