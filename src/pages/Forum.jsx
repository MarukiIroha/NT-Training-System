import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Search, Eye, MessageCircle, Pin, Clock, User } from "lucide-react";
import { format } from "date-fns";

export default function Forum() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['forum-posts'],
    queryFn: () => base44.entities.ForumPost.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const categories = ["Safety Question", "Work Scenario", "Equipment & Tools", "Regulations & Compliance", "Best Practices", "General Discussion"];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email?.split('@')[0] || 'Unknown';
  };

  if (selectedPostId) {
    return (
      <ForumPostDetail 
        postId={selectedPostId} 
        onBack={() => setSelectedPostId(null)}
        getUserName={getUserName}
      />
    );
  }

  if (showCreateForm) {
    return (
      <CreatePost 
        onBack={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
        }}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Community Forum</h1>
            <p className="text-slate-600">Share experiences and ask questions about workplace safety</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-none shadow-lg sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                All Topics
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === category 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-8 text-center text-slate-500">
                Loading posts...
              </CardContent>
            </Card>
          ) : sortedPosts.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No posts found</p>
                <p className="text-slate-400">Be the first to start a discussion!</p>
              </CardContent>
            </Card>
          ) : (
            sortedPosts.map((post) => (
              <Card
                key={post.id}
                className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedPostId(post.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {getUserName(post.created_by)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {post.is_pinned && (
                              <Pin className="w-4 h-4 text-blue-600" />
                            )}
                            <h3 className="font-semibold text-slate-900 text-lg">
                              {post.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {getUserName(post.created_by)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(post.created_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 flex-shrink-0">
                          {post.category}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-4 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.view_count || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.comment_count || 0} comments
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePost({ onBack, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "General Discussion"
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ForumPost.create(data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Create New Post</CardTitle>
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What's your question or topic?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option>Safety Question</option>
                <option>Work Scenario</option>
                <option>Equipment & Tools</option>
                <option>Regulations & Compliance</option>
                <option>Best Practices</option>
                <option>General Discussion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Describe your question or share your experience..."
                className="w-full min-h-48 px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? "Posting..." : "Post to Forum"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ForumPostDetail({ postId, onBack, getUserName }) {
  const [commentContent, setCommentContent] = useState("");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: post } = useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => {
      const posts = await base44.entities.ForumPost.list();
      const post = posts.find(p => p.id === postId);
      
      // Increment view count
      if (post) {
        await base44.entities.ForumPost.update(postId, {
          ...post,
          view_count: (post.view_count || 0) + 1
        });
      }
      
      return post;
    },
    enabled: !!postId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['forum-comments', postId],
    queryFn: () => base44.entities.ForumComment.filter({ post_id: postId }, 'created_date'),
    enabled: !!postId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      const comment = await base44.entities.ForumComment.create({
        post_id: postId,
        content: content
      });
      
      // Update comment count
      if (post) {
        await base44.entities.ForumPost.update(postId, {
          ...post,
          comment_count: (post.comment_count || 0) + 1
        });
      }
      
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      setCommentContent("");
    },
  });

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (commentContent.trim()) {
      createCommentMutation.mutate(commentContent);
    }
  };

  if (!post) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent className="p-8 text-center text-slate-500">
            Loading post...
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isAuthor = user?.email === post.created_by;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Button variant="outline" onClick={onBack} className="mb-6">
        ← Back to Forum
      </Button>

      <Card className="border-none shadow-lg mb-6">
        <CardContent className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {getUserName(post.created_by)[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  {post.is_pinned && (
                    <Badge className="bg-blue-100 text-blue-800 mb-2">
                      <Pin className="w-3 h-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {post.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {getUserName(post.created_by)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(post.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {post.view_count || 0} views
                    </span>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {post.category}
                </Badge>
              </div>
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Share your thoughts or answer..."
              className="w-full min-h-24 px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createCommentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>

          {comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-slate-700 font-semibold flex-shrink-0">
                    {getUserName(comment.created_by)[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-slate-900">
                        {getUserName(comment.created_by)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {format(new Date(comment.created_date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}