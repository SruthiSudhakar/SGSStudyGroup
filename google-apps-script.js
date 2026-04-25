// ============================================================
// Google Apps Script — Quiz Backend
// ============================================================
// SETUP:
// 1. Create a Google Sheet with THREE tabs:
//
//    "Questions" tab (columns):
//    Question | Option A | Option B | Option C | Option D
//    e.g.: "How many chapters in the Gita?" | "14" | "18" | "21" | "16"
//
//    "AnswerKey" tab (columns):
//    Question | Answer
//    e.g.: 1 | B
//    (must have same number of rows as Questions tab)
//
//    "Responses" tab (columns):
//    Timestamp | Name | Score | Q1 | Q2 | Q3 | ...
//
// 2. Open Extensions > Apps Script, paste this entire file
// 3. Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy the deployment URL and paste it into script.js as APPS_SCRIPT_URL
//
// WEEKLY UPDATE:
// - Edit the Questions and AnswerKey tabs with new questions
// - Clear the Responses tab (keep the header row)
// - Create a NEW deployment (Deploy > New deployment)
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

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var responses = ss.getSheetByName("Responses");
    var keySheet = ss.getSheetByName("AnswerKey");
    var questions = getQuestions(ss);
    var numQuestions = questions.length;

    if (answers.length !== numQuestions) {
      return jsonResponse({ success: false, error: "Expected " + numQuestions + " answers, got " + answers.length + "." });
    }

    // Check for duplicate (case-insensitive)
    var existingNames = responses.getRange("B2:B" + Math.max(2, responses.getLastRow()))
      .getValues()
      .flat()
      .filter(String)
      .map(function(n) { return n.toString().trim().toLowerCase(); });

    if (existingNames.indexOf(name.toLowerCase()) !== -1) {
      var stats = computeStats(responses, keySheet, numQuestions);
      var row = findStudentRow(responses, name, numQuestions);
      if (row) {
        stats.score = row.score;
        stats.answers = row.answers;
        stats.correctAnswers = getAnswerKey(keySheet, numQuestions);
      }
      stats.questions = questions;
      stats.success = false;
      stats.error = "duplicate";
      stats.alreadySubmitted = true;
      return jsonResponse(stats);
    }

    // Score against answer key
    var key = getAnswerKey(keySheet, numQuestions);
    var score = 0;
    answers.forEach(function(ans, i) {
      if (ans === key[i]) score++;
    });

    // Append row: Timestamp | Name | Score | Q1..Qn
    var row = [new Date(), name, score].concat(answers);
    responses.appendRow(row);

    // Compute stats
    var stats = computeStats(responses, keySheet, numQuestions);
    stats.score = score;
    stats.answers = answers;
    stats.correctAnswers = key;
    stats.questions = questions;
    stats.success = true;

    return jsonResponse(stats);

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    var name = ((e.parameter && e.parameter.name) || "").trim();

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Action: return questions for the quiz (no answers)
    if (action === "questions") {
      var questions = getQuestions(ss);
      return jsonResponse({ questions: questions });
    }

    var responses = ss.getSheetByName("Responses");
    var keySheet = ss.getSheetByName("AnswerKey");
    var questions = getQuestions(ss);
    var numQuestions = questions.length;

    if (!name) {
      var stats = computeStats(responses, keySheet, numQuestions);
      stats.found = false;
      stats.questions = questions;
      return jsonResponse(stats);
    }

    var row = findStudentRow(responses, name, numQuestions);
    if (!row) {
      return jsonResponse({ found: false });
    }

    var stats = computeStats(responses, keySheet, numQuestions);
    stats.found = true;
    stats.score = row.score;
    stats.answers = row.answers;
    stats.correctAnswers = getAnswerKey(keySheet, numQuestions);
    stats.questions = questions;

    return jsonResponse(stats);

  } catch (err) {
    return jsonResponse({ found: false, error: err.toString() });
  }
}

// ---- Helpers ----

function getQuestions(ss) {
  var sheet = ss.getSheetByName("Questions");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  return data
    .filter(function(row) { return row[0].toString().trim() !== ""; })
    .map(function(row, i) {
      return {
        id: i + 1,
        text: row[0].toString().trim(),
        options: [
          { label: "A", text: row[1].toString().trim() },
          { label: "B", text: row[2].toString().trim() },
          { label: "C", text: row[3].toString().trim() },
          { label: "D", text: row[4].toString().trim() }
        ]
      };
    });
}

function getAnswerKey(keySheet, numQuestions) {
  return keySheet.getRange(2, 2, numQuestions, 1).getValues().flat().map(function(v) {
    return v.toString().trim().toUpperCase();
  });
}

function findStudentRow(responses, name, numQuestions) {
  var lastRow = responses.getLastRow();
  if (lastRow < 2) return null;

  var numCols = 3 + numQuestions; // Timestamp, Name, Score, Q1..Qn
  var data = responses.getRange(2, 1, lastRow - 1, numCols).getValues();
  var target = name.trim().toLowerCase();

  for (var i = 0; i < data.length; i++) {
    if (data[i][1].toString().trim().toLowerCase() === target) {
      return {
        score: data[i][2],
        answers: data[i].slice(3, 3 + numQuestions).map(function(v) { return v.toString().trim(); })
      };
    }
  }
  return null;
}

function computeStats(responses, keySheet, numQuestions) {
  var lastRow = responses.getLastRow();

  // Build zero arrays dynamically
  var zeroDist = [];
  for (var d = 0; d <= numQuestions; d++) zeroDist.push(0);
  var zeroPerQ = [];
  for (var p = 0; p < numQuestions; p++) zeroPerQ.push(0);

  if (lastRow < 2) {
    return {
      numSubmissions: 0,
      classAverage: 0,
      totalQuestions: numQuestions,
      distribution: zeroDist,
      perQuestion: zeroPerQ
    };
  }

  var numCols = 3 + numQuestions;
  var data = responses.getRange(2, 1, lastRow - 1, numCols).getValues();
  var key = getAnswerKey(keySheet, numQuestions);
  var numSubmissions = data.length;

  var distribution = zeroDist.slice();
  var totalScore = 0;
  var perQuestionCorrect = zeroPerQ.slice();

  data.forEach(function(row) {
    var score = parseInt(row[2]) || 0;
    if (score >= 0 && score <= numQuestions) {
      distribution[score]++;
    }
    totalScore += score;

    for (var q = 0; q < numQuestions; q++) {
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
    totalQuestions: numQuestions,
    distribution: distribution,
    perQuestion: perQuestion
  };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
