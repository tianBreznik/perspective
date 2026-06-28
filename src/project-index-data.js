/** Single source of truth for project index / detail copy. Re-run bake after edits. */
export const PROJECT_INDEX_ITEMS = [
    {
        slug: 'good-people-posting',
        title: 'Good People Posting',
        meta: { year: '2026', medium: 'web', context: 'community publishing' },
        collaborator: 'Silas Anker Saggau, PhD',
        description: 'A blogspace for a community of writers outside algorithmic publishing. No feeds, no ranking: discussion stays on the page. Built on TipTap with custom ProseMirror blocks for long form writing, plus inline annotation and threaded comment layers so readers can respond to specific passages without leaving the text.',
        url: 'https://goodpeople.build',
    },
    {
        slug: 'weirdattachments-online',
        title: 'weirdattachments.online',
        meta: { year: '2025', medium: 'editorial', context: 'publishing website' },
        commission: 'Ema Maznik Antiċ',
        description: 'A self-publishing book site built around a fully custom rich text editor: epigraphs, poetry blocks, footnotes, chapter titles and subtitles, per chapter backgrounds and page frames, and real time karaoke style highlighting synced to audio. Desktop renders as a PDF attachment reader; on mobile as an elevated kindle layout. Each author update snapshots a new edition of the book, a new attachment.',
        url: 'https://weirdattachments.online',
    },
    {
        slug: 'fall11',
        title: 'fall11',
        meta: { year: '2024', medium: 'collage + ML', context: 'Goldsmiths MA' },
        description: 'Physical collage of imagenet fall11 printed on photo paper, mounted in vintage frames, then fed back through a custom Stable Diffusion XL pipeline trained on the same dataset. Outpainting extends the canvas into the gaps between images; inpainting retouches grain and seam. An imagined topology between model weights and photographic surface, machine opacity and the picture.',
        url: 'https://sites.gold.ac.uk/ma-mfa-computationalarts/tian-breznik/',
    },
    {
        slug: 'blink-a-link',
        title: 'blink-a-link',
        meta: { year: '2024', medium: 'web', context: 'Alkatraz Gallery' },
        collaborator: 'Ana Meisel',
        description: 'A browser installation for Unfamiliar Area, Galerija Alkatraz: a speculative page that reinstates the deprecated HTML blink tag as live infrastructure. On every reload the DOM is rebuilt from scraped feeds; blink cadence and source material shift with the network. Page and viewer stare back at each other, updating the same systems together.',
        url: 'https://blink.tian.ana.help',
        writeUpUrl: 'https://galerijalkatraz.org/?p=20186',
        writeUpLabel: 'Galerija Alkatraz',
    },
    {
        slug: 'garden-painting',
        title: 'Garden Painting',
        meta: { year: '2023', medium: 'interactive', context: 'SketchRNN' },
        description: 'After a child\'s chalk and watercolor doodles on fridges and summer pavement. Google\'s SketchRNN runs in the browser, sampling from 76 trained doodle classes (pool, cat, owl, bear, butterfly and more) while a simulated watercolor pen lays stroke. Each reload composes a new garden; the model never draws the same page twice.',
        url: 'https://tianbreznik.github.io/earthly-delights/',
    },
    {
        slug: 'maribor-on-sea',
        title: 'Maribor-on-Sea',
        meta: { year: '2024', medium: 'video', context: 'Geocities archive' },
        description: 'Thousands of animated gifs recovered from a 656 GB Geocities archive, collaged into a single looping cityscape. Maribor relocated after Italo Calvino\'s Invisible Cities. The township runs on a fixed timeline, trapped in one moment. As installation, an I Spy exercise: a catalogue lists every gif by descriptor.',
        url: 'https://vimeo.com/943587649',
    },
    {
        slug: 'twitter-fatigue',
        title: 'twitter fatigue',
        meta: { year: '2021', medium: 'data viz', context: 'hashtag archives' },
        description: 'Hashtag archives from 2021, cleaned with pandas and rendered in three.js. An attempt to map how long topic specific discourse stays relevant before information fatigue sets in. Each vertex is a tweet; edges mark reply threads. Navigate the volume like a spaceship through the dataset. No clusters form, only a tangled, formless arrangement of debate in time.',
        url: 'https://tianbreznik.github.io/mementowip/index.html',
    },
];

/** Side margins — title, body, and footer share one vertical axis. */
export const PROJECT_DETAIL_SIDE_MARGIN = 0.14;

function linkHostLabel(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

/**
 * Portfolio-style footer: link (left) · category (center) · year (right).
 * Credits sit in a small line just above the footer row.
 * Footer link opens writeUpUrl when set, otherwise item.url.
 */
export function buildProjectDetailFooter(item) {
    const m = item.meta;
    let link = null;
    if (item.writeUpUrl) {
        link = {
            text: item.writeUpLabel || linkHostLabel(item.writeUpUrl),
            href: item.writeUpUrl,
        };
    } else if (item.url) {
        const text = linkHostLabel(item.url);
        if (text) link = { text, href: item.url };
    }
    let category = null;
    let year = null;
    if (m && typeof m === 'object' && !Array.isArray(m)) {
        category = m.context || m.medium || null;
        if (m.year) year = String(m.year);
    } else if (Array.isArray(item.meta) && item.meta.length) {
        category = item.meta[item.meta.length - 1] || null;
        if (item.meta[0] && /^\d{4}$/.test(String(item.meta[0]))) {
            year = String(item.meta[0]);
        }
    }
    const credits = [];
    if (item.collaborator) credits.push(`With ${item.collaborator}`);
    if (item.commission) credits.push(`For ${item.commission}`);
    return { link, category, year, credits };
}

export function projectTextureUrl(slug, name) {
    return `/project-textures/${slug}/${name}.png`;
}
