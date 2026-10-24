/*************************************
项目名称: AI 影视剧场 (QX 专属后端脚本 - 无搜索&优化样式版)
路径匹配: 127.0.0.1:9999/hgdj
*************************************/

const BASE_URL = 'https://f607m.h2na6qa39.cc';
const UA = 'Mozilla/5.0 (iPhone; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

const _IMG_KEY = "f5d965df75336270";
const _IMG_IV = "97b60394abc2fbe1";

const $ = new Env("Guav_Backend");

async function main() {
  const url = ($request && $request.url) ? $request.url : '';
  
  try {
    if (url.indexOf('/hgdj/api/getVideos') !== -1) {
      const type = getParam(url, 'type') || 'ai-duanju';
      const page = getParam(url, 'p') || '1';
      const data = await fetchVideos(type, page);
      sendResponse(200, "application/json; charset=utf-8", JSON.stringify(data));
    } else if (url.indexOf('/hgdj/api/fetchImage') !== -1) {
      const targetUrl = getParam(url, 'url');
      if (!targetUrl) return sendResponse(400, "text/plain; charset=utf-8", "缺少 url 参数");
      
      let referer = BASE_URL + '/';
      try { referer = new URL(targetUrl).origin + '/'; } catch (e) {}

      try {
        const res = await $.get({
          url: targetUrl,
          binary: true,
          headers: { 'User-Agent': UA, 'Referer': referer }
        });
        
        let rawBytes = res.bodyBytes;
        if (rawBytes) {
          if (!(rawBytes instanceof Uint8Array)) {
            rawBytes = new Uint8Array(rawBytes);
          }
        } else if (res.body) {
          rawBytes = stringToUint8Array(res.body);
        }

        if (!rawBytes || rawBytes.length === 0) {
          console.log(`[QX图片代理] 错误: 图片内容为空`);
          return sendResponse(500, "text/plain; charset=utf-8", "Image body empty");
        }

        console.log(`[QX图片代理] 转换成功,有效字节长度: ${rawBytes.length}`);
        sendResponse(200, "text/plain; charset=utf-8", uint8ArrayToHex(rawBytes));
      } catch (fetchErr) {
        console.log(`[QX图片代理] 抓取异常: ${fetchErr.message || fetchErr}`);
        sendResponse(500, "text/plain; charset=utf-8", "Fetch error");
      }
    } else if (url.indexOf('/hgdj/api/getDetail') !== -1) {
      const data = await fetchDetail(getParam(url, 'url'));
      sendResponse(200, "application/json; charset=utf-8", JSON.stringify(data));
    } else if (url.indexOf('/hgdj/api/getPlayUrl') !== -1) {
      const playUrl = await fetchPlayUrl(getParam(url, 'url'));
      sendResponse(200, "application/json; charset=utf-8", JSON.stringify({ url: playUrl }));
    } else {
      sendResponse(200, "text/html; charset=utf-8", getHTML());
    }
  } catch (err) {
    console.log(`[QX全局错误] ${err.stack || err}`);
    sendResponse(500, "text/html; charset=utf-8", `<h3>QX 脚本出错:</h3><pre>${err.stack || err}</pre>`);
  }
}

