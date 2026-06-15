import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Heart, Archive, Trash2, Calendar, Folder } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/api/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function BookmarkDetail() {
  const { id } = useParams();
  const [bookmark, setBookmark] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    loadBookmark();
    loadNotes();
  }, [id]);

  const loadBookmark = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/api/bookmarks/${id}`);
      setBookmark(data);
    } catch (err) {
      toast.error("Failed to load bookmark");
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    setNotesLoading(true);
    try {
      const data = await apiClient.get(`/api/bookmarks/${id}/notes`);
      setNotes(data || []);
    } catch (err) {
      toast.error("Failed to load notes");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      await apiClient.post(`/api/bookmarks/${id}/notes`, { content: newNote });
      toast.success("Note added");
      setNewNote("");
      loadNotes(); // reload
    } catch (err) {
      toast.error("Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await apiClient.delete(`/api/bookmarks/${id}/notes/${noteId}`);
      toast.success("Note deleted");
      loadNotes();
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="w-24 h-6 bg-muted animate-pulse rounded" />
        <div className="h-12 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!bookmark) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-display">Bookmark not found</h2>
        <Link to="/bookmarks" className="text-accent hover:underline mt-4 inline-block">Return to Bookmarks</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Editorial Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <Link to="/bookmarks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookmarks
        </Link>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="font-normal flex items-center gap-1">
            <Folder className="h-3 w-3" /> {bookmark.category?.categoryName || bookmark.categoryName || "Uncategorized"}
          </Badge>
          {bookmark.isFavorite && (
            <Badge className="bg-destructive/10 text-destructive border-transparent font-normal flex items-center gap-1">
              <Heart className="h-3 w-3" fill="currentColor" /> Favorite
            </Badge>
          )}
          {bookmark.isArchived && (
            <Badge className="bg-accent/10 text-accent border-transparent font-normal flex items-center gap-1">
              <Archive className="h-3 w-3" /> Archived
            </Badge>
          )}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl leading-tight text-foreground mb-4">
          {bookmark.title}
        </h1>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-muted-foreground">
          <a 
            href={bookmark.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-1.5 text-primary hover:underline text-lg truncate"
          >
            <ExternalLink className="h-5 w-5 shrink-0" />
            <span className="truncate">{bookmark.url}</span>
          </a>
          <div className="hidden sm:block text-border">•</div>
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            <Calendar className="h-4 w-4" /> 
            {new Date(bookmark.createdAt || Date.now()).toLocaleDateString()}
          </div>
        </div>
      </motion.div>

      {/* Notes Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="border-t pt-8"
      >
        <h2 className="font-display text-2xl mb-6 flex items-center gap-2">
          Notes <Badge variant="secondary" className="text-xs">{notes.length}</Badge>
        </h2>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} className="mb-10">
          <Textarea 
            placeholder="Add a new note... (markdown not supported yet)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px] mb-3 resize-y bg-card"
            maxLength={1000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{newNote.length}/1000</span>
            <Button type="submit" disabled={submittingNote || !newNote.trim()}>
              Add Note
            </Button>
          </div>
        </form>

        {/* Notes List */}
        <div className="space-y-4">
          {notesLoading ? (
            <div className="space-y-3">
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10 bg-surface-alt rounded-lg border border-dashed">
              <p className="text-muted-foreground">No notes attached yet.</p>
            </div>
          ) : (
            <AnimatePresence>
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative p-5 bg-card border rounded-lg shadow-sm"
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {note.content}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteNote(note.id)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
