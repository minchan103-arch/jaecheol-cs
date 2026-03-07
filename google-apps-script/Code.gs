// ============================================================
// 제철삼촌 CS 자동챗봇 - Google Sheets 연동 스크립트
// ============================================================
// [사용 방법]
// 1. 구글 스프레드시트 새로 만들기
// 2. 확장 프로그램 → Apps Script 클릭
// 3. 기존 코드 전부 지우고 이 파일 내용 전부 붙여넣기
// 4. 저장 (Ctrl+S)
// 5. 배포 → 새 배포 → 유형: 웹 앱
//    - 다음 사용자로 실행: 나 (본인 계정)
//    - 액세스 권한: 모든 사용자
// 6. 배포 → URL 복사 → .env.local의 SHEETS_WEBHOOK_URL에 붙여넣기
// ============================================================

var SHEET_NAME = '문의내역';

// 주간박스 미리보기
var WEEKLY_BOX_SHEET = '주간박스';

// 조카 프로필
var PROFILE_SHEET = '조카프로필';
var PROFILE_HEADERS = [
  '프로필ID', '생성일', '수정일', '채널', '카카오ID', '전화번호', '닉네임',
  '직업', '연령대', '구매목적', '맛취향', '알림선호', '퀴즈결과', '수집방법', '세션IDs', '메모'
];
var WEEKLY_BOX_HEADERS = [
  '과일명', '산지', '가격', '이미지URL', '재고수량', '총재고', '마감일', '주문링크', '표시여부'
];

var HEADERS = [
  '번호', '타임스탬프', '플랫폼', '세션ID',
  '고객문의', '챗봇답변', '처리상태', '카카오전달', '담당자메모'
];

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#FF6B35');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 50);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 250);
    sheet.setColumnWidth(6, 300);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 80);
    sheet.setColumnWidth(9, 200);
  }

  return sheet;
}

// GET 요청 - action 파라미터로 분기
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'append') return appendRow(e);
    if (action === 'updateStatus') return updateStatus(e);
    if (action === 'readWeeklyBox') return readWeeklyBox();
    if (action === 'findProfile') return findProfile(e);
    if (action === 'appendProfile') return appendProfile(e);
    if (action === 'updateProfile') return updateProfile(e);
    if (action === 'readProfiles') return readProfiles();
    return readRows();
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// 행 추가 (?action=append&data=JSON)
function appendRow(e) {
  var raw = e.parameter.data;
  if (!raw) return jsonResponse({ success: false, error: 'data 파라미터 없음' });

  var body = JSON.parse(raw);
  var sheet = getSheet();
  var rowNum = sheet.getLastRow();

  sheet.appendRow([
    rowNum,
    body.timestamp,
    body.platform,
    body.sessionId,
    body.message,
    body.reply,
    body.status,
    body.kakaoSent,
    ''
  ]);

  var newRow = sheet.getLastRow();
  var statusCell = sheet.getRange(newRow, 7);
  if (body.status === '카카오전달') {
    statusCell.setBackground('#FFE0B2');
  } else if (body.status === '자동처리완료') {
    statusCell.setBackground('#E8F5E9');
  }

  return jsonResponse({ success: true });
}

// 상태 업데이트 (?action=updateStatus&row=번호&status=처리완료)
function updateStatus(e) {
  var rowNum = e.parameter.row;
  var status = e.parameter.status;
  if (!rowNum || !status) return jsonResponse({ success: false, error: '파라미터 누락' });

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  for (var i = 2; i <= lastRow; i++) {
    var num = String(sheet.getRange(i, 1).getValue());
    if (num === String(rowNum)) {
      sheet.getRange(i, 7).setValue(status);
      if (status === '처리완료') {
        sheet.getRange(i, 7).setBackground('#E3F2FD'); // 연파랑
      }
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: '해당 행을 찾을 수 없음' });
}

// 전체 데이터 조회 (대시보드용)
function readRows() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ rows: [] });
  }

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  var rows = data.map(function(row) {
    return {
      num: String(row[0] || ''),
      timestamp: String(row[1] || ''),
      platform: String(row[2] || ''),
      sessionId: String(row[3] || ''),
      message: String(row[4] || ''),
      reply: String(row[5] || ''),
      status: String(row[6] || ''),
      kakaoSent: row[7] === 'Y',
      memo: String(row[8] || '')
    };
  });

  return jsonResponse({ rows: rows });
}

