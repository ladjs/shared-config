const test = require('ava');

const sharedConfig = require('..');

test('returns an object', t => {
  t.true(typeof sharedConfig('PREFIX') === 'object');
});
