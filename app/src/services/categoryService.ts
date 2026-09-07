import { supabase } from '../lib/supabase'
import { Category, CategoryType } from '../types/category'

interface UserCategoryCustomization {
  is_hidden?: boolean
  custom_name?: string
  custom_icon?: string
  custom_color?: string
}

interface CategoryWithCustomization extends Category {
  user_categories?: UserCategoryCustomization[]
}

export async function getCategories(userId?: string): Promise<Category[]> {
  try {
    let query = supabase.from('categories').select('*').order('name', { ascending: true })
    if (userId) {
      query = query.or(`is_default.eq.true,user_id.eq.${userId}`)
    } else {
      query = query.eq('is_default', true)
    }
    const { data, error } = await query
    if (error) return []
    return data || []
  } catch { return [] }
}

export async function getUserCategories(userId: string, type?: CategoryType): Promise<Category[]> {
  try {
    let query = supabase
      .from('categories')
      .select(`*, user_categories!left(is_hidden, custom_name, custom_icon, custom_color)`)
      .or(`is_default.eq.true,user_id.eq.${userId}`)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
    if (type) query = query.eq('type', type)
    const { data, error } = await query
    if (error) return []
    return (data as CategoryWithCustomization[])
      .filter((cat) => !cat.user_categories?.[0]?.is_hidden)
      .map((cat) => {
        const c = cat.user_categories?.[0]
        return { ...cat, name: c?.custom_name || cat.name, icon: c?.custom_icon || cat.icon, color: c?.custom_color || cat.color }
      })
  } catch { return [] }
}

export async function getCategoriesByType(type: CategoryType, userId?: string): Promise<Category[]> {
  if (userId) return getUserCategories(userId, type)
  const categories = await getCategories(userId)
  return categories.filter((cat) => cat.type === type)
}

export async function getAllUserCategories(userId: string): Promise<Category[]> {
  return getUserCategories(userId)
}

export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase.from('categories').select('*').eq('id', categoryId).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function createCategory(params: {
  userId: string; name: string; type: CategoryType; icon?: string; color?: string; parentId?: string
}): Promise<Category | null> {
  try {
    if (!params.userId || !params.name?.trim()) return null
    const { data, error } = await supabase.from('categories').insert([{
      user_id: params.userId.trim(), name: params.name.trim(), type: params.type,
      icon: params.icon || 'help-circle-outline', color: params.color || '#6B7280',
      parent_id: params.parentId || null, is_default: false,
    }]).select().single()
    if (error) return null
    return data
  } catch { return null }
}

export async function updateCategory(categoryId: string, updates: Partial<Category>): Promise<boolean> {
  try {
    const { error } = await supabase.from('categories').update(updates).eq('id', categoryId)
    return !error
  } catch { return false }
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('transactions').select('*', { count: 'exact', head: true }).eq('category_id', categoryId)
    if (count && count > 0) return false
    const { error } = await supabase.from('categories').delete().eq('id', categoryId)
    return !error
  } catch { return false }
}

export async function hideCategory(userId: string, categoryId: string): Promise<void> {
  const { error } = await supabase.from('user_categories').upsert(
    { user_id: userId, category_id: categoryId, is_hidden: true },
    { onConflict: 'user_id,category_id', ignoreDuplicates: false }
  )
  if (error) throw error
}

export async function showCategory(userId: string, categoryId: string): Promise<void> {
  const { error } = await supabase.from('user_categories').upsert(
    { user_id: userId, category_id: categoryId, is_hidden: false },
    { onConflict: 'user_id,category_id', ignoreDuplicates: false }
  )
  if (error) throw error
}

export async function customizeCategory(
  userId: string, categoryId: string,
  customization: { custom_name?: string; custom_color?: string; custom_icon?: string }
) {
  const { data, error } = await supabase.from('user_categories').upsert(
    { user_id: userId, category_id: categoryId, ...customization, is_hidden: false },
    { onConflict: 'user_id,category_id', ignoreDuplicates: false }
  ).select().single()
  if (error) throw error
  return data
}

export async function resetCategoryCustomization(userId: string, categoryId: string): Promise<void> {
  const { error } = await supabase.from('user_categories')
    .delete().eq('user_id', userId).eq('category_id', categoryId)
  if (error) throw error
}
