import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Award, TrendingUp, Calendar, AlertTriangle, Target, Sparkles, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Reports() {
  const [user, setUser] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();

    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    if (sessionParam) {
      setSelectedSessionId(sessionParam);
    }
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', user?.email],
    queryFn: () => base44.entities.TestSession.filter(
      { created_by: user?.email, completed: true }, 
      '-completed_at'
    ),
    enabled: !!user,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['answers', selectedSessionId],
    queryFn: () => base44.entities.TestAnswer.filter({ session_id: selectedSessionId }),
    enabled: !!selectedSessionId,
  });

  const { data: allAnswers = [] } = useQuery({
    queryKey: ['all-answers'],
    queryFn: () => base44.entities.TestAnswer.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  React.useEffect(() => {
    setAiAnalysis(null);
  }, [selectedSessionId]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedSessionIndex = sessions.findIndex(s => s.id === selectedSessionId);
  const previousSession = selectedSessionIndex < sessions.length - 1 ? sessions[selectedSessionIndex + 1] : null;

  // Overall performance across all sessions
  const overallTopicStats = allAnswers.reduce((acc, answer) => {
    if (!acc[answer.topic]) {
      acc[answer.topic] = { correct: 0, total: 0 };
    }
    acc[answer.topic].total++;
    if (answer.is_correct) acc[answer.topic].correct++;
    return acc;
  }, {});

  const weakTopics = Object.entries(overallTopicStats)
    .map(([topic, stats]) => ({
      topic,
      percentage: (stats.correct / stats.total) * 100,
      correct: stats.correct,
      total: stats.total
    }))
    .filter(item => item.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);

  const strongTopics = Object.entries(overallTopicStats)
    .map(([topic, stats]) => ({
      topic,
      percentage: (stats.correct / stats.total) * 100,
      correct: stats.correct,
      total: stats.total
    }))
    .filter(item => item.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage);

  const handleAiAnalysis = async () => {
    if (!previousSession) {
      alert("No previous session to compare with!");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      const previousAnswers = await base44.entities.TestAnswer.filter({ 
        session_id: previousSession.id 
      });

      const currentTopicStats = answers.reduce((acc, answer) => {
        if (!acc[answer.topic]) {
          acc[answer.topic] = { correct: 0, total: 0 };
        }
        acc[answer.topic].total++;
        if (answer.is_correct) acc[answer.topic].correct++;
        return acc;
      }, {});

      const previousTopicStats = previousAnswers.reduce((acc, answer) => {
        if (!acc[answer.topic]) {
          acc[answer.topic] = { correct: 0, total: 0 };
        }
        acc[answer.topic].total++;
        if (answer.is_correct) acc[answer.topic].correct++;
        return acc;
      }, {});

      const prompt = `You are an expert White Card training analyst. Analyze the performance comparison between two test sessions and provide detailed insights.

**Current Session:**
- Mode: ${selectedSession.mode}
- Topic: ${selectedSession.topic}
- Score: ${selectedSession.score_percentage.toFixed(1)}%
- Correct: ${selectedSession.correct_answers}/${selectedSession.total_questions}
- Date: ${format(new Date(selectedSession.completed_at), "MMM d, yyyy")}
- Topic breakdown: ${JSON.stringify(currentTopicStats, null, 2)}

**Previous Session:**
- Mode: ${previousSession.mode}
- Topic: ${previousSession.topic}
- Score: ${previousSession.score_percentage.toFixed(1)}%
- Correct: ${previousSession.correct_answers}/${previousSession.total_questions}
- Date: ${format(new Date(previousSession.completed_at), "MMM d, yyyy")}
- Topic breakdown: ${JSON.stringify(previousTopicStats, null, 2)}

Provide a comprehensive analysis covering:
1. Overall performance trend (improved, declined, or stable)
2. Specific topics where performance improved
3. Specific topics where performance declined
4. Actionable recommendations for improvement
5. Encouragement and motivation

Format your response in a friendly, encouraging tone suitable for a construction worker studying for their White Card.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_trend: {
              type: "string",
              enum: ["improved", "declined", "stable"],
              description: "Overall performance trend"
            },
            score_change: {
              type: "number",
              description: "Percentage point change in score"
            },
            improved_topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  improvement: { type: "string" },
                  previous_percentage: { type: "number" },
                  current_percentage: { type: "number" }
                }
              }
            },
            declined_topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  decline: { type: "string" },
                  previous_percentage: { type: "number" },
                  current_percentage: { type: "number" }
                }
              }
            },
            stable_topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  percentage: { type: "number" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
              description: "3-5 specific actionable recommendations"
            },
            summary: {
              type: "string",
              description: "A brief encouraging summary (2-3 sentences)"
            },
            motivation: {
              type: "string",
              description: "An encouraging message to keep the learner motivated"
            }
          }
        }
      });

      setAiAnalysis(result);
    } catch (error) {
      console.error("AI Analysis error:", error);
      alert("Failed to generate AI analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 text-lg">No completed sessions yet</p>
            <p className="text-slate-400 mt-2">Start practicing to see your results here</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topicStats = answers.reduce((acc, answer) => {
    if (!acc[answer.topic]) {
      acc[answer.topic] = { correct: 0, total: 0 };
    }
    acc[answer.topic].total++;
    if (answer.is_correct) acc[answer.topic].correct++;
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Performance Reports</h1>
        <p className="text-slate-600">Review your performance and track progress</p>
      </div>

      {/* Overall Performance Summary */}
      {allAnswers.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {weakTopics.length > 0 && (
            <Card className="border-none shadow-lg border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-5 h-5" />
                  Topics Needing Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-4">
                  These topics show below 70% accuracy across all your attempts:
                </p>
                <div className="space-y-3">
                  {weakTopics.map((topic) => (
                    <div key={topic.topic} className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-900 text-sm">{topic.topic}</p>
                        <Badge variant="outline" className="bg-white">
                          {topic.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {topic.correct}/{topic.total} questions correct
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {strongTopics.length > 0 && (
            <Card className="border-none shadow-lg border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Target className="w-5 h-5" />
                  Strong Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-4">
                  Excellent performance in these topics (80%+ accuracy):
                </p>
                <div className="space-y-3">
                  {strongTopics.map((topic) => (
                    <div key={topic.topic} className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-900 text-sm">{topic.topic}</p>
                        <Badge variant="outline" className="bg-white">
                          {topic.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {topic.correct}/{topic.total} questions correct
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle>Session History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedSessionId === session.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={
                    session.mode === 'exam' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }>
                    {session.mode === 'exam' ? 'Exam' : 'Practice'}
                  </Badge>
                  <span className={`font-bold ${
                    session.score_percentage >= 80 ? 'text-green-600' :
                    session.score_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {session.score_percentage.toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {session.mode === 'exam' ? 'Full Exam' : session.topic}
                </p>
                <p className="text-xs text-slate-500">
                  {format(new Date(session.completed_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {selectedSession && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className={`border-none shadow-lg ${
                  selectedSession.score_percentage >= 80 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                  selectedSession.score_percentage >= 60 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                  'bg-gradient-to-br from-red-500 to-red-600'
                } text-white`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium opacity-90">Final Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold mb-1">
                      {selectedSession.score_percentage.toFixed(1)}%
                    </div>
                    <p className="text-sm opacity-90">
                      {selectedSession.correct_answers}/{selectedSession.total_questions} correct
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {selectedSession.mode === 'exam' ? 'Exam' : 'Practice'}
                    </div>
                    <p className="text-sm text-slate-500">
                      {selectedSession.topic === 'all' ? 'All Topics' : selectedSession.topic}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-slate-900">
                      {format(new Date(selectedSession.completed_at), "MMM d, yyyy")}
                    </div>
                    <p className="text-sm text-slate-500">
                      {format(new Date(selectedSession.completed_at), "h:mm a")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {previousSession && (
                <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        AI Performance Analysis
                      </CardTitle>
                      <Button
                        onClick={handleAiAnalysis}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Compare with Previous
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {aiAnalysis && (
                    <CardContent className="space-y-4">
                      <Alert className={`${
                        aiAnalysis.overall_trend === 'improved' ? 'bg-green-50 border-green-200' :
                        aiAnalysis.overall_trend === 'declined' ? 'bg-orange-50 border-orange-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <AlertDescription>
                          <div className="flex items-center gap-2 mb-2">
                            {aiAnalysis.overall_trend === 'improved' ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : aiAnalysis.overall_trend === 'declined' ? (
                              <TrendingDown className="w-5 h-5 text-orange-600" />
                            ) : (
                              <Target className="w-5 h-5 text-blue-600" />
                            )}
                            <span className="font-bold text-lg">
                              {aiAnalysis.overall_trend === 'improved' ? 'Great Progress!' :
                               aiAnalysis.overall_trend === 'declined' ? 'Room for Improvement' :
                               'Consistent Performance'}
                            </span>
                          </div>
                          <p className="text-sm mb-2">
                            Score change: <strong>{aiAnalysis.score_change > 0 ? '+' : ''}{aiAnalysis.score_change.toFixed(1)}%</strong>
                          </p>
                          <p className="text-sm">{aiAnalysis.summary}</p>
                        </AlertDescription>
                      </Alert>

                      {aiAnalysis.improved_topics && aiAnalysis.improved_topics.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Topics Where You Improved
                          </h4>
                          <div className="space-y-2">
                            {aiAnalysis.improved_topics.map((topic, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{topic.topic}</span>
                                <span className="text-green-600">
                                  {topic.previous_percentage.toFixed(0)}% → {topic.current_percentage.toFixed(0)}%
                                  <span className="ml-2">↑ {topic.improvement}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiAnalysis.declined_topics && aiAnalysis.declined_topics.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-orange-200">
                          <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            Topics Needing Focus
                          </h4>
                          <div className="space-y-2">
                            {aiAnalysis.declined_topics.map((topic, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{topic.topic}</span>
                                <span className="text-orange-600">
                                  {topic.previous_percentage.toFixed(0)}% → {topic.current_percentage.toFixed(0)}%
                                  <span className="ml-2">↓ {topic.decline}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-700 mb-3">📋 Recommendations</h4>
                        <ul className="space-y-2 text-sm">
                          {aiAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm font-medium text-purple-900">
                          💪 {aiAnalysis.motivation}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {Object.keys(topicStats).length > 1 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Performance by Topic (This Session)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(topicStats).map(([topic, stats]) => {
                      const percentage = (stats.correct / stats.total) * 100;
                      return (
                        <div key={topic}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-900">{topic}</span>
                            <span className="text-sm font-bold text-slate-600">
                              {stats.correct}/{stats.total} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                percentage >= 80 ? 'bg-green-500' :
                                percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Question-by-Question Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {answers.map((answer, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        answer.is_correct
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {answer.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 mb-1">{answer.question_stem}</p>
                          <Badge variant="outline" className="text-xs">
                            {answer.topic}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-8 space-y-2">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Your answer:</p>
                          <p className={`text-sm ${answer.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                            {answer.selected_answer.length > 0 ? answer.selected_answer.join(', ') : 'No answer selected'}
                          </p>
                        </div>
                        {!answer.is_correct && (
                          <div>
                            <p className="text-sm font-medium text-slate-600">Correct answer:</p>
                            <p className="text-sm text-green-700">
                              {answer.correct_answer.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}