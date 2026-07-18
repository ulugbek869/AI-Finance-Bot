// src/lib/db.js
import supabase from './supabase';

/**
 * Supabase mavjudligini tekshirish
 */
export const isSupabaseAvailable = () => !!supabase;

// ==================== USERS ====================

/**
 * Foydalanuvchini Telegram ID orqali topish yoki yangi yaratish
 */
export async function getOrCreateUser(telegramId, firstName = '', username = '') {
  if (!supabase) return null;

  try {
    // Avval mavjud foydalanuvchini qidirish
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (existing) return existing;

    // Yangi foydalanuvchi yaratish
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        first_name: firstName,
        username: username,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[DB] User yaratishda xatolik:', insertError.message);
      return null;
    }

    return newUser;
  } catch (e) {
    console.error('[DB] getOrCreateUser xatolik:', e.message);
    return null;
  }
}

// ==================== TRANSACTIONS ====================

/**
 * Foydalanuvchining barcha tranzaksiyalarini olish (eng yangi birinchi)
 */
export async function fetchTransactions(telegramId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Transactions olishda xatolik:', error.message);
      return [];
    }

    // Frontend format ga moslashtirish
    return (data || []).map(row => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      categoryId: row.category_id,
      note: row.note || '',
      date: row.date,
      createdAt: row.created_at,
    }));
  } catch (e) {
    console.error('[DB] fetchTransactions xatolik:', e.message);
    return [];
  }
}

/**
 * Yangi tranzaksiya qo'shish
 */
export async function insertTransaction(telegramId, tx) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        telegram_id: telegramId,
        type: tx.type,
        amount: parseFloat(tx.amount),
        category_id: tx.categoryId,
        note: tx.note || '',
        date: tx.date || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Transaction qo\'shishda xatolik:', error.message);
      return null;
    }

    // Frontend formatga qaytarish
    return {
      id: data.id,
      type: data.type,
      amount: parseFloat(data.amount),
      categoryId: data.category_id,
      note: data.note || '',
      date: data.date,
      createdAt: data.created_at,
    };
  } catch (e) {
    console.error('[DB] insertTransaction xatolik:', e.message);
    return null;
  }
}

/**
 * Tranzaksiyani o'chirish
 */
export async function removeTransaction(transactionId) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('[DB] Transaction o\'chirishda xatolik:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[DB] removeTransaction xatolik:', e.message);
    return false;
  }
}

// ==================== BUDGETS ====================

/**
 * Foydalanuvchining barcha byudjetlarini olish
 */
export async function fetchBudgets(telegramId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('telegram_id', telegramId);

    if (error) {
      console.error('[DB] Budgets olishda xatolik:', error.message);
      return [];
    }

    return (data || []).map(row => ({
      categoryId: row.category_id,
      amount: parseFloat(row.amount),
    }));
  } catch (e) {
    console.error('[DB] fetchBudgets xatolik:', e.message);
    return [];
  }
}

/**
 * Byudjetni yangilash yoki yaratish (upsert)
 */
export async function upsertBudget(telegramId, categoryId, amount) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('budgets')
      .upsert(
        {
          telegram_id: telegramId,
          category_id: categoryId,
          amount: parseFloat(amount),
        },
        { onConflict: 'telegram_id,category_id' }
      );

    if (error) {
      console.error('[DB] Budget upsert xatolik:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[DB] upsertBudget xatolik:', e.message);
    return false;
  }
}

/**
 * Byudjetni o'chirish
 */
export async function removeBudget(telegramId, categoryId) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('telegram_id', telegramId)
      .eq('category_id', categoryId);

    if (error) {
      console.error('[DB] Budget o\'chirishda xatolik:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[DB] removeBudget xatolik:', e.message);
    return false;
  }
}

// ==================== SETTINGS ====================

/**
 * Foydalanuvchi sozlamalarini olish
 */
export async function fetchUserSettings(telegramId) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('settings')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !data) return null;

    return data.settings;
  } catch (e) {
    console.error('[DB] fetchUserSettings xatolik:', e.message);
    return null;
  }
}

/**
 * Foydalanuvchi sozlamalarini yangilash
 */
export async function updateUserSettings(telegramId, settings) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('users')
      .update({ settings })
      .eq('telegram_id', telegramId);

    if (error) {
      console.error('[DB] Settings yangilashda xatolik:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[DB] updateUserSettings xatolik:', e.message);
    return false;
  }
}
