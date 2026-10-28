# Version history

Private repository: [DCCXX9/lastfm-personal-library](https://github.com/DCCXX9/lastfm-personal-library).

## Local candidate: v0.9.19

Built from v0.9.18 checkpoint 3176b45. The latest candidate
adds exact observed-library casing comparison, concise Before → After review,
unchanged exclusion, a persistent read-only cache and a permanent transport
submission block. It has not been pushed or published.

## Previous local checkpoint: v0.9.18 (3176b45)

Whole-library XML import accepts older Apple Computer headers, exposes a
Select whole library action and review filters, and reports unresolved casing
choices and replacements before Apply. With approval, `unlimitedStorage`
allows large local preference/undo records. The raw XML is never stored or
uploaded. v0.9.17 remains unchanged in history; v0.9.18 is not yet pushed.

## Previous snapshot: v0.9.17

v0.9.17 adds no new features. The popup, Settings, Help and Privacy pages show
the manifest version instead of hard-coded labels, and Refresh artwork asks for a
second click before it removes saved covers. Test suites now delete their
temporary browser profiles. Checked with the full test suite and the real
extension pages in Supermium; see [release notes](../release/NOTES.md).

### v0.9.16

The initial GitHub checkpoint preserves the existing artwork work together with
the verified native album/track casing integration, green controls, single
animated success toast and successful-save dialog dismissal. It does not replace
the installed extension or include its browser storage.

Native album and track casing saves were verified in signed-in Supermium, with
server edits blocked, storage preserved and casing retained after refresh. The
source still contains artwork candidate work with separate limitations; see
[current state](CURRENT.md), [candidate notes](../release/NOTES.md) and the
[artwork handover](ARTWORK_HANDOVER.md). This is a private source checkpoint,
not a browser-store publication or a claim that every feature passed live checks.

## Historical snapshots

Each historical tag points to an existing commit whose manifest records that
version. These are recoverable development snapshots, not newly tested releases.
Their commit messages and documents record the contemporary state, including
failed or incomplete artwork acceptance. GitHub's Tags page offers source ZIPs
for each tag; those ZIPs include development files and are not packaged installs.

Versions without a separate surviving committed snapshot are omitted. In
particular, v0.9.14 and v0.9.15 were working-copy candidates folded into the
v0.9.16 checkpoint. The original commits and branches are retained unchanged.

<!-- The table below is derived from the committed manifest history. -->

| Version | Original commit | Recorded change |
| --- | --- | --- |
| v0.9.16 | [43c113d](https://github.com/DCCXX9/lastfm-personal-library/commit/43c113d0b6941330b0583d936e577c75296b8b65) | Preserve v0.9.16 casing fixes and current artwork candidate for private GitHub |
| v0.9.13 | [6af06f7](https://github.com/DCCXX9/lastfm-personal-library/commit/6af06f73ab396b3a468a8df5f26af5f0668de054) | Keep scrobble covers visible and speed pagination in v0.9.13 |
| v0.9.12 | [c8349d8](https://github.com/DCCXX9/lastfm-personal-library/commit/c8349d8cf1e4d3804898d13e3eb54ce26dd41c0b) | Fix artwork and redirect observer freeze in v0.9.12 |
| v0.9.11 | [618afce](https://github.com/DCCXX9/lastfm-personal-library/commit/618afce5104944c22732cb65a241d37bb661430c) | Prepare verified artwork batches and public artist covers in v0.9.11 |
| v0.9.9 | [9ae8197](https://github.com/DCCXX9/lastfm-personal-library/commit/9ae81970e1135c04d50bbedb382c6233901a6a35) | Prepare nearby artwork before scrolling in v0.9.9 |
| v0.9.8 | [b71710a](https://github.com/DCCXX9/lastfm-personal-library/commit/b71710a0713beeb7ee92b58bfaf7e59fe67d9b36) | Exclude signed-in loading skeletons from artwork proof in v0.9.8 |
| v0.9.7 | [83cb6d8](https://github.com/DCCXX9/lastfm-personal-library/commit/83cb6d8d9c9901dea48e1a6cfb1d2bcc4370a419) | Extend verified artwork recovery across library and scrolling in v0.9.7 |
| v0.9.6 | [6058d39](https://github.com/DCCXX9/lastfm-personal-library/commit/6058d3972a170c6bf958c02eaa9b484649982771) | Verify legacy artwork album hints against current library counts in v0.9.6 |
| v0.9.5 | [5fd874f](https://github.com/DCCXX9/lastfm-personal-library/commit/5fd874f3054459d047d5fc141e1241a22836606e) | Reuse verified album counts on artist Tracks pages in v0.9.5 beta |
| v0.9.4 | [6bcd73e](https://github.com/DCCXX9/lastfm-personal-library/commit/6bcd73ea2da46d98ead5dbeb4fd94a116a9080d0) | Recover broken artist and album thumbnails in v0.9.4 beta |
| v0.9.3 | [9522e18](https://github.com/DCCXX9/lastfm-personal-library/commit/9522e18363661564cfeea72405bee267ef2ebeee) | Protect Travis Scott and Lucki navigation in v0.9.3 beta |
| v0.9.2 | [2e7420f](https://github.com/DCCXX9/lastfm-personal-library/commit/2e7420f9911774651d9594fe441979051043ee14) | Keep scroll choices compact and on one row |
| v0.9.1 | [7217c0d](https://github.com/DCCXX9/lastfm-personal-library/commit/7217c0df56ee22da5c23826214f1184041c5d401) | Ask before scrolling and prevent repeated plays at shifted page boundaries |
| v0.9.0 | [881fe1b](https://github.com/DCCXX9/lastfm-personal-library/commit/881fe1b4c7e5504dabb7ad4d61ad16763bbfaf78) | Prepare library-wide XML casing import and Doctor adapter boundary |
| v0.8.3 | [8beff8c](https://github.com/DCCXX9/lastfm-personal-library/commit/8beff8c65adf5a5f9671cc1a4d6244203636e759) | Recover transient artwork failures during scrolling in v0.8.3 |
| v0.8.2 | [ff6fc13](https://github.com/DCCXX9/lastfm-personal-library/commit/ff6fc13fd28a3bf095f222e54d62888f6e7314be) | Fix artist Tracks artwork with omitted album artist in v0.8.2 |
| v0.8.1 | [c4ef360](https://github.com/DCCXX9/lastfm-personal-library/commit/c4ef360fb3370655e1f862ec9e4427e8727dfab2) | Fix album library artwork context in v0.8.1 beta |
| v0.8.0 | [b391802](https://github.com/DCCXX9/lastfm-personal-library/commit/b3918023859ef748215b457f1fcd4ab20e4a6986) | Prepare v0.8.0 beta candidate and release materials |
| v0.7.0 | [7de6c8d](https://github.com/DCCXX9/lastfm-personal-library/commit/7de6c8d9997b63651c2e55e9f79fd8690a8c2486) | Finish artwork authority, native editing and future album-less rules |
| v0.6.15 | [2180539](https://github.com/DCCXX9/lastfm-personal-library/commit/21805399f339d035e1da4ced58f10f20dff161fb) | Retain scrolling progress across settings and profile changes |
| v0.6.14 | [c4c0270](https://github.com/DCCXX9/lastfm-personal-library/commit/c4c0270331755ac26176eba02c765e3c4a816d93) | Preserve scrolling history and make preference actions dependable |
| v0.6.13 | [7366f06](https://github.com/DCCXX9/lastfm-personal-library/commit/7366f061f7e785909109c60b2c8ada9a016675da) | Reduce artwork refresh work and preserve settings drafts |
| v0.6.12 | [1f21384](https://github.com/DCCXX9/lastfm-personal-library/commit/1f21384d6a8d795bbb02297144bd797acc30aed3) | Recover verified personal covers and display resolved images across artists |
| v0.6.11 | [a60f097](https://github.com/DCCXX9/lastfm-personal-library/commit/a60f097ad9528b6c564957958a19ee193edbfe7d) | Replace generic track covers with verified personal album artwork |
| v0.6.10 | [e6d87ff](https://github.com/DCCXX9/lastfm-personal-library/commit/e6d87ff30f84483124aef6f151a59e22c121fa59) | Restore startup dependencies after extension reload during navigation |
| v0.6.9 | [695e220](https://github.com/DCCXX9/lastfm-personal-library/commit/695e22073c93a445a4ccd2f534464afb9e5f1c83) | Remove finished scrolling panels and discard stale controls |
| v0.6.8 | [ff7ae0d](https://github.com/DCCXX9/lastfm-personal-library/commit/ff7ae0d16097d9e517c2b2489e4b3e1721a9c326) | Share artist album totals and select scrobbled MUSIC artwork |
| v0.6.7 | [ae100ec](https://github.com/DCCXX9/lastfm-personal-library/commit/ae100ecf9aba784564b147a841a65c0c155ab895) | Apply cached artwork when staged scrobble metadata arrives |
| v0.6.6 | [1978e17](https://github.com/DCCXX9/lastfm-personal-library/commit/1978e179e71ddc8996a12066676dab5766efb2f2) | Resolve verified album-less scrobble covers without history scans |
| v0.6.5 | [8f5765b](https://github.com/DCCXX9/lastfm-personal-library/commit/8f5765b4a0cb5d946bf5645351d2e0a15764d522) | Fix artwork navigation cache and prioritize album-less scrobbles |
| v0.6.4 | [f63d91d](https://github.com/DCCXX9/lastfm-personal-library/commit/f63d91dfb7577dce410f9495437ca3d9b7836bb9) | Use personal track covers with persistent caching and blank-album support |
| v0.6.2 | [74ce8ba](https://github.com/DCCXX9/lastfm-personal-library/commit/74ce8ba796c9d39e8c42a7a18060969935cd33c1) | Preserve dated scrobble sections during library scrolling |
| v0.6.1 | [7394631](https://github.com/DCCXX9/lastfm-personal-library/commit/73946315be32a23c6f16c27b98b14cb738f2b3a7) | Separate display preferences and stream large iTunes XML imports |
| v0.6.0 | [1fd1c71](https://github.com/DCCXX9/lastfm-personal-library/commit/1fd1c718ef1ad3d99f9a991d4c00dd72fb17dc59) | Add reviewed iTunes XML casing import with selective revert |
| v0.5.0 | [c6a83f5](https://github.com/DCCXX9/lastfm-personal-library/commit/c6a83f5e708f385867726edd015d16d604570faf) | Polish library controls and coordinate preference writes |
| v0.3.4 | [3a1042a](https://github.com/DCCXX9/lastfm-personal-library/commit/3a1042a0292190e18a9e66f46a46485ae8d23950) | Preserve installed v0.3.4 baseline before reliability cleanup |
