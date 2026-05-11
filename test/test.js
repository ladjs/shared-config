const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');
const tls = require('node:tls');
const test = require('ava');
const sharedConfig = require('..');

test('returns an object', (t) => {
  t.true(typeof sharedConfig('PREFIX') === 'object');
});

test('returns variations based off env passed', (t) => {
  t.is(sharedConfig('PREFIX').rateLimit.max, 1000);
  t.false(sharedConfig('PREFIX', 'development').rateLimit);
});

test('returns variations based off process.env changing', (t) => {
  t.is(sharedConfig('PREFIX').rateLimit.max, 1000);
  process.env.NODE_ENV = 'development';
  t.false(sharedConfig('PREFIX').rateLimit);
  process.env.NODE_ENV = 'test';
  t.is(sharedConfig('PREFIX').rateLimit.max, 1000);
});

test('exports TLS_CIPHERS constant', (t) => {
  t.is(typeof sharedConfig.TLS_CIPHERS, 'string');
  t.true(sharedConfig.TLS_CIPHERS.length > 0);
});

test('exports TLS_COMPAT_CIPHERS constant', (t) => {
  t.is(typeof sharedConfig.TLS_COMPAT_CIPHERS, 'string');
  t.true(sharedConfig.TLS_COMPAT_CIPHERS.length > 0);
});

test('exports TLS_SIGALGS constant', (t) => {
  t.is(typeof sharedConfig.TLS_SIGALGS, 'string');
  t.true(sharedConfig.TLS_SIGALGS.length > 0);
});

test('TLS_CIPHERS only contains AEAD ciphers with forward secrecy', (t) => {
  const ciphers = sharedConfig.TLS_CIPHERS.split(':');
  for (const cipher of ciphers) {
    t.true(
      cipher.startsWith('ECDHE-') || cipher.startsWith('DHE-'),
      `Cipher ${cipher} does not use ECDHE or DHE key exchange`
    );
    t.true(
      cipher.includes('GCM') || cipher.includes('CHACHA20-POLY1305'),
      `Cipher ${cipher} is not an AEAD cipher`
    );
    t.false(cipher.includes('CBC'), `Cipher ${cipher} uses CBC mode`);
    t.false(cipher.includes('ARIA'), `Cipher ${cipher} uses ARIA`);
    t.false(
      cipher.startsWith('AES') || cipher.startsWith('TLS_RSA'),
      `Cipher ${cipher} uses RSA key exchange (no forward secrecy)`
    );
  }
});

test('TLS_COMPAT_CIPHERS only uses forward secrecy (no RSA key exchange)', (t) => {
  const ciphers = sharedConfig.TLS_COMPAT_CIPHERS.split(':');
  for (const cipher of ciphers) {
    t.true(
      cipher.startsWith('ECDHE-') || cipher.startsWith('DHE-'),
      `Cipher ${cipher} does not use ECDHE or DHE key exchange`
    );
    t.false(
      cipher.startsWith('AES') || cipher.startsWith('TLS_RSA'),
      `Cipher ${cipher} uses RSA key exchange (no forward secrecy)`
    );
    t.false(cipher.includes('ARIA'), `Cipher ${cipher} uses ARIA`);
    t.false(cipher.includes('-DSS-'), `Cipher ${cipher} uses DSS`);
  }
});

test('TLS_COMPAT_CIPHERS is a superset of TLS_CIPHERS', (t) => {
  const strict = sharedConfig.TLS_CIPHERS.split(':');
  const compat = sharedConfig.TLS_COMPAT_CIPHERS.split(':');
  for (const cipher of strict) {
    t.true(
      compat.includes(cipher),
      `Strict cipher ${cipher} should be in compat list`
    );
  }
});

test('TLS_COMPAT_CIPHERS includes CBC ciphers for backward compat', (t) => {
  const ciphers = sharedConfig.TLS_COMPAT_CIPHERS.split(':');
  const hasCBC = ciphers.some(
    (c) => c.endsWith('-SHA') || c.endsWith('-SHA256') || c.endsWith('-SHA384')
  );
  t.true(hasCBC, 'Compat list should include CBC ciphers');
});

test('TLS_COMPAT_CIPHERS: AEAD ciphers come before CBC ciphers', (t) => {
  const ciphers = sharedConfig.TLS_COMPAT_CIPHERS.split(':');
  const isAEAD = (c) => c.includes('GCM') || c.includes('CHACHA20');
  const lastAEAD = Math.max(...ciphers.map((c, i) => (isAEAD(c) ? i : -1)));
  const firstCBC = ciphers.findIndex((c) => !isAEAD(c));
  t.true(
    lastAEAD < firstCBC,
    'All AEAD ciphers should come before CBC ciphers'
  );
});

