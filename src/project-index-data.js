/** Single source of truth for project index / detail copy. Re-run bake after edits. */
export const PROJECT_INDEX_ITEMS = [
    {
        slug: 'good-people-posting',
        title: 'Good People Posting',
        description: 'A blogspace for a community of writers outside algorithmic publishing. TipTap with custom text blocks and annotated comment threads for discussion that stays on the page.',
        url: 'https://goodpeople.build',
    },
    {
        slug: 'weirdattachments-online',
        title: 'weirdattachments.online',
        description: 'Texts published and republished in kindle form on mobile, pdf reader form on desktop. Custom editorial blocks; the work of making a book that keeps becoming.',
        url: 'https://weirdattachments.online',
    },
    {
        slug: 'fall11',
        title: 'fall11',
        description: 'imagenet-fall11 collaged on canvas; a custom SD-XL pipeline out-paints the gaps, in-paints the grain — an imagined topology between model and data.',
        url: 'https://sites.gold.ac.uk/ma-mfa-computationalarts/tian-breznik/',
    },
    {
        slug: 'blink-a-link',
        title: 'blink-a-link',
        description: 'With Ana Meisel. A page in memory of the HTML blink tag, rebuilt from live feeds on every reload. Exhibited at Alkatraz Gallery, Ljubljana.',
        url: 'https://blink.tian.ana.help',
        writeUpUrl: 'https://galerijalkatraz.org/?p=20186',
    },
    {
        slug: 'garden-painting',
        title: 'Garden Painting',
        description: 'SketchRNN and a simulated watercolor pen. Seventy-six doodle classes compose a garden on each reload, the way a child fills a page and starts again.',
        url: 'https://tianbreznik.github.io/earthly-delights/',
    },
    {
        slug: 'maribor-on-sea',
        title: 'Maribor-on-Sea',
        description: 'Geocities gifs collaged into a township stuck on loop. Scraped from 656 GB of archive; the present moment put on repeat.',
        url: 'https://vimeo.com/943587649',
    },
    {
        slug: 'twitter-fatigue',
        title: 'twitter fatigue',
        description: 'Hashtag archives from 2021, filtered through pandas and rendered in three.js. Each dot a tweet, each line a thread; mapping discourse as a mess.',
        url: 'https://tianbreznik.github.io/mementowip/index.html',
    },
];

export function projectTextureUrl(slug, name) {
    return `/project-textures/${slug}/${name}.png`;
}
