import { useState, useRef } from "react";
import {
  useGetSales,
  getGetSalesQueryKey,
  useCreateSale,
  useUpdateSale,
  useDeleteSale,
  useGetInventory,
  getGetInventoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import CustomCalendar from "@/components/CustomCalendar";
import ImageLightbox from "@/components/ImageLightbox";
import ConfirmModal from "@/components/ConfirmModal";

interface SaleForm {
  productName: string;
  quantity: string;
  buyPrice: string;
  sellPrice: string;
  notes: string;
  images: string[];
  inventoryItemId: number | null;
  saleDate: string;
}

function localDateStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}

const defaultForm = (): SaleForm => ({
  productName: "",
  quantity: "1",
  buyPrice: "0",
  sellPrice: "0",
  notes: "",
  images: [],
  inventoryItemId: null,
  saleDate: localDateStr(),
});

export default function Sales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useSettings();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editSale, setEditSale] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [imageSliders, setImageSliders] = useState<Record<number, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SaleForm>(defaultForm());

  const params = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data: sales, isLoading } = useGetSales(params, {
    query: { queryKey: getGetSalesQueryKey(params) },
  });
  const { data: inventory } = useGetInventory({
    query: { queryKey: getGetInventoryQueryKey() },
  });

  const createMutation = useCreateSale();
  const updateMutation = useUpdateSale();
  const deleteMutation = useDeleteSale();

  const filtered = (sales ?? []).filter(
    (s) =>
      !search || s.productName.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditSale(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (sale: (typeof filtered)[0]) => {
    setEditSale(sale.id);
    setForm({
      productName: sale.productName,
      quantity: String(sale.quantity),
      buyPrice: String(sale.buyPrice),
      sellPrice: String(sale.sellPrice),
      notes: sale.notes ?? "",
      images: sale.images ?? [],
      inventoryItemId: sale.inventoryItemId ?? null,
      saleDate: sale.saleDate,
    });
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((f) => ({
          ...f,
          images: [...f.images, ev.target?.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleInventorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    if (id) {
      const item = inventory?.find((i) => i.id === id);
      if (item) {
        setForm((f) => ({
          ...f,
          inventoryItemId: id,
          productName: item.name,
          buyPrice: String(item.buyPrice),
          sellPrice: String(item.sellPrice),
          images: item.images?.length ? item.images : f.images,
        }));
      }
    } else {
      setForm((f) => ({ ...f, inventoryItemId: null }));
    }
  };

  const qty = parseFloat(form.quantity) || 0;
  const buy = parseFloat(form.buyPrice) || 0;
  const sell = parseFloat(form.sellPrice) || 0;
  const profit = (sell - buy) * qty;

  const handleSubmit = async () => {
    if (!form.productName || !form.saleDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product name and date required",
      });
      return;
    }
    const payload = {
      productName: form.productName,
      quantity: qty || 1,
      buyPrice: buy,
      sellPrice: sell,
      notes: form.notes || null,
      images: form.images,
      inventoryItemId: form.inventoryItemId ?? null,
      saleDate: form.saleDate,
    };
    try {
      if (editSale) {
        await updateMutation.mutateAsync({ id: editSale, data: payload });
        toast({ title: "Sale updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Sale added" });
      }
      queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
      setShowModal(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save sale",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
      toast({ title: "Sale deleted" });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete",
      });
    }
    setDeleteId(null);
  };

  const selectedInventoryItem = form.inventoryItemId
    ? inventory?.find((i) => i.id === form.inventoryItemId)
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <Button
          onClick={openAdd}
          className="cursor-pointer w-full sm:w-auto"
          data-testid="button-add-sale"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Sale
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sales..."
            className="pl-9 bg-card border-card-border text-foreground"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="w-full sm:w-48">
            <CustomCalendar
              value={startDate}
              onChange={setStartDate}
              placeholder="Start date"
            />
          </div>
          <div className="w-full sm:w-48">
            <CustomCalendar
              value={endDate}
              onChange={setEndDate}
              placeholder="End date"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="cursor-pointer px-3"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No sales found</p>
          <p className="text-sm mt-1">Add your first sale to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => {
            const currentImg = imageSliders[sale.id] ?? 0;
            return (
              <div
                key={sale.id}
                className="bg-card border border-card-border rounded-xl p-4 flex gap-4"
                data-testid={`card-sale-${sale.id}`}
              >
                {sale.images?.length > 0 ? (
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <img
                      src={sale.images[currentImg]}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover cursor-pointer"
                      onClick={() =>
                        setLightbox({ images: sale.images, index: currentImg })
                      }
                    />
                    {sale.images.length > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                        +{sale.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {sale.productName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sale.saleDate} · Qty: {sale.quantity}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEdit(sale)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                        data-testid={`button-edit-${sale.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(sale.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer"
                        data-testid={`button-delete-${sale.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      Buy:{" "}
                      <span className="text-foreground">
                        {formatCurrency(sale.buyPrice)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Sell:{" "}
                      <span className="text-foreground">
                        {formatCurrency(sale.sellPrice)}
                      </span>
                    </span>
                    <span
                      className={`font-medium ${sale.profit >= 0 ? "text-emerald-400" : "text-destructive"}`}
                    >
                      Profit: {sale.profit >= 0 ? "+" : ""}
                      {formatCurrency(sale.profit)}
                    </span>
                  </div>
                  {sale.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {sale.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-card-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editSale ? "Edit Sale" : "Add Sale"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {inventory && inventory.length > 0 && (
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">
                  Select from Inventory (Optional)
                </Label>
                <select
                  value={form.inventoryItemId ?? ""}
                  onChange={handleInventorySelect}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Select item --</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {selectedInventoryItem &&
                  selectedInventoryItem.images?.length > 0 && (
                    <div className="mt-2 flex gap-2 items-center">
                      <div className="flex gap-1.5 flex-wrap">
                        {selectedInventoryItem.images
                          .slice(0, 4)
                          .map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover border border-border"
                            />
                          ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedInventoryItem.images.length} image
                        {selectedInventoryItem.images.length !== 1 ? "s" : ""}{" "}
                        loaded from inventory
                      </p>
                    </div>
                  )}
              </div>
            )}

            <div>
              <Label className="text-foreground text-sm mb-1.5 block">
                Product Name *
              </Label>
              <Input
                value={form.productName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productName: e.target.value }))
                }
                placeholder="e.g. Blue Jeans"
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">
                  Quantity
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  onFocus={(e) => e.target.select()}
                  placeholder="1"
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">
                  Buy Price
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.buyPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, buyPrice: e.target.value }))
                  }
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">
                  Sell Price
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sellPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sellPrice: e.target.value }))
                  }
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="bg-background border-input text-foreground"
                />
              </div>
            </div>

            <div className="bg-accent/30 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">
                Auto-calculated profit:{" "}
              </span>
              <span
                className={`font-semibold ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}
              >
                {profit >= 0 ? "+" : ""}
                {formatCurrency(profit)}
              </span>
            </div>

            <CustomCalendar
              label="Sale Date *"
              value={form.saleDate}
              onChange={(date) => setForm((f) => ({ ...f, saleDate: date }))}
              disableFuture
              placeholder="Select date"
            />

            <div>
              <Label className="text-foreground text-sm mb-1.5 block">
                Notes
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any additional notes..."
                className="bg-background border-input text-foreground resize-none"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-foreground text-sm mb-1.5 block">
                Images
              </Label>
              <input
                type="file"
                ref={fileRef}
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full cursor-pointer border-input"
              >
                <Plus className="w-4 h-4 mr-2" /> Upload Images
              </Button>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img
                        src={img}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            images: f.images.filter((_, j) => j !== i),
                          }))
                        }
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 cursor-pointer border-input"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 cursor-pointer"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editSale
                    ? "Update"
                    : "Add Sale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Sale"
        description="Are you sure you want to delete this sale? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function ShoppingCartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
