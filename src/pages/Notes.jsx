import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Pin, Download, StickyNote, Filter, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/api/client";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Switch } from "@/components/ui/switch";
import { RainbowButton } from "@/components/ui/rainbow-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sort
  const [filters, setFilters] = useState({ categoryId: "all", pinned: false, search: "" });
  const debouncedSearch = useDebounce(filters.search, 300);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({ title: "", content: "", categoryId: "", isPinned: false });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCategories();
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'n' && !isModalOpen && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    loadNotes();
  }, [filters.categoryId, filters.pinned, debouncedSearch]);

  const loadCategories = async () => {
    try {
      const data = await apiClient.get("/api/categories");
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to load categories");
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.categoryId && filters.categoryId !== "all") params.append("Category", filters.categoryId); // Note: API spec might use CategoryId or Category. Swagger says Category
      if (filters.pinned) params.append("Pinned", "true");
      if (debouncedSearch) params.append("searchWord", debouncedSearch);

      const qs = params.toString();
      const url = qs ? `/api/notes?${qs}` : "/api/notes";
      
      const data = await apiClient.get(url);
      setNotes(data || []);
      goToPage(1);
    } catch (err) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const sortedNotes = useMemo(() => {
    if (!notes) return [];
    let sorted = [...notes];
    switch(sort) {
      case "oldest": sorted.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case "title_asc": sorted.sort((a,b) => (a.title||'').localeCompare(b.title||'')); break;
      case "title_desc": sorted.sort((a,b) => (b.title||'').localeCompare(a.title||'')); break;
      case "pinned": sorted.sort((a,b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1); break;
      case "newest":
      default: sorted.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    }
    return sorted;
  }, [notes, sort]);

  const { paginatedData, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination(sortedNotes, 10);

  const getCategoryName = (id) => categories.find(c => c.id === id)?.categoryName || "Unknown";

  const togglePin = async (note) => {
    try {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isPinned: !n.isPinned } : n));
      await apiClient.patch(`/api/notes/${note.id}/pin`);
    } catch (err) {
      toast.error("Failed to update pin status");
      loadNotes(); // Revert
    }
  };

  const openModal = async (n = null) => {
    setErrors({});
    if (n) {
      // Fetch full note details if necessary, but usually the list has title, content, categoryId.
      setEditingNote(n);
      setFormData({ 
        title: n.title || "", 
        content: n.content || "", 
        categoryId: n.categoryId?.toString() || "", 
        isPinned: n.isPinned || false 
      });
    } else {
      setEditingNote(null);
      setFormData({ 
        title: "", 
        content: "", 
        categoryId: categories[0]?.id?.toString() || "", 
        isPinned: false 
      });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors = {};
    if (!formData.title?.trim()) newErrors.title = "Title is required";
    if (!formData.content?.trim()) newErrors.content = "Content is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (editingNote) {
        await apiClient.put(`/api/notes/${editingNote.id}`, {
          title: formData.title,
          content: formData.content,
          categoryId: formData.categoryId
        });
        toast.success("Note updated");
      } else {
        await apiClient.post("/api/notes", formData);
        toast.success("Note created");
      }
      setIsModalOpen(false);
      loadNotes();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const formatted = {};
        Object.keys(serverErrors).forEach(key => {
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          formatted[lowerKey] = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
        });
        setErrors(formatted);
      } else {
        toast.error(err.message || "Failed to save note");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await apiClient.delete(`/api/notes/${id}`);
      toast.success("Note deleted");
      loadNotes();
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  const exportJson = () => {
    const dataStr = JSON.stringify(sortedNotes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'notes.json');
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-foreground">Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">Jot down your thoughts and ideas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button variant="secondary" onClick={exportJson} disabled={notes.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <RainbowButton onClick={() => openModal()} className="px-4 py-2 w-full md:w-auto h-10">
              <Plus className="mr-2 h-4 w-4" /> New Note
            </RainbowButton>
          </motion.div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-surface-alt rounded-lg border flex flex-wrap gap-4 items-end mb-4">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search notes..." 
                    className="pl-9"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5 min-w-[150px]">
                <Label>Category</Label>
                <Select value={filters.categoryId} onValueChange={(val) => setFilters({ ...filters, categoryId: val })}>
                  <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.categoryName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6 pb-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Switch 
                    checked={filters.pinned}
                    onCheckedChange={(c) => setFilters({ ...filters, pinned: c })}
                  />
                  Pinned Only
                </label>
              </div>
              <div className="space-y-1.5 min-w-[150px] ml-auto">
                <Label>Sort By</Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="title_asc">Title A-Z</SelectItem>
                    <SelectItem value="title_desc">Title Z-A</SelectItem>
                    <SelectItem value="pinned">Pinned First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : sortedNotes.length === 0 ? (
        <EmptyState 
          icon={StickyNote} 
          title="No notes found" 
          description={filters.search || filters.categoryId !== "all" || filters.pinned ? "Try adjusting your filters." : "Create your first standalone note."}
          actionLabel={filters.search || filters.categoryId !== "all" || filters.pinned ? "Clear Filters" : "New Note"}
          onAction={() => {
            if (filters.search || filters.categoryId !== "all" || filters.pinned) {
              setFilters({ categoryId: "all", pinned: false, search: "" });
            } else {
              openModal();
            }
          }}
        />
      ) : (
        <>
          <ResponsiveTable className="rounded-lg border shadow-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="w-1/4 py-3 px-4 text-left font-medium text-muted-foreground">Title</th>
                <th className="w-2/5 py-3 px-4 text-left font-medium text-muted-foreground">Content</th>
                <th className="w-1/6 py-3 px-4 text-left font-medium text-muted-foreground">Category</th>
                <th className="py-3 px-4 text-center font-medium text-muted-foreground">Pin</th>
                <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((n, i) => (
                <motion.tr 
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="group border-b border-border last:border-0 transition-colors duration-150 hover:bg-secondary/30"
                >
                  <td data-label="Title" className="py-4 px-4 font-medium text-foreground">
                    {n.title || "Untitled"}
                  </td>
                  <td data-label="Content" className="py-4 px-4 text-muted-foreground text-sm">
                    <span className="line-clamp-2">{n.content}</span>
                  </td>
                  <td data-label="Category" className="py-4 px-4">
                    <Badge variant="outline" className="font-normal">
                      {getCategoryName(n.categoryId)}
                    </Badge>
                  </td>
                  <td data-label="Pin" className="py-4 px-4 sm:text-center">
                    <div className="flex sm:justify-center">
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => togglePin(n)}
                        className={`p-2 rounded-full hover:bg-secondary transition-colors ${n.isPinned ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                        title={n.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="h-4 w-4" fill={n.isPinned ? "currentColor" : "none"} />
                      </motion.button>
                    </div>
                  </td>
                  <td data-label="Actions" className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" size="icon" onClick={() => openModal(n)} title="Edit" className="h-8 w-8 rounded-full hover:bg-secondary transition-colors">
                        <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} title="Delete" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive group/delete transition-colors">
                        <Trash2 className="h-4 w-4 text-muted-foreground group-hover/delete:text-destructive transition-colors" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </ResponsiveTable>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? "border-destructive" : ""}
                autoFocus
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category <span className="text-destructive">*</span></Label>
              <Select value={formData.categoryId} onValueChange={(val) => setFormData({ ...formData, categoryId: val })}>
                <SelectTrigger className={errors.categoryId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.categoryName}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content <span className="text-destructive">*</span></Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className={`min-h-[150px] ${errors.content ? "border-destructive" : ""}`}
                maxLength={1000}
              />
              <div className="flex justify-between items-center text-xs">
                {errors.content ? (
                  <p className="text-destructive">{errors.content}</p>
                ) : <span />}
                <span className="text-muted-foreground">{formData.content.length}/1000</span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
