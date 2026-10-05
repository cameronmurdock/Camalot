(() => {
    "use strict";

    const endpoint = "/rivr-projections/profile-cameron.json";
    const target = document.getElementById("rivr-object-list");
    if (!target) return;

    const text = (value, fallback) => {
        const normalized = typeof value === "string" ? value.trim() : "";
        return normalized || fallback;
    };

    const visible = (item) => item && item.visibility === "public";
    const typeLabel = (item) => text(item.type, "object").replace(/_/g, " ");
    const manifestKind = (item) => {
        if (item.type === "offering" || item.type === "listing") return "offer";
        if (item.type === "organization" || item.type === "group") return "organization";
        return item.type;
    };

    const render = (item) => {
        const row = document.createElement("article");
        row.className = "projection-item";

        const meta = document.createElement("span");
        meta.className = "projection-meta";
        meta.textContent = typeLabel(item);

        const body = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = text(item.name, "Untitled");
        body.appendChild(title);
        const description = text(item.description || item.content, "");
        if (description) {
            const summary = document.createElement("p");
            summary.textContent = description.length > 180 ? `${description.slice(0, 177)}…` : description;
            body.appendChild(summary);
        }

        const link = document.createElement("a");
        link.className = "projection-link";
        link.href = `https://rivr.camalot.me/objects/${encodeURIComponent(item.id)}`;
        link.rel = "alternate noopener";
        link.textContent = "View on Rivr ↗";

        row.append(meta, body, link);
        return row;
    };

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    fetch(endpoint, {
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal: controller.signal,
    })
        .then((response) => {
            if (!response.ok) throw new Error(`Projection request failed: ${response.status}`);
            return response.json();
        })
        .then((bundle) => {
            const posts = Array.isArray(bundle?.posts?.posts) ? bundle.posts.posts : [];
            const events = Array.isArray(bundle?.events) ? bundle.events : [];
            const groups = Array.isArray(bundle?.groups) ? bundle.groups : [];
            const objects = [...posts, ...events, ...groups].filter(visible).slice(0, 6);
            target.replaceChildren();
            if (!objects.length) {
                const empty = document.createElement("p");
                empty.className = "projection-status";
                empty.textContent = "No public objects are currently projected.";
                target.appendChild(empty);
                return;
            }
            objects.forEach((item) => target.appendChild(render(item)));
        })
        .catch(() => {
            const fallback = document.createElement("p");
            fallback.className = "projection-status";
            const link = document.createElement("a");
            link.href = "https://rivr.camalot.me/profile/cameron";
            link.textContent = "View public objects on Rivr.";
            fallback.appendChild(link);
            target.replaceChildren(fallback);
        })
        .finally(() => window.clearTimeout(timeout));
})();
