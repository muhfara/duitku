import { useState, useEffect, useCallback } from 'react';
import { insforge } from './insforge';

export function useQuery(fetcher, deps = []) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

// ---- Categories ----
export async function fetchCategories() {
  const { data, error } = await insforge.database
    .from('categories').select().order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCategory(payload) {
  const { data, error } = await insforge.database
    .from('categories').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCategory(id, payload) {
  const { data, error } = await insforge.database
    .from('categories').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCategory(id) {
  const { error } = await insforge.database.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Transactions ----
export async function fetchTransactions() {
  const { data, error } = await insforge.database
    .from('transactions').select().order('trx_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTransaction(payload) {
  const { data, error } = await insforge.database
    .from('transactions').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTransaction(id, payload) {
  const { data, error } = await insforge.database
    .from('transactions').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await insforge.database.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Debts ----
export async function fetchDebts() {
  const { data, error } = await insforge.database
    .from('debts').select().order('due_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDebtPayments() {
  const { data, error } = await insforge.database
    .from('debt_payments').select().order('pay_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDebt(payload) {
  const { data, error } = await insforge.database
    .from('debts').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDebt(id, payload) {
  const { data, error } = await insforge.database
    .from('debts').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createDebtPayment(payload) {
  const { data, error } = await insforge.database
    .from('debt_payments').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDebtPayment(id, payload) {
  const { data, error } = await insforge.database
    .from('debt_payments').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDebtPayment(id) {
  const { error } = await insforge.database
    .from('debt_payments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Recalculate debt remaining & status from all payments (used after edit/delete payment)
export async function recalcDebtRemaining(debtId, debtAmount) {
  const { data: pays } = await insforge.database
    .from('debt_payments').select('amount').eq('debt_id', debtId);
  const totalPaid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(debtAmount) - totalPaid);
  const status = remaining === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
  const { data, error } = await insforge.database
    .from('debts').update({ remaining, status }).eq('id', debtId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ---- Wallets ----
export async function fetchWallets() {
  const { data, error } = await insforge.database
    .from('wallets').select().order('is_default', { ascending: false }).order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createWallet(payload) {
  const { data, error } = await insforge.database
    .from('wallets').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateWallet(id, payload) {
  const { data, error } = await insforge.database
    .from('wallets').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteWallet(id) {
  const { error } = await insforge.database.from('wallets').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Savings ----
export async function fetchSavings() {
  const { data, error } = await insforge.database
    .from('savings').select().order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSavingsMembers() {
  const { data, error } = await insforge.database
    .from('savings_members').select().order('created_at');
  if (error) throw new Error(error.message);
  const members = data ?? [];
  if (!members.length) return [];

  const ids = [...new Set(members.map(m => m.user_id))];
  const { data: profiles } = await insforge.database
    .rpc('get_profiles_by_ids', { p_ids: ids });
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  return members.map(m => ({ ...m, profile: profileMap[m.user_id] ?? null }));
}

export async function findProfileByEmail(email) {
  const { data } = await insforge.database
    .rpc('find_profile_by_email', { p_email: email.trim().toLowerCase() });
  return (data && data.length > 0) ? data[0] : null;
}

export async function addSavingsMember(savingsId, userId) {
  const { data, error } = await insforge.database
    .from('savings_members')
    .insert([{ savings_id: savingsId, user_id: userId, role: 'member' }])
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeSavingsMember(savingsId, userId) {
  const { error } = await insforge.database
    .from('savings_members').delete()
    .eq('savings_id', savingsId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchSavingsTransactions() {
  const { data, error } = await insforge.database
    .from('savings_transactions').select().order('trx_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSavings(payload) {
  const { data, error } = await insforge.database
    .from('savings').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSavings(id, payload) {
  const { data, error } = await insforge.database
    .from('savings').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSavingsTransaction(payload) {
  const { data, error } = await insforge.database
    .from('savings_transactions').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ---- Budgets ----
export async function fetchBudgets() {
  const { data, error } = await insforge.database
    .from('budgets').select();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteBudget(id) {
  const { error } = await insforge.database.from('budgets').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDebt(id) {
  const { error } = await insforge.database.from('debts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSavings(id) {
  const { error } = await insforge.database.from('savings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adjustWalletBalance(id, delta) {
  const { data: w, error: fetchErr } = await insforge.database
    .from('wallets').select('balance').eq('id', id).single();
  if (fetchErr) throw new Error(fetchErr.message);
  const newBalance = Number(w.balance) + delta;
  return updateWallet(id, { balance: newBalance });
}

export async function deleteUserData(userId) {
  await insforge.database.from('budgets').delete().eq('user_id', userId);
  await insforge.database.from('debts').delete().eq('user_id', userId);
  await insforge.database.from('savings').delete().eq('user_id', userId);
  await insforge.database.from('transactions').delete().eq('user_id', userId);
  await insforge.database.from('wallets').delete().eq('user_id', userId);
  await insforge.database.from('categories').delete().eq('user_id', userId);
  await insforge.database.from('profiles').delete().eq('id', userId);
}

export async function upsertBudget(payload) {
  const { data, error } = await insforge.database
    .from('budgets')
    .insert([payload])
    .select()
    .single();
  if (error) {
    // Try update if unique conflict
    const { data: updated, error: updErr } = await insforge.database
      .from('budgets')
      .update({ limit_amount: payload.limit_amount })
      .eq('user_id', payload.user_id)
      .eq('category_id', payload.category_id)
      .eq('period', payload.period)
      .select().single();
    if (updErr) throw new Error(updErr.message);
    return updated;
  }
  return data;
}
