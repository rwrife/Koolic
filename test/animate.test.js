const { koolic } = require('../js/koolic.js');
const { KoolAnimation, easings, resolveEasing } = require('../js/koolic.animate.js');

async function withFakeRaf(fn) {
    const queue = [];
    const originalRaf = global.requestAnimationFrame;
    const originalCaf = global.cancelAnimationFrame;
    global.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    global.cancelAnimationFrame = (h) => { queue[h - 1] = null; };
    let now = 0;
    function tick(deltaMs) {
        now += deltaMs;
        const callbacks = queue.splice(0, queue.length);
        for (const cb of callbacks) if (cb) cb(now);
    }
    try {
        return await fn(tick);
    } finally {
        global.requestAnimationFrame = originalRaf;
        global.cancelAnimationFrame = originalCaf;
    }
}

const flush = () => new Promise(r => setTimeout(r, 0));

describe('easings', () => {
    test('every built-in easing maps 0->0 and 1->1', () => {
        for (const name of Object.keys(easings)) {
            expect(easings[name](0)).toBeCloseTo(0, 5);
            expect(easings[name](1)).toBeCloseTo(1, 5);
        }
    });

    test('linear is identity', () => {
        expect(easings.linear(0.25)).toBeCloseTo(0.25);
        expect(easings.linear(0.5)).toBeCloseTo(0.5);
    });

    test('easeInOutSine is symmetric around 0.5', () => {
        const f = easings.easeInOutSine;
        expect(f(0.5)).toBeCloseTo(0.5);
        expect(f(0.25) + f(0.75)).toBeCloseTo(1, 4);
    });

    test('resolveEasing accepts name, function, or segments', () => {
        expect(resolveEasing('linear')(0.5)).toBeCloseTo(0.5);
        expect(resolveEasing(t => t * t)(0.5)).toBeCloseTo(0.25);
        const seg = resolveEasing([
            { to: 0.5, easing: 'linear' },
            { to: 1.0, easing: 'linear' }
        ]);
        expect(seg(0)).toBe(0);
        expect(seg(0.5)).toBeCloseTo(0.5);
        expect(seg(1)).toBe(1);
    });

    test('segmented easing is continuous at boundaries and ends at 1', () => {
        const f = resolveEasing([
            { to: 0.2, easing: 'easeInSine' },
            { to: 0.8, easing: 'linear' },
            { to: 1.0, easing: 'easeOutSine' }
        ]);
        expect(f(0)).toBeCloseTo(0);
        expect(f(0.2)).toBeCloseTo(0.2);
        expect(f(0.8)).toBeCloseTo(0.8);
        expect(f(1)).toBeCloseTo(1);
    });

    test('segmented easing throws when segments do not end at 1', () => {
        expect(() => resolveEasing([{ to: 0.5, easing: 'linear' }])).toThrow();
    });

    test('unknown easing name throws', () => {
        expect(() => resolveEasing('nope')).toThrow();
    });
});

describe('KoolAnimation', () => {
    test('linear animation reaches stop and fires onDone exactly once', async () => {
        await withFakeRaf(async (tick) => {
            const a = new KoolAnimation(0, 100, 1000);
            const changes = [];
            let done = 0;
            a.onChange((_a, v) => changes.push(v));
            a.onDone(() => done++);
            await flush();
            tick(0);
            tick(500);
            tick(500);
            expect(changes[changes.length - 1]).toBe(100);
            expect(done).toBe(1);
        });
    });

    test('easing affects intermediate values', async () => {
        await withFakeRaf(async (tick) => {
            const a = new KoolAnimation(0, 100, 1000, 'easeInQuad');
            const samples = [];
            a.onChange((_a, v) => samples.push(v));
            await flush();
            tick(0);
            tick(500);
            const halfway = samples[samples.length - 1];
            expect(halfway).toBeCloseTo(25, 1);
            tick(500);
            expect(samples[samples.length - 1]).toBe(100);
        });
    });

    test('KoolProperty.animate updates the bound property', async () => {
        await withFakeRaf(async (tick) => {
            const o = { x: 0 };
            koolic(o).x.animate(0, 50, 1000);
            await flush();
            tick(0);
            tick(1000);
            expect(o.x).toBe(50);
        });
    });
});
