function isYouTubeHome() {
    return location.pathname === "/";
}

function createContainer() {
    if (document.getElementById("watch-later-home-box")) return null;

    const container = document.createElement("div");
    container.id = "watch-later-home-box";

    const title = document.createElement("h2");
    title.textContent = "後で見る";
    container.appendChild(title);

    const list = document.createElement("div");
    list.id = "watch-later-video-list";
    container.appendChild(list);

    const target = document.querySelector("ytd-rich-grid-renderer") || document.body;
    target.prepend(container);

    return list;
}

async function fetchWatchLaterPage() {
    const response = await fetch("https://www.youtube.com/playlist?list=WL", {
        credentials: "include"
    });

    return await response.text();
}

function extractVideosFromHTML(html) {
    const videos = [];

    const videoRegex = /"videoId":"(.*?)".*?"title":\{"runs":\[\{"text":"(.*?)"\}\]/g;

    let match;

    while ((match = videoRegex.exec(html)) !== null) {
        const videoId = match[1];
        const title = match[2];

        if (!videos.some(video => video.videoId === videoId)) {
            videos.push({
                videoId,
                title,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            });
        }

        if (videos.length >= 10) break;
    }

    return videos;
}

function renderVideos(videos, list) {
    list.innerHTML = "";

    if (videos.length === 0) {
        list.textContent = "後で見る動画を取得できませんでした。";
        return;
    }

    videos.forEach(video => {
        const item = document.createElement("a");
        item.className = "watch-later-item";
        item.href = video.url;

        item.innerHTML = `
      <img src="${video.thumbnail}" alt="">
      <div class="watch-later-title">${video.title}</div>
    `;

        list.appendChild(item);
    });
}

async function showWatchLaterOnHome() {
    if (!isYouTubeHome()) return;

    const list = createContainer();
    if (!list) return;

    list.textContent = "読み込み中...";

    try {
        const html = await fetchWatchLaterPage();
        const videos = extractVideosFromHTML(html);
        renderVideos(videos, list);
    } catch (error) {
        console.error(error);
        list.textContent = "後で見る動画の読み込みに失敗しました。";
    }
}

setInterval(showWatchLaterOnHome, 1500);