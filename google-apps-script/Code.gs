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

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
