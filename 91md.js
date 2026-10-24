/**
 * 91MD 终极修复版
 * 1. 修复:播放器白色边框刺眼 (沉浸式背景覆盖)
 * 2. 修复:播放器下方标题不显示 (数据挂载优化)
 */

const $ = new Env("91MD_Final_v3");
const BASE_URL = 'https://91md.me';
const WEB_PATH = '/91md'; 

const CATEGORIES = {
    '麻豆视频':'1', '成人头条':'9', '开心鬼传媒':'25', '蜜桃传媒':'4',
    '皇家华人':'5', '星空传媒':'6', '精东影业':'7', '乐播传媒':'8',
    '91制片厂':'2', '乌鸦传媒':'10', '兔子先生':'20', '杏吧原创':'21',
    '玩偶姐姐':'22', 'mini传媒':'23', '天美传媒':'3', '大象传媒':'24',
    '萝莉社':'29', 'PsychoPorn':'26', '糖心Vlog':'27'
};

async function handleRequest() {
  const url = $request.url;
  if (url.indexOf('/api/getVideos') !== -1) {
    const type = getParam(url, 'type') || '1';
    const page = getParam(url, 'p') || '1';
    const keyword = getParam(url, 'keyword') || '';
    const data = await fetchVideos(type, page, keyword);
    sendResponse(200, "application/json", JSON.stringify(data));
  } else if (url.indexOf('/api/getPlayUrl') !== -1) {
    const detailUrl = getParam(url, 'url');
    const playUrl = await fetchPlayUrl(detailUrl);
    sendResponse(200, "application/json", JSON.stringify({ url: playUrl }));
  } else {
    sendResponse(200, "text/html", getHTML());
  }
}

async function fetchVideos(typeId, page, keyword) {
  let target = `${BASE_URL}/index.php/vod/type/id/${typeId}/page/${page}.html`;
  if (keyword) target = `${BASE_URL}/index.php/vod/search/page/${page}/wd/${encodeURIComponent(keyword)}.html`;
  try {
    const res = await $.get({
      url: target,
      headers: { 'Host': '91md.me', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU OS 17_0 like Mac OS X)' }
    });
    const regex = /href="([^"]+)" alt="">[\s\S]+?<img class="lazy" src="([^"]+)" alt=.*?title="([^"]+)">[\s\S]+?time">\s*(\d+-\d+)\s*<\/div>\s*<div class="view">\s*(\d+)次/g;
    let matches, videos = [];
    while ((matches = regex.exec(res.body)) !== null) {
      videos.push({ url: BASE_URL + matches[1], img: matches[2], title: matches[3], updata: matches[4], views: matches[5] });
    }
    return videos;
  } catch (e) { return []; }
}

async function fetchPlayUrl(detailUrl) {
  try {
    const res = await $.get({ url: detailUrl });
    const match = res.body.match(/url":"(.*?)","url_next/);
    return match ? match[1].replace(/\\/g, '') : "";
  } catch (e) { return ""; }
}

function getHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>91MD Pro</title>
  <link rel="stylesheet" href="https://cdn.staticfile.org/vant/2.12.25/index.css">
  <style>
    :root { --bg: #000; --text: #eee; --nav: #000; --glass: rgba(30,30,30,0.95); --active: #4db6ac; }
    html, body { margin: 0; padding: 0; min-height: 100vh; background: var(--bg) fixed !important; font-family: sans-serif; }
    #app { color: var(--text); padding-top: 100px; }
    
    /* 播放器弹窗背景全黑化,消除白色边框 */
    .van-action-sheet { background: var(--glass) !important; color: #fff !important; }
    .van-action-sheet__header { background: transparent !important; color: #fff !important; }
    .van-action-sheet__content { background: transparent !important; }
    
    .nav-container { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
    .van-nav-bar { background: var(--nav) !important; border: none; }
    .van-nav-bar__title { color: #fff !important; font-weight: bold; }
    .van-tabs__nav { background: transparent !important; }
    .van-tab { color: #888; }
    .van-tab--active { color: var(--active) !important; font-weight: bold; }
    .video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
    .video-card { background: rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
    .img-wrapper { width: 100%; height: 105px; background: #333; }
    .img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .info-box { padding: 8px; }
    .video-title { font-size: 12px; height: 34px; line-height: 1.4; overflow: hidden; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 5px; }
    .video-meta { font-size: 9px; color: #888; display: flex; justify-content: space-between; }
    .player-container { background:#000; min-height: 200px; position: relative; }
    .player-title { padding: 16px; font-size: 14px; line-height: 1.5; color: #fff !important; font-weight: 500; background: rgba(0,0,0,0.2); }
  </style>
</head>
<body :style="themeStyle">
  <div id="app">
    <div class="nav-container">
      <van-nav-bar title="91MD Pro">
        <template #left><van-icon name="search" color="#fff" @click="showSearch = true" /></template>
        <template #right><van-icon name="wap-nav" color="#fff" @click="showThemes = true" /></template>
      </van-nav-bar>
      <van-tabs v-model="activeTab" @click="onTabChange">
        <van-tab v-for="(id, name) in categories" :title="name" :name="id" :key="id"></van-tab>
      </van-tabs>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="到底了" @load="onLoad">
        <div class="video-grid">
          <div class="video-card" v-for="item in list" :key="item.url" @click="playVideo(item)">
            <div class="img-wrapper"><img :src="item.img" referrerpolicy="no-referrer"></div>
            <div class="info-box"><div class="video-title">{{ item.title }}</div><div class="video-meta"><span>📅 {{item.updata}}</span><span>👁 {{item.views}}</span></div></div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-action-sheet v-model="showPlayer" @closed="onPlayerClosed">
      <div class="player-container">
        <van-loading v-if="playerLoading" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)" type="spinner">解析中...</van-loading>
        <video id="mainPlayer" controls playsinline width="100%"></video>
      </div>
      <div class="player-title" v-if="currentVideo.title">{{ currentVideo.title }}</div>
    </van-action-sheet>

    <van-popup v-model="showSearch" position="top" style="background:#1a1a1a"><van-search v-model="tempKeyword" placeholder="搜索..." background="transparent" @search="onSearch" show-action><template #action><div @click="onSearch" style="color:#fff">搜索</div></template></van-search></van-popup>

    <van-action-sheet v-model="showThemes" title="主题选择">
      <div style="padding:20px; display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; text-align:center;">
        <div v-for="(t, i) in themes" :key="i" @click="changeTheme(i)"><div :style="{background: t.bg, width:'40px', height:'40px', borderRadius:'50%', margin:'0 auto', border:'2px solid #fff'}"></div><p style="font-size:12px; color:#eee">{{t.name}}</p></div>
      </div>
    </van-action-sheet>
  </div>

  <script src="https://cdn.staticfile.org/vue/2.6.12/vue.min.js"></script>
  <script src="https://cdn.staticfile.org/vant/2.12.25/vant.min.js"></script>
  <script src="https://cdn.staticfile.org/axios/0.21.1/axios.min.js"></script>

  <script>
    const WEB_PATH = '${WEB_PATH}';
    new Vue({
      el: '#app',
      data: {
        activeTab: '1', categories: ${JSON.stringify(CATEGORIES)},
        list: [], loading: false, finished: false, refreshing: false, page: 1, 
        showPlayer: false, currentVideo: {title:''}, playerLoading: false, 
        showThemes: false, showSearch: false, keyword: '', tempKeyword: '',
        currIdx: localStorage.getItem('91md_theme_idx') || 1,
        themes: [
          { name: '清新', bg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', nav: '#376843', active: '#376843' },
          { name: '极客黑', bg: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', nav: '#000', active: '#4db6ac' },
          { name: '深海', bg: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)', nav: '#010409', active: '#58a6ff' }
        ]
      },
      computed: { themeStyle() { return { '--bg': this.themes[this.currIdx].bg, '--nav': this.themes[this.currIdx].nav, '--active': this.themes[this.currIdx].active }; } },
      methods: {
        async playVideo(item) {
          this.currentVideo = item; // 立即同步数据
          this.showPlayer = true;
          this.playerLoading = true;
          try {
            const res = await axios.get(WEB_PATH + '/api/getPlayUrl?url=' + encodeURIComponent(item.url));
            this.playerLoading = false;
            this.$nextTick(() => {
              const p = document.getElementById('mainPlayer');
              if (p && res.data.url) { p.src = res.data.url; p.play(); }
            });
          } catch (e) { this.playerLoading = false; this.$toast('解析失败'); }
        },
        onPlayerClosed() {
          const p = document.getElementById('mainPlayer');
          if (p) { p.pause(); p.removeAttribute('src'); p.load(); }
        },
        onSearch() { this.keyword = this.tempKeyword; this.showSearch = false; this.refreshList(); },
        onTabChange() { this.keyword = ''; this.refreshList(); },
        refreshList() { this.list = []; this.page = 1; this.finished = false; this.loading = true; this.onLoad(); },
        async onLoad() {
          try {
            const res = await axios.get(WEB_PATH + '/api/getVideos?type=' + this.activeTab + '&p=' + this.page + '&keyword=' + this.keyword);
            if (this.refreshing) { this.list = []; this.refreshing = false; }
            if (res.data && res.data.length > 0) { this.list.push(...res.data); this.page++; } else { this.finished = true; }
          } catch(e) { this.$toast('加载失败'); } finally { this.loading = false; }
        },
        onRefresh() { this.page = 1; this.finished = false; this.onLoad(); },
        changeTheme(i) { this.currIdx = i; localStorage.setItem('91md_theme_idx', i); this.showThemes = false; }
      }
    });
  </script>
</body>
</html>
`;
}

function getParam(url, name) { const m = url.match(new RegExp('[?&]' + name + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; }
function sendResponse(s, t, b) { $done({ status: "HTTP/1.1 " + s, headers: { "Content-Type": t, "Access-Control-Allow-Origin": "*" }, body: b }); }
function Env(n) { return { get: (o) => new Promise((res) => { $task.fetch(o).then(r => res(r)); }) }; }
handleRequest();
