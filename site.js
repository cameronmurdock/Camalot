(() => {
    "use strict";

    const DRAG_THRESHOLD_PX = 6;
    const STEP_FRACTION = 0.8;
    const MIN_PROGRESS = 0.06;
    const EDGE_TOLERANCE_PX = 2;
    const READING_LINE = 0.3;
    const READING_LINE_PERCENT = READING_LINE * 100;
    const SPY_ROOT_MARGIN = `-${READING_LINE_PERCENT}% 0px -${100 - READING_LINE_PERCENT}% 0px`;
    const PRIMARY_BUTTON = 0;
    const MOUSE_POINTER = "mouse";
    const CLASS_DRAGGING = "is-dragging";
    const CLASS_STATIC = "is-static";
    const CLASS_CURRENT = "is-current";
    const DIRECTION_BACK = -1;
    const DIRECTION_FORWARD = 1;
    const STRIP_HINT = "Drag or scroll sideways";
    const MISSING_IMAGE_KIND = "Image on its way";
    const FRAMED_IMAGES = ".shot__view img, .hero__portrait img";
    const LABEL_BACK = "Scroll back";
    const LABEL_FORWARD = "Scroll forward";

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    // Where a strip stands: how much of it has been seen, and which ends it touches.
    const stripState = (scrollLeft, scrollWidth, clientWidth) => {
        const maxScroll = Math.max(scrollWidth - clientWidth, 0);
        const scrollable = maxScroll > EDGE_TOLERANCE_PX;
        if (!scrollable) {
            return { scrollable, progress: 1, atStart: true, atEnd: true };
        }
        return {
            scrollable,
            progress: clamp((scrollLeft + clientWidth) / scrollWidth, MIN_PROGRESS, 1),
            atStart: scrollLeft <= EDGE_TOLERANCE_PX,
            atEnd: scrollLeft >= maxScroll - EDGE_TOLERANCE_PX,
        };
    };

    const stepTarget = (scrollLeft, scrollWidth, clientWidth, direction) => {
        const maxScroll = Math.max(scrollWidth - clientWidth, 0);
        return clamp(scrollLeft + direction * clientWidth * STEP_FRACTION, 0, maxScroll);
    };

    const isDrag = (startX, currentX) => Math.abs(currentX - startX) > DRAG_THRESHOLD_PX;

    // The section being read is the last one, in page order, whose top has passed the reading line.
    const currentSection = (sectionTops, lineY) => {
        let current = null;
        sectionTops.forEach(({ id, top }) => {
            if (top <= lineY) current = id;
        });
        return current;
    };

    const helpers = { clamp, stripState, stepTarget, isDrag, currentSection };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = helpers;
    }
    if (typeof document === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stepButton = (label, iconClass) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "strip__btn glass";
        button.setAttribute("aria-label", label);
        const icon = document.createElement("span");
        icon.className = `icon ${iconClass}`;
        icon.setAttribute("aria-hidden", "true");
        button.appendChild(icon);
        return button;
    };

    // The hint, progress line and step buttons only mean something once the strip can be driven.
    const buildBar = (stripLabel) => {
        const bar = document.createElement("div");
        bar.className = "strip__bar";

        const hint = document.createElement("span");
        hint.className = "strip__hint";
        hint.textContent = STRIP_HINT;

        const progress = document.createElement("div");
        progress.className = "strip__progress";
        progress.setAttribute("aria-hidden", "true");
        progress.appendChild(document.createElement("span"));

        const prev = stepButton(`${LABEL_BACK}: ${stripLabel}`, "icon--prev");
        const next = stepButton(`${LABEL_FORWARD}: ${stripLabel}`, "icon--next");
        const nav = document.createElement("div");
        nav.className = "strip__nav";
        nav.append(prev, next);

        bar.append(hint, progress, nav);
        return { bar, progress, prev, next };
    };

    const initStrip = (strip) => {
        const track = strip.querySelector("[data-strip-track]");
        if (!track) return;
        const { bar, progress, prev, next } = buildBar(track.getAttribute("aria-label") || "");
        strip.appendChild(bar);

        const refresh = () => {
            const state = stripState(track.scrollLeft, track.scrollWidth, track.clientWidth);
            strip.classList.toggle(CLASS_STATIC, !state.scrollable);
            progress.style.setProperty("--progress", state.progress.toFixed(3));
            prev.disabled = state.atStart;
            next.disabled = state.atEnd;
        };

        const step = (direction) => {
            track.scrollTo({
                left: stepTarget(track.scrollLeft, track.scrollWidth, track.clientWidth, direction),
                behavior: reducedMotion.matches ? "auto" : "smooth",
            });
        };

        prev.addEventListener("click", () => step(DIRECTION_BACK));
        next.addEventListener("click", () => step(DIRECTION_FORWARD));
        track.addEventListener("scroll", refresh, { passive: true });
        new ResizeObserver(refresh).observe(track);

        let pointerId = null;
        let startX = 0;
        let startScroll = 0;
        let dragging = false;

        const swallowClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };

        const release = () => {
            if (dragging) {
                track.classList.remove(CLASS_DRAGGING);
                // The click that ends a drag must not follow the link under the pointer.
                track.addEventListener("click", swallowClick, { capture: true, once: true });
                window.setTimeout(() => track.removeEventListener("click", swallowClick, { capture: true }), 0);
            }
            if (pointerId !== null && track.hasPointerCapture(pointerId)) {
                track.releasePointerCapture(pointerId);
            }
            pointerId = null;
            dragging = false;
        };

        track.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== MOUSE_POINTER || event.button !== PRIMARY_BUTTON) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startScroll = track.scrollLeft;
        });

        track.addEventListener("pointermove", (event) => {
            if (event.pointerId !== pointerId) return;
            if (!dragging) {
                if (!isDrag(startX, event.clientX)) return;
                dragging = true;
                track.classList.add(CLASS_DRAGGING);
                track.setPointerCapture(pointerId);
            }
            track.scrollLeft = startScroll - (event.clientX - startX);
        });

        track.addEventListener("pointerup", release);
        track.addEventListener("pointercancel", release);
        track.addEventListener("dragstart", (event) => event.preventDefault());

        refresh();
    };

    const initSpy = (list) => {
        const links = Array.from(list.querySelectorAll('a[href^="#"]'));
        const byId = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
        const orderedIds = Array.from(byId.keys()).filter((id) => document.getElementById(id));
        if (!orderedIds.length) return;

        const sections = orderedIds.map((id) => document.getElementById(id));
        let current = null;

        const mark = (id) => {
            if (id === current) return;
            current = id;
            byId.forEach((link, linkId) => {
                const active = linkId === id;
                link.classList.toggle(CLASS_CURRENT, active);
                if (active) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        };

        // The observer only reports sections whose state changed, so every report re-reads them all.
        const observer = new IntersectionObserver(() => {
            const tops = sections.map((section) => ({
                id: section.id,
                top: section.getBoundingClientRect().top,
            }));
            mark(currentSection(tops, window.innerHeight * READING_LINE));
        }, { rootMargin: SPY_ROOT_MARGIN });

        sections.forEach((section) => observer.observe(section));
    };

    // A framed image that cannot load becomes a labelled slot, not a broken picture.
    const slotFor = (img) => {
        const slot = document.createElement("div");
        slot.className = "slot";
        const kind = document.createElement("p");
        kind.className = "slot__kind";
        kind.textContent = MISSING_IMAGE_KIND;
        const note = document.createElement("p");
        note.className = "slot__note";
        note.textContent = img.alt;
        slot.append(kind, note);
        return slot;
    };

    const initFramedImage = (img) => {
        const swap = () => img.replaceWith(slotFor(img));
        if (img.complete && img.naturalWidth === 0) {
            swap();
            return;
        }
        img.addEventListener("error", swap, { once: true });
    };

    document.querySelectorAll(FRAMED_IMAGES).forEach(initFramedImage);
    document.querySelectorAll("[data-strip]").forEach(initStrip);
    document.querySelectorAll("[data-spy]").forEach(initSpy);
})();
