// Regression tests for importing station playlists into Naghme.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'radio.js'), 'utf8');
const start = source.indexOf('function radioM3UHash(value)');
const end = source.indexOf("document.addEventListener('click',e=>{", start);
if (start < 0 || end < 0) throw new Error('M3U parser block not found');

const context = { URL };
vm.runInNewContext(source.slice(start, end) + '\nglobalThis.parseRadioM3U = parseRadioM3U;', context);
const parse = context.parseRadioM3U;
const sample = `\uFEFF#EXTM3U
#EXTINF:-1 tvg-id="one" tvg-logo="https://example.org/logo.png" group-title="Iran, Persian",Radio One, Extra
https://example.org/radio.mp3
#EXTGRP:Classical
#EXTINF:-1 tvg-name="Radio Two" tvg-language="Persian"
https://example.org/live.m3u8
#EXTINF:-1,Local file
file:///music/radio.mp3
`;
const items = parse(sample);
const check = (name, ok) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) process.exitCode = 1;
};
check('reads UTF-8 BOM and parses two valid station URLs', items.length === 2);
check('keeps commas in station names and quoted group titles', items[0]?.name === 'Radio One, Extra' && items[0]?.tags === 'Iran, Persian');
check('reads tvg-name and EXTGRP metadata', items[1]?.name === 'Radio Two' && items[1]?.tags === 'Classical');
check('detects HLS stream format', items[1]?.codec === 'HLS');
check('creates stable station IDs from stream URLs', items[0]?.stationuuid === parse(sample)[0]?.stationuuid);
