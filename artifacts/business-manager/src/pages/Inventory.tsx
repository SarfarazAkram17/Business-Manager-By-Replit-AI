import { useState, useRef } from "react";
import {
  useGetInventory, getGetInventoryQueryKey,
  useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, X, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import ConfirmModal from "@/components/ConfirmModal";
import ImageLightbox from "@/components/ImageLightbox";

interface ItemForm {
  name: string;
  quantity: string;
  buyPrice: string;
  sellPrice: string;
  description: string;
  images: string[];
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useSettings();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ItemForm>({
    name: "", quantity: "1", buyPrice: "0", sellPrice: "0", description: "", images: []
  });

  const { data: items, isLoading } = useGetInventory({
    query: { queryKey: getGetInventoryQueryKey() }
  });

  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", quantity: "1", buyPrice: "0", sellPrice: "0", description: "", images: [] });
    setShowModal(true);
  };

  const openEdit = (item: NonNullable<typeof items>[0]) => {
    setEditItem(item.id);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      buyPrice: String(item.buyPrice),
      sellPrice: String(item.sellPrice),
      description: item.description ?? "",
      images: item.images ?? [],
    });
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setForm(f => ({ ...f, images: [...f.images, ev.target?.result as string] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast({ variant: "destructive", title: "Error", description: "Name required" });
      return;
    }
    const payload = {
      name: form.name,
      quantity: parseInt(form.quantity) || 0,
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      description: form.description || null,
      images: form.images,
    };
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem, data: payload });
        toast({ title: "Item updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Item added" });
      }
      queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
      setShowModal(false);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save item" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
      toast({ title: "Item deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
    }
    setDeleteId(null);
  };

  const profit = (parseFloat(form.sellPrice) || 0) - (parseFloat(form.buyPrice) || 0);

  const filteredItems = (items ?? []).filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <Button onClick={openAdd} className="cursor-pointer w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products by name or description..."
          className="pl-9 bg-card border-card-border text-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : !items?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No inventory items</p>
          <p className="text-sm mt-1">Add products to track inventory</p>
        </div>
      ) : !filteredItems.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No results for "{search}"</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`card-item-${item.id}`}>
              {item.images?.length > 0 ? (
                <div className="relative h-48">
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightbox({ images: item.images, index: 0 })}
                  />
                  {item.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                      +{item.images.length - 1} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 bg-accent flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground opacity-40" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Stock</p>
                    <p className="font-semibold text-foreground">{item.quantity}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Buy</p>
                    <p className="font-semibold text-foreground">{formatCurrency(item.buyPrice)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Sell</p>
                    <p className="font-semibold text-foreground">{formatCurrency(item.sellPrice)}</p>
                  </div>
                </div>
                <div className="mt-2 text-center text-xs">
                  <span className="text-muted-foreground">Margin: </span>
                  <span className={`font-semibold ${(item.sellPrice - item.buyPrice) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {formatCurrency(item.sellPrice - item.buyPrice)} per unit
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-card-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground text-sm mb-1.5 block">Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Blue Denim Jacket" className="bg-background border-input text-foreground" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">Quantity</Label>
                <Input type="number" min={0} placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} onFocus={e => e.target.select()} className="bg-background border-input text-foreground" />
              </div>
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">Buy Price</Label>
                <Input type="number" min={0} step="0.01" placeholder="0" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} onFocus={e => e.target.select()} className="bg-background border-input text-foreground" />
              </div>
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">Sell Price</Label>
                <Input type="number" min={0} step="0.01" placeholder="0" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} onFocus={e => e.target.select()} className="bg-background border-input text-foreground" />
              </div>
            </div>
            <div className="bg-accent/30 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Margin per unit: </span>
              <span className={`font-semibold ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </span>
            </div>
            <div>
              <Label className="text-foreground text-sm mb-1.5 block">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description..." className="bg-background border-input text-foreground resize-none" rows={2} />
            </div>
            <div>
              <Label className="text-foreground text-sm mb-1.5 block">Images</Label>
              <input type="file" ref={fileRef} multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="w-full cursor-pointer border-input">
                <Plus className="w-4 h-4 mr-2" /> Upload Images
              </Button>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                      <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center cursor-pointer">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 cursor-pointer border-input">Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1 cursor-pointer" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editItem ? "Update" : "Add Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        description="Are you sure you want to delete this inventory item?"
        confirmText="Delete"
        variant="destructive"
      />

      {lightbox && (
        <ImageLightbox images={lightbox.images} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
