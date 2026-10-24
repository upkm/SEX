/**
 * 黄色仓库 搜索文字修复版
 * 修复:深色模式下搜索框文字看不清的问题
 */

const $ = new Env("HSCK_Player");
const BASE_URL = 'https://hsck123.25img.com';

async function handleRequest() {
  const url = $request.url;
  if (url.indexOf('/api/getVideos') !== -1) {
    const type = getParam(url, 'type') || 'ycgc';
    const page = getParam(url, 'p') || '1';
    const keyword = getParam(url, 'keyword') || '';
    const data = await fetchVideos(type, page, keyword);
    sendResponse(200, "application/json", JSON.stringify(data));
  } else if (url.indexOf('/api/getPlayUrl') !== -1) {
    const detailUrl = getParam(url, 'url');
    const playUrl = await fetchPlayUrl(detailUrl);
    sendResponse(200, "application/json", JSON.stringify({ url: playUrl }));
  } else if (url.indexOf('/hsck') !== -1) {
    sendResponse(200, "text/html", getHTML());
  }
}

// --- 后端抓取逻辑 ---
async function fetchVideos(type, page, keyword) {
  let target = `${BASE_URL}/?type=${type}&p=${page}`;
  if (keyword) {
    target = `${BASE_URL}/?p=${page}&search2=ndafeoafa&search=${encodeURIComponent(keyword)}`;
  }
  try {
    const res = await $.get({
      url: target,
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }
    });
    const regex = /lazyload"\s+href="(.*?)"\s+target="_blank"\s+title="(.*?)"\s+data-original="(.*?)"\s+style="display/g;
    let matches;
    const videos = [];
    while ((matches = regex.exec(res.body)) !== null) {
      let imgAddr = matches[3];
      if (!imgAddr.startsWith('http')) imgAddr = BASE_URL + (imgAddr.startsWith('/') ? '' : '/') + imgAddr;
      videos.push({ url: BASE_URL + matches[1], title: matches[2], img: imgAddr });
    }
    return videos;
  } catch (e) { return []; }
}

