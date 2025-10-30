import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, TrendingUp, Award, ArrowRight, Clock, Shield, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.TestSession.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list(),
  });

  const { data: allAnswers = [] } = useQuery({
    queryKey: ['all-answers'],
    queryFn: () => base44.entities.TestAnswer.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const completedSessions = sessions.filter(s => s.completed);
  const averageScore = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / completedSessions.length
    : 0;

  const recentSessions = completedSessions.slice(0, 5);

  const topics = [...new Set(questions.map(q => q.topic))];

  // Calculate weak areas
  const topicPerformance = allAnswers.reduce((acc, answer) => {
    if (!acc[answer.topic]) {
      acc[answer.topic] = { correct: 0, total: 0 };
    }
    acc[answer.topic].total++;
    if (answer.is_correct) acc[answer.topic].correct++;
    return acc;
  }, {});

  const weakAreas = Object.entries(topicPerformance)
    .map(([topic, stats]) => ({
      topic,
      percentage: (stats.correct / stats.total) * 100,
      total: stats.total
    }))
    .filter(item => item.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);

  const isAdmin = user?.role === "admin";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Welcome back, {user?.full_name || "Trainee"}!
          </h1>
          {isAdmin && (
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 text-sm">
              <Shield className="w-3 h-3 mr-1" />
              Administrator
            </Badge>
          )}
        </div>
        <p className="text-slate-600 text-lg">
          Continue your White Card training journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{questions.length}</div>
            <p className="text-sm opacity-80 mt-1">{topics.length} topics available</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Completed Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedSessions.length}</div>
            <p className="text-sm opacity-80 mt-1">{sessions.length} total attempts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageScore.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-sm opacity-80 mt-1">
              <TrendingUp className="w-4 h-4" />
              {averageScore >= 80 ? 'Excellent!' : 'Keep improving!'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Best Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedSessions.length > 0 
                ? Math.max(...completedSessions.map(s => s.score_percentage || 0)).toFixed(1)
                : 0}%
            </div>
            <div className="flex items-center gap-1 text-sm opacity-80 mt-1">
              <Award className="w-4 h-4" />
              Personal best
            </div>
          </CardContent>
        </Card>
      </div>

      {weakAreas.length > 0 && (
        <Card className="border-none shadow-lg mb-8 border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Areas Needing Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Focus on these topics to improve your overall performance:
            </p>
            <div className="space-y-3">
              {weakAreas.slice(0, 3).map((area) => (
                <div key={area.topic} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{area.topic}</p>
                    <p className="text-sm text-slate-600">
                      {area.percentage.toFixed(0)}% correct ({area.total} questions attempted)
                    </p>
                  </div>
                  <Link to={createPageUrl("Practice")}>
                    <Button size="sm" variant="outline">
                      Practice
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Practice Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Study by topic with instant feedback. Perfect for learning and reviewing specific areas.
            </p>
            <Link to={createPageUrl("Practice")}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Start Practice
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="w-6 h-6 text-green-600" />
              Exam Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Test yourself with all topics. Results shown at the end, just like the real exam.
            </p>
            <Link to={createPageUrl("ExamMode")}>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                Start Exam
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {recentSessions.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      session.score_percentage >= 80 ? 'bg-green-100' : 
                      session.score_percentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <span className={`font-bold ${
                        session.score_percentage >= 80 ? 'text-green-700' : 
                        session.score_percentage >= 60 ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {session.score_percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {session.mode === 'exam' ? 'Exam Mode' : `Practice: ${session.topic}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(session.completed_at || session.created_date), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {session.correct_answers}/{session.total_questions}
                    </p>
                    <p className="text-xs text-slate-500">correct</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to={createPageUrl("Reports")}>
              <Button variant="outline" className="w-full mt-4">
                View All Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}