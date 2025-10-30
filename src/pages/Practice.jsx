import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowRight, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Practice() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const topics = [...new Set(allQuestions.map(q => q.topic))];

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startPractice = async (topic) => {
    const topicQuestions = allQuestions.filter(q => q.topic === topic);
    
    const questionsWithShuffledOptions = topicQuestions.map(q => ({
      ...q,
      shuffledOptions: shuffleArray(q.options)
    }));

    setSessionQuestions(questionsWithShuffledOptions);
    setSelectedTopic(topic);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);

    const session = await base44.entities.TestSession.create({
      mode: 'practice',
      topic: topic,
      total_questions: topicQuestions.length,
      correct_answers: 0,
      score_percentage: 0,
      completed: false
    });
    setSessionId(session.id);
  };

  const handleAnswerSelect = (option) => {
    if (showFeedback) return;
    
    const currentQuestion = sessionQuestions[currentQuestionIndex];
    if (currentQuestion.answer.length > 1) {
      setSelectedAnswer(prev =>
        prev.includes(option)
          ? prev.filter(a => a !== option)
          : [...prev, option]
      );
    } else {
      setSelectedAnswer([option]);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = sessionQuestions[currentQuestionIndex];
    const isCorrect = 
      selectedAnswer.length === currentQuestion.answer.length &&
      selectedAnswer.every(ans => currentQuestion.answer.includes(ans));

    await base44.entities.TestAnswer.create({
      session_id: sessionId,
      question_id: currentQuestion.id,
      question_stem: currentQuestion.stem,
      selected_answer: selectedAnswer,
      correct_answer: currentQuestion.answer,
      is_correct: isCorrect,
      topic: currentQuestion.topic
    });

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    setShowFeedback(true);
  };

  const handleNext = async () => {
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer([]);
      setShowFeedback(false);
    } else {
      const score = (correctCount / sessionQuestions.length) * 100;
      await base44.entities.TestSession.update(sessionId, {
        completed: true,
        correct_answers: correctCount,
        score_percentage: score,
        completed_at: new Date().toISOString()
      });
      navigate(`${createPageUrl("Reports")}?session=${sessionId}`);
    }
  };

  if (!selectedTopic) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Practice Mode</h1>
          <p className="text-slate-600">Select a topic to begin practicing</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {topics.map((topic) => {
            const count = allQuestions.filter(q => q.topic === topic).length;
            return (
              <Card
                key={topic}
                className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => startPractice(topic)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900 leading-tight">
                          {topic}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {count} questions
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                  </CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQuestion = sessionQuestions[currentQuestionIndex];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-blue-100 text-blue-800">
            <BookOpen className="w-3 h-3 mr-1" />
            {selectedTopic}
          </Badge>
          <span className="text-sm font-medium text-slate-600">
            Question {currentQuestionIndex + 1} of {sessionQuestions.length}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / sessionQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card className="border-none shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">{currentQuestion.stem}</CardTitle>
          {currentQuestion.answer.length > 1 && (
            <p className="text-sm text-slate-500 mt-2">Select all correct answers</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.shuffledOptions.map((option, idx) => {
            const isSelected = selectedAnswer.includes(option);
            const isCorrect = currentQuestion.answer.includes(option);
            
            return (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(option)}
                disabled={showFeedback}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  showFeedback
                    ? isCorrect
                      ? 'border-green-500 bg-green-50'
                      : isSelected
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 bg-white opacity-50'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    showFeedback
                      ? isCorrect
                        ? 'border-green-500 bg-green-500'
                        : isSelected
                        ? 'border-red-500 bg-red-500'
                        : 'border-slate-300'
                      : isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300'
                  }`}>
                    {showFeedback && isCorrect && <CheckCircle className="w-4 h-4 text-white" />}
                    {showFeedback && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
                    {!showFeedback && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {showFeedback && (
        <Card className={`border-none shadow-lg mb-6 ${
          selectedAnswer.every(ans => currentQuestion.answer.includes(ans)) &&
          selectedAnswer.length === currentQuestion.answer.length
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              {selectedAnswer.every(ans => currentQuestion.answer.includes(ans)) &&
              selectedAnswer.length === currentQuestion.answer.length ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-900 mb-2">Correct!</h3>
                    <p className="text-green-800">{currentQuestion.explanation_correct}</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-900 mb-2">Incorrect</h3>
                    <p className="text-red-800">
                      The correct answer is: <strong>{currentQuestion.answer.join(', ')}</strong>
                    </p>
                    {currentQuestion.explanation_correct && (
                      <p className="text-red-800 mt-2">{currentQuestion.explanation_correct}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedTopic(null);
            setSessionQuestions([]);
          }}
        >
          Exit Practice
        </Button>
        {!showFeedback ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
            {currentQuestionIndex < sessionQuestions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              "View Results"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}