async function fetchPlayUrl(url) {
  const res = await $.get({ url: url });
  const match = res.body.match(/jpg"\s+src="(.*?)"/);
  return match ? match[1] : "";
}

// --- 前端 UI 界面 ---
function getHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>黄色仓库</title>
  <link rel="stylesheet" href="https://cdn.staticfile.org/vant/2.12.25/index.css">
  <style>
    html, body { margin: 0; padding: 0; background-color: var(--bg) !important; transition: background-color 0.3s; min-height: 100vh; overflow-x: hidden; }
    #app { background-color: var(--bg); min-height: 100vh; color: var(--text); }
    .van-pull-refresh { background-color: var(--bg) !important; min-height: 100vh; }
    .nav-container { position: fixed; top: 0; left: 0; right: 0; z-index: 100; transition: transform 0.3s; }
    .nav-hidden { transform: translateY(-100%); }
    .van-nav-bar { background: var(--nav) !important; border: none; }
    .van-nav-bar__title { color: #fff !important; font-weight: bold; }
    .van-nav-bar .van-icon { color: #fff !important; font-size: 20px; }
    .van-tabs__nav { background-color: var(--tab-bg) !important; }
    .van-tab { color: var(--tab-text); }
    .van-tab--active { color: var(--active); font-weight: bold; }
    .van-tabs__line { background-color: var(--active) !important; }
    .video-grid { display: flex; flex-wrap: wrap; padding: 5px; margin-top: 96px; background-color: var(--bg); }
    .video-card { width: calc(50% - 10px); margin: 5px; background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
    .img-wrapper { width: 100%; height: 110px; background: #333; position: relative; }
    .img-wrapper img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .video-title { padding: 8px; font-size: 12px; color: var(--text); line-height: 1.4; height: 34px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    /* 搜索面板增强修复 */
    .search-container { padding: 15px; background: var(--card); border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; }
    .van-search { padding: 0; background: transparent !important; }
    .search-input-field { background: var(--bg) !important; border-radius: 8px; margin-bottom: 15px; border: 1px solid rgba(128,128,128,0.3); }
    
    /* 关键修复:强制搜索框文字颜色 */
    .search-input-field input { color: var(--text) !important; }
    .search-input-field input::placeholder { color: var(--tab-text) !important; opacity: 0.8; }
    .van-search__content { background: transparent !important; }
    .van-search__action { color: var(--active) !important; font-weight: bold; padding-left: 10px; }
    
    .search-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .search-tag { padding: 6px 15px; background: var(--bg); border-radius: 20px; font-size: 13px; color: var(--text); border: 1px solid rgba(128,128,128,0.2); }
    
    .theme-sheet { padding: 25px 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; background: var(--card); border-top-left-radius: 16px; border-top-right-radius: 16px; }
    .theme-item { text-align: center; }
    .theme-circle { width: 55px; height: 55px; border-radius: 50%; margin: 0 auto 10px; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
  </style>
</head>
<body :class="{'dark-mode': isDark}">
  <div id="app" :style="themeStyle">
    <div class="nav-container" :class="{'nav-hidden': !showNav}">
      <van-nav-bar title="黄色仓库">
        <template #left><van-icon name="search" @click="showSearch = true" /></template>
        <template #right><van-icon name="wap-nav" @click="showThemes = true" /></template>
      </van-nav-bar>
      <van-tabs v-model="activeTab" @click="onTabChange">
        <van-tab v-for="(val, key) in categories" :title="key" :name="val" :key="val"></van-tab>
      </van-tabs>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" :finished-text="keyword ? '搜索完毕' : '已经到底了'" @load="onLoad">
        <div class="video-grid">
          <div class="video-card" v-for="item in list" :key="item.url" @click="playVideo(item)">
            <div class="img-wrapper"><img :src="item.img" referrerpolicy="no-referrer" loading="eager"></div>
            <div class="video-title">{{ item.title }}</div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-popup v-model="showSearch" position="top" round>
      <div class="search-container">
        <van-search
          v-model="tempKeyword"
          placeholder="请输入关键字..."
          class="search-input-field"
          show-action
          @search="onManualSearch"
        >
          <template #action><div @click="onManualSearch">搜索</div></template>
        </van-search>
        <div style="font-weight:bold; margin-bottom:12px; font-size:13px; color:var(--text)">热门关键词</div>
        <div class="search-tags">
          <div v-for="word in hotWords" :key="word" class="search-tag" @click="doQuickSearch(word)">{{ word }}</div>
        </div>
      </div>
    </van-popup>

    <van-action-sheet v-model="showThemes" title="切换配色方案">
      <div class="theme-sheet">
        <div v-for="(t, idx) in themes" :key="idx" class="theme-item" @click="changeTheme(idx)">
          <div class="theme-circle" :style="{background: t.bg}"></div>
          <div class="theme-name">{{ t.name }}</div>
        </div>
      </div>
    </van-action-sheet>

    <van-action-sheet v-model="showPlayer" title="正在播放" @closed="onPlayerClosed">
      <div style="background:#000;"><video id="mainPlayer" controls playsinline width="100%"></video></div>
      <div style="padding: 16px; font-size: 14px; color: var(--text); background: var(--card)">{{ currentVideo.title }}</div>
    </van-action-sheet>
  </div>

  <script src="https://cdn.staticfile.org/vue/2.6.12/vue.min.js"></script>
  <script src="https://cdn.staticfile.org/vant/2.12.25/vant.min.js"></script>
  <script src="https://cdn.staticfile.org/axios/0.21.1/axios.min.js"></script>

  <script>
    new Vue({
      el: '#app',
      data: {
        activeTab: 'ycgc',
        categories: {'国产新片':'ycgc','无码中字':'wz','有码中字':'yz','日本无码':'rw','日本有码':'ry','国产视频':'gc','欧美高清':'om','动漫剧情':'dm'},
        list: [], loading: false, finished: false, refreshing: false, page: 1, 
        showPlayer: false, currentVideo: {}, showNav: true, lastScrollTop: 0,
        showThemes: false, showSearch: false, keyword: '', tempKeyword: '',
        hotWords: ['探花', '乱伦', '姐姐', '妹妹', '双飞', '3p', '麻豆'],
        currIdx: localStorage.getItem('hsck_theme_idx') || 1,
        themes: [
          { name: '经典白', bg: '#f2f3f5', card: '#ffffff', text: '#333', nav: '#255858', tab: '#fff', tabText: '#888', active: '#255858' },
          { name: '极客黑', bg: '#000000', card: '#161616', text: '#999', nav: '#000', tab: '#161616', tabText: '#555', active: '#4db6ac' },
          { name: '深海蓝', bg: '#0d1117', card: '#161b22', text: '#c9d1d9', nav: '#010409', tab: '#161b22', tabText: '#8b949e', active: '#58a6ff' },
          { name: '护眼绿', bg: '#d6e4d0', card: '#ffffff', text: '#444', nav: '#4e6e81', tab: '#fff', tabText: '#999', active: '#4e6e81' },
          { name: '灰褐棕', bg: '#1a1616', card: '#2d2727', text: '#eee', nav: '#000', tab: '#2d2727', tabText: '#888', active: '#810ca8' },
          { name: '暗紫色', bg: '#121016', card: '#1c1a26', text: '#b0b0b0', nav: '#0d0c12', tab: '#1c1a26', tabText: '#666', active: '#9d85ff' }
        ]
      },
      computed: {
        themeStyle() {
          const t = this.themes[this.currIdx];
          return {
            '--bg': t.bg, '--card': t.card, '--text': t.text, '--nav': t.nav,
            '--tab-bg': t.tab, '--tab-text': t.tabText, '--active': t.active
          };
        }
      },
      mounted() { window.addEventListener('scroll', this.handleScroll); },
      methods: {
        doQuickSearch(word) { this.keyword = word; this.tempKeyword = word; this.showSearch = false; this.refreshList(); },
        onManualSearch() { if (!this.tempKeyword) return; this.keyword = this.tempKeyword; this.showSearch = false; this.refreshList(); },
        onTabChange() { this.keyword = ''; this.tempKeyword = ''; this.refreshList(); },
        refreshList() { this.list = []; this.page = 1; this.finished = false; this.loading = true; this.onLoad(); window.scrollTo(0, 0); this.showNav = true; },
        async onLoad() {
          try {
            const res = await axios.get('/hsck/api/getVideos?type=' + this.activeTab + '&p=' + this.page + '&keyword=' + this.keyword);
            if (this.refreshing) { this.list = []; this.refreshing = false; }
            if (res.data && res.data.length > 0) { this.list.push(...res.data); this.page++; } 
            else { this.finished = true; }
          } catch(e) { this.$toast('加载失败'); } finally { this.loading = false; }
        },
        onRefresh() { this.page = 1; this.finished = false; this.onLoad(); },
        async playVideo(item) {
          this.currentVideo = item;
          this.$toast.loading({ message: '解析中...', forbidClick: true });
          const res = await axios.get('/hsck/api/getPlayUrl?url=' + item.url);
          this.$toast.clear(); this.showPlayer = true;
          this.$nextTick(() => { const p = document.getElementById('mainPlayer'); p.src = res.data.url; p.play(); });
        },
        onPlayerClosed() { const p = document.getElementById('mainPlayer'); if (p) { p.pause(); p.src = ''; p.load(); } },
        handleScroll() {
          const st = window.pageYOffset || document.documentElement.scrollTop;
          if (st > this.lastScrollTop && st > 100) this.showNav = false;
          else this.showNav = true;
          this.lastScrollTop = st <= 0 ? 0 : st;
        },
        changeTheme(idx) { this.currIdx = idx; localStorage.setItem('hsck_theme_idx', idx); this.showThemes = false; }
      }
    });
  </script>
</body>
</html>
`;
}

function getParam(url, name) {
  const m = url.match(new RegExp('[?&]' + name + '=([^&]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function sendResponse(status, type, body) {
  $done({ status: "HTTP/1.1 " + status, headers: { "Content-Type": type, "Access-Control-Allow-Origin": "*" }, body: body });
}
function Env(name) {
  return { get: (opts) => new Promise((res) => { $task.fetch(opts).then(r => res(r)); }) };
}
handleRequest();
