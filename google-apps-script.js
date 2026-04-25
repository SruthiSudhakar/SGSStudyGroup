// ============================================================
// Google Apps Script — Quiz Backend
// ============================================================
// HOW TO USE:
// 1. Create a Google Sheet with two tabs: "Responses" and "AnswerKey"
// 2. In "Responses", add header row: Timestamp | Name | Score | Q1 | Q2 | ... | Q10
// 3. In "AnswerKey", add header row: Question | Answer
//    Then rows: 1 | A   2 | C   etc. (fill in correct answers for your 10 questions)
// 4. Open Extensions > Apps Script, paste this entire file
// 5. Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy the deployment URL and paste it into script.js as APPS_SCRIPT_URL
//
// IMPORTANT: Every time you edit this code, you must create a NEW deployment
// (Deploy > New deployment), not update an existing one.
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name = (data.name || "").trim();
    var answers = data.answers || [];

    if (!name) {
      return jsonResponse({ success: false, error: "Name is required." });
    }
    if (answers.length !== 10) {
      return jsonResponse({ success: false, error: "Exactly 10 answers required." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var responses = ss.getSheetByName("Responses");
    var keySheet = ss.getSheetByName("AnswerKey");

    // Check for duplicate (case-insensitive)
    var existingNames = responses.getRange("B2:B" + Math.max(2, responses.getLastRow()))
      .getValues()
      .flat()
      .filter(String)
      .map(function(n) { return n.toString().trim().toLowerCase(); });

    if (existingNames.indexOf(name.toLowerCase()) !== -1) {
      // Return their existing results + current stats
      var stats = computeStats(responses, keySheet);
      var row = findStudentRow(responses, name);
      if (row) {
        stats.score = row.score;
        stats.answers = row.answers;
        stats.correctAnswers = getAnswerKey(keySheet);
      }
      stats.success = false;
      stats.error = "duplicate";
      stats.alreadySubmitted = true;
      return jsonResponse(stats);
    }

    // Score against answer key
    var key = getAnswerKey(keySheet);
    var score = 0;
    answers.forEach(function(ans, i) {
      if (ans === key[i]) score++;
    });

    // Append row: Timestamp | Name | Score | Q1..Q10
    var row = [new Date(), name, score].concat(answers);
    responses.appendRow(row);

    // Compute stats
    var stats = computeStats(responses, keySheet);
    stats.score = score;
    stats.answers = answers;
    stats.correctAnswers = key;
    stats.success = true;

    return jsonResponse(stats);

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    var name = ((e.parameter && e.parameter.name) || "").trim();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var responses = ss.getSheetByName("Responses");
    var keySheet = ss.getSheetByName("AnswerKey");

    if (!name) {
      // No name provided — just return aggregate stats
      var stats = computeStats(responses, keySheet);
      stats.found = false;
      return jsonResponse(stats);
    }

    var row = findStudentRow(responses, name);
    if (!row) {
      return jsonResponse({ found: false });
    }

    var stats = computeStats(responses, keySheet);
    stats.found = true;
    stats.score = row.score;
    stats.answers = row.answers;
    stats.correctAnswers = getAnswerKey(keySheet);

    return jsonResponse(stats);

  } catch (err) {
    return jsonResponse({ found: false, error: err.toString() });
  }
}

// ---- Helpers ----

function getAnswerKey(keySheet) {
  return keySheet.getRange("B2:B11").getValues().flat().map(function(v) {
    return v.toString().trim().toUpperCase();
  });
}

function findStudentRow(responses, name) {
  var lastRow = responses.getLastRow();
  if (lastRow < 2) return null;

  var data = responses.getRange(2, 1, lastRow - 1, 13).getValues();
  var target = name.trim().toLowerCase();

  for (var i = 0; i < data.length; i++) {
    if (data[i][1].toString().trim().toLowerCase() === target) {
      return {
        score: data[i][2],
        answers: data[i].slice(3, 13).map(function(v) { return v.toString().trim(); })
      };
    }
  }
  return null;
}

function computeStats(responses, keySheet) {
  var lastRow = responses.getLastRow();
  if (lastRow < 2) {
    return {
      numSubmissions: 0,
      classAverage: 0,
      distribution: [0,0,0,0,0,0,0,0,0,0,0],
      perQuestion: [0,0,0,0,0,0,0,0,0,0]
    };
  }

  var data = responses.getRange(2, 1, lastRow - 1, 13).getValues();
  var key = getAnswerKey(keySheet);
  var numSubmissions = data.length;

  // Score distribution (index = score 0-10)
  var distribution = [0,0,0,0,0,0,0,0,0,0,0];
  var totalScore = 0;

  // Per-question correct count
  var perQuestionCorrect = [0,0,0,0,0,0,0,0,0,0];

  data.forEach(function(row) {
    var score = parseInt(row[2]) || 0;
    distribution[score] = (distribution[score] || 0) + 1;
    totalScore += score;

    // Check each answer
    for (var q = 0; q < 10; q++) {
      var studentAnswer = row[3 + q].toString().trim().toUpperCase();
      if (studentAnswer === key[q]) {
        perQuestionCorrect[q]++;
      }
    }
  });

  var classAverage = Math.round((totalScore / numSubmissions) * 10) / 10;
  var perQuestion = perQuestionCorrect.map(function(c) {
    return Math.round((c / numSubmissions) * 100) / 100;
  });

  return {
    numSubmissions: numSubmissions,
    classAverage: classAverage,
    distribution: distribution,
    perQuestion: perQuestion
  };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