test('TLS_COMPAT_CIPHERS: CBC+SHA256/384 come before CBC+SHA1', (t) => {
  const ciphers = sharedConfig.TLS_COMPAT_CIPHERS.split(':');
  const isAEAD = (c) => c.includes('GCM') || c.includes('CHACHA20');
  const isCBCSHA256 = (c) =>
    !isAEAD(c) && (c.endsWith('-SHA256') || c.endsWith('-SHA384'));
  const isCBCSHA1 = (c) => !isAEAD(c) && !isCBCSHA256(c) && c.endsWith('-SHA');
  const firstCBCSHA256 = ciphers.findIndex((c) => isCBCSHA256(c));
  const firstCBCSHA1 = ciphers.findIndex((c) => isCBCSHA1(c));
  t.true(
    firstCBCSHA256 < firstCBCSHA1,
    'CBC+SHA256/384 ciphers should come before CBC+SHA1 ciphers'
  );
});

test('TLS_CIPHERS prioritizes ECDHE over DHE', (t) => {
  const ciphers = sharedConfig.TLS_CIPHERS.split(':');
  let lastECDHEIndex = -1;
  let firstDHEIndex = ciphers.length;
  for (const [i, cipher] of ciphers.entries()) {
    if (cipher.startsWith('ECDHE-')) lastECDHEIndex = i;
    if (cipher.startsWith('DHE-') && i < firstDHEIndex) firstDHEIndex = i;
  }

  t.true(
    lastECDHEIndex < firstDHEIndex,
    'ECDHE ciphers should come before DHE ciphers'
  );
});

test('TLS_SIGALGS excludes SHA-1 and SHA-224', (t) => {
  const sigalgs = sharedConfig.TLS_SIGALGS.split(':');
  for (const alg of sigalgs) {
    t.false(alg.includes('sha1'), `Signature algorithm ${alg} uses SHA-1`);
    t.false(alg.includes('sha224'), `Signature algorithm ${alg} uses SHA-224`);
  }
});

test('TLS_SIGALGS includes required modern algorithms', (t) => {
  const sigalgs = sharedConfig.TLS_SIGALGS.split(':');
  t.true(sigalgs.includes('ecdsa_secp256r1_sha256'));
  t.true(sigalgs.includes('rsa_pss_rsae_sha256'));
  t.true(sigalgs.includes('rsa_pkcs1_sha256'));
});

test('TLS_CIPHERS can create a valid SecureContext', (t) => {
  t.notThrows(() => {
    tls.createSecureContext({
      ciphers: sharedConfig.TLS_CIPHERS,
      sigalgs: sharedConfig.TLS_SIGALGS,
      minVersion: 'TLSv1.2'
    });
  });
});

test('TLS_COMPAT_CIPHERS can create a valid SecureContext', (t) => {
  t.notThrows(() => {
    tls.createSecureContext({
      ciphers: sharedConfig.TLS_COMPAT_CIPHERS,
      sigalgs: sharedConfig.TLS_SIGALGS,
      minVersion: 'TLSv1.2'
    });
  });
});

test('ssl config includes hardened TLS when cert paths are set', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-config-test-'));
  const keyPath = path.join(tmpDir, 'key.pem');
  const certPath = path.join(tmpDir, 'cert.pem');

  fs.writeFileSync(keyPath, 'dummy-key');
  fs.writeFileSync(certPath, 'dummy-cert');

  process.env.TLSTEST_SSL_KEY_PATH = keyPath;
  process.env.TLSTEST_SSL_CERT_PATH = certPath;

  try {
    const config = sharedConfig('TLSTEST');
    t.truthy(config.ssl, 'ssl should be set when cert paths exist');
    t.true(config.ssl.honorCipherOrder, 'honorCipherOrder should be true');
    t.is(config.ssl.ciphers, sharedConfig.TLS_CIPHERS);
    t.is(config.ssl.sigalgs, sharedConfig.TLS_SIGALGS);
    t.is(config.ssl.minVersion, 'TLSv1.2');
    t.is(config.ssl.ecdhCurve, 'auto');
  } finally {
    delete process.env.TLSTEST_SSL_KEY_PATH;
    delete process.env.TLSTEST_SSL_CERT_PATH;
    fs.unlinkSync(keyPath);
    fs.unlinkSync(certPath);
    fs.rmdirSync(tmpDir);
  }
});

test('ssl config is false when no cert paths are set', (t) => {
  delete process.env.NOCERT_SSL_KEY_PATH;
  delete process.env.NOCERT_SSL_CERT_PATH;
  delete process.env.NOCERT_SSL_CA_PATH;

  const config = sharedConfig('NOCERT');
  t.falsy(config.ssl);
});
