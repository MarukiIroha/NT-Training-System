import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, BookOpen } from "lucide-react";
import QuestionForm from "../components/QuestionForm";

export default function QuestionBank() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Question.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  const topics = [...new Set(questions.map(q => q.topic))];
  
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.stem.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'all' || q.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Question Bank</h1>
        <p className="text-slate-600">Manage training questions and topics</p>
      </div>

      {!showForm ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Topics</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  Loading questions...
                </CardContent>
              </Card>
            ) : filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  No questions found
                </CardContent>
              </Card>
            ) : (
              filteredQuestions.map((question) => (
                <Card key={question.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{question.stem}</CardTitle>
                        <Badge className="bg-blue-100 text-blue-800">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {question.topic}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(question)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(question.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            question.answer.includes(option)
                              ? 'bg-green-50 border-green-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <p className="text-sm">{option}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <QuestionForm
          question={editingQuestion}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}