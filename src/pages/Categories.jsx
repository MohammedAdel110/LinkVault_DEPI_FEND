import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Folder } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { RainbowButton } from "@/components/ui/rainbow-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({}); // { categoryId: { bookmarks, notes } }
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ categoryName: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
    
    // Keyboard shortcut 'N' for new category
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'n' && !isModalOpen && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get("/api/categories");
      setCategories(data || []);
      
      // Lazy load counts
      if (data && data.length > 0) {
        loadCounts();
      }
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const [bookmarks, notes] = await Promise.all([
        apiClient.get("/api/bookmarks"),
        apiClient.get("/api/notes")
      ]);
      
      const newCounts = {};
      
      (bookmarks || []).forEach(b => {
        if (!newCounts[b.categoryId]) newCounts[b.categoryId] = { bookmarks: 0, notes: 0 };
        newCounts[b.categoryId].bookmarks++;
      });
      
      (notes || []).forEach(n => {
        if (!newCounts[n.categoryId]) newCounts[n.categoryId] = { bookmarks: 0, notes: 0 };
        newCounts[n.categoryId].notes++;
      });
      
      setCounts(newCounts);
    } catch (err) {
      console.error("Failed to load counts", err);
    }
  };

  const openModal = (category = null) => {
    setErrors({});
    if (category) {
      setEditingCategory(category);
      setFormData({ categoryName: category.categoryName, description: category.description || "" });
    } else {
      setEditingCategory(null);
      setFormData({ categoryName: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!formData.categoryName.trim()) {
      setErrors({ categoryName: "Category name is required" });
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await apiClient.put(`/api/categories/${editingCategory.id}`, formData);
        toast.success("Category updated");
      } else {
        await apiClient.post("/api/categories", formData);
        toast.success("Category created");
      }
      setIsModalOpen(false);
      loadData();
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
        toast.error(err.message || "Failed to save category");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    try {
      await apiClient.delete(`/api/categories/${id}`);
      toast.success("Category deleted");
      loadData();
    } catch (err) {
      if (err.status === 409) {
        toast.error("Cannot delete category because it is in use by bookmarks or notes.");
      } else {
        toast.error(err.message || "Failed to delete category");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-foreground">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">Organize your links and notes.</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="sm:w-auto w-full">
          <RainbowButton onClick={() => openModal()} className="w-full h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" /> New Category
          </RainbowButton>
        </motion.div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState 
          icon={Folder} 
          title="No categories yet" 
          description="Create your first category to start organizing your bookmarks."
          actionLabel="New Category"
          onAction={() => openModal()}
        />
      ) : (
        <ResponsiveTable className="rounded-lg border shadow-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="w-1/3 py-3 px-4 text-left font-medium text-muted-foreground">Name</th>
              <th className="w-1/3 py-3 px-4 text-left font-medium text-muted-foreground">Description</th>
              <th className="py-3 px-4 text-center font-medium text-muted-foreground">Bookmarks</th>
              <th className="py-3 px-4 text-center font-medium text-muted-foreground">Notes</th>
              <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <motion.tr 
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="group border-b border-border last:border-0 transition-colors duration-150 hover:bg-secondary/30"
              >
                <td data-label="Name" className="py-4 px-4 font-medium text-foreground">{cat.categoryName}</td>
                <td data-label="Description" className="py-4 px-4 text-muted-foreground">
                  <span className="line-clamp-1 max-w-[200px] sm:max-w-[300px]">
                    {cat.description || "—"}
                  </span>
                </td>
                <td data-label="Bookmarks" className="py-4 px-4 text-center">
                  <motion.div
                    key={`bookmarks-${counts[cat.id]?.bookmarks || 0}`}
                    animate={{ scale: [0.8, 1] }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 bg-accent/10 text-accent font-medium border-transparent">
                      {counts[cat.id]?.bookmarks !== undefined ? counts[cat.id].bookmarks : "0"}
                    </Badge>
                  </motion.div>
                </td>
                <td data-label="Notes" className="py-4 px-4 text-center">
                  <motion.div
                    key={`notes-${counts[cat.id]?.notes || 0}`}
                    animate={{ scale: [0.8, 1] }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 bg-accent/10 text-accent font-medium border-transparent">
                      {counts[cat.id]?.notes !== undefined ? counts[cat.id].notes : "0"}
                    </Badge>
                  </motion.div>
                </td>
                <td data-label="Actions" className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" size="icon" onClick={() => openModal(cat)} title="Edit" className="h-8 w-8 rounded-full hover:bg-secondary transition-colors">
                      <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} title="Delete" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive group/delete transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground group-hover/delete:text-destructive transition-colors" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </ResponsiveTable>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name <span className="text-destructive">*</span></Label>
              <Input
                id="categoryName"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                className={errors.categoryName ? "border-destructive" : ""}
                autoFocus
              />
              {errors.categoryName && <p className="text-xs text-destructive">{errors.categoryName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
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
