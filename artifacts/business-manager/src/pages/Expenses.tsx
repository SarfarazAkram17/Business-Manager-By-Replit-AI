import { useState } from "react";
import {
  useGetExpenses, getGetExpensesQueryKey,
  useCreateExpense, useUpdateExpense, useDeleteExpense
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Receipt, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import CustomCalendar from "@/components/CustomCalendar";
import ConfirmModal from "@/components/ConfirmModal";

const CATEGORIES = ["Rent", "Utilities", "Supplies", "Marketing", "Salary", "Transport", "Other"];

interface ExpenseForm {
  title: string;
  amount: string;
  category: string;
  notes: string;
  expenseDate: string;
}

export default function Expenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useSettings();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>({
    title: "", amount: "0", category: "", notes: "", expenseDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })()
  });

  const params = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data: expenses, isLoading } = useGetExpenses(params, {
    query: { queryKey: getGetExpensesQueryKey(params) }
  });

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const filtered = (expenses ?? []).filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => {
    setEditExpense(null);
    setForm({ title: "", amount: "0", category: "", notes: "", expenseDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })() });
    setShowModal(true);
  };

  const openEdit = (expense: typeof filtered[0]) => {
    setEditExpense(expense.id);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category ?? "",
      notes: expense.notes ?? "",
      expenseDate: expense.expenseDate,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.expenseDate) {
      toast({ variant: "destructive", title: "Error", description: "Title and date required" });
      return;
    }
    const payload = {
      title: form.title,
      amount: parseFloat(form.amount) || 0,
      category: form.category || null,
      notes: form.notes || null,
      expenseDate: form.expenseDate,
    };
    try {
      if (editExpense) {
        await updateMutation.mutateAsync({ id: editExpense, data: payload });
        toast({ title: "Expense updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Expense added" });
      }
      queryClient.invalidateQueries({ queryKey: getGetExpensesQueryKey() });
      setShowModal(false);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save expense" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getGetExpensesQueryKey() });
      toast({ title: "Expense deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
    }
    setDeleteId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          {filtered.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">Total: <span className="text-destructive font-semibold">{formatCurrency(totalAmount)}</span></p>
          )}
        </div>
        <Button onClick={openAdd} className="cursor-pointer w-full sm:w-auto" data-testid="button-add-expense">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="pl-9 bg-card border-card-border text-foreground"
          />
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="w-full sm:w-48">
            <CustomCalendar value={startDate} onChange={setStartDate} placeholder="Start date" />
          </div>
          <div className="w-full sm:w-48">
            <CustomCalendar value={endDate} onChange={setEndDate} placeholder="End date" />
          </div>
          {(startDate || endDate) && (
            <Button variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); }} className="cursor-pointer px-3">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No expenses found</p>
          <p className="text-sm mt-1">Track your store expenses here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(expense => (
            <div key={expense.id} className="bg-card border border-card-border rounded-xl p-4" data-testid={`card-expense-${expense.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{expense.title}</h3>
                    <p className="text-xs text-muted-foreground">{expense.expenseDate}{expense.category ? ` · ${expense.category}` : ""}</p>
                    {expense.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{expense.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-bold text-destructive">{formatCurrency(expense.amount)}</p>
                  <button onClick={() => openEdit(expense)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(expense.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-card-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground text-sm mb-1.5 block">Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Store Rent"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">Amount *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  onFocus={e => e.target.select()}
                  placeholder="0"
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground text-sm mb-1.5 block">Category</Label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Select --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <CustomCalendar
              label="Expense Date *"
              value={form.expenseDate}
              onChange={date => setForm(f => ({ ...f, expenseDate: date }))}
              disableFuture
              placeholder="Select date"
            />
            <div>
              <Label className="text-foreground text-sm mb-1.5 block">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="bg-background border-input text-foreground resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 cursor-pointer border-input">Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1 cursor-pointer" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editExpense ? "Update" : "Add Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        description="Are you sure you want to delete this expense?"
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
