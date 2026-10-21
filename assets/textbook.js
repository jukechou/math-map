/*
 * 教材版本切换（数学）：北师大版（默认）/ 人教版。
 * 原理：数据加载后调用 Textbook.apply(topics)，把每个小学与初中数学知识点的
 * grade / semester / chapter 替换为北师大版册次（bnu_* 字段），并按北师大
 * 版册次顺序稳定排序；高中与英语不受影响。
 * 在导航栏注入版本切换下拉框，选择保存在 localStorage。
 */
(function () {
  'use strict';
  var KEY = 'textbook-version';
  var current = 'bsd';
  try { current = localStorage.getItem(KEY) || 'bsd'; } catch (e) { /* 无痕模式等 */ }
  if (current !== 'rj' && current !== 'bsd') current = 'bsd';

  var VOL_IDX = {
    '一上': 1, '一下': 2, '二上': 3, '二下': 4, '三上': 5, '三下': 6,
    '四上': 7, '四下': 8, '五上': 9, '五下': 10, '六上': 11, '六下': 12,
    '七上': 13, '七下': 14, '八上': 15, '八下': 16, '九上': 17, '九下': 18,
    '九全': 18.5, '高一': 19, '高二': 20, '选必一': 21, '选必二': 22, '选必三': 23
  };
  var CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

  function chapterNum(no) {
    var m = /^第(.+?)(章|单元)$/.exec(no || '');
    if (!m) return 99;
    var s = m[1];
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (s === '十') return 10;
    var i10 = s.indexOf('十');
    if (i10 < 0) return CN_NUM[s] || 99;
    var a = s.slice(0, i10), b = s.slice(i10 + 1);
    var n = (a ? CN_NUM[a] : 1) * 10 + (b ? (CN_NUM[b] || 0) : 0);
    return n || 99;
  }

  function sectionKey(sec) {
    if (!sec) return [99, 0];
    var head = sec.split('/')[0];
    var parts = head.split('.');
    var a = parseInt(parts[0], 10), b = parseInt(parts[1] || '0', 10);
    if (isNaN(a)) return [99, 0];
    return [a, isNaN(b) ? 0 : b];
  }

  function volumeIdx(chapterStr) {
    var first = String(chapterStr || '').split(' ')[0];
    var v = VOL_IDX[first];
    if (v !== undefined) return v;
    /* 小学格式："一年级上册 第1单元 …" */
    var m = /^([一二三四五六])年级([上下全])册$/.exec(first);
    if (m) return CN_NUM[m[1]] * 2 - 1 + (m[2] === '下' ? 1 : 0);
    return 999;
  }

  function sortKey(topic) {
    var parts = String(topic.chapter || '').split(' ');
    var vol = volumeIdx(topic.chapter);
    if (vol === 999) return [999, 0, 0, 0];
    var no = /^(第\S+章|第\S+单元)$/.test(parts[1] || '') ? chapterNum(parts[1]) : 99;
    var sk = sectionKey(parts[3]);
    return [vol, no, sk[0], sk[1]];
  }

  function apply(topics) {
    if (!Array.isArray(topics)) return topics;
    if (current === 'bsd') {
      topics.forEach(function (t) {
        if (t && typeof t.bnu_chapter === 'string' && t.bnu_chapter) {
          t.chapter = t.bnu_chapter;
          if (typeof t.bnu_grade === 'number') t.grade = t.bnu_grade;
          if (t.bnu_semester) t.semester = t.bnu_semester;
        }
      });
    }
    return topics.slice().sort(function (a, b) {
      var ka = sortKey(a), kb = sortKey(b);
      for (var i = 0; i < ka.length; i++) {
        if (ka[i] !== kb[i]) return ka[i] - kb[i];
      }
      return 0; /* 稳定排序：同章内保持原相对顺序 */
    });
  }

  function injectSwitcher() {
    var params = new URLSearchParams(location.search);
    if (params.get('subject') === 'english') return; /* 英语页不显示教材切换 */
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var style = document.createElement('style');
    style.textContent = '.tb-switch{margin-left:8px;display:inline-flex;align-items:center;gap:4px;font-size:13px;color:inherit;opacity:.85}' +
      '.tb-switch select{font:inherit;font-size:13px;padding:2px 6px;border:1px solid rgba(127,127,127,.45);border-radius:8px;background:transparent;color:inherit;cursor:pointer}' +
      '@media (max-width:700px){.site-nav{flex-wrap:wrap}.tb-switch{margin-left:0}}';
    document.head.appendChild(style);
    var wrap = document.createElement('span');
    wrap.className = 'tb-switch';
    wrap.title = '数学教材版本（小学与初中支持北师大版，高中仍按人教版目录显示）';
    var label = document.createElement('span');
    label.textContent = '教材';
    var sel = document.createElement('select');
    sel.id = 'tb-switch';
    var optB = document.createElement('option');
    optB.value = 'bsd'; optB.textContent = '北师大版';
    var optR = document.createElement('option');
    optR.value = 'rj'; optR.textContent = '人教版';
    sel.append(optB, optR);
    sel.value = current;
    sel.addEventListener('change', function () {
      try { localStorage.setItem(KEY, sel.value); } catch (e) { /* 忽略 */ }
      location.reload();
    });
    wrap.append(label, sel);
    nav.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSwitcher);
  } else {
    injectSwitcher();
  }

  window.Textbook = { get: function () { return current; }, apply: apply };
})();
