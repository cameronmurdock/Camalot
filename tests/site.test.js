"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { clamp, stripState, stepTarget, isDrag, currentSection } = require("../site.js");

const describeState = (state) => JSON.stringify(state);

test("clamp keeps a value inside its bounds", () => {
    assert.equal(clamp(5, 0, 10), 5, "a value inside the range is returned unchanged");
    assert.equal(clamp(-3, 0, 10), 0, "a value below the range is raised to the minimum");
    assert.equal(clamp(42, 0, 10), 10, "a value above the range is lowered to the maximum");
    assert.equal(clamp(0, 0, 0), 0, "a zero-width range returns its single value");
});

test("stripState reports a strip that fits as static and fully seen", () => {
    const state = stripState(0, 900, 900);
    assert.deepEqual(state, { scrollable: false, progress: 1, atStart: true, atEnd: true }, `got ${describeState(state)}`);
});

test("stripState treats a sub-pixel overflow as not scrollable", () => {
    const state = stripState(0, 901, 900);
    assert.equal(state.scrollable, false, `1px of overflow should not show controls; got ${describeState(state)}`);
});

test("stripState at the start of a long strip shows the first screenful as progress", () => {
    const state = stripState(0, 4000, 1000);
    assert.equal(state.scrollable, true, describeState(state));
    assert.equal(state.atStart, true, describeState(state));
    assert.equal(state.atEnd, false, describeState(state));
    assert.equal(state.progress, 0.25, `1000 of 4000px visible is a quarter; got ${state.progress}`);
});

test("stripState in the middle is at neither end", () => {
    const state = stripState(1500, 4000, 1000);
    assert.equal(state.atStart, false, describeState(state));
    assert.equal(state.atEnd, false, describeState(state));
    assert.equal(state.progress, 0.625, `(1500 + 1000) / 4000; got ${state.progress}`);
});

test("stripState at the end reports full progress, allowing for fractional scroll positions", () => {
    const state = stripState(2999.4, 4000, 1000);
    assert.equal(state.atEnd, true, `within tolerance of the end; got ${describeState(state)}`);
    assert.ok(state.progress > 0.99 && state.progress <= 1, `progress should be ~1; got ${state.progress}`);
});

test("stripState never reports less than the minimum visible progress", () => {
    const state = stripState(0, 100000, 100);
    assert.equal(state.progress, 0.06, `a tiny viewport on a huge strip is floored; got ${state.progress}`);
});

test("stepTarget moves most of a screenful in the requested direction", () => {
    assert.equal(stepTarget(0, 4000, 1000, 1), 800, "forward from the start moves 80% of the viewport");
    assert.equal(stepTarget(2000, 4000, 1000, -1), 1200, "backward from the middle moves 80% of the viewport");
});

test("stepTarget stops at the ends instead of overshooting", () => {
    assert.equal(stepTarget(2900, 4000, 1000, 1), 3000, "forward near the end clamps to the last scroll position");
    assert.equal(stepTarget(300, 4000, 1000, -1), 0, "backward near the start clamps to zero");
    assert.equal(stepTarget(0, 800, 1000, 1), 0, "a strip narrower than its viewport cannot move");
});

test("isDrag ignores the jitter of a click and recognises a real drag either way", () => {
    assert.equal(isDrag(100, 100), false, "no movement is a click");
    assert.equal(isDrag(100, 106), false, "movement at the threshold is still a click");
    assert.equal(isDrag(100, 107), true, "movement past the threshold to the right is a drag");
    assert.equal(isDrag(100, 93), true, "movement past the threshold to the left is a drag");
});

test("currentSection picks the last section whose top has passed the reading line", () => {
    const tops = [
        { id: "dci", top: -1800 },
        { id: "rivr", top: -600 },
        { id: "planner", top: 120 },
        { id: "ownership", top: 1400 },
    ];
    assert.equal(currentSection(tops, 270), "planner", "planner started above the line; ownership is still below it");
});

test("currentSection counts a section sitting exactly on the line as started", () => {
    assert.equal(currentSection([{ id: "a", top: 270 }], 270), "a");
});

test("currentSection is null above the first section and with no sections", () => {
    assert.equal(currentSection([{ id: "a", top: 900 }, { id: "b", top: 2400 }], 270), null, "nothing has reached the line yet");
    assert.equal(currentSection([], 270), null, "an empty page has no current section");
});
