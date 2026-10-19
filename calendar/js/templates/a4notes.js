/* قالب «یادداشت A4» — فضای بزرگ برای متن و یادداشت
   ابعاد منطقی: 1240×1754 (نسبت A4)
   ویژگی‌ها:
   - فضای بزرگ یادداشت (~36 خط)
   - مناسبت‌های رسمی با برچسب کوچک
   - مناسبت‌های کاربر بدون برچسب (برای تقدیر، تشکر، تمجید، ...)
   - بدون عکس (تمرکز روی متن)
*/
(function(){
'use strict';

const A4W = 1240, A4H = 1754;

function drawA4Notes(i){
  const W = A4W, H = A4H;

  // پس‌زمینه
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, W, H);

  // قاب
  ctx.strokeStyle = '#063d35'; ctx.lineWidth = 6;
  rr(20, 20, W - 40, H - 40, 18); ctx.stroke();
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2;
  rr(32, 32, W - 64, H - 64, 12); ctx.stroke();

  // سرصفحه
  ctx.fillStyle = '#10201c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 28px Vazirmatn';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', W / 2, 78);
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 200, 108); ctx.lineTo(W / 2 + 200, 108); ctx.stroke();

  // لوگو
  drawLogoBadge(105, 90, 42, {
    ringOuter: '#063d35', ringInner: '#d4a437', bg: '#fffdf8',
    placeholderColor: '#063d35', placeholderFont: 14
  });

  // نام کانال
  const chName = (chEl.value || '').replace('@', '').trim();
  if (chName) {
    ctx.fillStyle = '#063d35'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const chSize = fit(chName, 300, 26, 800);
    ctx.font = '800 ' + chSize + 'px Vazirmatn';
    ctx.fillText(chName, W - 100, 90);
  }

  // پیل روز هفته
  const wdW = 440, wdH = 60, wdY = 155;
  ctx.fillStyle = '#063d35';
  rr((W - wdW) / 2, wdY, wdW, wdH, wdH / 2); ctx.fill();
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 3;
  rr((W - wdW) / 2 + 4, wdY + 4, wdW - 8, wdH - 8, (wdH - 8) / 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 ' + fit(WD[i.wd], wdW - 60, 44, 900) + 'px Vazirmatn';
  ctx.fillText(WD[i.wd], W / 2, wdY + wdH / 2);

  // سه تاریخ
  const dbW = 340, dbH = 100, dGap = 20;
  const dStartX = (W - (dbW * 3 + dGap * 2)) / 2;
  const dY = 250;
  const dVals = [
    fa(i.s.d) + ' ' + FA_M[i.s.m - 1] + ' ' + fa(i.s.y),
    fa(i.h.d) + ' ' + AR_M[i.h.m - 1] + ' ' + fa(i.h.y),
    fa(i.g.d) + ' ' + EN_M[i.g.m - 1] + ' ' + i.g.y
  ];
  const dKinds = ['calendar', 'moon', 'globe'];
  for (let k = 0; k < 3; k++) {
    const bx = dStartX + k * (dbW + dGap);
    ctx.fillStyle = '#f7f1d9';
    rr(bx, dY, dbW, dbH, 14); ctx.fill();
    ctx.strokeStyle = '#063d35'; ctx.lineWidth = 2.5;
    rr(bx, dY, dbW, dbH, 14); ctx.stroke();
    const iCx = bx + dbW - 38, iCy = dY + dbH / 2;
    ctx.fillStyle = '#063d35';
    ctx.beginPath(); ctx.arc(iCx, iCy, 24, 0, Math.PI * 2); ctx.fill();
    drawIconByKind(dKinds[k], iCx, iCy, 14, '#fff', '#063d35');
    ctx.fillStyle = '#10201c'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const vS = fit(dVals[k], dbW - 90, 26, 800);
    ctx.font = '800 ' + vS + 'px Vazirmatn';
    ctx.fillText(dVals[k], bx + dbW - 80, iCy);
  }

  // بدنهٔ یادداشت
  const bodyX = 80, bodyY = dY + dbH + 45, bodyW = W - 160;
  const bodyH = 1640 - bodyY, lineHeight = 34, fontSize = 22;
  const textRight = bodyX + bodyW - 20;

  // خطوط راهنمای دفترچه‌ای
  ctx.strokeStyle = 'rgba(6,61,53,0.13)'; ctx.lineWidth = 1;
  const numLines = Math.floor(bodyH / lineHeight);
  for (let k = 1; k <= numLines; k++) {
    const ly = bodyY + k * lineHeight;
    ctx.beginPath(); ctx.moveTo(bodyX, ly); ctx.lineTo(bodyX + bodyW, ly); ctx.stroke();
  }
  // حاشیهٔ دفتر
  ctx.strokeStyle = 'rgba(212,164,55,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bodyX + 70, bodyY); ctx.lineTo(bodyX + 70, bodyY + bodyH); ctx.stroke();

  let curY = bodyY + lineHeight / 2;
  const maxY = bodyY + bodyH - 8;

  const events = getEvents(i);
  const official = events.filter(e => !e.user);
  const users = events.filter(e => e.user);

  // مناسبت‌های رسمی — با برچسب
  if (official.length > 0) {
    const hol = official.some(e => e.holiday);
    ctx.fillStyle = hol ? '#8b2c2c' : '#063d35';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = '800 18px Vazirmatn';
    ctx.fillText(hol ? '📌 تعطیل رسمی / مناسبت روز' : '📌 مناسبت روز', textRight, curY);
    curY += lineHeight;
    official.forEach(ev => {
      const prefix = ev.holiday ? 'تعطیل رسمی: ' : '';
      const lines = wrapText(prefix + ev.title, bodyW - 100, '600 ' + fontSize + 'px Vazirmatn');
      lines.forEach(line => {
        if (curY > maxY) return;
        ctx.fillStyle = '#17310f'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.font = '600 ' + fontSize + 'px Vazirmatn';
        ctx.fillText(line, textRight, curY);
        curY += lineHeight;
      });
    });
    curY += lineHeight / 2;
  }

  // مناسبت‌های کاربر — بدون برچسب
  if (users.length > 0) {
    users.forEach(ev => {
      const lines = wrapText(ev.title, bodyW - 100, '700 ' + fontSize + 'px Vazirmatn');
      lines.forEach((line, idx) => {
        if (curY > maxY) return;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.font = '700 ' + fontSize + 'px Vazirmatn';
        if (idx === 0) {
          ctx.fillStyle = '#d4a437';
          ctx.beginPath(); ctx.arc(textRight + 12, curY, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#10201c';
        ctx.fillText(line, textRight, curY);
        curY += lineHeight;
      });
    });
    curY += lineHeight / 2;
  }

  // یادداشت
  const noteText = (noteEl.value || '').trim();
  if (noteText) {
    const noteLines = wrapText(noteText, bodyW - 80, '500 ' + fontSize + 'px Vazirmatn');
    noteLines.forEach(line => {
      if (curY > maxY) return;
      ctx.fillStyle = '#10201c'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.font = '500 ' + fontSize + 'px Vazirmatn';
      ctx.fillText(line, textRight, curY);
      curY += lineHeight;
    });
  }

  // فوتر
  const fY = 1640, fH = 84, fX = 80, fW = W - 160;
  ctx.fillStyle = '#063d35';
  rr(fX, fY, fW, fH, 14); ctx.fill();
  ctx.strokeStyle = '#d4a437'; ctx.lineWidth = 2.5;
  rr(fX, fY, fW, fH, 14); ctx.stroke();
  const fCY = fY + fH / 2;

  drawRoundIcon('phone', fX + 40, fCY, 18, '#d4a437', '#063d35');
  ctx.fillStyle = '#f0c34f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.direction = 'ltr'; ctx.font = '700 20px Arial';
  ctx.fillText(phEl.value || '', fX + 75, fCY); ctx.restore();

  const url = validUrl(chUrlEl.value);
  const showQR = showQREl.checked && !!url;
  const qrSize = 68, qrX = fX + fW - 20 - qrSize;
  if (showQR) {
    const qrY = fY + (fH - qrSize) / 2;
    drawQRCanvas(getQRMatrix(url), qrX, qrY, qrSize);
  }
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

registerTemplate({
  id: 'a4notes',
  label: 'یادداشت A4 📝',
  short: 'A4 یادداشت',
  group: 'عمومی',
  dims: { w: A4W, h: A4H },
  skipEventBadge: true,
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
