"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { DEPLOYED_FILES, SITE_ORIGIN, SERVABLE_EXTENSIONS } = require("./manifest.js");

const ROOT = path.join(__dirname, "..");
const TITLE_MAX = 70;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 200;
const VOID_TAGS = new Set(["meta", "link", "img", "br", "hr", "input"]);
const PAGES = DEPLOYED_FILES.filter((file) => file.endsWith(".html"));

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const attr = (tag, name) => {
    const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
    return match ? match[1] : null;
};
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) || [];
const canonicalOf = (html) => {
    const link = tags(html, "link").find((tag) => attr(tag, "rel") === "canonical");
    return link ? attr(link, "href") : null;
};
const idsIn = (html) => new Set((html.match(/\sid="([^"]+)"/g) || []).map((m) => m.slice(5, -1)));

// The host serves "portfolio/index.html" at "/portfolio" (no trailing slash; "/portfolio/" redirects there),
// so relative references resolve against that served address, as the browser does.
const servedPath = (page) => `/${page.replace(/(^|\/)index\.html$/, "")}`;
const fileFor = (servedTarget) => {
    const stripped = servedTarget.replace(/^\//, "");
    if (stripped === "" || stripped.endsWith("/")) return `${stripped}index.html`;
    if (DEPLOYED_FILES.includes(stripped)) return stripped;
    return `${stripped}/index.html`;
};
const resolveLocal = (page, reference) => {
    const [target, fragment = ""] = reference.split("#");
    const served = servedPath(page);
    const resolved = target === "" ? served : path.posix.normalize(path.posix.join(path.posix.dirname(served), target));
    return { file: fileFor(resolved), fragment };
};

const isExternal = (reference) => /^(https?:|mailto:|data:|tel:)/.test(reference);

test("every deployed file exists and has an extension the site host serves", () => {
    DEPLOYED_FILES.forEach((file) => {
        assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is in the deploy manifest but missing on disk`);
        assert.ok(SERVABLE_EXTENSIONS.includes(path.extname(file)), `${file}: ${path.extname(file)} is not served from the custom domain`);
    });
});

for (const page of PAGES) {
    const html = read(page);

    test(`${page}: markup is balanced`, () => {
        const stack = [];
        const pattern = /<(\/)?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/)?>/g;
        const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
        let match;
        while ((match = pattern.exec(body)) !== null) {
            const [, closing, rawName, selfClosing] = match;
            const name = rawName.toLowerCase();
            if (VOID_TAGS.has(name) || selfClosing) continue;
            if (closing) {
                const open = stack.pop();
                assert.equal(open, name, `${page}: </${name}> closes <${open}> near offset ${match.index}`);
            } else {
                stack.push(name);
            }
        }
        assert.deepEqual(stack, [], `${page}: unclosed tags ${stack.join(", ")}`);
    });

    test(`${page}: has one h1, a title and a description of useful length`, () => {
        const h1Count = tags(html, "h1").length;
        assert.equal(h1Count, 1, `${page}: expected exactly one <h1>, found ${h1Count}`);

        const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
        assert.ok(title, `${page}: missing <title>`);
        const titleLength = title.replace(/&amp;/g, "&").length;
        assert.ok(titleLength <= TITLE_MAX, `${page}: title is ${titleLength} characters (max ${TITLE_MAX}): ${title}`);

        const meta = tags(html, "meta").find((tag) => attr(tag, "name") === "description");
        assert.ok(meta, `${page}: missing meta description`);
        const length = attr(meta, "content").length;
        assert.ok(length >= DESCRIPTION_MIN && length <= DESCRIPTION_MAX, `${page}: description is ${length} characters (want ${DESCRIPTION_MIN}-${DESCRIPTION_MAX})`);
    });

    test(`${page}: canonical URL matches where the page is served`, () => {
        const expected = `${SITE_ORIGIN}${servedPath(page)}`;
        assert.equal(canonicalOf(html), expected, `${page}: canonical should be ${expected}`);
        const ogUrl = tags(html, "meta").find((tag) => attr(tag, "property") === "og:url");
        assert.equal(ogUrl && attr(ogUrl, "content"), expected, `${page}: og:url should equal the canonical`);
    });

    test(`${page}: structured data parses and names its types`, () => {
        const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
        assert.ok(blocks.length > 0, `${page}: no JSON-LD block`);
        blocks.forEach((block) => {
            const json = block.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
            let data;
            assert.doesNotThrow(() => { data = JSON.parse(json); }, `${page}: JSON-LD does not parse`);
            assert.equal(data["@context"], "https://schema.org", `${page}: JSON-LD context`);
            data["@graph"].forEach((node) => assert.ok(node["@type"], `${page}: a JSON-LD node has no @type: ${JSON.stringify(node).slice(0, 80)}`));
        });
    });

    test(`${page}: every local link, stylesheet and script resolves, anchors included`, () => {
        const references = [
            ...tags(html, "a").map((tag) => attr(tag, "href")),
            ...tags(html, "link").filter((tag) => attr(tag, "rel") === "stylesheet").map((tag) => attr(tag, "href")),
            ...tags(html, "script").map((tag) => attr(tag, "src")),
        ].filter((reference) => reference && !isExternal(reference));

        references.forEach((reference) => {
            const { file, fragment } = resolveLocal(page, reference);
            assert.ok(DEPLOYED_FILES.includes(file), `${page}: "${reference}" resolves to ${file}, which is not deployed`);
            if (fragment) {
                assert.ok(idsIn(read(file)).has(fragment), `${page}: "${reference}" points at #${fragment}, which ${file} does not define`);
            }
        });
    });

    test(`${page}: images are described, sized and served from Rivr storage`, () => {
        tags(html, "img").forEach((tag) => {
            const src = attr(tag, "src");
            assert.ok(attr(tag, "alt"), `${page}: image ${src} has no alt text`);
            assert.ok(attr(tag, "width") && attr(tag, "height"), `${page}: image ${src} has no width/height, so the layout will shift`);
            assert.match(src, /^https:\/\//, `${page}: image ${src} is a local path; the site host cannot serve image files`);
        });
        const ogImage = tags(html, "meta").find((tag) => attr(tag, "property") === "og:image");
        assert.ok(ogImage, `${page}: missing og:image`);
        assert.match(attr(ogImage, "content"), /^https:\/\//, `${page}: og:image must be an absolute https URL`);
    });
}

test("sitemap.txt lists exactly the canonical URL of every page", () => {
    const listed = read("sitemap.txt").split("\n").filter(Boolean).sort();
    const canonicals = PAGES.map((page) => canonicalOf(read(page))).sort();
    assert.deepEqual(listed, canonicals, "sitemap.txt and the pages' canonical URLs differ");
});

test("robots.txt allows crawling and points at the sitemap", () => {
    const robots = read("robots.txt");
    assert.match(robots, /^User-agent: \*$/m, "robots.txt should address all crawlers");
    assert.match(robots, new RegExp(`^Sitemap: ${SITE_ORIGIN}/sitemap\\.txt$`, "m"), "robots.txt should name the sitemap");
    assert.doesNotMatch(robots, /^Disallow: \/$/m, "robots.txt must not block the whole site");
});

test("stylesheet and scripts reference nothing the site host cannot serve", () => {
    ["style.css", "site.js", "rivr-projections.js"].forEach((file) => {
        const localAssets = read(file).match(/url\((?!["']?data:)[^)]*\)/g) || [];
        assert.deepEqual(localAssets, [], `${file}: url() references must be data URIs; found ${localAssets.join(", ")}`);
    });
});
