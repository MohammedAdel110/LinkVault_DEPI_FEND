import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, Trash2, Heart, Archive, Download, ExternalLink, Bookmark, Filter, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/api/client";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sort
  const [filters, setFilters] = useState({ categoryId: "all", isFavorite: false, isArchived: false, search: "" });
  const debouncedSearch = useDebounce(filters.search, 300);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [formData, setFormData] = useState({ title: "", url: "", categoryId: "", isFavorite: false, isArchived: false });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCategories();
    // Keyboard shortcut 'N'
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
    loadBookmarks();
  }, [filters.categoryId, filters.isFavorite, filters.isArchived, debouncedSearch]);

  const loadCategories = async () => {
    try {
      const data = await apiClient.get("/api/categories");
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to load categories");
    }
  };

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.categoryId && filters.categoryId !== "all") params.append("CategoryId", filters.categoryId);
      if (filters.isFavorite) params.append("IsFavorite", "true");
      if (filters.isArchived) params.append("IsArchived", "true");
      if (debouncedSearch) params.append("Search", debouncedSearch);

      const qs = params.toString();
      const url = qs ? `/api/bookmarks?${qs}` : "/api/bookmarks";
      
      const data = await apiClient.get(url);
      setBookmarks(data || []);
      goToPage(1); // Reset page on new fetch
    } catch (err) {
      toast.error("Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  const sortedBookmarks = useMemo(() => {
    if (!bookmarks) return [];
    let sorted = [...bookmarks];
    switch(sort) {
      case "oldest": sorted.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case "title_asc": sorted.sort((a,b) => a.title.localeCompare(b.title)); break;
      case "title_desc": sorted.sort((a,b) => b.title.localeCompare(a.title)); break;
      case "favorites": sorted.sort((a,b) => (b.isFavorite === a.isFavorite) ? 0 : b.isFavorite ? 1 : -1); break;
      case "newest":
      default: sorted.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    }
    return sorted;
  }, [bookmarks, sort]);

  const { paginatedData, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination(sortedBookmarks, 10);

  const getCategoryName = (id) => categories.find(c => c.id === id)?.categoryName || "Unknown";

  const toggleFavorite = async (bookmark) => {
    try {
      // Optimistic update
      setBookmarks(prev => prev.map(b => b.id === bookmark.id ? { ...b, isFavorite: !b.isFavorite } : b));
      await apiClient.put(`/api/bookmarks/${bookmark.id}`, {
        url: bookmark.url,
        title: bookmark.title,
        categoryId: bookmark.categoryId,
        isFavorite: !bookmark.isFavorite,
        isArchived: bookmark.isArchived
      });
    } catch (err) {
      toast.error("Failed to update favorite status");
      loadBookmarks(); // Revert
    }
  };

  const toggleArchived = async (bookmark) => {
    try {
      setBookmarks(prev => prev.map(b => b.id === bookmark.id ? { ...b, isArchived: !b.isArchived } : b));
      await apiClient.put(`/api/bookmarks/${bookmark.id}`, {
        url: bookmark.url,
        title: bookmark.title,
        categoryId: bookmark.categoryId,
        isFavorite: bookmark.isFavorite,
        isArchived: !bookmark.isArchived
      });
      // If we are filtering by unarchived, we might want to reload or it will just disappear
    } catch (err) {
      toast.error("Failed to update archive status");
      loadBookmarks();
    }
  };

  const openModal = (b = null) => {
    setErrors({});
    if (b) {
      setEditingBookmark(b);
      setFormData({ title: b.title, url: b.url, categoryId: b.categoryId?.toString() || "", isFavorite: b.isFavorite, isArchived: b.isArchived });
    } else {
      setEditingBookmark(null);
      setFormData({ title: "", url: "", categoryId: categories[0]?.id?.toString() || "", isFavorite: false, isArchived: false });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.url.trim()) newErrors.url = "URL is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (editingBookmark) {
        await apiClient.put(`/api/bookmarks/${editingBookmark.id}`, formData);
        toast.success("Bookmark updated");
      } else {
        await apiClient.post("/api/bookmarks", formData);
        toast.success("Bookmark created");
      }
      setIsModalOpen(false);
      loadBookmarks();
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
        toast.error(err.message || "Failed to save bookmark");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this bookmark?")) return;
    try {
      await apiClient.delete(`/api/bookmarks/${id}`);
      toast.success("Bookmark deleted");
      loadBookmarks();
    } catch (err) {
      toast.error("Failed to delete bookmark");
    }
  };

  const exportJson = () => {
    const dataStr = JSON.stringify(sortedBookmarks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'bookmarks.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-foreground">Bookmarks</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your saved links.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button variant="secondary" onClick={exportJson} disabled={bookmarks.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <RainbowButton onClick={() => openModal()} className="px-4 py-2 w-full md:w-auto h-10">
              <Plus className="mr-2 h-4 w-4" /> New Bookmark
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
                    placeholder="Search titles..." 
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
                    checked={filters.isFavorite}
                    onCheckedChange={(c) => setFilters({ ...filters, isFavorite: c })}
                  />
                  Favorites Only
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Switch 
                    checked={filters.isArchived}
                    onCheckedChange={(c) => setFilters({ ...filters, isArchived: c })}
                  />
                  Archived Only
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
                    <SelectItem value="favorites">Favorites First</SelectItem>
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
            <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : sortedBookmarks.length === 0 ? (
        <EmptyState 
          icon={Bookmark} 
          title="No bookmarks found" 
          description={filters.search || filters.categoryId !== "all" || filters.isFavorite || filters.isArchived ? "Try adjusting your filters." : "Save your first link."}
          actionLabel={filters.search || filters.categoryId !== "all" || filters.isFavorite || filters.isArchived ? "Clear Filters" : "New Bookmark"}
          onAction={() => {
            if (filters.search || filters.categoryId !== "all" || filters.isFavorite || filters.isArchived) {
              setFilters({ categoryId: "all", isFavorite: false, isArchived: false, search: "" });
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
                <th className="w-1/3 py-3 px-4 text-left font-medium text-muted-foreground">Title</th>
                <th className="w-1/4 py-3 px-4 text-left font-medium text-muted-foreground">Category</th>
                <th className="py-3 px-4 text-center font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((b, i) => (
                <motion.tr 
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="group border-b border-border last:border-0 transition-colors duration-150 hover:bg-secondary/30"
                >
                  <td data-label="Title" className="py-4 px-4">
                    <div className="flex flex-col">
                      <Link to={`/bookmarks/${b.id}`} className="font-medium text-foreground hover:text-accent transition-colors truncate max-w-[250px] sm:max-w-[400px]">
                        {b.title}
                      </Link>
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 truncate max-w-[250px]">
                        <ExternalLink className="h-3 w-3" /> {b.url}
                      </a>
                    </div>
                  </td>
                  <td data-label="Category" className="py-4 px-4">
                    <Badge variant="outline" className="font-normal">
                      {getCategoryName(b.categoryId)}
                    </Badge>
                  </td>
                  <td data-label="Status" className="py-4 px-4 sm:text-center">
                    <div className="flex sm:justify-center gap-1">
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleFavorite(b)}
                        className={`p-2 rounded-full hover:bg-secondary transition-colors ${b.isFavorite ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                        title={b.isFavorite ? "Unfavorite" : "Favorite"}
                      >
                        <Heart className="h-4 w-4" fill={b.isFavorite ? "currentColor" : "none"} />
                      </motion.button>
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleArchived(b)}
                        className={`p-2 rounded-full hover:bg-secondary transition-colors ${b.isArchived ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                        title={b.isArchived ? "Unarchive" : "Archive"}
                      >
                        <Archive className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </td>
                  <td data-label="Actions" className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" size="icon" onClick={() => openModal(b)} title="Edit" className="h-8 w-8 rounded-full hover:bg-secondary transition-colors">
                        <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} title="Delete" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive group/delete transition-colors">
                        <Trash2 className="h-4 w-4 text-muted-foreground group-hover/delete:text-destructive transition-colors" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </ResponsiveTable>
          
          {/* Pagination */}
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBookmark ? "Edit Bookmark" : "New Bookmark"}</DialogTitle>
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
              <Label htmlFor="url">URL <span className="text-destructive">*</span></Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className={errors.url ? "border-destructive" : ""}
              />
              {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
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
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch 
                  checked={formData.isFavorite}
                  onCheckedChange={(c) => setFormData({ ...formData, isFavorite: c })}
                />
                Favorite
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch 
                  checked={formData.isArchived}
                  onCheckedChange={(c) => setFormData({ ...formData, isArchived: c })}
                />
                Archived
              </label>
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