// 주간박스 시트 가져오기 (없으면 자동 생성)
function getWeeklyBoxSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(WEEKLY_BOX_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(WEEKLY_BOX_SHEET);
    sheet.appendRow(WEEKLY_BOX_HEADERS);

    var headerRange = sheet.getRange(1, 1, 1, WEEKLY_BOX_HEADERS.length);
    headerRange.setBackground('#FF6B35');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 250);
    sheet.setColumnWidth(5, 80);
    sheet.setColumnWidth(6, 80);
    sheet.setColumnWidth(7, 120);
    sheet.setColumnWidth(8, 250);
    sheet.setColumnWidth(9, 80);
  }

  return sheet;
}

// 주간박스 데이터 조회 (?action=readWeeklyBox)
function readWeeklyBox() {
  var sheet = getWeeklyBoxSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ items: [], deadline: '' });
  }

  var data = sheet.getRange(2, 1, lastRow - 1, WEEKLY_BOX_HEADERS.length).getValues();
  var items = [];
  var deadline = '';

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var visible = String(row[8]).toUpperCase();
    if (visible !== 'Y') continue;

    items.push({
      name: String(row[0] || ''),
      origin: String(row[1] || ''),
      price: String(row[2] || ''),
      imageUrl: String(row[3] || ''),
      stock: Number(row[4]) || 0,
      totalStock: Number(row[5]) || 0,
      deadline: String(row[6] || ''),
      orderUrl: String(row[7] || '')
    });

    if (!deadline && String(row[6])) {
      deadline = String(row[6]);
    }
  }

  return jsonResponse({ items: items, deadline: deadline });
}

// ============================================================
// 조카 프로필 관련 함수
// ============================================================

function getProfileSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROFILE_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(PROFILE_SHEET);
    sheet.appendRow(PROFILE_HEADERS);

    var headerRange = sheet.getRange(1, 1, 1, PROFILE_HEADERS.length);
    headerRange.setBackground('#FF6B35');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 80);   // 프로필ID
    sheet.setColumnWidth(2, 150);  // 생성일
    sheet.setColumnWidth(3, 150);  // 수정일
    sheet.setColumnWidth(4, 80);   // 채널
    sheet.setColumnWidth(5, 120);  // 카카오ID
    sheet.setColumnWidth(6, 120);  // 전화번호
    sheet.setColumnWidth(7, 100);  // 닉네임
    sheet.setColumnWidth(8, 80);   // 직업
    sheet.setColumnWidth(9, 60);   // 연령대
    sheet.setColumnWidth(10, 80);  // 구매목적
    sheet.setColumnWidth(11, 80);  // 맛취향
    sheet.setColumnWidth(12, 80);  // 알림선호
    sheet.setColumnWidth(13, 80);  // 퀴즈결과
    sheet.setColumnWidth(14, 80);  // 수집방법
    sheet.setColumnWidth(15, 200); // 세션IDs
    sheet.setColumnWidth(16, 200); // 메모
  }

  return sheet;
}

function rowToProfile(row) {
  return {
    profileId: String(row[0] || ''),
    createdAt: String(row[1] || ''),
    updatedAt: String(row[2] || ''),
    channel: String(row[3] || ''),
    kakaoId: String(row[4] || ''),
    phone: String(row[5] || ''),
    nickname: String(row[6] || ''),
    occupation: String(row[7] || ''),
    ageRange: String(row[8] || ''),
    purpose: String(row[9] || ''),
    taste: String(row[10] || ''),
    notification: String(row[11] || ''),
    quizResult: String(row[12] || ''),
    collectionMethod: String(row[13] || ''),
    sessionIds: String(row[14] || ''),
    memo: String(row[15] || '')
  };
}

