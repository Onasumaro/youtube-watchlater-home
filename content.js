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
    const initialData = parseYouTubeInitialData(html);

    if (!initialData) return videos;

    walkYouTubeData(initialData, "playlistVideoRenderer", renderer => {
        if (videos.length >= 10) return;

        const videoId = renderer.videoId;
        const title = getTitleText(renderer.title);

        if (!videoId || !title) return;

        if (!videos.some(video => video.videoId === videoId)) {
            videos.push({
                videoId,
                title,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                thumbnail: getThumbnailUrl(renderer.thumbnail, videoId)
            });
        }
    });

    return videos;
}

function parseYouTubeInitialData(html) {
    const marker = "ytInitialData";
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) return null;

    const start = html.indexOf("{", markerIndex);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < html.length; i++) {
        const char = html[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === "{") {
            depth++;
        } else if (char === "}") {
            depth--;

            if (depth === 0) {
                try {
                    return JSON.parse(html.slice(start, i + 1));
                } catch (error) {
                    console.error(error);
                    return null;
                }
            }
        }
    }

    return null;
}

function walkYouTubeData(value, rendererKey, onVideoRenderer) {
    if (!value || typeof value !== "object") return;

    const renderer = value[rendererKey];
    if (renderer) {
        onVideoRenderer(renderer);
    }

    if (Array.isArray(value)) {
        value.forEach(item => walkYouTubeData(item, rendererKey, onVideoRenderer));
        return;
    }

    Object.values(value).forEach(item => walkYouTubeData(item, rendererKey, onVideoRenderer));
}

function getTitleText(title) {
    if (!title) return "";
    if (title.simpleText) return title.simpleText;
    if (Array.isArray(title.runs)) {
        return title.runs.map(run => run.text || "").join("");
    }
    return "";
}

function getThumbnailUrl(thumbnail, videoId) {
    const thumbnails = thumbnail && thumbnail.thumbnails;

    if (Array.isArray(thumbnails) && thumbnails.length > 0) {
        return thumbnails[thumbnails.length - 1].url;
    }

    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
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

        const thumbnail = document.createElement("img");
        thumbnail.src = video.thumbnail;
        thumbnail.alt = "";

        const title = document.createElement("div");
        title.className = "watch-later-title";
        title.textContent = video.title;

        item.append(thumbnail, title);

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
