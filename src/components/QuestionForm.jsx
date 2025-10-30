import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Plus, Check } from "lucide-react";

export default function QuestionForm({ question, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    stem: question?.stem || "",
    options: question?.options || ["", "", "", ""],
    answer: question?.answer || [],
    explanation_correct: question?.explanation_correct || "",
    explanation_incorrect: question?.explanation_incorrect || {},
    topic: question?.topic || "",
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (question) {
        return base44.entities.Question.update(question.id, data);
      }
      return base44.entities.Question.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      onClose();
    },
  });

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleAddOption = () => {
    setFormData({ ...formData, options: [...formData.options, ""] });
  };

  const handleRemoveOption = (index) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const toggleCorrectAnswer = (option) => {
    const newAnswers = formData.answer.includes(option)
      ? formData.answer.filter(a => a !== option)
      : [...formData.answer, option];
    setFormData({ ...formData, answer: newAnswers });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{question ? "Edit Question" : "Add New Question"}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Question Stem</Label>
            <Textarea
              value={formData.stem}
              onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
              placeholder="Enter the question..."
              className="min-h-24"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., WHS Legislation and Responsibilities"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Option
              </Button>
            </div>
            {formData.options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                />
                <Button
                  type="button"
                  variant={formData.answer.includes(option) ? "default" : "outline"}
                  size="icon"
                  onClick={() => toggleCorrectAnswer(option)}
                  className={formData.answer.includes(option) ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <Check className="w-4 h-4" />
                </Button>
                {formData.options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-sm text-slate-500">
              Click the checkmark to mark correct answer(s)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Explanation for Correct Answer</Label>
            <Textarea
              value={formData.explanation_correct}
              onChange={(e) => setFormData({ ...formData, explanation_correct: e.target.value })}
              placeholder="Explain why this is correct..."
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : question ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}