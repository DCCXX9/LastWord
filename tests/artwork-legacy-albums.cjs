// Same installed-extension contract, using the legacy cache boundary observed
// in Jay's actual browser instead of a newly verified cached winner.
process.env.LFM_TEST_LEGACY_ALBUM_HINT = '1';
require('./artwork-known-albums.cjs');
