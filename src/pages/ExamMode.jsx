import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, GraduationCap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExamMode() {
  const navigate = useNavigate();
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startExam = async () => {
    const questionsWithShuffledOptions = allQuestions.map(q => ({
      ...q,
      shuffledOptions: shuffleArray(q.options)
    }));

    const shuffledQuestions = shuffleArray(questionsWithShuffledOptions);

    setSessionQuestions(shuffledQuestions);
    setExamStarted(true);
    setStartTime(Date.now());

    const session = await base44.entities.TestSession.create({
      mode: 'exam',
      topic: 'all',
      total_questions: shuffledQuestions.length,
      correct_answers: 0,
      score_percentage: 0,
      completed: false
    });
    setSessionId(session.id);
  };

  const handleAnswerSelect = (questionId, option) => {
    const currentQuestion = sessionQuestions.find(q => q.id === questionId);
    
    if (currentQuestion.answer.length > 1) {
      const currentAnswers = answers[questionId] || [];
      setAnswers({
        ...answers,
        [questionId]: currentAnswers.includes(option)
          ? currentAnswers.filter(a => a !== option)
          : [...currentAnswers, option]
      });
    } else {
      setAnswers({
        ...answers,
        [questionId]: [option]
      });
    }
  };

  const handleSubmitExam = async () => {
    let correctCount = 0;

    for (const question of sessionQuestions) {
      const userAnswer = answers[question.id] || [];
      const isCorrect = 
        userAnswer.length === question.answer.length &&
        userAnswer.every(ans => question.answer.includes(ans));

      if (isCorrect) correctCount++;

      await base44.entities.TestAnswer.create({
        session_id: sessionId,
        question_id: question.id,
        question_stem: question.stem,
        selected_answer: userAnswer,
        correct_answer: question.answer,
        is_correct: isCorrect,
        topic: question.topic
      });
    }

    const score = (correctCount / sessionQuestions.length) * 100;
    await base44.entities.TestSession.update(sessionId, {
      completed: true,
      correct_answers: correctCount,
      score_percentage: score,
      completed_at: new Date().toISOString()
    });

    navigate(`${createPageUrl("Reports")}?session=${sessionId}`);
  };

  if (!examStarted) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Card className="border-none shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl mb-2">Exam Mode</CardTitle>
            <p className="text-slate-600">Test your knowledge with a full exam simulation</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Instructions:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>This exam includes all {allQuestions.length} questions from all topics</li>
                  <li>Questions and options are randomly shuffled</li>
                  <li>You can navigate between questions freely</li>
                  <li>Results will be shown after you submit the exam</li>
                  <li>Make sure you have enough time to complete all questions</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Questions:</span>
                <span className="font-bold text-slate-900">{allQuestions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Estimated Time:</span>
                <span className="font-bold text-slate-900">{Math.ceil(allQuestions.length * 1.5)} minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pass Mark:</span>
                <span className="font-bold text-slate-900">80%</span>
              </div>
            </div>

            <Button
              onClick={startExam}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
              disabled={allQuestions.length === 0}
            >
              Start Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = sessionQuestions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / sessionQuestions.length) * 100;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-green-100 text-green-800">
            <GraduationCap className="w-3 h-3 mr-1" />
            Exam Mode
          </Badge>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">
              {answeredCount}/{sessionQuestions.length} answered
            </span>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor((Date.now() - startTime) / 60000)} min
            </Badge>
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="border-none shadow-lg mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 mb-2">
            <span className="text-sm font-medium text-slate-500">
              Question {currentQuestionIndex + 1} of {sessionQuestions.length}
            </span>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {currentQuestion.topic}
            </Badge>
          </div>
          <CardTitle className="text-xl leading-relaxed">{currentQuestion.stem}</CardTitle>
          {currentQuestion.answer.length > 1 && (
            <p className="text-sm text-slate-500 mt-2">Select all correct answers</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.shuffledOptions.map((option, idx) => {
            const isSelected = (answers[currentQuestion.id] || []).includes(option);
            
            return (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'border-green-500 bg-green-500'
                      : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-10 gap-2 mb-6">
        {sessionQuestions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentQuestionIndex(idx)}
            className={`aspect-square rounded-lg border-2 font-medium text-sm transition-all ${
              idx === currentQuestionIndex
                ? 'border-green-500 bg-green-500 text-white'
                : answers[q.id]
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        <div className="flex gap-3">
          {currentQuestionIndex < sessionQuestions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              className="bg-green-600 hover:bg-green-700"
            >
              Next Question
            </Button>
          ) : (
            <Button
              onClick={handleSubmitExam}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={answeredCount < sessionQuestions.length}
            >
              Submit Exam
            </Button>
          )}
        </div>
      </div>

      {answeredCount < sessionQuestions.length && currentQuestionIndex === sessionQuestions.length - 1 && (
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {sessionQuestions.length - answeredCount} unanswered question(s). 
            Please answer all questions before submitting.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}