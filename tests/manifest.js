"use strict";

// Every file published to camalot.me. A Rivr publish replaces the whole site,
// so a file missing from this list is a file removed from the live site.
const DEPLOYED_FILES = [
    "index.html",
    "portfolio/index.html",
    "offerings.html",
    "rivr-social.html",
    "writing.html",
    "about.html",
    "contact.html",
    "style.css",
    "site.js",
    "rivr-projections.js",
    "sitemap.txt",
    "robots.txt",
];

const SITE_ORIGIN = "https://camalot.me";

// The extensions the Rivr site host serves on a custom domain; anything else is answered by the Rivr app instead.
const SERVABLE_EXTENSIONS = [".html", ".css", ".js", ".txt"];

module.exports = { DEPLOYED_FILES, SITE_ORIGIN, SERVABLE_EXTENSIONS };