// 프로필 검색 (?action=findProfile&kakaoId=xxx OR &phone=xxx OR &sessionId=xxx)
function findProfile(e) {
  var kakaoId = e.parameter.kakaoId || '';
  var phone = e.parameter.phone || '';
  var sessionId = e.parameter.sessionId || '';

  if (!kakaoId && !phone && !sessionId) {
    return jsonResponse({ found: false, error: '검색 조건 없음' });
  }

  var sheet = getProfileSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ found: false });

  var data = sheet.getRange(2, 1, lastRow - 1, PROFILE_HEADERS.length).getValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // 카카오ID 매칭 (col E = index 4)
    if (kakaoId && String(row[4]) === kakaoId) {
      return jsonResponse({ found: true, profile: rowToProfile(row) });
    }
    // 전화번호 매칭 (col F = index 5)
    if (phone && String(row[5]) === phone) {
      return jsonResponse({ found: true, profile: rowToProfile(row) });
    }
    // 세션ID 매칭 (col O = index 14, 쉼표 구분 목록)
    if (sessionId) {
      var sessions = String(row[14] || '').split(',');
      for (var j = 0; j < sessions.length; j++) {
        if (sessions[j].trim() === sessionId) {
          return jsonResponse({ found: true, profile: rowToProfile(row) });
        }
      }
    }
  }

  return jsonResponse({ found: false });
}

// 프로필 추가 (?action=appendProfile&data=JSON)
function appendProfile(e) {
  var raw = e.parameter.data;
  if (!raw) return jsonResponse({ success: false, error: 'data 파라미터 없음' });

  var body = JSON.parse(raw);
  var sheet = getProfileSheet();
  var rowCount = sheet.getLastRow();
  var profileId = 'P-' + String(rowCount).padStart(5, '0');
  var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  sheet.appendRow([
    profileId,
    now,
    now,
    body.channel || '',
    body.kakaoId || '',
    body.phone || '',
    body.nickname || '',
    body.occupation || '',
    body.ageRange || '',
    body.purpose || '',
    body.taste || '',
    body.notification || '',
    body.quizResult || '',
    body.collectionMethod || '',
    body.sessionIds || '',
    body.memo || ''
  ]);

  return jsonResponse({ success: true, profileId: profileId });
}

// 프로필 업데이트 (?action=updateProfile&profileId=P-00001&data=JSON)
function updateProfile(e) {
  var profileId = e.parameter.profileId;
  var raw = e.parameter.data;
  if (!profileId || !raw) return jsonResponse({ success: false, error: '파라미터 누락' });

  var body = JSON.parse(raw);
  var sheet = getProfileSheet();
  var lastRow = sheet.getLastRow();

  for (var i = 2; i <= lastRow; i++) {
    if (String(sheet.getRange(i, 1).getValue()) === profileId) {
      var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(i, 3).setValue(now); // 수정일

      // 비어있지 않은 필드만 업데이트
      if (body.channel) sheet.getRange(i, 4).setValue(body.channel);
      if (body.kakaoId) sheet.getRange(i, 5).setValue(body.kakaoId);
      if (body.phone) sheet.getRange(i, 6).setValue(body.phone);
      if (body.nickname) sheet.getRange(i, 7).setValue(body.nickname);
      if (body.occupation) sheet.getRange(i, 8).setValue(body.occupation);
      if (body.ageRange) sheet.getRange(i, 9).setValue(body.ageRange);
      if (body.purpose) sheet.getRange(i, 10).setValue(body.purpose);
      if (body.taste) sheet.getRange(i, 11).setValue(body.taste);
      if (body.notification) sheet.getRange(i, 12).setValue(body.notification);
      if (body.quizResult) sheet.getRange(i, 13).setValue(body.quizResult);
      if (body.collectionMethod) sheet.getRange(i, 14).setValue(body.collectionMethod);

      // 세션ID는 기존 값에 추가 (중복 방지)
      if (body.sessionIds) {
        var existing = String(sheet.getRange(i, 15).getValue() || '');
        var existingList = existing ? existing.split(',').map(function(s) { return s.trim(); }) : [];
        var newIds = body.sessionIds.split(',').map(function(s) { return s.trim(); });
        for (var j = 0; j < newIds.length; j++) {
          if (newIds[j] && existingList.indexOf(newIds[j]) === -1) {
            existingList.push(newIds[j]);
          }
        }
        sheet.getRange(i, 15).setValue(existingList.join(','));
      }

      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: '프로필을 찾을 수 없음' });
}

// 전체 프로필 조회 (대시보드용, ?action=readProfiles)
function readProfiles() {
  var sheet = getProfileSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return jsonResponse({ profiles: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, PROFILE_HEADERS.length).getValues();
  var profiles = data.map(function(row) { return rowToProfile(row); });

  return jsonResponse({ profiles: profiles });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
