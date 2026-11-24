# Naghme Lite Android build

Build profile: lightweight Media3-only APK, based on package version 2.3.1.

Source baseline: main @ 871fe33f244a544384475caa1253c5ad442631e8.

This build intentionally keeps the existing application features and native bridges:
- Music library and persistent Android folder/file access
- Video library and Media3 playback
- IPTV/M3U interface and native IPTV bridge
- HLS and DASH Media3 modules
- Radio mode and bundled station data
- Existing controls, settings, playlists, and bundled assets

LibVLC native runtime is intentionally excluded from Lite to protect APK size and compatibility. This file exists to identify the reproducible CI build request; the APK is considered ready only after the Android workflow and its packaging checks succeed.
