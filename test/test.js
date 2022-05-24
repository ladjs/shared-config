const process = require('process');
const test = require('ava');

const sharedConfig = require('..');

test('returns an object', (t) => {
  t.true(typeof sharedConfig('PREFIX') === 'object');
});

test('returns variations based off env passed', (t) => {
  t.is(sharedConfig('PREFIX').rateLimit.max, 100);
  t.false(sharedConfig('PREFIX', 'development').rateLimit);
});

test('returns variations based off process.env changing', (t) => {
  t.is(sharedConfig('PREFIX').rateLimit.max, 100);
  process.env.NODE_ENV = 'development';
  t.false(sharedConfig('PREFIX').rateLimit);
  process.env.NODE_ENV = 'test';
  t.is(sharedConfig('PREFIX').rateLimit.max, 100);
});
