/* قالب «یادداشت A4» — با صفحه‌بندی خودکار
   - اگر متن یادداشت بیشتر از یک صفحه باشد، خودکار به چند صفحه تقسیم می‌شود.
   - صفحهٔ ۱: سرصفحه + مناسبت‌ها + شروع یادداشت
   - صفحهٔ ۲+: سرصفحهٔ سادهٔ «ادامه» + ادامهٔ یادداشت
   - خروجی PNG/SVG/HTML به‌صورت ZIP با همهٔ صفحات می‌آید.
*/
(function(){
'use strict';

const A4W = 1240, A4H = 1754;
const BODY_X = 80, BODY_TOP_P1 = 395, BODY_TOP_P2 = 220, BODY_BOTTOM = 1632;
const FONT_SIZE = 22, LINE_HEIGHT = 34;
const NOTE_FONT = '500 ' + FONT_SIZE + 'px Vazirmatn, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Noto Emoji", sans-serif';

/* محاسبهٔ تمام صفحات (بدون رسم) — بر اساس متن یادداشت */
function computeAllPages(i, noteText) {
  const bodyW = A4W - 160;
  const textW = bodyW - 80;
  const events = (typeof getEvents === 'function') ? getEvents(i) : [];

  // تخمین ارتفاع مناسبت‌ها روی صفحهٔ ۱
  let p1Start = BODY_TOP_P1 + LINE_HEIGHT;
  if (events.length > 0) {
    const n = Math.min(events.length, 5);
    p1Start += n * Math.round(LINE_HEIGHT * 1.15) + LINE_HEIGHT;
  }

  // تعداد خطوط قابل نمایش در هر صفحه
  const p1Lines = Math.max(5, Math.floor((BODY_BOTTOM - p1Start) / LINE_HEIGHT));
  const p2Lines = Math.max(5, Math.floor((BODY_BOTTOM - BODY_TOP_P2) / LINE_HEIGHT));

  // اندازه‌گیری متن
  const oldFont = ctx.font;
  ctx.font = NOTE_FONT;
  const allLines = wrapText(noteText || '', textW, NOTE_FONT);
  ctx.font = oldFont;

  if (!allLines.length) return [[]];

  const pages = [];
  let idx = 0;
  pages.push(allLines.slice(idx, idx + p1Lines));
  idx += p1Lines;
  while (idx < allLines.length) {
    pages.push(allLines.slice(idx, idx + p2Lines));
    idx += p2Lines;
  }
  return pages;
}

/* رسم سرصفحهٔ صفحهٔ ۱ */
function drawP1Header(i) {
  ctx.fillStyle = '#10201c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 28px Vazirmatn';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', A4W / 2, 78);
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(A4W / 2 - 200, 108); ctx.lineTo(A4W / 2 + 200, 108); ctx.stroke();

  drawLogoBadge(105, 90, 42, {
    ringOuter: '#063d35', ringInner: '#d4a437', bg: '#fffdf8',
    placeholderColor: '#063d35', placeholderFont: 14
  });

  const chName = (chEl.value || '').replace('@', '').trim();
  if (chName) {
    ctx.fillStyle = '#063d35'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const s = fit(chName, 300, 26, 800);
    ctx.font = '800 ' + s + 'px Vazirmatn';
    ctx.fillText(chName, A4W - 100, 90);
  }

  const wdW = 440, wdH = 60, wdY = 155;
  ctx.fillStyle = '#063d35';
  rr((A4W - wdW) / 2, wdY, wdW, wdH, wdH / 2); ctx.fill();
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 3;
  rr((A4W - wdW) / 2 + 4, wdY + 4, wdW - 8, wdH - 8, (wdH - 8) / 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 ' + fit(WD[i.wd], wdW - 60, 44, 900) + 'px Vazirmatn';
  ctx.fillText(WD[i.wd], A4W / 2, wdY + wdH / 2);

  const dbW = 340, dbH = 100, dGap = 20;
  const dStartX = (A4W - (dbW * 3 + dGap * 2)) / 2;
  const dY = 250;
  const dVals = [
    fa(i.s.d) + ' ' + FA_M[i.s.m - 1] + ' ' + fa(i.s.y),
    fa(i.h.d) + ' ' + AR_M[i.h.m - 1] + ' ' + fa(i.h.y),
    fa(i.g.d) + ' ' + EN_M[i.g.m - 1] + ' ' + i.g.y
  ];
  const dKinds = ['calendar', 'moon', 'globe'];
  for (let k = 0; k < 3; k++) {
    const bx = dStartX + k * (dbW + dGap);
    ctx.fillStyle = '#f7f1d9'; rr(bx, dY, dbW, dbH, 14); ctx.fill();
    ctx.strokeStyle = '#063d35'; ctx.lineWidth = 2.5;
    rr(bx, dY, dbW, dbH, 14); ctx.stroke();
    const iCx = bx + dbW - 38, iCy = dY + dbH / 2;
    ctx.fillStyle = '#063d35';
    ctx.beginPath(); ctx.arc(iCx, iCy, 24, 0, Math.PI * 2); ctx.fill();
    drawIconByKind(dKinds[k], iCx, iCy, 14, '#fff', '#063d35');
    ctx.fillStyle = '#10201c'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = '800 ' + fit(dVals[k], dbW - 90, 26, 800) + 'px Vazirmatn';
    ctx.fillText(dVals[k], bx + dbW - 80, iCy);
  }
}

/* رسم سرصفحهٔ سادهٔ صفحه‌های بعدی */
function drawContinuationHeader(currentPage, totalPages) {
  ctx.fillStyle = '#063d35'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 30px Vazirmatn';
  ctx.fillText('ادامه — صفحهٔ ' + fa(currentPage) + ' از ' + fa(totalPages), A4W / 2, 100);
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(A4W / 2 - 200, 135); ctx.lineTo(A4W / 2 + 200, 135); ctx.stroke();
}

/* رسم پنل مناسبت‌های صفحهٔ ۱ */
function drawEventsOnPage1(i, startY) {
  const events = getEvents(i);
  const official = events.filter(e => !e.user);
  const users = events.filter(e => e.user);
  const bodyW = A4W - 160;
  const textRight = BODY_X + bodyW - 20;
  let curY = startY;

  if (official.length > 0) {
    const hol = official.some(e => e.holiday);
    ctx.fillStyle = hol ? '#8b2c2c' : '#063d35';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = '800 18px Vazirmatn';
    ctx.fillText(hol ? '📌 تعطیل رسمی / مناسبت روز' : '📌 مناسبت روز', textRight, curY);
    curY += LINE_HEIGHT;
    official.forEach(ev => {
      const prefix = ev.holiday ? 'تعطیل رسمی: ' : '';
      const lines = wrapText(prefix + ev.title, bodyW - 100, '600 ' + FONT_SIZE + 'px Vazirmatn');
      lines.forEach(line => {
        if (curY > BODY_BOTTOM - 8) return;
        ctx.fillStyle = '#17310f'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.font = '600 ' + FONT_SIZE + 'px Vazirmatn';
        ctx.fillText(line, textRight, curY);
        curY += LINE_HEIGHT;
      });
    });
    curY += LINE_HEIGHT / 2;
  }

  if (users.length > 0) {
    users.forEach(ev => {
      const lines = wrapText(ev.title, bodyW - 100, '700 ' + FONT_SIZE + 'px Vazirmatn');
      lines.forEach((line, idx) => {
        if (curY > BODY_BOTTOM - 8) return;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.font = '700 ' + FONT_SIZE + 'px Vazirmatn';
        if (idx === 0) {
          ctx.fillStyle = '#d4a437';
          ctx.beginPath(); ctx.arc(textRight + 12, curY, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#10201c';
        ctx.fillText(line, textRight, curY);
        curY += LINE_HEIGHT;
      });
    });
    curY += LINE_HEIGHT / 2;
  }

  return curY;
}

function drawA4Notes(i) {
  const currentPage = Math.max(1, window.__a4PreviewPage || 1);
  const noteText = (noteEl.value || '').trim();
  const pages = computeAllPages(i, noteText);
  const totalPages = pages.length;
  const pageNum = Math.min(currentPage, totalPages);
  const currentLines = pages[pageNum - 1] || [];

  // ذخیرهٔ وضعیت برای رابط کاربری
  window.__a4PageInfo = {
    current: pageNum,
    total: totalPages,
    totalNoteLines: pages.reduce((s, p) => s + p.length, 0)
  };
  window.__a4PreviewPage = pageNum;

  // پس‌زمینه و قاب
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, A4W, A4H);
  ctx.strokeStyle = '#063d35'; ctx.lineWidth = 6;
  rr(20, 20, A4W - 40, A4H - 40, 18); ctx.stroke();
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2;
  rr(32, 32, A4W - 64, A4H - 64, 12); ctx.stroke();

  // سرصفحه بر اساس شماره صفحه
  let bodyStartY;
  if (pageNum === 1) {
    drawP1Header(i);
    bodyStartY = BODY_TOP_P1;
  } else {
    drawContinuationHeader(pageNum, totalPages);
    bodyStartY = BODY_TOP_P2;
  }

  // خطوط راهنمای دفترچه‌ای
  const bodyW = A4W - 160;
  ctx.strokeStyle = 'rgba(6,61,53,0.13)'; ctx.lineWidth = 1;
  const numLines = Math.floor((BODY_BOTTOM - bodyStartY) / LINE_HEIGHT);
  for (let k = 1; k <= numLines; k++) {
    const ly = bodyStartY + k * LINE_HEIGHT;
    ctx.beginPath(); ctx.moveTo(BODY_X, ly); ctx.lineTo(BODY_X + bodyW, ly); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(212,164,55,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(BODY_X + 70, bodyStartY); ctx.lineTo(BODY_X + 70, BODY_BOTTOM); ctx.stroke();

  // محتوا
  let curY = bodyStartY + LINE_HEIGHT / 2;
  const textRight = BODY_X + bodyW - 20;
  const maxY = BODY_BOTTOM - 8;

  // مناسبت‌ها فقط روی صفحهٔ ۱
  if (pageNum === 1) {
    curY = drawEventsOnPage1(i, curY);
  }

  // خطوط یادداشت این صفحه
  currentLines.forEach(line => {
    if (curY > maxY) return;
    ctx.fillStyle = '#10201c'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = NOTE_FONT;
    ctx.fillText(line, textRight, curY);
    curY += LINE_HEIGHT;
  });

  // فوتر
  const fY = 1640, fH = 84, fX = 80, fW = A4W - 160;
  ctx.fillStyle = '#063d35';
  rr(fX, fY, fW, fH, 14); ctx.fill();
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2.5;
  rr(fX, fY, fW, fH, 14); ctx.stroke();
  const fCY = fY + fH / 2;

  // شماره صفحه در فوتر (اگر چندصفحه‌ای)
  if (totalPages > 1) {
    ctx.fillStyle = '#f0c34f'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = '800 20px Vazirmatn';
    ctx.fillText('صفحهٔ ' + fa(pageNum) + ' از ' + fa(totalPages), fX + fW - 20, fCY);
  }

  // آیکون تماس + شماره
  drawRoundIcon('phone', fX + 40, fCY, 18, '#d4a437', '#063d35');
  ctx.fillStyle = '#f0c34f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.direction = 'ltr'; ctx.font = '700 20px Arial';
  ctx.fillText(phEl.value || '', fX + 75, fCY); ctx.restore();

  // QR فقط در صفحهٔ ۱
  const url = validUrl(chUrlEl.value);
  const showQR = showQREl.checked && !!url;
  const qrSize = 68;
  const qrRight = fX + fW - 20 - (totalPages > 1 ? 110 : 0);
  const qrX = qrRight - qrSize;
  if (showQR && pageNum === 1) {
    const qrY = fY + (fH - qrSize) / 2;
    drawQRCanvas(getQRMatrix(url), qrX, qrY, qrSize);
  }

  // نام کانال فقط در صفحهٔ ۱
  if (pageNum === 1) {
    const chName = (chEl.value || '').replace('@', '').trim();
    if (chName) {
      ctx.fillStyle = '#f0c34f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const chR = showQR ? qrX - 20 : fX + fW - 30;
      const chL = fX + 380;
      const chWF = chR - chL;
      if (chWF > 40) {
        ctx.font = '800 ' + fit(chName, chWF - 20, 22, 800) + 'px Vazirmatn';
        ctx.fillText(chName, chL + chWF / 2, fCY);
      }
    }
  }
}

registerTemplate({
  id: 'a4notes',
  label: 'یادداشت A4 📝',
  short: 'A4 یادداشت',
  group: 'عمومی',
  dims: { w: A4W, h: A4H },
  skipEventBadge: true,
  multipage: true,
  photoArea: { x: -9999, y: -9999, w: 0, h: 0 },
  clickRegions: {
    phone: { x: 80, y: 1640, w: 380, h: 84 },
    channel: [{ x: 680, y: 1640, w: 480, h: 84 }]
  },
  swatch: 'linear-gradient(135deg,#fffdf8,#f7f1d9 50%,#063d35)',
  style: {
    panel: '#063d35', frame: '#063d35', inner: '#d4a437',
    goldText: '#d4a437', darkText: '#10201c', bg: '#fffdf8',
    panelR: 20, outerR: 20, photoR: 0, softR: 14, pillR: 30,
    goldA: '#a56a07', goldB: '#f0c34f', shadow: 0.2
  },
  draw: drawA4Notes
});
})();
