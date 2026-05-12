const { koolic } = require('../js/koolic.js');

describe('ready()', () => {
    test('runs callback when DOM is already ready', (done) => {
        koolic.ready(() => done());
    });
});
