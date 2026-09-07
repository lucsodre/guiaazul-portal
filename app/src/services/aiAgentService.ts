import { supabase } from '../lib/supabase'
import { getUserCategories } from './categoryService'
import { TransactionType } from '../types/transaction'

export interface CategorySuggestion {
  categoryId: string
  category_id: string
  categoryName: string
  category_name: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export async function suggestCategoryFromDescription(
  description: string,
  userId: string,
  transactionType: TransactionType = 'expense'
): Promise<CategorySuggestion | null> {
  if (!description.trim()) return null

  try {
    const categories = await getUserCategories(userId, transactionType)
    if (!categories.length) return null

    const functionName = import.meta.env.VITE_AI_ASSISTANT_FUNCTION_NAME || 'ai-assistant'
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        action: 'suggest_category',
        description,
        categories: categories.map(c => ({ id: c.id, name: c.name })),
      },
    })

    if (error || !data?.category_id) return null

    const cat = categories.find(c => c.id === data.category_id)
    if (!cat) return null

    return {
      categoryId: cat.id,
      category_id: cat.id,
      categoryName: cat.name,
      category_name: cat.name,
      confidence: data.confidence || 'medium',
      reason: data.reason || '',
    }
  } catch {
    return null
  }
}