async function fetchVideos(type, page) {
  try {
    const res = await $.get({ url: `${BASE_URL}/${type}/${page}/`, headers: { 'User-Agent': UA, 'Referer': BASE_URL + '/' } });
    if (!res?.body) return [];
    const gridMatch = res.body.match(/<div\s+class="hg-card-grid[\s\S]+data-channel-panel="latest"/);
    if (!gridMatch) return [];
    
    const isDrama = ['ai-duanju', 'ai-manju'].includes(type);
    const regex = isDrama 
      ? /hg-drama-card__cover-link"\shref="([^"]+)"[\s\S]*?data-src="([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?(?:hg-drama-card__episode">([^<]+)<\/span><\/div>|data-ep-base="([^"]+)")/g
      : /hg-drama-card__cover-link"\shref="([^"]+)"[\s\S]*?data-src="([^"]+)"[\s\S]*?alt="([^"]+)"/g;

    let m, videos = [];
    while ((m = regex.exec(gridMatch[0])) !== null) {
      videos.push({
        url: BASE_URL + m[1],
        img: m[2],
        title: m[3],
        updata: isDrama ? (m[4] || m[5] || '') : ''
      });
    }
    return videos;
  } catch (e) { return []; }
}

async function fetchDetail(detailUrl) {
  try {
    const res = await $.get({ url: detailUrl, headers: { 'User-Agent': UA, 'Referer': BASE_URL + '/' } });
    const epMatch = res?.body?.match(/total_episode":(\d+),"video_id/);
    return epMatch ? { episodes: Array.from({ length: parseInt(epMatch[1]) }, (_, i) => i + 1) } : { episodes: [] };
  } catch (e) { return { episodes: [] }; }
}

async function fetchPlayUrl(epUrl) {
  try {
    const res = await $.get({ url: epUrl, headers: { 'User-Agent': UA, 'Referer': BASE_URL + '/' } });
    const match = res?.body?.match(/previewSrc":"([\s\S]+?)","shares/);
    return match ? match[1].replace(/\\u0026/g, '&').replace(/\\u002F/gi, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&') : "";
  } catch (e) { return ""; }
}

function uint8ArrayToHex(u8) { return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join(''); }
function stringToUint8Array(str) {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xFF;
  return arr;
}

function sendResponse(status, type, body) {
  $done({ status: "HTTP/1.1 " + status, headers: { "Content-Type": type, "Access-Control-Allow-Origin": "*" }, body: body });
}

function Env(name) {
  return { get: (opts) => new Promise((res, rej) => { $task.fetch(opts).then(r => res(r), e => rej(e)); }) };
}

// --- 前端 UI 界面 ---
function getHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>AI 影视剧场</title>
  <link rel="stylesheet" href="https://cdn.staticfile.org/vant/2.12.25/index.css">
  <style>
    html, body { margin: 0; padding: 0; background-color: var(--bg) !important; transition: background-color 0.3s; min-height: 100vh; overflow-x: hidden; }
    #app { background-color: var(--bg); min-height: 100vh; color: var(--text); }
    .van-pull-refresh { background-color: var(--bg) !important; min-height: 100vh; }
    .nav-container { position: fixed; top: 0; left: 0; right: 0; z-index: 100; transition: transform 0.3s; }
    .nav-hidden { transform: translateY(-100%); }
    .van-nav-bar { background: var(--nav) !important; border: none; }
    .van-nav-bar__title, .van-nav-bar .van-icon { color: #fff !important; font-weight: bold; font-size: 20px; }
    .van-tabs__nav { background-color: var(--tab-bg) !important; }
    .van-tab { color: var(--tab-text); }
    .van-tab--active { color: var(--active); font-weight: bold; }
    .van-tabs__line { background-color: var(--active) !important; }
    .video-grid { display: flex; flex-wrap: wrap; padding: 5px; margin-top: 96px; background-color: var(--bg); }
    .video-card { width: calc(50% - 10px); margin: 5px; background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); position: relative; }
    .img-wrapper { width: 100%; height: 160px; background: #333; position: relative; display: flex; align-items: center; justify-content: center; }
    .img-wrapper img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ep-tag { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.75); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; z-index: 2; }
    .video-title { padding: 10px 8px; font-size: 14px; font-weight: 500; color: var(--text); text-align: center; line-height: 1.3; height: 38px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; justify-content: center; align-items: center; }
    .episodes-container { padding: 15px; background: var(--card); max-height: 50vh; overflow-y: auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .ep-btn { background: var(--bg); color: var(--text); padding: 12px 0; text-align: center; border-radius: 8px; font-size: 13px; border: 1px solid rgba(128,128,128,0.2); }
    .theme-sheet { padding: 25px 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; background: var(--card); border-top-left-radius: 16px; border-top-right-radius: 16px; }
    .theme-item { text-align: center; }
    .theme-circle { width: 55px; height: 55px; border-radius: 50%; margin: 0 auto 10px; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
    .theme-name { font-size: 13px; color: var(--text); }
  </style>
</head>
<body>
  <div id="app" :style="themeStyle">
    <div class="nav-container" :class="{'nav-hidden': !showNav}">
      <van-nav-bar title="AI 影视剧场">
        <template #right><van-icon name="wap-nav" @click="showThemes = true" /></template>
      </van-nav-bar>
      <van-tabs v-model="activeTab" @click="onTabChange">
        <van-tab v-for="(val, key) in categories" :title="key" :name="val" :key="val"></van-tab>
      </van-tabs>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="已经到底了" @load="onLoad">
        <div class="video-grid">
          <div class="video-card" v-for="item in list" :key="item.url" @click="openDetail(item)">
            <div class="img-wrapper">
              <van-loading v-if="!item.displayImg" type="spinner" size="20px" color="#4db6ac"></van-loading>
              <img v-else :src="item.displayImg" referrerpolicy="no-referrer" loading="eager">
              <div v-if="item.updata" class="ep-tag">{{ item.updata }}</div>
            </div>
            <div class="video-title">{{ item.title }}</div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-action-sheet v-model="showDetail" :title="currentVideo.title || '选集播放'" :close-on-click-overlay="false">
      <div class="episodes-container">
        <div v-for="ep in episodeList" :key="ep" class="ep-btn" @click="playEpisode(ep)">第 {{ ep }} 集</div>
      </div>
    </van-action-sheet>

    <van-action-sheet v-model="showThemes" title="切换配色方案">
      <div class="theme-sheet">
        <div v-for="(t, idx) in themes" :key="idx" class="theme-item" @click="changeTheme(idx)">
          <div class="theme-circle" :style="{background: t.bg}"></div>
          <div class="theme-name">{{ t.name }}</div>
        </div>
      </div>
    </van-action-sheet>

    <van-action-sheet v-model="showPlayer" :title="'正在播放 - 第 ' + currentEp + ' 集'" @closed="onPlayerClosed">
      <div style="background:#000;"><video id="mainPlayer" controls playsinline width="100%"></video></div>
      <div style="padding: 16px; font-size: 14px; text-align: center; color: var(--text); background: var(--card)" v-text="currentVideo.title"></div>
    </van-action-sheet>
  </div>

  <script src="https://cdn.staticfile.org/vue/2.6.12/vue.min.js"></script>
  <script src="https://cdn.staticfile.org/vant/2.12.25/vant.min.js"></script>
  <script src="https://cdn.staticfile.org/axios/0.21.1/axios.min.js"></script>
  <script src="https://cdn.staticfile.org/crypto-js/4.1.1/crypto-js.min.js"></script>

  <script>
    const K = CryptoJS.enc.Utf8.parse("${_IMG_KEY}");
    const I = CryptoJS.enc.Utf8.parse("${_IMG_IV}");

    async function decryptAndRenderImage(imgUrl) {
      try {
        const res = await axios.get('/hgdj/api/fetchImage?url=' + encodeURIComponent(imgUrl));
        const hex = res.data;
        if (!hex || typeof hex !== 'string') return imgUrl;

        let d = wa(CryptoJS.AES.decrypt({ ciphertext: CryptoJS.enc.Hex.parse(hex) }, K, { iv: I, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }));
        const p = d[d.length - 1];
        if (p > 0 && p <= 16 && d.slice(-p).every(b => b === p)) d = d.subarray(0, d.length - p);

        return URL.createObjectURL(new Blob([d], { type: 'image/jpeg' }));
      } catch (e) {
        return imgUrl;
      }
    }

    const wa = w => {
      const u = new Uint8Array(w.sigBytes);
      for (let i = 0; i < w.sigBytes; i++) u[i] = (w.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      return u;
    };

    new Vue({
      el: '#app',
      data: {
        activeTab: 'ai-duanju',
        categories: { 'AI短剧':'ai-duanju', 'AI漫剧':'ai-manju' },
        list: [], loading: false, finished: false, refreshing: false, page: 1, 
        showPlayer: false, showDetail: false, currentVideo: {}, episodeList: [], currentEp: 1,
        showNav: true, lastScrollTop: 0, showThemes: false,
        currIdx: localStorage.getItem('guav_theme_idx') || 0,
        themes: [
          { name: '经典绿', bg: '#2f4f38', card: '#376843', text: '#ffffff', nav: '#27432f', tab: '#376843', tabText: '#a3c2ab', active: '#ffffff' },
          { name: '经典白', bg: '#f4f5f7', card: '#ffffff', text: '#222222', nav: '#376843', tab: '#ffffff', tabText: '#666666', active: '#376843' },
          { name: '极客黑', bg: '#000000', card: '#1c1c1e', text: '#ffffff', nav: '#121212', tab: '#1c1c1e', tabText: '#8e8e93', active: '#007aff' },
          { name: '深海蓝', bg: '#0f172a', card: '#1e293b', text: '#f8fafc', nav: '#0284c7', tab: '#1e293b', tabText: '#94a3b8', active: '#38bdf8' },
          { name: '暖阳橙', bg: '#2b1b17', card: '#3d2721', text: '#fff3e0', nav: '#d97706', tab: '#3d2721', tabText: '#d97706', active: '#fbbf24' },
          { name: '优雅紫', bg: '#1a102f', card: '#271947', text: '#f3e8ff', nav: '#7c3aed', tab: '#271947', tabText: '#a78bfa', active: '#c084fc' }
        ]
      },
      computed: {
        themeStyle() {
          const t = this.themes[this.currIdx];
          return { '--bg': t.bg, '--card': t.card, '--text': t.text, '--nav': t.nav, '--tab-bg': t.tab, '--tab-text': t.tabText, '--active': t.active };
        }
      },
      mounted() { window.addEventListener('scroll', this.handleScroll); },
      methods: {
        onTabChange() { this.refreshList(); },
        refreshList() { this.list = []; this.page = 1; this.finished = false; this.loading = true; this.onLoad(); window.scrollTo(0, 0); this.showNav = true; },
        async onLoad() {
          try {
            const res = await axios.get('/hgdj/api/getVideos?type=' + this.activeTab + '&p=' + this.page);
            if (this.refreshing) { this.list = []; this.refreshing = false; }
            if (res.data && res.data.length > 0) {
              const newItems = res.data;
              this.list.push(...newItems);
              this.page++;
              
              newItems.forEach(async item => {
                const blobUrl = await decryptAndRenderImage(item.img);
                this.$set(item, 'displayImg', blobUrl);
              });
            } else { this.finished = true; }
          } catch(e) { this.$toast('加载失败'); } finally { this.loading = false; }
        },
        onRefresh() { this.page = 1; this.finished = false; this.onLoad(); },
        async openDetail(item) {
          this.currentVideo = item;
          this.$toast.loading({ message: '加载剧集...', forbidClick: true });
          const res = await axios.get('/hgdj/api/getDetail?url=' + encodeURIComponent(item.url));
          this.$toast.clear();
          if (res.data && res.data.episodes && res.data.episodes.length > 0) {
            this.episodeList = res.data.episodes;
            this.showDetail = true;
          } else { this.$toast('暂无播放资源'); }
        },
        async playEpisode(ep) {
          this.currentEp = ep;
          this.$toast.loading({ message: '解析视频...', forbidClick: true });
          const res = await axios.get('/hgdj/api/getPlayUrl?url=' + encodeURIComponent(this.currentVideo.url + 'ep-' + ep));
          this.$toast.clear();
          if (res.data && res.data.url) {
            this.showPlayer = true;
            this.$nextTick(() => { const p = document.getElementById('mainPlayer'); p.src = res.data.url; p.play(); });
          } else { this.$toast('无法解析播放地址'); }
        },
        onPlayerClosed() { const p = document.getElementById('mainPlayer'); if (p) { p.pause(); p.src = ''; p.load(); } },
        handleScroll() {
          const st = window.pageYOffset || document.documentElement.scrollTop;
          this.showNav = !(st > this.lastScrollTop && st > 100);
          this.lastScrollTop = st <= 0 ? 0 : st;
        },
        changeTheme(idx) { this.currIdx = idx; localStorage.setItem('guav_theme_idx', idx); this.showThemes = false; }
      }
    });
  </script>
</body>
</html>
`;
}

getParam = function(url, name) {
  try {
    return new URLSearchParams(url.split('?')[1] || '').get(name);
  } catch (e) {
    const m = url.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
}

main();
