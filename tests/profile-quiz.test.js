const assert = require("assert");
const quiz = require("../utils/profileQuiz");

const questions = quiz.publicQuestions();
assert.strictEqual(questions.length, 15);
assert.ok(questions.every(question => question.options.length === 4));
assert.ok(questions.every(question => !question.options.some(option => option.effects)));

const answers = {};
questions.forEach(function (question) {
  answers[question.id] = question.options[0].id;
});

const profile = quiz.summarizeAnswers(answers);
assert.strictEqual(profile.mode, "semi_real_quiz");
assert.strictEqual(profile.answeredCount, 15);
assert.ok(profile.summary.includes("自我"));
assert.ok(profile.summary.includes("关系"));
assert.ok(profile.summary.includes("资源"));
assert.ok(profile.summary.includes("身体"));
assert.ok(profile.summary.includes("世界"));
assert.ok(profile.summary.includes("内在"));
assert.strictEqual(Object.keys(profile.dimensions).length, 5);
assert.strictEqual(Object.keys(profile.innerDimensions).length, 5);
assert.ok(profile.innerDimensions.agency.score >= 10);
assert.ok(profile.innerDimensions.courage.score <= 90);
assert.ok(profile.tags.length > 0);
assert.strictEqual(profile.answers.length, 15);

assert.throws(function () {
  quiz.summarizeAnswers({});
}, /选择题尚未完成/);
